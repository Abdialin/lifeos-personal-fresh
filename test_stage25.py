import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse
import google_calendar as g

class Stage25Tests(unittest.TestCase):
    def fetch(self, pages):
        calls=[]
        def page(url, token):
            calls.append(parse_qs(urlparse(url).query))
            return pages[len(calls)-1]
        with patch.object(g, 'load', return_value={'refresh_token':'refresh'}), \
             patch.object(g, 'post_token', return_value={'access_token':'access'}), \
             patch.object(g, 'google_page', side_effect=page):
            result=g.fetch_events('2026-11-08T00:00:00Z','2026-11-15T00:00:00Z')
        return result,calls

    def test_pagination_and_recurring_instances(self):
        pages=[{'items':[{'id':'a','summary':'A','start':{'dateTime':'2026-11-09T10:00:00Z'},'end':{'dateTime':'2026-11-09T11:00:00Z'},'recurringEventId':'series'}], 'nextPageToken':'next'},
               {'items':[{'id':'a','start':{'date':'2026-11-09'},'end':{'date':'2026-11-10'}}, {'id':'b','start':{'date':'2026-11-10'},'end':{'date':'2026-11-11'}}]}]
        result,calls=self.fetch(pages)
        self.assertEqual([x['uid'] for x in result['events']],['a','b'])
        self.assertEqual(result['events'][0]['recurring_event_id'],'series')
        self.assertEqual(calls[1]['pageToken'],['next'])
        self.assertEqual(result['pages_fetched'],2)
        self.assertFalse(result['truncated'])

    def test_repeated_token_fails_closed(self):
        with self.assertRaisesRegex(ValueError,'repeated'):
            self.fetch([{'items':[],'nextPageToken':'x'},{'items':[],'nextPageToken':'x'}])

    def test_page_failure_never_returns_partial_preview(self):
        with patch.object(g,'load',return_value={'refresh_token':'r'}),patch.object(g,'post_token',return_value={'access_token':'a'}),patch.object(g,'google_page',side_effect=[{'items':[],'nextPageToken':'x'},RuntimeError('offline')]):
            with self.assertRaisesRegex(RuntimeError,'offline'):
                g.fetch_events('2026-11-08T00:00:00Z','2026-11-15T00:00:00Z')

    def test_invalid_time_window(self):
        with self.assertRaises(ValueError):g.fetch_events('2026-11-08T00:00:00','2026-11-09T00:00:00')

if __name__=='__main__':unittest.main()
