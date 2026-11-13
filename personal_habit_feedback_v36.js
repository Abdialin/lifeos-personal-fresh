/* LifeOS V36 — approval-to-outcome feedback loop.
   Read-only: no automatic habit completion, changed schedules, or invented tracking. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dateKey=t=>{const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const fmtTime=t=>new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const mins=ms=>Math.round(ms/60000);
const state=()=>{try{return window.lifeosReadOnlyWorkspace?.()||null}catch{return null}};
const bridge=()=>window.lifeosSocialHabitBridge?.read()||{};
let period=28,initialized=false,expanded=true;
function sessionMs(s,at=Date.now()){
 return (Array.isArray(s?.segments)?s.segments:[]).reduce((total,part)=>{
  const start=Number(part.start),end=part.end===null||part.end===undefined?Math.min(at,Number(s.endAt)||at):Number(part.end);
  return total+(Number.isFinite(start)&&Number.isFinite(end)&&end>start?end-start:0);
 },0);
}
function outcomes(workspace,habits,windowDays=28,now=Date.now()){
 const begin=new Date(now);begin.setHours(0,0,0,0);begin.setDate(begin.getDate()-windowDays+1);
 const today=new Date(now);today.setHours(23,59,59,999);
 const definitions=new Map((habits.habitDefinitions||[]).map(x=>[x.id,x]));
 const sessions=new Map((workspace.sessions||[]).map(x=>[x.id,x]));
 const checked=new Set((habits.habitChecks||[]).filter(x=>x.done).map(x=>x.habitId+'|'+x.date));
 const plans=(workspace.schedule||[]).filter(p=>p.source==='approved-habit-proposal'&&p.habitId&&Number.isFinite(Number(p.startAt))&&Number(p.startAt)>=begin.getTime()&&Number(p.startAt)<=today.getTime());
 return plans.map(p=>{
  const start=Number(p.startAt),end=Number(p.endAt),plannedMs=end-start;
  const s=sessions.get(p.sessionId)||(workspace.sessions||[]).find(x=>x.plannedId===p.id);
  const measured=!!s&&s.status==='finished';
  const started=!!s&&!measured;
  const actualMs=measured?sessionMs(s,now):null;
  const delta=actualMs===null?null:actualMs-plannedMs;
  const status=p.status==='skipped'?'skipped':measured?'completed':started?'in progress':end<now?'unconfirmed':'upcoming';
  const valid=plannedMs>0&&plannedMs<=24*3600000;
  const def=definitions.get(p.habitId),habitDay=dateKey(start);
  return {id:p.id,habitId:p.habitId,name:p.name||def?.title||'Planned habit',startAt:start,endAt:end,
   status:valid?status:'invalid plan',plannedMs:valid?plannedMs:null,actualMs:valid?actualMs:null,
   deltaMs:valid?delta:null,checked:checked.has(p.habitId+'|'+habitDay),habitExists:!!def,
   trackedSessionId:s?.id||null,assumed:Boolean(s?.seedBatch||s?.source==='assumed-demo'),source:'approved plan'};
 }).sort((a,b)=>b.startAt-a.startAt);
}
function summary(items){
 const completed=items.filter(x=>x.status==='completed'&&!x.assumed&&x.plannedMs!==null&&x.actualMs!==null);
 const skipped=items.filter(x=>x.status==='skipped').length;
 const pending=items.filter(x=>['unconfirmed','in progress'].includes(x.status)).length;
 const upcoming=items.filter(x=>x.status==='upcoming').length;
 const totalPlan=completed.reduce((n,x)=>n+x.plannedMs,0),totalReal=completed.reduce((n,x)=>n+x.actualMs,0);
 const mean=completed.length?mins((totalReal-totalPlan)/completed.length):null;
 const adherence=completed.length?Math.round(completed.filter(x=>x.actualMs>=x.plannedMs*.8).length/completed.length*100):null;
 const percentage=totalPlan>0?Math.round(totalReal/totalPlan*100):null;
 return {completed:completed.length,skipped,pending,upcoming,totalPlan,totalReal,mean,adherence,percentage,completedRows:completed};
}
function insight(s){
 if(s.completed<3)return '<p class="lo36-muted">At least 3 finished, non-assumed sessions linked to approved habit plans are needed before duration-pattern feedback is shown. Unconfirmed plans are not assumed to be missed.</p>';
 const measured=s.completedRows,short=measured.filter(x=>x.actualMs<x.plannedMs*.8).length;
 const long=measured.filter(x=>x.actualMs>x.plannedMs*1.2).length;
 const within=measured.length-short-long;
 const explanation=short>measured.length/2?
  'Most completed sessions were shorter than planned. You could review whether the planned duration is realistic; do not change it unless this reflects your experience.':
  long>measured.length/2?
  'Most completed sessions took longer than planned. You could consider allowing a larger time window or a buffer.':
  'Most completed sessions were within ±20% of their planned duration. There is no strong duration-related reason to change your current plan.';
 return '<div class="lo36-pattern"><strong>What the recorded sessions suggest</strong><p>'+esc(explanation)+'</p>'+
 '<small>'+within+' within 20% · '+short+' shorter · '+long+' longer · '+measured.length+' finished sessions analyzed. This is a descriptive pattern, not a prediction.</small></div>';
}
function detail(x){
 const planned=x.plannedMs===null?'Unknown':mins(x.plannedMs)+' min';
 const actual=x.actualMs===null?'Not available':mins(x.actualMs)+' min';
 const diff=x.deltaMs===null?'':' · '+(x.deltaMs<0?'−':'+')+Math.abs(mins(x.deltaMs))+' min vs plan';
 const habit=x.checked?'Habit completion recorded':'No habit completion linked for that date';
 const status=x.status==='unconfirmed'?'Unconfirmed outcome':x.status==='upcoming'?'Upcoming':x.status==='skipped'?'Skipped':x.status==='completed'?'Completed timer':x.status==='in progress'?'Timer in progress':'Invalid';
 return '<article class="lo36-row"><div class="lo36-row-top"><strong>'+esc(x.name)+'</strong><span data-status="'+esc(x.status)+'">'+esc(status)+'</span></div>'+
 '<small>'+esc(fmtTime(x.startAt))+' · planned '+esc(planned)+' · actual '+esc(actual)+esc(diff)+'</small>'+
 '<p>'+esc(habit)+(x.assumed?' · Assumed timer excluded from trend calculations':'')+(x.habitExists?'':' · Habit definition missing')+'</p></article>';
}
function render(){
 const el=$('lo36HabitFeedback'),w=state();if(!el||!w)return;
 const list=outcomes(w,bridge(),period),stats=summary(list);
 const hadOpen=el.querySelector('#lo36FeedbackDetails')?.open??expanded;
 el.innerHTML='<details id="lo36FeedbackDetails" '+(hadOpen?'open':'')+'><summary>Smart Schedule feedback · approved habit plans</summary>'+
 '<p class="lo36-muted">Compares approved LifeOS habit plans with their explicitly linked timer sessions. Planned time is not tracked time. An unconfirmed plan does not prove inactivity.</p>'+
 '<div class="lo36-range" role="group" aria-label="Review time range"><button type="button" data-lo36-days="7" aria-pressed="'+(period===7)+'">7 days</button><button type="button" data-lo36-days="28" aria-pressed="'+(period===28)+'">28 days</button></div>'+
 '<div class="lo36-summary"><div><strong>'+list.length+'</strong><small>Approved habit plans</small></div>'+
 '<div><strong>'+stats.completed+'</strong><small>Completed with finished timer</small></div>'+
 '<div><strong>'+stats.pending+'</strong><small>Unconfirmed or in progress</small></div>'+
 '<div><strong>'+stats.skipped+'</strong><small>Skipped</small></div></div>'+
 (stats.completed?'<div class="lo36-time"><strong>'+mins(stats.totalReal)+' / '+mins(stats.totalPlan)+' min</strong><span>Actual / planned time among '+stats.completed+' finished, non-assumed sessions</span></div>':'')+
 insight(stats)+
 (list.length?'<div class="lo36-rows">'+list.slice(0,20).map(detail).join('')+'</div>':'<p class="lo36-muted">No approved habit plans found in this period. To begin: Insights → Habit recommendations → Propose time in Plan.</p>')+
 '<p class="lo36-muted">To record an outcome, open Plan and start the planned session with its own Start tracked session button. The timer records the result when finished. Habit completion still requires your review under Habits.</p>'+
 '<button type="button" class="btn outline" id="lo36OpenPlan">Open Plan →</button></details>';
 expanded=hadOpen;
}
function init(){
 const anchor=$('lo35PlanReview')||$('lo34Recommendations')||$('lo33HabitInsights');if(!anchor||initialized)return;initialized=true;
 const root=document.createElement('section');root.id='lo36HabitFeedback';root.className='lo36-feedback';anchor.after(root);
 root.addEventListener('click',e=>{
  const range=e.target.closest('[data-lo36-days]');
  if(range){period=Number(range.dataset.lo36Days)===7?7:28;expanded=true;render();return}
  if(e.target.closest('#lo36OpenPlan'))document.querySelector('#lifeosNavigation [data-view="schedule"]')?.click();
 });
 root.addEventListener('toggle',e=>{if(e.target.id==='lo36FeedbackDetails')expanded=e.target.open},true);
 render();
 document.addEventListener('click',e=>{if(e.target.closest('#lifeosNavigation,#scheduleList,#lo35PlanReview'))setTimeout(render,110)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 setInterval(()=>{if(!document.hidden&&root.offsetParent!==null)render()},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.lifeosHabitFeedbackV36={outcomes,summary,render};
})();