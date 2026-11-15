"""Run with: python -m unittest test_schedule_table_preview_v98.py
XLSX tests require openpyxl (requirements-v3.2.txt).
All inputs are synthetic, and no LifeOS data is written.
"""
import io
import unittest
from schedule_table_preview_v98 import extract,parse_rows

class ImportTableTests(unittest.TestCase):
 def test_explicit_csv_columns(self):
  raw=b'date,start,end,title\n2026-11-20,09:00,10:30,Study\n'
  result=extract('plan.csv',raw)
  self.assertEqual(result['candidates'][0]['name'],'Study')
  self.assertEqual(result['candidates'][0]['date'],'2026-11-20')
 def test_swapped_swedish_headers(self):
  rows=[['Aktivitet','Datum','Starttid','Sluttid'],['Gym','20/11/2026','18:00','19:30']]
  result=parse_rows(rows)
  self.assertEqual(result['candidates'][0]['name'],'Gym')
 def test_invalid_and_duplicates_are_not_added(self):
  rows=[['date','start','end','title'],['2026-11-20','10:00','09:00','Bad'],
   ['2026-11-20','09:00','10:00','Study'],['2026-11-20','09:00','10:00','Study']]
  result=parse_rows(rows)
  self.assertEqual(len(result['candidates']),1)
  self.assertEqual(result['unparsedLines'],1)
  self.assertEqual(result['duplicateLines'],1)
 def test_missing_columns_rejected(self):
  with self.assertRaises(ValueError):parse_rows([['date','start','title'],['2026-11-20','09:00','Study']])
 def test_no_overnight_assumption(self):
  result=parse_rows([['date','start','end','title'],['2026-11-20','23:00','01:00','Night shift']])
  self.assertEqual(len(result['candidates']),0)
 def test_xlsx(self):
  try:from openpyxl import Workbook
  except ImportError:self.skipTest('openpyxl is not installed')
  book=Workbook();sheet=book.active;sheet.append(['date','start','end','title'])
  sheet.append(['2026-11-20','09:00','10:00','Work'])
  stream=io.BytesIO();book.save(stream)
  self.assertEqual(extract('plan.xlsx',stream.getvalue())['candidates'][0]['name'],'Work')
 def test_formula_rejected(self):
  try:from openpyxl import Workbook
  except ImportError:self.skipTest('openpyxl is not installed')
  book=Workbook();sheet=book.active;sheet.append(['date','start','end','title'])
  sheet.append(['2026-11-20','09:00','10:00','=NOW()'])
  stream=io.BytesIO();book.save(stream)
  with self.assertRaisesRegex(ValueError,'formula'):extract('plan.xlsx',stream.getvalue())

if __name__=='__main__':unittest.main()
