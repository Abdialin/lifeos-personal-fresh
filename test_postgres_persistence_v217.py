"""V217 real PostgreSQL integration against GitHub Actions' disposable database.
Never connects to Render; refuses to run without explicit isolated-test flag.
"""
import json
import os
import secrets
import subprocess
import sys
import threading
import unittest
from unittest.mock import patch

class PostgresCAS(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.getenv('LIFEOS_TEST_DISPOSABLE_POSTGRES') != '1':
            raise unittest.SkipTest('Explicit disposable PostgreSQL test flag required')
        url=os.getenv('LIFEOS_DATABASE_URL','')
        from urllib.parse import urlparse
        parsed=urlparse(url)
        if (parsed.scheme!='postgresql' or parsed.hostname not in ('localhost','127.0.0.1')
                or parsed.path!='/lifeos_test' or parsed.port!=5432):
            raise RuntimeError('Refusing any PostgreSQL database except the disposable localhost test DB')
        import server
        cls.api=server
        if not server.DATABASE_URL or server.DATABASE_URL!=url:
            raise RuntimeError('PostgreSQL test backend configuration mismatch')
        server.initialize_postgres_schema()
    def test_atomic_revision_and_persistence_across_python_process(self):
        api=self.api
        self.assertEqual(api.read_storage_status()['backend'],'postgresql')
        self.assertEqual(api.read_state(),(0,None))
        record=lambda x:{'id':x,'name':'Synthetic '+x,'status':'finished',
                         'segments':[{'start':1000,'end':61000}]}
        base={'version':1,'sessions':[record('device-A')],'events':[],
              'schedule':[],'workouts':[],'meals':[],'goals':[],'todos':[]}
        saved,revision=api.save_state(0,base)
        self.assertTrue(saved);self.assertEqual(revision,1)
        self.assertEqual(api.read_state(),(1,base))
        stale,same_revision=api.save_state(0,{'version':1,'sessions':[record('stale')],'events':[]})
        self.assertFalse(stale);self.assertEqual(same_revision,1)
        reviewed=json.loads(json.dumps(base));reviewed['sessions'].append(record('device-B'))
        success,new_revision=api.save_state(1,reviewed)
        self.assertTrue(success);self.assertEqual(new_revision,2)
        rejected,revision=api.save_state(1,base)
        self.assertFalse(rejected);self.assertEqual(revision,2)
        self.assertEqual(api.read_state(),(2,reviewed))
        # New Python process must retrieve the persisted revision and both records.
        program='import server,json;rev,data=server.read_state();print(json.dumps({"revision":rev,"ids":sorted(s["id"] for s in data["sessions"])}))'
        result=subprocess.run([sys.executable,'-c',program],env=os.environ.copy(),
                              capture_output=True,text=True,check=True,timeout=15)
        last=json.loads(result.stdout.strip())
        self.assertEqual(last,{'revision':2,'ids':['device-A','device-B']})
        self.assertEqual(api.read_storage_status()['revision'],2)
        self.assert_concurrent_writers(api,2,reviewed,'existing')
        print('V217 real disposable PostgreSQL: CAS, conflict rejection, persistent records PASS')

    def assert_concurrent_writers(self, api, expected, baseline, suffix):
        # A calendar decision and a normal workspace save can race at the same
        # revision. Pause the calendar transaction just after its revision read
        # and start the other writer; at most one may report success.
        import atomic_calendar
        import psycopg
        selected=threading.Event(); writer_started=threading.Event()
        writer_finished=threading.Event(); release=threading.Event()
        result={}; failures=[]
        real_connect=psycopg.connect

        class CursorProxy:
            def __init__(self, cursor): self.cursor=cursor
            def __enter__(self): self.cursor.__enter__(); return self
            def __exit__(self, *args): return self.cursor.__exit__(*args)
            def execute(self, sql, *args, **kwargs):
                query=' '.join(str(sql).upper().split())
                if threading.current_thread().name=='normal-writer' and query.startswith(('UPDATE LIFEOS.STATE','INSERT INTO LIFEOS.STATE')):
                    writer_started.set()
                self.cursor.execute(sql, *args, **kwargs)
                if threading.current_thread().name=='calendar-writer' and query.startswith('SELECT REVISION FROM LIFEOS.STATE WHERE ID=1'):
                    selected.set()
                    if not release.wait(10): raise RuntimeError('Calendar race test timed out')
                return self
            def fetchone(self): return self.cursor.fetchone()

        class ConnectionProxy:
            def __init__(self, conn): self.conn=conn
            def __enter__(self): self.conn.__enter__(); return self
            def __exit__(self, *args): return self.conn.__exit__(*args)
            def cursor(self): return CursorProxy(self.conn.cursor())

        def connect(*args, **kwargs): return ConnectionProxy(real_connect(*args, **kwargs))
        record=lambda x:{'id':x,'name':'Synthetic '+x,'status':'finished','segments':[{'start':1000,'end':61000}]}
        calendar_data=json.loads(json.dumps(baseline)); calendar_data['sessions'].append(record('calendar-only'))
        normal_data=json.loads(json.dumps(baseline)); normal_data['sessions'].append(record('normal-only'))
        decision={'id':'calendar-race-'+suffix,'at':'2026-11-27T00:00:00Z','action':'approve','planId':'fixture-plan','proposalId':'fixture-proposal'}
        def calendar_writer():
            try: result['calendar']=atomic_calendar.commit(None,api.DATABASE_URL,expected,calendar_data,decision)
            except Exception as exc: failures.append(exc)
        def normal_writer():
            try: result['normal']=api.save_state(expected,normal_data)
            except Exception as exc: failures.append(exc)
            finally: writer_finished.set()

        with patch.object(psycopg,'connect',side_effect=connect):
            calendar=threading.Thread(target=calendar_writer,name='calendar-writer')
            normal=threading.Thread(target=normal_writer,name='normal-writer')
            calendar.start()
            try:
                self.assertTrue(selected.wait(5),'Calendar transaction did not read the revision')
                normal.start()
                self.assertTrue(writer_started.wait(5),'Normal writer did not attempt its update')
                writer_finished.wait(1)
            finally:
                release.set()
                calendar.join(10)
                if normal.ident is not None: normal.join(10)
        self.assertFalse(calendar.is_alive() or normal.is_alive(),'Concurrent writers did not finish')
        self.assertEqual(failures,[])
        calendar_won=result['calendar']['status']=='committed'
        normal_won=result['normal'][0]
        self.assertNotEqual(calendar_won,normal_won,'Exactly one writer can commit the same revision')
        self.assertEqual(api.read_state(),(expected+1,calendar_data if calendar_won else normal_data))
        with psycopg.connect(api.DATABASE_URL,connect_timeout=10) as db:
            audit=db.execute('SELECT id FROM lifeos.calendar_audit WHERE id=%s',(decision['id'],)).fetchall()
        self.assertEqual(len(audit),1 if calendar_won else 0,'A rejected calendar write must not create an audit entry')

    def test_first_creation_race(self):
        # A newly created random database belongs exclusively to this local
        # integration test; never clear or reuse an existing database.
        import psycopg
        from psycopg import sql
        from urllib.parse import urlsplit, urlunsplit
        api=self.api
        database='lifeos_test_race_'+secrets.token_hex(8)
        parts=urlsplit(api.DATABASE_URL)
        isolated_url=urlunsplit((parts.scheme,parts.netloc,'/'+database,parts.query,parts.fragment))
        created=False
        try:
            with psycopg.connect(api.DATABASE_URL,autocommit=True,connect_timeout=10) as db:
                db.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(database)))
            created=True
            with patch.object(api,'DATABASE_URL',isolated_url):
                api.initialize_postgres_schema()
                self.assertEqual(api.read_state(),(0,None))
                self.assert_concurrent_writers(api,0,{'version':1,'sessions':[],'events':[]},'initial')
        finally:
            if created:
                with psycopg.connect(api.DATABASE_URL,autocommit=True,connect_timeout=10) as db:
                    db.execute(sql.SQL('DROP DATABASE {}').format(sql.Identifier(database)))

if __name__=='__main__':unittest.main()
