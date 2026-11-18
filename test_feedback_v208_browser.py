"""V208 isolated browser interaction checks for feedback features; no personal account data."""
import http.server
import socketserver
import threading
import unittest
from playwright.sync_api import sync_playwright

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory='.',**kwargs)
    def log_message(self,*args):pass

class FeedbackBrowser(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=socketserver.TCPServer(('127.0.0.1',0),Handler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()
        cls.p=sync_playwright().start()
        cls.browser=cls.p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        cls.page=cls.browser.new_page(viewport={'width':390,'height':844})
        cls.errors=[]
        cls.page.on('pageerror',lambda e:cls.errors.append(str(e)))
        cls.page.goto('http://127.0.0.1:'+str(cls.server.server_address[1])+'/index.html',wait_until='load',timeout=45000)
    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.p.stop();cls.server.shutdown();cls.server.server_close()
    def test_work_break_resume_and_history(self):
        p=self.page
        p.locator('#lifeosNavigation button[data-view="tracking"]').click()
        work=p.locator('#quick button[data-name="Work"]')
        self.assertEqual(work.count(),1)
        work.click()
        p.locator('#lo86-toggle').click()
        p.locator('#lo86-details [data-lo86="break"]').click()
        state=p.evaluate('JSON.parse(localStorage.getItem("lifeos-live-v1"))')
        sessions=[s for s in state['sessions'] if s['name']=='Work']
        self.assertEqual(len(sessions),1)
        sid=sessions[0]['id']
        self.assertEqual(sessions[0]['status'],'paused')
        self.assertTrue(any(e.get('sessionId')==sid and e.get('type')=='BREAK_START' for e in state['events']))
        p.locator('#lo86-details [data-lo86="pause"]').click()
        p.once('dialog',lambda d:d.accept())
        p.locator('#lo86-details [data-lo86="finish"]').click()
        state=p.evaluate('JSON.parse(localStorage.getItem("lifeos-live-v1"))')
        final=next(s for s in state['sessions'] if s['id']==sid)
        self.assertEqual(final['status'],'finished')
        self.assertTrue(any(e.get('sessionId')==sid and e.get('type')=='BREAK_END' for e in state['events']))
        self.assertEqual(len(final['segments']),2)
        p.reload(wait_until='load',timeout=45000)
        stored=p.evaluate('JSON.parse(localStorage.getItem("lifeos-live-v1"))')
        recovered=next((x for x in stored['sessions'] if x['id']==sid),None)
        self.assertIsNotNone(recovered,'Finished timer should remain in local storage after reload')
        self.assertEqual(recovered['status'],'finished')
        self.assertEqual(len(recovered['segments']),2)
    def test_focus_and_gap_tools_mount(self):
        p=self.page
        p.locator('#lifeosNavigation button[data-view="tracking"]').click()
        self.assertEqual(p.locator('#lo207-focus').count(),1)
        self.assertEqual(p.locator('#lo207-gap-review').count(),1)
        self.assertEqual(p.locator('#quick button[data-name="Shopping"]').count(),1)
        p.locator('#lo207-focus > summary').click()
        self.assertTrue(p.locator('#lo207-start-focus').is_visible())
    def test_weekly_averages_no_page_errors(self):
        p=self.page
        p.locator('#lifeosNavigation button[data-view="analytics"]').click()
        p.locator('#lo208-weekly-averages').wait_for(state='visible',timeout=6000)
        p.locator('#lo208-weekly-averages .lo208-day').first.wait_for(state='visible',timeout=6000)
        self.assertEqual(p.locator('#lo208-weekly-averages .lo208-day').count(),7)
        self.assertEqual(p.locator('#lo208-weekly-averages .lo208-kpi').count(),4)
        p.locator('#lo209-activity-insights').wait_for(state='visible',timeout=6000)
        self.assertEqual(p.locator('#lo209-activity-insights .lo209-picker button').count(),6)
        p.locator('#lo209-activity-insights .lo209-picker button[data-kind="quran"]').click()
        self.assertEqual(p.locator('#lo209-activity-insights .lo209-day').count(),7)
        self.assertEqual(p.locator('#lo209-activity-insights button[data-kind="quran"]').get_attribute('aria-pressed'),'true')
        self.assertEqual(self.errors,[])

if __name__=='__main__':unittest.main()
