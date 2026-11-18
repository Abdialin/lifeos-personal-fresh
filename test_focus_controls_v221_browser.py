"""V221 browser focus control and alert review tests. Synthetic state only.
Sound and vibration simulated: cannot prove actual speaker/haptic hardware.
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
class FocusControls(unittest.TestCase):
 def test_pause_break_resume_reload_and_alarm_controls(self):
  with socketserver.TCPServer(('127.0.0.1',0),Handler) as server:
   threading.Thread(target=server.serve_forever,daemon=True).start()
   with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    try:
     page=browser.new_page(viewport={'width':390,'height':844})
     page.add_init_script("""(() => {
       window.__vibrateRequests=[];
       Object.defineProperty(navigator,'vibrate',{configurable:true,value:(x)=>{window.__vibrateRequests.push(x);return true;}});
     })()""")
     errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     url=f'http://127.0.0.1:{server.server_address[1]}/index.html'
     page.goto(url,wait_until='load',timeout=45000)
     page.locator('#lifeosNavigation button[data-view="tracking"]').click()
     panel=page.locator('#lo207-focus')
     panel.locator('summary').click()
     self.assertTrue(page.locator('#lo221-test').is_visible())
     page.locator('#lo221-volume').fill('85')
     page.locator('#lo221-repeat').select_option('10')
     page.locator('#lo221-test').click()
     self.assertGreaterEqual(page.evaluate('window.__vibrateRequests.length'),1)
     self.assertIn('Test:',page.locator('#lo207-focus-status').inner_text())
     page.locator('#lo207-focus-minutes').fill('5')
     page.locator('#lo207-start-focus').click()
     self.assertTrue(page.locator('#lo207-focus-layer').is_visible())
     state=lambda:page.evaluate("JSON.parse(localStorage.getItem('lifeos.personal.focus.v207'))")
     self.assertEqual(state()['mode'],'running')
     page.locator('#lo221-layer-pause').click()
     paused=state();self.assertEqual(paused['mode'],'paused')
     page.wait_for_timeout(400)
     self.assertEqual(state()['remainingMs'],paused['remainingMs'])
     page.locator('#lo221-layer-break').click()
     self.assertEqual(state()['mode'],'break')
     page.wait_for_timeout(240)
     page.locator('#lo221-layer-break').click()
     resumed=state()
     self.assertEqual(resumed['mode'],'running')
     self.assertGreater(resumed['breakMs'],0)
     page.locator('#lo207-hide-focus').click()
     page.reload(wait_until='load',timeout=45000)
     self.assertEqual(state()['mode'],'running')
     page.locator('#lifeosNavigation button[data-view="tracking"]').click()
     page.locator('#lo207-focus summary').click()
     page.locator('#lo221-open').click()
     self.assertTrue(page.locator('#lo207-focus-layer').is_visible())
     # Simulate expiration in a synthetic local workspace without waiting 5 min.
     page.evaluate("""() => {
       const key='lifeos.personal.focus.v207';
       const a=JSON.parse(localStorage.getItem(key));a.end=Date.now()-1000;
       localStorage.setItem(key,JSON.stringify(a));window.dispatchEvent(new Event('focus'));
     }""")
     page.locator('#lo221-alert-layer').wait_for(state='visible',timeout=5000)
     self.assertIn('Alarm reached',page.locator('#lo221-alert-layer').inner_text())
     page.locator('#lo221-snooze').click()
     self.assertEqual(state()['kind'],'alarm')
     self.assertEqual(state()['mode'],'running')
     page.locator('#lo221-end').click()
     self.assertIsNone(state())
     self.assertEqual(errors,[])
     print('V221 focus modes, break accounting, persistence, alarm snooze and haptic requests PASS')
    finally:browser.close()
if __name__=='__main__':unittest.main()
