"""Stage 22: backend contract tests, including simulated PostgreSQL CAS semantics.
Simulation is not a substitute for testing against a running PostgreSQL instance.
"""
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import types
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent


def load_backend(name, env, fake_psycopg=None):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'server.py')
    module = importlib.util.module_from_spec(spec)
    with patch.dict(os.environ, env, clear=True):
        if fake_psycopg is None:
            spec.loader.exec_module(module)
        else:
            with patch.dict(sys.modules, {'psycopg': fake_psycopg, 'psycopg.types': fake_psycopg.types,
                                          'psycopg.types.json': fake_psycopg.types.json}):
                spec.loader.exec_module(module)
    return module


def sample(n):
    return {'version': 1, 'sessions': [{'id': 'a', 'name': f'Study {n}'}], 'events': [],
            'todos': [], 'workouts': [], 'meals': [], 'goals': [], 'schedule': []}


with tempfile.TemporaryDirectory() as tmp:
    db = str(Path(tmp) / 'stage22.sqlite')
    mod = load_backend('lifeos_sqlite_stage22', {'LIFEOS_DB': db})
    assert mod.read_state() == (0, None)
    assert mod.save_state(0, sample(1)) == (True, 1)
    assert mod.save_state(0, sample(2)) == (False, 1)
    assert mod.read_state() == (1, sample(1))
    assert mod.save_state(1, sample(3)) == (True, 2)
    assert mod.save_state(1, sample(4)) == (False, 2)
    assert mod.read_state() == (2, sample(3))
    with sqlite3.connect(db) as conn:
        assert conn.execute('SELECT COUNT(*) FROM state').fetchone()[0] == 1
    print('PASS: SQLite CAS, conflict, payload preservation, one-row invariant')


class FakeJsonb:
    def __init__(self, obj): self.obj = obj


class FakeCursor:
    def __init__(self, db): self.db = db; self.result = None
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def execute(self, sql, params=()):
        normalized = ' '.join(sql.split()).upper()
        self.db.statements.append(normalized)
        if normalized.startswith('INSERT INTO LIFEOS.STATE'):
            assert 'ON CONFLICT (ID) DO NOTHING' in normalized
            if self.db.revision == 0:
                self.db.revision = 1; self.db.payload = params[0].obj; self.result = (1,)
            else: self.result = None
        elif normalized.startswith('UPDATE LIFEOS.STATE'):
            assert 'WHERE ID=1 AND REVISION=%S' in normalized
            if self.db.revision == params[1]:
                self.db.revision += 1; self.db.payload = params[0].obj
                self.result = (self.db.revision,)
            else: self.result = None
        elif normalized.startswith('SELECT REVISION,PAYLOAD FROM LIFEOS.STATE'):
            self.result = (self.db.revision, self.db.payload) if self.db.revision else None
        elif normalized.startswith('SELECT REVISION FROM LIFEOS.STATE'):
            self.result = (self.db.revision,) if self.db.revision else None
        else: raise AssertionError('Unexpected SQL: ' + normalized)
    def fetchone(self): return self.result


class FakeConnection:
    def __init__(self, db): self.db = db
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def cursor(self): return FakeCursor(self.db)


class FakeDatabase:
    revision = 0
    payload = None
    def __init__(self): self.statements = []; self.revision = 0; self.payload = None
    def connect(self, url, connect_timeout):
        assert url == 'postgresql://test-only/isolated' and connect_timeout == 10
        return FakeConnection(self)


fake_db = FakeDatabase()
psycopg = types.ModuleType('psycopg')
psycopg.connect = fake_db.connect
psycopg.types = types.ModuleType('psycopg.types')
psycopg.types.json = types.ModuleType('psycopg.types.json')
psycopg.types.json.Jsonb = FakeJsonb
mod = load_backend('lifeos_postgres_simulated_stage22',
                   {'LIFEOS_DATABASE_URL': 'postgresql://test-only/isolated'}, psycopg)
assert mod.read_state() == (0, None)
assert mod.save_state(0, sample(1)) == (True, 1)
assert mod.save_state(0, sample(2)) == (False, 1)
assert mod.save_state(1, sample(3)) == (True, 2)
assert mod.save_state(1, sample(4)) == (False, 2)
assert mod.read_state() == (2, sample(3))
assert len(fake_db.statements) >= 7
print('PASS: simulated PostgreSQL insert/update CAS, conflict, JSONB payload and SQL contract')

sql = (ROOT / 'postgres_schema.sql').read_text()
assert 'CREATE SCHEMA IF NOT EXISTS lifeos' in sql
assert 'CREATE TABLE IF NOT EXISTS lifeos.state' in sql
assert 'payload jsonb NOT NULL' in sql
print('PASS: PostgreSQL schema definition present')
