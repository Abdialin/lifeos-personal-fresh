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
import schedule_document_preview as document_preview
import schedule_table_preview_v98 as table_preview
import google_calendar as gcal
import calendar_audit_store as audit_store
import atomic_calendar
import personal_preferences_store_v89 as preference_store
import personal_account_http_v117 as account_http
import lifeos_browser_login_v153 as browser_login
import lifeos_beta_accounts_v155 as beta_accounts
import lifeos_beta_dashboard_v159 as beta_dashboard

ROOT = Path(__file__).resolve().parent
DB = Path(os.environ.get('LIFEOS_DB', str(ROOT / 'data' / 'lifeos.sqlite3')))
DATABASE_URL = os.environ.get('LIFEOS_DATABASE_URL', '').strip()
TOKEN = os.environ.get('LIFEOS_TOKEN', '')
USERNAME = os.environ.get('LIFEOS_USERNAME', '')
PASSWORD = os.environ.get('LIFEOS_PASSWORD', '')
PORT = int(os.environ.get('PORT', '8080'))
lock = threading.RLock()
# Account routes are OFF unless explicitly enabled. They never use the legacy
# shared activity state, Basic Auth sync token, or automatic migration.
ACCOUNT_ENABLED = os.environ.get('LIFEOS_ACCOUNT_API_ENABLED','0') == '1'
ACCOUNT_ORIGIN = os.environ.get('LIFEOS_ACCOUNT_API_ORIGIN','')
ACCOUNT_DB_PATH = os.environ.get('LIFEOS_ACCOUNT_DB_PATH','')
account_boundary = None
def initialize_account_boundary():
    global account_boundary
    if not ACCOUNT_ENABLED:
        return
    if DATABASE_URL:
        raise RuntimeError('V117 account API requires an independently reviewed PostgreSQL adapter; disabled with legacy PostgreSQL storage')
    if not ACCOUNT_ORIGIN or not ACCOUNT_DB_PATH:
        raise RuntimeError('V117 account API requires HTTPS origin and separate absolute persistent SQLite path')
    if Path(ACCOUNT_DB_PATH).resolve() == DB.resolve():
        raise RuntimeError('Account database must not equal the legacy LifeOS database')
    account_boundary = account_http.AccountBoundary(ACCOUNT_DB_PATH, ACCOUNT_ORIGIN)


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
        preference_store.init_sqlite(DB)
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
            cur.execute('''CREATE TABLE IF NOT EXISTS lifeos.personal_preferences (
                id integer PRIMARY KEY CHECK(id = 1),
                revision bigint NOT NULL,
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
        if browser_login.is_logged_out(self.headers, PASSWORD, TOKEN):
            browser_login.unauthenticated(self, urlparse(self.path).path, self.command)
            return False
        if browser_login.is_signed_in(self.headers, PASSWORD, TOKEN):
            return True
        auth = self.headers.get('Authorization', '')
        if auth.startswith('Basic '):
            try:
                decoded = base64.b64decode(auth[6:], validate=True).decode('utf-8')
                username, sep, password = decoded.partition(':')
                if sep and hmac.compare_digest(username, USERNAME) and hmac.compare_digest(password, PASSWORD):
                    return True
            except (ValueError, UnicodeError):
                pass
        browser_login.unauthenticated(self, urlparse(self.path).path, self.command)
        return False

    def auth(self):
        if not TOKEN:
            self.reply(503, {'error': 'Set LIFEOS_TOKEN before using the sync API'})
            return False
        if not hmac.compare_digest(self.headers.get('X-LifeOS-Token', ''), TOKEN):
            self.reply(401, {'error': 'Invalid sync token'})
            return False
        return True

    def handle_account_request(self, method, path):
        if not path.startswith(account_http.PREFIX+'/'):
            return False
        if account_boundary is None:
            self.reply(404, {'error':'Not found'})
            return True
        raw=None
        if method in ('POST','PUT'):
            try:
                n=int(self.headers.get('Content-Length','0'))
            except ValueError:
                self.reply(400,{'error':'Invalid content length'});return True
            if n<1 or n>account_http.MAX_REQUEST:
                self.reply(413,{'error':'Account request exceeds limit'});return True
            raw=self.rfile.read(n)
        try:
            status,result=account_boundary.route(method,self.path,self.headers,raw,client=self.client_address[0])
            self.reply(status,result)
        except Exception:
            self.reply(503,{'error':'Account service unavailable; no legacy data changed'})
        return True

    def do_HEAD(self):
        # HTTP metadata checks must never return activity payloads.
        # Preserve the private-access boundary on the main application.
        path = urlparse(self.path).path
        if path == '/healthz':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', '0')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            return
        if not self.private_access():
            return
        if path in ('/', '/index.html', '/calendar.html'):
            filename = 'index.html' if path in ('/', '/index.html') else 'calendar.html'
            try:
                size = (ROOT / filename).stat().st_size
            except OSError:
                self.reply_head_error(503)
                return
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(size))
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            return
        self.reply_head_error(404)

    def reply_head_error(self, status):
        self.send_response(status)
        self.send_header('Content-Length', '0')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/account/app':
            beta_dashboard.get(self,DATABASE_URL,TOKEN)
            return
        if path.startswith('/account/') and path in ('/account/register','/account/login','/account/home','/account/workspace'):
            beta_accounts.handle_get(self,path,DATABASE_URL,TOKEN)
            return
        if path == '/login':
            browser_login.show_login(self, TOKEN)
            return
        if path == '/logout':
            browser_login.show_logout(self, TOKEN)
            return
        if path == '/healthz':
            self.reply(200, {'status': 'ok'})
            return
        if not self.private_access():
            return
        if path == '/api/account/v117/status':
            self.reply(200, {'enabled':account_boundary is not None})
            return
        if self.handle_account_request('GET',path):return
        if path == '/api/preferences/v89':
            if not self.auth(): return
            try:
                self.reply(200, preference_store.read(DATABASE_URL, DB, globals().get('psycopg'), lock))
            except Exception:
                self.reply(503, {'error':'Preference storage unavailable; no data changed'})
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
            if not gcal.ready():
                self.send_response(303)
                self.send_header('Location', '/calendar.html?error=oauth-configuration')
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Content-Length', '0')
                self.end_headers()
                return
            try:
                target = gcal.begin()
                self.send_response(302)
                self.send_header('Location', target)
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Content-Length', '0')
                self.end_headers()
            except Exception:
                self.send_response(303)
                self.send_header('Location', '/calendar.html?error=oauth-storage')
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Content-Length', '0')
                self.end_headers()
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
            except ValueError:
                # Invalid/expired OAuth state; never show private OAuth code or token.
                self.send_response(303)
                self.send_header('Location', '/calendar.html?error=oauth-state')
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Content-Length', '0')
                self.end_headers()
            except Exception:
                # This may be a provider, callback or encrypted-token storage error.
                # Preserve details in protected server diagnostics, not in the browser URL.
                self.send_response(303)
                self.send_header('Location', '/calendar.html?error=oauth-token')
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Content-Length', '0')
                self.end_headers()
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
        if path in ('/', '/index.html', '/calendar.html') or path.lstrip('/') in ('calendar.js', 'ideal_planning.js', 'live_tracking_v2.js', 'personal_activity_modules.js', 'personal_analytics_quality.js', 'personal_calendar_review.js', 'personal_continuity.js', 'personal_goal_recovery_dashboard.js', 'personal_management.js', 'personal_offline_integrity.js', 'personal_pattern_suggestions.js', 'personal_phase1_insights_ui.js', 'personal_predictive_planner.js', 'personal_progress.js', 'personal_readiness.js', 'personal_recovery_simulator.js', 'personal_reminders.js', 'personal_schedule_evidence.js', 'personal_tracking_recovery.js', 'personal_unified_navigation.js', 'personal_weekly_dashboard.js', 'lifeos_unified_analytics.js', 'personal_dashboard_live.js', 'personal_visual_intelligence_v4.js', 'personal_visual_experience_v5.js', 'personal_goals_life_visuals_v6.js', 'personal_design_v5.css', 'personal_experience_v7.css', 'personal_experience_v8.css', 'personal_experience_v8.js', 'personal_fitness_nutrition_v9.js', 'personal_fitness_nutrition_v9.css', 'personal_meal_photo_v9.js', 'personal_health_history_v10.js', 'personal_health_history_v10.css', 'personal_planning_v11.js', 'personal_planning_v11.css', 'personal_layout_v12.js', 'personal_layout_v12.css', 'personal_focus_v13.css', 'personal_structure_v14.js', 'personal_structure_v14.css', 'personal_everyday_v15.js', 'personal_everyday_v15.css', 'personal_reminder_experience_v16.js', 'personal_reminder_experience_v16.css', 'personal_today_visual_refresh_v121.css', 'personal_today_design_v122.css', 'personal_today_ladder_v123.css', 'personal_today_upcoming_v124.css', 'personal_today_hero_v125.css', 'personal_track_design_v126.css', 'personal_track_design_v126.js', 'personal_track_focus_v127.js', 'personal_track_focus_v127.css', 'personal_track_polish_v128.css', 'personal_track_polish_v128.js', 'personal_track_visual_v129.js', 'personal_track_visual_v129.css', 'personal_active_cockpit_v130.js', 'personal_active_cockpit_v130.css', 'personal_device_journey_v131.js', 'personal_device_journey_v131.css', 'personal_track_finish_v132.js', 'personal_track_finish_v132.css', 'personal_plan_studio_v133.js', 'personal_plan_studio_v133.css', 'personal_plan_product_v136.js', 'personal_plan_product_v136.css', 'personal_plan_interactions_v137.js', 'personal_plan_interactions_v137.css', 'personal_commitment_review_v140.js', 'personal_commitment_review_v140.css', 'personal_workspace_health_v151.js', 'personal_goals_product_v160.js', 'personal_goals_product_v160.css', 'personal_goals_visual_v161.js', 'personal_goals_visual_v161.css', 'personal_my_life_focus_v190.js', 'personal_my_life_focus_v190.css', 'personal_cross_section_integrity_v206.js', 'personal_gap_review_v207.js', 'personal_prayer_insights_v207.js', 'personal_focus_alarm_v207.js', 'personal_alert_engine_v221.js', 'personal_weekly_averages_v208.js', 'personal_weekly_averages_v208.css', 'personal_activity_insights_v209.js', 'personal_activity_insights_v209.css', 'personal_today_design_v122.js', 'personal_compact_sessions_v17.css', 'personal_recovery_compact_v19.js', 'personal_planning_focus_v20.js', 'personal_planning_focus_v20.css', 'personal_todo_timing_v21.js', 'personal_todo_timing_v21.css', 'personal_nutrition_explorer_v25.js', 'personal_nutrition_explorer_v25.css', 'personal_nutrition_library_v28.js', 'personal_nutrition_library_v28.css', 'personal_lifestyle_insights_v31.js', 'personal_lifestyle_insights_v31.css', 'personal_habits_social_timer_v32.js', 'personal_habits_social_timer_v32.css', 'personal_habit_insights_v33.js', 'personal_habit_recommendations_v34.js', 'personal_habit_recommendations_v34.css', 'personal_habit_schedule_approval_v35.js', 'personal_habit_schedule_approval_v35.css', 'personal_habit_feedback_v36.js', 'personal_habit_feedback_v36.css', 'personal_habit_predictive_v37.js', 'personal_habit_predictive_v37.css', 'personal_plan_brief_v39.js', 'personal_plan_brief_v39.css', 'personal_schedule_comparison_v40.js', 'personal_schedule_comparison_v40.css', 'personal_reality_gap_v41.js', 'personal_reality_gap_v41.css', 'personal_ideal_actions_v42.js', 'personal_ideal_actions_v42.css', 'personal_mobile_focus_v44.js', 'personal_mobile_focus_v44.css', 'personal_tracking_integrity_v46.js', 'personal_tracking_integrity_v46.css', 'personal_cloud_verification_v47.js', 'personal_cloud_parity_v210.js', 'personal_recovery_import_v218.js', 'personal_sync_gate_v211.js', 'personal_conflict_plan_v212.js', 'personal_reconcile_guard_v213.js', 'personal_cloud_verification_v47.css', 'personal_recovery_preview_v48.js', 'personal_recovery_preview_v48.css', 'personal_unified_activity_v53.css', 'personal_unified_activity_v53.js', 'personal_activity_timeline_v54.css', 'personal_activity_timeline_v54.js', 'personal_activity_intelligence_v55.css', 'personal_activity_intelligence_v55.js', 'personal_predictive_preview_v56.css', 'personal_predictive_preview_v56.js', 'personal_three_view_v57.css', 'personal_three_view_v57.js', 'personal_prediction_approval_v58.css', 'personal_prediction_approval_v58.js', 'personal_schedule_improvement_v59.css', 'personal_schedule_improvement_v59.js', 'personal_weekly_planning_v60.css', 'personal_weekly_planning_v60.js', 'personal_weekly_recommendations_v61.css', 'personal_weekly_recommendations_v61.js', 'personal_weekly_plan_review_v62.css', 'personal_weekly_plan_review_v62.js', 'personal_planning_assistant_v63.css', 'personal_planning_assistant_v63.js', 'personal_alternative_ranking_v64.css', 'personal_alternative_ranking_v64.js', 'personal_readiness_v68.css', 'personal_readiness_v68.js', 'personal_persistence_validator_v70.js', 'personal_background_tracking_v72.js', 'personal_background_tracking_v72.css', 'personal_device_tracking_test_v73.js', 'personal_device_tracking_test_v73.css', 'personal_accountability_v74.js', 'personal_accountability_v74.css', 'personal_debt_recovery_v75.js', 'personal_debt_recovery_v75.css', 'personal_life_navigation_v76.js', 'personal_life_navigation_v76.css', 'personal_activity_activation_v76.js', 'personal_activity_activation_v76.css', 'personal_timer_focus_v77.js', 'personal_timer_focus_v77.css', 'personal_duration_guard_v78.js', 'personal_duration_guard_v78.css', 'personal_duration_profiles_v80.js', 'personal_duration_profiles_v80.css', 'personal_guided_onboarding_v81.js', 'personal_guided_onboarding_v81.css', 'personal_import_review_v82.js', 'personal_import_review_v82.css', 'personal_progressive_fitness_nutrition_v83.js', 'personal_progressive_fitness_nutrition_v83.css', 'personal_onboarding_resume_v85.js', 'personal_ongoing_timer_v86.js', 'personal_notification_controls_v87.js', 'personal_timer_shortcut_v220.js', 'personal_android_bridge_v222.js', 'personal_android_first_run_v233.js', 'personal_android_first_run_v233.css', 'personal_android_navigation_safe_v240.css', 'personal_fresh_device_adoption_v234.js', 'personal_native_backup_v234.js', 'personal_native_secure_sync_v237.js', 'personal_browser_activity_recovery_v241.js', 'personal_activity_delta_sync_v242.js', 'personal_pending_queue_recovery_v244.js', 'personal_conflict_resolution_v245.js', 'personal_tracking_quality_v247.js', 'personal_preferences_hub_v88.js', 'personal_preferences_sync_v89.js', 'personal_friends_v90.js', 'personal_insights_suite_v94.js', 'personal_exercise_plans_v95.js', 'personal_feature_directory_v96.js', 'personal_debt_audit_v99.js', 'personal_debt_cancellation_v102.js', 'personal_exercise_progress_v100.js', 'personal_exercise_transfer_v105.js', 'personal_core_completion_v110.js', 'personal_account_friends_v118.js', 'personal_account_migration_v119.js', 'personal_planning_validation_v65.js', 'personal_goals_repair_v168.css', 'personal_goals_focus_v169.css', 'personal_day_intelligence_v170.css', 'personal_goals_three_v165.css', 'personal_goals_detail_v167.css', 'personal_day_intelligence_v170.js', 'lifeos_notifications_sw.js', 'predictive_intelligence.js', 'smart_schedule.js', 'prediction_demo.js', 'prediction_visuals.js', 'development_starter.js', 'development_starter_repair.js'):
            try:
                filename = path.lstrip('/') if path not in ('/', '/index.html') else 'index.html'
                blob = (ROOT / filename).read_bytes()
            except OSError:
                self.reply(503, {'error': 'Application interface unavailable'})
                return
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript; charset=utf-8' if path.endswith('.js') else ('text/css; charset=utf-8' if path.endswith('.css') else 'text/html; charset=utf-8'))
            self.send_header('Content-Length', str(len(blob)))
            self.send_header('Cache-Control', 'no-store, max-age=0')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(blob)
            return
        self.reply(404, {'error': 'Not found'})

    def do_POST(self):
        if urlparse(self.path).path == '/account/app/action':
            beta_dashboard.post(self,DATABASE_URL,TOKEN)
            return
        if urlparse(self.path).path in ('/account/register','/account/login','/account/logout','/account/workspace/add','/account/workspace/finish'):
            beta_accounts.handle_post(self,urlparse(self.path).path,DATABASE_URL,TOKEN)
            return
        if urlparse(self.path).path == '/logout':
            browser_login.logout(self, PASSWORD, TOKEN)
            return
        if urlparse(self.path).path == '/login':
            browser_login.login(self, USERNAME, PASSWORD, TOKEN)
            return
        if not self.private_access(): return
        if self.handle_account_request('POST',urlparse(self.path).path):return
        if urlparse(self.path).path == '/api/calendar/document-preview':
            # Stateless preview. No records are saved, approved or synchronized here.
            try:
                n=int(self.headers.get('Content-Length','0'))
                if n<1 or n>2_800_000:
                    self.reply(413,{'error':'Document upload too large (2 MB maximum)'})
                    return
                body=json.loads(self.rfile.read(n))
                filename=str(body.get('filename',''))[:160]
                raw=base64.b64decode(body.get('content',''),validate=True)
                self.reply(200,table_preview.extract(filename,raw) if filename.lower().endswith(('.csv','.xlsx')) else document_preview.extract(filename,raw))
            except (ValueError,UnicodeError,KeyError,TypeError,ImportError) as exc:
                self.reply(400,{'error':str(exc)})
            except Exception:
                self.reply(422,{'error':'Could not extract readable schedule data. Please use a text-based PDF or manually enter the activity.'})
            return
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
        path = urlparse(self.path).path
        if self.handle_account_request('PUT',path):return
        if path not in ('/api/state','/api/preferences/v89'):
            self.reply(404, {'error': 'Not found'})
            return
        if not self.auth():
            return
        if path == '/api/preferences/v89':
            try:
                n = int(self.headers.get('Content-Length','0'))
                if n < 1 or n > preference_store.MAX_BYTES:
                    self.reply(413, {'error':'Preference payload size exceeds limit'})
                    return
                request = json.loads(self.rfile.read(n))
                if not isinstance(request,dict) or set(request)!=set(('revision','preferences')):
                    raise ValueError('Invalid preference save structure')
                saved,rev = preference_store.write(DATABASE_URL, DB, globals().get('psycopg'), globals().get('Jsonb'), lock, request['revision'], request['preferences'])
            except (ValueError,TypeError,UnicodeError,json.JSONDecodeError) as exc:
                self.reply(400, {'error':str(exc)})
                return
            except Exception:
                self.reply(503, {'error':'Preference save not confirmed'})
                return
            if not saved:
                self.reply(409, {'error':'Preferences changed on another device; review before retrying','revision':rev})
            else:
                self.reply(200, {'revision':rev})
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
    initialize_account_boundary()
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
