"""Stage 24: server-side Google Calendar OAuth, read-only. Never writes calendar events."""
import base64, hashlib, json, os, secrets, sqlite3, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
TOKEN_URL = 'https://oauth2.googleapis.com/token'
EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
REDIRECT_URI = os.getenv('GOOGLE_REDIRECT_URI', '')
KEY = os.getenv('LIFEOS_CALENDAR_ENCRYPTION_KEY', '')
DATABASE_URL = os.getenv('LIFEOS_DATABASE_URL', '').strip()
DB = Path(os.getenv('LIFEOS_DB', str(Path(__file__).resolve().parent/'data'/'lifeos.sqlite3')))


def ready():
    return all((CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, KEY)) and REDIRECT_URI.startswith('https://') or (all((CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, KEY)) and REDIRECT_URI.startswith('http://localhost:'))


def cipher():
    from cryptography.fernet import Fernet
    if not KEY: raise RuntimeError('Missing encryption key')
    return Fernet(KEY.encode())


def dbconn():
    if DATABASE_URL:
        import psycopg
        return psycopg.connect(DATABASE_URL, connect_timeout=10)
    DB.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(DB)


def init():
    with dbconn() as db:
        if DATABASE_URL:
            db.execute('CREATE SCHEMA IF NOT EXISTS lifeos')
            db.execute('CREATE TABLE IF NOT EXISTS lifeos.calendar_oauth (id INTEGER PRIMARY KEY, secret TEXT NOT NULL)')
            db.execute('CREATE TABLE IF NOT EXISTS lifeos.calendar_pending (state_hash TEXT PRIMARY KEY, verifier TEXT NOT NULL, expires BIGINT NOT NULL)')
        else:
            db.execute('CREATE TABLE IF NOT EXISTS calendar_oauth (id INTEGER PRIMARY KEY, secret TEXT NOT NULL)')
            db.execute('CREATE TABLE IF NOT EXISTS calendar_pending (state_hash TEXT PRIMARY KEY, verifier TEXT NOT NULL, expires INTEGER NOT NULL)')


def table(name): return ('lifeos.' if DATABASE_URL else '') + name

def execute(query, params=(), fetch=False):
    with dbconn() as db:
        cur = db.execute(query.replace('?', '%s') if DATABASE_URL else query, params)
        return cur.fetchone() if fetch else None


def begin():
    if not ready(): raise RuntimeError('Google OAuth not configured')
    init()
    state=secrets.token_urlsafe(32)
    verifier=secrets.token_urlsafe(64)
    challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    execute(f'DELETE FROM {table("calendar_pending")} WHERE expires < ?', (int(time.time()),))
    execute(f'INSERT INTO {table("calendar_pending")} (state_hash,verifier,expires) VALUES (?,?,?)', (hashlib.sha256(state.encode()).hexdigest(),verifier,int(time.time())+600))
    return AUTH_URL+'?'+urlencode({'client_id':CLIENT_ID,'redirect_uri':REDIRECT_URI,'response_type':'code','scope':SCOPE,'access_type':'offline','prompt':'consent','state':state,'code_challenge':challenge,'code_challenge_method':'S256'})


def post_token(params):
    req=Request(TOKEN_URL, data=urlencode(params).encode(), headers={'Content-Type':'application/x-www-form-urlencoded'}, method='POST')
    with urlopen(req, timeout=12) as res: return json.load(res)


def finish(state, code):
    if not state or not code or len(state)>256 or len(code)>4096: raise ValueError('Invalid OAuth response')
    init()
    digest=hashlib.sha256(state.encode()).hexdigest()
    row=execute(f'SELECT verifier,expires FROM {table("calendar_pending")} WHERE state_hash=?',(digest,),True)
    if not row or row[1]<time.time(): raise ValueError('Invalid or expired OAuth state')
    execute(f'DELETE FROM {table("calendar_pending")} WHERE state_hash=?',(digest,))
    token=post_token({'client_id':CLIENT_ID,'client_secret':CLIENT_SECRET,'code':code,'code_verifier':row[0],'redirect_uri':REDIRECT_URI,'grant_type':'authorization_code'})
    if 'refresh_token' not in token: raise ValueError('Google did not issue offline authorization')
    store({'refresh_token':token['refresh_token']})


def store(data):
    encrypted=cipher().encrypt(json.dumps(data).encode()).decode()
    execute(f'INSERT INTO {table("calendar_oauth")} (id,secret) VALUES (1,?) ON CONFLICT (id) DO UPDATE SET secret=excluded.secret',(encrypted,))


def load():
    init()
    row=execute(f'SELECT secret FROM {table("calendar_oauth")} WHERE id=1',(),True)
    return json.loads(cipher().decrypt(row[0].encode())) if row else None


def disconnect():
    init()
    execute(f'DELETE FROM {table("calendar_oauth")} WHERE id=1')


def google_page(url, access_token, attempts=3):
    """Retry transient Google failures, but never retry authorization errors."""
    for attempt in range(attempts):
        try:
            req = Request(url, headers={'Authorization': 'Bearer ' + access_token,
                                        'Accept': 'application/json'})
            with urlopen(req, timeout=15) as res:
                return json.load(res)
        except HTTPError as exc:
            if exc.code not in (429, 500, 502, 503, 504) or attempt == attempts - 1:
                raise
            delay = min(2 ** attempt, 4)
            retry_after = exc.headers.get('Retry-After') if exc.headers else None
            if retry_after and retry_after.isdigit():
                delay = min(max(int(retry_after), delay), 5)
            time.sleep(delay)
        except (URLError, TimeoutError):
            if attempt == attempts - 1:
                raise
            time.sleep(min(2 ** attempt, 4))


def fetch_events(start, end):
    """Return complete read-only preview, or fail without partial results.

    Google expands recurring instances when singleEvents=true. We keep their
    distinct instance IDs, and retain original recurring identifiers for audit.
    """
    a = datetime.fromisoformat(start.replace('Z', '+00:00'))
    b = datetime.fromisoformat(end.replace('Z', '+00:00'))
    if a.tzinfo is None or b.tzinfo is None or not (0 < (b-a).total_seconds() <= 90*86400):
        raise ValueError('Specify a timezone-aware window of up to 90 days')
    saved = load()
    if not saved: raise ValueError('Google Calendar is not connected')
    token = post_token({'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET,
                        'refresh_token': saved['refresh_token'],
                        'grant_type': 'refresh_token'})['access_token']
    base = {'timeMin': a.isoformat(), 'timeMax': b.isoformat(),
            'singleEvents': 'true', 'orderBy': 'startTime', 'maxResults': 250,
            'fields': 'items(id,summary,start,end,status,updated,recurringEventId,originalStartTime),nextPageToken'}
    events = []
    seen_ids = set()
    seen_tokens = set()
    page_token = None
    for page_number in range(20):
        params = dict(base)
        if page_token: params['pageToken'] = page_token
        payload = google_page(EVENTS_URL + '?' + urlencode(params), token)
        if not isinstance(payload, dict) or not isinstance(payload.get('items', []), list):
            raise ValueError('Malformed Google Calendar response')
        for event in payload.get('items', []):
            if event.get('status') == 'cancelled': continue
            event_id = event.get('id')
            if not isinstance(event_id, str) or not event_id or event_id in seen_ids: continue
            event_start = event.get('start', {}).get('dateTime') or event.get('start', {}).get('date')
            event_end = event.get('end', {}).get('dateTime') or event.get('end', {}).get('date')
            if not event_start or not event_end: continue
            seen_ids.add(event_id)
            events.append({'uid': event_id, 'title': event.get('summary', 'Untitled'),
                           'start': event_start, 'end': event_end, 'source': 'google-readonly',
                           'recurring_event_id': event.get('recurringEventId'),
                           'original_start': event.get('originalStartTime')})
        page_token = payload.get('nextPageToken')
        if not page_token:
            return {'events': events, 'truncated': False, 'read_only': True,
                    'pages_fetched': page_number + 1}
        if not isinstance(page_token, str) or page_token in seen_tokens:
            raise ValueError('Invalid or repeated Google Calendar pagination token')
        seen_tokens.add(page_token)
    raise ValueError('Google Calendar result exceeds the 20-page safety limit; narrow the date window')
