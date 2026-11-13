/* LifeOS V44 — mobile usability, focused navigation, no changes to user records.
 * Reuses existing Plan and Insights panels; creates no duplicate dashboards. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
let initialized=false;
function button(label,target,openIds=[]){
 const b=document.createElement('button');
 b.type='button';b.className='btn outline lo44-jump';b.textContent=label;
 b.dataset.lo44Target=target;
 if(openIds.length)b.dataset.lo44Open=openIds.join(',');
 return b;
}
function plan(){
 const editor=$('scheduleEditorPanel'),head=editor?.querySelector('.head');
 if(!head||$('lo44PlanShortcuts'))return;
 const nav=document.createElement('nav');nav.id='lo44PlanShortcuts';nav.className='lo44-plan-shortcuts';
 nav.setAttribute('aria-label','Plan quick navigation');
 nav.append(button('Calendar','lo11ScheduleCalendar'),button('Tasks','todoForm'),
  button('Compare','lo40Compare',['lo40Details']),
  button('Improve','lo42ImprovementActions',['lo40Details','lo41GapDetails','lo42ImprovementDetails']));
 head.after(nav);
 nav.addEventListener('click',e=>{
  const b=e.target.closest('[data-lo44-target]');if(!b)return;
  const target=$(b.dataset.lo44Target);if(!target)return;
  const open=(b.dataset.lo44Open||'').split(',').filter(Boolean);
  for(const id of open){const d=$(id);if(d?.tagName==='DETAILS')d.open=true}
  const dest=b.dataset.lo44Target==='todoForm'?target.closest('.panel')||target:target;
  requestAnimationFrame(()=>dest.scrollIntoView({behavior:'smooth',block:'start'}));
 });
}
function insights(){
 const root=$('analyticsPanel');
 if(!root||$('lo44InsightsCompact'))return;
 const group=document.createElement('details');group.id='lo44InsightsCompact';group.className='lo44-insights-compact';
 const summary=document.createElement('summary');summary.textContent='Habits, recommendations & predictive planning';
 group.append(summary);
 const description=document.createElement('p');description.className='lo44-help';
 description.textContent='Detailed habit evidence, optional improvements, schedule feedback and predictions. Nothing here changes plans without your approval.';
 group.append(description);
 const sections=['lo33HabitInsights','lo34Recommendations','lo35PlanReview','lo36HabitFeedback','lo37PredictiveHabits'];
 let moved=0;
 for(const id of sections){const target=$(id);if(target){group.append(target);moved++}}
 if(!moved)return;
 root.append(group);
 // Preserve explicit expansion while switching sections. If a proposal is opened,
 // show its parent section so the existing V35 confirmation stays visible.
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-lo35-plan],[data-lo37-index],[data-lo39-suggest]'))group.open=true;
 });
 const observer=new MutationObserver(()=>{
  const form=$('lo35PlanReview');
  if(form&&!form.hidden)group.open=true;
 });
 observer.observe(group,{subtree:true,attributes:true,attributeFilter:['hidden']});
 // Open the parent for already-visible pending proposal forms after a page reload.
 if($('lo35PlanReview')&&!$('lo35PlanReview').hidden)group.open=true;
}
function init(){
 if(initialized)return;initialized=true;
 plan();insights();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();