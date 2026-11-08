"""Opt-in live PostgreSQL test; use an EMPTY DEDICATED TEST DATABASE only.
Requires LIFEOS_TEST_DATABASE_URL and LIFEOS_ALLOW_DESTRUCTIVE_TEST=YES.
Never point this at production or any database containing personal activity data.
"""

# Standalone integration smoke test: intentionally inert during unittest discovery.
def main():
    import importlib.util
    import os
    from pathlib import Path
    import sys

    url = os.environ.get('LIFEOS_TEST_DATABASE_URL', '')
    if not url or os.environ.get('LIFEOS_ALLOW_DESTRUCTIVE_TEST') != 'YES':
        print('SKIP: isolated PostgreSQL URL and explicit destructive-test opt-in required')
        sys.exit(0)
    import psycopg
    from psycopg.types.json import Jsonb
    root = Path(__file__).resolve().parent
    with psycopg.connect(url, connect_timeout=10) as db:
        with db.cursor() as cur:
            cur.execute("SELECT to_regnamespace('lifeos')")
            if cur.fetchone()[0] is not None:
                raise RuntimeError('Refusing to test: lifeos schema already exists; use an EMPTY dedicated database')
            cur.execute((root / 'postgres_schema.sql').read_text())
        db.commit()
    try:
        os.environ['LIFEOS_DATABASE_URL'] = url
        spec = importlib.util.spec_from_file_location('lifeos_postgres_live', root / 'server.py')
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        a = {'version':1,'sessions':[],'events':[]}
        b = {'version':1,'sessions':[{'id':'x'}],'events':[]}
        assert mod.read_state() == (0,None)
        assert mod.save_state(0,a) == (True,1)
        assert mod.save_state(0,b) == (False,1)
        assert mod.save_state(1,b) == (True,2)
        assert mod.read_state() == (2,b)
        print('PASS: real isolated PostgreSQL read/write/conflict/persistence')
    finally:
        with psycopg.connect(url, connect_timeout=10) as db:
            with db.cursor() as cur: cur.execute('DROP SCHEMA lifeos CASCADE')
            db.commit()


if __name__ == "__main__":
    main()
