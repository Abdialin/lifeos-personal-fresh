/* LifeOS Personal V63 — concrete, review-only adjustments for the weekly plan. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSPlanningAssistantV63=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos-live-v1',HOUR=3600000;
function candidateAt(originalStart,dayStart){
 const source=new Date(originalStart),day=new Date(dayStart);
 day.setHours(source.getHours(),source.getMinutes(),source.getSeconds(),0);
 return day.getTime();
}
function propose(workspace,weekly,reviewer,now=Date.now()){
 if(!Array.isArray(weekly?.days)||typeof reviewer?.preview!=='function')return {error:'Review data is unavailable',suggestions:[]};
 const plans=Array.isArray(workspace?.schedule)?workspace.schedule:[];
 const eligible=plans.filter(p=>p&&p.status==='planned'&&!p.sessionId&&Number.isFinite(p.startAt)&&Number.isFinite(p.endAt)&&p.endAt>p.startAt&&p.startAt>now);
 const actions=[],unique=new Set();
 for(const sourceDay of weekly.days){
  if(!sourceDay.highLoad&&!sourceDay.overlaps?.length&&!sourceDay.shortBreaks?.length)continue;
  const source=eligible.filter(p=>p.startAt>=sourceDay.start&&p.startAt<sourceDay.end).sort((a,b)=>b.startAt-a.startAt);
  const destinations=weekly.days.filter(d=>d.date!==sourceDay.date&&!d.highLoad&&d.plannedMs+0.01<sourceDay.plannedMs).sort((a,b)=>a.plannedMs-b.plannedMs);
  for(const plan of source){
   for(const destination of destinations){
    const newStartAt=candidateAt(plan.startAt,destination.start);
    const check=reviewer.preview(workspace,plan.id,newStartAt,plan.startAt,plan.endAt,now);
    if(!check.ok)continue;
    const key=String(plan.id)+'|'+newStartAt;if(unique.has(key))continue;
    unique.add(key);
    const reason=sourceDay.overlaps?.length?'overlapping plans':sourceDay.highLoad?'a heavily scheduled day':'short transitions between activities';
    actions.push({id:key,planId:String(plan.id),name:String(plan.name||'Planned activity'),from:plan.startAt,to:newStartAt,oldEnd:plan.endAt,newEnd:check.endAt,sourceDate:sourceDay.date,destinationDate:destination.date,reason,
     originHours:Math.round(sourceDay.plannedMs/HOUR*10)/10,destinationHours:Math.round(destination.plannedMs/HOUR*10)/10,requiresApproval:true,verifiedAt:now,
     disclosure:'Lower scheduled hours do not prove availability. Review travel, goals, personal commitments and recovery before approving.'});
    break;
   }
   if(actions.filter(a=>a.sourceDate===sourceDay.date).length>=2)break;
  }
 }
 return {error:null,suggestions:actions.slice(0,12),considered:eligible.length};
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmt(ms){return new Date(ms).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function mount(){
 const anchor=document.getElementById('lo62-plan-review');if(!anchor||document.getElementById('lo63-assistant'))return;
 const section=document.createElement('section');section.id='lo63-assistant';section.className='lo63-assistant';section.innerHTML='<h3>Specific weekly adjustment proposals</h3><p class="sub">Move a reviewable plan to a less-scheduled day, preserving its start clock time and duration. No slot is considered free solely because the calendar is empty.</p><p data-v63-status class="lo63-status" role="status"></p><div data-v63-items class="lo63-items"></div><p data-v63-feedback class="lo63-feedback" role="status">Suggestions are not saved, booked, or tracked until you approve them in the separate plan review.</p>';anchor.appendChild(section);
 const status=section.querySelector('[data-v63-status]'),items=section.querySelector('[data-v63-items]'),feedback=section.querySelector('[data-v63-feedback]');
 let latest=[];
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
 const modules=()=>({comparison:root.LifeOSThreeViewV57,predictor:root.LifeOSPredictivePreviewV56,planner:root.LifeOSPersonalPlanner,timeline:root.LifeOSActivityTimelineV54});
 function refresh(){
  const weekly=root.LifeOSWeeklyPlanningV60?.review(read(),Date.now(),modules());
  const report=propose(read(),weekly,root.LifeOSWeeklyPlanReviewV62,Date.now());
  if(report.error){status.textContent=report.error;items.replaceChildren();latest=[];return;}
  latest=report.suggestions;status.textContent=latest.length+' proposed adjustments from '+report.considered+' eligible future plan(s). Every adjustment requires new review before saving.';
  items.innerHTML=latest.length?latest.map((p,i)=>'<article class="lo63-item"><strong>'+esc(p.name)+'</strong><p>'+esc(fmt(p.from))+' → '+esc(fmt(p.to))+'</p><p>Reason: '+esc(p.reason)+' · Origin '+p.originHours+'h planned, target day '+p.destinationHours+'h planned.</p><small>'+esc(p.disclosure)+'</small><button class="btn outline lo63-button" type="button" data-v63-open="'+i+'">Open impact review</button></article>').join(''):'<p class="sub">No conflict-free rescheduling candidates were identified. Keep your existing plans unless you choose to review them manually.</p>';
 }
 section.addEventListener('click',event=>{
  const button=event.target.closest('[data-v63-open]');if(!button)return;
  const suggestion=latest[Number(button.dataset.v63Open)];if(!suggestion)return;
  const detail={planId:suggestion.planId,newStartAt:suggestion.to,result:null};
  document.dispatchEvent(new CustomEvent('lifeos-v63-review-suggestion',{detail}));
  feedback.textContent=detail.result?.message||'The review form did not acknowledge this suggestion. No approval occurred.';
 });
 window.addEventListener('storage',e=>{if(e.key===KEY)refresh()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});refresh();
}
const api={propose,candidateAt};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount()}
return api;
});
