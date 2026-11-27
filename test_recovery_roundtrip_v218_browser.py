"""V218 real recovery-bundle roundtrip in independent Chromium browser contexts.
Synthetic activity only, never the user's live backend or accounts.
"""
import contextlib
import http.server
import json
from pathlib import Path
import socketserver
import threading
import tempfile
import unittest
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):pass

class RecoveryRoundtrip(unittest.TestCase):
    def test_export_and_restore_recovery_bundle_without_sync_token(self):
        with socketserver.TCPServer(('127.0.0.1',0),Handler) as server:
            threading.Thread(target=server.serve_forever,daemon=True).start()
            with sync_playwright() as driver:
                browser=driver.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
                try:
                    source=browser.new_context(accept_downloads=True)
                    dest=browser.new_context(accept_downloads=True)
                    url=f'http://127.0.0.1:{server.server_address[1]}/index.html'
                    p=source.new_page();p.goto(url,wait_until='load',timeout=45000)
                    p.locator('#lifeosNavigation button[data-view="tracking"]').click()
                    p.locator('#caLive [data-ca-quick-start="Work"]').click()
                    before=p.evaluate("""() => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic'))""")
                    id=next(s['id'] for s in before['workspace']['sessions'] if s['name']=='Work')
                    # Synthetic token, never saved into a file.
                    p.locator('#syncToken').evaluate("el => el.value='synthetic-private-token-not-real'")
                    with tempfile.TemporaryDirectory() as tmp:
                        with p.expect_download(timeout=15000) as download:
                            p.locator('#exportRecovery').evaluate('button => button.click()')
                        path=Path(tmp)/'recovery.json';download.value.save_as(str(path))
                        bundle=json.loads(path.read_text())
                        self.assertEqual(bundle['format'],'lifeos-recovery-v1')
                        self.assertEqual(bundle['atomicCheckpoint']['workspace']['sessions'][0]['id'],id)
                        self.assertNotIn('synthetic-private-token-not-real',path.read_text())
                        target=dest.new_page();target.goto(url,wait_until='load',timeout=45000)
                        target.once('dialog',lambda dialog:dialog.accept())
                        target.locator('#restore').set_input_files(str(path))
                        target.wait_for_function("""expected => {
                          const a=JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic'));
                          return a?.workspace?.sessions?.some(s=>s.id===expected) && a.meta.dirty===true && a.meta.revision===null
                        }""",arg=id,timeout=10000)
                        target.reload(wait_until='load')
                        restored=target.evaluate("""() => JSON.parse(localStorage.getItem('lifeos-v4-stage21-atomic'))""")
                        self.assertIn(id,[s['id'] for s in restored['workspace']['sessions']])
                        self.assertEqual(restored['journal'],[])
                        self.assertTrue(restored['meta']['dirty'])
                        self.assertIsNone(restored['meta']['revision'])
                    print('V218 real recovery bundle export/import/reload; no secret; dirty local state PASS')
                finally:
                    with contextlib.suppress(Exception):source.close();dest.close()
                    browser.close()
if __name__=='__main__':unittest.main()
