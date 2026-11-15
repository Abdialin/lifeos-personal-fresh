"""V117 opt-in account HTTP boundary tests. All databases are temporary."""
import json
import tempfile
import unittest
from pathlib import Path
from datetime import datetime,timezone
from personal_account_http_v117 import AccountBoundary
NOW=int(datetime(2026,11,15,12,tzinfo=timezone.utc).timestamp())
ORIGIN='https://lifeos-accounts-staging.example'
class BoundaryTests(unittest.TestCase):
 def setUp(self):
  self.folder=tempfile.TemporaryDirectory()
  self.db=Path(self.folder.name)/'accounts.sqlite'
  self.api=AccountBoundary(self.db,ORIGIN)
  self.headers={'Origin':ORIGIN,'Content-Type':'application/json','Sec-Fetch-Site':'same-origin'}
 def tearDown(self):self.folder.cleanup()
 def request(self,method,path,body=None,headers=None):
  raw=json.dumps(body).encode() if body is not None else None
  return self.api.route(method,'/api/account/v117'+path,headers or self.headers,raw,'local-test',NOW)
 def test_register_login_and_private_workspace(self):
  self.assertEqual(self.request('POST','/register',{'username':'alice','password':'testing-password-alice'})[0],201)
  code,result=self.request('POST','/login',{'username':'alice','password':'testing-password-alice'})
  self.assertEqual(code,200)
  self.assertEqual(result['storage'],'memory-only')
  authorized={**self.headers,'Authorization':'Bearer '+result['token']}
  self.assertEqual(self.request('GET','/workspace',headers=authorized)[1],{'revision':0,'data':None})
  self.assertEqual(self.request('PUT','/workspace',{'revision':0,'data':{'version':1,'sessions':[{'id':'private'}]}},headers=authorized)[0],200)
  self.assertEqual(self.request('GET','/workspace',headers=authorized)[1]['data']['sessions'][0]['id'],'private')
 def test_origin_and_site_blocking(self):
  body={'username':'alice','password':'testing-password-alice'}
  for header in ({'Origin':'https://attacker.example','Content-Type':'application/json'},
                 {'Content-Type':'application/json'},
                 {**self.headers,'Sec-Fetch-Site':'cross-site'}):
   self.assertEqual(self.request('POST','/register',body,headers=header)[0],403)
 def test_malformed_body_and_cors(self):
  self.assertEqual(self.api.route('POST','/api/account/v117/login',{**self.headers,'Content-Type':'text/plain'},b'{}','localhost',NOW)[0],415)
  self.assertEqual(self.api.route('POST','/api/account/v117/login',self.headers,b'{invalid','localhost',NOW)[0],400)
  self.assertEqual(self.request('OPTIONS','/login')[0],404)
 def test_http_origin_rejected(self):
  with self.assertRaises(ValueError):AccountBoundary(self.db,'http://localhost')
  with self.assertRaises(ValueError):AccountBoundary('relative.sqlite',ORIGIN)
if __name__=='__main__':unittest.main()
