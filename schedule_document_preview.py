"""Read-only schedule candidate extraction. Explicit date + start/end time are required."""
import io,re
from datetime import datetime

DATE=r'(?:\d{4}-\d{2}-\d{2}|\d{2}[./-]\d{2}[./-]\d{4})'
TIME=r'(?:[01]?\d|2[0-3]):[0-5]\d'
ROW=re.compile(r'^\s*('+DATE+r')\s*[,;\t ]+('+TIME+r')\s*(?:-|–|—|to|until|\s+)\s*('+TIME+r')\s*[,;\t ]+(.{2,120}?)\s*$',re.I)
ALT=re.compile(r'^\s*(.{2,100}?)\s*[,;\t ]+('+DATE+r')\s*[,;\t ]+('+TIME+r')\s*(?:-|–|—|to|until|\s+)\s*('+TIME+r')\s*$',re.I)
def normalize_date(s):
 for fmt in ('%Y-%m-%d','%d/%m/%Y','%d.%m.%Y','%d-%m-%Y'):
  try:return datetime.strptime(s,fmt).strftime('%Y-%m-%d')
  except ValueError:pass
 return None
def fmt_time(s):
 a,b=s.split(':');return '%02d:%02d'%(int(a),int(b))
def parse_text(text):
 candidates=[];unparsed=0
 for number,line in enumerate(text.splitlines(),1):
  line=' '.join(line.split())
  if not line:continue
  m=ROW.fullmatch(line)
  if m: d,start,end,title=m.groups()
  else:
   m=ALT.fullmatch(line)
   if not m:
    unparsed+=1;continue
   title,d,start,end=m.groups()
  d=normalize_date(d)
  if not d:unparsed+=1;continue
  start,end=fmt_time(start),fmt_time(end)
  if end<=start:unparsed+=1;continue
  candidates.append({'name':title.strip()[:80],'date':d,'start':start,'end':end,'line':number})
  if len(candidates)>=150:break
 return {'candidates':candidates,'unparsedLines':unparsed,'note':'Only explicit dates and start/end times are proposed. Verify and approve each candidate. Unreadable lines are not guessed.'}
def extract(filename,raw):
 name=filename.lower()
 if len(raw)>2_000_000:raise ValueError('File exceeds 2 MB')
 if name.endswith('.pdf'):
  from pypdf import PdfReader
  reader=PdfReader(io.BytesIO(raw),strict=False)
  if reader.is_encrypted:raise ValueError('Encrypted PDF is unsupported')
  if len(reader.pages)>30:raise ValueError('PDF has too many pages (limit 30)')
  text='\n'.join((page.extract_text(extraction_mode='plain') or '') for page in reader.pages)
 elif name.endswith(('.txt','.csv')):
  text=raw.decode('utf-8-sig')
 else:raise ValueError('Use PDF, TXT or CSV')
 return parse_text(text[:300_000])
