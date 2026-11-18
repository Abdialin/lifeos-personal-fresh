"""V215 isolated server restart and revision preservation integration test.
No Render access and no user records; temporary SQLite and synthetic sessions only.
"""
import base64
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from urllib.error import HTTPError
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parent
def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0));return sock.getsockname()[1]
class RestartPersistence(unittest.TestCase):
    def test_reviewed_records_survive_backend_restart(self):
        with tempfile.TemporaryDirectory(prefix='lifeos-v215-') as tmp:
            database=str(Path(tmp)/'persistent.sqlite3')
            token='isolated-v215-private-test'
            username='isolated-user';password='isolated-password'
            env={**os.environ,'LIFEOS_DB':database,'LIFEOS_TOKEN':token,
                 'LIFEOS_USERNAME':username,'LIFEOS_PASSWORD':password,
                 'LIFEOS_ACCOUNT_API_ENABLED':'0'}
            env.pop('LIFEOS_DATABASE_URL',None)
            def start():
                port=free_port()
                process=subprocess.Popen([sys.executable,str(ROOT/'server.py')],
                    cwd=str(ROOT),env={**env,'PORT':str(port)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                host=f'http://127.0.0.1:{port}'
                for _ in range(80):
                    if process.poll() is not None:raise AssertionError('Test backend exited')
                    try:
                        with urlopen(host+'/healthz',timeout=.4) as response:
                            if response.status==200:return process,host
                    except Exception:time.sleep(.1)
                process.terminate();process.wait(timeout=5);raise AssertionError('Test backend did not become healthy')
            def request(host,method='GET',payload=None):
                auth=base64.b64encode((username+':'+password).encode()).decode()
                headers={'Authorization':'Basic '+auth,'X-LifeOS-Token':token}
                data=None
                if payload is not None:
                    headers['Content-Type']='application/json';data=json.dumps(payload).encode()
                req=Request(host+'/api/state',method=method,headers=headers,data=data)
                try:
                    with urlopen(req,timeout=8) as response:return response.status,json.load(response)
                except HTTPError as e:return e.code,json.loads(e.read().decode())
            record=lambda key:{'id':key,'name':'Synthetic '+key,'status':'finished','segments':[{'start':1000,'end':61000}]}
            workspace={'version':1,'sessions':[record('device-A'),record('device-B')],
                       'events':[],'schedule':[],'todos':[],'workouts':[],'meals':[],
                       'goals':[],'habitChecks':[]}
            proc,host=start()
            try:
                status,result=request(host,'PUT',{'revision':0,'data':workspace})
                self.assertEqual(status,200);self.assertEqual(result['revision'],1)
                status,remote=request(host)
                self.assertEqual(status,200);self.assertEqual(remote['data'],workspace)
                before=Path(database).stat().st_size
                self.assertGreater(before,0)
            finally:
                proc.terminate();proc.wait(timeout=5)
            proc,host=start()
            try:
                status,after=request(host)
                self.assertEqual(status,200)
                self.assertEqual(after['revision'],1)
                self.assertEqual(after['data'],workspace)
                status,stale=request(host,'PUT',{'revision':0,
                    'data':{**workspace,'sessions':[record('stale-device')]}})
                self.assertEqual(status,409);self.assertEqual(stale['revision'],1)
                status,final=request(host)
                self.assertEqual(status,200)
                self.assertEqual({x['id'] for x in final['data']['sessions']},{'device-A','device-B'})
                self.assertEqual(final['revision'],1)
                print('V215 isolated restart: saved activity records + CAS revision survive restart PASS')
            finally:
                proc.terminate();proc.wait(timeout=5)
if __name__=='__main__':unittest.main()
