"""Opt-in local Chromium smoke test. Does not touch production services."""
import os
import subprocess
import time
import urllib.request
import socket
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent


@unittest.skipUnless(os.environ.get('LIFEOS_BROWSER_E2E') == '1', 'Opt-in: LIFEOS_BROWSER_E2E=1')
class PersonalBrowserE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from playwright.sync_api import sync_playwright
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        cls.page = cls.browser.new_page(viewport={'width': 390, 'height': 844})
        cls.errors = []
        cls.page.on('pageerror', lambda error: cls.errors.append(str(error)))
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        cls.server = subprocess.Popen(['python', '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        cls.url = f'http://127.0.0.1:{port}/index.html'
        for _ in range(40):
            try:
                urllib.request.urlopen(cls.url, timeout=.2).close()
                break
            except Exception:
                time.sleep(.1)
        cls.page.goto(cls.url, wait_until='load', timeout=20000)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.server.terminate()
        cls.server.wait(timeout=5)
        cls.playwright.stop()

    def test_navigation_and_tracking(self):
        page = self.page
        self.assertTrue(page.locator('#lifeosNavigation button').count() >= 6)
        page.get_by_role('button', name='Tracking', exact=True).first.click()
        self.assertTrue(page.locator('#quick').is_visible())
        page.locator('#customName').fill('Browser smoke activity')
        page.locator('#startCustom').click()
        self.assertIn('Browser smoke activity', page.locator('#sessions').inner_text())
        page.reload()
        self.assertIn('Browser smoke activity', page.locator('#sessions').inner_text())
        self.assertEqual([], self.errors)

    def test_mobile_no_horizontal_overflow(self):
        page = self.page
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'))


if __name__ == '__main__':
    unittest.main()
