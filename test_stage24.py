import os, tempfile, unittest
from unittest.mock import patch
import google_calendar as g

class Stage24Tests(unittest.TestCase):
 def test_configuration_defaults_off(self):
  with patch.object(g,'CLIENT_ID',''):
   self.assertFalse(g.ready())
 def test_oauth_pkce_one_time(self):
  with tempfile.TemporaryDirectory() as d, patch.object(g,'DB',__import__('pathlib').Path(d)/'db.sqlite'), patch.object(g,'DATABASE_URL',''), patch.object(g,'CLIENT_ID','client'), patch.object(g,'CLIENT_SECRET','secret'), patch.object(g,'REDIRECT_URI','http://localhost:8080/api/calendar/callback'), patch.object(g,'KEY','placeholder'):
   url=g.begin(); from urllib.parse import parse_qs,urlparse
   q=parse_qs(urlparse(url).query); self.assertEqual(q['scope'][0],g.SCOPE)
   self.assertEqual(q['code_challenge_method'][0],'S256')
   with patch.object(g,'post_token',return_value={'refresh_token':'test-refresh'}), patch.object(g,'store') as store:
    g.finish(q['state'][0],'code'); store.assert_called_once()
    with self.assertRaises(ValueError): g.finish(q['state'][0],'code')
 def test_window_validation(self):
  with self.assertRaises(ValueError): g.fetch_events('2026-01-01T00:00:00Z','2026-05-01T00:00:00Z')
if __name__=='__main__': unittest.main()
