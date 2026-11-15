/* LifeOS V99 — read-only Debt Chamber decision audit and session-count view.
 * Never edits historical commitments; all changes still use V75 approvals. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSDebtAuditV99=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
function audit(workspace,at=Date.now()){
 const engine=root.LifeOSDebtRecoveryV75,debts=engine?.outstanding?.(workspace,at);
 if(!debts||debts.error)return {ok:false,reason:debts?.error||'Debt calculation unavailable'};
 const entries=[];
 for(const p of workspace?.schedule||[]){
  if(!p||!Array.isArray(p.debtDecisionsV75))continue;
  for(const [sequence,d] of p.debtDecisionsV75.entries()){
   if(!d)continue;
   const recovery=(workspace.schedule||[]).find(x=>String(x.id)===String(d.recoveryPlanId));
   const linked=(workspace.sessions||[]).find(s=>String(s.id)===String(recovery?.sessionId));
   entries.push({originId:String(p.id),originName:String(p.name||'Commitment'),sequence:sequence+1,
    action:String(d.action||'unknown'),portionMs:Number(d.portionMs)||0,
    recoveryPlanId:d.recoveryPlanId||null,
    status:recovery?(linked?.status==='finished'?'recovery-tracked':'recovery-planned'):(d.recoveryPlanId?'recovery-plan-not-found':'decision-recorded'),
    note:'A planned recovery is not a verified completion.'});
  }
 }
 const sessions=(debts.open||[]).length,unverified=(debts.unverified||[]).length;
 return {ok:true,entries,openGoals:debts.open||[],confirmedMissedSessions:sessions,unverifiedSessions:unverified,
  openMs:debts.openMs||0,scheduledMs:debts.scheduledMs||0,recoveredMs:debts.recoveredMs||0};
}
function mount(){
 const host=document.getElementById('lo74-debt');if(!host||document.getElementById('lo99-audit'))return;
 const panel=document.createElement('details');panel.id='lo99-audit';panel.innerHTML='<summary>Debt decisions & recovery audit</summary><p class="sub">Review original obligations, approved decisions and whether recovery is only planned or linked to finished tracking. This view does not modify any record.</p><div id="lo99-data"></div><button type="button" class="btn outline" id="lo99-refresh">Refresh audit</button>';
 host.append(panel);
 function render(){
  const out=panel.querySelector('#lo99-data');out.replaceChildren();
  const w=root.lifeosReadOnlyWorkspace?.()||{},result=audit(w);
  if(!result.ok){out.textContent=result.reason;return}
  const summary=document.createElement('p');summary.textContent=result.confirmedMissedSessions+' confirmed outstanding commitments · '+result.unverifiedSessions+' unverified · '+result.entries.length+' recorded decisions.';out.append(summary);
  for(const d of result.entries.slice(-35)){
   const item=document.createElement('p');item.textContent=d.originName+' · '+d.action+' · '+d.status+(d.portionMs?' · '+Math.round(d.portionMs/60000)+' minutes':'');
   out.append(item);
  }
  if(!result.entries.length)out.append(document.createTextNode('No prior decisions are recorded. Existing V75 controls handle approval.'));
 }
 panel.querySelector('#lo99-refresh').onclick=render;root.addEventListener('lifeos-v75-changed',render);render();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {audit};
});