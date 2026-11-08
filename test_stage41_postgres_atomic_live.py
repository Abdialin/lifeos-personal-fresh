"""Opt-in, DESTRUCTIVE integration test on a dedicated EMPTY PostgreSQL test DB.
Requires LIFEOS_TEST_DATABASE_URL and LIFEOS_ALLOW_DESTRUCTIVE_TEST=YES.
Never point this at production. Refuses any existing non-system schemas/tables.
"""

# Standalone integration smoke test: intentionally inert during unittest discovery.
def main():
    import json
    import os
    from pathlib import Path
    import sys

    URL = os.environ.get('LIFEOS_TEST_DATABASE_URL', '')
    if not URL or os.environ.get('LIFEOS_ALLOW_DESTRUCTIVE_TEST') != 'YES':
        print('SKIP: dedicated test PostgreSQL URL and destructive-test opt-in required')
        sys.exit(0)
    if not URL.startswith(('postgresql://', 'postgres://')):
        raise SystemExit('Refusing invalid PostgreSQL URL')
    import psycopg
    from atomic_calendar import commit
    from calendar_audit_store import list_entries
    ROOT = Path(__file__).resolve().parent

    with psycopg.connect(URL, connect_timeout=10) as db:
        with db.cursor() as cur:
            cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema','pg_catalog','pg_toast','public') AND schema_name NOT LIKE 'pg_temp_%' AND schema_name NOT LIKE 'pg_toast_temp_%'")
            schemas = [x[0] for x in cur.fetchall()]
            cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
            public_tables = cur.fetchone()[0]
            if schemas or public_tables:
                raise RuntimeError('Refusing non-empty database; use a NEW disposable PostgreSQL database')
            cur.execute((ROOT / 'postgres_schema.sql').read_text())
        db.commit()
    try:
        original = {'version':1, 'sessions':[], 'events':[]}
        updated = {'version':1, 'sessions':[{'id':'test-session'}], 'events':[]}
        entry = {'id':'stage41-test-1','at':'2026-01-01T00:00:00Z','action':'approve','planId':'plan-1','proposalId':'proposal-1'}
        assert commit(None, URL, 0, original, entry)['status'] == 'committed'
        assert commit(None, URL, 0, original, entry)['status'] == 'duplicate'
        other = {**entry, 'action':'reject'}
        assert commit(None, URL, 1, updated, other)['status'] == 'decision_conflict'
        second = {**entry, 'id':'stage41-test-2'}
        assert commit(None, URL, 0, updated, second)['status'] == 'revision_conflict'
        assert commit(None, URL, 1, updated, second)['status'] == 'committed'
        try:
            commit(None, URL, 2, updated, {**second, 'id':'stage41-invalid','action':'invalid'})
        except ValueError:
            pass
        else:
            raise AssertionError('Invalid audit action accepted')
        with psycopg.connect(URL, connect_timeout=10) as db:
            with db.cursor() as cur:
                cur.execute('SELECT revision,payload FROM lifeos.state WHERE id=1')
                revision, payload = cur.fetchone()
                cur.execute('SELECT count(*) FROM lifeos.calendar_audit')
                count = cur.fetchone()[0]
        assert revision == 2 and payload == updated and count == 2
        assert len(list_entries(None, URL)) == 2
        print('PASS: isolated real PostgreSQL atomic commit, replay, conflict, rollback, persistence')
    finally:
        with psycopg.connect(URL, connect_timeout=10) as db:
            with db.cursor() as cur:
                cur.execute('DROP SCHEMA lifeos CASCADE')
            db.commit()


if __name__ == "__main__":
    main()
