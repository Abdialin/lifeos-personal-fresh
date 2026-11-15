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
let host,source,selected='calendar',anchor=datekey(Date.now()),range='day',compare='reality',showAll=false,detailsOpen=false;
function cleanName(s){return String(s||'Activity').trim().toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/g,' ')}
function getDayRows(data,key){const from=startday(key),to=startday(datekey(from+86400000)),plans=data.plans.filter(p=>intersect(p,from,to)),real=data.real.filter(s=>intersect(s,from,to));
 return [...real.map(s=>({name:s.name||'Activity',start:s.startAt,end:s.endAt,kind:'record',category:cat(s.name),flag:suspicious(s),source:s})),...plans.filter(p=>!real.some(s=>String(s.plannedId||'')===String(p.id)||String(p.sessionId||'')===String(s.id))).map(p=>({name:p.name||'Plan',start:p.startAt,end:p.endAt,kind:'plan',category:cat(p.name),flag:false,source:p}))]
 .sort((a,b)=>a.start-b.start||a.kind.localeCompare(b.kind));
}
function tabs(){host.querySelectorAll('[data-v136-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.v136Tab===selected)));host.querySelectorAll('.v136-screen').forEach(x=>x.hidden=x.dataset.v136Screen!==selected)}
function overview(){const d=all(),begin=startday(datekey(Date.now())),finish=startday(datekey(begin+86400000)),plans=d.plans.filter(x=>intersect(x,begin,finish)),records=d.real.filter(x=>intersect(x,begin,finish)),alerts=records.filter(suspicious).length;
 const next=d.plans.filter(x=>+x.startAt>Date.now()).sort((a,b)=>a.startAt-b.startAt)[0];
 $('v136TodayOverview').innerHTML='<div class="v136-kpi-row"><div><strong>'+plans.length+'</strong><span>Planned today</span></div><div><strong>'+records.length+'</strong><span>Verified sessions</span></div><div><strong>'+alerts+'</strong><span>Review duration</span></div></div>'+
 '<div class="v136-next"><div><small>NEXT COMMITMENT</small><strong>'+esc(next?.name||'No upcoming commitments')+'</strong><span>'+ (next?esc(new Date(+next.startAt).toLocaleString(undefined,{weekday:'short',hour:'2-digit',minute:'2-digit'})):'Nothing scheduled')+'</span></div><button type="button" data-v136-action="new" aria-label="Add plan">＋</button></div>';
}
function periodKeys(){if(range==='month'){const d=new Date(anchor+'T12:00:00');d.setDate(1);return Array.from({length:new Date(d.getFullYear(),d.getMonth()+1,0).getDate()},(_,i)=>datekey(new Date(d.getFullYear(),d.getMonth(),i+1)))}const n=range==='three'?3:range==='week'?7:1;const d=new Date(anchor+'T12:00:00');if(range==='week')d.setDate(d.getDate()-(d.getDay()+6)%7);return Array.from({length:n},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return datekey(x)})}
function dateShift(dir){const d=new Date(anchor+'T12:00:00');if(range==='month'){d.setDate(1);d.setMonth(d.getMonth()+dir)}else d.setDate(d.getDate()+dir*(range==='week'?7:range==='three'?3:1));anchor=datekey(d);showAll=false;renderCalendar()}
function renderCalendar(){
 const d=all(),keys=periodKeys();$('v136PeriodTitle').textContent=range==='month'?new Date(anchor+'T12:00:00').toLocaleDateString(undefined,{month:'long',year:'numeric'}):range==='week'?'Week of '+new Date(keys[0]+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'}):range==='three'?'Next three days':displayDate(anchor);
 host.querySelectorAll('[data-v136-range]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v136Range===range)));
 const grid=keys.map(k=>{const rows=getDayRows(d,k),today=k===datekey(Date.now());return '<button type="button" class="v136-day'+(today?' is-today':'')+(k===anchor?' is-selected':'')+'" data-v136-date="'+k+'"><strong>'+new Date(k+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'})+'</strong><span>'+new Date(k+'T12:00:00').getDate()+'</span><i>'+rows.length+'</i></button>'}).join('');
 $('v136Days').innerHTML=grid;
 const rows=getDayRows(d,anchor),visible=showAll?rows:rows.slice(0,8),b=startday(anchor),e=startday(datekey(b+86400000));
 const dayPlans=d.plans.filter(x=>intersect(x,b,e)),dayReal=d.real.filter(x=>intersect(x,b,e)),flagged=dayReal.filter(suspicious).length;
 $('v136DaySummary').innerHTML='<h3>'+esc(displayDate(anchor))+'</h3><p>'+dayPlans.length+' plans · '+dayReal.length+' verified sessions'+(flagged?' · '+flagged+' needs review':'')+'</p>';
 $('v136Timeline').innerHTML=visible.length?visible.map(x=>{const time=Math.max(x.start,b);const minutes=Math.max(0,Math.round((time-b)/60000));const actual=(Math.max(0,Math.min(+x.end,e)-Math.max(+x.start,b))/60000);
  return '<article class="v136-event" data-kind="'+x.kind+'" data-category="'+x.category+'"><span class="v136-event-time">'+hh(time)+'</span><div class="v136-event-rail"><i></i></div><div class="v136-event-main"><div><strong>'+esc(x.name)+'</strong><span class="v136-pill">'+(x.kind==='record'?'Tracked':'Planned')+'</span></div><small>'+dur(actual*60000)+(x.flag?' · Duration needs verification':'')+'</small></div></article>'}).join(''):'<div class="v136-empty">No plans or verified sessions for this day.<small>Unlogged time is unknown, not necessarily free.</small></div>';
 $('v136MoreRows').hidden=rows.length<=8;$('v136MoreRows').textContent=showAll?'Show fewer': 'See all '+rows.length+' activities';
 const clashes=[];for(let i=0;i<dayPlans.length;i++)for(let j=i+1;j<dayPlans.length;j++)if(intersect(dayPlans[i],+dayPlans[j].startAt,+dayPlans[j].endAt))clashes.push([dayPlans[i],dayPlans[j]]);
 $('v136Conflicts').innerHTML=clashes.length?'<span class="v136-warning">⚠ '+clashes.length+' overlapping plan pair'+(clashes.length===1?'':'s')+' · review before booking more.</span>':'<span class="v136-muted">No overlapping planned activities detected for this day.</span>';
}
function aggregate(rows,periodDays){const m=new Map();for(const x of rows){const k=cleanName(x.name);let item=m.get(k);if(!item){item={name:x.name,cat:cat(x.name),count:0,ms:0,flag:0};m.set(k,item)}item.count++;item.ms+=(+x.endAt- +x.startAt);item.flag+=suspicious(x)?1:0}return [...m.values()].sort((a,b)=>b.ms-a.ms)}
function renderCompare(){
 const d=all(),now=Date.now(),from=now-7*86400000,to=now+7*86400000,source=compare==='reality'?d.real.filter(x=>x.startAt>=from&&x.startAt<now):compare==='planned'?d.plans.filter(x=>x.startAt>=now&&x.startAt<to):((d.x.idealRoutines||[]).map(r=>({name:r.name,startAt:now,endAt:now+Math.max(0,+r.durationMinutes||0)*60000})));
 const groups=aggregate(source),total=groups.reduce((a,x)=>a+x.ms,0),issue=compare==='reality'?source.filter(suspicious).length:compare==='planned'?d.plans.filter(x=>x.startAt>=now&&x.startAt<to).length:0;
 $('v136CompareIntro').textContent=compare==='reality'?'Finished, non-development sessions in the previous seven days. Suspect durations are flagged.':compare==='planned'?'Saved future commitments only. These are not predictions.':'Your preferred routine definitions. They are not booked activities.';
 $('v136CompareMetrics').innerHTML='<div><strong>'+source.length+'</strong><small>'+({reality:'Recorded sessions',planned:'Upcoming plans',ideal:'Routine definitions'})[compare]+'</small></div><div><strong>'+dur(total)+'</strong><small>Summed duration</small></div>';
 const top=groups.slice(0,6),max=Math.max(1,...top.map(x=>x.ms));
 $('v136CompareBars').innerHTML=top.length?top.map(x=>'<div class="v136-bar-row"><div><strong>'+esc(x.name)+'</strong><span>'+dur(x.ms)+'</span></div><div class="v136-bar"><i style="width:'+Math.min(100,100*x.ms/max)+'%"></i></div>'+(x.flag?'<small>'+x.flag+' unusual duration'+(x.flag>1?'s':'')+' · verify before interpreting</small>':'')+'</div>').join(''):'<p class="v136-muted">Not enough eligible records to calculate a meaningful comparison.</p>';
 host.querySelectorAll('[data-v136-compare]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v136Compare===compare)));
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
 open=report?.open||[],unknown=report?.unverified||[],flag=d.real.filter(x=>+x.endAt>now-14*86400000&&suspicious(x)),s=el=>esc(el||'');
 $('v136ReviewMetrics').innerHTML='<div><strong>'+open.length+'</strong><small>Calculated shortfalls</small></div><div><strong>'+unknown.length+'</strong><small>Unverified plans</small></div><div><strong>'+flag.length+'</strong><small>Unusual sessions</small></div>';
 $('v136ReviewList').innerHTML=(open.slice(0,8).map(x=>'<article class="v136-review-row"><div><strong>'+s(x.name)+'</strong><small>'+dur(x.outstandingMs)+' calculated shortfall · confirm circumstances first</small></div><button type="button" data-v136-recovery="'+s(x.id)+'">Review</button></article>').join(''))||
 '<p class="v136-muted">No calculated recovery commitments are currently reported.</p>';
 $('v136ReviewNote').textContent=unknown.length?unknown.length+' past plans have no verified linked completion; they are not automatically counted as missed.':'No additional unverified past plans were reported.';
 const issues=flag.slice(0,5).map(x=>'<div class="v136-review-mini"><strong>'+s(x.name)+'</strong><span>'+dur(+x.endAt- +x.startAt)+' · '+s(new Date(+x.startAt).toLocaleDateString())+'</span></div>').join('');
 $('v136ReviewAnomalies').innerHTML=issues||'<p class="v136-muted">No recent unusually long verified sessions found.</p>';
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
 const picker=$('scheduleDay');if(picker){const original=picker.closest('label')||picker;/* V133 retains date-change integration. */picker.value=anchor}
}
function screen(tab){selected=tab;tabs();if(tab==='calendar')renderCalendar();if(tab==='compare')renderCompare();if(tab==='improve')renderImprove();if(tab==='review')renderReview();window.scrollTo({top:0,behavior:'instant'})}
function openForm(){screen('calendar');const box=$('v136PlanFormDetails');box.open=true;const form=$('scheduleForm'),toggle=$('v7TogglePlanForm');if(form?.hidden)toggle?.click();box.scrollIntoView({behavior:'smooth',block:'start'})}
function init(){
 source=$('scheduleEditorPanel');if(!source||$('v136Workspace'))return;
 host=document.createElement('section');host.id='v136Workspace';
 host.innerHTML='<header class="v136-header"><div><span>LIFEOS · PERSONAL PLANNING</span><h2>Plan your time.</h2></div><button type="button" data-v136-action="new" class="v136-add">＋ Add</button></header>'+
 '<nav class="v136-nav" aria-label="Plan sections">'+[['calendar','Calendar'],['tasks','Tasks'],['compare','Compare'],['improve','Improve'],['review','Review'],['more','More']].map(([k,v])=>'<button type="button" data-v136-tab="'+k+'" aria-selected="'+(k==='calendar')+'">'+v+'</button>').join('')+'</nav>'+
 '<section class="v136-screen" data-v136-screen="calendar"><div id="v136TodayOverview"></div><div class="v136-card v136-calendar"><div class="v136-cardhead"><div><span>MY SCHEDULE</span><h3>Calendar</h3></div><button class="v136-today" type="button" data-v136-action="today">⌖ Today</button></div>'+
 '<div class="v136-segments">'+[['day','Day'],['three','3 days'],['week','Week'],['month','Month']].map(([k,v])=>'<button type="button" data-v136-range="'+k+'">'+v+'</button>').join('')+'</div>'+
 '<div class="v136-period"><button type="button" data-v136-move="-1" aria-label="Previous period">‹</button><strong id="v136PeriodTitle"></strong><button type="button" data-v136-move="1" aria-label="Next period">›</button></div>'+
 '<div class="v136-days" id="v136Days"></div><div id="v136DaySummary" class="v136-day-summary"></div><div id="v136Timeline"></div><button id="v136MoreRows" class="v136-link" type="button" hidden>Show more</button><div id="v136Conflicts"></div></div>'+
 '<details class="v136-drawer" id="v136PlanFormDetails"><summary>＋ Create or edit a plan</summary><div id="v136PlanForm"></div></details><details class="v136-drawer"><summary>Full calendar controls & detailed plan review</summary><div id="v136Old-calendar"></div></details></section>'+
 '<section class="v136-screen" data-v136-screen="tasks" hidden><div class="v136-card"><span class="v136-kicker">YOUR TASKS</span><h3>Flexible tasks and deadlines</h3><p>Tasks have their own deadlines and optional time windows. A task is not automatically a calendar appointment.</p><button type="button" class="v136-cta" data-v136-action="tasks">Open task manager →</button></div></section>'+
 '<section class="v136-screen" data-v136-screen="compare" hidden><div class="v136-card"><span class="v136-kicker">TIME INTELLIGENCE</span><h3>See the difference.</h3><div class="v136-segments">'+[['reality','Reality'],['planned','Planned'],['ideal','Ideal']].map(([k,v])=>'<button type="button" data-v136-compare="'+k+'">'+v+'</button>').join('')+'</div><p id="v136CompareIntro"></p><div class="v136-two" id="v136CompareMetrics"></div><div id="v136CompareBars" class="v136-compare-bars"></div></div><details class="v136-drawer"><summary>Detailed comparison and evidence</summary><div id="v136Old-compare"></div></details></section>'+
 '<section class="v136-screen" data-v136-screen="improve" hidden><div class="v136-card"><span class="v136-kicker">PRIORITIZED INSIGHTS</span><h3>Improve what matters.</h3><p>Only a few useful recommendations appear first. Suggestions never alter your calendar without approval.</p><div id="v136ImproveCards"></div></div><details class="v136-drawer"><summary>Advanced predictions and weekly planning</summary><div id="v136Old-improve"></div></details></section>'+
 '<section class="v136-screen" data-v136-screen="review" hidden><div class="v136-card"><span class="v136-kicker">COMMITMENT REVIEW</span><h3>Understand first. Recover second.</h3><p>Untracked does not mean missed. A recovery is only a plan until you approve it and then complete it.</p><div id="v136ReviewMetrics" class="v136-three"></div><h4>Calculated shortfalls</h4><div id="v136ReviewList"></div><p class="v136-muted" id="v136ReviewNote"></p><details class="v136-subdrawer"><summary>Unusual activity durations</summary><div id="v136ReviewAnomalies"></div></details></div><details class="v136-drawer" id="v136RecoveryDrawer"><summary>Recovery approval & history</summary><div id="v136Old-review"></div></details></section>'+
 '<section class="v136-screen" data-v136-screen="more" hidden><div class="v136-card"><span class="v136-kicker">ADVANCED FEATURES</span><h3>Everything else, organized.</h3><p>Imports, diagnostics, configuration and development utilities are available here without cluttering your day.</p></div><details class="v136-drawer"><summary>Advanced planning, imports and diagnostics</summary><div id="v136Old-more"></div></details></section>';
 source.prepend(host);source.classList.add('v136-managed');
 const legacy=document.createElement('div');legacy.id='v136LegacyDock';legacy.hidden=true;source.append(legacy);
 makeAdvanced();
 host.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.v136Tab){screen(b.dataset.v136Tab);return}
  if(b.dataset.v136Range){range=b.dataset.v136Range;renderCalendar();return}
  if(b.dataset.v136Date){anchor=b.dataset.v136Date;range='day';showAll=false;renderCalendar();return}
  if(b.dataset.v136Move){dateShift(+b.dataset.v136Move);return}
  if(b.dataset.v136Compare){compare=b.dataset.v136Compare;renderCompare();return}
  if(b.dataset.v136Recovery){$('v136RecoveryDrawer').open=true;const old=$('lo75-debt-tools'),pick=$('lo75-item');if(old)old.open=true;if(pick){pick.value=b.dataset.v136Recovery;pick.dispatchEvent(new Event('change',{bubbles:true}))}$('v136RecoveryDrawer').scrollIntoView({behavior:'smooth',block:'start'});return}
  if(b.id==='v136MoreRows'){showAll=!showAll;renderCalendar();return}
  if(b.dataset.v136Action==='today'){anchor=datekey(Date.now());showAll=false;renderCalendar();return}
  if(b.dataset.v136Action==='new'){openForm();return}
  if(b.dataset.v136Action==='tasks'){document.querySelector('#lifeosNavigation button[data-view="goals"]')?.click();const target=$('todoForm');if(target)setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'start'}),150);return}
 });
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