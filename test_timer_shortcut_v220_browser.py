"""V220 browser test: explicit notification opt-in, status refresh and removal.
Mocks browser notification delivery; cannot verify Android lock-screen behavior.
"""
import http.server
import pathlib
import socketserver
import threading
import unittest
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
class TimerNotificationBrowser(unittest.TestCase):
 def test_opt_in_notification_and_remove(self):
  with socketserver.TCPServer(('127.0.0.1',0),Handler) as server:
   threading.Thread(target=server.serve_forever,daemon=True).start()
   with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    try:
     page=browser.new_page(viewport={'width':390,'height':844})
     page.add_init_script("""() => {
       window.__notifications=[];
       class FakeNotification{}
       FakeNotification.permission='granted';
       FakeNotification.requestPermission=async()=> 'granted';
       Object.defineProperty(window,'Notification',{configurable:true,value:FakeNotification});
       const reg={
         showNotification:async(title,options)=>{
           window.__notifications.push({title,options});
         },
         getNotifications:async()=>window.__notifications.slice(-1).map(n=>({
           tag:n.options.tag,close:()=>window.__notifications.push({closed:true})
         }))
       };
       Object.defineProperty(navigator,'serviceWorker',{configurable:true,
         value:{register:async()=>reg}});
     }""")
     errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/index.html',wait_until='load',timeout=45000)
     page.locator('#lifeosNavigation button[data-view="tracking"]').click()
     panel=page.locator('#lo220-phone-shortcut')
     self.assertEqual(panel.count(),1)
     panel.locator('summary').click()
     panel.locator('#lo220-pin').click()
     self.assertIn('Start or resume',panel.locator('#lo220-status').inner_text())
     self.assertEqual(page.evaluate('window.__notifications.length'),0)
     page.locator('#quick button[data-name="Work"]').click()
     panel.locator('#lo220-pin').click()
     page.wait_for_function('() => window.__notifications.length===1',timeout=5000)
     n=page.evaluate('window.__notifications[0]')
     self.assertIn('Work',n['title'])
     self.assertEqual(n['options']['tag'],'lifeos-v220-timer')
     self.assertTrue(n['options']['requireInteraction'])
     self.assertTrue(page.evaluate("JSON.parse(localStorage.getItem('lifeos.personal.timer-shortcut.v220'))"))
     panel.locator('#lo220-clear').click()
     page.wait_for_function('() => window.__notifications.some(n=>n.closed)',timeout=5000)
     self.assertFalse(page.evaluate("JSON.parse(localStorage.getItem('lifeos.personal.timer-shortcut.v220'))"))
     self.assertEqual(errors,[])
     print('V220 browser opt-in, status shortcut and removal PASS')
    finally:browser.close()
if __name__=='__main__':unittest.main()
