"""V117 isolated API dispatcher tests. Run python -m unittest -v test_account_api_v117.py."""
import tempfile
import unittest
from pathlib import Path
from datetime import datetime,timezone
from personal_account_api_v117 import AccountApi,bootstrap
NOW=int(datetime(2026,11,15,12,tzinfo=timezone.utc).timestamp())
DAY='2026-11-15'
class AccountApiTests(unittest.TestCase):
 def setUp(self):
  self.folder=tempfile.TemporaryDirectory()
  self.db=Path(self.folder.name)/'account.sqlite'
  bootstrap(self.db)
  self.api=AccountApi(self.db)
  for user in ('alice','bob','cara'):
   self.assertEqual(self.api.handle('POST','/register',{'username':user,'password':'correct-horse-battery-'+user},client='dev-'+user,now=NOW)[0],201)
  self.tokens={}
  for user in ('alice','bob','cara'):
   status,result=self.api.handle('POST','/login',{'username':user,'password':'correct-horse-battery-'+user},client='login-'+user,now=NOW)
   self.assertEqual(status,200);self.tokens[user]='Bearer '+result['token']
 def tearDown(self):self.folder.cleanup()
 def request(self,user,method,path,body=None,at=NOW):
  return self.api.handle(method,path,body,bearer=self.tokens[user],client='dev-'+user,now=at)
 def test_isolation_and_revision_conflict(self):
  data={'revision':0,'data':{'version':1,'sessions':[{'id':'private-a'}]}}
  self.assertEqual(self.request('alice','PUT','/workspace',data)[0],200)
  self.assertEqual(self.request('bob','GET','/workspace')[1],{'revision':0,'data':None})
  self.assertEqual(self.request('alice','PUT','/workspace',data)[0],409)
  self.assertEqual(self.request('bob','PUT','/workspace',{'revision':0,'data':{'version':1,'sessions':[]}})[0],200)
  self.assertEqual(self.request('bob','GET','/workspace')[1]['data']['sessions'],[])
 def test_friend_grant_and_default_denial(self):
  status,invite=self.request('alice','POST','/friends/invite',{'username':'bob'})
  self.assertEqual(status,201)
  self.assertEqual(self.request('cara','POST','/friends/respond',{'invitationId':invite['invitationId'],'accept':True})[0],403)
  self.assertEqual(self.request('bob','POST','/friends/respond',{'invitationId':invite['invitationId'],'accept':True})[0],200)
  self.assertEqual(self.request('alice','POST','/friends/share',{'metric':'workoutDays','days':7,'periodEnd':DAY,'score':5})[0],200)
  view={'metric':'workoutDays','days':7,'periodEnd':DAY}
  self.assertEqual(self.request('bob','GET','/friends/leaderboard',view)[1]['results'],[])
  self.assertEqual(self.request('alice','POST','/friends/grant',{'username':'bob','metric':'workoutDays','enabled':True})[0],200)
  self.assertEqual(self.request('bob','GET','/friends/leaderboard',view)[1]['results'][0]['score'],5)
  self.assertEqual(self.request('cara','GET','/friends/leaderboard',view)[1]['results'],[])
  self.assertEqual(self.request('alice','POST','/friends/grant',{'username':'bob','metric':'workoutDays','enabled':False})[0],200)
  self.assertEqual(self.request('bob','GET','/friends/leaderboard',view)[1]['results'],[])
 def test_expired_and_revoked_session(self):
  self.assertEqual(self.request('alice','GET','/workspace',at=NOW+12*3600+1)[0],403)
  self.assertEqual(self.request('alice','POST','/logout',{})[0],200)
  self.assertEqual(self.request('alice','GET','/workspace')[0],403)
 def test_account_rate_limit_and_invalid_requests(self):
  for _ in range(6):
   self.assertEqual(self.api.handle('POST','/login',{'username':'ghost','password':'guess'},client='host-A',now=NOW)[0],400)
  self.assertEqual(self.api.handle('POST','/login',{'username':'ghost','password':'guess'},client='host-A',now=NOW)[0],429)
  self.assertEqual(self.api.handle('POST','/login',{'username':'alice','password':'bad'},client='host-A',now=NOW)[0],400)
  self.assertEqual(self.api.handle('GET','/workspace',bearer=None,now=NOW)[0],403)
  self.assertEqual(self.request('alice','POST','/friends/share',{'metric':'prayer','days':7,'periodEnd':DAY,'score':4})[0],400)
 def test_no_implicit_legacy_workspace_or_tokens_in_error(self):
  status,response=self.api.handle('GET','/workspace',bearer='Bearer invalid',now=NOW)
  self.assertEqual(status,403)
  self.assertNotIn('token',str(response).lower())
  self.assertEqual(self.request('bob','GET','/workspace')[1]['data'],None)
if __name__=='__main__':unittest.main()
