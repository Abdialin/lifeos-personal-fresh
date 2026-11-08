"""Offline validation of Stage 41 safety gates."""
import ast
import unittest
from pathlib import Path
from deployment_preflight import inspect

ROOT = Path(__file__).resolve().parent

class Stage41Gates(unittest.TestCase):
    def test_optional_live_test_is_explicitly_gated(self):
        source = (ROOT / 'test_stage41_postgres_atomic_live.py').read_text()
        self.assertIn("LIFEOS_ALLOW_DESTRUCTIVE_TEST", source)
        self.assertIn('LIFEOS_TEST_DATABASE_URL', source)
        self.assertIn('Refusing non-empty database', source)
        self.assertIn('DROP SCHEMA lifeos CASCADE', source)
        ast.parse(source)

    def test_docker_smoke_uses_isolated_storage(self):
        source = (ROOT / 'docker_smoke_stage41.py').read_text()
        self.assertIn('TemporaryDirectory', source)
        self.assertIn('LIFEOS_DATABASE_URL=', source)
        self.assertIn("'rm', '-f'", source)
        ast.parse(source)

    def test_preflight_finds_no_missing_files(self):
        result = inspect(env={'LIFEOS_USERNAME':'test', 'LIFEOS_PASSWORD':'a'*20, 'LIFEOS_TOKEN':'b'*40})
        self.assertTrue(result['ready'], result['errors'])

if __name__ == '__main__':
    unittest.main()
