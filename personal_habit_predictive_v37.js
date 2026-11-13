/* LifeOS V37 — evidence-informed, approval-only predictive habit scheduling.
   Predictions are proposals, never confirmed free time or actual activity. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const dayMs=s=>new Date(s+'T12:00:00').getTime();
const fmt=t=>new Date(t).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const mins=t=>Math.round(t/60000);
const read=()=>window.lifeosReadOnlyWorkspace?.()||{};
const habits=()=>window.lifeosSocialHabitBridge?.read()||{};
let currentHabit='',range=7,initialized=false;
function sessionMinutes(s){
 if(!Array.isArray(s?.segments))return null;
 return s.segments.reduce((sum,x)=>{
  const start=Number(x.start),end=x.end==null?Number(s.endAt):Number(x.end);
  return sum+(Number.isFinite(start)&&Number.isFinite(end)&&end>start?(end-start)/60000:0);
 },0);
}
function samples(def,workspace,lookback=30,now=Date.now()){
 const start=now-lookback*86400000,terms=String(def.matchText||def.title||'').trim().toLowerCase();
 if(!terms)return[];
 const allowed=(s)=>s.status==='finished'&&Number.isFinite(Number(s.startAt))&&Number(s.startAt)>=start&&Number(s.startAt)<=now&&!s.seedBatch&&s.source!=='assumed-demo'&&s.source!=='development-starter';
 const finished=(workspace.sessions||[]).filter(allowed);
 const linked=(workspace.schedule||[]).filter(p=>p.habitId===def.id&&p.source==='approved-habit-proposal'&&p.sessionId).map(p=>p.sessionId);
 const matched=finished.filter(s=>linked.includes(s.id)||String(s.name||'').toLowerCase().includes(terms));
 const byId=new Map(matched.map(s=>[s.id,s]));
 return [...byId.values()].map(s=>{
  const duration=sessionMinutes(s);
  return {start:Number(s.startAt),duration:Number.isFinite(duration)&&duration>0?duration:null,id:s.id};
 }).sort((a,b)=>b.start-a.start).slice(0,20);
}
function timeRecommendation(def,workspace,now=Date.now()){
 const past=samples(def,workspace,30,now),count=past.length;
 const minutesObserved=past.map(x=>x.duration).filter(x=>x!==null&&x>=5&&x<=480).sort((a,b)=>a-b);
 const requested=def.targetMode==='minutes'&&Number(def.targetAmount)>=5&&Number(def.targetAmount)<=480?Math.round(Number(def.targetAmount)):null;
 const duration=requested||(minutesObserved.length>=3?Math.max(5,Math.min(480,Math.round(minutesObserved[Math.floor(minutesObserved.length/2)]))):30);
 // Use a robust median start-of-day; avoid interpreting unknown gaps as free time.
 const recentHours=past.map(x=>{const d=new Date(x.start);return d.getHours()*60+d.getMinutes()}).sort((a,b)=>a-b);
 const observedMinute=recentHours.length>=3?recentHours[Math.floor(recentHours.length/2)]:null;
 const startMinute=observedMinute??1140;
 const confidence=count>=10?'Moderate':count>=5?'Limited':'Low';
 return {past,count,duration,startMinute,confidence,source:observedMinute===null?'Manual starting point (19:00), not inferred from activity history':'Median start time from finished matching sessions'};
}
function dueDates(def,startDate,countDays){
 const created=def.startDate||dateKey(new Date(def.createdAt||Date.now())),every=Number(def.everyDays)||1;
 const out=[];
 for(let i=0;i<countDays;i++){
  const day=new Date(startDate);day.setHours(12,0,0,0);day.setDate(day.getDate()+i);
  const date=dateKey(day),delta=Math.round((dayMs(date)-dayMs(created))/86400000);
  if(delta>=0&&delta%every===0)out.push(day);
 }
 return out;
}
function conflicts(start,end,workspace){
 return (workspace.schedule||[]).filter(p=>p.status!=='skipped'&&p.status!=='cancelled'&&Number(p.startAt)<end&&Number(p.endAt)>start);
}
function predict(def,workspace,days=7,now=Date.now()){
 const rec=timeRecommendation(def,workspace,now),tomorrow=new Date(now);tomorrow.setHours(12,0,0,0);tomorrow.setDate(tomorrow.getDate()+1);
 const options=dueDates(def,tomorrow,days).map(day=>{
  const start=new Date(day);start.setHours(Math.floor(rec.startMinute/60),rec.startMinute%60,0,0);
  const end=start.getTime()+rec.duration*60000;
  const conflict=conflicts(start.getTime(),end,workspace);
  return {habitId:def.id,title:def.title,startAt:start.getTime(),endAt:end,duration:rec.duration,conflict,confidence:rec.confidence};
 });
 return {rec,options};
}
function render(){
 const root=$('lo37PredictiveHabits');if(!root)return;
 const b=habits(),workspace=read(),defs=b.habitDefinitions||[];
 if(!currentHabit||!defs.some(x=>x.id===currentHabit))currentHabit=defs[0]?.id||'';
 const def=defs.find(x=>x.id===currentHabit);
 const result=def?predict(def,workspace,range):null;
 root.innerHTML='<details id="lo37PredictionDetails"><summary>Predictive habit scheduling · review proposals</summary>'+
 '<p class="lo37-note">LifeOS uses finished activity evidence to suggest possible slots. A prediction does not establish that the surrounding time is free. Check your external commitments before approving anything.</p>'+
 (def?'<div class="lo37-controls"><label>Habit<select id="lo37HabitSelect">'+defs.map(d=>'<option value="'+esc(d.id)+'" '+(d.id===def.id?'selected':'')+'>'+esc(d.title)+'</option>').join('')+'</select></label>'+
 '<div role="group" aria-label="Prediction horizon"><button data-lo37-range="7" aria-pressed="'+(range===7)+'">7 days</button><button data-lo37-range="14" aria-pressed="'+(range===14)+'">14 days</button></div></div>'+
 '<div class="lo37-evidence"><strong>'+esc(result.rec.confidence)+' confidence</strong><p>'+result.rec.count+' real finished matching sessions over the last 30 days. '+esc(result.rec.source)+'.</p>'+
 '<small>Proposed duration: '+result.rec.duration+' min. Confidence reflects sample size only, not the probability that a time slot is free or that you will complete it.</small></div>'+
 (result.options.length?'<div class="lo37-list">'+result.options.map((x,i)=>
 '<article class="lo37-option"><div><strong>'+esc(fmt(x.startAt))+'</strong><small>'+x.duration+' min · '+esc(x.confidence)+' evidence confidence'+(x.conflict.length?' · '+x.conflict.length+' existing LifeOS plan conflict(s)':' · No overlap with saved LifeOS plans')+'</small></div>'+
 '<button type="button" class="btn '+(x.conflict.length?'outline':'primary')+'" data-lo37-index="'+i+'" '+(x.conflict.length?'disabled':'')+'>Review proposal</button></article>'
 ).join('')+'</div>':'<p class="lo37-note">No scheduled opportunities in this horizon. Change the date range or habit.</p>')+
 '<p class="lo37-note">Only approved proposals become LifeOS plans. Conflict checks do not cover Google Calendar or unlogged activities. You can edit the proposed time in the approval form.</p>':
 '<p class="lo37-note">Create a habit under My Life → Habits before using predictive scheduling.</p>')+'</details>';
}
function openCandidate(index){
 const w=read(),def=habits().habitDefinitions?.find(x=>x.id===currentHabit);if(!def)return;
 const proposal=predict(def,w,range).options[index];if(!proposal||proposal.conflict.length)return;
 const approval=window.lifeosHabitPlanApprovalV35;
 if(typeof approval?.show!=='function')return alert('The existing approval interface is unavailable. No plan was created.');
 approval.show(def.id,{name:def.title,startAt:proposal.startAt,duration:proposal.duration,origin:'predictive-habit-v37'});
}
function init(){
 const anchor=$('lo36HabitFeedback')||$('lo34Recommendations');if(!anchor||initialized)return;initialized=true;
 const host=document.createElement('section');host.id='lo37PredictiveHabits';host.className='lo37-predictive';anchor.after(host);
 host.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.lo37Range){range=Number(b.dataset.lo37Range)===14?14:7;render();return}
  if(b.dataset.lo37Index!==undefined)openCandidate(Number(b.dataset.lo37Index));
 });
 host.addEventListener('change',e=>{if(e.target.id==='lo37HabitSelect'){currentHabit=e.target.value;render()}});
 render();
 document.addEventListener('click',e=>{if(e.target.closest('#lifeosNavigation,#lo32HabitHub,#scheduleList'))setTimeout(render,110)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.lifeosPredictiveHabitsV37={samples,timeRecommendation,dueDates,predict,render};
})();