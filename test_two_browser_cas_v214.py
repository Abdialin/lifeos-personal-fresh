"""LifeOS V214 — isolated two-browser CAS and reviewed convergence.
Uses only temporary SQLite and synthetic activities. No Render or private account access.
Tests the real HTTP API from separate Chromium browser contexts; does not claim
that the app's full UI reconciliation workflow or Android devices are verified.
"""
import json
import os
import pathlib
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
import unittest
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parent
TOKEN='v214-isolated-test-token-not-real'
USER='lifeos-v214-test'
PASSWORD='test-password'
def port_number():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0))
        return sock.getsockname()[1]

class TwoBrowserCAS(unittest.TestCase):
    def test_competing_browser_writes_preserve_both_records(self):
        with tempfile.TemporaryDirectory(prefix='lifeos-v214-') as temp:
            port=port_number()
            env=dict(os.environ,PORT=str(port),LIFEOS_DB=str(pathlib.Path(temp)/'test.sqlite3'),
                LIFEOS_TOKEN=TOKEN,LIFEOS_USERNAME=USER,LIFEOS_PASSWORD=PASSWORD,
                LIFEOS_ACCOUNT_API_ENABLED='0')
            env.pop('LIFEOS_DATABASE_URL',None)
            process=subprocess.Popen([sys.executable,str(ROOT/'server.py')],cwd=str(ROOT),env=env,
                stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            try:
                url=f'http://127.0.0.1:{port}'
                for _ in range(80):
                    if process.poll() is not None:raise AssertionError('Isolated test backend stopped')
                    try:
                        with urllib.request.urlopen(url+'/healthz',timeout=.5) as reply:
                            if reply.status==200:break
                    except Exception:time.sleep(.1)
                else:raise AssertionError('Isolated test backend did not start')
                with sync_playwright() as driver:
                    browser=driver.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
                    try:
                        contexts=[browser.new_context(http_credentials={'username':USER,'password':PASSWORD}) for _ in range(2)]
                        pages=[c.new_page() for c in contexts]
                        for page in pages:page.goto(url+'/index.html',wait_until='load',timeout=40000)
                        import base64
                        basic=base64.b64encode((USER+':'+PASSWORD).encode()).decode()
                        def call(context,method,payload=None):
                            # Browser-context HTTP client with explicit private-server auth.
                            headers={'Authorization':'Basic '+basic,'X-LifeOS-Token':TOKEN}
                            if payload is not None:headers['Content-Type']='application/json'
                            response=context.request.fetch(url+'/api/state',method=method,
                                headers=headers,data=json.dumps(payload) if payload is not None else None,
                                timeout=15000)
                            return {'status':response.status,'response':response.json()}
                        initial=[call(c,'GET') for c in contexts]
                        self.assertTrue(all(x['status']==200 and x['response']['revision']==0 for x in initial))
                        base={'version':1,'sessions':[],'events':[],'schedule':[],'todos':[],
                              'workouts':[],'meals':[],'goals':[],'personalLogs':[],
                              'bodyMetrics':[],'waterIntake':[],'mealTemplates':[],
                              'habitDefinitions':[],'habitChecks':[],'friendShares':[],
                              'idealRoutines':[],'nutritionSettings':{}}
                        def record(ident):
                            return {'id':ident,'name':'Synthetic '+ident,'status':'finished',
                              'startAt':1000,'endAt':61000,'segments':[{'start':1000,'end':61000}]}
                        first_data=json.loads(json.dumps(base));first_data['sessions']=[record('device-A')]
                        second_data=json.loads(json.dumps(base));second_data['sessions']=[record('device-B')]
                        first=call(contexts[0],'PUT',{'revision':0,'data':first_data})
                        second=call(contexts[1],'PUT',{'revision':0,'data':second_data})
                        self.assertEqual(first['status'],200,first)
                        self.assertEqual(second['status'],409,second)
                        self.assertEqual(second['response']['revision'],1)
                        unchanged=call(contexts[1],'GET')
                        self.assertEqual(unchanged['response']['revision'],1)
                        self.assertEqual([x['id'] for x in unchanged['response']['data']['sessions']],['device-A'])
                        # Review independent additions using the same pure reconciliation code as LifeOS.
                        # Load the production conflict-analysis module into the isolated
                        # browser even when the private backend serves a login gate.
                        # The private login gate has CSP default-src none; evaluate
                        # the production pure module in a blank, isolated page instead.
                        pages[1].goto('about:blank')
                        pages[1].add_script_tag(content=(ROOT/'personal_conflict_plan_v212.js').read_text())
                        report=pages[1].evaluate("""({local,remote}) => {
                          const summary=window.LifeOSConflictPlanV212.inspect(local,remote,1,0);
                          return {reason:summary.reason,
                            localOnly:summary.summary.localOnly,
                            serverOnly:summary.summary.serverOnly,
                            conflicts:summary.summary.modified};
                        }""",{'local':second_data,'remote':unchanged['response']['data']})
                        self.assertEqual(report['localOnly'],1)
                        self.assertEqual(report['serverOnly'],1)
                        self.assertEqual(report['conflicts'],0)
                        # No auto-merge: test explicitly creates a synthetic reviewed combination.
                        reviewed=json.loads(json.dumps(unchanged['response']['data']))
                        reviewed['sessions'].append(record('device-B'))
                        commit=call(contexts[1],'PUT',{'revision':1,'data':reviewed})
                        self.assertEqual(commit['status'],200,commit)
                        self.assertEqual(commit['response']['revision'],2)
                        both=[call(c,'GET') for c in contexts]
                        self.assertTrue(all(x['response']['revision']==2 for x in both))
                        for snapshot in both:
                            self.assertEqual({x['id'] for x in snapshot['response']['data']['sessions']},
                                             {'device-A','device-B'})
                        # A disconnected writer cannot replace the reviewed state using revision 1.
                        stale=call(contexts[0],'PUT',{'revision':1,'data':first_data})
                        self.assertEqual(stale['status'],409)
                        latest=call(contexts[0],'GET')
                        self.assertEqual({x['id'] for x in latest['response']['data']['sessions']},
                                         {'device-A','device-B'})
                        print('V214 real two-browser HTTP CAS, rejected stale write, reviewed convergence: PASS')
                    finally:
                        for context in contexts:context.close()
                        browser.close()
            finally:
                process.terminate()
                try:process.wait(timeout=5)
                except subprocess.TimeoutExpired:process.kill();process.wait(timeout=5)

if __name__=='__main__':
    unittest.main()
