"""Browser smoke for the actual LifeOS Personal page. Uses an isolated local HTTP server."""
import contextlib
import http.server
import pathlib
import socketserver
import threading
import unittest

ROOT = pathlib.Path(__file__).resolve().parent


class BrowserSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from playwright.sync_api import sync_playwright
        handler = lambda *args, **kwargs: http.server.SimpleHTTPRequestHandler(*args, directory=str(ROOT), **kwargs)
        cls.httpd = socketserver.TCPServer(('127.0.0.1', 0), handler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        cls.context = cls.browser.new_context(viewport={'width': 390, 'height': 844})
        cls.page = cls.context.new_page()
        cls.errors = []
        cls.failed_assets = []
        cls.page.on('pageerror', lambda e: cls.errors.append(str(e)))
        cls.page.on('response', lambda r: cls.failed_assets.append(f'{r.status} {r.url}') if r.status >= 400 else None)
        cls.page.goto(f'http://127.0.0.1:{cls.httpd.server_address[1]}/index.html', wait_until='load', timeout=45000)
        cls.page.wait_for_timeout(700)

    @classmethod
    def tearDownClass(cls):
        with contextlib.suppress(Exception):
            cls.context.close()
            cls.browser.close()
            cls.playwright.stop()
            cls.httpd.shutdown()
            cls.httpd.server_close()

    def test_navigation_and_visual_sections(self):
        page = self.page
        nav = page.locator('#lifeosNavigation button[data-view]')
        self.assertEqual(nav.count(), 6, 'The actual app should display exactly six navigation tabs')
        self.assertEqual(page.locator('#todayOverview').count(), 1)
        self.assertEqual(page.locator('#lifeosLiveDashboard').count(), 0, 'Duplicate dashboard should not mount')
        page.locator('#lifeosNavigation button[data-view="dashboard"]').click()
        page.locator('#v4Today').wait_for(state='visible', timeout=5000)
        page.locator('#lifeosNavigation button[data-view="analytics"]').click()
        page.locator('#v4Insights').wait_for(state='visible', timeout=5000)
        page.locator('#lifeosNavigation button[data-view="schedule"]').click()
        page.locator('#v4Plan').wait_for(state='visible', timeout=5000)
        self.assertIn('My Reality', page.locator('#v4Plan').inner_text())
        self.assertIn('My Predicted Week', page.locator('#v4Plan').inner_text())
        self.assertIn('My Ideal Schedule', page.locator('#v4Plan').inner_text())
        self.assertTrue(page.locator('#v4Plan [data-v4-day]').count() >= 28)

    def test_ideal_review_opens_controls(self):
        page = self.page
        page.locator('#lifeosNavigation button[data-view="schedule"]').click()
        page.locator('#v7-plan-tab-ideal').click()
        page.locator('[data-v4-review-ideal]').click()
        self.assertTrue(page.locator('#idealReview').is_visible())
        self.assertTrue(page.locator('#idealProposalList').is_visible())

    def test_theme_switch_preserves_charts_and_navigation(self):
        page = self.page
        page.locator('#lifeosNavigation button[data-view="analytics"]').click()
        toggle = page.locator('.lifeos-theme-toggle')
        self.assertTrue(toggle.is_visible(), 'Theme control missing')
        before = page.evaluate('document.documentElement.dataset.lifeosTheme')
        toggle.click()
        after = page.evaluate('document.documentElement.dataset.lifeosTheme')
        self.assertNotEqual(before, after, 'Theme switch did not change theme')
        page.locator('#v4Insights').wait_for(state='visible', timeout=5000)
        self.assertTrue(page.locator('#v4Insights .v4-card').count() >= 1, 'Analytics cards missing after theme switch')
        self.assertEqual(page.locator('#lifeosNavigation button[data-view]').count(), 6)
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'),
                        'Theme switch introduced horizontal overflow')
        toggle.click()
        self.assertEqual(page.evaluate('document.documentElement.dataset.lifeosTheme'), before)

    def test_all_sections_and_advanced_controls(self):
        page = self.page
        tabs = ['dashboard', 'tracking', 'schedule', 'goals', 'analytics', 'life']
        for tab in tabs:
            page.locator(f'#lifeosNavigation button[data-view="{tab}"]').click()
            page.wait_for_function('(v) => document.body.dataset.lifeosView === v', arg=tab)
            self.assertTrue(page.locator('#lifeosViewIntro').is_visible())
            self.assertNotEqual(page.locator('#lifeosViewIntro').inner_text().strip(), '')
        page.locator('#lifeosNavigation button[data-view="tracking"]').click()
        recovery = page.locator('#trackingRecoveryPanel')
        self.assertTrue(recovery.is_visible())
        toggle = recovery.locator('.lo-advanced-toggle')
        self.assertTrue(toggle.is_visible())
        self.assertEqual(toggle.get_attribute('aria-expanded'), 'false')
        self.assertFalse(recovery.locator('#reviewForgotten').is_visible())
        toggle.click()
        self.assertEqual(toggle.get_attribute('aria-expanded'), 'true')
        self.assertTrue(recovery.locator('#reviewForgotten').is_visible())
        toggle.click()
        self.assertFalse(recovery.locator('#reviewForgotten').is_visible())

    def test_goals_and_personal_life_visual_dashboards(self):
        page = self.page
        for view, panel in [('goals', '#loGoalsVisual'), ('life', '#loLifeVisual')]:
            page.locator(f'#lifeosNavigation button[data-view="{view}"]').click()
            page.locator(panel).wait_for(state='visible', timeout=6000)
            self.assertEqual(page.locator(f'{panel} .lo-kpi-row > div').count(), 3)
            self.assertTrue(page.locator(f'{panel} .lo-goal-card').is_visible())
            self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'))

    def test_populated_goals_and_life_charts(self):
        """Check actual goal bars and routine counts with isolated read-only fixtures."""
        page = self.page
        page.evaluate("""() => {
          window.__lifeosOriginalRead = window.lifeosReadOnlyWorkspace;
          const today = new Date();
          const d = [today.getFullYear(), String(today.getMonth()+1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-');
          window.lifeosReadOnlyWorkspace = () => ({
            sessions:[],schedule:[],idealRoutines:[],workouts:[],
            todos:[{id:'task1',done:false},{id:'task2',done:true}],
            goals:[{id:'g1',name:'Read books',category:'personal',match:'Reading',unit:'sessions',target:2}],
            personalLogs:[{id:'r1',date:d,category:'Reading',minutes:30,precision:'measured'},
                          {id:'s1',date:d,category:'Sleep',minutes:420,precision:'measured'}]
          });
        }""")
        try:
            page.locator('#lifeosNavigation button[data-view="goals"]').click()
            page.locator('#loGoalsVisual .lo-goal-track').wait_for(state='visible', timeout=5000)
            self.assertIn('1 / 2 sessions', page.locator('#loGoalsVisual').inner_text())
            self.assertEqual(page.locator('#loGoalsVisual [role="progressbar"]').first.get_attribute('aria-valuenow'), '50')
            page.locator('#lifeosNavigation button[data-view="life"]').click()
            page.wait_for_function("document.querySelector('#loLifeVisual')?.innerText.includes('7 h')")
            self.assertIn('Reading', page.locator('#loLifeVisual').inner_text())
            self.assertIn('Sleep', page.locator('#loLifeVisual').inner_text())
            self.assertIn('2', page.locator('#loLifeVisual .lo-kpi-row').inner_text())
        finally:
            page.evaluate("""() => {
              window.lifeosReadOnlyWorkspace = window.__lifeosOriginalRead;
              delete window.__lifeosOriginalRead;
            }""")

    def test_plan_mobile_tabs_and_compact_schedule_editor(self):
        page = self.page
        page.locator('#lifeosNavigation button[data-view="schedule"]').click()
        page.locator('#v4Plan').wait_for(state='visible', timeout=5000)
        tabs = page.locator('#v4Plan [data-v7-plan-view]')
        self.assertEqual(tabs.count(), 3)
        self.assertTrue(page.locator('#v4Plan .v7-plan-calendar').is_visible())
        self.assertTrue(page.locator('#v4Plan .v7-plan-week-balance').is_visible())
        self.assertTrue(page.locator('#v7-plan-panel-reality').is_visible())
        self.assertFalse(page.locator('#v7-plan-panel-predicted').is_visible())
        tabs.nth(1).click()
        self.assertTrue(page.locator('#v7-plan-panel-predicted').is_visible())
        self.assertFalse(page.locator('#v7-plan-panel-reality').is_visible())
        tabs.nth(2).click()
        self.assertTrue(page.locator('#v7-plan-panel-ideal').is_visible())
        self.assertEqual(page.locator('#v4Plan [role="tab"][aria-selected="true"]').count(), 1)
        editor = page.locator('#scheduleEditorPanel')
        self.assertTrue(editor.is_visible())
        self.assertFalse(page.locator('#scheduleForm').is_visible())
        button = page.locator('#v7TogglePlanForm')
        button.click()
        self.assertTrue(page.locator('#scheduleForm').is_visible())
        self.assertTrue(page.locator('#scheduleName').is_focused())
        button.click()
        self.assertFalse(page.locator('#scheduleForm').is_visible())
        self.assertTrue(page.locator('#scheduleDay').is_visible())
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'))

    def test_calendar_today_shortcut_and_selected_date(self):
        page = self.page
        page.locator('#lifeosNavigation button[data-view="schedule"]').click()
        page.locator('#v4Plan').wait_for(state='visible', timeout=6000)
        selected = page.locator('#v4Plan [data-v4-day][aria-pressed="true"]')
        self.assertEqual(selected.count(), 1)
        first_date = selected.get_attribute('data-v4-day')
        page.locator('#v4Plan [data-v4-month="1"]').click()
        page.wait_for_function('(previous) => document.querySelector("#v4Plan [data-v4-day][aria-pressed=true]")?.dataset.v4Day !== previous', arg=first_date)
        page.locator('#v4Plan [data-v4-today]').click()
        self.assertEqual(page.locator('#v4Plan [data-v4-day][aria-pressed="true"]').get_attribute('data-v4-day'), first_date)
        self.assertTrue(page.locator('#v4Plan [data-v4-today]').evaluate('(el) => document.activeElement === el'))
        next_date = page.locator('#v4Plan [data-v4-day]').nth(1)
        key = next_date.get_attribute('data-v4-day')
        next_date.click()
        self.assertEqual(page.locator('#v4Plan [data-v4-day][aria-pressed="true"]').get_attribute('data-v4-day'), key)
        self.assertTrue(page.locator('#v4Plan [data-v4-day][aria-pressed="true"]').evaluate('(el) => document.activeElement === el'))

    def test_interactive_insights_day_drilldown(self):
        page = self.page
        page.locator('#lifeosNavigation button[data-view="analytics"]').click()
        page.locator('#v4Insights').wait_for(state='visible', timeout=6000)
        days = page.locator('#v4Insights [data-v4-insight-day]')
        self.assertEqual(days.count(), 7)
        self.assertEqual(page.locator('#v4Insights [data-v4-insight-day][aria-pressed="true"]').count(), 1)
        selected = days.nth(0)
        key = selected.get_attribute('data-v4-insight-day')
        selected.click()
        active = page.locator('#v4Insights [data-v4-insight-day][aria-pressed="true"]')
        self.assertEqual(active.count(), 1)
        self.assertEqual(active.get_attribute('data-v4-insight-day'), key)
        self.assertTrue(active.evaluate('(el) => document.activeElement === el'))
        self.assertTrue(page.locator('#v4Insights .v4-insight-detail').is_visible())
        detail = page.locator('#v4Insights .v4-insight-detail').inner_text()
        self.assertIn('Recorded', detail)
        self.assertIn('Unique', detail)
        self.assertIn('Overlap', detail)
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'))

    def test_plan_weekday_comparison_interaction(self):
        page = self.page
        page.locator('#lifeosNavigation button[data-view="schedule"]').click()
        page.locator('#v4Plan').wait_for(state='visible', timeout=6000)
        days = page.locator('#v4Plan [data-v6-plan-day]')
        self.assertEqual(days.count(), 7)
        self.assertEqual(page.locator('#v4Plan [data-v6-plan-day][aria-pressed="true"]').count(), 1)
        target = days.nth(0)
        key = target.get_attribute('data-v6-plan-day')
        target.click()
        selected = page.locator('#v4Plan [data-v6-plan-day][aria-pressed="true"]')
        self.assertEqual(selected.get_attribute('data-v6-plan-day'), key)
        self.assertTrue(selected.evaluate('(el) => document.activeElement === el'))
        content = page.locator('#v4Plan .v6-plan-details').inner_text()
        self.assertIn('Unique recorded', content)
        self.assertIn('Unique planned', content)
        self.assertIn('Recorded within plans', content)
        self.assertIn('does not prove', content)
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'))

    def test_today_is_compact_without_tracking_form_duplicates(self):
        page = self.page
        page.locator('#lifeosNavigation button[data-view="dashboard"]').click()
        page.locator('#v4Today').wait_for(state='visible', timeout=5000)
        self.assertTrue(page.locator('#todayOverview').is_visible())
        self.assertFalse(page.locator('#quick').is_visible(), 'Quick start forms should live in Track')
        self.assertFalse(page.locator('#sessions').is_visible(), 'Detailed running timer controls should live in Track')
        self.assertFalse(page.locator('#tracked').is_visible(), 'Legacy duplicate Today summary should be hidden')
        self.assertFalse(page.locator('#scheduleForm').is_visible(), 'Schedule editor should live in Plan')
        self.assertEqual(page.locator('#todayOverview').count(), 1)
        page.locator('#lifeosNavigation button[data-view="tracking"]').click()
        self.assertTrue(page.locator('#quick').is_visible())
        self.assertTrue(page.locator('#sessions').is_visible())

    def test_track_secondary_tools_collapsed_but_accessible(self):
        page = self.page
        page.locator('#lifeosNavigation button[data-view="tracking"]').click()
        for identifier in ['sessionToolsPanel','connectedDatabasePanel','cloudSyncPanel']:
            panel = page.locator('#'+identifier)
            self.assertTrue(panel.is_visible())
            button = panel.locator('.lo-advanced-toggle')
            self.assertTrue(button.is_visible(), f'{identifier} disclosure missing')
            self.assertEqual(button.get_attribute('aria-expanded'), 'false')
            button.click()
            self.assertEqual(button.get_attribute('aria-expanded'), 'true')
            button.click()
            self.assertEqual(button.get_attribute('aria-expanded'), 'false')
        self.assertEqual(page.locator('#quick button').count(), 10)
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'))

    def test_track_workflow_order_and_manual_entry(self):
        page = self.page
        page.locator('#lifeosNavigation button[data-view="tracking"]').click()
        order = page.evaluate("""() => {
          const root = document.querySelector('.layout > div:first-child');
          const nodes = ['trackActivePanel','trackQuickPanel','trackDistractionPanel',
                         'trackHistoryPanel','trackPastPanel'].map(id => document.getElementById(id));
          return nodes.map(el => ({id: el.id, order: parseInt(getComputedStyle(el).order, 10),
                                   visible: !!el.getClientRects().length}));
        }""")
        self.assertTrue(all(item['visible'] for item in order))
        self.assertEqual([item['order'] for item in order], sorted(item['order'] for item in order))
        past = page.locator('#trackPastPanel')
        toggle = past.locator('.lo-advanced-toggle')
        self.assertTrue(toggle.is_visible())
        self.assertEqual(toggle.get_attribute('aria-expanded'), 'false')
        self.assertFalse(past.locator('#pastForm').is_visible())
        toggle.click()
        self.assertTrue(past.locator('#pastForm').is_visible())
        self.assertEqual(toggle.get_attribute('aria-expanded'), 'true')
        toggle.click()
        self.assertFalse(past.locator('#pastForm').is_visible())
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'))

    def test_visual_snapshots_for_review(self):
        """Keep reviewable screenshots of each key screen on mobile and desktop."""
        output = ROOT / 'artifacts' / 'ui'
        output.mkdir(parents=True, exist_ok=True)
        url = f'http://127.0.0.1:{self.httpd.server_address[1]}/index.html'
        for width, height, device in [(390, 844, 'mobile'), (1280, 850, 'desktop')]:
            context = self.browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=1)
            try:
                page = context.new_page()
                page.goto(url, wait_until='load', timeout=30000)
                for view, panel in [('dashboard', '#v4Today'), ('schedule', '#v4Plan'), ('analytics', '#v4Insights'), ('goals', '#loGoalsVisual'), ('life', '#loLifeVisual')]:
                    page.locator(f'#lifeosNavigation button[data-view="{view}"]').click()
                    page.locator(panel).wait_for(state='visible', timeout=5000)
                    page.screenshot(path=str(output / f'{device}-{view}.png'), full_page=True, animations='disabled')
            finally:
                context.close()

    def test_no_runtime_errors_and_mobile_overflow(self):
        self.assertEqual([], self.failed_assets)
        self.assertEqual([], self.errors)
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'),
                        'Mobile layout has horizontal overflow')


if __name__ == '__main__':
    unittest.main(verbosity=2)
