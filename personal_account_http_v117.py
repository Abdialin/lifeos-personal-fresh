"""V117 account HTTP boundary. Feature flagged OFF unless explicitly configured.

Server uses this only behind its existing private-access gate. Requests require
an exact configured HTTPS Origin and, except for registration/login, Bearer auth.
The token is intended for JavaScript memory, never a cookie or localStorage.
No CORS access-control-allow-origin is emitted. Private account DB must be
separately configured and persistent. PostgreSQL adapter is NOT implemented.
"""
import json
from urllib.parse import urlparse
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
        if not path.startswith(PREFIX+'/'):
            return 404,{'error':'Not found'}
        operation=path[len(PREFIX):]
        if (method,operation) not in self.api.__class__.__dict__.get('ROUTES',()) and not _allowed(method,operation):
            return 404,{'error':'Not found'}
        # Fail closed on requests with missing or foreign Origin, including GET.
        if headers.get('Origin')!=self.origin:
            return 403,{'error':'Trusted HTTPS origin required'}
        if headers.get('Sec-Fetch-Site') not in (None,'same-origin','none'):
            return 403,{'error':'Cross-site account requests are blocked'}
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
            # Read requests are bodyless; never permit URL query parameters containing secrets.
            data=None
        return self.api.handle(method,operation,data,headers.get('Authorization'),client,now)
def _allowed(method,path):
    from personal_account_api_v117 import ROUTES
    return (method,path) in ROUTES
