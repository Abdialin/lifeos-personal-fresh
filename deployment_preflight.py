"""Stage 39 offline, read-only deployment checks. Does not connect to a database."""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
REQUIRED = ('server.py','google_calendar.py','calendar_audit_store.py',
            'atomic_calendar.py','index.html','calendar.html','calendar.js',
            'postgres_schema.sql','requirements-v3.2.txt')

def inspect(root=ROOT, env=None):
    env = dict(os.environ if env is None else env)
    errors, warnings, checks = [], [], []
    for filename in REQUIRED:
        if not (root / filename).is_file(): errors.append(f'Missing application file: {filename}')
    docker = (root / 'Dockerfile')
    if not docker.is_file():
        errors.append('Missing Dockerfile')
    else:
        lines = docker.read_text().splitlines()
        copied = set()
        for line in lines:
            parts = line.strip().split()
            if len(parts) >= 3 and parts[0].upper() == 'COPY':
                copied.update(p for p in parts[1:-1] if not p.startswith('--'))
        for filename in REQUIRED[:7]:
            if filename not in copied and '.' not in copied:
                errors.append(f'Dockerfile does not copy {filename}')
        checks.append('Dockerfile application file coverage')
    for key in ('LIFEOS_USERNAME','LIFEOS_PASSWORD','LIFEOS_TOKEN'):
        if not env.get(key): errors.append(f'{key} is not configured')
    if env.get('LIFEOS_USERNAME') and env.get('LIFEOS_PASSWORD') and env['LIFEOS_USERNAME'] == env['LIFEOS_PASSWORD']:
        warnings.append('Username and password match')
    if env.get('LIFEOS_TOKEN') and len(env['LIFEOS_TOKEN']) < 32:
        warnings.append('LIFEOS_TOKEN should contain at least 32 unpredictable characters')
    if env.get('LIFEOS_PASSWORD') and len(env['LIFEOS_PASSWORD']) < 12:
        warnings.append('LIFEOS_PASSWORD is shorter than 12 characters')
    dburl = env.get('LIFEOS_DATABASE_URL','').strip()
    if dburl:
        parts = urlsplit(dburl)
        if parts.scheme not in ('postgres','postgresql') or not parts.hostname:
            errors.append('Invalid PostgreSQL URL scheme or hostname')
        if parts.hostname in ('localhost','127.0.0.1'):
            warnings.append('PostgreSQL points to localhost; verify deployment networking')
        checks.append('PostgreSQL URL format (no connection attempted)')
    else:
        warnings.append('PostgreSQL not configured; SQLite may be ephemeral without persistent disk')
    oauth = ('GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REDIRECT_URI','LIFEOS_CALENDAR_KEY')
    # These are advisory: calendar integration can be disabled safely.
    if any(env.get(k) for k in oauth) and not all(env.get(k) for k in oauth):
        warnings.append('Partial Google Calendar configuration; OAuth may be unavailable')
    checks.append('Required files and authentication configuration')
    return {'ready': not errors, 'errors':errors, 'warnings':warnings, 'checks':checks,
            'note':'Offline static preflight only; does not verify live PostgreSQL, OAuth, Docker build or browser UI.'}

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--strict',action='store_true',help='Return failure when warnings are present')
    args=parser.parse_args()
    result=inspect()
    print(json.dumps(result,indent=2))
    raise SystemExit(1 if result['errors'] or (args.strict and result['warnings']) else 0)
