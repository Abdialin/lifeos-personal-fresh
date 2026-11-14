/* LifeOS V59: conservative schedule improvement recommendations. Read-only. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSScheduleImprovementV59=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos-live-v1',HOUR=3600000;
function interval(a,b){return Number.isFinite(a)&&Number.isFinite(b)&&b>a}
function overlapping(a,b){return a.startAt<b.endAt&&b.startAt<a.endAt}
function summarize(workspace,anchor,deps){
 const w=workspace||{},timeline=deps?.timeline,intel=deps?.intelligence,comparison=deps?.comparison,predictor=deps?.predictor,planner=deps?.planner;
 if(!Number.isFinite(anchor)||!timeline||!intel||!comparison||!predictor||!planner)return {error:'Required intelligence modules unavailable',recommendations:[]};
 const outcome=comparison.compare(w,anchor,predictor,planner,timeline);
 if(outcome.error)return {error:outcome.error,recommendations:[]};
 const future=outcome.range;
 const plans=(w.schedule||[]).filter(p=>p&&p.status!=='skipped'&&p.status!=='cancelled'&&interval(p.startAt,p.endAt)&&p.startAt<future.to&&p.endAt>future.from);
 const collisions=[];
 for(let i=0;i<plans.length;i++)for(let j=i+1;j<plans.length;j++)if(overlapping(plans[i],plans[j]))collisions.push({first:plans[i].name||'Plan',second:plans[j].name||'Plan',startAt:Math.max(plans[i].startAt,plans[j].startAt)});
 const rows=outcome.reality||[],observed=rows.reduce((sum,d)=>sum+(d.recordedMs||0),0),unlogged=rows.reduce((sum,d)=>sum+(d.unloggedMs||0),0);
 const evidence=outcome.evidence||{},confidence=evidence.confidence==='reviewable';
 const recommendations=[];
 function add(code,priority,title,details,action){recommendations.push({code,priority,title,details,action,requiresApproval:true})}
 if(collisions.length)add('plan-conflict','high','Review overlapping scheduled activities',collisions.length+' pairs of upcoming plans overlap. Check whether these are intentional parallel commitments.','Review your calendar and reschedule manually if needed.');
 const busy=plans.filter(p=>outcome.ideals.some(i=>overlapping(p,i)));
 if(busy.length)add('ideal-conflict','medium','Compare plans with ideal routines',busy.length+' scheduled activities overlap preferred routine slots. An ideal routine is a preference, not an obligation.','Review priorities before changing plans.');
 if(!confidence)add('tracking-evidence','high','Build reliable tracking history','Only '+(evidence.observedDays||0)+' distinct recorded days in the last 28. Predictions need at least 14 days and recurring activity evidence.','Continue logging actual activities; do not infer availability from empty slots.');
 else if(rows.length&&observed>0&&unlogged>observed)add('record-completeness','medium','Review gaps in activity history','Across the prior seven days, long unlogged periods exceed recorded time. These gaps do not prove inactivity.','Use retrospective logging only for activities you actually remember, with approximate times marked.');
 const conflicted=(outcome.predictions||[]).filter(p=>p.needsReview);
 if(conflicted.length)add('prediction-conflict','medium','Review predicted activities with conflicts',conflicted.length+' suggested activities overlap plans, ideal routines or recovery periods.','Inspect the predictions before attempting approval.');
 const idealCount=(outcome.ideals||[]).length;
 if(idealCount&&!outcome.summary?.planned)add('ideal-planning','low','Consider your ideal schedule as a planning guide',idealCount+' ideal routine occurrences are present, but no scheduled plans were found in the forecast window. This is not evidence the time is free.','Choose a few priorities and explicitly schedule only those you can commit to.');
 if(!recommendations.length)add('monitor','low','Maintain your current planning approach','No clear improvement trigger was detected from the available records. This does not establish that the schedule is optimal.','Keep tracking and review your plans periodically.');
 return {error:null,recommendations,metrics:{plannedCount:plans.length,planCollisions:collisions.length,idealOverlaps:busy.length,trackedPreviousWeekMs:observed,longUnloggedPreviousWeekMs:unlogged,observedEvidenceDays:evidence.observedDays||0,predictionConflicts:conflicted.length,confidence:confidence?'reviewable':'insufficient'},range:future};
}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(host,data,now){
 const box=host.querySelector('[data-v59-list]'),stat=host.querySelector('[data-v59-status]');if(!box||!stat)return;
 const report=summarize(data,now,{timeline:root.LifeOSActivityTimelineV54,intelligence:root.LifeOSActivityIntelligenceV55,comparison:root.LifeOSThreeViewV57,predictor:root.LifeOSPredictivePreviewV56,planner:root.LifeOSPersonalPlanner});
 if(report.error){stat.textContent=report.error;box.replaceChildren();return}
 stat.textContent=report.metrics.plannedCount+' upcoming plans · '+report.metrics.planCollisions+' overlapping plan pairs · '+report.metrics.observedEvidenceDays+'/14 evidence days · Suggestions only';
 box.innerHTML=report.recommendations.map(x=>'<article class="lo59-card"><span class="lo59-priority lo59-'+x.priority+'">'+escapeHtml(x.priority)+' priority</span><h4>'+escapeHtml(x.title)+'</h4><p>'+escapeHtml(x.details)+'</p><p class="lo59-action">Suggested action: '+escapeHtml(x.action)+'</p></article>').join('');
}
function mount(){
 const parent=document.getElementById('lo57-three-view');if(!parent||document.getElementById('lo59-improvements'))return;
 const section=document.createElement('section');section.id='lo59-improvements';section.className='lo59-improvements';section.innerHTML='<h3>Intelligent schedule improvements</h3><p class="sub">Explainable recommendations based on recorded evidence, planned commitments, preferred routines and conflicts. Nothing is applied automatically.</p><p data-v59-status class="lo59-status" role="status"></p><div class="lo59-list" data-v59-list></div>';parent.appendChild(section);
 const refresh=()=>{let data=null;try{data=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}render(section,data,Date.now())};
 window.addEventListener('lifeos-v65-plan-committed',refresh);window.addEventListener('storage',e=>{if(e.key===KEY)refresh()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});refresh();
}
const api={summarize,overlapping};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount()}
return api;
});
