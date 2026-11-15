"""V115 account workspace isolation tests. Run: python -m unittest -v test_account_workspace_v115.py."""
import tempfile
import unittest
from pathlib import Path
from datetime import datetime,timezone
import personal_social_isolated_v114 as social
import personal_account_workspace_v115 as accounts

NOW=int(datetime(2026,11,15,12,tzinfo=timezone.utc).timestamp())
class WorkspaceIsolationTests(unittest.TestCase):
 def setUp(self):
  self.folder=tempfile.TemporaryDirectory()
  self.db=Path(self.folder.name)/'social.sqlite'
  social.initialize(self.db)
  accounts.initialize(self.db)
  social.register(self.db,'alice','correct-horse-battery-alice')
  social.register(self.db,'bob','correct-horse-battery-bob')
  self.a=social.login(self.db,'alice','correct-horse-battery-alice',NOW)
  self.b=social.login(self.db,'bob','correct-horse-battery-bob',NOW)
 def tearDown(self):self.folder.cleanup()
 def test_per_user_isolation_and_no_implicit_copy(self):
  data={'version':1,'sessions':[{'id':'alice-only','name':'Private'}],'schedule':[]}
  self.assertTrue(accounts.commit(self.db,self.a,0,data,NOW)['ok'])
  self.assertEqual(accounts.read(self.db,self.a,NOW)['data']['sessions'][0]['id'],'alice-only')
  self.assertEqual(accounts.read(self.db,self.b,NOW),{'revision':0,'data':None})
  self.assertTrue(accounts.commit(self.db,self.b,0,{'version':1,'sessions':[]},NOW)['ok'])
  self.assertEqual(accounts.read(self.db,self.b,NOW)['data']['sessions'],[])
 def test_revision_conflict_and_no_replace(self):
  first={'version':1,'sessions':[{'id':'keep-original'}]}
  second={'version':1,'sessions':[{'id':'updated'}]}
  self.assertTrue(accounts.commit(self.db,self.a,0,first,NOW)['ok'])
  self.assertFalse(accounts.commit(self.db,self.a,0,second,NOW)['ok'])
  self.assertFalse(accounts.commit(self.db,self.a,5,second,NOW)['ok'])
  self.assertEqual(accounts.read(self.db,self.a,NOW)['data'],first)
  self.assertTrue(accounts.commit(self.db,self.a,1,second,NOW)['ok'])
  self.assertEqual(accounts.read(self.db,self.a,NOW)['revision'],2)
 def test_token_expiry_and_cross_user_unavailability(self):
  with self.assertRaises(PermissionError):accounts.read(self.db,self.a,NOW+social.SESSION_TTL+1)
  with self.assertRaises(PermissionError):accounts.commit(self.db,'unknown',0,{'version':1},NOW)
 def test_legacy_migration_is_only_a_preview(self):
  proposal=accounts.inspect_migration({'version':1,'sessions':[{'id':'old'}]})
  self.assertTrue(proposal['eligible'])
  self.assertEqual(accounts.read(self.db,self.a,NOW)['revision'],0)
  self.assertEqual(accounts.read(self.db,self.b,NOW)['revision'],0)
 def test_untrusted_fields_rejected(self):
  with self.assertRaises(ValueError):accounts.commit(self.db,self.a,0,{'version':1,'sessions':'not-an-array'},NOW)
  with self.assertRaises(ValueError):accounts.commit(self.db,self.a,0,{'version':999,'sessions':[]},NOW)
if __name__=='__main__':unittest.main()
