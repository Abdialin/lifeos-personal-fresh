import tempfile
import unittest
from pathlib import Path
from deployment_preflight import inspect, ROOT

class Stage39PreflightTests(unittest.TestCase):
    def setUp(self):
        self.env = {'LIFEOS_USERNAME':'tester','LIFEOS_PASSWORD':'a-strong-test-password',
                    'LIFEOS_TOKEN':'x'*40,'LIFEOS_DATABASE_URL':'postgresql://test:pass@db.example/test'}
    def test_packaged_files_and_configuration(self):
        result=inspect(ROOT,self.env)
        self.assertTrue(result['ready'], result['errors'])
    def test_missing_credentials_fail_closed(self):
        result=inspect(ROOT,{})
        self.assertFalse(result['ready'])
        self.assertTrue(any('LIFEOS_TOKEN' in s for s in result['errors']))
    def test_incomplete_docker_copy_detected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            for name in ('server.py','google_calendar.py','calendar_audit_store.py','atomic_calendar.py',
                         'index.html','calendar.html','calendar.js','postgres_schema.sql','requirements-v3.2.txt'):
                (root/name).write_text('placeholder')
            (root/'Dockerfile').write_text('COPY server.py index.html ./\n')
            result=inspect(root,self.env)
            self.assertFalse(result['ready'])
            self.assertTrue(any('calendar.js' in s for s in result['errors']))
    def test_invalid_database_url(self):
        env={**self.env,'LIFEOS_DATABASE_URL':'sqlite:///tmp/test.db'}
        self.assertFalse(inspect(ROOT,env)['ready'])

if __name__ == '__main__': unittest.main()
