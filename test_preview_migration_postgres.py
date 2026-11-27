"""Real SQLite-to-Postgres rehearsal; only random local synthetic databases.

Requires LIFEOS_TEST_DISPOSABLE_POSTGRES=1 and the existing localhost-only
lifeos_test connection. It never connects to Render or personal records.
"""
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
SCRIPT = ROOT / 'scripts' / 'preview_storage_migration.py'
spec = importlib.util.spec_from_file_location('preview_storage_migration', SCRIPT)
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)


class PreviewMigration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.getenv('LIFEOS_TEST_DISPOSABLE_POSTGRES') != '1':
            raise unittest.SkipTest('Explicit disposable PostgreSQL test flag required')
        cls.base_url = os.getenv('LIFEOS_DATABASE_URL', '')
        parts = urlsplit(cls.base_url)
        if (parts.scheme != 'postgresql' or parts.hostname not in ('localhost', '127.0.0.1')
                or parts.port != 5432 or parts.path != '/lifeos_test'):
            raise RuntimeError('Refusing any PostgreSQL server except the disposable localhost test DB')
        import psycopg
        cls.psycopg = psycopg
        cls.parts = parts
        cls.user = parts.username
        cls.host = parts.hostname

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='lifeos-preview-migration-')
        self.addCleanup(self.tmp.cleanup)
        self.directory = Path(self.tmp.name)
        self.created = []
        self.addCleanup(self.drop_databases)
        self.database, self.url = self.create_database()
        self.source = self.directory / 'synthetic-backup.sqlite3'
        self.fixture = {
            'version': 1,
            'sessions': [{'id': 'synthetic-overnight', 'name': 'Study', 'status': 'finished',
                          'startAt': 1795563000123, 'endAt': 1795568400456,
                          'segments': [{'start': 1795563000123, 'end': 1795564800123},
                                       {'start': 1795566600123, 'end': 1795568400456}],
                          'notes': 'Synthetic, preserve precision', 'classification': 'University'}],
            'events': [{'id': 'synthetic-event', 'type': 'pause', 'at': 1795564800123}],
            'schedule': [{'id': 'synthetic-plan', 'name': 'Study', 'status': 'planned'}],
            'unknownFutureField': {'keep': ['unchanged', 42]},
        }
        self.preferences = {'durations': {'study': {'minutes': 45}}}
        self.audit = [
            (3, 'synthetic-audit-1', {'id': 'synthetic-audit-1', 'action': 'approve'}),
            (7, 'synthetic-audit-2', {'id': 'synthetic-audit-2', 'action': 'skip'}),
        ]
        live = self.directory / 'synthetic-live.sqlite3'
        with sqlite3.connect(live) as db:
            db.execute('CREATE TABLE state (id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,payload TEXT NOT NULL)')
            db.execute('CREATE TABLE personal_preferences (id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,payload TEXT NOT NULL)')
            db.execute('CREATE TABLE calendar_audit (sequence INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,payload TEXT NOT NULL)')
            db.execute('CREATE TABLE calendar_oauth (id INTEGER PRIMARY KEY,secret TEXT NOT NULL)')
            db.execute('CREATE TABLE calendar_pending (state_hash TEXT PRIMARY KEY,verifier TEXT NOT NULL,expires INTEGER NOT NULL)')
            db.execute('INSERT INTO state VALUES (1,4,?)', (json.dumps(self.fixture),))
            db.execute('INSERT INTO personal_preferences VALUES (1,9,?)', (json.dumps(self.preferences),))
            db.executemany('INSERT INTO calendar_audit VALUES (?,?,?)', [(a, b, json.dumps(c)) for a, b, c in self.audit])
            db.execute('INSERT INTO calendar_oauth VALUES (1,?)', ('synthetic-encrypted-token',))
            db.execute('INSERT INTO calendar_pending VALUES (?,?,?)', ('synthetic-hash', 'synthetic-verifier', 1799999999))
            db.commit()
            with sqlite3.connect(self.source) as backup:
                db.backup(backup)
        self.original_sha = hashlib.sha256(self.source.read_bytes()).hexdigest()

    def create_database(self):
        from psycopg import sql
        name = 'lifeos_preview_test_' + secrets.token_hex(8)
        with self.psycopg.connect(self.base_url, autocommit=True, connect_timeout=10) as db:
            db.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(name)))
        self.created.append(name)
        parts = self.parts
        return name, urlunsplit((parts.scheme, parts.netloc, '/' + name, parts.query, parts.fragment))

    def drop_databases(self):
        from psycopg import sql
        for name in reversed(self.created):
            if not name.startswith('lifeos_preview_test_'):
                raise RuntimeError('Refusing to remove an unrelated database')
            with self.psycopg.connect(self.base_url, autocommit=True, connect_timeout=10) as db:
                db.execute(sql.SQL('DROP DATABASE {}').format(sql.Identifier(name)))

    def cli(self, *extra, url=None, database=None):
        env = os.environ.copy()
        env['LIFEOS_PREVIEW_MIGRATION_TARGET'] = url or self.url
        args = [sys.executable, str(SCRIPT), '--source', str(self.source), '--target-host', self.host,
                '--target-database', database or self.database, '--target-user', self.user, *extra]
        return subprocess.run(args, cwd=ROOT, env=env, text=True, capture_output=True, timeout=30)

    def assert_snapshot(self, url):
        with self.psycopg.connect(url, connect_timeout=10) as db:
            self.assertEqual(db.execute('SELECT id,revision,payload FROM lifeos.state').fetchall(), [(1, 4, self.fixture)])
            self.assertEqual(db.execute('SELECT id,revision,payload FROM lifeos.personal_preferences').fetchall(), [(1, 9, self.preferences)])
            self.assertEqual(db.execute('SELECT sequence,id,entry FROM lifeos.calendar_audit ORDER BY sequence').fetchall(), self.audit)
            self.assertEqual(db.execute('SELECT id,secret FROM lifeos.calendar_oauth').fetchall(), [(1, 'synthetic-encrypted-token')])
            self.assertEqual(db.execute('SELECT state_hash,verifier,expires FROM lifeos.calendar_pending').fetchall(), [('synthetic-hash', 'synthetic-verifier', 1799999999)])

    def assert_server_restart(self, url):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
        username, password, token = 'synthetic-user', secrets.token_urlsafe(20), secrets.token_urlsafe(24)
        env = {'PATH': os.environ.get('PATH', ''), 'LANG': os.environ.get('LANG', 'C.UTF-8'),
               'PYTHONDONTWRITEBYTECODE': '1', 'PORT': str(port), 'LIFEOS_DB': str(self.directory / 'unused.sqlite3'),
               'LIFEOS_DATABASE_URL': url, 'LIFEOS_ACCOUNT_API_ENABLED': '0', 'LIFEOS_USERNAME': username,
               'LIFEOS_PASSWORD': password, 'LIFEOS_TOKEN': token}
        program = ("import os,server;server.initialize_postgres_schema();"
                   "server.ThreadingHTTPServer(('127.0.0.1',int(os.environ['PORT'])),server.Handler).serve_forever()")
        headers = {'Authorization': 'Basic ' + base64.b64encode((username + ':' + password).encode()).decode(),
                   'X-LifeOS-Token': token}
        for _ in range(2):
            server = subprocess.Popen([sys.executable, '-c', program], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try:
                endpoint = 'http://127.0.0.1:' + str(port)
                for attempt in range(100):
                    if server.poll() is not None:
                        self.fail('Disposable server exited before becoming ready')
                    try:
                        with urlopen(endpoint + '/healthz', timeout=1) as response:
                            if response.status == 200:
                                break
                    except OSError:
                        time.sleep(.05)
                else:
                    self.fail('Disposable server did not become ready')
                with urlopen(Request(endpoint + '/api/state', headers=headers), timeout=5) as response:
                    self.assertEqual(json.load(response), {'revision': 4, 'data': self.fixture})
                with urlopen(Request(endpoint + '/api/preferences/v89', headers=headers), timeout=5) as response:
                    self.assertEqual(json.load(response), {'revision': 9, 'preferences': self.preferences})
            finally:
                server.terminate()
                try:
                    server.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    server.kill(); server.wait(timeout=5)

    def test_migration_dump_restore_and_restart(self):
        preview = self.cli()
        self.assertEqual(preview.returncode, 0, preview.stderr)
        self.assertIn('Inspection only', preview.stdout)
        self.assertIn(self.original_sha, preview.stdout)
        self.assertNotIn('synthetic-encrypted-token', preview.stdout + preview.stderr)
        with self.psycopg.connect(self.url) as db:
            self.assertIsNone(db.execute("SELECT to_regnamespace('lifeos')").fetchone()[0], 'Dry run must not create tables')
        refused = self.cli('--apply', '--verified-separate-backup', '--source-sha256', '0' * 64)
        self.assertEqual(refused.returncode, 2)
        self.assertEqual(self.cli('--apply', '--source-sha256', self.original_sha).returncode, 2, 'A separate verified backup is required')
        with self.psycopg.connect(self.url) as db:
            self.assertIsNone(db.execute("SELECT to_regnamespace('lifeos')").fetchone()[0])
        applied = self.cli('--apply', '--verified-separate-backup', '--source-sha256', self.original_sha)
        self.assertEqual(applied.returncode, 0, applied.stderr)
        self.assert_snapshot(self.url)
        self.assertEqual(hashlib.sha256(self.source.read_bytes()).hexdigest(), self.original_sha, 'Source backup is never modified')
        repeated = self.cli('--apply', '--verified-separate-backup', '--source-sha256', self.original_sha)
        self.assertEqual(repeated.returncode, 2, 'A populated target must not be overwritten')
        self.assert_snapshot(self.url)
        self.assert_server_restart(self.url)

        dump, restore = shutil.which('pg_dump'), shutil.which('pg_restore')
        if not dump or not restore:
            self.fail('pg_dump and pg_restore are required for the backup and restore rehearsal')
        archive = self.directory / 'synthetic-postgres.dump'
        subprocess.run([dump, '--format=custom', '--no-owner', '--no-privileges', '--file', str(archive), self.url], check=True, capture_output=True, timeout=30)
        self.assertTrue(archive.read_bytes().startswith(b'PGDMP'))
        _, restore_url = self.create_database()
        restored = subprocess.run([restore, '--exit-on-error', '--no-owner', '--no-privileges', '--dbname', restore_url, str(archive)], capture_output=True, text=True, timeout=30)
        self.assertEqual(restored.returncode, 0, 'Restoring synthetic data failed: ' + restored.stderr)
        self.assert_snapshot(restore_url)
        self.assert_server_restart(restore_url)
        with self.psycopg.connect(restore_url) as db:
            next_sequence = db.execute('INSERT INTO lifeos.calendar_audit(id,entry) VALUES (%s,%s) RETURNING sequence',
                                       ('synthetic-audit-3', self.psycopg.types.json.Jsonb({'id': 'synthetic-audit-3'}))).fetchone()[0]
        self.assertEqual(next_sequence, 8, 'Restored audit sequence must continue after the imported records')

    def test_rejects_unknown_tables_and_changed_backup(self):
        with sqlite3.connect(self.source) as db:
            db.execute('CREATE TABLE unsupported_private_records (value TEXT)')
        with self.assertRaises(migration.Refused):
            migration.read_backup(self.source)
        with sqlite3.connect(self.source) as db:
            db.execute('DROP TABLE unsupported_private_records')
        path, source_hash, snapshot = migration.read_backup(self.source)
        with self.assertRaises(migration.Refused):
            migration.migrate(snapshot, path, '0' * 64, self.url, self.host, self.database, self.user)
        migration.inspect_target(self.url, self.host, self.database, self.user)
        with self.psycopg.connect(self.url) as db:
            self.assertIsNone(db.execute("SELECT to_regnamespace('lifeos')").fetchone()[0], 'Failed migration must roll back all tables and data')
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), source_hash)

    def test_rejects_unsafe_sources_and_target_identity(self):
        sidecar = Path(str(self.source) + '-wal')
        sidecar.write_bytes(b'synthetic-unmerged-wal')
        with self.assertRaises(migration.Refused):
            migration.read_backup(self.source)
        sidecar.unlink()
        with sqlite3.connect(self.source) as db:
            db.execute('UPDATE state SET payload=? WHERE id=1', ('{"version":1,"sessions":[],"events":[],"version":1}',))
        with self.assertRaises(migration.Refused):
            migration.read_backup(self.source)
        with self.assertRaises(migration.Refused):
            migration.checked_target(self.url, 'wrong-host', self.database, self.user)
        with self.assertRaises(migration.Refused):
            migration.checked_target(self.url, self.host, self.database, 'wrong-user')
        with self.assertRaises(migration.Refused):
            migration.checked_target('postgresql://user:fake@example.com/lifeos_preview_test?sslmode=disable',
                                     'example.com', 'lifeos_preview_test', 'user')
        with self.assertRaises(migration.Refused):
            migration.checked_target('postgresql://user:fake@example.com/lifeos_preview_test?sslmode=require&host=another-host',
                                     'example.com', 'lifeos_preview_test', 'user')
        with self.assertRaises(migration.Refused):
            migration.checked_target('postgresql://user:fake@example.com/lifeos_preview_test?sslmode=require&sslmode=disable',
                                     'example.com', 'lifeos_preview_test', 'user')
        with self.psycopg.connect(self.url) as db:
            self.assertIsNone(db.execute("SELECT to_regnamespace('lifeos')").fetchone()[0])

    def test_refuses_non_dedicated_target(self):
        with self.psycopg.connect(self.url) as db:
            db.execute('CREATE SCHEMA unrelated')
            db.execute('CREATE TABLE unrelated.keep (value integer NOT NULL)')
            db.execute('INSERT INTO unrelated.keep VALUES (42)')
        with self.assertRaises(migration.Refused):
            migration.inspect_target(self.url, self.host, self.database, self.user)
        with self.psycopg.connect(self.url) as db:
            self.assertEqual(db.execute('SELECT value FROM unrelated.keep').fetchone(), (42,))
            self.assertIsNone(db.execute("SELECT to_regnamespace('lifeos')").fetchone()[0])
        empty_name, empty_url = self.create_database()
        with self.psycopg.connect(empty_url) as db:
            db.execute('CREATE SCHEMA lifeos')
        with self.assertRaises(migration.Refused):
            migration.inspect_target(empty_url, self.host, empty_name, self.user)

    def test_server_json_backup_is_explicitly_state_only(self):
        self.source = self.directory / 'synthetic-server-backup.json'
        canonical = json.dumps({'revision': 4, 'data': self.fixture}, sort_keys=True, separators=(',', ':')).encode('utf-8')
        backup = {'format': 'lifeos-v3.1-backup', 'revision': 4, 'data': self.fixture,
                  'sha256': hashlib.sha256(canonical).hexdigest()}
        self.source.write_text(json.dumps(backup, ensure_ascii=False, indent=2), encoding='utf-8')
        source_sha = hashlib.sha256(self.source.read_bytes()).hexdigest()
        preview = self.cli('--source-type', 'server-json')
        self.assertEqual(preview.returncode, 0, preview.stderr)
        self.assertIn('preferences, calendar audit and calendar authorization are not included', preview.stdout)
        refused = self.cli('--source-type', 'server-json', '--apply', '--verified-separate-backup', '--source-sha256', source_sha)
        self.assertEqual(refused.returncode, 2, 'A state-only export must not silently omit other data')
        accepted = self.cli('--source-type', 'server-json', '--apply', '--verified-separate-backup',
                            '--confirm-state-only', '--source-sha256', source_sha)
        self.assertEqual(accepted.returncode, 0, accepted.stderr)
        with self.psycopg.connect(self.url) as db:
            self.assertEqual(db.execute('SELECT revision,payload FROM lifeos.state').fetchone(), (4, self.fixture))
            for table in ('personal_preferences', 'calendar_audit', 'calendar_oauth', 'calendar_pending'):
                from psycopg import sql
                self.assertEqual(db.execute(sql.SQL('SELECT count(*) FROM lifeos.{}').format(sql.Identifier(table))).fetchone()[0], 0)
        backup['data']['sessions'][0]['name'] = 'Tampered synthetic data'
        self.source.write_text(json.dumps(backup), encoding='utf-8')
        with self.assertRaises(migration.Refused):
            migration.read_server_json_backup(self.source)


if __name__ == '__main__':
    unittest.main()
