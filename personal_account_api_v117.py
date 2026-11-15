"""LifeOS V117: opt-in, session-scoped account API service (SQLite staging only).

Intentionally isolated from the legacy single-user workspace. The caller MUST
enforce TLS, size limits, no-store responses, an exact trusted Origin for browser
requests, and reject cross-origin access. Only registered social users can use
these routes. No password reset or real PostgreSQL adapter yet; do not enable
for untrusted public users without additional security review.
"""
import json
import secrets
import sqlite3
import threading
import time
from collections import defaultdict, deque
import personal_social_isolated_v114 as social
import personal_account_workspace_v115 as workspace

ROUTES = frozenset((
    ('POST','/register'),('POST','/login'),('POST','/logout'),
    ('GET','/workspace'),('PUT','/workspace'),
    ('POST','/friends/invite'),('GET','/friends/inbox'),
    ('POST','/friends/respond'),('POST','/friends/grant'),
    ('POST','/friends/remove'),('POST','/friends/share'),
    ('GET','/friends/leaderboard'),
))
MAX_REQUEST=workspace.MAX_WORKSPACE_BYTES+1024
AUTH_LIMIT=6
AUTH_WINDOW=15*60

class SlidingLimiter:
    def __init__(self):
        self.items=defaultdict(deque)
        self.lock=threading.RLock()
    def allow(self,identifier,now=None,limit=AUTH_LIMIT,window=AUTH_WINDOW):
        now=time.time() if now is None else now
        with self.lock:
            # Cap memory even under many distinct identifiers.
            if len(self.items)>10000:
                self.items={k:v for k,v in self.items.items() if v and v[-1]>now-window}
            q=self.items.setdefault(identifier,deque())
            while q and q[0]<=now-window:q.popleft()
            if len(q)>=limit:return False
            q.append(now)
            return True

class AccountApi:
    def __init__(self,db,limiter=None):
        self.db=db
        self.limiter=limiter if limiter is not None else SlidingLimiter()
    @staticmethod
    def _require_fields(data,fields):
        if not isinstance(data,dict) or set(data)!=set(fields):
            raise ValueError('Unexpected request structure')
        return data
    @staticmethod
    def _token(header):
        if not isinstance(header,str) or not header.startswith('Bearer '):
            raise PermissionError('Account session required')
        token=header[7:]
        if not token or len(token)>200:
            raise PermissionError('Invalid session token')
        return token
    def handle(self,method,path,body=None,bearer=None,client='unknown',now=None):
        """Return (HTTP status, JSON result). Never return credentials on errors."""
        now=int(time.time() if now is None else now)
        if (method,path) not in ROUTES:
            return 404,{'error':'Not found'}
        if body is not None:
            try:
                if len(json.dumps(body,ensure_ascii=False).encode('utf-8'))>MAX_REQUEST:
                    return 413,{'error':'Account request exceeds size limit'}
            except (ValueError,TypeError):
                return 400,{'error':'Invalid JSON object'}
        try:
            if path in ('/register','/login'):
                # Uniform per-IP + username throttling; still needs reverse-proxy controls.
                data=self._require_fields(body,('username','password'))
                username=data['username']
                bucket=str(client)[:100]+':'+str(username)[:50]
                if not self.limiter.allow(bucket,now):
                    return 429,{'error':'Too many account attempts. Try again later.'}
                if path=='/register':
                    social.register(self.db,username,data['password'])
                    return 201,{'created':True}
                token=social.login(self.db,username,data['password'],now)
                return 200,{'token':token,'expiresIn':social.SESSION_TTL,'storage':'memory-only'}
            token=self._token(bearer)
            if path=='/logout':
                self._require_fields(body,())
                social.logout(self.db,token)
                return 200,{'loggedOut':True}
            if path=='/workspace':
                if method=='GET':
                    return 200,workspace.read(self.db,token,now)
                data=self._require_fields(body,('revision','data'))
                result=workspace.commit(self.db,token,data['revision'],data['data'],now)
                return (200 if result['ok'] else 409),result
            if path=='/friends/invite':
                data=self._require_fields(body,('username',))
                iid=social.invite(self.db,token,data['username'],now)
                return 201,{'invitationId':iid}
            if path=='/friends/inbox':
                return 200,{'invitations':social.inbox(self.db,token,now)}
            if path=='/friends/respond':
                data=self._require_fields(body,('invitationId','accept'))
                if type(data['accept']) is not bool:raise ValueError('Explicit accept boolean required')
                return 200,{'accepted':social.respond(self.db,token,data['invitationId'],data['accept'],now)}
            if path=='/friends/grant':
                data=self._require_fields(body,('username','metric','enabled'))
                social.set_grant(self.db,token,data['username'],data['metric'],data['enabled'],now)
                return 200,{'saved':True}
            if path=='/friends/remove':
                data=self._require_fields(body,('username',))
                social.remove_friend(self.db,token,data['username'],now)
                return 200,{'removed':True}
            if path=='/friends/share':
                data=self._require_fields(body,('metric','days','periodEnd','score'))
                social.publish(self.db,token,data['metric'],data['days'],data['periodEnd'],data['score'],now)
                return 200,{'shared':True,'selfReported':True}
            if path=='/friends/leaderboard':
                data=self._require_fields(body,('metric','days','periodEnd'))
                rows=social.leaderboard(self.db,token,data['metric'],data['days'],data['periodEnd'],now)
                return 200,{'results':rows,'selfReported':True}
        except (sqlite3.IntegrityError,):
            return 409,{'error':'Account name or invitation already exists'}
        except PermissionError:
            return 403,{'error':'Not authorized for this account or resource'}
        except (ValueError,TypeError,OverflowError):
            return 400,{'error':'Invalid request, credentials or unavailable action'}
        except sqlite3.Error:
            return 503,{'error':'Account database unavailable'}
        return 404,{'error':'Not found'}

def bootstrap(db):
    social.initialize(db)
    workspace.initialize(db)
