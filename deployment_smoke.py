"""Isolated HTTP smoke test. Never connects to an external DB or deployed service."""
import base64
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent


def run():
    with tempfile.TemporaryDirectory(prefix='lifeos-smoke-') as directory:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        username = 'smoke-user'
        password = secrets.token_urlsafe(18)
        token = secrets.token_urlsafe(24)
        env = {**os.environ, 'PORT': str(port), 'LIFEOS_DB': str(Path(directory) / 'test.sqlite3'),
               'LIFEOS_DATABASE_URL': '', 'LIFEOS_USERNAME': username,
               'LIFEOS_PASSWORD': password, 'LIFEOS_TOKEN': token,
               'GOOGLE_CLIENT_ID': '', 'GOOGLE_CLIENT_SECRET': ''}
        process = subprocess.Popen([sys.executable, str(ROOT / 'server.py')], cwd=ROOT,
                                   env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        base = f'http://127.0.0.1:{port}'
        basic = 'Basic ' + base64.b64encode(f'{username}:{password}'.encode()).decode()

        def request(path, method='GET', body=None, authenticated=True, token_auth=False):
            headers = {}
            if authenticated:
                headers['Authorization'] = basic
            if token_auth:
                headers['X-LifeOS-Token'] = token
            if body is not None:
                headers['Content-Type'] = 'application/json'
            payload = json.dumps(body).encode() if body is not None else None
            req = urllib.request.Request(base + path, data=payload, headers=headers, method=method)
            try:
                with urllib.request.urlopen(req, timeout=2) as response:
                    return response.status, response.read(), response.headers
            except urllib.error.HTTPError as exc:
                return exc.code, exc.read(), exc.headers

        try:
            for _ in range(70):
                if process.poll() is not None:
                    raise RuntimeError('Server exited before startup')
                try:
                    status, _, _ = request('/healthz', authenticated=False)
                    if status == 200:
                        break
                except (OSError, TimeoutError):
                    time.sleep(.1)
            else:
                raise RuntimeError('Server did not become ready')
            assert request('/', authenticated=False)[0] == 401
            assert request('/')[0] == 200
            assert request('/calendar.html')[0] == 200
            assert request('/calendar.js')[0] == 200
            assert request('/api/state')[0] == 401
            status, raw, _ = request('/api/state', token_auth=True)
            assert status == 200 and json.loads(raw)['revision'] == 0
            data = {'version': 1, 'sessions': [], 'events': []}
            status, raw, _ = request('/api/state', 'PUT', {'revision': 0, 'data': data}, token_auth=True)
            assert status == 200 and json.loads(raw)['revision'] == 1
            assert request('/api/state', 'PUT', {'revision': 0, 'data': data}, token_auth=True)[0] == 409
            status, raw, _ = request('/api/state', token_auth=True)
            assert status == 200 and json.loads(raw)['data'] == data
            status, raw, _ = request('/backup')
            assert status == 200 and json.loads(raw)['revision'] == 1
            assert request('/api/calendar/status')[0] == 200
            print('PASS: isolated server startup, UI, auth, CAS conflict, persistence, backup, calendar status')
            return True
        finally:
            process.terminate()
            try:
                process.communicate(timeout=4)
            except subprocess.TimeoutExpired:
                process.kill()
                process.communicate()


if __name__ == '__main__':
    run()
