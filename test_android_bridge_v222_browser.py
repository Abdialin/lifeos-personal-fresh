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
     self.assertTrue(all(set(x.keys()).issubset({'kind','id','name','status','elapsedMs','endMs'}) for x in states))
     page.locator('#lo86-toggle').click()
     page.locator('#lo86-details [data-lo86="pause"]').click()
     page.wait_for_function("() => window.__nativeMessages.some(x=>x.kind==='timer-status'&&x.status==='paused'&&x.name==='Work')",timeout=6000)
     page.locator('#lo207-focus summary').click()
     page.locator('#lo207-focus-minutes').fill('5')
     page.locator('#lo207-start-focus').click()
     page.wait_for_function("() => window.__nativeMessages.some(x=>x.kind==='alarm-status'&&x.status==='scheduled'&&x.endMs>Date.now())",timeout=6000)
     page.locator('#lo221-layer-break').click()
     page.wait_for_function("() => window.__nativeMessages.some(x=>x.kind==='alarm-status'&&x.status==='cancelled')",timeout=6000)
     page.locator('#lo207-cancel-focus').click()
     self.assertEqual(errors,[])
     print('V222 minimal native bridge messages with tracking + focus changes PASS')
    finally:browser.close()

if __name__=='__main__':unittest.main()
