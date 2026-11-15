"""LifeOS V111–V114 isolated Friends domain (not mounted to shared workspace routes).

SQLite implementation for isolated testing and future migration. Accounts and
sessions are separate from LifeOS's shared activity-state table. Every social
action is authenticated by a per-user opaque session token. Neither password
nor session token is stored in plaintext. NO access to activities, prayers,
nutrition, notes or calendar. Leaderboard is self-reported aggregate progress.

IMPORTANT: NOT a public auth service yet. Registration/login throttling, CSRF
defenses, per-account workspace migration and PostgreSQL adapter must be
implemented and security-tested before HTTP exposure.
"""
import hashlib
import hmac
import secrets
import sqlite3
import re
import time
from pathlib import Path

SESSION_TTL = 12 * 3600
SHARE_TTL = 7 * 86400
ALLOWED = frozenset(('workoutDays', 'habitDays'))

def _hash(secret):
    return hashlib.sha256(secret.encode('utf-8')).hexdigest()

def _password(password, salt):
    return hashlib.scrypt(password.encode('utf-8'), salt=bytes.fromhex(salt), n=2**14, r=8, p=1, dklen=32).hex()

def _handle(name):
    if not isinstance(name, str) or not re.fullmatch(r'[a-z][a-z0-9_]{2,29}', name):
        raise ValueError('Username must be 3–30 lowercase letters, numbers or underscores, starting with a letter')
    return name

def _connect(path):
    db=sqlite3.connect(str(path),timeout=8)
    db.execute('PRAGMA foreign_keys=ON')
    db.row_factory=sqlite3.Row
    return db

def initialize(path):
    with _connect(path) as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS social_users (
          id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
          salt TEXT NOT NULL, password_hash TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS social_sessions (
          token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES social_users(id) ON DELETE CASCADE,
          expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS social_invites (
          id TEXT PRIMARY KEY, sender TEXT NOT NULL REFERENCES social_users(id),
          recipient TEXT NOT NULL REFERENCES social_users(id),
          status TEXT NOT NULL CHECK(status IN ('pending','accepted','declined','cancelled')),
          created INTEGER NOT NULL, UNIQUE(sender,recipient));
        CREATE TABLE IF NOT EXISTS social_grants (
          owner TEXT NOT NULL REFERENCES social_users(id), viewer TEXT NOT NULL REFERENCES social_users(id),
          metric TEXT NOT NULL CHECK(metric IN ('workoutDays','habitDays')), enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
          PRIMARY KEY(owner,viewer,metric));
        CREATE TABLE IF NOT EXISTS social_cards (
          owner TEXT NOT NULL REFERENCES social_users(id),
          metric TEXT NOT NULL CHECK(metric IN ('workoutDays','habitDays')),
          days INTEGER NOT NULL CHECK(days IN (7,14,30)),
          period_end TEXT NOT NULL, score INTEGER NOT NULL,
          expires INTEGER NOT NULL, PRIMARY KEY(owner,metric,days,period_end));
        """)

def register(path, username, password):
    username=_handle(username)
    if not isinstance(password,str) or len(password)<12 or len(password)>128:
        raise ValueError('Password must be 12–128 characters')
    salt=secrets.token_hex(16)
    uid=secrets.token_hex(16)
    with _connect(path) as db:
        db.execute('INSERT INTO social_users(id,username,salt,password_hash) VALUES (?,?,?,?)',
                   (uid,username,salt,_password(password,salt)))
    return uid

def login(path,username,password,now=None):
    now=int(time.time() if now is None else now)
    if not isinstance(password,str) or len(password)>128:
        raise ValueError('Invalid credentials')
    with _connect(path) as db:
        row=db.execute('SELECT id,salt,password_hash FROM social_users WHERE username=?',(username,)).fetchone()
        # Always perform comparable scrypt work even for a missing username.
        salt=row['salt'] if row else '00'*16
        computed=_password(password,salt)
        if not row or not hmac.compare_digest(computed,row['password_hash']):
            raise ValueError('Invalid credentials')
        token=secrets.token_urlsafe(32)
        db.execute('INSERT INTO social_sessions(token_hash,user_id,expires) VALUES (?,?,?)',
                   (_hash(token),row['id'],now+SESSION_TTL))
    return token

def _actor(db,token,now):
    if not isinstance(token,str) or len(token)>200:
        raise PermissionError('Authentication required')
    row=db.execute('SELECT user_id FROM social_sessions WHERE token_hash=? AND expires>?',
                   (_hash(token),now)).fetchone()
    if not row:
        raise PermissionError('Invalid or expired session')
    return row['user_id']

def logout(path,token):
    with _connect(path) as db:
        db.execute('DELETE FROM social_sessions WHERE token_hash=?',(_hash(token),))

def _friends(db,a,b):
    return bool(db.execute("""
       SELECT 1 FROM social_invites WHERE status='accepted'
       AND ((sender=? AND recipient=?) OR (sender=? AND recipient=?))
       """,(a,b,b,a)).fetchone())

def invite(path,token,username,now=None):
    now=int(time.time() if now is None else now)
    with _connect(path) as db:
        actor=_actor(db,token,now)
        person=db.execute('SELECT id FROM social_users WHERE username=?',(_handle(username),)).fetchone()
        if not person or person['id']==actor:
            raise ValueError('Friend unavailable')
        peer=person['id']
        if _friends(db,actor,peer):
            raise ValueError('Already friends')
        existing=db.execute('SELECT id,status FROM social_invites WHERE sender=? AND recipient=?',(actor,peer)).fetchone()
        if existing and existing['status']=='pending':
            raise ValueError('Invitation pending')
        iid=secrets.token_hex(16)
        if existing:
            db.execute('UPDATE social_invites SET id=?, status=?,created=? WHERE sender=? AND recipient=?',
                       (iid,'pending',now,actor,peer))
        else:
            db.execute('INSERT INTO social_invites(id,sender,recipient,status,created) VALUES (?,?,?,?,?)',
                       (iid,actor,peer,'pending',now))
    return iid

def inbox(path,token,now=None):
    now=int(time.time() if now is None else now)
    with _connect(path) as db:
        actor=_actor(db,token,now)
        rows=db.execute("""SELECT i.id,u.username FROM social_invites i
                JOIN social_users u ON u.id=i.sender
                WHERE i.recipient=? AND i.status='pending'""",(actor,)).fetchall()
        return [dict(x) for x in rows]

def respond(path,token,invite_id,accept,now=None):
    now=int(time.time() if now is None else now)
    with _connect(path) as db:
        actor=_actor(db,token,now)
        row=db.execute('SELECT sender,recipient,status FROM social_invites WHERE id=?',(invite_id,)).fetchone()
        if not row or row['recipient']!=actor or row['status']!='pending':
            raise PermissionError('Cannot respond to this invitation')
        db.execute('UPDATE social_invites SET status=? WHERE id=?',
                   ('accepted' if accept is True else 'declined',invite_id))
    return bool(accept is True)

def set_grant(path,token,friend_username,metric,enabled,now=None):
    if metric not in ALLOWED or type(enabled) is not bool:
        raise ValueError('Invalid metric or consent')
    now=int(time.time() if now is None else now)
    with _connect(path) as db:
        actor=_actor(db,token,now)
        target=db.execute('SELECT id FROM social_users WHERE username=?',(_handle(friend_username),)).fetchone()
        if not target or not _friends(db,actor,target['id']):
            raise PermissionError('Only accepted friends can receive consent')
        db.execute("""INSERT INTO social_grants(owner,viewer,metric,enabled) VALUES (?,?,?,?)
                   ON CONFLICT(owner,viewer,metric) DO UPDATE SET enabled=excluded.enabled""",
                   (actor,target['id'],metric,int(enabled)))

def publish(path,token,metric,days,period_end,score,now=None):
    if metric not in ALLOWED or type(days) is not int or days not in (7,14,30):
        raise ValueError('Unsupported metric or period')
    if type(score) is not int or score<0 or score>days:
        raise ValueError('Score outside the chosen period')
    if not isinstance(period_end,str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',period_end):
        raise ValueError('Invalid period')
    from datetime import date,datetime,timezone
    try:day=date.fromisoformat(period_end)
    except ValueError as exc:raise ValueError('Invalid calendar date') from exc
    now=int(time.time() if now is None else now)
    if day>datetime.fromtimestamp(now,timezone.utc).date():
        raise ValueError('Future reporting period')
    with _connect(path) as db:
        actor=_actor(db,token,now)
        db.execute("""INSERT INTO social_cards(owner,metric,days,period_end,score,expires)
             VALUES (?,?,?,?,?,?)
             ON CONFLICT(owner,metric,days,period_end)
             DO UPDATE SET score=excluded.score,expires=excluded.expires""",
             (actor,metric,days,period_end,score,now+SHARE_TTL))

def leaderboard(path,token,metric,days,period_end,now=None):
    if metric not in ALLOWED or type(days) is not int or days not in (7,14,30):
        raise ValueError('Invalid leaderboard selection')
    now=int(time.time() if now is None else now)
    with _connect(path) as db:
        viewer=_actor(db,token,now)
        rows=db.execute("""SELECT u.username,c.score FROM social_cards c
             JOIN social_users u ON u.id=c.owner
             JOIN social_grants g ON g.owner=c.owner AND g.viewer=? AND g.metric=c.metric AND g.enabled=1
             WHERE c.metric=? AND c.days=? AND c.period_end=? AND c.expires>?
             AND EXISTS (SELECT 1 FROM social_invites i
                         WHERE i.status='accepted'
                         AND ((i.sender=c.owner AND i.recipient=?)
                            OR (i.sender=? AND i.recipient=c.owner)))
             ORDER BY c.score DESC,u.username LIMIT 100""",
             (viewer,metric,days,period_end,now,viewer,viewer)).fetchall()
        return [dict(row,verified=False) for row in rows]

def remove_friend(path,token,username,now=None):
    now=int(time.time() if now is None else now)
    with _connect(path) as db:
        actor=_actor(db,token,now)
        peer=db.execute('SELECT id FROM social_users WHERE username=?',(_handle(username),)).fetchone()
        if not peer or not _friends(db,actor,peer['id']):
            raise PermissionError('Friendship not found')
        db.execute("""UPDATE social_invites SET status='cancelled'
                   WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)""",
                   (actor,peer['id'],peer['id'],actor))
        db.execute("""DELETE FROM social_grants WHERE (owner=? AND viewer=?) OR (owner=? AND viewer=?)""",
                   (actor,peer['id'],peer['id'],actor))
