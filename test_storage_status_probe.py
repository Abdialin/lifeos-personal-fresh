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


if __name__ == '__main__':
    unittest.main()
