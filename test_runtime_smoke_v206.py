"""V206 short Chromium runtime and section-navigation check; isolated in-memory browser storage."""
import http.server
import pathlib
import socketserver
import threading
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parent
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):pass

with socketserver.TCPServer(('127.0.0.1',0),Handler) as server:
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
            page=browser.new_page(viewport={'width':390,'height':844})
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)+'\n'+str(getattr(e,'stack',''))))
            missing=[]
            page.on('response',lambda r:missing.append(str(r.status)+' '+r.url) if r.status>=400 else None)
            page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/index.html',wait_until='load',timeout=45000)
            page.wait_for_timeout(900)
            for tab in ['dashboard','tracking','schedule','goals','analytics','life']:
                page.locator('#lifeosNavigation button[data-view="'+tab+'"]').click(timeout=4500)
                page.wait_for_timeout(130)
            print('Visible sections:',page.locator('#lifeosNavigation button[data-view]').count())
            print('JavaScript page errors:',repr(errors[:10]))
            print('Failed HTTP assets:',repr(missing[:10]))
            browser.close()
            if errors or missing:raise SystemExit('Runtime smoke failed')
            print('V206 runtime smoke PASS')
    finally:
        server.shutdown()
