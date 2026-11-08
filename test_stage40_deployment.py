"""Stage 40 isolated HTTP and packaging checks."""
import shutil
import unittest
from pathlib import Path
from deployment_smoke import run

ROOT = Path(__file__).resolve().parent

class Stage40Deployment(unittest.TestCase):
    def test_isolated_http(self):
        self.assertTrue(run())

    def test_dockerfile_copies_required_files(self):
        dockerfile = (ROOT / 'Dockerfile').read_text()
        for filename in ['server.py', 'google_calendar.py', 'calendar_audit_store.py',
                         'atomic_calendar.py', 'index.html', 'calendar.html', 'calendar.js']:
            self.assertIn(filename, dockerfile)
            self.assertTrue((ROOT / filename).is_file())

    def test_postgres_schema_is_additive(self):
        schema = (ROOT / 'postgres_schema.sql').read_text().upper()
        self.assertIn('CREATE TABLE IF NOT EXISTS LIFEOS.STATE', schema)
        self.assertIn('CREATE TABLE IF NOT EXISTS LIFEOS.CALENDAR_AUDIT', schema)
        self.assertNotIn('DROP SCHEMA', schema)
        self.assertNotIn('DROP TABLE', schema)

    def test_docker_availability_report(self):
        print('Docker executable:', shutil.which('docker') or 'not installed; image build not attempted')

if __name__ == '__main__':
    unittest.main()
