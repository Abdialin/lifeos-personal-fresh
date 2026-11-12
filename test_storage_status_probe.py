"""Verify storage metadata probe without touching user data or requiring database credentials."""
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import server


class StorageProbeTests(unittest.TestCase):
    def test_isolated_sqlite_probe_is_read_only(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'isolated.sqlite3'
            with sqlite3.connect(path) as db:
                db.execute('CREATE TABLE state (id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,payload TEXT NOT NULL)')
                db.execute('INSERT INTO state (id,revision,payload) VALUES (1,7,?)',
                           ('{"version":1,"sessions":[{"id":"unmodified"}],"events":[]}',))
                db.commit()
            with patch.object(server, 'DB', path), patch.object(server, 'DATABASE_URL', ''):
                before = path.read_bytes()
                result = server.read_storage_status()
                self.assertEqual(result['backend'], 'sqlite')
                self.assertEqual(result['revision'], 7)
                self.assertTrue(result['has_state'])
                self.assertTrue(result['read_only'])
                self.assertTrue(result['storage_readable'])
                self.assertEqual(path.read_bytes(), before)

    def test_empty_sqlite_probe_never_creates_workspace(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'isolated.sqlite3'
            with sqlite3.connect(path) as db:
                db.execute('CREATE TABLE state (id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,payload TEXT NOT NULL)')
                db.commit()
            with patch.object(server, 'DB', path), patch.object(server, 'DATABASE_URL', ''):
                result = server.read_storage_status()
                self.assertFalse(result['has_state'])
                self.assertEqual(result['revision'], 0)
                with sqlite3.connect(path) as db:
                    self.assertEqual(db.execute('SELECT count(*) FROM state').fetchone()[0], 0)


    def test_simulated_postgres_probe_reads_only_revision_not_activity_data(self):
        """Mock the database connection: prove PostgreSQL probe uses SELECT only."""
        class Cursor:
            def __init__(self): self.statements = []
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def execute(self, query):
                self.statements.append(query.strip())
                if query.strip() != 'SELECT revision FROM lifeos.state WHERE id=1':
                    raise AssertionError('Storage health probe executed an unexpected query')
            def fetchone(self): return (12,)
        class Connection:
            def __init__(self, cursor): self.cursor_instance = cursor
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def cursor(self): return self.cursor_instance
        cursor = Cursor()
        class FakePg:
            @staticmethod
            def connect(url, connect_timeout):
                self.assertEqual(url, 'postgresql://mock-only/isolated')
                self.assertEqual(connect_timeout, 10)
                return Connection(cursor)
        with patch.object(server, 'DATABASE_URL', 'postgresql://mock-only/isolated'), patch.object(server, 'psycopg', FakePg, create=True):
            result = server.read_storage_status()
        self.assertEqual(result, {'backend':'postgresql','read_only':True,
                                  'storage_readable':True,'revision':12,'has_state':True})
        self.assertEqual(cursor.statements, ['SELECT revision FROM lifeos.state WHERE id=1'])
        self.assertNotIn('sessions', str(result))


if __name__ == '__main__':
    unittest.main()
