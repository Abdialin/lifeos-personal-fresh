"""Headless Chromium smoke test of actual UI, persistence and recovery after reload."""

# Standalone integration smoke test: intentionally inert during unittest discovery.
def main():
    from pathlib import Path
    import http.server
    import threading
    import socket
    from playwright.sync_api import sync_playwright, Error as PlaywrightError

    root = Path(__file__).resolve().parent
    class LocalHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(root), **kwargs)
        def log_message(self, *args): pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), LocalHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}/index.html'
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        try:
            page = browser.new_page(accept_downloads=True)
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            try:
                page.goto(url)
            except PlaywrightError as exc:
                if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(exc):
                    print('SKIP: Chromium navigation blocked by execution environment policy')
                    raise SystemExit(0)
                raise
            page.locator('#customName').fill('Stage12 Focus Test')
            page.locator('#startCustom').click()
            assert page.locator('#sessions').get_by_text('Stage12 Focus Test').count() >= 1
            page.locator('#todoName').fill('Stage12 Offline Task')
            page.locator('#todoForm button[type="submit"]').click()
            assert page.locator('#todoList').get_by_text('Stage12 Offline Task').count() >= 1
            page.reload()
            assert page.locator('#sessions').get_by_text('Stage12 Focus Test').count() >= 1
            assert page.locator('#todoList').get_by_text('Stage12 Offline Task').count() >= 1
            state = page.evaluate("JSON.parse(localStorage.getItem('lifeos-live-v1'))")
            assert state['version'] == 1
            assert any(s['name'] == 'Stage12 Focus Test' for s in state['sessions'])
            assert len(state['todos']) >= 1
            assert not errors, errors
            print('PASS: Stage 12 real Chromium UI, activity creation, to-do creation, reload persistence, no page exceptions')
        finally:
            browser.close()
            server.shutdown()


if __name__ == "__main__":
    main()
