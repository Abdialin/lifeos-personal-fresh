/* LifeOS V57 — Reality / Predicted / Ideal side-by-side review. Strictly read-only. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSThreeViewV57=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos-live-v1';
const valid=x=>Number.isFinite(x?.startAt)&&Number.isFinite(x?.endAt)&&x.endAt>x.startAt;
const intersect=(a,b)=>a.startAt<b.endAt&&b.startAt<a.endAt;
function localDate(t){const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function idealOccurrences(workspace,from,to){
 const out=[],source=Array.isArray(workspace?.idealRoutines)?workspace.idealRoutines:[];
 for(let t=new Date(from);t.getTime()<to;t.setDate(t.getDate()+1)){
  const day=t.getDay(),dayStamp=localDate(t);
  for(const routine of source){
   if(Number(routine?.dayOfWeek)!==day)continue;
   const match=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(routine.start||''));
   const duration=Number(routine.durationMinutes);
   if(!match||!Number.isFinite(duration)||duration<=0||duration>1440)continue;
   const start=new Date(dayStamp+'T00:00:00');start.setHours(+match[1],+match[2],0,0);
   const occurrence={name:String(routine.name||'Ideal routine'),startAt:start.getTime(),endAt:start.getTime()+duration*60000,sourceId:String(routine.id||'')};
   if(valid(occurrence)&&occurrence.startAt>=from&&occurrence.endAt<=to)out.push(occurrence);
  }
 }
 return out.sort((a,b)=>a.startAt-b.startAt);
}
function compare(workspace,anchor,predictor,planner,timeline){
 if(!Number.isFinite(anchor)||!predictor||!planner||!timeline)return {error:'One of the planning modules is unavailable'};
 const prediction=predictor.build(workspace,anchor,planner);
 if(prediction.error)return {error:prediction.error};
 const {from,to}=prediction.range;
 const plans=(workspace?.schedule||[]).filter(p=>p&&p.status!=='skipped'&&p.status!=='cancelled'&&valid(p)&&p.startAt<to&&p.endAt>from);
 const ideals=idealOccurrences(workspace,from,to);
 const proposals=prediction.suggestions.map(p=>{
  const planConflicts=plans.filter(x=>intersect(p,x));
  const idealConflicts=ideals.filter(x=>intersect(p,x));
  return {...p,planConflicts:planConflicts.map(x=>String(x.name||'Scheduled activity')),idealConflicts:idealConflicts.map(x=>x.name),
   needsReview:planConflicts.length>0||idealConflicts.length>0||p.recoveryConflicts?.length>0||p.actualConflicts?.length>0};
 });
 const observedDays=[];
 const begin=new Date(from);begin.setDate(begin.getDate()-7);
 for(let d=new Date(begin);d.getTime()<from;d.setDate(d.getDate()+1)){
  const day=timeline.build(workspace,localDate(d),from);
  observedDays.push({date:localDate(d),recordedMs:day.stats?.observedMs||0,unloggedMs:day.stats?.unloggedMs||0,sampleCount:day.stats?.exampleCount||0});
 }
 return {error:null,range:prediction.range,evidence:{observedDays:prediction.observedTrackedDays,lookbackDays:prediction.lookbackDays,confidence:prediction.confidence},reality:observedDays,plans,ideals,predictions:proposals,
  summary:{realityRecordedDays:observedDays.filter(x=>x.recordedMs>0).length,planned:plans.length,ideal:ideals.length,predicted:proposals.length,conflicting:proposals.filter(p=>p.needsReview).length}};
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function dt(t){return new Date(t).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function render(host,workspace,now){
 const report=compare(workspace,now,root.LifeOSPredictivePreviewV56,root.LifeOSPersonalPlanner,root.LifeOSActivityTimelineV54);
 const status=host.querySelector('[data-v57-status]'),columns=host.querySelector('[data-v57-columns]'),review=host.querySelector('[data-v57-review]');
 if(report.error){status.textContent=report.error;columns.replaceChildren();review.replaceChildren();return}
 status.textContent='Predictions: '+report.evidence.observedDays+'/14 distinct evidence days in the last 28 · '+report.summary.predicted+' suggestions · '+report.summary.conflicting+' need conflict review.';
 const line=(title,body)=>'<div class="lo57-column"><h4>'+title+'</h4>'+body+'</div>';
 const row=(name,detail)=>'<div class="lo57-row"><strong>'+esc(name)+'</strong><small>'+esc(detail)+'</small></div>';
 columns.innerHTML=
 line('My Reality · previous 7 days',report.reality.map(r=>row(r.date,Math.round(r.recordedMs/60000)+' recorded minutes'+(r.sampleCount?' · examples excluded':''))).join(''))+
 line('My Predicted Week · next 7 days',report.predictions.length?report.predictions.slice(0,12).map(p=>row(p.name,dt(p.startAt)+(p.needsReview?' · conflicts need review':' · suggestion only'))).join(''):'<p class="sub">Insufficient recurring evidence. No availability is assumed.</p>')+
 line('My Ideal Schedule · next 7 days',report.ideals.length?report.ideals.slice(0,12).map(p=>row(p.name,dt(p.startAt))).join(''):'<p class="sub">No ideal routine entries configured.</p>');
 review.innerHTML='<h4>Prediction review · no calendar writes</h4>'+ (report.predictions.length?report.predictions.slice(0,12).map((p,i)=>'<details class="lo57-review"><summary>'+esc(p.name)+' · '+esc(dt(p.startAt))+' '+(p.needsReview?'⚠ Needs review':'◇ Candidate')+'</summary><p class="sub">Based on '+esc(p.observations)+' matching historical days; pattern '+esc(p.patternConsistency)+'. All suggestions require explicit scheduling approval in the main Plan workflow.</p><p class="sub">Existing plan conflicts: '+esc(p.planConflicts.join(', ')||'None')+' · Ideal routine overlap: '+esc(p.idealConflicts.join(', ')||'None')+' · Recovery buffer conflicts: '+esc((p.recoveryConflicts||[]).length)+'</p><button class="btn outline lo57-review-button" type="button" data-v57-index="'+i+'">Mark for further review</button></details>').join(''):'<p class="sub">No evidence-based predictions are ready for review.</p>')+'<p class="lo57-feedback" data-v57-feedback role="status">Review marks are temporary and do not approve or schedule any activity.</p>';
 review.querySelectorAll('[data-v57-index]').forEach(b=>b.addEventListener('click',()=>{
  const p=report.predictions[Number(b.dataset.v57Index)];if(!p)return;
  review.querySelector('[data-v57-feedback]').textContent='For further review: '+p.name+' at '+dt(p.startAt)+'. This is not saved or scheduled; use your existing Plan workflow to create or approve a plan.';
 }));
}
function mount(){
 const host=document.getElementById('lo56-preview');if(!host||document.getElementById('lo57-three-view'))return;
 const section=document.createElement('section');section.id='lo57-three-view';section.className='lo57-three-view';
 section.innerHTML='<h3>Reality · Predicted · Ideal comparison</h3><p class="sub">Past evidence, future suggestions and your preferred routines are three different things.</p><p data-v57-status class="lo57-status" role="status"></p><div data-v57-columns class="lo57-columns"></div><div data-v57-review></div>';
 host.appendChild(section);
 const update=()=>{try{const data=JSON.parse(localStorage.getItem(KEY)||'null');render(section,data,Date.now())}catch(e){section.querySelector('[data-v57-status]').textContent='Unable to read activity records.'}};
 document.getElementById('lo53-date')?.addEventListener('change',update);
 window.addEventListener('storage',e=>{if(e.key===KEY)update()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});update();
}
const api={compare,idealOccurrences,localDate};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount()}
return api;
});
