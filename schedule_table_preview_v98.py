"""LifeOS V98 — conservative CSV/XLSX timetable preview.
No database writes. Only explicit date/start/end/title columns are accepted.
No formula evaluation, guessed timezone, merged-cell inference, or actual logs.
"""
import csv
import io
import re
from datetime import datetime, date, time
from schedule_document_preview import parse_text

ALIASES={
 'date':{'date','day','datum','start date','activity date'},
 'start':{'start','start time','starttime','from','börjar','starttid'},
 'end':{'end','finish','end time','endtime','to','until','slut','sluttid'},
 'title':{'title','activity','event','name','task','subject','aktivitet','namn'}
}
def normalized(s):return re.sub(r'\s+',' ',str(s or '').strip().casefold().replace('_',' '))
def columns(header):
 cols={}
 for i,v in enumerate(header):
  n=normalized(v)
  for key,options in ALIASES.items():
   if n in options:
    if key in cols:raise ValueError('Duplicate '+key+' columns in schedule')
    cols[key]=i
 if len(cols)!=4:raise ValueError('Required columns: date, start, end, title (accepted Swedish equivalents).')
 return cols
def when(value):
 if isinstance(value,datetime):return value.strftime('%Y-%m-%d')
 if isinstance(value,date):return value.isoformat()
 for format in ('%Y-%m-%d','%d/%m/%Y','%d.%m.%Y','%d-%m-%Y'):
  try:return datetime.strptime(str(value).strip(),format).strftime('%Y-%m-%d')
  except ValueError:pass
 return None
def clock(value):
 if isinstance(value,datetime):return value.strftime('%H:%M')
 if isinstance(value,time):return value.strftime('%H:%M')
 if isinstance(value,str) and re.fullmatch(r'(?:[01]?\d|2[0-3]):[0-5]\d',value.strip()):
  h,m=map(int,value.strip().split(':'));return f'{h:02d}:{m:02d}'
 return None
def parse_rows(rows):
 iterator=iter(rows)
 try:header=next(iterator)
 except StopIteration:return {'candidates':[],'unparsedLines':0,'note':'Empty timetable. No plans were created.'}
 col=columns(header)
 candidates=[];uncertain=0;duplicates=0;seen=set()
 for line,row in enumerate(iterator,2):
  if line>2000:raise ValueError('Spreadsheet has more than 1999 data rows')
  if not row or all(x is None or str(x).strip()=='' for x in row):continue
  get=lambda k:row[col[k]] if col[k]<len(row) else None
  d=when(get('date'));start=clock(get('start'));end=clock(get('end'));title=str(get('title') or '').strip()
  if not d or not start or not end or start>=end or not 1<=len(title)<=80:
   uncertain+=1;continue
  key=(d,start,end,title.casefold())
  if key in seen:duplicates+=1;continue
  seen.add(key);candidates.append({'name':title,'date':d,'start':start,'end':end,'line':line})
  if len(candidates)>=150:raise ValueError('More than 150 candidate rows; split the file for review.')
 return {'candidates':candidates,'unparsedLines':uncertain,'duplicateLines':duplicates,
  'note':'Explicit date/start/end/title columns only. Same-day end times are required. No calendar changes or tracked activities have been created.'}
def extract(filename,raw):
 if len(raw)>2_000_000:raise ValueError('File exceeds 2 MB')
 lower=filename.lower()
 if lower.endswith('.csv'):
  try:txt=raw.decode('utf-8-sig')
  except UnicodeError:raise ValueError('CSV must be UTF-8 encoded')
  sample=txt[:4096]
  try:dialect=csv.Sniffer().sniff(sample,delimiters=',;\t')
  except csv.Error:dialect=csv.excel
  return parse_rows(csv.reader(io.StringIO(txt),dialect))
 if lower.endswith('.xlsx'):
  try:from openpyxl import load_workbook
  except ImportError:raise ValueError('XLSX requires openpyxl installed on the server')
  try:book=load_workbook(io.BytesIO(raw),read_only=True,data_only=False)
  except Exception as e:raise ValueError('Could not open XLSX schedule') from e
  if len(book.worksheets)!=1:raise ValueError('For safety, provide a spreadsheet with exactly one worksheet')
  sheet=book.worksheets[0]
  if sheet.max_row>2000 or sheet.max_column>50:raise ValueError('XLSX exceeds supported dimensions')
  rows=sheet.iter_rows(values_only=True)
  for row in rows:
   if any(isinstance(value,str) and value.startswith('=') for value in row):
    raise ValueError('Spreadsheet formulas are not supported in imported schedules')
  # Rows iterator is exhausted after validation; reopen for a deliberate full parse.
  return parse_rows(sheet.iter_rows(values_only=True))
 raise ValueError('Use CSV or XLSX')
