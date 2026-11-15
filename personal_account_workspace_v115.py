"""V115 — account-scoped LifeOS workspace storage foundation (NOT connected to HTTP).

Separate from legacy id=1 shared workspace. All operations use the isolated
social session token to resolve a user ID and scope every query by owner.
No automatic migration, synchronization, fallback to legacy data, or implicit
account creation. Uses atomic SQLite compare-and-swap for concurrent updates.
"""
import json
import sqlite3
import time
from personal_social_isolated_v114 import _actor, _connect

MAX_WORKSPACE_BYTES=2_000_000

def initialize(path):
    with _connect(path) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS account_workspaces (
            owner TEXT PRIMARY KEY REFERENCES social_users(id) ON DELETE CASCADE,
            revision INTEGER NOT NULL CHECK(revision>=1),
            payload TEXT NOT NULL CHECK(length(payload)>0)
        )""")

def _validate(workspace):
    if not isinstance(workspace,dict) or workspace.get('version') != 1:
        raise ValueError('Account workspace must be a version-1 object')
    if not all(isinstance(workspace.get(k,[]),list) for k in ('sessions','schedule','workouts','meals','habitChecks')):
        raise ValueError('Invalid workspace collections')
    encoded=json.dumps(workspace,ensure_ascii=False,separators=(',',':'),allow_nan=False)
    if len(encoded.encode('utf-8'))>MAX_WORKSPACE_BYTES:
        raise ValueError('Workspace exceeds storage limit')
    return encoded

def read(path,token,now=None):
    timestamp=int(time.time() if now is None else now)
    with _connect(path) as db:
        owner=_actor(db,token,timestamp)
        row=db.execute('SELECT revision,payload FROM account_workspaces WHERE owner=?',(owner,)).fetchone()
        return {'revision':row['revision'],'data':json.loads(row['payload'])} if row else {'revision':0,'data':None}

def commit(path,token,expected,workspace,now=None):
    if type(expected) is not int or expected<0:
        raise ValueError('Invalid revision')
    payload=_validate(workspace)
    timestamp=int(time.time() if now is None else now)
    with _connect(path) as db:
        db.execute('BEGIN IMMEDIATE')
        owner=_actor(db,token,timestamp)
        if expected==0:
            cur=db.execute("""INSERT INTO account_workspaces(owner,revision,payload)
                  VALUES (?,1,?) ON CONFLICT(owner) DO NOTHING""",(owner,payload))
            if cur.rowcount:
                return {'ok':True,'revision':1}
        else:
            cur=db.execute("""UPDATE account_workspaces SET revision=revision+1,payload=?
                             WHERE owner=? AND revision=?""",(payload,owner,expected))
            if cur.rowcount:
                return {'ok':True,'revision':expected+1}
        row=db.execute('SELECT revision FROM account_workspaces WHERE owner=?',(owner,)).fetchone()
        return {'ok':False,'revision':row['revision'] if row else 0,'reason':'Revision changed; review before retrying'}

def inspect_migration(legacy):
    """Preview only. Never writes or silently claims ownership of legacy state."""
    if not isinstance(legacy,dict):
        return {'eligible':False,'reason':'Legacy data must be reviewed before an account transfer'}
    try:encoded=_validate(legacy)
    except (ValueError,TypeError) as e:return {'eligible':False,'reason':str(e)}
    return {'eligible':True,'bytes':len(encoded.encode('utf-8')),
      'sessions':len(legacy.get('sessions',[])),
      'plans':len(legacy.get('schedule',[])),
      'reason':'Preview only: explicit account ownership and approval are required; no data moved.'}
