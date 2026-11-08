import tempfile,sqlite3,unittest,concurrent.futures
from pathlib import Path
from atomic_calendar import commit

class AtomicTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.db=Path(self.tmp.name)/'test.db'
  with sqlite3.connect(self.db) as c:c.execute('CREATE TABLE state(id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,payload TEXT NOT NULL)')
  self.data={'version':1,'sessions':[],'events':[]}
  self.entry={'id':'one','at':'2026-11-08T00:00:00Z','action':'reschedule','planId':'p','proposalId':'q'}
 def tearDown(self):self.tmp.cleanup()
 def test_atomic_replay(self):
  self.assertEqual(commit(self.db,'',0,self.data,self.entry)['status'],'committed')
  self.assertEqual(commit(self.db,'',0,self.data,self.entry)['status'],'duplicate')
  with sqlite3.connect(self.db) as c:
   self.assertEqual(c.execute('SELECT count(*) FROM calendar_audit').fetchone()[0],1)
   self.assertEqual(c.execute('SELECT revision FROM state').fetchone()[0],1)
 def test_conflicts(self):
  commit(self.db,'',0,self.data,self.entry)
  changed={**self.entry,'action':'skip'}
  self.assertEqual(commit(self.db,'',1,self.data,changed)['status'],'decision_conflict')
  other={**self.entry,'id':'two'}
  self.assertEqual(commit(self.db,'',0,self.data,other)['status'],'revision_conflict')
 def test_parallel(self):
  entries=[{**self.entry,'id':str(i)} for i in range(8)]
  with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
   results=list(pool.map(lambda e:commit(self.db,'',0,self.data,e),entries))
  self.assertEqual(sum(r['status']=='committed' for r in results),1)
 def test_validation_rolls_back(self):
  with self.assertRaises(ValueError):commit(self.db,'',0,{},self.entry)
  with sqlite3.connect(self.db) as c:self.assertEqual(c.execute('SELECT count(*) FROM state').fetchone()[0],0)
if __name__=='__main__':unittest.main()
