"""Real HTTP integration: authentication, persistence, conflicts, backup, restart, concurrency."""
import base64
import concurrent.futures
import hashlib
import http.client
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parent
with tempfile.TemporaryDirectory() as tmp:
    db = str(Path(tmp) / 'state.sqlite')
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    env = dict(os.environ, LIFEOS_DB=db, LIFEOS_USERNAME='stage12-user',
               LIFEOS_PASSWORD='stage12-pass', LIFEOS_TOKEN='stage12-token', PORT=str(port))
    env.pop('LIFEOS_DATABASE_URL', None)
    auth = 'Basic ' + base64.b64encode(b'stage12-user:stage12-pass').decode()

    def request(method, path, payload=None, *, authorized=True, token=True):
        conn = http.client.HTTPConnection('127.0.0.1', port, timeout=5)
        headers = {'Content-Type': 'application/json'}
        if authorized: headers['Authorization'] = auth
        if token: headers['X-LifeOS-Token'] = 'stage12-token'
        body = json.dumps(payload).encode() if payload is not None else None
        try:
            conn.request(method, path, body, headers)
            response = conn.getresponse()
            raw = response.read()
            content_type = response.getheader('Content-Type', '')
            parsed = json.loads(raw) if raw and 'application/json' in content_type else raw
            return response.status, parsed
        finally:
            conn.close()

    def start():
        proc = subprocess.Popen([sys.executable, str(ROOT / 'server.py')], env=env,
                                stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        for _ in range(100):
            if proc.poll() is not None:
                raise RuntimeError('Server failed to start: ' + proc.stderr.read().decode())
            try:
                if request('GET', '/healthz')[0] == 200: return proc
            except (OSError, http.client.HTTPException):
                time.sleep(.05)
        raise RuntimeError('Server startup timeout')

    proc = start()
    try:
        assert request('GET', '/api/state', authorized=False)[0] == 401
        assert request('GET', '/api/state', token=False)[0] == 401
        assert request('GET', '/api/state') == (200, {'revision': 0, 'data': None})
        assert request('GET', '/')[0] == 200
        assert request('PUT', '/api/state', {'revision': 0, 'data': {'version': 9}})[0] == 400
        state = {'version': 1, 'sessions': [{'id': 'test-activity', 'name': 'Study'}],
                 'events': [], 'todos': [], 'workouts': [], 'meals': [], 'goals': [], 'schedule': []}
        assert request('PUT', '/api/state', {'revision': 0, 'data': state}) == (200, {'revision': 1})
        assert request('PUT', '/api/state', {'revision': 0, 'data': state})[0] == 409
        assert request('GET', '/api/state') == (200, {'revision': 1, 'data': state})
        status, backup = request('GET', '/backup')
        assert status == 200 and backup['data'] == state
        canonical = json.dumps({'revision': 1, 'data': state}, sort_keys=True,
                               separators=(',', ':')).encode()
        assert backup['sha256'] == hashlib.sha256(canonical).hexdigest()

        # Two independent clients racing to update the same revision: only one succeeds.
        def write(n):
            candidate = dict(state, todos=[{'id': f'client-{n}', 'title': 'Offline item'}])
            return request('PUT', '/api/state', {'revision': 1, 'data': candidate})
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(write, (1, 2)))
        assert sorted(status for status, _ in results) == [200, 409], results
        assert request('GET', '/api/state')[1]['revision'] == 2
    finally:
        proc.terminate()
        proc.wait(timeout=5)

    proc = start()
    try:
        status, persisted = request('GET', '/api/state')
        assert status == 200 and persisted['revision'] == 2
        assert len(persisted['data']['todos']) == 1
        assert persisted['data']['sessions'][0]['id'] == 'test-activity'
        assert request('GET', '/backup')[1]['revision'] == 2
        print('PASS: Stage 12 real HTTP auth, validation, backup integrity, concurrent CAS and SQLite restart persistence')
    finally:
        proc.terminate()
        proc.wait(timeout=5)
