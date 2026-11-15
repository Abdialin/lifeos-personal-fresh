"""V117 account HTTP boundary. Feature flagged OFF unless explicitly configured.

Server uses this only behind its existing private-access gate. Requests require
an exact configured HTTPS Origin and, except for registration/login, Bearer auth.
The token is intended for JavaScript memory, never a cookie or localStorage.
No CORS access-control-allow-origin is emitted. Private account DB must be
separately configured and persistent. PostgreSQL adapter is NOT implemented.
"""
import json
from urllib.parse import urlparse, parse_qs
from pathlib import Path
from personal_account_api_v117 import AccountApi,bootstrap,MAX_REQUEST

PREFIX='/api/account/v117'
class AccountBoundary:
    def __init__(self,db_path,origin):
        parsed=urlparse(origin)
        if parsed.scheme!='https' or not parsed.hostname or parsed.path not in ('','/') or parsed.query or parsed.fragment or parsed.username or parsed.password:
            raise ValueError('Account origin must be a full HTTPS origin')
        if not Path(db_path).is_absolute():
            raise ValueError('Account database path must be absolute')
        self.origin=origin.rstrip('/')
        self.api=AccountApi(db_path)
        bootstrap(db_path)

    def route(self,method,path,headers,raw=None,client='unknown',now=None):
        """Return (status, response body); requires no secrets in logs."""
        parsed=urlparse(path)
        if not parsed.path.startswith(PREFIX+'/') or parsed.fragment:
            return 404,{'error':'Not found'}
        operation=parsed.path[len(PREFIX):]
        if not _allowed(method,operation):
            return 404,{'error':'Not found'}
        if headers.get('Sec-Fetch-Site') not in (None,'same-origin','none'):
            return 403,{'error':'Cross-site account requests are blocked'}
        # Browsers normally omit Origin on same-origin GET. Require a matching
        # HTTPS Referer in that case, and still require a Bearer token on reads.
        supplied_origin=headers.get('Origin')
        if supplied_origin != self.origin:
            referer=urlparse(headers.get('Referer',''))
            referer_origin=(referer.scheme+'://'+referer.netloc) if referer.scheme and referer.netloc else ''
            if method!='GET' or supplied_origin is not None or referer_origin!=self.origin:
                return 403,{'error':'Trusted HTTPS origin required'}
        data=None
        if method in ('POST','PUT'):
            if headers.get('Content-Type','').split(';')[0].strip().lower()!='application/json':
                return 415,{'error':'JSON content type required'}
            if not isinstance(raw,bytes) or not raw or len(raw)>MAX_REQUEST:
                return 413,{'error':'Invalid account request size'}
            try:data=json.loads(raw.decode('utf-8'))
            except (ValueError,UnicodeError):
                return 400,{'error':'Invalid account JSON'}
        if method=='GET':
            if operation=='/friends/leaderboard':
                try:
                    query=parse_qs(parsed.query,strict_parsing=True,keep_blank_values=True,max_num_fields=3)
                    if set(query)!=set(('metric','days','periodEnd')) or any(len(v)!=1 for v in query.values()):
                        raise ValueError('Invalid leaderboard query')
                    data={'metric':query['metric'][0],'days':int(query['days'][0]),'periodEnd':query['periodEnd'][0]}
                except (ValueError,OverflowError):
                    return 400,{'error':'Invalid leaderboard query'}
            elif parsed.query:
                return 400,{'error':'Unexpected query parameters'}
        elif parsed.query:
            return 400,{'error':'Query parameters not allowed'}
        return self.api.handle(method,operation,data,headers.get('Authorization'),client,now)
def _allowed(method,path):
    from personal_account_api_v117 import ROUTES
    return (method,path) in ROUTES
