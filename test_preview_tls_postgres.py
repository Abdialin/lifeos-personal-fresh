"""Disposable local TLS PostgreSQL rehearsal; never connects to a provider.

Explicit opt-in is required. The test initializes its own cluster in a temporary
directory, listens only on loopback, and removes the cluster after it stops.
It uses synthetic records and a locally generated CA, not production secrets.
"""
import base64
import hashlib
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
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
SCRIPT = ROOT / 'scripts' / 'preview_storage_migration.py'


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


class PreviewTLSRehearsal(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.environ.get('LIFEOS_TEST_DISPOSABLE_TLS_POSTGRES') != '1':
            raise unittest.SkipTest('Explicit disposable TLS PostgreSQL opt-in required')
        import psycopg
        cls.psycopg = psycopg
        bindir = os.environ.get('LIFEOS_TEST_PG_BINDIR')
        if not bindir:
            config = shutil.which('pg_config')
            if not config:
                raise RuntimeError('PostgreSQL server tools are required for the disposable TLS test')
            bindir = subprocess.check_output([config, '--bindir'], text=True).strip()
        cls.bin = Path(bindir).resolve()
        for tool in ('initdb', 'pg_ctl', 'pg_dump', 'pg_restore'):
            if not (cls.bin / tool).is_file():
                raise RuntimeError('Missing PostgreSQL test tool: ' + tool)
        if not shutil.which('openssl'):
            raise RuntimeError('OpenSSL is required for the disposable TLS test')
        cls.tmp = tempfile.TemporaryDirectory(prefix='lifeos-preview-tls-')
        cls.directory = Path(cls.tmp.name)
        cls.cluster = cls.directory / 'cluster'
        cls.socket_dir = cls.directory / 'socket'; cls.socket_dir.mkdir()
        cls.port = free_port()
        cls.user = 'lifeos_tls_test'
        cls.password = secrets.token_hex(20)
        cls.started = False
        try:
            cls.prepare()
        except BaseException:
            cls.stop()
            raise

    @classmethod
    def command(cls, args):
        return subprocess.run([str(x) for x in args], cwd=cls.directory, check=True,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)

    @classmethod
    def prepare(cls):
        pwfile = cls.directory / 'password'; pwfile.write_text(cls.password + '\n'); pwfile.chmod(0o600)
        cls.command([cls.bin / 'initdb', '-D', cls.cluster, '--username', cls.user,
                     '--auth-local=trust', '--auth-host=scram-sha-256', '--pwfile', pwfile,
                     '--no-locale', '--encoding=UTF8'])
        cls.ca = cls.directory / 'ca.crt'
        cls.command(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
                     '-subj', '/CN=LifeOS disposable test CA', '-keyout', cls.directory / 'ca.key', '-out', cls.ca])
        cls.command(['openssl', 'req', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=localhost',
                     '-keyout', cls.cluster / 'server.key', '-out', cls.directory / 'server.csr'])
        extensions = cls.directory / 'server.ext'; extensions.write_text('subjectAltName=DNS:localhost\nextendedKeyUsage=serverAuth\n')
        cls.command(['openssl', 'x509', '-req', '-days', '1', '-in', cls.directory / 'server.csr',
                     '-CA', cls.ca, '-CAkey', cls.directory / 'ca.key', '-CAcreateserial',
                     '-extfile', extensions, '-out', cls.cluster / 'server.crt'])
        (cls.cluster / 'server.key').chmod(0o600)
        cls.other_ca = cls.directory / 'untrusted-ca.crt'
        cls.command(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
                     '-subj', '/CN=Untrusted disposable test CA', '-keyout', cls.directory / 'untrusted-ca.key', '-out', cls.other_ca])
        (cls.cluster / 'pg_hba.conf').write_text(
            'local all all trust\n'
            'hostssl all all 127.0.0.1/32 scram-sha-256\n'
            'hostnossl all all 127.0.0.1/32 reject\n')
        with (cls.cluster / 'postgresql.conf').open('a') as config:
            config.write("\nssl = on\nssl_cert_file = 'server.crt'\nssl_key_file = 'server.key'\n")
        cls.options = '-h 127.0.0.1 -p ' + str(cls.port) + ' -k ' + str(cls.socket_dir)
        cls.start()

    @classmethod
    def start(cls):
        try:
            cls.command([cls.bin / 'pg_ctl', '-D', cls.cluster, '-l', cls.directory / 'postgres.log',
                         '-o', cls.options, '-w', '-t', '30', 'start'])
        except BaseException:
            status = subprocess.run([str(cls.bin / 'pg_ctl'), '-D', str(cls.cluster), 'status'],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
            cls.started = status.returncode == 0
            raise
        cls.started = True

    @classmethod
    def restart(cls):
        cls.command([cls.bin / 'pg_ctl', '-D', cls.cluster, '-m', 'fast', '-w', '-t', '30', 'stop'])
        cls.started = False
        cls.start()

    @classmethod
    def stop(cls):
        if getattr(cls, 'started', False):
            subprocess.run([str(cls.bin / 'pg_ctl'), '-D', str(cls.cluster), '-m', 'immediate',
                            '-w', '-t', '30', 'stop'], stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=40, check=True)
            cls.started = False
        if getattr(cls, 'tmp', None):
            cls.tmp.cleanup()

    @classmethod
    def tearDownClass(cls):
        cls.stop()

    def url(self, database, host='localhost', options='sslmode=verify-full&channel_binding=require'):
        return 'postgresql://' + self.user + ':' + self.password + '@' + host + ':' + str(self.port) + '/' + database + '?' + options

    def connect(self, database, *, host='localhost', ca=None, options='sslmode=verify-full&channel_binding=require', **kwargs):
        return self.psycopg.connect(self.url(database, host, options), sslrootcert=str(ca or self.ca), connect_timeout=10, **kwargs)

    def server_state_after_restart(self, database, fixture):
        port = free_port()
        username, password, token = 'local-tls-test', secrets.token_urlsafe(20), secrets.token_urlsafe(24)
        env = {'PATH': os.environ.get('PATH', ''), 'LANG': os.environ.get('LANG', 'C.UTF-8'),
               'PYTHONDONTWRITEBYTECODE': '1', 'PORT': str(port), 'LIFEOS_DB': str(self.directory / 'unused.sqlite3'),
               'LIFEOS_DATABASE_URL': self.url(database), 'PGSSLROOTCERT': str(self.ca),
               'LIFEOS_ACCOUNT_API_ENABLED': '0', 'LIFEOS_USERNAME': username,
               'LIFEOS_PASSWORD': password, 'LIFEOS_TOKEN': token}
        program = ("import os,server;server.initialize_postgres_schema();"
                   "server.ThreadingHTTPServer(('127.0.0.1',int(os.environ['PORT'])),server.Handler).serve_forever()")
        headers = {'Authorization': 'Basic ' + base64.b64encode((username + ':' + password).encode()).decode(),
                   'X-LifeOS-Token': token}
        for _ in range(2):
            server = subprocess.Popen([sys.executable, '-c', program], cwd=ROOT, env=env,
                                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try:
                endpoint = 'http://127.0.0.1:' + str(port)
                for _ in range(100):
                    if server.poll() is not None:
                        self.fail('Disposable TLS-backed application exited before becoming ready')
                    try:
                        with urlopen(endpoint + '/healthz', timeout=1) as response:
                            if response.status == 200:
                                break
                    except OSError:
                        time.sleep(.05)
                else:
                    self.fail('Disposable TLS-backed application did not start')
                with urlopen(Request(endpoint + '/api/state', headers=headers), timeout=5) as response:
                    self.assertEqual(json.load(response), {'revision': 4, 'data': fixture})
            finally:
                server.terminate()
                try: server.wait(timeout=5)
                except subprocess.TimeoutExpired: server.kill(); server.wait(timeout=5)

    def test_verified_tls_migration_backup_restore_and_app_restart(self):
        database, restored = 'lifeos_preview_tls', 'lifeos_preview_tls_restore'
        with self.connect('postgres', autocommit=True) as db:
            db.execute('CREATE DATABASE lifeos_preview_tls')
            db.execute('CREATE DATABASE lifeos_preview_tls_restore')
        with self.connect(database) as db:
            self.assertTrue(db.execute('SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()').fetchone()[0])
        with self.assertRaises(self.psycopg.OperationalError):
            self.connect(database, host='127.0.0.1')  # Cert is valid for localhost only.
        with self.assertRaises(self.psycopg.OperationalError):
            self.connect(database, ca=self.other_ca)
        with self.assertRaises(self.psycopg.OperationalError):
            self.connect(database, options='sslmode=disable')

        fixture = {'version': 1, 'sessions': [{'id': 'synthetic-tls-session', 'name': 'Study',
            'status': 'finished', 'startAt': 1795563000123, 'endAt': 1795563060456,
            'segments': [{'start': 1795563000123, 'end': 1795563060456}]}], 'events': [],
            'schedule': [], 'todos': []}
        source = self.directory / 'synthetic.sqlite3'
        with sqlite3.connect(source) as db:
            db.execute('CREATE TABLE state (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL)')
            db.execute('INSERT INTO state VALUES (1,4,?)', (json.dumps(fixture),))
        sha = hashlib.sha256(source.read_bytes()).hexdigest()
        env = dict(os.environ, PGSSLROOTCERT=str(self.ca), LIFEOS_PREVIEW_MIGRATION_TARGET=self.url(database))
        cli = [sys.executable, str(SCRIPT), '--source', str(source), '--target-host', 'localhost',
               '--target-database', database, '--target-user', self.user]
        flags = ['--apply', '--source-sha256', sha, '--verified-separate-backup']
        bad_host_env = dict(env, LIFEOS_PREVIEW_MIGRATION_TARGET=self.url(database, host='127.0.0.1'))
        bad_host_cli = cli.copy(); bad_host_cli[bad_host_cli.index('localhost')] = '127.0.0.1'
        bad_ca_env = dict(env, PGSSLROOTCERT=str(self.other_ca))
        for command, bad_env in ((bad_host_cli, bad_host_env), (cli, bad_ca_env)):
            refused = subprocess.run(command + flags, cwd=ROOT, env=bad_env, text=True, capture_output=True, timeout=30)
            self.assertNotEqual(refused.returncode, 0, 'Invalid certificate trust or hostname must block migration')
            self.assertNotIn(self.password, refused.stdout + refused.stderr, 'Connection errors must not expose credentials')
            with self.connect(database) as db:
                self.assertIsNone(db.execute("SELECT to_regnamespace('lifeos')").fetchone()[0], 'A refused connection must not create a schema')
        inspected = subprocess.run(cli, cwd=ROOT, env=env, text=True, capture_output=True, timeout=30)
        self.assertEqual(inspected.returncode, 0, inspected.stderr)
        self.assertIn('Inspection only', inspected.stdout)
        with self.connect(database) as db:
            self.assertIsNone(db.execute("SELECT to_regnamespace('lifeos')").fetchone()[0])
        written = subprocess.run(cli + flags,
                                 cwd=ROOT, env=env, text=True, capture_output=True, timeout=30)
        self.assertEqual(written.returncode, 0, written.stderr)
        with self.connect(database) as db:
            self.assertEqual(db.execute('SELECT revision,payload FROM lifeos.state').fetchone(), (4, fixture))
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), sha)
        repeated = subprocess.run(cli + flags,
                                  cwd=ROOT, env=env, text=True, capture_output=True, timeout=30)
        self.assertEqual(repeated.returncode, 2, 'A populated target must never be overwritten')
        self.restart()
        with self.connect(database) as db:
            self.assertEqual(db.execute('SELECT revision,payload FROM lifeos.state').fetchone(), (4, fixture), 'Synthetic records must survive a local PostgreSQL restart')
        self.server_state_after_restart(database, fixture)

        dump = self.directory / 'synthetic.dump'
        self.command([self.bin / 'pg_dump', '--format=custom', '--no-owner', '--no-privileges',
                      '--file', dump, self.url(database) + '&sslrootcert=' + str(self.ca)])
        self.command([self.bin / 'pg_restore', '--exit-on-error', '--no-owner', '--no-privileges',
                      '--dbname', self.url(restored) + '&sslrootcert=' + str(self.ca), dump])
        with self.connect(restored) as db:
            self.assertEqual(db.execute('SELECT revision,payload FROM lifeos.state').fetchone(), (4, fixture))
        self.server_state_after_restart(restored, fixture)


if __name__ == '__main__':
    unittest.main()
