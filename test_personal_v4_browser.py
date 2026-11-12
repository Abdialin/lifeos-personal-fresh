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
            self.assertEqual(page.locator(f'{panel} .lo-kpi-row > div, {panel} .lo-kpi-row > button').count(), 3)
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
        page.locator('#v7-plan-tab-reality').click()
        self.assertTrue(page.locator('#v4Plan .v7-plan-calendar').is_visible())
        self.assertTrue(page.locator('#v4Plan .v7-plan-week-balance').is_visible())
        self.assertTrue(page.locator('#v7-plan-panel-reality').is_visible(), page.evaluate("() => [...document.querySelectorAll('#v4Plan > .v4-card')].map(e => ({id:e.id,hidden:e.hidden,display:getComputedStyle(e).display,rect:e.getBoundingClientRect().height}))"))
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
        self.assertTrue(page.locator('#scheduleName').evaluate('(el) => document.activeElement === el'))
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

    def test_goals_editors_are_compact_but_accessible(self):
        page = self.page
        page.locator('#lifeosNavigation button[data-view="goals"]').click()
        page.locator('#loGoalsVisual').wait_for(state='visible', timeout=6000)
        for form_id in ('todoForm', 'goalForm'):
            form = page.locator('#' + form_id)
            toggle = page.locator('[data-lo-form-toggle="' + form_id + '"]')
            self.assertTrue(toggle.is_visible())
            self.assertFalse(form.is_visible())
            self.assertEqual(toggle.get_attribute('aria-expanded'), 'false')
            toggle.click()
            self.assertTrue(form.is_visible())
            self.assertEqual(toggle.get_attribute('aria-expanded'), 'true')
            toggle.click()
            self.assertFalse(form.is_visible())
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'))

    def test_life_sections_and_log_editors_are_accessible(self):
        page = self.page
        page.locator('#lifeosNavigation button[data-view="life"]').click()
        page.locator('#loLifeVisual').wait_for(state='visible', timeout=6000)
        tabs = page.locator('#loLifeSectionTabs button')
        self.assertEqual(tabs.count(), 3)
        for key, form_id in [('routines', 'personalLogForm'), ('fitness', 'fitnessForm'), ('nutrition', 'mealForm')]:
            tab = page.locator('[data-lo-life-section="' + key + '"]')
            tab.click()
            self.assertEqual(tab.get_attribute('aria-pressed'), 'true')
            panel = page.locator('#' + form_id).locator('xpath=ancestor::section[contains(@class,"panel")]')
            self.assertTrue(panel.is_visible())
            toggle = panel.locator('[data-lo-form-toggle="' + form_id + '"]')
            self.assertTrue(toggle.is_visible())
            self.assertFalse(page.locator('#' + form_id).is_visible())
            toggle.click()
            self.assertTrue(page.locator('#' + form_id).is_visible())
            toggle.click()
            self.assertFalse(page.locator('#' + form_id).is_visible())
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'))

    def test_all_six_views_at_mobile_tablet_and_desktop_widths(self):
        url = f'http://127.0.0.1:{self.httpd.server_address[1]}/index.html'
        views = [('dashboard','#todayOverview'),('tracking','#trackActivePanel'),
                 ('schedule','#v4Plan'),('goals','#loGoalsVisual'),
                 ('analytics','#v4Insights'),('life','#loLifeVisual')]
        for width in (320,390,768,1280):
            context = self.browser.new_context(viewport={'width':width,'height':844}, device_scale_factor=1)
            try:
                page = context.new_page()
                page.goto(url,wait_until='load',timeout=30000)
                for name,selector in views:
                    page.locator(f'#lifeosNavigation button[data-view="{name}"]').click()
                    page.locator(selector).wait_for(state='visible',timeout=6000)
                    result = page.evaluate("""() => {
                        const nav=document.querySelector('#lifeosNavigation');
                        const rect=nav.getBoundingClientRect();
                        const active=nav.querySelectorAll('[aria-current=page]');
                        const body=document.body;
                        return {
                            overflow: document.documentElement.scrollWidth-innerWidth,
                            selected:active.length,
                            navWidth:rect.width,
                            navVisible:rect.width>100 && rect.height>40,
                            intro:!!document.querySelector('#lifeosViewIntro')?.textContent.trim()
                        };
                    }""")
                    self.assertLessEqual(result['overflow'],2,f'{width}px {name}: horizontal overflow {result}')
                    self.assertEqual(result['selected'],1,f'{width}px {name}: selected navigation {result}')
                    self.assertTrue(result['navVisible'],f'{width}px {name}: navigation missing')
                    self.assertTrue(result['intro'],f'{width}px {name}: view heading missing')
            finally:
                context.close()

    def test_summary_shortcuts_open_existing_forms_without_changing_data(self):
        page = self.page
        page.locator('#lifeosNavigation button[data-view="goals"]').click()
        page.locator('#loGoalsVisual').wait_for(state='visible', timeout=6000)
        self.assertEqual(page.locator('#loGoalsVisual [data-lo-jump]').count(), 2)
        for form_id in ('goalForm','todoForm'):
            form = page.locator('#'+form_id)
            self.assertFalse(form.is_visible())
            page.locator('#loGoalsVisual [data-lo-jump="'+form_id+'"]').click()
            self.assertTrue(form.is_visible())
            self.assertEqual(page.locator('[data-lo-form-toggle="'+form_id+'"]').get_attribute('aria-expanded'),'true')
        page.locator('#lifeosNavigation button[data-view="life"]').click()
        page.locator('#loLifeVisual').wait_for(state='visible', timeout=6000)
        page.locator('[data-lo-life-section="fitness"]').click()
        self.assertEqual(page.locator('[data-lo-life-section="fitness"]').get_attribute('aria-pressed'),'true')
        page.locator('#loLifeVisual [data-lo-life-jump="routines"]').click()
        self.assertEqual(page.locator('[data-lo-life-section="routines"]').get_attribute('aria-pressed'),'true')
        self.assertTrue(page.locator('#personalActivityPanel').is_visible())

    def test_my_life_routine_rhythm_day_selection(self):
        page = self.page
        page.locator('#lifeosNavigation button[data-view="life"]').click()
        page.locator('#loLifeVisual').wait_for(state='visible', timeout=6000)
        days = page.locator('#loLifeVisual [data-lo-routine-day]')
        self.assertEqual(days.count(), 7)
        self.assertEqual(page.locator('#loLifeVisual [data-lo-routine-day][aria-pressed="true"]').count(), 1)
        selected = days.first
        date = selected.get_attribute('data-lo-routine-day')
        selected.click()
        active = page.locator('#loLifeVisual [data-lo-routine-day][aria-pressed="true"]')
        self.assertEqual(active.get_attribute('data-lo-routine-day'), date)
        self.assertTrue(active.evaluate('(el) => document.activeElement === el'))
        self.assertIn('entries',page.locator('#loLifeVisual .lo-life-rhythm-detail').inner_text())
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'))

    def test_insights_history_shortcut_opens_track_without_mutating_records(self):
        page = self.page
        page.locator('#lifeosNavigation button[data-view="analytics"]').click()
        page.locator('#v4Insights').wait_for(state='visible', timeout=6000)
        link = page.locator('#v4Insights [data-v4-track-history]')
        self.assertTrue(link.is_visible())
        link.click()
        page.locator('#trackHistoryPanel').wait_for(state='visible', timeout=6000)
        self.assertEqual(page.locator('#lifeosNavigation button[data-view="tracking"]').get_attribute('aria-current'),'page')
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'))

    def test_local_activity_survives_refresh_with_atomic_recovery_record(self):
        """Use an isolated browser context; never access the user's real activities."""
        context = self.browser.new_context(viewport={'width':390,'height':844})
        try:
            page = context.new_page()
            url = f'http://127.0.0.1:{self.httpd.server_address[1]}/index.html'
            page.goto(url,wait_until='load',timeout=30000)
            page.locator('#lifeosNavigation button[data-view="tracking"]').click()
            page.locator('#loStorageHealth').wait_for(state='visible',timeout=6000)
            page.locator('#customName').fill('Isolated persistence smoke')
            page.locator('#startCustom').click()
            page.locator('#sessions .session').first.wait_for(state='visible',timeout=4000)
            page.locator('#sessions [data-act="finish"]').first.click()
            page.wait_for_function("""() => {
                const raw=localStorage.getItem('lifeos-v4-stage21-atomic');
                if(!raw)return false;
                const saved=JSON.parse(raw);
                return saved.workspace?.sessions?.some(x=>x.name==='Isolated persistence smoke'&&x.status==='finished');
            }""")
            saved=page.evaluate("""() => {
                const item=JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic'));
                return {id:item.workspace.sessions.find(x=>x.name==='Isolated persistence smoke').id,
                        journal:item.journal.length,format:item.format};
            }""")
            self.assertEqual(saved['format'],1)
            self.assertGreaterEqual(saved['journal'],1)
            page.reload(wait_until='load',timeout=30000)
            page.locator('#lifeosNavigation button[data-view="tracking"]').click()
            page.locator('#trackHistoryPanel').wait_for(state='visible',timeout=6000)
            self.assertIn('Isolated persistence smoke',page.locator('#history').inner_text())
            current=page.evaluate("""() => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic')).workspace.sessions.find(x=>x.name==='Isolated persistence smoke')""")
            self.assertEqual(current['id'],saved['id'])
            self.assertEqual(current['status'],'finished')
            self.assertTrue(page.locator('#loStorageHealth').is_visible())
            page.wait_for_function("() => document.querySelector('#loStorageHealth .lo-storage-health-state')?.textContent.includes('Saved on device')", timeout=6000)
            self.assertIn('Saved on device',page.locator('#loStorageHealth').inner_text())
        finally:
            context.close()

    def test_sync_timeout_reconciliation_is_atomic_after_refresh(self):
        """Fake server replies only. Verify an acknowledged operation stays removed on reload."""
        import json
        context=self.browser.new_context(viewport={'width':390,'height':844})
        try:
            page=context.new_page()
            url=f'http://127.0.0.1:{self.httpd.server_address[1]}/index.html'
            page.goto(url,wait_until='load',timeout=30000)
            page.locator('#lifeosNavigation button[data-view="tracking"]').click()
            page.locator('#customName').fill('Offline CAS smoke')
            page.locator('#startCustom').click()
            page.locator('#sessions [data-act="finish"]').first.click()
            initial=page.evaluate("""() => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic'))""")
            self.assertGreaterEqual(len(initial['journal']),2)
            first=initial['journal'][0]['snapshot']
            # The remote server committed the first snapshot before a response was lost.
            def fake_state(route):
                if route.request.method=='GET':
                    route.fulfill(status=200,content_type='application/json',body=json.dumps({'revision':0,'data':first}))
                else:
                    route.fulfill(status=503,content_type='application/json',body='{"error":"Simulated interrupted upload"}')
            page.route('**/api/state',fake_state)
            page.locator('#lifeosNavigation button[data-view="tracking"]').click()
            panel=page.locator('#cloudSyncPanel')
            if panel.locator('.lo-advanced-toggle').get_attribute('aria-expanded')=='false':
                panel.locator('.lo-advanced-toggle').click()
            page.locator('#syncToken').fill('test-token-not-real')
            page.locator('#connectSync').click()
            page.wait_for_function("""count => {
                const record=JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic'));
                return record?.journal?.length===count;
            }""",arg=len(initial['journal'])-1,timeout=6000)
            before=page.evaluate("""() => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic'))""")
            self.assertEqual(before['meta']['revision'],0)
            page.reload(wait_until='load',timeout=30000)
            after=page.evaluate("""() => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic'))""")
            self.assertEqual(len(after['journal']),len(initial['journal'])-1)
            self.assertEqual(after['journal'][0]['id'],initial['journal'][1]['id'])
            self.assertEqual(after['workspace']['sessions'][0]['name'],'Offline CAS smoke')
        finally:
            context.close()

    def test_read_only_server_backend_probe_does_not_modify_local_storage(self):
        page=self.page
        page.locator('#lifeosNavigation button[data-view="tracking"]').click()
        panel=page.locator('#cloudSyncPanel')
        toggle=panel.locator('.lo-advanced-toggle')
        if toggle.get_attribute('aria-expanded')=='false':
            toggle.click()
        button=page.locator('#loVerifyStorage')
        self.assertTrue(button.is_visible())
        before=page.evaluate("() => localStorage.getItem('lifeos-v4-stage21-atomic')")
        page.locator('#syncToken').fill('isolated-probe-token')
        def fake_probe(route):
            route.fulfill(status=200,content_type='application/json',
                body='{"backend":"postgresql","read_only":true,"storage_readable":true,"revision":9,"has_state":true}')
        page.route('**/api/storage/status',fake_probe)
        button.click()
        page.wait_for_function("() => document.querySelector('#loServerStorageResult')?.textContent.includes('PostgreSQL')")
        self.assertIn('revision 9',page.locator('#loServerStorageResult').inner_text())
        after=page.evaluate("() => localStorage.getItem('lifeos-v4-stage21-atomic')")
        self.assertEqual(before,after)
        page.unroute('**/api/storage/status')
        if toggle.get_attribute('aria-expanded')=='true':
            toggle.click()

    def test_two_browser_sync_through_isolated_real_sqlite_server(self):
        """Actual auth + HTTP + CAS, never the user's real Render database."""
        import os
        import socket
        import subprocess
        import sys
        import tempfile
        import time

        with tempfile.TemporaryDirectory() as temporary:
            with socket.socket() as sock:
                sock.bind(('127.0.0.1', 0))
                port = sock.getsockname()[1]
            token = 'isolated-automated-test-token'
            env = {**os.environ, 'PORT': str(port),
                   'LIFEOS_DB': str(pathlib.Path(temporary) / 'isolated.sqlite3'),
                   'LIFEOS_USERNAME': 'lifeos-test-user',
                   'LIFEOS_PASSWORD': 'lifeos-test-password',
                   'LIFEOS_TOKEN': token}
            env.pop('LIFEOS_DATABASE_URL', None)
            proc = subprocess.Popen([sys.executable, str(ROOT / 'server.py')],
                                    env=env, cwd=str(ROOT),
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            contexts = []
            try:
                url=f'http://127.0.0.1:{port}/index.html'
                for _ in range(60):
                    if proc.poll() is not None:
                        raise RuntimeError('Isolated test server exited')
                    try:
                        import urllib.request
                        with urllib.request.urlopen(f'http://127.0.0.1:{port}/healthz',timeout=1) as response:
                            if response.status == 200: break
                    except Exception:
                        time.sleep(.1)
                else: raise RuntimeError('Isolated test server did not start')
                def browser():
                    context=self.browser.new_context(viewport={'width':390,'height':844},
                            http_credentials={'username':'lifeos-test-user',
                                              'password':'lifeos-test-password'},
                            accept_downloads=True)
                    contexts.append(context)
                    page=context.new_page()
                    page.goto(url,wait_until='load',timeout=30000)
                    page.locator('#lifeosNavigation button[data-view="tracking"]').click()
                    cloud=page.locator('#cloudSyncPanel')
                    if cloud.locator('.lo-advanced-toggle').get_attribute('aria-expanded')=='false':
                        cloud.locator('.lo-advanced-toggle').click()
                    page.locator('#syncToken').fill(token)
                    return page
                first=browser()
                first.locator('#customName').fill('Synthetic cross-device activity')
                first.locator('#startCustom').click()
                first.locator('#sessions [data-act="finish"]').first.click()
                first.locator('#connectSync').click()
                first.wait_for_function("""() => document.querySelector('#syncStatus')?.textContent.includes('Synced to server')""",timeout=14000)
                saved=first.evaluate("""() => {
                    const record=JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic'));
                    return {revision:record.meta.revision,id:record.workspace.sessions.find(s=>s.name==='Synthetic cross-device activity').id};
                }""")
                self.assertGreater(saved['revision'],0)
                second=browser()
                second.locator('#connectSync').click()
                second.wait_for_function("""() => document.querySelector('#syncStatus')?.textContent.includes('server has saved data')""",timeout=8000)
                second.on('dialog',lambda dialog:dialog.accept())
                second.locator('#pullSync').click()
                second.wait_for_function("""() => document.querySelector('#syncStatus')?.textContent.includes('Loaded from server')""",timeout=8000)
                remote=second.evaluate("""() => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic'))""")
                self.assertEqual(remote['meta']['revision'],saved['revision'])
                self.assertEqual(len(remote['journal']),0)
                self.assertEqual(remote['workspace']['sessions'][0]['id'],saved['id'])
                second.reload(wait_until='load',timeout=30000)
                persisted=second.evaluate("""() => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic'))""")
                self.assertEqual(persisted['meta']['revision'],saved['revision'])
                self.assertEqual(persisted['workspace']['sessions'][0]['id'],saved['id'])
                self.assertEqual(len(persisted['journal']),0)
                # Deliberately attempt an outdated write through the real HTTP API.
                # PostgreSQL and SQLite share this revision-CAS contract.
                import base64
                import json
                import urllib.error
                import urllib.request
                headers = {
                    'Authorization': 'Basic ' + base64.b64encode(b'lifeos-test-user:lifeos-test-password').decode(),
                    'X-LifeOS-Token': token,
                    'Content-Type': 'application/json'
                }
                changed=json.loads(json.dumps(persisted['workspace']))
                changed['sessions'][0]['name']='Must never overwrite server history'
                stale=urllib.request.Request(f'http://127.0.0.1:{port}/api/state',
                    data=json.dumps({'revision':saved['revision']-1,'data':changed}).encode(),
                    headers=headers,method='PUT')
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(stale,timeout=5)
                self.assertEqual(error.exception.code,409)
                read=urllib.request.Request(f'http://127.0.0.1:{port}/api/state',
                    headers=headers,method='GET')
                with urllib.request.urlopen(read,timeout=5) as response:
                    verified=json.load(response)
                self.assertEqual(verified['revision'],saved['revision'])
                self.assertEqual(verified['data']['sessions'][0]['id'],saved['id'])
                self.assertEqual(verified['data']['sessions'][0]['name'],'Synthetic cross-device activity')
            finally:
                for context in contexts:
                    with contextlib.suppress(Exception): context.close()
                proc.terminate()
                with contextlib.suppress(Exception): proc.wait(timeout=4)

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
                for view, panel in [('dashboard', '#v4Today'), ('schedule', '#v4Plan'), ('analytics', '#v4Insights'), ('tracking', '#trackActivePanel'), ('goals', '#loGoalsVisual'), ('life', '#loLifeVisual')]:
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
