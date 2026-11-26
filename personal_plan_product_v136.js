/* LifeOS Plan V136 — coherent, read-only daily planning workspace.
 * No workspace writes, no synthetic completion, no automatic debt decisions.
 * Existing editor/approval controls are re-used in dedicated drawers. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid=x=>x&&Number.isFinite(+x.startAt)&&Number.isFinite(+x.endAt)&&+x.endAt>+x.startAt;
const datekey=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const startday=s=>{const d=new Date(s+'T12:00:00');d.setHours(0,0,0,0);return d.getTime()};
const hh=t=>new Date(t).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',hour12:false});
const dur=ms=>{const m=Math.round(Math.max(0,ms)/60000);return m>=60?Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m':m+'m'};
const w=()=>{try{return window.lifeosReadOnlyWorkspace?.()||{}}catch{return {}}};
const confirmed=s=>s.status==='finished'&&!s.assumed&&!s.isExample&&!s.developmentExample&&!s.seedBatch&&s.source!=='development-starter'&&s.source!=='assumed-demo';
const preview=s=>!!(s.assumed||s.isExample||s.developmentExample||s.seedBatch||s.source==='development-starter'||s.source==='assumed-demo');
const suspicious=s=>{const m=(+s.endAt- +s.startAt)/60000;return m>1440||m>=180&&/prayer|fajr|dhuhr|asr|maghrib|isha/i.test(s.name||'')||m>=480&&/quran|memorization|arabic/i.test(s.name||'')};
const cat=n=>/fajr|dhuhr|asr|maghrib|isha|prayer|quran|arabic|hadith/i.test(n||'')?'spiritual':/sleep|rest|recovery/i.test(n||'')?'recovery':/gym|walk|run|fitness|exercise/i.test(n||'')?'fitness':/study|read|course|class|assignment/i.test(n||'')?'learning':/shift|work|business|meeting/i.test(n||'')?'work':'personal';
const displayDate=s=>new Date(s+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
const tasks=x=>Array.isArray(x.todos)?x.todos:[];
const all=()=>{const x=w();return {x,plans:(x.schedule||[]).filter(valid).filter(p=>!['cancelled','skipped'].includes(p.status)),real:(x.sessions||[]).filter(valid).filter(confirmed),samples:(x.sessions||[]).filter(valid).filter(preview)}};
const intersect=(r,from,to)=>+r.startAt<to&&+r.endAt>from;
let host,source,selected='overview',anchor=datekey(Date.now()),range='day',compare='reality',compareWindow=7,showAll=false,detailsOpen=false,reviewMode='shortfalls';
function cleanName(s){return String(s||'Activity').trim().toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/g,' ')}
function getDayRows(data,key){const from=startday(key),to=startday(datekey(from+86400000)),plans=data.plans.filter(p=>intersect(p,from,to)),real=data.real.filter(s=>intersect(s,from,to));
 return [...real.map(s=>({name:s.name||'Activity',start:s.startAt,end:s.endAt,kind:'record',category:cat(s.name),flag:suspicious(s),source:s})),...plans.filter(p=>!real.some(s=>String(s.plannedId||'')===String(p.id)||String(p.sessionId||'')===String(s.id))).map(p=>({name:p.name||'Plan',start:p.startAt,end:p.endAt,kind:'plan',category:cat(p.name),flag:false,source:p}))]
 .sort((a,b)=>a.start-b.start||a.kind.localeCompare(b.kind));
}
function tabs(){host.querySelectorAll('[data-v136-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.v136Tab===selected)));host.querySelectorAll('.v136-screen').forEach(x=>x.hidden=x.dataset.v136Screen!==selected)}
function overview(){const d=all(),begin=startday(datekey(Date.now())),finish=startday(datekey(begin+86400000)),plans=d.plans.filter(x=>intersect(x,begin,finish)),records=d.real.filter(x=>intersect(x,begin,finish)),alerts=records.filter(suspicious).length;
 const next=d.plans.filter(x=>+x.startAt>Date.now()).sort((a,b)=>a.startAt-b.startAt)[0];
 $('v136TodayOverview').innerHTML='<div class="v136-kpi-row"><div><strong>'+plans.length+'</strong><span>Planned today</span></div><div><strong>'+records.length+'</strong><span>Finished sessions</span></div><div><strong>'+alerts+'</strong><span>Review duration</span></div></div>'+
 '<div class="v136-next"><div><small>NEXT COMMITMENT</small><strong>'+esc(next?.name||'No upcoming commitments')+'</strong><span>'+ (next?esc(new Date(+next.startAt).toLocaleString(undefined,{weekday:'short',hour:'2-digit',minute:'2-digit'})):'Nothing scheduled')+'</span></div><button type="button" data-v136-action="next" aria-label="Show next commitment">→</button></div>';
}
function periodKeys(){if(range==='month'){const d=new Date(anchor+'T12:00:00');d.setDate(1);return Array.from({length:new Date(d.getFullYear(),d.getMonth()+1,0).getDate()},(_,i)=>datekey(new Date(d.getFullYear(),d.getMonth(),i+1)))}const n=range==='three'?3:range==='week'?7:1;const d=new Date(anchor+'T12:00:00');if(range==='week')d.setDate(d.getDate()-(d.getDay()+6)%7);return Array.from({length:n},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return datekey(x)})}
function dateShift(dir){const d=new Date(anchor+'T12:00:00');if(range==='month'){d.setDate(1);d.setMonth(d.getMonth()+dir)}else d.setDate(d.getDate()+dir*(range==='week'?7:range==='three'?3:1));anchor=datekey(d);showAll=false;renderCalendar()}
function renderCalendar(){
 const d=all(),keys=periodKeys();$('v136PeriodTitle').textContent=range==='month'?new Date(anchor+'T12:00:00').toLocaleDateString(undefined,{month:'long',year:'numeric'}):range==='week'?'Week of '+new Date(keys[0]+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'}):range==='three'?'Next three days':displayDate(anchor);
 host.querySelectorAll('[data-v136-range]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v136Range===range)));
 const grid=keys.map(k=>{const rows=getDayRows(d,k),today=k===datekey(Date.now());return '<button type="button" class="v136-day'+(today?' is-today':'')+(k===anchor?' is-selected':'')+'" data-v136-date="'+k+'"><strong>'+new Date(k+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'})+'</strong><span>'+new Date(k+'T12:00:00').getDate()+'</span><i>'+rows.length+'</i></button>'}).join('');
 $('v136Days').innerHTML=grid; $('v136Days').classList.toggle('v137-month-grid',range==='month');
 const rows=getDayRows(d,anchor),visible=showAll?rows:rows.slice(0,5),b=startday(anchor),e=startday(datekey(b+86400000));
 const dayPlans=d.plans.filter(x=>intersect(x,b,e)),dayReal=d.real.filter(x=>intersect(x,b,e)),flagged=dayReal.filter(suspicious).length;
 const overnight=dayReal.filter(x=>+x.startAt<b).length;
 $('v136DaySummary').innerHTML='<h3>'+esc(displayDate(anchor))+'</h3><p>'+dayPlans.length+' plans · '+dayReal.length+' finished sessions'+(flagged?' · '+flagged+' needs review':'')+'</p>'+(overnight?'<p class="v138-caution">'+overnight+' tracked session'+(overnight===1?'':'s')+' carried over from the previous day. The timeline shows only the time inside this day.</p>':'');
 $('v136Timeline').innerHTML=visible.length?visible.map(x=>{const time=Math.max(x.start,b);const minutes=Math.max(0,Math.round((time-b)/60000));const actual=(Math.max(0,Math.min(+x.end,e)-Math.max(+x.start,b))/60000);
  return '<article class="v136-event" data-kind="'+x.kind+'" data-category="'+x.category+'"><span class="v136-event-time">'+hh(time)+'</span><div class="v136-event-rail"><i></i></div><button type="button" class="v136-event-main v137-activity-open" data-v137-activity="'+esc(x.kind)+'" data-v137-id="'+esc(x.source?.id||'')+'" aria-label="Review '+esc(x.name)+'"><div><strong>'+esc(x.name)+'</strong><span class="v136-pill">'+(x.kind==='record'?'Tracked':'Planned')+'</span></div><small>'+(x.start<b?'Continued · ':'')+dur(actual*60000)+(x.start<b?' this day of '+dur(+x.end- +x.start)+' total':'')+(x.flag?' · Verify total duration':'')+'</small></button></article>'}).join(''):'<div class="v136-empty">No plans or verified sessions for this day.<small>Unlogged time is unknown, not necessarily free.</small></div>';
 $('v136MoreRows').hidden=rows.length<=8;$('v136MoreRows').textContent=showAll?'Show fewer': 'Show '+(rows.length-5)+' more activities';
 const clashes=[];for(let i=0;i<dayPlans.length;i++)for(let j=i+1;j<dayPlans.length;j++)if(intersect(dayPlans[i],+dayPlans[j].startAt,+dayPlans[j].endAt))clashes.push([dayPlans[i],dayPlans[j]]);
 $('v136Conflicts').innerHTML=clashes.length?'<span class="v136-warning">⚠ '+clashes.length+' overlapping plan pair'+(clashes.length===1?'':'s')+' · review before booking more.</span>':'<span class="v136-muted">No overlapping planned activities detected for this day.</span>';
}

function compareUnion(rows){
 const sorted=rows.map(x=>[+x.startAt,+x.endAt]).filter(x=>Number.isFinite(x[0])&&Number.isFinite(x[1])&&x[1]>x[0]).sort((a,b)=>a[0]-b[0]);
 let total=0,overlap=0,prev=null;
 for(const [a,b] of sorted){if(!prev){prev=[a,b];continue}if(a<=prev[1]){overlap+=Math.max(0,Math.min(prev[1],b)-a);prev[1]=Math.max(prev[1],b)}else{total+=prev[1]-prev[0];prev=[a,b]}}
 if(prev)total+=prev[1]-prev[0];
 return {unique:total,overlap:overlap};
}
function aggregate(rows){
 const groups=new Map();
 for(const x of rows){
  const key=cleanName(x.name),duration=Math.max(0,+x.endAt- +x.startAt);
  if(!groups.has(key))groups.set(key,{name:x.name||'Activity',count:0,ms:0,items:[],days:new Set()});
  const v=groups.get(key);v.count++;v.ms+=duration;v.days.add(datekey(+x.startAt));v.items.push(x);
 }
 return [...groups.values()].sort((a,b)=>b.ms-a.ms);
}
function idealRows(x,from,to){
 const routines=Array.isArray(x?.idealRoutines)?x.idealRoutines:[];
 const list=[];
 for(let t=from;t<to;t+=86400000){
  const day=new Date(t),key=datekey(t);
  for(const routine of routines){
   if(+routine.dayOfWeek!==day.getDay())continue;
   const match=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(routine.start||''));
   const length=+routine.durationMinutes;
   if(!match||!(length>0&&length<=1440))continue;
   const begin=new Date(key+'T'+match[1]+':'+match[2]+':00').getTime();
   const item={name:routine.name||'Ideal activity',startAt:begin,endAt:begin+length*60000};
   if(item.endAt<=to)list.push(item);
  }
 }
 return list;
}
function renderCompare(){
 const d=all(),now=Date.now(),today=startday(datekey(now)),n=compareWindow;
 const historical=compare==='reality',from=historical?today-n*86400000:today,to=historical?today:today+n*86400000;
 const raw=historical?d.real.filter(x=>+x.startAt<to&&+x.endAt>from):compare==='planned'?d.plans.filter(x=>+x.startAt<to&&+x.endAt>from):idealRows(d.x,from,to);
 // Exclude implausibly long spans from aggregate totals; keep them in the review queue.
 const flags=historical?raw.filter(suspicious):[];
 const eligible=historical?raw.filter(x=>!suspicious(x)):raw;
 const rows=eligible.map(x=>({...x,startAt:Math.max(+x.startAt,from),endAt:Math.min(+x.endAt,to)})).filter(valid);
 const grouped=aggregate(rows),union=compareUnion(rows),summed=rows.reduce((t,x)=>t+(+x.endAt- +x.startAt),0);
 const type=historical?'Finished tracking':compare==='planned'?'Saved commitments':'Preferred routines';
 const descr=historical?'Past '+n+' complete days · Only eligible finished records. Unknown and example time is not filled in.':compare==='planned'?'Next '+n+' days · Saved plans, not automatically generated predictions.':'Next '+n+' days · Preferences, not booked commitments.';
 $('v136CompareIntro').textContent=descr;
 const label=historical?'Eligible sessions':compare==='planned'?'Saved plans':'Routine occurrences';
 $('v136CompareMetrics').innerHTML='<div><strong>'+rows.length+'</strong><small>'+label+'</small></div>'+
 '<div><strong>'+dur(union.unique)+'</strong><small>Unique '+(historical?'recorded':'scheduled')+' time</small></div>';
 const note=$('v139CompareEvidence');
 if(note){
  const clamped=Math.max(0,summed-union.unique);
  note.innerHTML='<div class="v139-badges"><span class="v139-tag">'+esc(type)+'</span><span class="v139-tag">'+n+'-day window</span></div>'+
  '<div class="v139-evidence-line"><span>Summed duration</span><strong>'+dur(summed)+'</strong></div>'+
  '<div class="v139-evidence-line"><span>Concurrent time counted twice in sum</span><strong>'+dur(clamped)+'</strong></div>'+
  (flags.length?'<button type="button" data-v139-review>⚠ '+flags.length+' unusual session'+(flags.length===1?'':'s')+' excluded · review →</button>':'')+
  '<p>'+(historical?'Unique time counts overlapping intervals once. These figures come from stored finish timestamps; they are not proof of what you did if a timer was left running.':compare==='planned'?'These are intentions, not evidence of completed activities.':'Preferred routines are suggestions for your ideal schedule, not actual tracked time.')+'</p>';
 }
 const top=grouped.slice(0,6),max=Math.max(1,...top.map(x=>x.ms));
 const chart=$('v136CompareBars');
 chart.innerHTML=top.length?top.map(x=>{
  const items=x.items.slice().sort((a,b)=>a.startAt-b.startAt);
  const display=items.slice(0,7).map(item=>'<li><span>'+esc(new Date(+item.startAt).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}))+'</span><strong>'+dur(+item.endAt- +item.startAt)+'</strong></li>').join('');
  return '<details class="v139-group"><summary><div class="v139-group-heading"><strong>'+esc(x.name)+'</strong><span>'+dur(x.ms)+'</span></div>'+
  '<div class="v136-bar"><i style="width:'+Math.min(100,x.ms/max*100)+'%"></i></div>'+
  '<small>'+x.count+' record'+(x.count===1?'':'s')+' · '+x.days.size+' day'+(x.days.size===1?'':'s')+' · view details ⌄</small></summary>'+
  '<ul>'+display+(items.length>7?'<li class="v139-muted">+'+(items.length-7)+' more in this period</li>':'')+'</ul></details>';
 }).join(''):'<div class="v139-empty"><strong>No eligible '+(historical?'recorded activity':compare==='planned'?'saved plans':'ideal routines')+' in this window.</strong><p>No missing time has been assumed. Use another period or review your records.</p></div>';
 if(grouped.length>6)chart.insertAdjacentHTML('beforeend','<p class="v139-muted">'+(grouped.length-6)+' additional activity types omitted from this summary. The detailed comparison remains available below.</p>');
 host.querySelectorAll('[data-v136-compare]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v136Compare===compare)));
 host.querySelectorAll('[data-v139-days]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v139Days===n)));
}
function renderImprove(){
 const d=all(),recent=d.real.filter(x=>+x.startAt>Date.now()-7*86400000),flag=recent.filter(suspicious),plans=d.plans.filter(x=>+x.startAt>Date.now()).sort((a,b)=>a.startAt-b.startAt),pairs=[];
 for(let i=0;i<plans.length;i++)for(let j=i+1;j<plans.length;j++)if(+plans[i].startAt<+plans[j].endAt&&+plans[j].startAt<+plans[i].endAt)pairs.push([plans[i],plans[j]]);
 const opportunities=[];
 if(flag.length)opportunities.push({icon:'!',title:'Verify unusual tracking',text:flag.length+' finished session'+(flag.length>1?'s have':' has')+' an unexpectedly long duration. Correct the source record before trusting goal progress.',tab:'review',label:'Review records'});
 if(pairs.length)opportunities.push({icon:'↔',title:'Resolve calendar conflicts',text:pairs.length+' overlap pair'+(pairs.length===1?' needs':'s need')+' attention. Not every overlap is a mistake.',tab:'calendar',label:'View calendar'});
 if(d.samples.length)opportunities.push({icon:'◇',title:'Separate development history',text:d.samples.length+' example or generated session'+(d.samples.length>1?'s are':' is')+' present. Do not interpret them as verified activity.',tab:'more',label:'View data tools'});
 if(!opportunities.length)opportunities.push({icon:'✓',title:'Nothing urgent to correct',text:'Keep recording activities consistently. Suggestions become stronger with reliable evidence.',tab:'calendar',label:'Go to calendar'});
 $('v136ImproveCards').innerHTML=opportunities.slice(0,3).map(x=>'<article class="v136-suggestion"><span>'+x.icon+'</span><div><strong>'+x.title+'</strong><p>'+x.text+'</p><button type="button" data-v136-tab="'+x.tab+'">'+x.label+' →</button></div></article>').join('');
}
function renderReview(){
 const d=all(),now=Date.now(),report=(()=>{try{return window.LifeOSDebtRecoveryV75?.outstanding?.(d.x,now)}catch{return null}})(),
 open=Array.isArray(report?.open)?report.open:[],unknown=Array.isArray(report?.unverified)?report.unverified:[],
 flag=d.real.filter(x=>+x.endAt>now-14*86400000&&suspicious(x)),safe=x=>esc(x||'');
 $('v136ReviewMetrics').innerHTML='<div><strong>'+open.length+'</strong><small>Calculated shortfalls</small></div><div><strong>'+unknown.length+'</strong><small>Unverified plans</small></div><div><strong>'+flag.length+'</strong><small>Duration checks</small></div>';
 host.querySelectorAll('[data-v138-review]').forEach(x=>x.setAttribute('aria-selected',String(x.dataset.v138Review===reviewMode)));
 const list=$('v136ReviewList'),title=$('v138ReviewTitle'),desc=$('v136ReviewNote');
 if(reviewMode==='shortfalls'){
  title.textContent='Commitments to confirm';
  desc.textContent='These are calculated shortfalls, not proof that a commitment was missed. Review before making a recovery decision.';
  list.innerHTML=open.length?open.slice(0,8).map(x=>'<article class="v136-review-row"><div><strong>'+safe(x.name)+'</strong><small>'+dur(x.outstandingMs)+' calculated shortfall</small><em>Needs your confirmation</em></div><button type="button" data-v136-recovery="'+safe(x.id)+'">Review →</button></article>').join(''):'<p class="v136-muted">No calculated shortfalls currently require attention.</p>';
 }else if(reviewMode==='unknown'){
  title.textContent='Plans without confirmed completion';
  desc.textContent='A missing linked timer does not mean the activity was missed. Check other sources before deciding.';
  list.innerHTML=unknown.length?unknown.slice(0,12).map(x=>'<article class="v136-review-row"><div><strong>'+safe(x.name||x.planName||'Unverified plan')+'</strong><small>'+safe(Number.isFinite(+x.startAt)?new Date(+x.startAt).toLocaleDateString():'Attendance not confirmed')+'</small><em>Unknown · not automatically missed</em></div></article>').join(''):'<p class="v136-muted">No unverified past plans were reported.</p>';
 }else{
  title.textContent='Check recorded durations';
  desc.textContent='The total start-to-end span may differ from a short slice displayed on a particular calendar day.';
  list.innerHTML=flag.length?flag.slice(0,10).map(x=>'<article class="v136-review-row"><div><strong>'+safe(x.name)+'</strong><small>'+dur(+x.endAt- +x.startAt)+' total span · '+safe(new Date(+x.startAt).toLocaleDateString())+'</small><em>Review original session in Track</em></div><button type="button" data-v138-open-track>Open Track →</button></article>').join(''):'<p class="v136-muted">No unusually long finished sessions detected in the review window.</p>';
 }
 $('v136ReviewAnomalies').innerHTML=flag.slice(0,5).map(x=>'<div class="v136-review-mini"><strong>'+safe(x.name)+'</strong><span>'+dur(+x.endAt- +x.startAt)+' total span · '+safe(new Date(+x.startAt).toLocaleDateString())+'</span></div>').join('')||'<p class="v136-muted">No unusual durations detected.</p>';
}
function categorize(n){const id=n.id||'';if(/^(lo133PlanStudio|scheduleForm|lo133DailyDetails|lo133UpcomingDetails|lo11ScheduleCalendar|scheduleDay|scheduleList)/.test(id))return 'calendar';
 if(/^(lo74-debt|lo75-debt|lo99-audit|lo102)/.test(id)||/debt|outstanding|recovery audit/i.test(id))return 'review';
 if(/^(lo40Compare|lo41|lo57|lo56|lo53|lo54)/.test(id)||/reality.*ideal|comparison/i.test(id))return 'compare';
 if(/^(lo39PlanningBrief|lo42|lo48|lo58|lo59|lo60|lo61|lo62|lo63|lo64|lo65)/.test(id)||/weekly plan|suggestion|improvement|prediction/i.test(id))return 'improve';
 return 'more';
}
function makeAdvanced(){
 const dock=$('v136LegacyDock');if(!dock||dock.dataset.mounted)return;dock.dataset.mounted='yes';
 const contents=[...source.children].filter(n=>n!==host&&n!==dock);
 // Move, do not clone: existing handlers and original form IDs remain intact.
 for(const n of contents){const key=categorize(n);const slot=$('v136Old-'+key)||$('v136Old-more');if(slot)slot.append(n)}
 const form=$('scheduleForm');if(form){const entry=$('v136PlanForm');if(entry)entry.append(form)}
 const picker=$('scheduleDay');if(picker){picker.value=anchor}
 // Move the original V12 *outer* tools and development wrappers, not only their children.
 // Their linked inputs and listeners remain in place and accessible under More.
 const advanced=$('v136Old-more');
 for(const id of ['v4Plan','lo12CalendarTools','lo12DevDetails']){
  const outer=$(id);if(outer&&advanced&&!advanced.contains(outer))advanced.append(outer);
 }
 // These legacy schedule panels used to appear BEFORE the calendar, forcing long scrolling.
 // Keep their original nodes and approval handlers, but present them under More.
 for(const id of ['calendarHandoffPanel','calendarChangePanel','smartSchedulePanel','calendarReviewPanel']){
  const panel=$(id),slot=$('v136Old-more');if(panel&&slot&&!slot.contains(panel))slot.append(panel);
 }
}
function screen(tab){selected=tab;tabs();if(tab==='overview')window.LifeOSPlanOverview?.render();if(tab==='calendar')renderCalendar();if(tab==='compare')renderCompare();if(tab==='improve')renderImprove();if(tab==='review')renderReview();const menu=host.querySelector('.pov-settings');if(menu)menu.open=false;host.scrollIntoView({block:'start',behavior:'instant'})}
function openForm(){screen('calendar');const box=$('v136PlanFormDetails');box.open=true;const form=$('scheduleForm'),toggle=$('v7TogglePlanForm');if(form?.hidden)toggle?.click();$('scheduleName')?.focus({preventScroll:true})}
function init(){
 source=$('scheduleEditorPanel');if(!source||$('v136Workspace'))return;
 host=document.createElement('section');host.id='v136Workspace';
 host.innerHTML='<header class="v136-header"><div class="pov-title"><span><b>LifeOS</b> <i>·</i> Personal Planning</span><h2>Plan</h2></div><div class="pov-header-actions"><button type="button" data-pov-search-toggle class="pov-icon-button" aria-label="Search today’s plans and tasks"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg></button><button type="button" data-v136-action="new" class="v136-add">＋ Add</button><details class="pov-settings"><summary aria-label="Plan settings and tools">⋮</summary><div><button type="button" data-v136-tab="review">Commitment review</button><button type="button" data-v136-tab="more">Advanced planning tools</button><button type="button" data-pov-theme>Switch light / dark theme</button><button type="button" data-pov-settings>App settings</button><a href="/logout">Log out</a></div></details></div><p class="pov-subtitle">Organise your time. Build a better week.</p></header>'+
 '<div class="pov-search" hidden><label for="povSearch">Filter today’s plans and tasks</label><input id="povSearch" type="search" placeholder="Search plans or tasks"></div>'+
 '<nav class="v136-nav" aria-label="Plan sections">'+[['overview','Overview'],['calendar','Calendar'],['tasks','Tasks'],['compare','Compare'],['improve','Improve']].map(([k,v])=>'<button type="button" data-v136-tab="'+k+'" aria-selected="'+(k==='overview')+'">'+v+'</button>').join('')+'</nav>'+
 '<section class="v136-screen" data-v136-screen="overview"><div id="lifeosPlanOverview"></div></section>'+
 '<section class="v136-screen" data-v136-screen="calendar"><div id="v136TodayOverview"></div><div class="v136-card v136-calendar"><div class="v136-cardhead"><div><span>MY SCHEDULE</span><h3>Calendar</h3></div><button class="v136-today" type="button" data-v136-action="today">⌖ Today</button></div>'+
 '<div class="v136-segments">'+[['day','Day'],['three','3 days'],['week','Week'],['month','Month']].map(([k,v])=>'<button type="button" data-v136-range="'+k+'">'+v+'</button>').join('')+'</div>'+
 '<div class="v136-period"><button type="button" data-v136-move="-1" aria-label="Previous period">‹</button><strong id="v136PeriodTitle"></strong><button type="button" data-v136-move="1" aria-label="Next period">›</button></div>'+
 '<div class="v136-days" id="v136Days"></div><div id="v136DaySummary" class="v136-day-summary"></div><div id="v136Timeline"></div><button id="v136MoreRows" class="v136-link" type="button" hidden>Show more</button><div id="v136Conflicts"></div></div>'+
 '<details class="v136-drawer" id="v136PlanFormDetails"><summary>＋ Create or edit a plan</summary><div id="v136PlanForm"></div></details><details class="v136-drawer"><summary>Full calendar controls & detailed plan review</summary><div id="v136Old-calendar"></div></details></section>'+
 '<section class="v136-screen" data-v136-screen="tasks" hidden><div id="v136TaskManager"></div></section>'+
 '<section class="v136-screen" data-v136-screen="compare" hidden><div class="v136-card"><span class="v136-kicker">TIME INTELLIGENCE</span><h3>See the difference.</h3><div class="v136-segments">'+[['reality','Reality'],['planned','Planned'],['ideal','Ideal']].map(([k,v])=>'<button type="button" data-v136-compare="'+k+'">'+v+'</button>').join('')+'</div><p id="v136CompareIntro"></p><div class="v136-two" id="v136CompareMetrics"></div><div class="v139-window" role="group" aria-label="Comparison period"><button type="button" data-v139-days="7" aria-pressed="true">7 days</button><button type="button" data-v139-days="14">14 days</button><button type="button" data-v139-days="30">30 days</button></div><div id="v139CompareEvidence"></div><div id="v136CompareBars" class="v136-compare-bars"></div></div><details class="v136-drawer"><summary>Detailed comparison and evidence</summary><div id="v136Old-compare"></div></details></section>'+
 '<section class="v136-screen" data-v136-screen="improve" hidden><div class="v136-card"><span class="v136-kicker">PRIORITIZED INSIGHTS</span><h3>Improve what matters.</h3><p>Only a few useful recommendations appear first. Suggestions never alter your calendar without approval.</p><div id="v136ImproveCards"></div></div><details class="v136-drawer"><summary>Advanced predictions and weekly planning</summary><div id="v136Old-improve"></div></details></section>'+
 '<section class="v136-screen" data-v136-screen="review" hidden><div class="v136-card"><span class="v136-kicker">COMMITMENT REVIEW</span><h3>Understand first. Recover second.</h3><p>Untracked does not mean missed. A recovery is only a plan until you approve it and then complete it.</p><div id="v136ReviewMetrics" class="v136-three"></div><div class="v138-review-switch" role="tablist" aria-label="Review type"><button type="button" data-v138-review="shortfalls" aria-selected="true">Commitments</button><button type="button" data-v138-review="unknown">Unverified</button><button type="button" data-v138-review="durations">Durations</button></div><h4 id="v138ReviewTitle">Commitments to confirm</h4><div id="v136ReviewList"></div><p class="v136-muted" id="v136ReviewNote"></p><details class="v136-subdrawer"><summary>Unusual activity durations</summary><div id="v136ReviewAnomalies"></div></details></div><details class="v136-drawer" id="v136RecoveryDrawer"><summary>Advanced recovery decisions & audit history</summary><div id="v136Old-review"></div></details></section>'+
 '<section class="v136-screen" data-v136-screen="more" hidden><div class="v136-card"><span class="v136-kicker">ADVANCED FEATURES</span><h3>Everything else, organized.</h3><p>Imports, diagnostics, configuration and development utilities are available here without cluttering your day.</p></div><details class="v136-drawer"><summary>Advanced planning, imports and diagnostics</summary><div id="v136Old-more"></div></details></section>';
 source.prepend(host);source.classList.add('v136-managed');
 const legacy=document.createElement('div');legacy.id='v136LegacyDock';legacy.hidden=true;source.append(legacy);
 makeAdvanced();
 // Keep the existing task editor and its persistence handlers accessible in Plan.
 const taskPanel=$('todoForm')?.closest('section.panel');if(taskPanel){$('v136TaskManager').append(taskPanel);taskPanel.hidden=false;taskPanel.classList.remove('lifeos-hidden-panel');taskPanel.setAttribute('aria-hidden','false')}
 // V4's independent legacy month calendar is a duplicate of the new Plan. Move it, do not delete it.
 const oldVisual=$('v4Plan'),advancedVisual=$('v136Old-more');if(oldVisual&&advancedVisual&&!advancedVisual.contains(oldVisual))advancedVisual.append(oldVisual);
 // Some older modules mount later than DOMContentLoaded. Rehome their panels as they appear.
 const lateModules=new MutationObserver(changes=>{
  for(const change of changes)for(const item of change.addedNodes){
   if(item.nodeType!==1||item===host||item.id==='v136LegacyDock'||item.parentNode!==source)continue;
   const area=categorize(item),slot=$('v136Old-'+area)||$('v136Old-more');
   if(slot&&item!==slot)slot.append(item);
  }
 });
 lateModules.observe(source,{childList:true});
 host.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.v136Tab){screen(b.dataset.v136Tab);return}
  if(b.dataset.v138Review){reviewMode=b.dataset.v138Review;renderReview();return}
  if(b.hasAttribute('data-v138-open-track')){document.querySelector('#lifeosNavigation button[data-view="tracking"]')?.click();return}
  if(b.dataset.v136Range){range=b.dataset.v136Range;renderCalendar();return}
  if(b.dataset.v136Date){anchor=b.dataset.v136Date;range='day';showAll=false;renderCalendar();return}
  if(b.dataset.v136Move){dateShift(+b.dataset.v136Move);return}
  if(b.dataset.v136Compare){compare=b.dataset.v136Compare;renderCompare();return}
  if(b.dataset.v139Days){compareWindow=+b.dataset.v139Days;renderCompare();return}
  if(b.hasAttribute('data-v139-review')){reviewMode='durations';screen('review');return}
  if(b.dataset.v136Recovery){$('v136RecoveryDrawer').open=true;const old=$('lo75-debt-tools'),pick=$('lo75-item');if(old)old.open=true;if(pick){pick.value=b.dataset.v136Recovery;pick.dispatchEvent(new Event('change',{bubbles:true}))}$('v136RecoveryDrawer').scrollIntoView({behavior:'smooth',block:'start'});return}
  if(b.id==='v136MoreRows'){showAll=!showAll;renderCalendar();return}
  if(b.dataset.v136Action==='today'){anchor=datekey(Date.now());range='day';showAll=false;renderCalendar();return}
  if(b.dataset.v136Action==='next'){const p=all().plans.filter(x=>+x.startAt>Date.now()).sort((a,b)=>a.startAt-b.startAt)[0];if(p){anchor=datekey(+p.startAt);range='day';showAll=false;renderCalendar();$('v136DaySummary')?.scrollIntoView({block:'center',behavior:'smooth'})}return}
  if(b.dataset.v136Action==='new'){openForm();return}
  if(b.dataset.v136Action==='tasks'){screen('tasks');const target=$('todoForm');if(target)setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'start'}),150);return}
 });
 const sheet=$('v136PlanFormDetails');
 sheet?.addEventListener('toggle',()=>{document.body.classList.toggle('v136-sheet-open',sheet.open)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet?.open){sheet.open=false;document.body.classList.remove('v136-sheet-open')}});
 window.addEventListener('lifeos-v75-changed',()=>{if(selected==='review')renderReview()});
 window.addEventListener('lifeos-v65-plan-committed',()=>{if(selected==='calendar')renderCalendar()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){overview();if(selected==='calendar')renderCalendar()}});
 overview();tabs();renderCalendar();
 document.body.dataset.lo79TimerMinimized='true';
 document.querySelector('#lifeosNavigation button[data-view="schedule"]')?.addEventListener('click',()=>{document.body.dataset.lo79TimerMinimized='true'});
}
function boot(){if($('lo133PlanStudio'))init();else setTimeout(init,850)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,650),{once:true});else setTimeout(boot,650);
})();
