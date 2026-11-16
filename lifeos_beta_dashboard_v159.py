"""V159 owner-isolated beta LifeOS dashboard. Does not access the legacy workspace."""
import html
import time
from datetime import datetime, timezone
from urllib.parse import urlparse
from zoneinfo import ZoneInfo
import lifeos_beta_accounts_v155 as beta

TZ=ZoneInfo('Europe/Stockholm')
KINDS=('plan','task')
STATES=('running','paused','finished')

def esc(x):
    return html.escape(str(x),quote=True)

def init(db):
    beta._init(db)
    beta._workspace_init(db)
    with db.cursor() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS lifeos_beta_accounts.timers_v159(
            id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            user_id bigint NOT NULL REFERENCES lifeos_beta_accounts.users(id) ON DELETE CASCADE,
            title text NOT NULL,
            started_at timestamptz NOT NULL DEFAULT now(),
            last_resumed_at timestamptz,
            accumulated_seconds bigint NOT NULL DEFAULT 0,
            state text NOT NULL DEFAULT 'running' CHECK (state IN ('running','paused','finished')),
            finished_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now())""")
        c.execute("""CREATE INDEX IF NOT EXISTS beta_timers_owner_idx
            ON lifeos_beta_accounts.timers_v159(user_id,created_at DESC)""")

def db_data(db,uid):
    with db.cursor() as c:
        c.execute("""SELECT id,kind,title,starts_at,ends_at,completed
            FROM lifeos_beta_accounts.workspace_items WHERE user_id=%s
            ORDER BY created_at DESC LIMIT 250""",(uid,))
        items=c.fetchall()
        c.execute("""SELECT id,title,started_at,last_resumed_at,accumulated_seconds,state,finished_at
            FROM lifeos_beta_accounts.timers_v159 WHERE user_id=%s ORDER BY created_at DESC LIMIT 160""",(uid,))
        timers=c.fetchall()
    return items,timers

def fmt(dt):
    return dt.astimezone(TZ).strftime('%a %d %b · %H:%M') if dt else ''

def elapsed(t,now=None):
    now=now or datetime.now(timezone.utc)
    return int(t[4]+max(0,(now-t[3]).total_seconds())) if t[5]=='running' and t[3] else int(t[4])

def nice(seconds):
    seconds=max(0,int(seconds))
    return str(seconds//3600)+'h '+str(seconds%3600//60)+'m'

def form_button(label,action,itemid,secret,klass=''):
    return ('<form method="post" action="/account/app/action" class="inline">'+
       '<input type="hidden" name="csrf" value="'+beta._csrf_token(secret,'app-action')+'">'+
       '<input type="hidden" name="action" value="'+esc(action)+'">'+
       '<input type="hidden" name="id" value="'+esc(itemid)+'">'+
       '<button class="'+klass+'" type="submit">'+esc(label)+'</button></form>')

def render(user,items,timers,secret,tab):
    uid,name,*_=user
    plans=[i for i in items if i[1]=='plan']
    tasks=[i for i in items if i[1]=='task']
    active=[t for t in timers if t[5]!='finished']
    finished=[t for t in timers if t[5]=='finished']
    total=sum(elapsed(t) for t in finished)
    today=datetime.now(TZ).date()
    today_plans=[i for i in plans if i[3] and i[3].astimezone(TZ).date()==today]
    nav=''.join('<a href="/account/app?tab='+t+'" '+('aria-current="page"' if tab==t else '')+'>'+label+'</a>' for t,label in
      [('today','Today'),('track','Track'),('plan','Plan'),('tasks','Tasks'),('insights','Insights')])
    def card(title,content):
        return '<section class="card"><h2>'+title+'</h2>'+content+'</section>'
    def metric(v,label):
        return '<div class="metric"><strong>'+esc(v)+'</strong><span>'+esc(label)+'</span></div>'
    def create(action,label,fields):
        return '<form class="stack" method="post" action="/account/app/action"><input type="hidden" name="csrf" value="'+beta._csrf_token(secret,'app-action')+'"><input type="hidden" name="action" value="'+action+'">'+fields+'<button type="submit" class="primary">'+label+'</button></form>'
    nameinput='<label>Activity name<input name="title" required maxlength="140" placeholder="e.g. Focused studying"></label>'
    entryform='<label>Title<input name="title" required maxlength="140" placeholder="e.g. Study, gym or meeting"></label>'
    planfields=entryform+'<label>Start time<input type="datetime-local" name="start" required></label><label>End time<input type="datetime-local" name="end" required></label>'
    taskfields=entryform+'<label>Deadline (optional)<input type="datetime-local" name="start"></label>'
    timerlist=''
    for t in active[:25]:
        id,title,start,last,acc,state,end=t
        duration=elapsed(t)
        caution='<p class="warning">Long session: please check whether this is still running.</p>' if duration>3*3600 else ''
        timerlist+='<article class="row"><div><strong>'+esc(title)+'</strong><p>'+esc(state.title())+' · Started '+esc(fmt(start))+'</p><div class="clock" data-seconds="'+str(duration)+'" data-running="'+('1' if state=='running' else '0')+'">'+nice(duration)+'</div>'+caution+'</div><div class="actions">'
        if state=='running':timerlist+=form_button('Pause','pause',id,secret)
        else:timerlist+=form_button('Resume','resume',id,secret)
        timerlist+=form_button('Finish','finish',id,secret,'danger')+'</div></article>'
    if not timerlist:timerlist='<p class="muted">No active timers. Start an activity to track real time.</p>'
    def planlist(data):
        out=''
        for i in sorted(data,key=lambda a:a[3] or datetime.max.replace(tzinfo=timezone.utc))[:65]:
            id,kind,title,start,end,done=i
            out+='<article class="row"><div><strong>'+esc(title)+'</strong><p>'+esc(fmt(start))+' → '+esc(fmt(end))+'</p><small>Planned, not tracked</small></div></article>'
        return out or '<p class="muted">Nothing planned yet.</p>'
    def tasklist():
        out=''
        for i in tasks[:80]:
            id,kind,title,start,end,done=i
            out+='<article class="row"><div><strong>'+esc(title)+'</strong><p>'+('Due '+esc(fmt(start)) if start else 'Flexible task')+'</p><small>'+('Completed' if done else 'Open')+'</small></div>'
            if not done:out+=form_button('Complete','complete',id,secret)
            out+='</article>'
        return out or '<p class="muted">No tasks yet.</p>'
    if tab=='track':
        content=card('Your live activity',timerlist)+card('Start tracking',create('start','Start activity',nameinput))
        content+=card('Recent finished sessions',''.join('<article class="row"><div><strong>'+esc(t[1])+'</strong><p>'+esc(fmt(t[2]))+' · '+nice(elapsed(t))+'</p></div></article>' for t in finished[:25]) or '<p>No completed sessions.</p>')
    elif tab=='plan':
        content=card('Calendar · selected day', '<p class="muted">'+esc(today.strftime('%A %d %B %Y'))+'</p>'+planlist(today_plans))
        content+=card('Add to your schedule',create('plan','Save plan',planfields))
        content+=card('All plans',planlist(plans))
    elif tab=='tasks':
        content=card('My tasks',tasklist())+card('Add a task',create('task','Add task',taskfields))
    elif tab=='insights':
        content=card('Activity summary','<div class="metrics">'+metric(len(finished),'Finished sessions')+metric(nice(total),'Tracked time')+metric(len(active),'Open timers')+metric(len(plans),'Plans')+'</div><p class="muted">This account only. Finished timer durations are summed; overlapping sessions are not deduplicated in this beta view.</p>')
    else:
        content=card('Your day at a glance','<div class="metrics">'+metric(len(today_plans),'Plans today')+metric(len(active),'Active timers')+metric(len([i for i in tasks if not i[5]]),'Open tasks')+metric(nice(total),'Total finished tracking')+'</div>')
        content+=card('Right now',timerlist)
        content+=card('Your schedule today',planlist(today_plans))
        content+='<div class="quick"><a href="/account/app?tab=track">Start tracking →</a><a href="/account/app?tab=plan">Open calendar →</a></div>'
    css="""<style>
:root{color-scheme:dark;font:16px system-ui,sans-serif}*{box-sizing:border-box}body{background:#030e20;color:#edf9fb;margin:0;padding:0 0 90px}
header{padding:18px 18px 16px;max-width:900px;margin:auto;display:flex;justify-content:space-between;align-items:center;gap:10px}
.logo{font-weight:850;font-size:22px}.logo span,.eyebrow{color:#52c7a7}main{max-width:900px;margin:auto;padding:0 14px}
h1{font-size:28px;letter-spacing:-.02em;margin:15px 0 6px}h2{font-size:20px;margin:0 0 16px}
p{line-height:1.5}.muted,.row p,small{color:#96aabb}.eyebrow{font-size:12px;letter-spacing:.12em;font-weight:800;text-transform:uppercase}
.card{padding:22px 18px;border:1px solid #34546b;border-radius:23px;background:#06172c;margin:18px 0}
.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.metric{border:1px solid #34546b;border-radius:15px;padding:16px 12px;min-width:0}
.metric strong{display:block;font-size:26px}.metric span{display:block;color:#96aabb;font-size:13px;margin-top:7px}
.row{padding:17px 0;border-bottom:1px solid #294359;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
.row:last-child{border-bottom:0}.row p{margin:6px 0}.row strong{font-size:17px;overflow-wrap:anywhere}.clock{font-variant-numeric:tabular-nums;font-size:29px;font-weight:800;margin-top:8px}
.actions{display:flex;gap:8px;flex-wrap:wrap}button,a.action,.quick a{background:#1b344d;color:#fff;border:1px solid #45647b;border-radius:12px;padding:12px 14px;font:inherit;font-weight:700;cursor:pointer}
button.primary,.quick a:first-child{background:#006f5a;border-color:#16866c}.danger{border-color:#814758;color:#ffced4}
form.inline{display:inline}.stack{display:grid;gap:16px}label{display:grid;gap:8px;font-weight:700}
input{min-width:0;width:100%;border:1px solid #45647b;border-radius:12px;background:#10263c;color:white;font:inherit;padding:14px}
.quick{display:flex;gap:10px;flex-wrap:wrap}.quick a{text-decoration:none;flex:1;text-align:center}
.warning{color:#ffbe77}a{color:#89dcc6}header a{font-size:13px}
nav{position:fixed;z-index:10;bottom:0;left:0;right:0;display:flex;justify-content:space-around;gap:2px;background:#06152b;border-top:1px solid #2e4f63;padding:10px 4px max(10px,env(safe-area-inset-bottom))}
nav a{padding:13px 7px;color:#a2b5c6;text-decoration:none;font-size:13px;font-weight:800;border-radius:12px;min-width:0;text-align:center}nav a[aria-current=page]{background:#006d55;color:white}
:focus-visible{outline:3px solid #78e5c6;outline-offset:2px}
</style>"""
    js="""<script>document.querySelectorAll('.clock[data-running="1"]').forEach(el=>{let n=Number(el.dataset.seconds)||0;const draw=()=>{let h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;el.textContent=h+'h '+String(m).padStart(2,'0')+'m '+String(s).padStart(2,'0')+'s'};draw();setInterval(()=>{n++;draw()},1000)})</script>"""
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LifeOS · '+esc(tab.title())+'</title>'+css+'</head><body><header><div class="logo">LifeOS <span>Personal</span></div><a href="/account/home">Account &amp; settings</a></header><main><div class="eyebrow">Private beta · isolated account</div><h1>'+esc(tab.title())+'</h1><p class="muted">Welcome back, '+esc(name)+'. Your original LifeOS history remains separate.</p>'+content+'</main><nav aria-label="LifeOS sections">'+nav+'</nav>'+js+'</body></html>'

def get(handler,db_url,secret):
    if not db_url:
        beta._response(handler,503,beta._shell('Unavailable','<h1>Private storage unavailable</h1>'));return
    tab=handler.path.split('tab=',1)[-1].split('&',1)[0] if 'tab=' in handler.path else 'today'
    if tab not in ('today','track','plan','tasks','insights'):tab='today'
    try:
        with beta._db(db_url) as db:
            init(db)
            user=beta._session_user(db,handler)
            if not user:
                beta._response(handler,303,'',location='/account/login');return
            items,timers=db_data(db,user[0])
        beta._response(handler,200,render(user,items,timers,secret,tab))
    except Exception:
        beta._response(handler,503,beta._shell('Unavailable','<h1>Dashboard temporarily unavailable</h1><p>No records were changed.</p>'))

def _trusted_origin(handler):
    """Same-origin check behind Render's reverse proxy; never trust arbitrary forwarded hosts."""
    from urllib.parse import urlsplit
    origin=handler.headers.get('Origin','')
    if not origin:
        return True  # Modern same-site browsers usually send Origin for POST.
    try:
        parsed=urlsplit(origin)
        if parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password:
            return False
        if parsed.port not in (None,443):
            return False
        # The public staging hostname is an allowed origin even when Render uses
        # an internal upstream Host header. Other origins must match Host.
        public='lifeos-personal-test.onrender.com'
        host=(handler.headers.get('Host','').split(':',1)[0]).lower()
        return parsed.hostname.lower() in (public,host)
    except (ValueError,TypeError):
        return False


def post(handler,db_url,secret):
    form=beta._body(handler)
    if not form or not beta._csrf_valid(secret,'app-action',beta._field(form,'csrf')):
        beta._response(handler,403,beta._shell('Rejected','<h1>Form expired or invalid</h1><p>Return to the tracker, reload the page and retry. No activity was created.</p><a href="/account/app?tab=track">Open tracker</a>'));return
    if not _trusted_origin(handler):
        beta._response(handler,403,beta._shell('Rejected','<h1>Request origin not accepted</h1><p>Open LifeOS at its normal address and retry. No activity was created.</p><a href="/account/app?tab=track">Open tracker</a>'));return
    if not beta._throttle(handler,'app-action'):
        beta._response(handler,429,beta._shell('Busy','<h1>Too many requests</h1>'));return
    action=beta._field(form,'action')
    if action not in ('start','pause','resume','finish','plan','task','complete'):
        beta._response(handler,400,beta._shell('Invalid','<h1>Unknown action</h1>'));return
    try:
        with beta._db(db_url) as db:
            init(db)
            user=beta._session_user(db,handler)
            if not user:
                beta._response(handler,303,'',location='/account/login');return
            uid=user[0]
            with db.cursor() as c:
                if action in ('plan','task'):
                    title=beta._field(form,'title');s=beta._field(form,'start');e=beta._field(form,'end')
                    start=beta._datetime(s);end=beta._datetime(e)
                    if not (1<=len(title)<=140) or (s and not start) or (e and not end) or (start and end and end<=start) or (action=='plan' and (not start or not end)):
                        beta._response(handler,400,beta._shell('Check details','<h1>Enter valid dates and title</h1><a href="/account/app?tab=plan">Back</a>'));return
                    c.execute('INSERT INTO lifeos_beta_accounts.workspace_items (user_id,kind,title,starts_at,ends_at) VALUES (%s,%s,%s,%s,%s)',(uid,action,title,start,end))
                elif action=='start':
                    title=beta._field(form,'title')
                    if not 1<=len(title)<=140:
                        beta._response(handler,400,beta._shell('Invalid','<h1>Enter an activity name</h1>'));return
                    # Serialize per-user timer transitions.
                    c.execute('SELECT id FROM lifeos_beta_accounts.users WHERE id=%s FOR UPDATE',(uid,))
                    c.execute("""SELECT count(*) FROM lifeos_beta_accounts.timers_v159
                       WHERE user_id=%s AND state='running'""",(uid,))
                    if c.fetchone()[0]:
                        beta._response(handler,409,beta._shell('Already running','<h1>Pause or finish your current timer first</h1><a href="/account/app?tab=track">Open tracker</a>'));return
                    c.execute("""INSERT INTO lifeos_beta_accounts.timers_v159
                        (user_id,title,last_resumed_at) VALUES (%s,%s,now())""",(uid,title))
                else:
                    raw=beta._field(form,'id')
                    if not raw.isdecimal() or len(raw)>18:raise ValueError('Invalid record')
                    id=int(raw)
                    if action=='complete':
                        c.execute("""UPDATE lifeos_beta_accounts.workspace_items SET completed=true
                            WHERE id=%s AND user_id=%s AND kind='task'""",(id,uid))
                    else:
                        c.execute('SELECT id FROM lifeos_beta_accounts.users WHERE id=%s FOR UPDATE',(uid,))
                        c.execute("""SELECT state,last_resumed_at,accumulated_seconds FROM lifeos_beta_accounts.timers_v159
                            WHERE id=%s AND user_id=%s FOR UPDATE""",(id,uid))
                        row=c.fetchone()
                        if not row:raise ValueError('Unknown timer')
                        state,last,seconds=row
                        if action=='pause' and state=='running':
                            c.execute("""UPDATE lifeos_beta_accounts.timers_v159 SET state='paused',
                                accumulated_seconds=accumulated_seconds+GREATEST(0,EXTRACT(EPOCH FROM (now()-last_resumed_at)))::bigint,
                                last_resumed_at=NULL WHERE id=%s AND user_id=%s""",(id,uid))
                        elif action=='resume' and state=='paused':
                            c.execute("""SELECT count(*) FROM lifeos_beta_accounts.timers_v159
                                WHERE user_id=%s AND state='running'""",(uid,))
                            if c.fetchone()[0]:raise ValueError('Another timer is running')
                            c.execute("""UPDATE lifeos_beta_accounts.timers_v159 SET state='running',
                                last_resumed_at=now() WHERE id=%s AND user_id=%s""",(id,uid))
                        elif action=='finish' and state in ('running','paused'):
                            c.execute("""UPDATE lifeos_beta_accounts.timers_v159 SET state='finished',
                                accumulated_seconds=accumulated_seconds+CASE WHEN state='running'
                                THEN GREATEST(0,EXTRACT(EPOCH FROM (now()-last_resumed_at)))::bigint ELSE 0 END,
                                last_resumed_at=NULL,finished_at=now() WHERE id=%s AND user_id=%s""",(id,uid))
                        else:raise ValueError('Invalid timer transition')
        tab='plan' if action=='plan' else 'tasks' if action in ('task','complete') else 'track'
        beta._response(handler,303,'',location='/account/app?tab='+tab)
    except ValueError:
        beta._response(handler,409,beta._shell('Cannot apply','<h1>Action unavailable</h1><p>Refresh and review the current record.</p><a href="/account/app?tab=track">Back to tracker</a>'))
    except Exception:
        beta._response(handler,503,beta._shell('Unavailable','<h1>Could not save your change</h1><p>No changes to the original shared workspace were attempted.</p>'))
