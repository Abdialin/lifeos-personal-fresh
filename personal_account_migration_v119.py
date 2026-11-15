"""V119 guarded one-time legacy-backup import into an EMPTY isolated account.

Backup authenticity: verifies SHA-256 over canonical server export shape.
Explicit typed target account and approval are required. Writes ONLY the
isolated account_workspaces row via CAS revision 0. Legacy source unaffected.
"""
import hashlib
import hmac
import json
import time
from personal_social_isolated_v114 import _actor, _connect
import personal_account_workspace_v115 as accounts

FORMAT='lifeos-v3.1-backup'
def canonical(backup):
    if not isinstance(backup,dict) or backup.get('format')!=FORMAT:
        raise ValueError('Expected original LifeOS backup format')
    if type(backup.get('revision')) is not int or backup['revision']<0:
        raise ValueError('Backup revision is invalid')
    data=backup.get('data')
    encoded=accounts._validate(data)
    raw=json.dumps({'revision':backup['revision'],'data':data},sort_keys=True,separators=(',',':')).encode('utf-8')
    digest=hashlib.sha256(raw).hexdigest()
    supplied=backup.get('sha256')
    if not isinstance(supplied,str) or not hmac.compare_digest(supplied,digest):
        raise ValueError('Backup checksum does not match its contents')
    return data, encoded

def preview(backup):
    data,encoded=canonical(backup)
    return {'eligible':True,'bytes':len(encoded.encode('utf-8')),
            'sessions':len(data.get('sessions',[])),'plans':len(data.get('schedule',[])),
            'workouts':len(data.get('workouts',[])),'meals':len(data.get('meals',[])),
            'habitChecks':len(data.get('habitChecks',[])),
            'message':'Only the selected account receives a COPY. Original LifeOS data is not modified.'}

def migrate(path,token,backup,confirmed_username,approved,expected_revision=0,now=None):
    if approved is not True or expected_revision!=0 or type(expected_revision) is not int:
        raise ValueError('Explicit approval and empty-target revision zero required')
    data,encoded=canonical(backup)
    timestamp=int(time.time() if now is None else now)
    # Check authenticated account before any write or data mutation.
    with _connect(path) as db:
        owner=_actor(db,token,timestamp)
        row=db.execute('SELECT username FROM social_users WHERE id=?',(owner,)).fetchone()
        if not row or not isinstance(confirmed_username,str) or not hmac.compare_digest(row['username'],confirmed_username):
            raise PermissionError('Confirm the exact signed-in account username')
    result=accounts.commit(path,token,0,data,timestamp)
    return {'ok':result['ok'],'revision':result['revision'],'copied':bool(result['ok']),
            'sourcePreserved':True,
            'reason':result.get('reason','One-time account copy saved; legacy workspace not modified.')}
