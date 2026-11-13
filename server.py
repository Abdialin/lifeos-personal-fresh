"""LifeOS Personal V3.2: SQLite by default, optional PostgreSQL persistence."""
import base64
import hashlib
import hmac
import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import google_calendar as gcal
import calendar_audit_store as audit_store
import atomic_calendar

ROOT = Path(__file__).resolve().parent
DB = Path(os.environ.get('LIFEOS_DB', str(ROOT / 'data' / 'lifeos.sqlite3')))
DATABASE_URL = os.environ.get('LIFEOS_DATABASE_URL', '').strip()
TOKEN = os.environ.get('LIFEOS_TOKEN', '')
USERNAME = os.environ.get('LIFEOS_USERNAME', '')
PASSWORD = os.environ.get('LIFEOS_PASSWORD', '')
PORT = int(os.environ.get('PORT', '8080'))
lock = threading.RLock()

if DATABASE_URL:
    if not DATABASE_URL.startswith(('postgresql://', 'postgres://')):
        raise RuntimeError('LIFEOS_DATABASE_URL must be a PostgreSQL URL')
    try:
        import psycopg
        from psycopg.types.json import Jsonb
    except ImportError as exc:
        raise RuntimeError('PostgreSQL requires psycopg[binary]; install requirements-v3.2.txt') from exc
else:
    DB.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB) as db:
        db.execute('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id=1), revision INTEGER NOT NULL, payload TEXT NOT NULL)')
        db.commit()


def read_state():
    """Return (revision, payload); never substitute another backend on error."""
    if DATABASE_URL:
        with psycopg.connect(DATABASE_URL, connect_timeout=10) as db:
            with db.cursor() as cur:
                cur.execute('SELECT revision,payload FROM lifeos.state WHERE id=1')
                row = cur.fetchone()
        return (int(row[0]), row[1] if isinstance(row[1], dict) else json.loads(row[1])) if row else (0, None)
    with lock, sqlite3.connect(DB) as db:
        row = db.execute('SELECT revision,payload FROM state WHERE id=1').fetchone()
    return (int(row[0]), json.loads(row[1])) if row else (0, None)


def save_state(expected, data):
    """Atomic compare-and-swap. Returns (saved, actual_revision)."""
    if DATABASE_URL:
        with psycopg.connect(DATABASE_URL, connect_timeout=10) as db:
            with db.cursor() as cur:
                if expected == 0:
                    cur.execute('''INSERT INTO lifeos.state (id,revision,payload,updated_at)
                                   VALUES (1,1,%s,now()) ON CONFLICT (id) DO NOTHING
                                   RETURNING revision''', (Jsonb(data),))
                else:
                    cur.execute('''UPDATE lifeos.state SET revision=revision+1,
                                   payload=%s, updated_at=now()
                                   WHERE id=1 AND revision=%s RETURNING revision''',
                                (Jsonb(data), expected))
                result = cur.fetchone()
                if result:
                    return True, int(result[0])
                cur.execute('SELECT revision FROM lifeos.state WHERE id=1')
                row = cur.fetchone()
                return False, int(row[0]) if row else 0
    with lock, sqlite3.connect(DB) as db:
        db.execute('BEGIN IMMEDIATE')
        row = db.execute('SELECT revision FROM state WHERE id=1').fetchone()
        actual = int(row[0]) if row else 0
        if actual != expected:
            db.rollback()
            return False, actual
        payload = json.dumps(data, separators=(',', ':'))
        db.execute('''INSERT INTO state(id,revision,payload) VALUES(1,?,?)
                      ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,
                      payload=excluded.payload''', (actual + 1, payload))
        db.commit()
        return True, actual + 1


def initialize_postgres_schema():
    """Create missing LifeOS tables only. Never rewrite, truncate or seed user records."""
    if not DATABASE_URL:
        return
    # Exact definitions mirror postgres_schema.sql; both operations are idempotent.
    with psycopg.connect(DATABASE_URL, connect_timeout=10) as db:
        with db.cursor() as cur:
            cur.execute('CREATE SCHEMA IF NOT EXISTS lifeos')
            cur.execute('''CREATE TABLE IF NOT EXISTS lifeos.state (
                id integer PRIMARY KEY CHECK (id = 1),
                revision bigint NOT NULL CHECK (revision >= 1),
                payload jsonb NOT NULL,
                updated_at timestamptz NOT NULL DEFAULT now()
            )''')
            cur.execute('''CREATE TABLE IF NOT EXISTS lifeos.calendar_audit (
                sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                id text UNIQUE NOT NULL,
                entry jsonb NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now()
            )''')


def read_storage_status():
    """Read-only backend probe; never retrieves or changes workspace contents."""
    if DATABASE_URL:
        with psycopg.connect(DATABASE_URL, connect_timeout=10) as db:
            with db.cursor() as cur:
                cur.execute('SELECT revision FROM lifeos.state WHERE id=1')
                row = cur.fetchone()
        backend = 'postgresql'
    else:
        with lock, sqlite3.connect(DB) as db:
            row = db.execute('SELECT revision FROM state WHERE id=1').fetchone()
        backend = 'sqlite'
    return {
        'backend': backend,
        'read_only': True,
        'storage_readable': True,
        'revision': int(row[0]) if row else 0,
        'has_state': row is not None,
    }


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, body):
        blob = json.dumps(body, separators=(',', ':')).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(blob)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(blob)

    def private_access(self):
        if not USERNAME or not PASSWORD or not TOKEN:
            self.reply(503, {'error': 'Configure LIFEOS_USERNAME, LIFEOS_PASSWORD and LIFEOS_TOKEN'})
            return False
        auth = self.headers.get('Authorization', '')
        if auth.startswith('Basic '):
            try:
                decoded = base64.b64decode(auth[6:], validate=True).decode('utf-8')
                username, sep, password = decoded.partition(':')
                if sep and hmac.compare_digest(username, USERNAME) and hmac.compare_digest(password, PASSWORD):
                    return True
            except (ValueError, UnicodeError):
                pass
        self.send_response(401)
        self.send_header('WWW-Authenticate', 'Basic realm="Private LifeOS"')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', '0')
        self.end_headers()
        return False

    def auth(self):
        if not TOKEN:
            self.reply(503, {'error': 'Set LIFEOS_TOKEN before using the sync API'})
            return False
        if not hmac.compare_digest(self.headers.get('X-LifeOS-Token', ''), TOKEN):
            self.reply(401, {'error': 'Invalid sync token'})
            return False
        return True

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/healthz':
            self.reply(200, {'status': 'ok'})
            return
        if not self.private_access():
            return
        if path == '/api/storage/status':
            if not self.auth(): return
            try:
                self.reply(200, read_storage_status())
            except Exception:
                self.reply(503, {'error': 'Storage status unavailable; no data changed'})
            return
        if path == '/api/calendar/audit':
            if not self.auth(): return
            try: self.reply(200, {'entries': audit_store.list_entries(DB, DATABASE_URL)})
            except Exception: self.reply(503, {'error':'Audit storage unavailable'})
            return
        if path == '/api/calendar/status':
            try:
                self.reply(200, {'configured': bool(gcal.ready()), 'connected': bool(gcal.load()) if gcal.ready() else False, 'read_only': True})
            except Exception:
                self.reply(503, {'error': 'Calendar storage unavailable'})
            return
        if path == '/api/calendar/connect':
            try:
                target = gcal.begin()
                self.send_response(302)
                self.send_header('Location', target)
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Content-Length', '0')
                self.end_headers()
            except Exception:
                self.reply(503, {'error': 'Google OAuth configuration or storage unavailable'})
            return
        if path == '/api/calendar/callback':
            q = parse_qs(urlparse(self.path).query)
            try:
                gcal.finish(q.get('state', [''])[0], q.get('code', [''])[0])
                self.send_response(303)
                self.send_header('Location', '/calendar.html?connected=1')
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Content-Length', '0')
                self.end_headers()
            except Exception:
                self.reply(400, {'error': 'Calendar authorization failed or expired'})
            return
        if path == '/api/calendar/events':
            q = parse_qs(urlparse(self.path).query)
            try:
                self.reply(200, gcal.fetch_events(q.get('start',[''])[0], q.get('end',[''])[0]))
            except ValueError as exc:
                self.reply(400, {'error': str(exc)})
            except Exception:
                self.reply(503, {'error': 'Calendar request failed; no LifeOS data changed'})
            return
        if path in ('/backup', '/api/state'):
            if path == '/api/state' and not self.auth():
                return
            try:
                revision, data = read_state()
            except Exception:
                self.reply(503, {'error': 'Database temporarily unavailable; no data was changed'})
                return
            if path == '/api/state':
                self.reply(200, {'revision': revision, 'data': data})
                return
            if data is not None and (not isinstance(data, dict) or data.get('version') != 1):
                self.reply(500, {'error': 'Stored state failed backup validation'})
                return
            canonical = json.dumps({'revision': revision, 'data': data}, sort_keys=True, separators=(',', ':')).encode('utf-8')
            backup = {
                'format': 'lifeos-v3.1-backup',
                'exported_at_utc': datetime.now(timezone.utc).isoformat(),
                'revision': revision,
                'data': data,
                'sha256': hashlib.sha256(canonical).hexdigest(),
                'note': 'Read-only export. Keep private. Save independently for recovery.'
            }
            blob = json.dumps(backup, ensure_ascii=False, indent=2).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Disposition', 'attachment; filename="lifeos-backup.json"')
            self.send_header('Content-Length', str(len(blob)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(blob)
            return
        if path in ('/', '/index.html', '/calendar.html') or path.lstrip('/') in ('calendar.js', 'ideal_planning.js', 'live_tracking_v2.js', 'personal_activity_modules.js', 'personal_analytics_quality.js', 'personal_calendar_review.js', 'personal_continuity.js', 'personal_goal_recovery_dashboard.js', 'personal_management.js', 'personal_offline_integrity.js', 'personal_pattern_suggestions.js', 'personal_phase1_insights_ui.js', 'personal_predictive_planner.js', 'personal_progress.js', 'personal_readiness.js', 'personal_recovery_simulator.js', 'personal_reminders.js', 'personal_schedule_evidence.js', 'personal_tracking_recovery.js', 'personal_unified_navigation.js', 'personal_weekly_dashboard.js', 'lifeos_unified_analytics.js', 'personal_dashboard_live.js', 'personal_visual_intelligence_v4.js', 'personal_visual_experience_v5.js', 'personal_goals_life_visuals_v6.js', 'personal_design_v5.css', 'personal_experience_v7.css', 'personal_experience_v8.css', 'personal_experience_v8.js', 'personal_fitness_nutrition_v9.js', 'personal_fitness_nutrition_v9.css', 'personal_meal_photo_v9.js', 'personal_health_history_v10.js', 'personal_health_history_v10.css', 'personal_planning_v11.js', 'personal_planning_v11.css', 'personal_layout_v12.js', 'personal_layout_v12.css', 'personal_focus_v13.css', 'personal_structure_v14.js', 'personal_structure_v14.css', 'personal_everyday_v15.js', 'personal_everyday_v15.css', 'personal_reminder_experience_v16.js', 'personal_reminder_experience_v16.css', 'predictive_intelligence.js', 'smart_schedule.js', 'prediction_demo.js', 'prediction_visuals.js', 'development_starter.js', 'development_starter_repair.js'):
            try:
                filename = path.lstrip('/') if path not in ('/', '/index.html') else 'index.html'
                blob = (ROOT / filename).read_bytes()
            except OSError:
                self.reply(503, {'error': 'Application interface unavailable'})
                return
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript; charset=utf-8' if path.endswith('.js') else ('text/css; charset=utf-8' if path.endswith('.css') else 'text/html; charset=utf-8'))
            self.send_header('Content-Length', str(len(blob)))
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(blob)
            return
        self.reply(404, {'error': 'Not found'})

    def do_POST(self):
        if not self.private_access(): return
        if urlparse(self.path).path == '/api/calendar/commit':
            if not self.auth(): return
            try:
                n=int(self.headers.get('Content-Length','0'))
                if n < 1 or n > 2_000_000: self.reply(413,{'error':'Invalid payload length'});return
                obj=json.loads(self.rfile.read(n))
                result=atomic_calendar.commit(DB,DATABASE_URL,obj['revision'],obj['data'],obj['decision'])
                self.reply(200 if result['status'] in ('committed','duplicate') else 409,result)
            except (ValueError,TypeError,KeyError,json.JSONDecodeError) as exc:
                self.reply(400,{'error':str(exc)})
            except Exception:
                self.reply(503,{'error':'Atomic commit unavailable; transaction not confirmed'})
            return
        if urlparse(self.path).path == '/api/calendar/audit':
            if not self.auth(): return
            try:
                n = int(self.headers.get('Content-Length', '0'))
                if n < 1 or n > 16384: raise ValueError('Invalid audit payload length')
                entry = json.loads(self.rfile.read(n))
                result = audit_store.append_entry(DB, DATABASE_URL, entry)
                self.reply(200 if result['status'] == 'stored' else 409, result)
            except (ValueError, TypeError, json.JSONDecodeError) as exc: self.reply(400, {'error':str(exc)})
            except Exception: self.reply(503, {'error':'Audit storage unavailable'})
            return
        if urlparse(self.path).path != '/api/calendar/disconnect':
            self.reply(404, {'error':'Not found'}); return
        # Additional CSRF protection for state-changing request.
        if not self.auth(): return
        try:
            gcal.disconnect()
            self.reply(200, {'connected':False})
        except Exception:
            self.reply(503, {'error':'Calendar storage unavailable'})

    def do_PUT(self):
        if not self.private_access():
            return
        if urlparse(self.path).path != '/api/state':
            self.reply(404, {'error': 'Not found'})
            return
        if not self.auth():
            return
        try:
            n = int(self.headers.get('Content-Length', '0'))
            if n < 1 or n > 2_000_000:
                self.reply(413, {'error': 'Payload size must be 1–2MB'})
                return
            obj = json.loads(self.rfile.read(n))
            expected, data = obj['revision'], obj['data']
            if (type(expected) is not int or expected < 0 or not isinstance(data, dict)
                    or data.get('version') != 1 or not isinstance(data.get('sessions'), list)
                    or not isinstance(data.get('events'), list)):
                raise ValueError('Invalid data shape')
            if len(data['sessions']) > 10000 or len(data['events']) > 100000:
                raise ValueError('Too many records')
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
            self.reply(400, {'error': str(exc)})
            return
        try:
            saved, revision = save_state(expected, data)
        except Exception:
            self.reply(503, {'error': 'Database temporarily unavailable; save not confirmed'})
            return
        if not saved:
            self.reply(409, {'error': 'Conflict: server data has changed', 'revision': revision})
            return
        self.reply(200, {'revision': revision})

    def log_message(self, fmt, *args):
        if '/api/' not in self.path:
            super().log_message(fmt, *args)


if __name__ == '__main__':
    # Backend mode only: never log database URLs, credentials, or activity content.
    # flush=True ensures Render captures this diagnostic before normal request logs.
    print('LifeOS startup | storage_backend=' + ('postgresql' if DATABASE_URL else 'sqlite') + ' | configured_by=' + ('LIFEOS_DATABASE_URL' if DATABASE_URL else 'LIFEOS_DB'), flush=True)
    # Safe startup migration: CREATE IF NOT EXISTS never overwrites workspace payloads.
    # Fail the probe visibly if permissions or networking block initialization.
    if DATABASE_URL:
        try:
            initialize_postgres_schema()
            print('LifeOS startup | schema_check=ok', flush=True)
        except Exception as exc:
            print('LifeOS startup | schema_check=failed | error_type=' + type(exc).__name__, flush=True)
    # Read only revision metadata. Never print its value or workspace records.
    try:
        status = read_storage_status()
        print('LifeOS startup | storage_probe=' + ('ok' if status['read_only'] and status['storage_readable'] else 'unverified'), flush=True)
    except Exception as exc:
        print('LifeOS startup | storage_probe=failed | error_type=' + type(exc).__name__, flush=True)
    ThreadingHTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
