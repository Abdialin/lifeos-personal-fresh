import json, tempfile, unittest
from pathlib import Path
import calendar_audit_store as store

class AuditTest(unittest.TestCase):
 def test_idempotency_and_conflict(self):
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'db.sqlite3'
   e={'id':'decision-1','at':'2026-11-08T00:00:00Z','action':'approve','planId':'p','proposalId':'q'}
   self.assertEqual(store.append_entry(path,'',e)['status'],'stored')
   self.assertTrue(store.append_entry(path,'',e)['duplicate'])
   self.assertEqual(len(store.list_entries(path,'')),1)
   self.assertEqual(store.append_entry(path,'',{**e,'action':'reject'})['status'],'conflict')
   self.assertEqual(store.list_entries(path,'')[0]['action'],'approve')
 def test_validation(self):
  with self.assertRaises(ValueError):store.validate({'id':'bad'})
if __name__=='__main__':unittest.main()
