"""V69 local HTTP regression for safe HEAD requests.

No user accounts, databases or activity records are read or modified.
Run: python test_stage69_head.py
"""
import base64
import http.client
import threading
import unittest
from http.server import ThreadingHTTPServer
import server


class HandlerHeadTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.old_auth = (server.USERNAME, server.PASSWORD, server.TOKEN)
        server.USERNAME = 'v69-test-user'
        server.PASSWORD = 'v69-test-password'
        server.TOKEN = 'v69-test-token'
        cls.httpd = ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.thread.join(timeout=5)
        server.USERNAME, server.PASSWORD, server.TOKEN = cls.old_auth

    def request(self, path, authenticated=False):
        conn = http.client.HTTPConnection('127.0.0.1', self.httpd.server_port, timeout=5)
        headers = {}
        if authenticated:
            token = base64.b64encode(b'v69-test-user:v69-test-password').decode('ascii')
            headers['Authorization'] = 'Basic ' + token
        try:
            conn.request('HEAD', path, headers=headers)
            response = conn.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            conn.close()

    def test_health_head_public_and_bodyless(self):
        status, headers, body = self.request('/healthz')
        self.assertEqual(status, 200)
        self.assertEqual(body, b'')
        self.assertEqual(headers.get('X-Content-Type-Options'), 'nosniff')

    def test_root_head_requires_auth(self):
        status, headers, body = self.request('/')
        self.assertEqual(status, 401)
        self.assertEqual(body, b'')
        self.assertIn('Basic', headers.get('WWW-Authenticate', ''))

    def test_root_head_authenticated(self):
        status, headers, body = self.request('/', authenticated=True)
        self.assertEqual(status, 200)
        self.assertEqual(body, b'')
        self.assertEqual(headers.get('Content-Type'), 'text/html; charset=utf-8')
        self.assertGreater(int(headers['Content-Length']), 100)

    def test_calendar_head_authenticated(self):
        status, headers, body = self.request('/calendar.html', authenticated=True)
        self.assertEqual(status, 200)
        self.assertEqual(body, b'')

    def test_unknown_head_is_bodyless_404(self):
        status, headers, body = self.request('/unlisted-secret', authenticated=True)
        self.assertEqual(status, 404)
        self.assertEqual(body, b'')


if __name__ == '__main__':
    unittest.main(verbosity=2)
