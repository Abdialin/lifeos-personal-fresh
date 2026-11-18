"""V217 real PostgreSQL integration against GitHub Actions' disposable database.
Never connects to Render; refuses to run without explicit isolated-test flag.
"""
import json
import os
import subprocess
import sys
import unittest

class PostgresCAS(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.getenv('LIFEOS_TEST_DISPOSABLE_POSTGRES') != '1':
            raise unittest.SkipTest('Explicit disposable PostgreSQL test flag required')
        url=os.getenv('LIFEOS_DATABASE_URL','')
        if not url.startswith('postgresql://localhost:') and not url.startswith('postgresql://127.0.0.1:'):
            raise RuntimeError('Refusing non-local PostgreSQL database URL')
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
        print('V217 real disposable PostgreSQL: CAS, conflict rejection, persistent records PASS')

if __name__=='__main__':unittest.main()
