"""V216 actual LifeOS browser offline/reconnect queue and conflict regression.
Uses in-process synthetic state and browser route interception. No Render data.
"""
import contextlib
import http.server
import json
import pathlib
import socketserver
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parent
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):pass

class OfflineReconnect(unittest.TestCase):
    def test_real_ui_queue_reconnect_and_stale_remote_conflict(self):
        with socketserver.TCPServer(('127.0.0.1',0),Handler) as server:
            threading.Thread(target=server.serve_forever,daemon=True).start()
            with sync_playwright() as driver:
                browser=driver.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
                try:
                    context=browser.new_context(viewport={'width':390,'height':844})
                    page=context.new_page()
                    remote={'revision':0,'data':None}
                    mode={'offline':True,'writes':0}
                    def respond(route):
                        if mode['offline']:
                            route.abort('failed');return
                        method=route.request.method
                        if method=='GET':
                            route.fulfill(status=200,content_type='application/json',body=json.dumps(remote));return
                        if method=='PUT':
                            payload=route.request.post_data_json
                            if payload['revision']!=remote['revision']:
                                route.fulfill(status=409,content_type='application/json',
                                    body=json.dumps({'revision':remote['revision'],'error':'Conflict: server data has changed'}));return
                            remote['revision']+=1
                            remote['data']=payload['data'];mode['writes']+=1
                            route.fulfill(status=200,content_type='application/json',
                                body=json.dumps({'revision':remote['revision']}));return
                        route.abort('failed')
                    page.route('**/api/state',respond)
                    page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/index.html',wait_until='load',timeout=45000)
                    page.locator('#lifeosNavigation button[data-view="tracking"]').click()
                    page.locator('#caLive [data-ca-quick-start="Work"]').click()
                    def atomic():
                        return page.evaluate("""() => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic'))""")
                    first=atomic()
                    self.assertGreaterEqual(len(first['journal']),1)
                    ids=[s['id'] for s in first['workspace']['sessions'] if s['name']=='Work']
                    self.assertEqual(len(ids),1)
                    # Explicitly attempt a connection while offline.
                    page.locator('#syncToken').evaluate("""el => {
                      el.value='synthetic-token-not-real';
                      el.dispatchEvent(new Event('input',{bubbles:true}));
                    }""")
                    page.locator('#connectSync').evaluate('(button) => button.click()')
                    page.wait_for_function("() => document.querySelector('#syncStatus')?.textContent.includes('Could not connect')",timeout=7000)
                    self.assertEqual(mode['writes'],0)
                    self.assertEqual(len(atomic()['journal']),len(first['journal']))
                    # Restore network and let the actual app replay its durable queue.
                    mode['offline']=False
                    page.locator('#connectSync').evaluate('(button) => button.click()')
                    page.wait_for_function("""() => {
                      const a=JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic'));
                      return a?.journal?.length===0&&a?.meta?.revision>0
                    }""",timeout=15000)
                    self.assertIn(ids[0],[s['id'] for s in remote['data']['sessions']])
                    self.assertGreater(mode['writes'],0)
                    # Make a new local session while disconnected, then simulate another
                    # device updating the server before local reconnection.
                    previous=remote['revision']
                    mode['offline']=True
                    page.locator('#caLive [data-ca-sheet="start"]').first.click()
                    page.locator('#caCustomName').fill('Shopping')
                    page.locator('#loCADialog [data-ca-custom-start]').click()
                    queued=atomic();self.assertGreaterEqual(len(queued['journal']),1)
                    self.assertTrue(any(s['name']=='Shopping' for s in queued['workspace']['sessions']))
                    server_copy=json.loads(json.dumps(remote['data']))
                    server_copy['sessions'].append({'id':'synthetic-other-device','name':'Remote Work',
                         'status':'finished','startAt':1000,'endAt':61000,
                         'segments':[{'start':1000,'end':61000}]})
                    remote.update(revision=previous+1,data=server_copy)
                    mode['offline']=False
                    page.locator('#connectSync').evaluate('(button) => button.click()')
                    page.wait_for_function("() => document.querySelector('#syncStatus')?.textContent.includes('SYNC CONFLICT')",timeout=9000)
                    after=atomic()
                    self.assertGreaterEqual(len(after['journal']),1,'Offline local changes must remain queued')
                    self.assertTrue(any(s['name']=='Shopping' for s in after['workspace']['sessions']))
                    self.assertIn('synthetic-other-device',[s['id'] for s in remote['data']['sessions']])
                    self.assertFalse(any(s['name']=='Shopping' for s in remote['data']['sessions']))
                    self.assertEqual(remote['revision'],previous+1,'Stale device must not overwrite server')
                    # Confirm persistence of the unsent operation across page refresh.
                    page.reload(wait_until='load',timeout=45000)
                    final=atomic()
                    self.assertEqual(len(final['journal']),len(after['journal']))
                    self.assertTrue(any(s['name']=='Shopping' for s in final['workspace']['sessions']))
                    print('V216 actual app: offline queue, replay, stale server rejection and reload preservation PASS')
                finally:
                    with contextlib.suppress(Exception):context.close()
                    browser.close()
if __name__=='__main__':unittest.main()
