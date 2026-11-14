/* LifeOS Personal V64 — ranked schedule alternatives, review only. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSAlternativeRankingV64=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos-live-v1',HOUR=3600000,MIN=60000;
const intersect=(a,b)=>a.startAt<b.endAt&&b.startAt<a.endAt;
function dateAt(original,day){const src=new Date(original),d=new Date(day);d.setHours(src.getHours(),src.getMinutes(),src.getSeconds(),0);return d.getTime();}
function assess(workspace,weekly,reviewer,now=Date.now()){
 if(!weekly||weekly.error||!Array.isArray(weekly.days)||typeof reviewer?.preview!=='function')return {error:'Weekly review or conflict validation is unavailable',options:[]};
 const plans=Array.isArray(workspace?.schedule)?workspace.schedule:[];
 const ideals=Array.isArray(workspace?.idealRoutines)?workspace.idealRoutines:[];
 const opportunities=[];
 for(const source of weekly.days){
  if(!source.highLoad&&!source.overlaps?.length&&!source.shortBreaks?.length)continue;
  const candidates=plans.filter(p=>p&&p.status==='planned'&&!p.sessionId&&Number.isFinite(p.startAt)&&Number.isFinite(p.endAt)&&p.endAt>p.startAt&&p.startAt>now&&p.startAt>=source.start&&p.startAt<source.end);
  for(const plan of candidates){
   // Explicitly pinned/high-priority plans must not be volunteered as movable.
   if(plan.fixed===true||plan.locked===true||plan.priority==='critical'||plan.priority==='high')continue;
   const duration=plan.endAt-plan.startAt;
   for(const day of weekly.days){
    if(day.date===source.date||day.highLoad||day.plannedMs>=source.plannedMs)continue;
    const startAt=dateAt(plan.startAt,day.start),check=reviewer.preview(workspace,plan.id,startAt,plan.startAt,plan.endAt,now);
    if(!check.ok)continue;
    const destinationPlans=plans.filter(p=>p&&String(p.id)!==String(plan.id)&&p.status!=='skipped'&&p.status!=='cancelled'&&Number.isFinite(p.startAt)&&Number.isFinite(p.endAt)&&p.endAt>p.startAt);
    const before=destinationPlans.filter(p=>p.endAt<=startAt).sort((a,b)=>b.endAt-a.endAt)[0];
    const after=destinationPlans.filter(p=>p.startAt>=check.endAt).sort((a,b)=>a.startAt-b.startAt)[0];
    const beforeGap=before?(startAt-before.endAt)/MIN:null,afterGap=after?(after.startAt-check.endAt)/MIN:null;
    const shortTransition=(beforeGap!==null&&beforeGap<30)||(afterGap!==null&&afterGap<30);
    const startDate=new Date(startAt),dayOfWeek=startDate.getDay(),clock=String(startDate.getHours()).padStart(2,'0')+':'+String(startDate.getMinutes()).padStart(2,'0');
    const idealSameTime=ideals.some(r=>Number(r.dayOfWeek)===dayOfWeek&&r.start===clock&&String(r.name||'').trim().toLowerCase()===String(plan.name||'').trim().toLowerCase());
    const loadReduction=Math.min(duration,source.plannedMs);
    // Explainable heuristic, not an assessment of wellbeing or free time.
    const score=50+Math.min(20,Math.round(loadReduction/HOUR*5))+Math.min(15,Math.round((source.plannedMs-day.plannedMs)/HOUR*2))+(idealSameTime?10:0)-(shortTransition?20:0);
    opportunities.push({id:String(plan.id)+'|'+startAt,planId:String(plan.id),name:String(plan.name||'Plan'),from:plan.startAt,to:startAt,endAt:check.endAt,sourceDate:source.date,destinationDate:day.date,score,
     factors:{loadReductionHours:Math.round(loadReduction/HOUR*10)/10,destinationPlannedHours:Math.round(day.plannedMs/HOUR*10)/10,shortTransition,idealAlignment:idealSameTime,priority:String(plan.priority||'unspecified')},
     explanation:(shortTransition?'Short transition near this option. ':'No adjacent break under 30 minutes detected. ')+(idealSameTime?'Matches an explicit ideal routine. ':'No matching ideal preference evidenced. ')+'Lower scheduled workload does not confirm availability.',
     requiresApproval:true});
   }
  }
 }
 opportunities.sort((a,b)=>b.score-a.score||a.from-b.from||a.planId.localeCompare(b.planId));
 const chosen=[],sourceSet=new Set(),destinationSet=new Set();
 for(const item of opportunities){if(sourceSet.has(item.sourceDate)||destinationSet.has(item.destinationDate))continue;chosen.push(item);sourceSet.add(item.sourceDate);destinationSet.add(item.destinationDate);if(chosen.length>=5)break;}
 return {error:null,options:chosen,considered:opportunities.length,limitations:['Heuristic ranking only, not a validated forecast','Travel and recovery needs are not inferred','High-priority or fixed plans are excluded from suggestions','Live conflicts rechecked by V62 before saving']};
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function format(t){return new Date(t).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function mount(){
 const parent=document.getElementById('lo63-assistant');if(!parent||document.getElementById('lo64-ranked'))return;
 const host=document.createElement('section');host.id='lo64-ranked';host.className='lo64-ranked';
 host.innerHTML='<h3>Ranked adjustment alternatives</h3><p class="sub">Illustrative scores compare known commitments and preferences only. They do not verify availability.</p><p data-v64-status class="lo64-status" role="status"></p><div data-v64-options></div><p data-v64-feedback class="sub" role="status">Opening an option sends it to the existing impact-review form; saving still requires separate confirmation.</p>';
 parent.appendChild(host);
 let items=[];const state=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
 const modules=()=>({comparison:root.LifeOSThreeViewV57,predictor:root.LifeOSPredictivePreviewV56,planner:root.LifeOSPersonalPlanner,timeline:root.LifeOSActivityTimelineV54});
 function refresh(){
  const data=state(),week=root.LifeOSWeeklyPlanningV60?.review(data,Date.now(),modules()),result=assess(data,week,root.LifeOSWeeklyPlanReviewV62,Date.now());
  const status=host.querySelector('[data-v64-status]'),box=host.querySelector('[data-v64-options]');
  if(result.error){items=[];status.textContent=result.error;box.replaceChildren();return}
  items=result.options;status.textContent=items.length+' ranked, reviewable option(s) · '+result.considered+' validated candidate combinations · No automatic changes.';
  box.innerHTML=items.map((item,i)=>'<article class="lo64-option"><div><strong>'+esc(item.name)+'</strong><span class="lo64-score">Score '+item.score+'</span></div><p>'+esc(format(item.from))+' → '+esc(format(item.to))+'</p><small>'+esc(item.explanation)+'</small><button type="button" class="btn outline" data-v64-index="'+i+'">Review this option</button></article>').join('')||'<p class="sub">No safe alternative identified from the available plans. You can still adjust plans manually.</p>';
 }
 host.addEventListener('click',event=>{
  const btn=event.target.closest('[data-v64-index]');if(!btn)return;
  const option=items[Number(btn.dataset.v64Index)];if(!option)return;
  const detail={planId:option.planId,newStartAt:option.to,result:null};
  document.dispatchEvent(new CustomEvent('lifeos-v63-review-suggestion',{detail}));
  host.querySelector('[data-v64-feedback]').textContent=detail.result?.message||'The review form did not accept the suggestion; nothing was saved.';
 });
 window.addEventListener('lifeos-v65-plan-committed',refresh);
 window.addEventListener('storage',e=>{if(e.key===KEY)refresh()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});refresh();
}
const api={assess,dateAt};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount()}
return api;
});
