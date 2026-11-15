/* LifeOS V106–V110 — integrated personal readiness panels.
 * Read-only evidence, explicit navigation and no fabricated tracked activity.
 * V106 reports synchronization boundaries, NOT account-level sync.
 * V110 reports calendar review readiness, NOT Google OAuth completion. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSCoreCompletionV110=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const DAY=86400000,IS_SAMPLE=x=>Boolean(x?.seedBatch||['assumed-demo','development-starter','imported-example'].includes(x?.source));
const local=ms=>{const d=new Date(ms);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function syncAudit(workspace,store){
 const localKeys=['lifeos.personal.duration-profiles.v80','lifeos.personal.fitness-presets.v83','lifeos.personal.exercise-plans.v95','lifeos.personal.exercise-progress.v100','lifeos.personal.friends-consent.v90'];
 const present=localKeys.filter(k=>{try{return store?.getItem(k)!==null}catch{return false}});
 const sessions=(workspace?.sessions||[]).filter(x=>!IS_SAMPLE(x));
 const cloudGroups=root.LifeOSPreferencesSyncV89?.ALLOWED||['durations','workouts','exercisePlans'];
 return {localSettings:present.length,trackedSessions:sessions.length,cloudPreferenceGroups:[...cloudGroups],manualProgressTransfer:true,accountIsolated:false,activitySyncVerified:false,
  message:'Private-workspace preferences require review. Exercise progress has separate manual transfer. Account-isolated activity synchronization has not been verified.'};
}
function timerAudit(workspace,at=Date.now(),profileApi=root.LifeOSDurationProfilesV80,guard=root.LifeOSDurationGuardV78){
 const sessions=(workspace?.sessions||[]).filter(x=>x&&!IS_SAMPLE(x)&&['running','paused'].includes(x.status));
 const profiles=profileApi?.savedProfiles?.(root.localStorage)||{};
 const items=sessions.map(s=>{
  const malformed=!Array.isArray(s.segments)||!s.segments.length||s.segments.some(seg=>!seg||!Number.isFinite(seg.start)||seg.start>at+60000||(seg.end!=null&&(!Number.isFinite(seg.end)||seg.end<seg.start)));
  const open=s.segments?.filter(x=>x?.end==null).length||0;
  const expected=profileApi?.effective?.(s.name,profiles,guard)?.minutes||guard?.suggestion?.(s.name)||60;
  const minutes=Math.max(0,(guard?.elapsed?.(s,at)||0)/60000);
  const warning=malformed||(s.status==='running'?open!==1:open!==0);
  return {id:String(s.id||''),name:String(s.name||'Activity'),status:s.status,minutes,expectedMinutes:expected,overdue:s.status==='running'&&minutes>expected,malformed:warning,reason:warning?'Timer data needs review':s.status==='paused'?'Paused timer':minutes>expected?'Longer than expected':'Within expected duration'};
 });
 return {total:items.length,running:items.filter(x=>x.status==='running').length,overdue:items.filter(x=>x.overdue).length,invalid:items.filter(x=>x.malformed).length,items};
}
function habitsAudit(workspace,at=Date.now(),days=14){
 if(![7,14,30].includes(days))throw Error('Unsupported habit analysis period');
 const defs=(workspace?.habitDefinitions||[]).filter(x=>x&&!IS_SAMPLE(x)),checks=(workspace?.habitChecks||[]).filter(x=>x&&!IS_SAMPLE(x)&&x.done);
 const today=local(at),start=new Date(today+'T12:00:00').getTime()-(days-1)*DAY;
 const rows=[];
 for(const def of defs){
  const freq=Number(def.everyDays)||1,begin=def.startDate||local(def.createdAt||at);
  const scheduled=[];
  for(let offset=0;offset<days;offset++){
   const date=new Date(start);date.setDate(date.getDate()+offset);
   const key=local(date.getTime());
   const distance=Math.round((new Date(key+'T12:00:00')-new Date(begin+'T12:00:00'))/DAY);
   if(distance>=0&&distance%freq===0&&key<=today)scheduled.push(key);
  }
  const completed=new Set(checks.filter(c=>c.habitId===def.id).map(c=>c.date));
  const done=scheduled.filter(x=>completed.has(x)).length;
  rows.push({id:String(def.id),name:String(def.title||'Habit'),scheduled:scheduled.length,completed:done,rate:scheduled.length?Math.round(done/scheduled.length*100):null});
 }
 return {days,rows,scheduled:rows.reduce((n,x)=>n+x.scheduled,0),completed:rows.reduce((n,x)=>n+x.completed,0),warning:'Completion relies on confirmed habit checks. Time tracking does not automatically mark a habit completed.'};
}
function lifestyleAudit(workspace,exerciseRecords,at=Date.now(),days=14){
 const today=local(at),from=local(new Date(today+'T12:00:00').getTime()-(days-1)*DAY);
 const workouts=(workspace?.workouts||[]).filter(x=>x&&!IS_SAMPLE(x)&&x.date>=from&&x.date<=today);
 const meals=(workspace?.meals||[]).filter(x=>x&&!IS_SAMPLE(x)&&x.date>=from&&x.date<=today);
 const workoutsById=new Map(workouts.map(x=>[String(x.id),x.date]));
 const entries=(Array.isArray(exerciseRecords)?exerciseRecords:[]).filter(x=>workoutsById.get(String(x.workoutId))===x.date);
 const byExercise=new Map();
 for(const row of entries){const name=String(row.exercise||'Unknown'),current=byExercise.get(name)||{exercise:name,count:0,bestLoad:null};
  current.count++;
  if(Number.isFinite(row.load))current.bestLoad=Math.max(current.bestLoad??0,row.load);
  byExercise.set(name,current);
 }
 return {workouts:workouts.length,workoutDays:new Set(workouts.map(x=>x.date)).size,meals:meals.length,linkedExerciseEntries:entries.length,unmatchedExerciseEntries:(exerciseRecords||[]).length-entries.length,
  exercises:[...byExercise.values()].sort((a,b)=>b.count-a.count),warning:'These are recorded workouts, meals and user-confirmed exercise details. Unlogged meals and estimated calories are not inferred.'};
}
function calendarAudit(state,workspace,at=Date.now()){
 const events=(state?.events||[]).filter(e=>e&&Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.end>e.start);
 const approved=new Set(Array.isArray(state?.approved)?state.approved:[]);
 const already=new Set((workspace?.schedule||[]).map(p=>p?.calendarKey).filter(Boolean));
 let pending=0,approvedCount=0,ready=0,conflicts=0,alreadyPlanned=0;
 for(const e of events){
  const key=String(e.uid||'')+'|'+e.start,planKey=String(e.source||'')+'|'+String(e.uid||'')+'|'+e.start;
  if(!approved.has(key)){pending++;continue}
  approvedCount++;
  if(already.has(planKey)){alreadyPlanned++;continue}
  const overlap=(workspace?.schedule||[]).some(p=>p&&p.status!=='cancelled'&&p.status!=='skipped'&&Number.isFinite(p.startAt)&&Number.isFinite(p.endAt)&&p.startAt<e.end&&e.start<p.endAt);
  if(overlap)conflicts++;else ready++;
 }
 return {total:events.length,pending,approved:approvedCount,ready,conflicts,alreadyPlanned,invalid:(state?.events||[]).length-events.length,
  warning:'Approved calendar events are still candidates. No actual activity or planned event is created by this check; use Calendar Review and the approved Plan handoff.'};
}
function readCalendar(store){try{const d=JSON.parse(store.getItem('lifeos-stage23-calendar-v1')||'null');return d&&Array.isArray(d.events)&&Array.isArray(d.approved)?d:{events:[],approved:[]}}catch{return {events:[],approved:[]}}}
function mount(){
 const host=document.getElementById('lo14SettingsHub');if(!host||document.getElementById('lo110-core'))return;
 const pane=document.createElement('details');pane.id='lo110-core';pane.innerHTML='<summary>Core feature health · V106–V110</summary><p class="sub">Five read-only checks for sync boundaries, timers, habits, fitness, and calendar handoff. Nothing is created, edited or imported.</p><label>Review period <select id="lo110-period"><option value="7">7 days</option><option value="14" selected>14 days</option><option value="30">30 days</option></select></label><div id="lo110-results"></div><button class="btn outline" id="lo110-refresh" type="button">Refresh feature health</button><p id="lo110-notice" role="status"></p>';
 host.prepend(pane);
 const style=document.createElement('style');style.textContent=`
 #lo110-core{margin:14px 0;padding:16px;background:#17243b;color:#eff6ff;border:1px solid #4c6c8b;border-radius:14px}
 #lo110-core summary{font-weight:700;font-size:17px;cursor:pointer}
 #lo110-core .lo110-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:12px 0}
 #lo110-core article{padding:12px;border:1px solid #476280;border-radius:10px;background:#253954}
 #lo110-core strong,#lo110-core small{display:block}#lo110-core strong{font-size:21px}#lo110-core small{color:#bfd1e6;font-size:12px}
 #lo110-core select{padding:8px;background:#13243d;color:#fff;border:1px solid #6283a5;border-radius:8px}
 `;document.head.append(style);
 const el=id=>pane.querySelector('#'+id);
 function render(){
  const ws=root.lifeosReadOnlyWorkspace?.()||{},days=Number(el('lo110-period').value);
  const sync=syncAudit(ws,root.localStorage),timers=timerAudit(ws),habits=habitsAudit(ws,Date.now(),days);
  const exercise=root.LifeOSExerciseProgressV100?.read?.(root.localStorage)||[];
  const life=lifestyleAudit(ws,exercise,Date.now(),days),cal=calendarAudit(readCalendar(root.localStorage),ws);
  const cards=[
   ['Sync boundary',sync.cloudPreferenceGroups.length+' groups','Reviewed preferences only; no true multi-user accounts'],
   ['Active timers',timers.running+' running',timers.overdue+' overdue · '+timers.invalid+' need review'],
   ['Habit confirmations',habits.completed+'/'+habits.scheduled,days+'-day scheduled opportunities'],
   ['Logged workouts',String(life.workouts),life.workoutDays+' workout days · '+life.linkedExerciseEntries+' linked exercise details'],
   ['Logged meals',String(life.meals),'No missing meals inferred'],
   ['Calendar review',String(cal.pending)+' pending',cal.approved+' approved · '+cal.conflicts+' planning overlaps']
  ];
  const result=el('lo110-results');result.replaceChildren();const grid=document.createElement('div');grid.className='lo110-grid';
  for(const [label,value,note] of cards){const art=document.createElement('article'),title=document.createElement('span'),v=document.createElement('strong'),caption=document.createElement('small');title.textContent=label;v.textContent=value;caption.textContent=note;art.append(title,v,caption);grid.append(art)}result.append(grid);
  const notes=document.createElement('p');notes.className='sub';notes.textContent='V107: '+(timers.overdue?timers.overdue+' overdue timer(s) need explicit review; no automatic end time is assumed.':'No overdue running timers found.')+' V108: habit completion is based on confirmed checks. V110: Calendar Review remains approval-only.';result.append(notes);
  el('lo110-notice').textContent='Checked local workspace. No changes were made.';
 }
 el('lo110-period').onchange=render;el('lo110-refresh').onclick=render;
 root.addEventListener('lifeos-v75-changed',render);root.addEventListener('lifeos-v77-tracking-changed',render);
 render();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {syncAudit,timerAudit,habitsAudit,lifestyleAudit,calendarAudit,readCalendar};
});