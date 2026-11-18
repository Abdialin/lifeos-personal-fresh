"""V222 browser regression: only minimal timer and focus data reaches native bridge.
Synthetic storage and mocked native receiver; no real Android hardware.
"""
import http.server
import pathlib
import socketserver
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parent
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass

class NativeBridgeBrowser(unittest.TestCase):
 def test_minimal_activity_and_focus_state(self):
  with socketserver.TCPServer(('127.0.0.1',0),Handler) as server:
   threading.Thread(target=server.serve_forever,daemon=True).start()
   with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    try:
     page=browser.new_page(viewport={'width':390,'height':844})
     page.add_init_script("""(() => {
       window.__nativeMessages=[];
       window.LifeOSNative={postMessage:x=>window.__nativeMessages.push(JSON.parse(x))};
     })()""")
     errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     page.goto(f'http://127.0.0.1:{server.server_address[1]}/index.html',wait_until='load',timeout=45000)
     page.locator('#lifeosNavigation button[data-view="tracking"]').click()
     page.locator('#quick button[data-name="Work"]').click()
     page.wait_for_function("() => window.__nativeMessages.some(x=>x.kind==='timer-status'&&x.status==='running'&&x.name==='Work')",timeout=6000)
     states=page.evaluate('window.__nativeMessages')
     self.assertFalse(any('syncToken' in x or 'workspace' in x or 'email' in x for x in states))
     self.assertTrue(all(set(x.keys()).issubset({'kind','id','name','status','elapsedMs','endMs','activeCount'}) for x in states))
     self.assertTrue(any(x.get('activeCount',0)>=1 for x in states if x['kind']=='timer-status' and x.get('status')=='running'))
     # Exercise real authoritative pause/resume handler through the native bridge.
     session_id=page.evaluate("""() => String(window.lifeosReadOnlyWorkspace().sessions.find(
       x=>x.name==='Work'&&x.status==='running').id)""")
     self.assertTrue(page.evaluate("(id) => window.LifeOSAndroidBridgeV222.nativeTimerAction(id,'pause')",session_id))
     self.assertFalse(page.evaluate("(id) => window.LifeOSAndroidBridgeV222.nativeTimerAction(id,'pause')",session_id))
     self.assertEqual(page.evaluate("(id) => window.lifeosReadOnlyWorkspace().sessions.find(x=>String(x.id)===id).status",session_id),'paused')
     self.assertTrue(page.evaluate("(id) => window.LifeOSAndroidBridgeV222.nativeTimerAction(id,'resume')",session_id))
     self.assertEqual(page.evaluate("(id) => window.lifeosReadOnlyWorkspace().sessions.find(x=>String(x.id)===id).status",session_id),'running')
     page.locator('#lo86-toggle').click()
     page.locator('#lo86-details [data-lo86="pause"]').click()
     page.wait_for_function("() => window.__nativeMessages.some(x=>x.kind==='timer-status'&&x.status==='paused'&&x.name==='Work')",timeout=6000)
     page.locator('#lo207-focus summary').click()
     page.locator('#lo227-native-test').click()
     page.wait_for_function("() => window.__nativeMessages.some(x=>x.kind==='alarm-test')",timeout=6000)
     page.locator('#lo230-diagnostics').click()
     page.wait_for_function("() => window.__nativeMessages.some(x=>x.kind==='settings-request'&&x.target==='diagnostics')",timeout=6000)
     page.locator('#lo207-focus-minutes').fill('5')
     page.locator('#lo207-start-focus').click()
     page.wait_for_function("() => window.__nativeMessages.some(x=>x.kind==='alarm-status'&&x.status==='scheduled'&&x.endMs>Date.now())",timeout=6000)
     page.locator('#lo221-layer-break').click()
     page.wait_for_function("() => window.__nativeMessages.some(x=>x.kind==='alarm-status'&&x.status==='cancelled')",timeout=6000)
     page.locator('#lo207-cancel-focus').click()
     # Native snooze must resume only an expired/ringing focus alarm.
     result=page.evaluate("""() => {
       const key='lifeos.personal.focus.v207',now=Date.now();
       localStorage.setItem(key,JSON.stringify({
         label:'Study',kind:'focus',mode:'ringing',end:now-2000,
         remainingMs:0,modeAt:now-2000,breakMs:0
       }));
       const until=now+5*60000;
       const ok=window.LifeOSNativeFocusSync.applyNativeSnooze(until);
       const newState=JSON.parse(localStorage.getItem(key));
       const ignored=window.LifeOSNativeFocusSync.applyNativeSnooze(until+1000);
       return {ok,ignored,kind:newState.kind,mode:newState.mode,end:newState.end};
     }""")
     self.assertTrue(result['ok'])
     self.assertFalse(result['ignored'])
     self.assertEqual(result['mode'],'running')
     self.assertEqual(result['kind'],'alarm')
     page.evaluate("""() => {
       localStorage.setItem('lifeos.personal.focus.v207',JSON.stringify({
         label:'Study',kind:'alarm',mode:'ringing',end:Date.now()-1000
       }));
       window.dispatchEvent(new Event('lifeos-v221-focus-changed'));
     }""")
     page.wait_for_function("() => window.__nativeMessages.some(x=>x.kind==='alarm-status'&&x.status==='ringing')",timeout=6000)
     self.assertEqual(errors,[])
     print('V222 minimal native bridge messages with tracking + focus changes PASS')
    finally:browser.close()

if __name__=='__main__':unittest.main()
