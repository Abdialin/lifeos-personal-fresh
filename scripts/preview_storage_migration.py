#!/usr/bin/env python3
"""Inspect an offline Preview SQLite backup; optionally copy it to an empty Preview DB.

The source is opened read-only. Applying requires a reviewed source hash,
explicit target identity, and confirmation that a separate backup was verified.
No production/staging database, existing target rows, or local app data is
modified. Never print workspace contents, OAuth material, or connection URLs.
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
from pathlib import Path
import sqlite3
import sys
from urllib.parse import parse_qs, unquote, urlsplit


TABLES = ('state', 'personal_preferences', 'calendar_audit', 'calendar_oauth', 'calendar_pending')


class Refused(Exception):
    """A precondition failed before a migration could be safely committed."""


def digest(path: Path) -> str:
    result = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(chunk)
    return result.hexdigest()


def reject_sidecars(path: Path):
    for suffix in ('-wal', '-journal'):
        sidecar = Path(str(path) + suffix)
        if sidecar.exists() and sidecar.stat().st_size:
            raise Refused('Source has an unmerged SQLite journal; create a self-contained backup first')


def parse_json(value, label):
    def pairs(items):
        result = {}
        for key, item in items:
            if key in result:
                raise Refused(label + ' contains duplicate JSON keys')
            result[key] = item
        return result

    def invalid(_):
        raise Refused(label + ' contains a non-finite JSON value')

    try:
        result = json.loads(value, object_pairs_hook=pairs, parse_constant=invalid)
    except (TypeError, ValueError) as exc:
        raise Refused(label + ' contains invalid JSON') from exc
    if not isinstance(result, dict):
        raise Refused(label + ' must be a JSON object')
    return result


def read_backup(filename):
    path = Path(filename).expanduser().resolve(strict=True)
    if not path.is_file():
        raise Refused('Source must be an existing offline SQLite backup file')
    reject_sidecars(path)
    before = digest(path)
    try:
        with sqlite3.connect(path.as_uri() + '?mode=ro&immutable=1', uri=True) as db:
            db.execute('PRAGMA query_only=ON')
            if db.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
                raise Refused('Source SQLite integrity check failed')
            found = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
            unknown = found - set(TABLES)
            if unknown:
                raise Refused('Source contains unsupported tables; review them before migration')
            if 'state' not in found:
                raise Refused('Source contains no workspace state table')
            snapshot = {name: [] for name in TABLES}
            for ident, revision, payload in db.execute('SELECT id, revision, payload FROM state'):
                value = parse_json(payload, 'Workspace')
                if ident != 1 or type(revision) is not int or revision < 1 or value.get('version') != 1 or not isinstance(value.get('sessions'), list) or not isinstance(value.get('events'), list):
                    raise Refused('Source workspace has an invalid identity, revision, or structure')
                snapshot['state'].append((ident, revision, value))
            if len(snapshot['state']) != 1:
                raise Refused('Source has no single saved workspace; do not migrate an empty backup')
            if 'personal_preferences' in found:
                for ident, revision, payload in db.execute('SELECT id, revision, payload FROM personal_preferences'):
                    if ident != 1 or type(revision) is not int or revision < 1:
                        raise Refused('Source preferences have an invalid identity or revision')
                    snapshot['personal_preferences'].append((ident, revision, parse_json(payload, 'Preferences')))
            if 'calendar_audit' in found:
                for sequence, ident, payload in db.execute('SELECT sequence, id, payload FROM calendar_audit ORDER BY sequence'):
                    value = parse_json(payload, 'Calendar audit')
                    if type(sequence) is not int or sequence < 1 or not isinstance(ident, str) or not ident or value.get('id') != ident:
                        raise Refused('Source calendar audit has an invalid identity or sequence')
                    snapshot['calendar_audit'].append((sequence, ident, value))
            if 'calendar_oauth' in found:
                snapshot['calendar_oauth'] = list(db.execute('SELECT id, secret FROM calendar_oauth ORDER BY id'))
                if any(type(ident) is not int or not isinstance(secret, str) for ident, secret in snapshot['calendar_oauth']):
                    raise Refused('Source calendar connection has invalid fields')
            if 'calendar_pending' in found:
                snapshot['calendar_pending'] = list(db.execute('SELECT state_hash, verifier, expires FROM calendar_pending ORDER BY state_hash'))
                if any(not isinstance(key, str) or not isinstance(verifier, str) or type(expires) is not int for key, verifier, expires in snapshot['calendar_pending']):
                    raise Refused('Source pending calendar authorization has invalid fields')
    except sqlite3.Error as exc:
        raise Refused('Source is not a readable, compatible SQLite backup') from exc
    reject_sidecars(path)
    if digest(path) != before:
        raise Refused('Source backup changed during inspection')
    return path, before, snapshot


def read_server_json_backup(filename):
    """Read a checksummed server export; it contains workspace state only."""
    path = Path(filename).expanduser().resolve(strict=True)
    if not path.is_file():
        raise Refused('Source must be an existing offline server backup file')
    before = digest(path)
    try:
        with path.open('r', encoding='utf-8') as stream:
            payload = parse_json(stream.read(), 'Server backup')
    except (OSError, UnicodeError) as exc:
        raise Refused('Source is not a readable server backup') from exc
    revision, data, checksum = payload.get('revision'), payload.get('data'), payload.get('sha256')
    if (payload.get('format') != 'lifeos-v3.1-backup' or type(revision) is not int or revision < 1
            or not isinstance(data, dict) or data.get('version') != 1
            or not isinstance(data.get('sessions'), list) or not isinstance(data.get('events'), list)
            or not isinstance(checksum, str)):
        raise Refused('Source is not a populated, compatible server workspace backup')
    canonical = json.dumps({'revision': revision, 'data': data}, sort_keys=True, separators=(',', ':')).encode('utf-8')
    if not hmac.compare_digest(hashlib.sha256(canonical).hexdigest(), checksum):
        raise Refused('Server backup checksum does not match its workspace')
    if digest(path) != before:
        raise Refused('Source backup changed during inspection')
    snapshot = {name: [] for name in TABLES}
    snapshot['state'] = [(1, revision, data)]
    return path, before, snapshot


def checked_target(url, expected_host, expected_database, expected_user):
    parsed = urlsplit(url)
    actual_database = unquote(parsed.path.lstrip('/'))
    if parsed.scheme not in ('postgres', 'postgresql') or not parsed.hostname:
        raise Refused('A PostgreSQL target URL is required in LIFEOS_PREVIEW_MIGRATION_TARGET')
    if not expected_host or parsed.hostname.lower() != expected_host.lower():
        raise Refused('Target host does not match the reviewed host')
    if not expected_database or actual_database != expected_database or 'preview' not in actual_database.lower():
        raise Refused('Target database must exactly match the reviewed Preview database name')
    if not expected_user or unquote(parsed.username or '') != expected_user:
        raise Refused('Target user does not match the reviewed Preview database user')
    parameters = parse_qs(parsed.query, keep_blank_values=True)
    if set(parameters) - {'sslmode', 'connect_timeout', 'application_name'} or any(len(values) != 1 for values in parameters.values()):
        raise Refused('Target URL contains unsupported or repeated connection parameters')
    if parsed.hostname not in ('localhost', '127.0.0.1', '::1'):
        mode = parameters.get('sslmode', [''])[0]
        if mode not in ('require', 'verify-ca', 'verify-full'):
            raise Refused('Remote Preview database connections must require TLS')
    return actual_database


def assert_empty_target(db, expected_database, expected_user, *, allow_created_schema=False):
    current, user = db.execute('SELECT current_database(),current_user').fetchone()
    if current != expected_database or user != expected_user:
        raise Refused('Connected database or user differs from the reviewed Preview target')
    schemas = db.execute("""SELECT nspname FROM pg_catalog.pg_namespace
                            WHERE nspname NOT IN ('pg_catalog','information_schema','public')
                            AND nspname NOT LIKE 'pg_toast%' AND nspname NOT LIKE 'pg_temp%'""").fetchall()
    allowed_schemas = {'lifeos'} if allow_created_schema else set()
    if any(name not in allowed_schemas for (name,) in schemas):
        raise Refused('Target contains other user schemas; a dedicated empty database is required')
    rows = db.execute("""SELECT n.nspname,c.relname,c.relkind FROM pg_catalog.pg_class c
                         JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
                         WHERE c.relkind IN ('r','p','v','m','S','f') AND n.nspname NOT IN ('pg_catalog','information_schema')
                         AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'""").fetchall()
    from psycopg import sql
    for schema, table, kind in rows:
        if (schema, table, kind) == ('lifeos', 'calendar_audit_sequence_seq', 'S'):
            continue
        if schema != 'lifeos' or table not in TABLES:
            raise Refused('Target contains other user objects; a dedicated empty database is required')
        if kind not in ('r', 'p'):
            raise Refused('Target has an incompatible Preview table')
        if db.execute(sql.SQL('SELECT EXISTS (SELECT 1 FROM {}.{})').format(sql.Identifier(schema), sql.Identifier(table))).fetchone()[0]:
            raise Refused('Target contains existing records; no data can be overwritten')


def inspect_target(url, expected_host, expected_database, expected_user):
    database = checked_target(url, expected_host, expected_database, expected_user)
    import psycopg
    with psycopg.connect(url, connect_timeout=10) as db:
        assert_empty_target(db, database, expected_user)


def migrate(snapshot, source, source_hash, url, expected_host, expected_database, expected_user):
    database = checked_target(url, expected_host, expected_database, expected_user)
    import psycopg
    from psycopg.types.json import Jsonb
    with psycopg.connect(url, connect_timeout=10) as db:
        db.execute('SELECT pg_advisory_xact_lock(74822034)')
        assert_empty_target(db, database, expected_user)
        db.execute('CREATE SCHEMA lifeos')
        db.execute('CREATE TABLE lifeos.state (id integer PRIMARY KEY CHECK(id=1), revision bigint NOT NULL CHECK(revision>=1), payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())')
        db.execute('CREATE TABLE lifeos.personal_preferences (id integer PRIMARY KEY CHECK(id=1), revision bigint NOT NULL, payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())')
        db.execute('CREATE TABLE lifeos.calendar_audit (sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, id text UNIQUE NOT NULL, entry jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())')
        db.execute('CREATE TABLE lifeos.calendar_oauth (id integer PRIMARY KEY, secret text NOT NULL)')
        db.execute('CREATE TABLE lifeos.calendar_pending (state_hash text PRIMARY KEY, verifier text NOT NULL, expires bigint NOT NULL)')
        db.execute('LOCK TABLE lifeos.state, lifeos.personal_preferences, lifeos.calendar_audit, lifeos.calendar_oauth, lifeos.calendar_pending IN ACCESS EXCLUSIVE MODE')
        assert_empty_target(db, database, expected_user, allow_created_schema=True)
        for ident, revision, payload in snapshot['state']:
            db.execute('INSERT INTO lifeos.state(id,revision,payload) VALUES (%s,%s,%s)', (ident, revision, Jsonb(payload)))
        for ident, revision, payload in snapshot['personal_preferences']:
            db.execute('INSERT INTO lifeos.personal_preferences(id,revision,payload) VALUES (%s,%s,%s)', (ident, revision, Jsonb(payload)))
        for sequence, ident, entry in snapshot['calendar_audit']:
            db.execute('INSERT INTO lifeos.calendar_audit(sequence,id,entry) OVERRIDING SYSTEM VALUE VALUES (%s,%s,%s)', (sequence, ident, Jsonb(entry)))
        for ident, secret in snapshot['calendar_oauth']:
            db.execute('INSERT INTO lifeos.calendar_oauth(id,secret) VALUES (%s,%s)', (ident, secret))
        for key, verifier, expires in snapshot['calendar_pending']:
            db.execute('INSERT INTO lifeos.calendar_pending(state_hash,verifier,expires) VALUES (%s,%s,%s)', (key, verifier, expires))
        queries = {
            'state': 'SELECT id,revision,payload FROM lifeos.state ORDER BY id',
            'personal_preferences': 'SELECT id,revision,payload FROM lifeos.personal_preferences ORDER BY id',
            'calendar_audit': 'SELECT sequence,id,entry FROM lifeos.calendar_audit ORDER BY sequence',
            'calendar_oauth': 'SELECT id,secret FROM lifeos.calendar_oauth ORDER BY id',
            'calendar_pending': 'SELECT state_hash,verifier,expires FROM lifeos.calendar_pending ORDER BY state_hash',
        }
        for name, query in queries.items():
            if db.execute(query).fetchall() != snapshot[name]:
                raise Refused('Target read-back did not match the reviewed backup; transaction rolled back')
        reject_sidecars(source)
        if digest(source) != source_hash:
            raise Refused('Source backup changed during migration; transaction rolled back')
        if snapshot['calendar_audit']:
            from psycopg import sql
            db.execute(sql.SQL('ALTER SEQUENCE lifeos.calendar_audit_sequence_seq RESTART WITH {}').format(sql.Literal(snapshot['calendar_audit'][-1][0] + 1)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, help='Path to an offline, self-contained Preview backup')
    parser.add_argument('--source-type', choices=('sqlite', 'server-json'), default='sqlite', help='SQLite backup, or the checksummed state-only server export')
    parser.add_argument('--target-host', required=True, help='Independently reviewed Preview database host, without credentials')
    parser.add_argument('--target-database', required=True, help='Exact independently reviewed Preview database name')
    parser.add_argument('--target-user', required=True, help='Exact independently reviewed Preview database user')
    parser.add_argument('--apply', action='store_true', help='Write to the empty, reviewed target; default is inspection only')
    parser.add_argument('--source-sha256', help='SHA-256 from the earlier dry run; required with --apply')
    parser.add_argument('--verified-separate-backup', action='store_true', help='Confirm a separate recovery backup was independently verified')
    parser.add_argument('--confirm-state-only', action='store_true', help='Acknowledge the server JSON does not contain preferences, calendar audit or calendar authorization')
    args = parser.parse_args()
    try:
        path, source_hash, snapshot = (read_server_json_backup(args.source) if args.source_type == 'server-json' else read_backup(args.source))
        url = os.environ.get('LIFEOS_PREVIEW_MIGRATION_TARGET', '')
        if not url:
            raise Refused('LIFEOS_PREVIEW_MIGRATION_TARGET is not set')
        if args.apply and (not args.verified_separate_backup or args.source_sha256 != source_hash):
            raise Refused('Apply requires a verified separate backup and the matching dry-run SHA-256')
        if args.apply and args.source_type == 'server-json' and not args.confirm_state_only:
            raise Refused('Server JSON contains state only; separately review missing preferences, audit and calendar authorization')
        inspect_target(url, args.target_host, args.target_database, args.target_user)
        if args.apply:
            migrate(snapshot, path, source_hash, url, args.target_host, args.target_database, args.target_user)
        print(('Copied and verified' if args.apply else 'Inspection only') + ': source SHA-256 ' + source_hash)
        if args.source_type == 'server-json':
            print('State-only export: preferences, calendar audit and calendar authorization are not included.')
        print('Table counts: ' + ', '.join(name + '=' + str(len(snapshot[name])) for name in TABLES))
        print('Target: reviewed empty Preview database' + ('; transaction committed' if args.apply else '; no data written'))
    except (Refused, FileNotFoundError, PermissionError) as exc:
        print('Migration refused: ' + str(exc), file=sys.stderr)
        return 2
    except Exception:
        # Database and connection exceptions may include credentials or values.
        print('Migration failed safely; review target access and retain the original backup. No details were printed.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
