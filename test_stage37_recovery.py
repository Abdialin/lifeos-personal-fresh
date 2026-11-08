"""Stage 37: real HTTP recovery/atomicity tests; isolated temporary SQLite DB."""
import unittest
from test_stage36_http import MultiDeviceHTTP

class Stage37Recovery(MultiDeviceHTTP):
    def test_recovery_after_lost_ack_and_subsequent_change(self):
        base={'version':1,'sessions':[{'id':'real-session','name':'Protected'}], 'events':[], 'schedule':[{'id':'old-plan','name':'Study'}]}
        self.assertEqual(self.request('PUT','/api/state',{'revision':0,'data':base})[0],200)
        decision={'id':'stage37-commit','at':'2026-11-08T00:00:00Z','action':'reschedule','planId':'old-plan','proposalId':'change-1'}
        changed={**base,'schedule':[{'id':'old-plan','name':'Study updated'}]}
        req={'revision':1,'data':changed,'decision':decision}
        self.assertEqual(self.request('POST','/api/calendar/commit',req)[0],200)
        # Simulate lost acknowledgement and process restart before retry.
        self.stop(); self.start()
        status, response=self.request('POST','/api/calendar/commit',req)
        self.assertEqual((status,response['status'],response['revision']),(200,'duplicate',2))
        self.assertEqual(self.request('GET','/api/state')[1]['data'],changed)
        # Another device changes the workspace after the original commit.
        next_state={**changed,'events':[{'id':'another-device'}]}
        self.assertEqual(self.request('PUT','/api/state',{'revision':2,'data':next_state})[0],200)
        status, response=self.request('POST','/api/calendar/commit',req)
        self.assertEqual((status,response['status'],response['revision']),(200,'duplicate',3))
        self.assertEqual(self.request('GET','/api/state')[1]['data'],next_state)

    def test_rejected_conflict_preserves_workspace_and_audit(self):
        base={'version':1,'sessions':[{'id':'keep'}],'events':[]}
        self.assertEqual(self.request('PUT','/api/state',{'revision':0,'data':base})[0],200)
        d={'id':'stage37-same-id','at':'2026-11-08T00:00:00Z','action':'skip','planId':'p','proposalId':'q'}
        changed={**base,'events':[{'id':'first'}]}
        self.assertEqual(self.request('POST','/api/calendar/commit',{'revision':1,'data':changed,'decision':d})[0],200)
        bad={**d,'action':'reschedule'}
        status,result=self.request('POST','/api/calendar/commit',{'revision':2,'data':base,'decision':bad})
        self.assertEqual(status,409)
        self.assertEqual(result['status'],'decision_conflict')
        self.assertEqual(self.request('GET','/api/state')[1],{'revision':2,'data':changed})

if __name__=='__main__': unittest.main()
