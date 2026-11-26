/* Plan Overview: read-only summaries with actions delegated to existing editors. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSPlanOverview=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=t=>{const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const clock=t=>new Date(t).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',hour12:false});
const hours=ms=>(Math.round(ms/360000)/10).toLocaleString(undefined,{maximumFractionDigits:1})+'h';
const duration=ms=>{const m=Math.round(Math.max(0,ms)/60000);return m>=60?Math.floor(m/60)+'h'+(m%60?' '+m%60+'m':''):m+'m'};
const numeric=x=>x!==null&&x!==undefined&&String(x).trim()!==''&&Number.isFinite(+x);
const validPlan=p=>p&&numeric(p.startAt)&&numeric(p.endAt)&&+p.endAt>+p.startAt&&!['cancelled','skipped'].includes(p.status);
const realSession=s=>s&&s.status!=='discarded'&&!s.assumed&&!s.isExample&&!s.developmentExample&&!s.seedBatch&&!['development-starter','assumed-demo','imported-example'].includes(s.source);
const intersects=(x,a,b)=>+x.startAt<b&&+x.endAt>a;
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&key(new Date(s+'T12:00:00').getTime())===s;
function isoWeek(ms){const d=new Date(ms),u=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));u.setUTCDate(u.getUTCDate()+4-(u.getUTCDay()||7));const start=new Date(Date.UTC(u.getUTCFullYear(),0,1));return Math.ceil((((u-start)/86400000)+1)/7)}
function bounds(now){const d=new Date(now),today=new Date(d.getFullYear(),d.getMonth(),d.getDate()),monday=new Date(today);monday.setDate(today.getDate()-(today.getDay()+6)%7);const days=Array.from({length:8},(_,i)=>new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+i).getTime());return {today:+today,tomorrow:new Date(today.getFullYear(),today.getMonth(),today.getDate()+1).getTime(),days,start:days[0],end:days[7]}}
function build(workspace,now,analytics,habitData={}){
 const b=bounds(now),today=key(now),plans=(Array.isArray(workspace?.schedule)?workspace.schedule:[]).filter(validPlan),sessions=(Array.isArray(workspace?.sessions)?workspace.sessions:[]).filter(realSession),todos=(Array.isArray(workspace?.todos)?workspace.todos:[]).filter(t=>t&&typeof t==='object');
 const todayPlans=plans.filter(p=>intersects(p,b.today,b.tomorrow)).sort((a,c)=>+a.startAt- +c.startAt);
 const next=todayPlans.find(p=>+p.startAt>now),todayTasks=todos.filter(t=>String(t.due||'').slice(0,10)===today).sort((a,c)=>String(a.startTime||a.dueTime||'99:99').localeCompare(String(c.startTime||c.dueTime||'99:99')));
 const lastDeadline=new Date(b.today);lastDeadline.setDate(lastDeadline.getDate()+7);const maxDate=key(+lastDeadline);
 const deadlines=todos.filter(t=>{const date=String(t.due||'').slice(0,10);return !t.done&&validDate(date)&&date<=maxDate}).sort((a,c)=>String(a.due).localeCompare(String(c.due))||String(a.dueTime||'99:99').localeCompare(String(c.dueTime||'99:99')));
 const weekPlans=plans.filter(p=>intersects(p,b.start,b.end)).sort((a,c)=>+a.startAt- +c.startAt),conflicts=[];
 for(let i=0;i<weekPlans.length;i++)for(let j=i+1;j<weekPlans.length&&+weekPlans[j].startAt<+weekPlans[i].endAt;j++){
  const a=weekPlans[i],c=weekPlans[j],from=Math.max(+a.startAt,+c.startAt,b.start),to=Math.min(+a.endAt,+c.endAt,b.end);
  if(to>from)conflicts.push({a,c,from,to});
 }
 const normalized={sessions,schedule:plans};
 const weekly=analytics.summarize(normalized,{start:b.start,end:b.end,now});
 const days=b.days.slice(0,7).map((start,i)=>({start,end:b.days[i+1],...analytics.summarize(normalized,{start,end:b.days[i+1],now})}));
 const linked=new Set(sessions.filter(s=>s.status==='finished').map(s=>String(s.id)));
 const confirmed=weekPlans.filter(p=>['completed','finished'].includes(p.status)||(p.sessionId&&linked.has(String(p.sessionId)))).length;
 const definitions=(Array.isArray(habitData.habitDefinitions)?habitData.habitDefinitions:[]).filter(Boolean),checks=(Array.isArray(habitData.habitChecks)?habitData.habitChecks:[]).filter(Boolean);
 const weekStart=key(b.start),weekEnd=key(b.end),todayKey=key(now);
 const checked=new Set(checks.filter(c=>c.done&&c.date>=weekStart&&c.date<weekEnd&&c.date<=todayKey).map(c=>String(c.habitId)));
 return {bounds:b,todayPlans,next,todayTasks,deadlines,weekPlans,conflicts,weekly,days,confirmed,habits:{total:definitions.length,checked:definitions.filter(x=>checked.has(String(x.id))).length}};
}
const paths={calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',task:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.5 2.5L16 9"/>',chart:'<path d="M4 20V11m6 9V5m6 15v-7m4 7H2"/>',alert:'<path d="M12 3 2 20h20L12 3Zm0 6v5m0 3v.1"/>',flag:'<path d="M5 21V4m0 1c5-3 9 3 14 0v10c-5 3-9-3-14 0"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 8-8m-3 0h3v3"/>',plan:'<path d="M3 8h18M5 8v11h14V8M8 4v4m8-4v4M8 12h8m-8 4h5"/>',study:'<path d="m2 9 10-5 10 5-10 5L2 9Zm4 2v5c4 3 8 3 12 0v-5m3-1v6"/>',fitness:'<path d="M5 8 3 10l3 3 2-2m8-3 2-2 3 3-2 2M8 11l8-3m-8 3 3 3m5-6 3 3M4 13l2 2m12-8 2 2"/>',work:'<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V5h6v2M4 12h16m-10 0v2h4v-2"/>',prayer:'<path d="M18 17A8 8 0 0 1 9 4a8 8 0 1 0 9 13Zm-2-12v4m-2-2h4"/>',food:'<path d="M5 3v7m-2-7v5c0 2 4 2 4 0V3m-2 7v11M17 3c-3 2-3 8 0 9v9m0-18v9"/>',time:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>'};
const icon=(name,cls='')=>'<span class="pov-icon '+cls+'" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.plan)+'</svg></span>';
const planIcon=p=>({'University':'study','Study':'study','Fitness':'fitness','Work & business':'work','Prayer':'prayer','Nutrition':'food'})[root.lifeosActivityClassification?.(p)?.group]||'plan';
const heading=(name,title,side='')=>'<div class="pov-card-head">'+icon(name)+'<h3>'+title+'</h3>'+side+'</div>';
const dateLabel=t=>new Date(t).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});
let host,query='',observer;
function model(){const workspace=root.lifeosReadOnlyWorkspace?.()||{},habitData=root.lifeosSocialHabitBridge?.read?.()||{};return build(workspace,Date.now(),root.LifeOSUnifiedAnalytics,habitData)}
function render(){
 if(!host||!root.LifeOSUnifiedAnalytics)return;
 const d=model(),today=key(Date.now()),matches=x=>!query||String(x||'').toLocaleLowerCase().includes(query);
 const plans=d.todayPlans.filter(p=>matches(p.name)),tasks=d.todayTasks.filter(t=>matches(t.name)),deadlines=d.deadlines.filter(t=>matches(t.name));
 const done=d.todayTasks.filter(t=>t.done).length,count=d.todayTasks.length,progress=count?Math.round(done/count*100):0;
 const planRows=plans.slice(0,3).map(p=>'<button type="button" class="pov-plan-row" data-v137-activity="plan" data-v137-id="'+esc(p.id)+'">'+icon(planIcon(p),'pov-row-icon')+'<span><strong>'+esc(p.name||'Planned activity')+'</strong><small>'+(p===d.next?'Next · ':'')+clock(+p.startAt)+' – '+clock(+p.endAt)+'</small></span></button>').join('');
 const taskRows=tasks.slice(0,4).map(t=>'<label class="pov-task-row"><input type="checkbox" data-pov-todo="'+esc(t.id)+'" '+(t.done?'checked':'')+' aria-label="'+(t.done?'Mark open: ':'Complete: ')+esc(t.name)+'"><span class="'+(t.done?'is-done':'')+'">'+esc(t.name)+'</span></label>').join('');
 const top='<div class="pov-pair"><section class="pov-card">'+heading('calendar','Today’s Commitments','<button type="button" class="pov-text-button" data-v136-tab="calendar">All ›</button>')+(planRows||'<p class="pov-empty">'+(query?'No matching commitments':'No commitments today')+'</p>')+'</section><section class="pov-card">'+heading('task','Today’s Tasks','<span class="pov-muted">'+done+' / '+count+'</span>')+(taskRows||'<p class="pov-empty">'+(query?'No matching tasks':'No tasks due today')+'</p>')+'<div class="pov-progress-row"><div class="pov-progress" role="progressbar" aria-label="Tasks due today completed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress+'"'+(count?'':' aria-valuetext="No tasks due today"')+'><i style="width:'+progress+'%"></i></div><span>'+(count?progress+'%':'—')+'</span></div><button type="button" class="pov-text-button pov-task-link" data-v136-tab="tasks">View tasks ›</button></section></div>';
 const max=Math.max(1,...d.days.map(x=>Math.max(x.uniqueRecordedMs,x.uniquePlannedMs)));
 const bars=d.days.map(x=>{const active=key(x.start)===today,label=new Date(x.start).toLocaleDateString(undefined,{weekday:'short'}),desc=label+': '+hours(x.uniqueRecordedMs)+' recorded, '+hours(x.uniquePlannedMs)+' planned';return '<div class="pov-bar-day '+(active?'is-today':'')+'" title="'+esc(desc)+'"><small>'+hours(x.uniquePlannedMs)+'</small><div class="pov-bars"><i style="height:'+(x.uniqueRecordedMs/max*100)+'%"></i><i style="height:'+(x.uniquePlannedMs/max*100)+'%"></i></div><span>'+esc(label)+'</span></div>'}).join('');
 const chart='<section class="pov-card pov-workload">'+heading('chart','Weekly Workload','<span class="pov-muted">'+hours(d.weekly.uniquePlannedMs)+' planned · '+hours(d.weekly.uniqueRecordedMs)+' recorded</span>')+'<div class="pov-chart"><div class="pov-week-bars" role="img" aria-label="Unique recorded and planned time for each day of this week">'+bars+'</div><div class="pov-legend"><div><i></i>Recorded <b>'+hours(d.weekly.uniqueRecordedMs)+'</b></div><div><i></i>Planned <b>'+hours(d.weekly.uniquePlannedMs)+'</b></div><small>Overlaps counted once</small></div></div></section>';
 const conflictRows=d.conflicts.slice(0,1).map(c=>'<button type="button" class="pov-conflict-row" data-v137-activity="plan" data-v137-id="'+esc(c.a.id)+'"><small>'+clock(c.from)+' – '+clock(c.to)+'</small><strong>'+esc(c.a.name||'Plan')+' vs '+esc(c.c.name||'Plan')+'</strong><span>Overlapping '+duration(c.to-c.from)+' · review ›</span></button>').join('');
 const deadlineRows=deadlines.slice(0,2).map(t=>'<button type="button" class="pov-deadline-row" data-pov-task-edit="'+esc(t.id)+'">'+icon('task','pov-row-icon')+'<span><strong>'+esc(t.name)+'</strong><small>'+esc(dateLabel(new Date(String(t.due).slice(0,10)+'T12:00:00').getTime()))+' · '+esc(t.priority||'normal')+'</small></span><b>›</b></button>').join('');
 const middle='<div class="pov-pair"><section class="pov-card">'+heading('alert','Schedule Conflicts','<span class="pov-badge">'+d.conflicts.length+'</span>')+(conflictRows||'<p class="pov-empty">No overlapping plans this week.</p>')+(d.conflicts.length>1?'<button type="button" class="pov-text-button" data-v136-tab="calendar">View calendar ›</button>':'')+'</section><section class="pov-card">'+heading('flag','Important Deadlines','<span class="pov-badge">'+d.deadlines.length+'</span>')+(deadlineRows||'<p class="pov-empty">No upcoming deadlines.</p>')+'</section></div>';
 const start=new Date(d.bounds.start),end=new Date(d.bounds.end-1),week='Week '+isoWeek(+start)+' · '+start.toLocaleDateString(undefined,{day:'numeric',month:'short'})+' – '+end.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
 const summary='<section class="pov-card pov-summary">'+heading('target','Weekly Summary','<span class="pov-muted">'+esc(week)+'</span>')+'<div class="pov-summary-grid"><div><strong>'+d.confirmed+' / '+d.weekPlans.length+'</strong><small>Plans confirmed</small></div><div><strong>'+hours(d.weekly.uniqueRecordedMs)+'</strong><small>Unique recorded</small></div><div><strong>'+hours(d.weekly.uniquePlannedMs)+'</strong><small>Unique planned</small></div><div><strong>'+(d.habits.total?d.habits.checked+' / '+d.habits.total:'—')+'</strong><small>Habits checked</small></div></div></section>';
 host.innerHTML=top+chart+middle+summary;
}
function nativeTask(id,action){return [...(root.document?.querySelectorAll('#todoList [data-todo-act="'+action+'"]')||[])].find(x=>String(x.dataset.todoId)===String(id))}
function init(){
 const workspace=root.document?.getElementById('v136Workspace');host=root.document?.getElementById('lifeosPlanOverview');if(!workspace||!host)return false;if(host.dataset.ready)return true;host.dataset.ready='true';
 workspace.addEventListener('click',event=>{
  if(event.target.closest('[data-pov-search-toggle]')){if(workspace.querySelector('[data-v136-tab="overview"]')?.getAttribute('aria-selected')!=='true')workspace.querySelector('[data-v136-tab="overview"]')?.click();const panel=workspace.querySelector('.pov-search');panel.hidden=!panel.hidden;if(!panel.hidden)workspace.querySelector('#povSearch')?.focus();else{query='';workspace.querySelector('#povSearch').value='';render()}return}
  if(event.target.closest('[data-pov-theme]')){root.document.querySelector('.lifeos-theme-toggle')?.click();workspace.querySelector('.pov-settings').open=false;return}
  if(event.target.closest('[data-pov-settings]')){workspace.querySelector('.pov-settings').open=false;const button=root.document.getElementById('lo14SettingsButton')||root.document.querySelector('.lifeos-settings-action');if(button)button.click();else workspace.querySelector('[data-v136-tab="more"]')?.click();return}
  const edit=event.target.closest('[data-pov-task-edit]');if(edit){workspace.querySelector('[data-v136-tab="tasks"]')?.click();const native=nativeTask(edit.dataset.povTaskEdit,'edit');if(native)native.click();return}
 });
 workspace.addEventListener('input',event=>{if(event.target.id==='povSearch'){query=event.target.value.trim().toLocaleLowerCase();render()}});
 workspace.addEventListener('change',event=>{const input=event.target.closest('[data-pov-todo]');if(!input)return;const native=nativeTask(input.dataset.povTodo,'toggle');if(native){native.checked=input.checked;native.dispatchEvent(new Event('change',{bubbles:true}))}render()});
 const refresh=()=>{if(root.document.body.dataset.lifeosView==='schedule')render()};
 for(const name of ['lifeos-v77-tracking-changed','lifeos-v74-records-changed','lifeos-v65-plan-committed','lifeos-v76-activation-changed'])root.addEventListener(name,refresh);
 root.document.querySelector('#lifeosNavigation [data-view="schedule"]')?.addEventListener('click',()=>root.setTimeout(refresh,50));
 for(const id of ['todoList','scheduleList']){const node=root.document.getElementById(id);if(node){observer??=new MutationObserver(refresh);observer.observe(node,{childList:true,subtree:true})}}
 root.document.addEventListener('visibilitychange',()=>{if(!root.document.hidden)refresh()});root.setInterval(()=>{if(!root.document.hidden)refresh()},60000);
 render();return true;
}
if(root.document){const boot=()=>{if(!init())root.setTimeout(boot,250)};if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()}
return {build,bounds,render,init};
});
