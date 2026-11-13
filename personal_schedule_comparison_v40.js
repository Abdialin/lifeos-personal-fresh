/* LifeOS V40 — Reality / Predicted / Ideal schedule comparison.
 * Read-only. A plan is not a tracked session, and a preference is not a booking. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const workspace=()=>{try{return window.lifeosReadOnlyWorkspace?.()||{}}catch{return {}}};
const local=t=>{const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const dateTime=t=>new Date(t).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const pad=n=>String(n).padStart(2,'0');
const min=ms=>Math.round(ms/60000);
let selected='reality',initialized=false,expanded=false;
function duration(s,now){
 return (s.segments||[]).reduce((sum,x)=>{
  const a=Number(x.start),b=x.end==null?Math.min(Number(s.endAt)||now,now):Number(x.end);
  return sum+(Number.isFinite(a)&&Number.isFinite(b)&&b>a?b-a:0);
 },0);
}
function analyze(w,now=Date.now()){
 const today=new Date(now);today.setHours(0,0,0,0);
 const past=new Date(today);past.setDate(past.getDate()-7);
 const future=new Date(today);future.setDate(future.getDate()+7);
 const sessions=(w.sessions||[]).filter(s=>s.status==='finished'&&Number.isFinite(Number(s.startAt))&&s.startAt>=past.getTime()&&s.startAt<today.getTime());
 const assumed=sessions.filter(s=>Boolean(s.seedBatch||s.source==='assumed-demo'||s.source==='development-starter'));
 const verified=sessions.filter(s=>!assumed.includes(s));
 const realMinutes=verified.reduce((acc,s)=>acc+duration(s,now),0);
 const futurePlans=(w.schedule||[]).filter(p=>p.status!=='skipped'&&p.status!=='cancelled'&&Number.isFinite(Number(p.startAt))&&p.startAt>=today.getTime()&&p.startAt<future.getTime());
 const pastPlans=(w.schedule||[]).filter(p=>p.status!=='skipped'&&p.status!=='cancelled'&&Number.isFinite(Number(p.startAt))&&p.startAt>=past.getTime()&&p.startAt<today.getTime());
 const completedPast=pastPlans.filter(p=>p.sessionId&&verified.some(s=>s.id===p.sessionId));
 const unresolvedPast=pastPlans.filter(p=>!p.sessionId&&p.endAt<now);
 const futureMinutes=futurePlans.reduce((total,p)=>total+Math.max(0,Number(p.endAt)-Number(p.startAt)),0);
 const ideal=(w.idealRoutines||[]).filter(x=>Number.isInteger(Number(x.dayOfWeek))&&x.dayOfWeek>=0&&x.dayOfWeek<=6&&Number.isFinite(Number(x.durationMinutes))&&x.durationMinutes>0);
 const ideals=[];
 for(let i=0;i<7;i++){
  const d=new Date(today);d.setDate(d.getDate()+i);
  for(const item of ideal.filter(x=>Number(x.dayOfWeek)===d.getDay())){
   const parts=String(item.start||'').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
   if(!parts)continue;
   const start=new Date(d);start.setHours(Number(parts[1]),Number(parts[2]),0,0);
   const end=start.getTime()+Number(item.durationMinutes)*60000;
   ideals.push({name:item.name||'Ideal routine',startAt:start.getTime(),endAt:end});
  }
 }
 const idealMinutes=ideals.reduce((n,x)=>n+x.endAt-x.startAt,0);
 const overlap=(items)=>{let count=0;for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)if(items[i].startAt<items[j].endAt&&items[j].startAt<items[i].endAt)count++;return count};
 const idealPlanConflicts=ideals.filter(ideal=>futurePlans.some(plan=>plan.startAt<ideal.endAt&&plan.endAt>ideal.startAt)).length;
 return {past:{sessions,verified,assumed,minutes:realMinutes,planned:pastPlans,completed:completedPast,unresolved:unresolvedPast},
  future:{plans:futurePlans,minutes:futureMinutes,overlap:overlap(futurePlans)},
  ideal:{items:ideals,minutes:idealMinutes,overlaps:overlap(ideals),conflicts:idealPlanConflicts},
  dates:{from:local(past.getTime()),today:local(today.getTime()),through:local(future.getTime())}};
}
function entry(x,status){return '<div class="lo40-item"><strong>'+esc(x.name||'Activity')+'</strong><small>'+esc(dateTime(x.startAt))+(status?' · '+status:'')+'</small></div>'}
function render(){
 const root=$('lo40Compare');if(!root)return;
 const w=workspace(),stats=analyze(w);
 const wasOpen=$('lo40Details')?.open??expanded;
 const statsView={
  reality:{title:'My Reality',description:'Finished, non-assumed timer sessions from the previous 7 complete days. These are recorded facts, not planned or predicted availability.',counts:[
   [stats.past.verified.length,'Finished real sessions'],[min(stats.past.minutes)+' min','Summed tracked time'],[stats.past.assumed.length,'Assumed examples excluded'],[stats.past.unresolved.length,'Past plans without linked timers']],
   rows:stats.past.verified.slice().sort((a,b)=>b.startAt-a.startAt).slice(0,6).map(x=>entry(x,'tracked')).join(''),
   foot:'Overlapping timers can make summed duration greater than unique occupied time. Unlogged periods remain unknown.'},
  predicted:{title:'My Predicted Week',description:'Confirmed upcoming LifeOS plans only. Historical pattern suggestions are separate and require review before becoming plans.',counts:[
   [stats.future.plans.length,'Upcoming plans'],[min(stats.future.minutes)+' min','Summed planned time'],[stats.future.overlap,'Plan overlap pairs'],[stats.past.completed.length+'/'+stats.past.planned.length,'Past plans with confirmed linked timers']],
   rows:stats.future.plans.slice().sort((a,b)=>a.startAt-b.startAt).slice(0,6).map(x=>entry(x,'planned')).join(''),
   foot:'Plans are commitments, not proof of actual activity. No missing time is labeled available.'},
  ideal:{title:'My Ideal Schedule',description:'Your configured recurring preferences projected into the coming 7 days. These do not become commitments until explicitly approved.',counts:[
   [stats.ideal.items.length,'Preferred routine instances'],[min(stats.ideal.minutes)+' min','Summed preferred time'],[stats.ideal.overlaps,'Overlapping preferences'],[stats.ideal.conflicts,'Preferences overlapping plans']],
   rows:stats.ideal.items.slice().sort((a,b)=>a.startAt-b.startAt).slice(0,6).map(x=>entry(x,'preference')).join(''),
   foot:'Ideal preferences are neither predictions nor booked activities. Review collisions before proposing a schedule.'}
 };
 const pane=statsView[selected]||statsView.reality;
 root.innerHTML='<details id="lo40Details" '+(wasOpen?'open':'')+'><summary>Reality ↔ Predicted ↔ Ideal <small>· schedule comparison</small></summary>'+
 '<p class="lo40-sub">See how recorded activity, saved future commitments and preferred routines differ. Each view has a distinct evidence basis.</p>'+
 '<div class="lo40-tabs" role="group" aria-label="Compare planning views">'+
 [['reality','Reality'],['predicted','Predicted'],['ideal','Ideal']].map(([k,label])=>'<button type="button" data-lo40-tab="'+k+'" aria-pressed="'+(selected===k)+'">'+label+'</button>').join('')+'</div>'+
 '<div class="lo40-head"><strong>'+pane.title+'</strong><p>'+pane.description+'</p></div>'+
 '<div class="lo40-stats">'+pane.counts.map(([value,label])=>'<div><strong>'+esc(value)+'</strong><small>'+esc(label)+'</small></div>').join('')+'</div>'+
 '<div class="lo40-entries">'+(pane.rows||'<p class="lo40-sub">No relevant records in this comparison window.</p>')+'</div>'+
 '<p class="lo40-sub">'+pane.foot+'</p>'+
 '<div class="lo40-footer"><button type="button" class="btn outline" id="lo40GoPlan">Review calendar ↓</button>'+
 (selected==='ideal'?'<button type="button" class="btn outline" id="lo40OpenIdeal">Edit ideal routines ↓</button>':'')+'</div></details>';
 expanded=wasOpen;
}
function init(){
 const panel=$('scheduleEditorPanel');if(!panel||initialized)return;initialized=true;
 const root=document.createElement('section');root.id='lo40Compare';root.className='lo40-compare';
 const briefing=$('lo39PlanningBrief');if(briefing)briefing.after(root);else panel.prepend(root);
 root.addEventListener('click',e=>{
  const tab=e.target.closest('[data-lo40-tab]');
  if(tab){selected=tab.dataset.lo40Tab;expanded=true;render();return}
  if(e.target.closest('#lo40GoPlan'))$('lo11ScheduleCalendar')?.scrollIntoView({behavior:'smooth',block:'start'});
  if(e.target.closest('#lo40OpenIdeal')){
   const ideal=$('idealRoutineForm')?.closest('details');
   if(ideal){ideal.open=true;ideal.scrollIntoView({behavior:'smooth',block:'start'})}
  }
 });
 root.addEventListener('toggle',e=>{if(e.target.id==='lo40Details')expanded=e.target.open},true);
 render();
 document.addEventListener('click',e=>{if(e.target.closest('#lifeosNavigation,#scheduleList,#idealRoutineForm'))setTimeout(render,120)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.lifeosScheduleComparisonV40={analyze,render};
})();