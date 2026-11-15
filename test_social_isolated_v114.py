"""Synthetic V111–V114 social domain regression tests.
Run: python -m unittest test_social_isolated_v114.py
Uses in-memory temporary SQLite files, never touching real LifeOS data.
"""
import tempfile
import unittest
from pathlib import Path
from datetime import datetime, timezone
import personal_social_isolated_v114 as social

NOW = int(datetime(2026,11,15,12,0,tzinfo=timezone.utc).timestamp())
DAY = '2026-11-15'
class SocialTests(unittest.TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory()
        self.db=Path(self.folder.name)/'social.sqlite'
        social.initialize(self.db)
        social.register(self.db,'alice','correct-horse-battery-alice')
        social.register(self.db,'bob','correct-horse-battery-bob')
        social.register(self.db,'cara','correct-horse-battery-cara')
        self.alice=social.login(self.db,'alice','correct-horse-battery-alice',NOW)
        self.bob=social.login(self.db,'bob','correct-horse-battery-bob',NOW)
        self.cara=social.login(self.db,'cara','correct-horse-battery-cara',NOW)
    def tearDown(self):self.folder.cleanup()
    def connect(self):
        invitation=social.invite(self.db,self.alice,'bob',NOW)
        self.assertEqual(len(social.inbox(self.db,self.bob,NOW)),1)
        with self.assertRaises(PermissionError):
            social.respond(self.db,self.cara,invitation,True,NOW)
        self.assertTrue(social.respond(self.db,self.bob,invitation,True,NOW))
    def test_authentication_is_isolated(self):
        with self.assertRaises(ValueError):
            social.login(self.db,'alice','wrong-password',NOW)
        with self.assertRaises(PermissionError):
            social.inbox(self.db,'not-a-real-token',NOW)
        with self.assertRaises(PermissionError):
            social.inbox(self.db,self.alice,NOW+social.SESSION_TTL+1)
    def test_private_by_default_and_metric_consent(self):
        self.connect()
        social.publish(self.db,self.alice,'workoutDays',7,DAY,4,NOW)
        social.publish(self.db,self.alice,'habitDays',7,DAY,5,NOW)
        self.assertEqual(social.leaderboard(self.db,self.bob,'workoutDays',7,DAY,NOW),[])
        social.set_grant(self.db,self.alice,'bob','workoutDays',True,NOW)
        self.assertEqual(social.leaderboard(self.db,self.bob,'workoutDays',7,DAY,NOW)[0]['score'],4)
        self.assertEqual(social.leaderboard(self.db,self.bob,'habitDays',7,DAY,NOW),[])
        self.assertEqual(social.leaderboard(self.db,self.cara,'workoutDays',7,DAY,NOW),[])
    def test_revoke_and_remove_invalidate_access(self):
        self.connect()
        social.publish(self.db,self.alice,'workoutDays',7,DAY,4,NOW)
        social.set_grant(self.db,self.alice,'bob','workoutDays',True,NOW)
        social.set_grant(self.db,self.alice,'bob','workoutDays',False,NOW)
        self.assertEqual(social.leaderboard(self.db,self.bob,'workoutDays',7,DAY,NOW),[])
        social.set_grant(self.db,self.alice,'bob','workoutDays',True,NOW)
        social.remove_friend(self.db,self.bob,'alice',NOW)
        self.assertEqual(social.leaderboard(self.db,self.bob,'workoutDays',7,DAY,NOW),[])
    def test_card_expiry_and_self_reported_marker(self):
        self.connect()
        social.set_grant(self.db,self.alice,'bob','workoutDays',True,NOW)
        social.publish(self.db,self.alice,'workoutDays',7,DAY,4,NOW)
        self.assertEqual(social.leaderboard(self.db,self.bob,'workoutDays',7,DAY,NOW)[0]['verified'],False)
        later=NOW+social.SHARE_TTL+1
        refreshed=social.login(self.db,'bob','correct-horse-battery-bob',later)
        self.assertEqual(social.leaderboard(self.db,refreshed,'workoutDays',7,DAY,later),[])
    def test_rejects_invalid_metrics(self):
        with self.assertRaises(ValueError):
            social.publish(self.db,self.alice,'prayerTimes',7,DAY,4,NOW)
        with self.assertRaises(ValueError):
            social.publish(self.db,self.alice,'workoutDays',7,DAY,8,NOW)
        with self.assertRaises(ValueError):
            social.publish(self.db,self.alice,'workoutDays',7,'2026-02-30',3,NOW)
        with self.assertRaises(PermissionError):
            social.set_grant(self.db,self.alice,'bob','workoutDays',True,NOW)
if __name__=='__main__':unittest.main()
