/* LifeOS V68 — non-invasive mobile navigation and runtime asset readiness. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSReadinessV68=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const EXPECTED=['LifeOSActivityTimelineV54','LifeOSActivityIntelligenceV55','LifeOSPredictivePreviewV56','LifeOSThreeViewV57','LifeOSPredictionApprovalV58','LifeOSScheduleImprovementV59','LifeOSWeeklyPlanningV60','LifeOSWeeklyRecommendationsV61','LifeOSWeeklyPlanReviewV62','LifeOSPlanningAssistantV63','LifeOSAlternativeRankingV64','LifeOSPlanningValidationV65'];
function inspect(globals){
 const available=EXPECTED.filter(name=>!!globals?.[name]),missing=EXPECTED.filter(name=>!globals?.[name]);
 return {available:available.length,total:EXPECTED.length,missing,ok:missing.length===0};
}
function mount(){
 const nav=document.getElementById('lo44PlanShortcuts');
 if(!nav||document.getElementById('lo68-readiness'))return;
 const weekly=document.createElement('button');weekly.type='button';weekly.className='btn outline lo44-jump';weekly.textContent='Weekly planning';
 weekly.setAttribute('aria-label','Jump to intelligent weekly planning');
 const review=document.createElement('button');review.type='button';review.className='btn outline lo44-jump';review.textContent='Review changes';
 review.setAttribute('aria-label','Jump to plan change approval');
 nav.append(weekly,review);
 function jump(id){const target=document.getElementById(id);if(!target)return;target.scrollIntoView({behavior:'smooth',block:'start'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
 weekly.addEventListener('click',()=>jump('lo60-weekly'));
 review.addEventListener('click',()=>jump('lo62-plan-review'));
 const section=document.createElement('details');section.id='lo68-readiness';section.className='lo68-readiness';
 section.innerHTML='<summary>Application readiness check</summary><p>Checks whether LifeOS planning modules loaded and whether the server health endpoint responds. This does not test account synchronization, PostgreSQL durability or activity persistence.</p><button class="btn outline" id="lo68-check" type="button">Check loaded modules & server</button><p role="status" id="lo68-result">No check has run on this device.</p>';
 nav.insertAdjacentElement('afterend',section);
 const button=section.querySelector('#lo68-check'),label=section.querySelector('#lo68-result');
 button.addEventListener('click',async()=>{
  button.disabled=true;const state=inspect(root);
  const missing=state.missing.length?' Missing: '+state.missing.join(', ')+'.':'';
  label.textContent=state.available+'/'+state.total+' planning modules loaded.'+missing+' Checking server health…';
  let health='Server health not verified.';
  try{
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
   try{
    const response=await fetch('/healthz',{method:'GET',cache:'no-store',credentials:'same-origin',signal:controller.signal});
    const body=response.ok?await response.json():null;
    health=response.ok&&body?.status==='ok'?'Server /healthz responded OK.':'Server health check failed (HTTP '+response.status+').';
   }finally{clearTimeout(timeout)}
  }catch{health='Server health endpoint could not be reached from this device.'}
  label.textContent=state.available+'/'+state.total+' planning modules loaded.'+missing+' '+health+' Browser data persistence and cloud sync remain unverified.';
  button.disabled=false;
 });
}
const api={inspect};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount()}
return api;
});
