"""Opt-in Docker image build and isolated HTTP smoke check; no production access."""
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parent

def run():
    docker = shutil.which('docker')
    if not docker:
        print('SKIP: Docker CLI is not installed')
        return None
    tag = 'lifeos-stage41-local-test'
    subprocess.run([docker, 'build', '-t', tag, str(ROOT)], check=True, timeout=240)
    with tempfile.TemporaryDirectory(prefix='lifeos-docker-') as tmp:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        token = secrets.token_urlsafe(32)
        name = 'lifeos-stage41-' + secrets.token_hex(5)
        subprocess.run([docker, 'run', '-d', '--name', name, '-p', f'127.0.0.1:{port}:8080',
                        '-v', f'{tmp}:/data', '-e', 'LIFEOS_USERNAME=test',
                        '-e', 'LIFEOS_PASSWORD=' + secrets.token_urlsafe(20),
                        '-e', 'LIFEOS_TOKEN=' + token, '-e', 'LIFEOS_DATABASE_URL=', tag],
                       check=True, stdout=subprocess.DEVNULL, timeout=30)
        try:
            for _ in range(60):
                try:
                    with urllib.request.urlopen(f'http://127.0.0.1:{port}/healthz', timeout=1) as res:
                        if res.status == 200:
                            break
                except Exception:
                    time.sleep(.25)
            else:
                raise RuntimeError('Container health endpoint did not start')
            req = urllib.request.Request(f'http://127.0.0.1:{port}/api/state', headers={'X-LifeOS-Token':token})
            with urllib.request.urlopen(req, timeout=5) as res:
                payload = json.load(res)
            assert payload['revision'] == 0
            print('PASS: Docker image build, container startup, authenticated API, isolated SQLite')
            return True
        finally:
            subprocess.run([docker, 'rm', '-f', name], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if __name__ == '__main__':
    run()
