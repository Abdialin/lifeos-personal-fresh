"""V155 isolated beta registration.

Only account identity/profile is stored in its own PostgreSQL schema. This
module does not read or write the legacy LifeOS workspace, plans or sync token.
Email/SMS confirmation and independent personal workspaces are NOT enabled.
"""
import hashlib
import hmac
import html
import os
import re
import secrets
import threading
import time
from collections import defaultdict
from http.cookies import SimpleCookie
from urllib.parse import parse_qs, urlparse

COOKIE = 'lifeos_beta_account_v155'
AUTH_TTL = 12 * 3600
_LOCK = threading.RLock()
_ATTEMPTS = defaultdict(list)
_EMAIL = re.compile(r'^[A-Za-z0-9.!#$%&\'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?\.[A-Za-z]{2,63}$')
_PHONE = re.compile(r'^\+?[0-9][0-9 .()\-]{6,23}$')


def _csrf_token(secret, purpose):
    payload = str(int(time.time())) + ":" + secrets.token_urlsafe(18)
    mac = hmac.new(hashlib.sha256(("lifeos-csrf-v157:" + secret).encode()).digest(),
                   (purpose + ":" + payload).encode(), hashlib.sha256).hexdigest()
    return payload + "." + mac


def _csrf_valid(secret, purpose, submitted):
    try:
        payload, mac = submitted.rsplit(".", 1)
        timestamp, nonce = payload.split(":", 1)
        if len(nonce) < 12 or not (0 <= time.time() - int(timestamp) < 1800):
            return False
        expected = hmac.new(hashlib.sha256(("lifeos-csrf-v157:" + secret).encode()).digest(),
                            (purpose + ":" + payload).encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(mac, expected)
    except (AttributeError, ValueError, TypeError):
        return False


def _safe(value):
    return html.escape(str(value), quote=True)


def _origin_ok(handler):
    origin = handler.headers.get('Origin', '')
    host = handler.headers.get('Host', '')
    parsed = urlparse(origin)
    return bool(origin and host and parsed.scheme in ('http','https') and parsed.netloc == host)


def _throttle(handler, intent):
    # Basic abuse barrier; reverse-proxy rate limits are still recommended.
    key = (handler.client_address[0], intent)
    now = time.monotonic()
    with _LOCK:
        items = [t for t in _ATTEMPTS[key] if now - t < 900]
        if len(items) >= 10:
            _ATTEMPTS[key] = items
            return False
        _ATTEMPTS[key] = items + [now]
        if len(_ATTEMPTS) > 20000:
            _ATTEMPTS.clear()
    return True


def _response(handler, code, body, cookie=None, location=None):
    raw = body.encode('utf-8')
    handler.send_response(code)
    handler.send_header('Content-Type', 'text/html; charset=utf-8')
    handler.send_header('Content-Length', str(len(raw)))
    handler.send_header('Cache-Control', 'no-store, private')
    handler.send_header('X-Content-Type-Options', 'nosniff')
    handler.send_header('Referrer-Policy', 'no-referrer')
    handler.send_header('X-Frame-Options', 'DENY')
    handler.send_header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
    if cookie:
        handler.send_header('Set-Cookie',cookie)
    if location:
        handler.send_header('Location',location)
    handler.end_headers()
    handler.wfile.write(raw)


def _cookie(handler, value, clear=False):
    flag = '; Secure' if handler.headers.get('X-Forwarded-Proto','').split(',')[0].strip() == 'https' else ''
    return COOKIE + '=' + value + '; Path=/account; HttpOnly; SameSite=Strict; Max-Age=' + ('0' if clear else str(AUTH_TTL)) + flag


def _shell(title, inner):
    return """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>""" + _safe(title) + """ · LifeOS Personal</title>
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#030d20;color:#eef8fa;font:16px system-ui,sans-serif;min-height:100dvh;display:grid;place-items:center;padding:20px}
main{width:min(100%,460px);border:1px solid #31556a;background:#07192d;border-radius:23px;padding:25px;box-shadow:0 24px 60px #0007}.brand{font-weight:900;color:#65cfb6;letter-spacing:.08em}h1{font-size:28px;margin:20px 0 8px}p,small{line-height:1.5;color:#acbecb}label{display:block;margin:18px 0 7px;font-weight:650}input{width:100%;border:1px solid #42647a;border-radius:11px;background:#122b40;color:#fff;padding:13px;min-height:50px;font:inherit}button,a.button{display:block;width:100%;border:1px solid #37546a;border-radius:12px;color:#fff;padding:15px;text-align:center;text-decoration:none;background:#0d3042;font:inherit;font-weight:750;min-height:51px;margin-top:14px;cursor:pointer}button.primary{background:#00765d;border-color:#00765d}.muted{color:#b5c2d0}.alert{border:1px solid #975957;background:#3b1723;border-radius:11px;padding:12px;color:#ffc4c2}.notice{border:1px solid #2c826e;background:#093328;border-radius:11px;padding:13px}.links{margin-top:18px}.links a{color:#8ae6ce}input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #7de5cc;outline-offset:2px}
</style></head><body><main><div class="brand">LIFEOS · PERSONAL</div>""" + inner + """</main></body></html>"""


def _body(handler):
    try:
        n = int(handler.headers.get('Content-Length','0'))
        if n <= 0 or n > 4096:
            return None
        return parse_qs(handler.rfile.read(n).decode('utf-8'), keep_blank_values=True)
    except (ValueError,UnicodeError):
        return None


def _field(data, name):
    values = data.get(name,[]) if data else []
    return values[0].strip() if len(values) == 1 and isinstance(values[0],str) else ''


def _init(db):
    with db.cursor() as c:
        c.execute('CREATE SCHEMA IF NOT EXISTS lifeos_beta_accounts')
        c.execute("""CREATE TABLE IF NOT EXISTS lifeos_beta_accounts.users(
            id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            display_name text NOT NULL, email text NOT NULL UNIQUE,
            phone text NOT NULL DEFAULT '', password_hash bytea NOT NULL,
            salt bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
            email_verified boolean NOT NULL DEFAULT false,
            phone_verified boolean NOT NULL DEFAULT false)""")
        c.execute("""CREATE TABLE IF NOT EXISTS lifeos_beta_accounts.sessions(
            token_hash bytea PRIMARY KEY, user_id bigint NOT NULL REFERENCES lifeos_beta_accounts.users(id) ON DELETE CASCADE,
            expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now())""")


def _db(database_url):
    import psycopg
    return psycopg.connect(database_url, connect_timeout=5)


def _page_signup(error='', secret=''):
    notice = '<div class="alert" role="alert">'+_safe(error)+'</div>' if error else ''
    return _shell('Create account','''<h1>Create your LifeOS account</h1>
<p>Register your own identity. This beta registration is separate from the existing private LifeOS workspace.</p>''' + notice + '''
<form action="/account/register" method="post"><input type="hidden" name="csrf" value="''' + _csrf_token(secret, 'register') + '''">
<label for="name">Your name</label><input id="name" name="name" autocomplete="name" required maxlength="100">
<label for="email">Email address</label><input id="email" type="email" name="email" autocomplete="email" required maxlength="254">
<label for="phone">Phone number (optional)</label><input id="phone" name="phone" autocomplete="tel" inputmode="tel" maxlength="24" placeholder="+46 ...">
<label for="password">Create password (minimum 12 characters)</label><input id="password" type="password" name="password" autocomplete="new-password" required minlength="12" maxlength="128">
<label for="confirmation">Confirm password</label><input id="confirmation" type="password" name="confirmation" autocomplete="new-password" required minlength="12">
<button class="primary" type="submit">Create beta account</button></form>
<p class="muted"><small>Email and phone are saved as unverified contact details. No verification messages are sent yet. Your account does not grant access to another person's activity records; independent personal workspaces are still in development.</small></p>
<div class="links"><a href="/account/login">Already registered? Sign in</a><br><a href="/login">Back to existing LifeOS sign in</a></div>''')


def _page_login(error='', secret=''):
    notice = '<div class="alert" role="alert">'+_safe(error)+'</div>' if error else ''
    return _shell('Account sign in','''<h1>Sign in to your account</h1>
<p>For newly registered beta accounts. Existing LifeOS users can use the original sign-in page.</p>''' + notice + '''
<form method="post" action="/account/login"><input type="hidden" name="csrf" value="''' + _csrf_token(secret, 'account-login') + '''"><label for="email">Email address</label>
<input id="email" type="email" name="email" autocomplete="email" required>
<label for="password">Password</label><input id="password" type="password" name="password" autocomplete="current-password" required>
<button class="primary" type="submit">Sign in</button></form>
<div class="links"><a href="/account/register">Create a new account</a><br><a href="/login">Existing LifeOS sign in</a></div>''')


def _session_user(db, handler):
    try:
        jar = SimpleCookie()
        jar.load(handler.headers.get('Cookie',''))
        raw = jar[COOKIE].value
        if len(raw) > 200: return None
        digest = hashlib.sha256(raw.encode('ascii')).digest()
    except (KeyError,ValueError,UnicodeError,TypeError):
        return None
    with db.cursor() as c:
        c.execute('''SELECT u.id,u.display_name,u.email,u.phone,u.email_verified,u.phone_verified
              FROM lifeos_beta_accounts.sessions s
              JOIN lifeos_beta_accounts.users u ON u.id=s.user_id
              WHERE s.token_hash=%s AND s.expires_at>now()''',(digest,))
        return c.fetchone()


def _home(user, secret):
    ident, name, email, phone, ev, pv = user
    return _shell('Your account','<h1>Welcome, '+_safe(name)+'</h1><div class="notice">Your private beta account is active.</div>'+
        '<p><b>Email:</b> '+_safe(email)+' — '+('Verified' if ev else 'Verification pending')+'</p>'+
        '<p><b>Phone:</b> '+(_safe(phone) if phone else 'Not added')+' — '+('Verified' if pv else 'Not verified')+'</p>'+
        '<p>Your beta account has its own private starter workspace. Your original single-user history has not been imported. Full tracking, email verification, password recovery and SMS verification are not enabled yet.</p>'+        '<a class="button" href="/account/workspace">Open my private workspace</a>'+
        '<form action="/account/logout" method="post"><input type="hidden" name="csrf" value="'+_csrf_token(secret, 'account-logout')+'"><button class="primary">Log out</button></form>'+
        '<div class="links"><a href="/account/login">Return to account sign in</a></div>')



def _workspace_init(db):
    # Separate schema and owner-bound rows; legacy tables are never referenced.
    with db.cursor() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS lifeos_beta_accounts.workspace_items(
            id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            user_id bigint NOT NULL REFERENCES lifeos_beta_accounts.users(id) ON DELETE CASCADE,
            kind text NOT NULL CHECK (kind IN ('plan','activity','task')),
            title text NOT NULL,
            starts_at timestamptz,
            ends_at timestamptz,
            completed boolean NOT NULL DEFAULT false,
            created_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT valid_workspace_interval CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at))""")
        c.execute("""CREATE INDEX IF NOT EXISTS beta_workspace_owner_idx
            ON lifeos_beta_accounts.workspace_items(user_id,created_at DESC)""")


def _workspace_home(user, rows, secret, msg=''):
    import datetime
    uid,name,mail,phone,ev,pv = user
    counts = {kind:sum(1 for x in rows if x[1]==kind) for kind in ('plan','activity','task')}
    def date_text(v):
        return _safe(v.strftime('%d %b %Y, %H:%M')) if v else ''
    tabs=[]
    for kind,heading in [('plan','Upcoming plans'),('activity','Recorded activities'),('task','Tasks')]:
        items=[r for r in rows if r[1]==kind]
        cards=''
        for r in items[:25]:
            item_id,k,title,start,end,done=r
            when=(' · '+date_text(start)) if start else ''
            span=(' – '+date_text(end)) if end else ''
            action=''
            if kind=='task' and not done:
                action='<form method="post" action="/account/workspace/finish"><input type="hidden" name="csrf" value="'+_csrf_token(secret,'workspace-finish')+'"><input type="hidden" name="item_id" value="'+str(item_id)+'"><button type="submit">Mark complete</button></form>'
            cards+='<article style="border:1px solid #31556a;border-radius:12px;padding:12px;margin:10px 0"><strong>'+_safe(title)+'</strong><br><small>'+when+span+(' · Completed' if done else '')+'</small>'+action+'</article>'
        tabs.append('<section style="margin-top:24px"><h2>'+heading+' <small>('+str(counts[kind])+')</small></h2>'+(cards or '<p>No '+heading.lower()+' yet.</p>')+'</section>')
    notice='<div class="notice">'+_safe(msg)+'</div>' if msg else ''
    return _shell('My workspace','''<div class="brand">PRIVATE BETA WORKSPACE</div><h1>Your personal space</h1><p>Signed in as '''+_safe(name)+'''</p>'''+notice+'''
<p>Only this account can see these records. Planned time is not tracked time.</p>
<div class="notice"><b>'''+str(counts['plan'])+''' plans · '''+str(counts['activity'])+''' activities · '''+str(counts['task'])+''' tasks</b></div>
<h2>Add an item</h2>
<form method="post" action="/account/workspace/add">
<input type="hidden" name="csrf" value="'''+_csrf_token(secret,'workspace-add')+'''">
<label for="kind">Type</label><select id="kind" name="kind" required><option value="plan">Plan</option><option value="activity">Activity completed (manual entry)</option><option value="task">Task</option></select>
<label for="title">Title</label><input id="title" name="title" maxlength="140" required placeholder="e.g. Study, gym, read">
<label for="start">Start (optional)</label><input id="start" name="start" type="datetime-local">
<label for="end">End (optional)</label><input id="end" name="end" type="datetime-local">
<p><small>For activities, supply both actual start and end times. This is a manually entered record, not an automatically measured timer.</small></p>
<button class="primary" type="submit">Save to my workspace</button></form>
'''+''.join(tabs)+'''
<div class="links"><a href="/account/home">Account & security</a> · <a href="/account/logout" onclick="event.preventDefault();document.getElementById('betaSignout').submit()">Log out</a></div>
<form id="betaSignout" method="post" action="/account/logout"><input type="hidden" name="csrf" value="'''+_csrf_token(secret,'account-logout')+'''"></form>''').replace('</style>', 'select{width:100%;border:1px solid #42647a;border-radius:11px;background:#122b40;color:#fff;padding:13px;min-height:50px;font:inherit}</style>')


def _datetime(value):
    from datetime import datetime, timezone
    if not value:
        return None
    try:
        # Explicit Stockholm-local wall time input, converted to UTC in DB.
        from zoneinfo import ZoneInfo
        dt=datetime.strptime(value, '%Y-%m-%dT%H:%M').replace(tzinfo=ZoneInfo('Europe/Stockholm'))
        return dt.astimezone(timezone.utc)
    except (ValueError,OverflowError):
        return None


def workspace_get(handler, database_url, secret):
    if not database_url:
        _response(handler,503,_shell('Unavailable','<h1>Workspace storage is unavailable</h1>'))
        return
    try:
        with _db(database_url) as db:
            _init(db)
            user=_session_user(db,handler)
            if not user:
                _response(handler,303,'',location='/account/login');return
            _workspace_init(db)
            with db.cursor() as c:
                c.execute("""SELECT id,kind,title,starts_at,ends_at,completed
                    FROM lifeos_beta_accounts.workspace_items WHERE user_id=%s
                    ORDER BY created_at DESC LIMIT 150""",(user[0],))
                rows=c.fetchall()
        _response(handler,200,_workspace_home(user,rows,secret))
    except Exception:
        _response(handler,503,_shell('Unavailable','<h1>Workspace temporarily unavailable</h1><p>No data were changed.</p>'))


def workspace_post(handler, path, database_url, secret):
    form=_body(handler)
    purpose='workspace-add' if path.endswith('/add') else 'workspace-finish'
    if form is None or not _csrf_valid(secret,purpose,_field(form,'csrf')):
        _response(handler,403,_shell('Rejected','<h1>Invalid workspace request</h1>'));return
    if not _throttle(handler,path):
        _response(handler,429,_shell('Try later','<h1>Too many requests</h1>'));return
    if not database_url:
        _response(handler,503,_shell('Unavailable','<h1>Workspace storage unavailable</h1>'));return
    try:
        with _db(database_url) as db:
            _init(db)
            user=_session_user(db,handler)
            if not user:
                _response(handler,303,'',location='/account/login');return
            _workspace_init(db)
            with db.cursor() as c:
                if path.endswith('/add'):
                    kind=_field(form,'kind');title=_field(form,'title')
                    start=_datetime(_field(form,'start'));end=_datetime(_field(form,'end'))
                    if (kind not in ('plan','activity','task') or not 1<=len(title)<=140 or
                        (_field(form,'start') and start is None) or (_field(form,'end') and end is None) or
                        (start and end and end<start) or (kind=='activity' and (not start or not end))):
                        _response(handler,400,_shell('Invalid entry','<h1>Check the entry</h1><p>Activities need both actual start and end times. End must not precede start.</p><a class="button" href="/account/workspace">Back</a>'));return
                    c.execute("""INSERT INTO lifeos_beta_accounts.workspace_items
                        (user_id,kind,title,starts_at,ends_at) VALUES (%s,%s,%s,%s,%s)""",
                        (user[0],kind,title,start,end))
                else:
                    item=_field(form,'item_id')
                    if not item.isdecimal() or len(item)>18:
                        _response(handler,400,_shell('Invalid entry','<h1>Invalid task</h1>'));return
                    c.execute("""UPDATE lifeos_beta_accounts.workspace_items SET completed=true
                        WHERE user_id=%s AND id=%s AND kind='task'""",(user[0],int(item)))
        _response(handler,303,'',location='/account/workspace')
    except Exception:
        _response(handler,503,_shell('Unavailable','<h1>Could not save</h1><p>Your original LifeOS data were not modified.</p>'))

def handle_get(handler, path, database_url, secret):
    if path == '/account/workspace':
        workspace_get(handler,database_url,secret)
        return
    if path == '/account/register':
        _response(handler,200,_page_signup(secret=secret))
        return
    if path == '/account/login':
        _response(handler,200,_page_login(secret=secret))
        return
    if path == '/account/home':
        if not database_url:
            _response(handler,503,_shell('Unavailable','<h1>Account storage is not configured</h1>'))
            return
        try:
            with _db(database_url) as db:
                _init(db)
                user = _session_user(db,handler)
            if not user:
                _response(handler,303,'',location='/account/login')
            else:
                _response(handler,200,_home(user,secret))
        except Exception:
            _response(handler,503,_shell('Unavailable','<h1>Account storage temporarily unavailable</h1><p>No records were changed.</p>'))
        return


def handle_post(handler, path, database_url, secret):
    if path in ('/account/workspace/add','/account/workspace/finish'):
        workspace_post(handler,path,database_url,secret)
        return
    if not _throttle(handler, path):
        _response(handler,429,_shell('Try later','<h1>Too many attempts</h1><p>Please try again later.</p>'))
        return
    # HTML forms without inputs send an empty POST body; accept only for logout
    # after verifying same-origin. All account creation/login requests still
    # require a valid form body.
    form = _body(handler)
    purpose = {'/account/register':'register', '/account/login':'account-login',
               '/account/logout':'account-logout'}.get(path, '')
    signed = bool(form is not None and purpose and
                  _csrf_valid(secret, purpose, _field(form, 'csrf')))
    if form is None or not (_origin_ok(handler) or signed):
        _response(handler,403,_shell('Invalid request','<h1>Request rejected</h1><p>Use the form on this website.</p>'))
        return
    if path == '/account/logout':
        if database_url:
            try:
                with _db(database_url) as db:
                    _init(db)
                    jar = SimpleCookie();jar.load(handler.headers.get('Cookie',''))
                    raw = jar[COOKIE].value
                    with db.cursor() as c:
                        c.execute('DELETE FROM lifeos_beta_accounts.sessions WHERE token_hash=%s',(hashlib.sha256(raw.encode()).digest(),))
            except (KeyError,ValueError):
                pass
            except Exception:
                _response(handler,503,_shell('Unavailable','<h1>Sign-out temporarily unavailable</h1>'))
                return
        _response(handler,303,'',cookie=_cookie(handler,'',True),location='/account/login')
        return
    if not database_url:
        _response(handler,503,_shell('Unavailable','<h1>Account registration is not configured</h1><p>Please use the existing LifeOS sign in.</p>'))
        return
    email = _field(form,'email').lower()
    password = _field(form,'password')
    if not _EMAIL.fullmatch(email) or len(email)>254 or not password:
        _response(handler,400,_page_signup('Enter a valid email and password.', secret) if path.endswith('register') else _page_login('Enter a valid email and password.', secret))
        return
    try:
        with _db(database_url) as db:
            _init(db)
            with db.cursor() as c:
                if path == '/account/register':
                    name = _field(form,'name')
                    phone = _field(form,'phone')
                    confirm = _field(form,'confirmation')
                    if not (2<=len(name)<=100) or len(password)<12 or len(password)>128 or password!=confirm or (phone and not _PHONE.fullmatch(phone)):
                        _response(handler,400,_page_signup('Check your name, password confirmation and optional phone number.', secret))
                        return
                    salt = os.urandom(16)
                    hashed = hashlib.pbkdf2_hmac('sha256',password.encode(),salt,450000)
                    c.execute('SELECT id FROM lifeos_beta_accounts.users WHERE email=%s',(email,))
                    if c.fetchone():
                        _response(handler,409,_page_signup('This email is already registered. Sign in instead.', secret))
                        return
                    c.execute('INSERT INTO lifeos_beta_accounts.users(display_name,email,phone,password_hash,salt) VALUES (%s,%s,%s,%s,%s) RETURNING id',(name,email,phone,hashed,salt))
                    user_id = c.fetchone()[0]
                else:
                    c.execute('SELECT id,password_hash,salt FROM lifeos_beta_accounts.users WHERE email=%s',(email,))
                    existing=c.fetchone()
                    # Avoid revealing registration status; verify against dummy on misses.
                    salt=bytes(existing[2]) if existing else bytes(16)
                    expected=bytes(existing[1]) if existing else bytes(32)
                    trial=hashlib.pbkdf2_hmac('sha256',password.encode(),salt,450000)
                    if not hmac.compare_digest(trial,expected) or existing is None:
                        _response(handler,401,_page_login('Invalid email or password.', secret))
                        return
                    user_id=existing[0]
                token=secrets.token_urlsafe(32)
                digest=hashlib.sha256(token.encode('ascii')).digest()
                c.execute('INSERT INTO lifeos_beta_accounts.sessions(token_hash,user_id,expires_at) VALUES (%s,%s,now()+interval \'12 hours\')',(digest,user_id))
        _response(handler,303,'',cookie=_cookie(handler,token),location='/account/home')
    except Exception:
        _response(handler,503,_shell('Unavailable','<h1>Account service temporarily unavailable</h1><p>Your existing LifeOS workspace has not been touched. Please try again later.</p>'))
