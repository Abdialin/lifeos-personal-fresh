"""V118 browser-compatible GET and consented leaderboard end-to-end dispatcher tests."""
import json
import tempfile
import unittest
from pathlib import Path
from datetime import datetime,timezone
from personal_account_http_v117 import AccountBoundary
NOW=int(datetime(2026,11,15,12,tzinfo=timezone.utc).timestamp())
ORIGIN='https://lifeos-accounts-staging.example'
class FriendHttpTests(unittest.TestCase):
 def setUp(self):
  self.folder=tempfile.TemporaryDirectory();self.db=Path(self.folder.name)/'social.sqlite'
  self.boundary=AccountBoundary(self.db,ORIGIN)
  self.headers={'Origin':ORIGIN,'Content-Type':'application/json','Sec-Fetch-Site':'same-origin'}
  self.users={}
  for name in ('alice','bob','cara'):
   self.call('POST','/register',{'username':name,'password':'correct-horse-battery-'+name})
   response=self.call('POST','/login',{'username':name,'password':'correct-horse-battery-'+name})
   self.assertEqual(response[0],200);self.users[name]='Bearer '+response[1]['token']
 def tearDown(self):self.folder.cleanup()
 def call(self,method,path,body=None,user=None,headers=None):
  headers=dict(self.headers if headers is None else headers)
  if user:headers['Authorization']=self.users[user]
  raw=json.dumps(body).encode() if body is not None else None
  return self.boundary.route(method,'/api/account/v117'+path,headers,raw,client='isolated-test',now=NOW)
 def test_browser_get_with_referer_and_query(self):
  iid=self.call('POST','/friends/invite',{'username':'bob'},'alice')[1]['invitationId']
  self.assertEqual(self.call('POST','/friends/respond',{'invitationId':iid,'accept':True},'bob')[0],200)
  self.assertEqual(self.call('POST','/friends/share',{'metric':'workoutDays','days':7,'periodEnd':'2026-11-15','score':4},'alice')[0],200)
  query='/friends/leaderboard?metric=workoutDays&days=7&periodEnd=2026-11-15'
  browser={k:v for k,v in self.headers.items() if k!='Origin'}
  browser['Referer']=ORIGIN+'/index.html'
  self.assertEqual(self.call('GET',query,user='bob',headers=browser)[1]['results'],[])
  self.assertEqual(self.call('POST','/friends/grant',{'username':'bob','metric':'workoutDays','enabled':True},'alice')[0],200)
  result=self.call('GET',query,user='bob',headers=browser)
  self.assertEqual(result[0],200)
  self.assertEqual(result[1]['results'][0]['score'],4)
  self.assertEqual(self.call('GET',query,user='cara',headers=browser)[1]['results'],[])
 def test_rejects_forged_or_missing_get_referrer(self):
  for value in (None,'https://evil.example/index.html',ORIGIN+'.evil/index.html'):
   header={k:v for k,v in self.headers.items() if k!='Origin'}
   if value:header['Referer']=value
   self.assertEqual(self.call('GET','/friends/inbox',user='alice',headers=header)[0],403)
 def test_query_rejects_extra_duplicate_and_sensitive_values(self):
  for query in ('?metric=workoutDays&days=7&periodEnd=2026-11-15&token=secret',
                '?metric=workoutDays&metric=habitDays&days=7&periodEnd=2026-11-15',
                '?metric=workoutDays&days=bad&periodEnd=2026-11-15'):
   self.assertEqual(self.call('GET','/friends/leaderboard'+query,user='alice')[0],400)
  self.assertEqual(self.call('GET','/workspace?token=secret',user='alice')[0],400)
if __name__=='__main__':unittest.main()
