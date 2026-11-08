"""Stage 38: actual Chromium browser smoke tests against the local LifeOS server.
Run: python -m unittest -v test_stage38_browser
Requires playwright Python and an installed Chromium executable.
"""
import os
import shutil
import unittest
from test_stage36_http import MultiDeviceHTTP
from pathlib import Path

class Stage38Browser(MultiDeviceHTTP):
    def test_browser_ui_and_read_only_calendar(self):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            self.skipTest('Playwright Python unavailable')
        executable=shutil.which('chromium') or shutil.which('chromium-browser')
        if not executable:
            self.skipTest('Chromium unavailable')
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox','--disable-dev-shm-usage'])
            try:
                context=browser.new_context(http_credentials={'username':'test-user','password':'test-password'},accept_downloads=True)
                page=context.new_page()
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                try:
                    page.goto(f'http://127.0.0.1:{self.port}/',wait_until='domcontentloaded',timeout=20000)
                except Exception as exc:
                    if 'ERR_BLOCKED_BY_ADMINISTRATOR' not in str(exc):
                        raise
                    # Browser policy blocks loopback; test real JS/DOM from local file instead.
                    try:
                        page.goto((Path(__file__).parent/'index.html').as_uri(),wait_until='domcontentloaded',timeout=20000)
                    except Exception as fallback:
                        if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(fallback):
                            self.skipTest('Chromium navigation blocked by environment policy (HTTP and file)')
                        raise
                self.assertTrue(page.locator('#syncStatus').count())
                self.assertTrue(page.locator('#calendarHandoffPanel').count())
                self.assertTrue(page.locator('#calendarAuditHistory').count())
                self.assertFalse(errors,errors)
                calendar=context.new_page()
                calendar.on('pageerror',lambda e:errors.append(str(e)))
                calendar.goto((Path(__file__).parent/'calendar.html').as_uri(),wait_until='domcontentloaded',timeout=20000)
                self.assertIn('Calendar',calendar.title())
                self.assertFalse(errors,errors)
                self.assertEqual(self.request('GET','/api/state'),(200,{'revision':0,'data':None}))
            finally:
                browser.close()

if __name__=='__main__':unittest.main()
