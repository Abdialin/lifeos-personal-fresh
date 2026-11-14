/* LifeOS Personal V58: explicit prediction approval UI.
   Approval is processed by the main app's transactional workspace bridge. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSPredictionApprovalV58=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
function decision(proposal){
 if(!proposal||proposal.requiresApproval!==true)return {allowed:false,reason:'Not a reviewable prediction'};
 if(proposal.conflicts?.length||proposal.actualConflicts?.length||proposal.recoveryConflicts?.length||proposal.planConflicts?.length)
  return {allowed:false,reason:'Existing plan, actual activity or recovery-buffer conflict'};
 if(!Number.isFinite(proposal.startAt)||!Number.isFinite(proposal.endAt)||proposal.endAt<=proposal.startAt)
  return {allowed:false,reason:'Invalid prediction time'};
 return {allowed:true,reason:proposal.idealConflicts?.length?'Overlaps an ideal preference; confirm explicitly':'Ready for explicit approval'};
}
function mount(){
 const rootEl=document.getElementById('lo57-three-view');
 if(!rootEl||rootEl.dataset.v58Mounted==='1')return;
 rootEl.dataset.v58Mounted='1';
 const refresh=()=>{
  rootEl.querySelectorAll('[data-v57-index]').forEach(button=>{
   if(!button.disabled&&button.textContent!=='Approve into LifeOS schedule')button.textContent='Approve into LifeOS schedule';
   if(!button.classList.contains('lo58-approve'))button.classList.add('lo58-approve');
   if(button.title!=='Explicit approval, not automatic tracking or Google Calendar sync')button.title='Explicit approval, not automatic tracking or Google Calendar sync';
  });
 };
 rootEl.addEventListener('click',e=>{
  const button=e.target.closest('[data-v57-index]');if(!button||!rootEl.contains(button))return;
  e.preventDefault();e.stopImmediatePropagation();
  const number=Number(button.dataset.v57Index);
  const status=rootEl.querySelector('[data-v57-feedback]');
  const comparison=root.LifeOSThreeViewV57;
  const predictor=root.LifeOSPredictivePreviewV56;
  const planner=root.LifeOSPersonalPlanner;
  const timeline=root.LifeOSActivityTimelineV54;
  if(!status||!comparison||!predictor||!planner||!timeline)return;
  let workspace;
  try{workspace=JSON.parse(localStorage.getItem('lifeos-live-v1')||'null')}catch{status.textContent='Workspace is unavailable. No changes made.';return}
  let report;
  try{report=comparison.compare(workspace,Date.now(),predictor,planner,timeline)}catch{status.textContent='Unable to refresh the prediction. No changes made.';return}
  const candidate=report.predictions?.[number];
  if(!candidate){status.textContent='Prediction has changed; refresh and review again.';return}
  const check=decision(candidate);
  if(!check.allowed){status.textContent='Approval blocked: '+check.reason+'. Review your schedule first.';return}
  const extra=candidate.idealConflicts?.length?' This overlaps an ideal routine: '+candidate.idealConflicts.join(', ')+'.':'';
  if(!confirm('Add '+candidate.name+' on '+new Date(candidate.startAt).toLocaleString()+' to your LifeOS schedule?'+extra+' This does not create a tracked activity or change Google Calendar.'))return;
  const detail={id:candidate.id,result:null};
  document.dispatchEvent(new CustomEvent('lifeos-v58-approve-prediction',{detail}));
  status.textContent=detail.result?.message||'No confirmation received from the LifeOS planning system. No additional action taken.';
  if(detail.result?.ok){button.disabled=true;button.textContent='Approved · saved';}
 },true);
 const observer=new MutationObserver(refresh);observer.observe(rootEl,{subtree:true,childList:true});
 refresh();
}
const api={decision};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount()}
return api;
});
