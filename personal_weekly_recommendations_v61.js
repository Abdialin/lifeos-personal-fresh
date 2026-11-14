/* LifeOS Personal V61 — explainable weekly review actions; suggestions only. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSWeeklyRecommendationsV61=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const STORE='lifeos-live-v1',HOUR=3600000;
function propose(report){
 if(!report||report.error||!Array.isArray(report.days))return {error:'Weekly planning evidence unavailable',suggestions:[]};
 const days=report.days,actions=[];
 const name=d=>new Date(d.start).toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});
 const add=(id,priority,date,title,observation,recommendation,details={})=>actions.push({id,priority,date,title,observation,recommendation,reviewOnly:true,...details});
 for(const day of days){
  const label=name(day);
  if(day.overlaps.length){
   const first=day.overlaps[0];
   add('conflict:'+day.date,'high',day.date,'Resolve overlapping commitments on '+label,
    day.overlaps.length+' overlapping pairs, including '+first.first+' and '+first.second+'.',
    'Check whether the activities can happen simultaneously. Otherwise, choose which one to reschedule or shorten. No change is made for you.');
  }
  if(day.highLoad){
   const lighter=days.filter(d=>d.date!==day.date&&!d.highLoad&&d.plannedMs<day.plannedMs)
     .sort((a,b)=>a.plannedMs-b.plannedMs||a.start-b.start).slice(0,2);
   const candidates=lighter.map(d=>({date:d.date,plannedHours:Math.round(d.plannedMs/HOUR*10)/10}));
   add('load:'+day.date,'medium',day.date,'Review high scheduled load on '+label,
    (day.plannedMs/HOUR).toFixed(1)+' unique hours of scheduled commitments.',
    lighter.length?'Review movable activities against '+lighter.map(name).join(' or ')+', which currently have fewer scheduled hours. Verify actual availability, preferences and travel before making changes.':'No lower-load day appears in this seven-day view. Consider adjusting duration or priorities after reviewing your full commitments.',
    {candidateDates:candidates});
  }
  if(day.shortBreaks.length){
   const first=day.shortBreaks[0];
   add('break:'+day.date,'medium',day.date,'Review short transitions on '+label,
    day.shortBreaks.length+' planned break(s) under 30 minutes; '+first.from+' → '+first.to+' has '+first.minutes+' minutes.',
    'Check travel, preparation and personal recovery needs. You may want more transition time, but this is not an automatic requirement.');
  }
  const clashes=(day.predictions||[]).filter(p=>p.needsReview);
  if(clashes.length)add('prediction:'+day.date,'medium',day.date,'Inspect prediction conflicts on '+label,
    clashes.length+' predicted activity suggestion(s) require additional review.',
    'Inspect each suggestion and its plan, ideal-routine or recovery conflicts before approving it.');
 }
 const busyDays=days.filter(d=>d.highLoad).length;
 const evidence=report.summary?.evidence;
 if(evidence?.confidence!=='reviewable')
  add('evidence','high',null,'Improve evidence before relying on predictions',
   'The recent tracking history is not yet sufficient for reliable recurring-pattern suggestions.',
   'Record actual activities consistently. Unlogged periods are unknown, never assumed to be available.');
 if(!actions.length)add('stable','low',null,'No immediate scheduling conflicts detected',
  'This review found no overlapping plans, high-load days or short scheduled transitions.',
  'Continue checking goals and real-world commitments; an empty calendar does not guarantee availability.');
 const rank={high:0,medium:1,low:2};
 actions.sort((a,b)=>rank[a.priority]-rank[b.priority]||(a.date||'').localeCompare(b.date||'')||a.id.localeCompare(b.id));
 return {error:null,suggestions:actions,summary:{total:actions.length,high:actions.filter(x=>x.priority==='high').length,medium:actions.filter(x=>x.priority==='medium').length,low:actions.filter(x=>x.priority==='low').length,busyDays}};
}
function esc(text){return String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render(panel,workspace,now){
 const status=panel.querySelector('[data-v61-status]'),list=panel.querySelector('[data-v61-actions]');
 if(!status||!list)return;
 const weekly=root.LifeOSWeeklyPlanningV60;
 const requirements={comparison:root.LifeOSThreeViewV57,predictor:root.LifeOSPredictivePreviewV56,planner:root.LifeOSPersonalPlanner,timeline:root.LifeOSActivityTimelineV54};
 const review=weekly?.review(workspace,now,requirements),result=propose(review);
 if(result.error){status.textContent=result.error;list.replaceChildren();return;}
 status.textContent=result.summary.total+' review suggestion(s) · '+result.summary.high+' high priority · '+result.summary.medium+' medium · No automatic schedule changes.';
 list.innerHTML=result.suggestions.map(item=>
  '<article class="lo61-action"><span class="lo61-chip lo61-'+item.priority+'">'+esc(item.priority)+' priority</span><h4>'+esc(item.title)+'</h4><p>'+esc(item.observation)+'</p><p class="lo61-advice">'+esc(item.recommendation)+'</p>'+(item.candidateDates?.length?'<small>Lower scheduled-load dates are comparison candidates, not confirmed free time.</small>':'')+'</article>'
 ).join('');
}
function mount(){
 if(typeof document==='undefined')return;
 const anchor=document.getElementById('lo60-weekly');
 if(!anchor||document.getElementById('lo61-weekly-recommendations'))return;
 const panel=document.createElement('section');
 panel.id='lo61-weekly-recommendations';panel.className='lo61-weekly';
 panel.innerHTML='<h3>Weekly improvement suggestions</h3><p class="sub">Actionable planning reviews based on commitments already recorded. These do not create bookings or confirm that a time slot is free.</p><p class="lo61-status" data-v61-status role="status"></p><div class="lo61-actions" data-v61-actions></div>';
 anchor.appendChild(panel);
 const update=()=>{let state=null;try{state=JSON.parse(localStorage.getItem(STORE)||'null')}catch{}render(panel,state,Date.now())};
 window.addEventListener('lifeos-v65-plan-committed',refresh);
 window.addEventListener('storage',e=>{if(e.key===STORE)update()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
 update();
}
const api={propose};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();}
return api;
});
