"""V221 browser focus control and alert review tests. Synthetic state only.
Sound and vibration simulated: cannot prove actual speaker/haptic hardware.
"""
import http.server
import os
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
     page.get_by_role('button',name='Open app settings and actions').click()
     page.locator('#lo14SettingsButton').click()
     page.locator('#lo254-alarm-settings > summary').click()
     self.assertTrue(page.locator('#lo221-test').is_visible())
     page.locator('#lo221-volume').fill('85')
     page.locator('#lo221-repeat').select_option('10')
     page.locator('#lo221-test').click()
     self.assertGreaterEqual(page.evaluate('window.__vibrateRequests.length'),1)
     self.assertIn('Test:',page.locator('#lo207-focus-status').text_content())
     page.locator('#lifeosNavigation button[data-view="tracking"]').click()
     page.locator('#caLive [data-ca-sheet="focus"]').click()
     page.locator('#caFocusDuration').select_option('25')
     page.locator('#loCADialog [data-ca-focus-start]').click()
     page.locator('#caFocusLiveClock').wait_for(state='visible')
     state=lambda:page.evaluate("JSON.parse(localStorage.getItem('lifeos.personal.focus.v207'))")
     self.assertEqual(state()['mode'],'running')
     page.locator('#caFocusPause').click()
     paused=state();self.assertEqual(paused['mode'],'paused')
     page.wait_for_timeout(400)
     self.assertEqual(state()['remainingMs'],paused['remainingMs'])
     page.locator('#caFocusPause').click()
     self.assertEqual(state()['mode'],'running')
     page.locator('#caFocusBreak').click()
     self.assertEqual(state()['mode'],'break')
     page.wait_for_timeout(240)
     page.locator('#caFocusBreak').click()
     resumed=state()
     self.assertEqual(resumed['mode'],'running')
     self.assertGreater(resumed['breakMs'],0)
     self.assertGreater(resumed['pauseMs'],0)
     self.assertIn('running',page.locator('#caFocusLiveStatus').inner_text().lower())
     page.locator('#loCADialog [data-ca-close]').last.click()
     page.reload(wait_until='load',timeout=45000)
     self.assertEqual(state()['mode'],'running')
     page.locator('#lifeosNavigation button[data-view="tracking"]').click()
     page.locator('#caLive [data-ca-sheet="focus"]').click()
     self.assertTrue(page.locator('#caFocusLiveClock').is_visible())
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
     page.locator('#loCADialog').wait_for(state='hidden')
     page.locator('#caLive [data-ca-sheet="focus"]').click()
     self.assertTrue(page.locator('#loCADialog [data-ca-stop-alarm]').is_visible())
     for size in ({'width':360,'height':650},{'width':393,'height':460},{'width':412,'height':780}):
      page.set_viewport_size(size)
      button=page.locator('#loCADialog [data-ca-stop-alarm]')
      button.scroll_into_view_if_needed()
      rect=button.bounding_box()
      self.assertGreaterEqual(rect['height'],44)
      self.assertGreaterEqual(rect['y'],0)
      self.assertLessEqual(rect['y']+rect['height'],size['height']+1)
     page.set_viewport_size({'width':390,'height':844})
     page.locator('#loCADialog .ca-sheet').evaluate('(sheet) => {sheet.scrollTop=0}')
     if os.environ.get('TRACK_ALARM_CAPTURE'):
      page.screenshot(path='docs/design/track/current/v1-focus-snoozed-alarm.png')
     page.evaluate("() => document.querySelector('.lifeos-theme-toggle').click()")
     contrast=page.evaluate("""() => {const rgb=s=>s.match(/[\\d.]+/g).slice(0,3).map(Number),
       lum=c=>{const v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4},
       l=c=>.2126*lum(c[0])+.7152*lum(c[1])+.0722*lum(c[2]),
       a=l(rgb(getComputedStyle(document.querySelector('#loCADialog .ca-focus-hero h3')).color)),
       b=l(rgb(getComputedStyle(document.querySelector('#loCADialog .ca-focus-hero')).backgroundColor));
       return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}""")
     self.assertGreaterEqual(contrast,4.5,'Light-mode alarm title needs readable contrast')
     if os.environ.get('TRACK_ALARM_CAPTURE'):
      page.screenshot(path='docs/design/track/current/v1-focus-snoozed-alarm-light.png')
     page.evaluate("() => document.querySelector('.lifeos-theme-toggle').click()")
     page.evaluate("""() => { const key='lifeos.personal.focus.v207',s=JSON.parse(localStorage.getItem(key));
       s.end+=1000;localStorage.setItem(key,JSON.stringify(s)); }""")
     changed=state()
     page.locator('#loCADialog [data-ca-stop-alarm]').click()
     self.assertIn('changed',page.locator('#caSnoozedAlarmError').inner_text())
     self.assertEqual(state(),changed,'An intervening alarm change must not be overwritten')
     page.locator('#loCADialog [data-ca-close]').last.click()
     page.locator('#caLive [data-ca-sheet="focus"]').click()
     page.evaluate("""() => { window.__originalRemove=Storage.prototype.removeItem;
       Storage.prototype.removeItem=function(key){if(key==='lifeos.personal.focus.v207')throw new Error('synthetic storage failure');return window.__originalRemove.call(this,key)}; }""")
     page.locator('#loCADialog [data-ca-stop-alarm]').click()
     self.assertIn('remains active',page.locator('#caSnoozedAlarmError').inner_text())
     self.assertEqual(state(),changed,'A failed save must preserve the snoozed alarm')
     page.evaluate('() => {Storage.prototype.removeItem=window.__originalRemove;delete window.__originalRemove}')
     page.locator('#loCADialog [data-ca-stop-alarm]').click()
     self.assertIsNone(state())
     page.evaluate("""() => {const now=Date.now();localStorage.setItem('lifeos.personal.focus.v207',JSON.stringify({
       label:'Synthetic alarm',kind:'alarm',mode:'running',end:now+60000,remainingMs:60000,modeAt:now,startedAt:now,plannedMs:0,breakMs:0,pauseMs:0
     }));window.dispatchEvent(new Event('lifeos-v221-focus-changed'));}""")
     page.locator('#caLive [data-ca-sheet="focus"]').click()
     self.assertIn('Active alarm',page.locator('#loCADialog').inner_text())
     self.assertNotIn('Snoozed alarm',page.locator('#loCADialog').inner_text())
     page.locator('#loCADialog [data-ca-stop-alarm]').click()
     self.assertIsNone(state())
     self.assertEqual(errors,[])
     print('V221 focus modes, break accounting, persistence, alarm snooze and haptic requests PASS')
    finally:browser.close()
if __name__=='__main__':unittest.main()
