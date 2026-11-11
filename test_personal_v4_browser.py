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

    def test_no_runtime_errors_and_mobile_overflow(self):
        self.assertEqual([], self.failed_assets)
        self.assertEqual([], self.errors)
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'),
                        'Mobile layout has horizontal overflow')


if __name__ == '__main__':
    unittest.main(verbosity=2)
