import unittest
from lifeos_planning import day_metrics, recommendation, merged_duration, DAY_MS

class PlanningFoundationTests(unittest.TestCase):
    def test_overlap_not_double_counted_as_unique(self):
        s=[{'segments':[{'start':0,'end':3600000}]},{'segments':[{'start':1800000,'end':5400000}]}]
        r=day_metrics(s,0,5400000)
        self.assertEqual((r['actual_total_ms'],r['actual_unique_ms'],r['overlap_ms']), (7200000,5400000,1800000))
    def test_overnight_clipped(self):
        r=day_metrics([{'segments':[{'start':-3600000,'end':3600000}]}],0,DAY_MS)
        self.assertEqual(r['actual_unique_ms'],3600000)
    def test_unlogged_is_not_distraction(self):
        r=day_metrics([],0,3600000)
        self.assertEqual(r['unlogged_gaps'][0]['classification'],'unlogged')
    def test_invalid_segments_ignored(self):
        self.assertEqual(merged_duration([{'start':5,'end':2},{'start':'x','end':9}]),0)
    def test_suggestion_requires_two_weeks(self):
        self.assertEqual(recommendation({'weekly_target':2},[{'verified':True}]*13)['status'],'insufficient_data')
    def test_recovery_risk_blocks_increase(self):
        days=[{'verified':True,'goal_completed':1,'recovery_risk':False} for _ in range(14)]
        days[-1]['recovery_risk']=True
        self.assertEqual(recommendation({'weekly_target':2},days)['status'],'hold')
    def test_suggestion_requires_approval(self):
        days=[{'verified':True,'goal_completed':1,'recovery_risk':False} for _ in range(14)]
        r=recommendation({'weekly_target':2},days)
        self.assertTrue(r['requires_approval'])
        self.assertFalse(r['applied'])
if __name__=='__main__': unittest.main()
