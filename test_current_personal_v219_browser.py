"""LifeOS V219 — current six-section responsive end-to-end interaction suite.
Tests actual current navigation and panel visibility in isolated Chromium contexts.
Historic v4 UI tests remain separate for diagnosis, never asserted as passed.
"""
import contextlib
import http.server
from pathlib import Path
import socketserver
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):pass

class CurrentLifeOS(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=socketserver.TCPServer(('127.0.0.1',0),Handler)
        threading.Thread(target=cls.server.serve_forever,daemon=True).start()
        cls.p=sync_playwright().start()
        cls.browser=cls.p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        cls.url=f'http://127.0.0.1:{cls.server.server_address[1]}/index.html'
    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.p.stop();cls.server.shutdown();cls.server.server_close()
    def new_page(self,width=390,height=844):
        context=self.browser.new_context(viewport={'width':width,'height':height})
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(self.url,wait_until='load',timeout=45000)
        self.addCleanup(context.close)
        return page,errors
    def view(self,page,name):
        page.locator(f'#lifeosNavigation button[data-view="{name}"]').click()
        page.wait_for_function('(name) => document.body.dataset.lifeosView===name',arg=name,timeout=7000)
        self.assertEqual(page.locator('#lifeosNavigation button[data-view][aria-current="page"]').count(),1)
    def test_six_navigation_views_at_mobile_tablet_desktop_widths(self):
        expected={'dashboard':'Today','tracking':'Activity tracking',
                  'schedule':'Smart schedule','goals':'Goals & tasks',
                  'analytics':'Insights & trends','life':'My Life'}
        for width in (360,390,768,1280):
            with self.subTest(width=width):
                p,errors=self.new_page(width,850)
                self.assertEqual(p.locator('#lifeosNavigation button[data-view]').count(),6)
                for key,title in expected.items():
                    self.view(p,key)
                    self.assertEqual(p.locator('#lifeosViewTitle').inner_text().strip(),title)
                    self.assertEqual(p.locator('#lifeosNavigation button[data-view][aria-current="page"]').get_attribute('data-view'),key)
                    self.assertTrue(p.locator('#lo200-unified').is_visible(), 'Current unified navigation must be visible')
                    self.assertTrue(p.evaluate('document.documentElement.scrollWidth <= innerWidth+4'),'Horizontal overflow at '+str(width)+'px in '+key)
                self.assertEqual(errors,[],f'Unexpected JS errors at {width}px')
    def test_track_quick_start_visible_timer_and_persistence(self):
        p,errors=self.new_page()
        self.view(p,'tracking')
        for category in ('Work','Shopping','Travel / Commuting','Getting Ready'):
            self.assertEqual(p.locator('#quick button[data-name="'+category+'"]').count(),1)
        p.locator('#quick button[data-name="Work"]').click()
        p.locator('#lo86-toggle').click()
        p.locator('#lo86-details [data-lo86="break"]').click()
        w=p.evaluate('JSON.parse(localStorage.getItem("lifeos-live-v1"))')
        activity=next(s for s in w['sessions'] if s['name']=='Work')
        self.assertEqual(activity['status'],'paused')
        p.locator('#lo86-details [data-lo86="pause"]').click()
        p.once('dialog',lambda d:d.accept())
        p.locator('#lo86-details [data-lo86="finish"]').click()
        p.reload(wait_until='load',timeout=45000)
        w=p.evaluate('JSON.parse(localStorage.getItem("lifeos-live-v1"))')
        done=next(s for s in w['sessions'] if s['id']==activity['id'])
        self.assertEqual(done['status'],'finished')
        self.assertEqual(len(done['segments']),2)
        self.assertTrue(any(e.get('sessionId')==activity['id'] and e.get('type')=='BREAK_START' for e in w['events']))
        self.assertTrue(any(e.get('sessionId')==activity['id'] and e.get('type')=='BREAK_END' for e in w['events']))
        self.assertEqual(errors,[])
    def test_insights_weekly_and_activity_drilldown(self):
        p,errors=self.new_page()
        self.view(p,'analytics')
        p.locator('#lo208-weekly-averages .lo208-day').first.wait_for(state='visible',timeout=7000)
        self.assertEqual(p.locator('#lo208-weekly-averages .lo208-kpi').count(),4)
        self.assertEqual(p.locator('#lo208-weekly-averages .lo208-day').count(),7)
        self.assertEqual(p.locator('#lo209-activity-insights .lo209-picker button').count(),6)
        for kind in ('study','work','fitness','quran','prayer','other'):
            b=p.locator(f'#lo209-activity-insights button[data-kind="{kind}"]')
            b.click()
            self.assertEqual(b.get_attribute('aria-pressed'),'true')
            self.assertEqual(p.locator('#lo209-activity-insights .lo209-day').count(),7)
        self.assertEqual(errors,[])
    def test_my_life_five_sections_function_as_tabs(self):
        p,errors=self.new_page()
        self.view(p,'life')
        tabs=p.locator('#loLifeSectionTabs button[data-lo-life-section]')
        self.assertEqual(tabs.count(),5)
        for section in ('routines','fitness','nutrition','habits','friends'):
            button=p.locator(f'#loLifeSectionTabs button[data-lo-life-section="{section}"]')
            button.click()
            p.wait_for_function('(section)=>document.body.dataset.loLifeSection===section',arg=section,timeout=6000)
            self.assertEqual(button.get_attribute('aria-pressed'),'true')
        self.assertEqual(errors,[])
    def test_plan_and_goals_navigate_without_hidden_legacy_panels(self):
        p,errors=self.new_page()
        self.view(p,'schedule')
        self.assertTrue(p.locator('#lo200-unified').is_visible(), 'Current unified navigation must be visible')
        self.assertEqual(p.locator('#lifeosNavigation button[data-view="schedule"]').get_attribute('aria-current'),'page')
        self.view(p,'goals')
        self.assertTrue(p.locator('#lo200-unified').is_visible(), 'Current unified navigation must be visible')
        self.assertEqual(p.locator('#lifeosNavigation button[data-view="goals"]').get_attribute('aria-current'),'page')
        self.assertEqual(errors,[])
    def test_focus_gap_and_recovery_tools_mount(self):
        p,errors=self.new_page()
        self.view(p,'tracking')
        self.assertEqual(p.locator('#lo207-gap-review').count(),1)
        self.assertEqual(p.locator('#lo207-focus').count(),1)
        self.assertEqual(p.locator('#lo207-focus [id="lo207-start-focus"]').count(),1)
        self.assertEqual(p.locator('#exportRecovery').count(),1)
        self.assertEqual(errors,[])

if __name__=='__main__':unittest.main()
