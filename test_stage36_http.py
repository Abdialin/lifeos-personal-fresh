"""Stage 36: real local HTTP multi-client, replay, restart and preservation checks."""
import base64
import concurrent.futures
import http.client
import json
import os
from pathlib import Path
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parent

class MultiDeviceHTTP(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = Path(self.temp.name) / 'lifeos.sqlite3'
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            self.port = sock.getsockname()[1]
        self.env = dict(os.environ, LIFEOS_DB=str(self.db), PORT=str(self.port),
                        LIFEOS_USERNAME='test-user', LIFEOS_PASSWORD='test-password',
                        LIFEOS_TOKEN='test-token')
        self.env.pop('LIFEOS_DATABASE_URL', None)
        self.auth = 'Basic ' + base64.b64encode(b'test-user:test-password').decode()
        self.proc = None
        self.start()

    def tearDown(self):
        self.stop()
        self.temp.cleanup()

    def start(self):
        self.proc = subprocess.Popen([sys.executable, str(ROOT / 'server.py')],
                                     env=self.env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        for _ in range(100):
            if self.proc.poll() is not None:
                raise AssertionError(self.proc.stderr.read().decode())
            try:
                if self.request('GET', '/healthz')[0] == 200:
                    return
            except (OSError, http.client.HTTPException):
                time.sleep(.05)
        raise AssertionError('Server did not start')

    def stop(self):
        if self.proc is not None:
            self.proc.terminate()
            try: self.proc.wait(timeout=4)
            except subprocess.TimeoutExpired:
                self.proc.kill(); self.proc.wait(timeout=4)
            self.proc.stderr.close()
            self.proc = None

    def request(self, method, path, payload=None, auth=True, token=True):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=8)
        headers = {'Content-Type':'application/json'}
        if auth: headers['Authorization'] = self.auth
        if token: headers['X-LifeOS-Token'] = 'test-token'
        body = json.dumps(payload).encode() if payload is not None else None
        try:
            conn.request(method, path, body=body, headers=headers)
            response = conn.getresponse()
            data = response.read()
            return response.status, json.loads(data) if data else None
        finally:
            conn.close()

    def test_racing_clients_replay_restart_and_preservation(self):
        original = {'version':1,'sessions':[{'id':'existing','name':'Preserve me'}],
                    'events':[], 'todos':[{'id':'original'}], 'calendarAudit':[]}
        self.assertEqual(self.request('PUT','/api/state',{'revision':0,'data':original})[0],200)
        def attempt(i):
            entry = {'id':f'decision-{i}','at':'2026-11-08T00:00:00Z',
                     'action':'reschedule','planId':'plan-1','proposalId':f'proposal-{i}'}
            data = {**original,'events':[{'id':f'plan-{i}','source':'calendar'}]}
            return entry, data, self.request('POST','/api/calendar/commit',
                {'revision':1,'data':data,'decision':entry})
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            attempts = list(pool.map(attempt, (1,2)))
        self.assertEqual(sorted(a[2][0] for a in attempts),[200,409])
        winner = next(a for a in attempts if a[2][0]==200)
        loser = next(a for a in attempts if a[2][0]==409)
        self.assertEqual(loser[2][1]['status'],'revision_conflict')
        self.assertEqual(self.request('GET','/api/state'),(200,{'revision':2,'data':winner[1]}))
        self.assertEqual(self.request('POST','/api/calendar/commit',
            {'revision':1,'data':winner[1],'decision':winner[0]}),
            (200,{'status':'duplicate','revision':2}))
        self.stop(); self.start()
        self.assertEqual(self.request('GET','/api/state')[1]['data']['sessions'],original['sessions'])
        self.assertEqual(self.request('GET','/api/state')[1]['data']['todos'],original['todos'])
        new = {**winner[1], 'todos':original['todos']+[{'id':'later'}]}
        self.assertEqual(self.request('PUT','/api/state',{'revision':2,'data':new})[0],200)
        # Lost acknowledgement can still be identified by its original decision ID.
        status, result = self.request('POST','/api/calendar/commit',
            {'revision':1,'data':winner[1],'decision':winner[0]})
        self.assertEqual((status,result['status'],result['revision']),(200,'duplicate',3))
        self.assertEqual(self.request('GET','/api/state')[1]['data'],new)
        self.assertEqual(self.request('POST','/api/calendar/commit',
            {'revision':3,'data':new,'decision':{**winner[0],'action':'skip'}})[1]['status'],
            'decision_conflict')
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM calendar_audit').fetchone()[0],1)

    def test_auth_and_invalid_payload_leave_no_data(self):
        payload={'revision':0,'data':{'version':1,'sessions':[],'events':[]},
                 'decision':{'id':'x','at':'2026-11-08T00:00:00Z',
                             'action':'reschedule','planId':'p','proposalId':'q'}}
        self.assertEqual(self.request('POST','/api/calendar/commit',payload,auth=False)[0],401)
        self.assertEqual(self.request('POST','/api/calendar/commit',payload,token=False)[0],401)
        self.assertEqual(self.request('POST','/api/calendar/commit',{**payload,'data':{} })[0],400)
        self.assertEqual(self.request('GET','/api/state'),(200,{'revision':0,'data':None}))

if __name__ == '__main__': unittest.main()
