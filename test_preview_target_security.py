"""Offline URL guards only: no network, provider resource or data migration."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    'preview_storage_migration', Path(__file__).resolve().parent / 'scripts' / 'preview_storage_migration.py'
)
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)


class PreviewTargetSecurity(unittest.TestCase):
    host = 'synthetic.example.invalid'
    user = 'synthetic_preview_user'
    database = 'lifeos_preview_fixture'
    base = 'postgresql://synthetic_preview_user:fake@synthetic.example.invalid/lifeos_preview_fixture'

    def check(self, query, *, host=None, user=None, database=None):
        return migration.checked_target(
            self.base + query, host or self.host, database or self.database, user or self.user
        )

    def test_verified_remote_and_narrow_neon_parameters(self):
        self.assertEqual(self.check('?sslmode=verify-full'), self.database)
        self.assertEqual(
            self.check('?sslmode=verify-full&sslrootcert=system&channel_binding=require&application_name=lifeos-preview'),
            self.database,
        )

    def test_unverified_remote_connections_are_refused(self):
        for query in ('', '?sslmode=disable', '?sslmode=prefer', '?sslmode=require',
                      '?sslmode=verify-ca', '?sslmode=require&channel_binding=require'):
            with self.subTest(query=query), self.assertRaises(migration.Refused):
                self.check(query)

    def test_no_parameter_can_override_identity_or_weaken_tls(self):
        for query in ('?sslmode=verify-full&host=other.invalid',
                      '?sslmode=verify-full&sslmode=disable',
                      '?sslmode=verify-full&channel_binding=disable',
                      '?sslmode=verify-full&channel_binding=prefer',
                      '?sslmode=verify-full&sslrootcert=/tmp/untrusted.pem',
                      '?sslmode=verify-full&sslrootcert=system&sslrootcert=system'):
            with self.subTest(query=query), self.assertRaises(migration.Refused):
                self.check(query)
        for kwargs in ({'host': 'other.invalid'}, {'user': 'other'}, {'database': 'production'}):
            with self.subTest(kwargs=kwargs), self.assertRaises(migration.Refused):
                self.check('?sslmode=verify-full', **kwargs)

    def test_local_disposable_rehearsal_still_allowed(self):
        self.assertEqual(
            migration.checked_target('postgresql://synthetic:fake@localhost/lifeos_preview_test?sslmode=disable',
                                     'localhost', 'lifeos_preview_test', 'synthetic'),
            'lifeos_preview_test',
        )


if __name__ == '__main__':
    unittest.main()
