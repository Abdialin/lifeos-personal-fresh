/* LifeOS V102 — cancel last approved, unstarted Debt Chamber decision.
 * Append-only cancellation audit; never erase actual tracked time.
 * The existing transactional workspace bridge performs the only mutation. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSDebtCancellationV102=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
function review(workspace,id,now=Date.now()){
 const original=(workspace?.schedule||[]).find(p=>String(p?.id)===String(id));
 if(!original)return {ok:false,reason:'Original commitment not found.'};
 const history=Array.isArray(original.debtDecisionsV75)?original.debtDecisionsV75:[];
 const cancelled=new Set(history.filter(d=>d?.action==='cancel'&&Number.isInteger(d.cancelDecisionIndex)).map(d=>d.cancelDecisionIndex));
 const last=history.map((d,i)=>({d,i})).reverse().find(x=>x.d&&x.d.action!=='cancel'&&!cancelled.has(x.i));
 if(!last)return {ok:false,reason:'No active approved decision to cancel.'};
 if(!['recover','carry','adjust','forgive'].includes(last.d.action))return {ok:false,reason:'Unsupported decision type.'};
 if(last.d.originalStartAt!==original.startAt||last.d.originalEndAt!==original.endAt)return {ok:false,reason:'Original commitment has changed.'};
 let recovery=null;
 if(last.d.action==='recover'||last.d.action==='carry'){
  recovery=(workspace.schedule||[]).find(p=>String(p.id)===String(last.d.recoveryPlanId));
  if(!recovery||recovery.source!=='debt-recovery-v75'||String(recovery.recoveryForPlanId)!==String(original.id))return {ok:false,reason:'Linked recovery plan is missing or unexpected.'};
  if(recovery.status!=='planned'||recovery.sessionId||recovery.startAt<=now)return {ok:false,reason:'Recovery has started, changed or is already in the past. It cannot be cancelled here.'};
  if((workspace.sessions||[]).some(s=>String(s.planId||s.scheduleId||'')===String(recovery.id)))return {ok:false,reason:'Tracked sessions reference this recovery. Review manually.'};
 }
 return {ok:true,originId:String(original.id),originalStartAt:original.startAt,originalEndAt:original.endAt,
   decisionIndex:last.i,decisionCount:history.length,action:last.d.action,
   recoveryId:recovery?String(recovery.id):null,recoveryStartAt:recovery?.startAt??null,
   reason:'Cancel the last active approved decision; the original commitment remains unchanged.'};
}
function apply(workspace,proposal,now=Date.now()){
 if(!proposal?.ok)throw Error('Cancellation must first be reviewed.');
 const fresh=review(workspace,proposal.originId,now);
 if(!fresh.ok||['originalStartAt','originalEndAt','decisionIndex','decisionCount','action','recoveryId','recoveryStartAt'].some(key=>fresh[key]!==proposal[key]))throw Error('Decision or recovery changed. Review cancellation again.');
 const original=workspace.schedule.find(p=>String(p.id)===proposal.originId);
 if(fresh.recoveryId){
  const recovery=workspace.schedule.find(p=>String(p.id)===fresh.recoveryId);
  recovery.status='cancelled';
  recovery.cancellationReason='User-approved Debt Chamber reversal; no activity was tracked.';
 }
 const entry={action:'cancel',cancelDecisionIndex:fresh.decisionIndex,decidedAt:now,
  originalStartAt:original.startAt,originalEndAt:original.endAt,
  recoveryPlanId:fresh.recoveryId,reason:'User cancelled unstarted debt decision'};
 original.debtDecisionsV75=[...original.debtDecisionsV75,entry];
 return entry;
}
function mount(){
 const host=document.getElementById('lo75-debt-tools');if(!host||document.getElementById('lo102-cancel'))return;
 const panel=document.createElement('details');panel.id='lo102-cancel';
 panel.innerHTML='<summary>Cancel an unstarted recovery or decision</summary><p class="sub">This action creates an audit entry rather than deleting history. Only the latest active decision can be reversed. A recovery plan that started or has linked tracked activity cannot be cancelled here.</p><label>Original commitment<select class="field" id="lo102-original"></select></label><button type="button" class="btn outline" id="lo102-preview">Preview cancellation</button><button type="button" class="btn primary" id="lo102-approve" disabled>Approve cancellation</button><p id="lo102-message" role="status"></p>';
 host.append(panel);
 const el=id=>panel.querySelector('#'+id),list=el('lo102-original'),notice=el('lo102-message'),approve=el('lo102-approve');
 let proposal=null;
 const state=()=>root.lifeosReadOnlyWorkspace?.()||{};
 function load(){
  proposal=null;approve.disabled=true;
  const old=list.value;list.replaceChildren(new Option('Choose a decision',''));
  for(const p of state().schedule||[]){
   const result=review(state(),p.id);
   if(result.ok)list.add(new Option(String(p.name||'Commitment')+' · '+result.action,String(p.id)));
  }
  if([...list.options].some(x=>x.value===old))list.value=old;
 }
 list.onchange=()=>{proposal=null;approve.disabled=true;notice.textContent='Preview the current decision before approval.'};
 el('lo102-preview').onclick=()=>{
  proposal=review(state(),list.value);
  approve.disabled=!proposal.ok;
  notice.textContent=proposal.ok?proposal.reason+' Action: '+proposal.action+(proposal.recoveryId?' · linked future recovery will be marked cancelled.':''):'Cannot cancel: '+proposal.reason;
 };
 approve.onclick=()=>{
  if(!proposal?.ok)return;
  const detail={...proposal,result:{ok:false,message:'Cancellation not saved.'}};
  root.dispatchEvent(new CustomEvent('lifeos-v102-cancel-debt',{detail}));
  notice.textContent=detail.result?.message||'Cancellation not confirmed.';
  load();
 };
 root.addEventListener('lifeos-v75-changed',load);load();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {review,apply};
});