"""Stage 40 isolated HTTP and packaging checks."""
import shutil
import fnmatch
import unittest
from pathlib import Path
from deployment_smoke import run

ROOT = Path(__file__).resolve().parent

class Stage40Deployment(unittest.TestCase):
    def test_isolated_http(self):
        self.assertTrue(run())

    def test_dockerfile_copies_required_files(self):
        dockerfile = (ROOT / 'Dockerfile').read_text()
        self.assertRegex(dockerfile, r'(?m)^COPY\s+\.\s+\./\s*$')
        ignored = [line.strip() for line in (ROOT / '.dockerignore').read_text().splitlines()
                   if line.strip() and not line.lstrip().startswith('#')]
        for filename in ['server.py', 'google_calendar.py', 'calendar_audit_store.py',
                         'atomic_calendar.py', 'index.html', 'calendar.html', 'calendar.js']:
            self.assertTrue((ROOT / filename).is_file())
            self.assertFalse(any(fnmatch.fnmatch(filename, pattern) for pattern in ignored), filename)

    def test_docker_context_excludes_backups_and_secrets(self):
        ignored = [line.strip() for line in (ROOT / '.dockerignore').read_text().splitlines()
                   if line.strip() and not line.lstrip().startswith('#')]
        for name in ['.git', '.env', 'personal.sqlite3', 'recovery-backup.json',
                     'LifeOS_v234_android_local_before_adoption.json', 'LifeOS_v234_server_revision_1.json',
                     'LifeOS_v244_local_pending_2026-11-27.json', 'personal-notes.json',
                     'archive.zip', 'signing.keystore']:
            self.assertTrue(any(fnmatch.fnmatch(name, pattern) for pattern in ignored), name)

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
