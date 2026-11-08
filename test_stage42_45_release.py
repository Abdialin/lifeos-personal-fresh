import tempfile
import unittest
from pathlib import Path
from release_gate import evaluate, REQUIRED_GATES, ROOT

class ReleaseGateTests(unittest.TestCase):
    def test_package_passes_static_check(self):
        result=evaluate({})
        self.assertTrue(result['package_valid'], result['package_errors'])
        self.assertFalse(result['release_approved'])
        self.assertEqual(set(result['missing_approvals']),set(REQUIRED_GATES))
    def test_partial_attestation_cannot_approve(self):
        result=evaluate({'LIFEOS_VERIFIED_DOCKER':'YES'})
        self.assertFalse(result['release_approved'])
    def test_full_attestation_is_explicit(self):
        result=evaluate({'LIFEOS_VERIFIED_'+k.upper():'YES' for k in REQUIRED_GATES})
        self.assertTrue(result['release_approved'])
    def test_missing_file_blocks_even_with_attestation(self):
        with tempfile.TemporaryDirectory() as d:
            result=evaluate({'LIFEOS_VERIFIED_'+k.upper():'YES' for k in REQUIRED_GATES},Path(d))
            self.assertFalse(result['release_approved'])
if __name__=='__main__': unittest.main()
