"""Atomic state+audit compare-and-swap, with idempotent decision IDs."""
import json
import sqlite3
from calendar_audit_store import validate

def commit(db_path, url, expected, data, entry):
    if type(expected) is not int or expected < 0 or not isinstance(data,dict) or data.get('version') != 1 or not isinstance(data.get('sessions'),list) or not isinstance(data.get('events'),list):
        raise ValueError('Invalid workspace')
    if len(data['sessions'])>10000 or len(data['events'])>100000: raise ValueError('Too many records')
    validate(entry)
    payload=json.dumps(entry,sort_keys=True,separators=(',',':'))
    if url:
        import psycopg
        from psycopg.types.json import Jsonb
        with psycopg.connect(url,connect_timeout=10) as db:
            with db.cursor() as cur:
                # Serialize all writers for this workspace, including first creation.
                cur.execute('SELECT pg_advisory_xact_lock(74822034)')
                cur.execute('SELECT revision FROM lifeos.state WHERE id=1')
                row=cur.fetchone(); actual=int(row[0]) if row else 0
                cur.execute('SELECT entry FROM lifeos.calendar_audit WHERE id=%s',(entry['id'],))
                old=cur.fetchone()
                if old:
                    old=old[0] if isinstance(old[0],dict) else json.loads(old[0])
                    return {'status':'duplicate' if old==entry else 'decision_conflict','revision':actual}
                if actual!=expected:return {'status':'revision_conflict','revision':actual}
                if row:cur.execute('UPDATE lifeos.state SET revision=%s,payload=%s,updated_at=now() WHERE id=1',(actual+1,Jsonb(data)))
                else:cur.execute('INSERT INTO lifeos.state(id,revision,payload) VALUES(1,1,%s)',(Jsonb(data),))
                cur.execute('INSERT INTO lifeos.calendar_audit(id,entry) VALUES(%s,%s)',(entry['id'],Jsonb(entry)))
                return {'status':'committed','revision':actual+1}
    with sqlite3.connect(db_path,timeout=10) as db:
        db.execute('BEGIN IMMEDIATE')
        db.execute('CREATE TABLE IF NOT EXISTS calendar_audit(sequence INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,payload TEXT NOT NULL)')
        row=db.execute('SELECT revision FROM state WHERE id=1').fetchone();actual=int(row[0]) if row else 0
        old=db.execute('SELECT payload FROM calendar_audit WHERE id=?',(entry['id'],)).fetchone()
        if old:return {'status':'duplicate' if json.loads(old[0])==entry else 'decision_conflict','revision':actual}
        if actual!=expected:return {'status':'revision_conflict','revision':actual}
        db.execute('INSERT INTO state(id,revision,payload) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload',(actual+1,json.dumps(data,separators=(',',':'))))
        db.execute('INSERT INTO calendar_audit(id,payload) VALUES(?,?)',(entry['id'],payload))
        db.commit()
        return {'status':'committed','revision':actual+1}
