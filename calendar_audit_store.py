"""Append-only server-side calendar decision journal (not a workspace transaction)."""
import json
import sqlite3
import threading
from datetime import datetime, timezone

_lock = threading.RLock()
FIELDS = ('id', 'at', 'action', 'planId', 'proposalId')

def validate(entry):
    if not isinstance(entry, dict) or any(not isinstance(entry.get(k), str) or not entry[k] or len(entry[k]) > 512 for k in FIELDS):
        raise ValueError('Missing or invalid audit identity')
    if entry['action'] not in ('approve', 'reject', 'reschedule', 'skip', 'undo'):
        raise ValueError('Unsupported audit action')
    if len(json.dumps(entry)) > 12000: raise ValueError('Audit entry too large')
    return entry

def list_entries(db_path, url):
    if url:
        import psycopg
        with psycopg.connect(url, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT entry FROM lifeos.calendar_audit ORDER BY sequence DESC LIMIT 1000')
                return [x[0] if isinstance(x[0],dict) else json.loads(x[0]) for x in cur.fetchall()]
    with sqlite3.connect(db_path) as conn:
        conn.execute('CREATE TABLE IF NOT EXISTS calendar_audit (sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, payload TEXT NOT NULL)')
        return [json.loads(x[0]) for x in conn.execute('SELECT payload FROM calendar_audit ORDER BY sequence DESC LIMIT 1000')]

def append_entry(db_path, url, entry):
    entry=validate(entry)
    payload=json.dumps(entry,sort_keys=True,separators=(',',':'))
    if url:
        import psycopg
        from psycopg.types.json import Jsonb
        with psycopg.connect(url,connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute('INSERT INTO lifeos.calendar_audit (id,entry) VALUES (%s,%s) ON CONFLICT (id) DO NOTHING RETURNING id',(entry['id'],Jsonb(entry)))
                if cur.fetchone(): return {'status':'stored','id':entry['id']}
                cur.execute('SELECT entry FROM lifeos.calendar_audit WHERE id=%s',(entry['id'],))
                existing=cur.fetchone()[0]
                existing=existing if isinstance(existing,dict) else json.loads(existing)
                return {'status':'stored' if existing==entry else 'conflict','id':entry['id'],'duplicate':existing==entry}
    with _lock, sqlite3.connect(db_path) as conn:
        conn.execute('CREATE TABLE IF NOT EXISTS calendar_audit (sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, payload TEXT NOT NULL)')
        conn.execute('BEGIN IMMEDIATE')
        row=conn.execute('SELECT payload FROM calendar_audit WHERE id=?',(entry['id'],)).fetchone()
        if row:
            same=json.loads(row[0])==entry
            return {'status':'stored' if same else 'conflict','id':entry['id'],'duplicate':same}
        conn.execute('INSERT INTO calendar_audit (id,payload) VALUES (?,?)',(entry['id'],payload))
        conn.commit()
        return {'status':'stored','id':entry['id'],'duplicate':False}
