"""V119 integration tests for checksum verified, approve-only first account import.
Run: python -m unittest -v test_account_migration_v119.py
"""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from datetime import datetime,timezone
import personal_social_isolated_v114 as social
import personal_account_workspace_v115 as workspaces
import personal_account_migration_v119 as migration
from personal_account_http_v117 import AccountBoundary

NOW=int(datetime(2026,11,15,12,tzinfo=timezone.utc).timestamp())
ORIGIN='https://accounts.example.test'
def backup(data,revision=7):
    raw=json.dumps({'revision':revision,'data':data},sort_keys=True,separators=(',',':')).encode('utf-8')
    return {'format':'lifeos-v3.1-backup','revision':revision,'data':data,'sha256':hashlib.sha256(raw).hexdigest()}
class MigrationTests(unittest.TestCase):
 def setUp(self):
  self.folder=tempfile.TemporaryDirectory()
  self.db=Path(self.folder.name)/'account.sqlite'
  self.boundary=AccountBoundary(self.db,ORIGIN)
  social.register(self.db,'alice','correct-horse-battery-alice')
  social.register(self.db,'bob','correct-horse-battery-bob')
  self.a=social.login(self.db,'alice','correct-horse-battery-alice',NOW)
  self.b=social.login(self.db,'bob','correct-horse-battery-bob',NOW)
  self.original={'version':1,'sessions':[{'id':'actual-001','name':'Study'}],
                 'schedule':[{'id':'plan-2','name':'Pray'}],'workouts':[],'meals':[]}
  self.export=backup(self.original)
 def tearDown(self):self.folder.cleanup()
 def test_preview_is_read_only(self):
  report=migration.preview(self.export)
  self.assertTrue(report['eligible'])
  self.assertEqual(report['sessions'],1)
  self.assertEqual(workspaces.read(self.db,self.a,NOW)['revision'],0)
 def test_explicit_approved_copy_only_once(self):
  result=migration.migrate(self.db,self.a,self.export,'alice',True,0,NOW)
  self.assertTrue(result['copied'])
  self.assertEqual(workspaces.read(self.db,self.a,NOW)['data'],self.original)
  self.assertEqual(workspaces.read(self.db,self.b,NOW)['data'],None)
  self.assertEqual(self.original['sessions'][0]['id'],'actual-001')
  again=migration.migrate(self.db,self.a,self.export,'alice',True,0,NOW)
  self.assertFalse(again['ok'])
  self.assertEqual(workspaces.read(self.db,self.a,NOW)['revision'],1)
 def test_bad_owner_and_approval_rejected(self):
  with self.assertRaises(PermissionError):migration.migrate(self.db,self.a,self.export,'bob',True,0,NOW)
  with self.assertRaises(ValueError):migration.migrate(self.db,self.a,self.export,'alice',False,0,NOW)
  with self.assertRaises(ValueError):migration.migrate(self.db,self.a,self.export,'alice',True,1,NOW)
  self.assertIsNone(workspaces.read(self.db,self.a,NOW)['data'])
 def test_tampered_backup_fails_closed(self):
  altered=json.loads(json.dumps(self.export))
  altered['data']['sessions'][0]['id']='changed'
  with self.assertRaisesRegex(ValueError,'checksum'):migration.migrate(self.db,self.a,altered,'alice',True,0,NOW)
  self.assertIsNone(workspaces.read(self.db,self.a,NOW)['data'])
 def test_account_http_migration_enforces_bearer_and_owner(self):
  request={'backup':self.export,'confirmedUsername':'alice','approved':True,'expectedRevision':0}
  hdr={'Origin':ORIGIN,'Sec-Fetch-Site':'same-origin','Content-Type':'application/json','Authorization':'Bearer '+self.a}
  raw=json.dumps(request).encode()
  code,result=self.boundary.route('POST','/api/account/v117/workspace/migrate',hdr,raw,client='localhost',now=NOW)
  self.assertEqual(code,201)
  self.assertTrue(result['copied'])
  code,_=self.boundary.route('POST','/api/account/v117/workspace/migrate',hdr,raw,client='localhost',now=NOW)
  self.assertEqual(code,409)
  hdr['Authorization']='Bearer '+self.b
  code,_=self.boundary.route('POST','/api/account/v117/workspace/migrate',hdr,raw,client='localhost',now=NOW)
  self.assertEqual(code,403)
if __name__=='__main__':unittest.main()
