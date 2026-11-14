/* LifeOS V75 — User-approved Debt Chamber decisions.
 * Recovery entries are PLAN ONLY, never tracked sessions.
 * The original missed commitment is never rewritten or deleted. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSDebtRecoveryV75=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const HOUR=3600000,DAY=24*HOUR,MAX_WINDOW=14*DAY;
const ACTIONS=['recover','carry','adjust','forgive'];
function outstanding(workspace,at=Date.now(),engine=root.LifeOSAccountabilityV74){
 const report=engine?.debtReport?.(workspace,at,28);
 if(!report)return {open:[],resolved:[],unverified:[],openMs:0,error:'Debt report unavailable'};
 const plans=new Map((workspace?.schedule||[]).map(p=>[String(p.id),p]));
 const open=[],resolved=[];
 for(const item of report.confirmed){
  const original=plans.get(String(item.id));
  if(!original)continue;
  const history=Array.isArray(original.debtDecisionsV75)?original.debtDecisionsV75:[];
  const trusted=history.every(d=>d&&ACTIONS.includes(d.action)&&d.originalStartAt===original.startAt&&d.originalEndAt===original.endAt);
  if(!trusted){open.push({...item,reviewWarning:'Existing decisions require review.'});continue}
  const closed=history.some(d=>d.action==='adjust'||d.action==='forgive');
  const reservedMs=history.reduce((sum,d)=>sum+((d.action==='recover'||d.action==='carry')?Math.max(0,d.portionMs||0):0),0);
  const remainingMs=Math.max(0,item.outstandingMs-reservedMs);
  if(closed||remainingMs===0)resolved.push({...item,decision:history[history.length-1],reservedMs});
  else open.push({...item,outstandingMs:remainingMs,originalOutstandingMs:item.outstandingMs,reservedMs});
 }
 return {open,resolved,unverified:report.unverified,openMs:open.reduce((a,x)=>a+x.outstandingMs,0),error:null};
}
function conflicts(workspace,startAt,endAt){
 return (workspace?.schedule||[]).some(p=>p&&p.status!=='skipped'&&p.status!=='cancelled'&&Number.isFinite(p.startAt)&&Number.isFinite(p.endAt)&&p.startAt<endAt&&startAt<p.endAt);
}
function suggest(workspace,item,at=Date.now(),mode='recover'){
 if(!item||!Number.isFinite(item.outstandingMs)||item.outstandingMs<=0)return null;
 const length=Math.min(item.outstandingMs,3*HOUR);
 const startDays=mode==='carry'?7:1;
 // Suggest daytime slots, never silently book them. Keep proposed duration exact for shortfalls <= 3 hours.
 for(let offset=startDays;offset<=14;offset++){
  const d=new Date(at);d.setHours(9,0,0,0);d.setDate(d.getDate()+offset);
  for(const hr of [9,11,14,16,18]){
   const time=new Date(d);time.setHours(hr,0,0,0);
   const a=time.getTime(),b=a+length;
   if(a<=at||a>at+MAX_WINDOW||new Date(b-1).getDate()!==time.getDate()||conflicts(workspace,a,b))continue;
   return {startAt:a,endAt:b,portionMs:length,remainingMs:Math.max(0,item.outstandingMs-length),mode};
  }
 }
 return null;
}
function review(workspace,input,at=Date.now(),engine=root.LifeOSAccountabilityV74){
 if(!input||!ACTIONS.includes(input.action))return {ok:false,reason:'Choose a recovery decision.'};
 const report=outstanding(workspace,at,engine);
 const debt=report.open.find(x=>String(x.id)===String(input.id));
 if(!debt)return {ok:false,reason:'The original debt is no longer open or its records changed. Refresh the Debt Chamber.'};
 const origin=(workspace?.schedule||[]).find(p=>String(p.id)===String(debt.id));
 if(!origin)return {ok:false,reason:'The original commitment is unavailable.'};
 const result={ok:true,action:input.action,id:String(debt.id),name:String(debt.name),amountMs:debt.outstandingMs,originalStartAt:origin.startAt,originalEndAt:origin.endAt,originalStatus:origin.status,originalSessionId:origin.sessionId||null};
 if(input.action==='recover'||input.action==='carry'){
  const startAt=Number(input.startAt),endAt=Number(input.endAt);
  if(!Number.isSafeInteger(startAt)||!Number.isSafeInteger(endAt)||startAt<=at||endAt<=startAt||startAt>at+MAX_WINDOW||endAt>at+MAX_WINDOW)return {ok:false,reason:'Choose a future recovery period within 14 days.'};
  if(endAt-startAt>debt.outstandingMs||endAt-startAt>3*HOUR||endAt-startAt<15*60000)return {ok:false,reason:'Recover 15 minutes to 3 hours at a time, without exceeding the outstanding amount.'};
  if(conflicts(workspace,startAt,endAt))return {ok:false,reason:'The proposed period overlaps an existing confirmed plan.'};
  if(input.action==='carry'&&startAt<at+6*DAY)return {ok:false,reason:'Carry-forward should be scheduled approximately next week or later.'};
  return {...result,startAt,endAt,recoveredPortionMs:endAt-startAt,remainingMs:debt.outstandingMs-(endAt-startAt)};
 }
 if(input.action==='adjust'){
  const acceptedMs=Number(input.acceptedMs);
  if(!Number.isSafeInteger(acceptedMs)||acceptedMs<0||acceptedMs>debt.outstandingMs)return {ok:false,reason:'The adjusted outstanding amount must be between zero and the current outstanding amount.'};
  return {...result,acceptedMs};
 }
 return result;
}
function applyInMemory(workspace,decision,ids,at=Date.now()){
 if(!decision?.ok||!ACTIONS.includes(decision.action)||!Array.isArray(workspace?.schedule))throw Error('Invalid reviewed decision.');
 const original=workspace.schedule.find(p=>String(p.id)===decision.id);
 if(!original||original.startAt!==decision.originalStartAt||original.endAt!==decision.originalEndAt||original.status!==decision.originalStatus||(original.sessionId||null)!==decision.originalSessionId)throw Error('Original commitment changed since review.');
 let recoveryPlanId=null;
 if(decision.action==='recover'||decision.action==='carry'){
  if(typeof ids?.planId!=='string'||!ids.planId||workspace.schedule.some(p=>p.id===ids.planId))throw Error('Unique recovery plan ID required.');
  recoveryPlanId=ids.planId;
  workspace.schedule.push({id:recoveryPlanId,name:'Recovery: '+String(original.name||'Activity').slice(0,68),startAt:decision.startAt,endAt:decision.endAt,status:'planned',sessionId:null,createdAt:at,source:'debt-recovery-v75',recoveryForPlanId:original.id,notes:'Approved recovery for a previous commitment; not a tracked activity.',reminder:true});
 }
 const history=Array.isArray(original.debtDecisionsV75)?original.debtDecisionsV75:[];
 const entry={action:decision.action,decidedAt:at,originalStartAt:original.startAt,originalEndAt:original.endAt,amountBeforeMs:decision.amountMs,recoveryPlanId,portionMs:decision.recoveredPortionMs||0,remainingMs:decision.remainingMs??0,acceptedMs:decision.acceptedMs??null};
 original.debtDecisionsV75=[...history,entry];
 return {recoveryPlanId,decision:entry};
}
function localDateTime(ms){
 const d=new Date(ms),pad=n=>String(n).padStart(2,'0');
 return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
}
function mount(){
 const host=document.getElementById('lo74-debt');
 if(!host||document.getElementById('lo75-debt-tools'))return;
 const pane=document.createElement('details');pane.id='lo75-debt-tools';pane.className='lo75-tools';
 pane.innerHTML='<summary>Review and resolve outstanding commitments</summary><p class="sub">Every change requires your approval. Recovering creates a future plan only, never an actual tracked session. You can also adjust a goal or forgive the commitment.</p><label for="lo75-item" class="sub">Outstanding commitment</label><select id="lo75-item" class="field"></select><label for="lo75-action" class="sub">Decision</label><select id="lo75-action" class="field"><option value="recover">Recover during next available days</option><option value="carry">Carry forward to next week</option><option value="adjust">Adjust outstanding target</option><option value="forgive">Forgive this commitment</option></select><div id="lo75-time-wrap"><label class="sub" for="lo75-start">Proposed start</label><input id="lo75-start" type="datetime-local" class="field"><label class="sub" for="lo75-end">Proposed finish</label><input id="lo75-end" type="datetime-local" class="field"></div><div id="lo75-adjust-wrap" hidden><label for="lo75-adjust-ms" class="sub">Adjusted outstanding minutes (0 = close)</label><input id="lo75-adjust-ms" class="field" type="number" min="0" step="15" value="0"></div><div class="lo75-actions"><button id="lo75-propose" class="btn outline" type="button">Preview decision</button><button id="lo75-approve" class="btn primary" type="button" disabled>Approve and save</button></div><p role="status" id="lo75-result" class="lo75-result">Choose a commitment to begin.</p><div id="lo75-resolved" class="lo75-resolved"></div>';
 host.append(pane);
 const $=id=>document.getElementById(id),selection=$('lo75-item'),action=$('lo75-action'),notice=$('lo75-result'),approve=$('lo75-approve');
 const workspace=()=>root.lifeosReadOnlyWorkspace?.()||null;
 let proposed=null;
 function invalidate(){proposed=null;approve.disabled=true}
 function options(){
  const w=workspace();if(!w)return;
  const report=outstanding(w),old=selection.value;
  selection.replaceChildren(new Option('Select outstanding commitment',''));
  for(const item of report.open)selection.add(new Option(String(item.name)+' · '+(root.LifeOSAccountabilityV74?.fmt?.(item.outstandingMs)||Math.round(item.outstandingMs/60000)+' minutes'),String(item.id)));
  selection.value=[...selection.options].some(o=>o.value===old)?old:'';
  $('lo75-resolved').textContent=report.resolved.length+' resolved decision(s) recorded. '+report.unverified.length+' unverified plans are excluded from debt until reviewed.';
 }
 function updateInputs(){
  invalidate();const mode=action.value;
  $('lo75-time-wrap').hidden=!['recover','carry'].includes(mode);
  $('lo75-adjust-wrap').hidden=mode!=='adjust';
  const item=outstanding(workspace()).open.find(x=>String(x.id)===selection.value);
  if(item&&(mode==='recover'||mode==='carry')){
   const slot=suggest(workspace(),item,Date.now(),mode);
   $('lo75-start').value=slot?localDateTime(slot.startAt):'';
   $('lo75-end').value=slot?localDateTime(slot.endAt):'';
  }
  if(item&&mode==='adjust')$('lo75-adjust-ms').value=Math.floor(item.outstandingMs/60000);
 }
 function draft(){
  const input={id:selection.value,action:action.value,startAt:new Date($('lo75-start').value).getTime(),endAt:new Date($('lo75-end').value).getTime(),acceptedMs:Math.round(Number($('lo75-adjust-ms').value)*60000)};
  const check=review(workspace(),input);
  if(!check.ok){invalidate();notice.textContent=check.reason;return}
  proposed=check;approve.disabled=false;
  notice.textContent=check.action==='recover'||check.action==='carry'?'Preview: add a future '+Math.round(check.recoveredPortionMs/60000)+'-minute plan; '+Math.round(check.remainingMs/60000)+' minutes remain outstanding for future review. The original plan stays unchanged.':'Preview: '+check.action+' the outstanding commitment. The original plan and tracked history remain unchanged.';
 }
 selection.addEventListener('change',updateInputs);action.addEventListener('change',updateInputs);
 for(const id of ['lo75-start','lo75-end','lo75-adjust-ms'])$(id).addEventListener('input',invalidate);
 $('lo75-propose').addEventListener('click',draft);
 approve.addEventListener('click',()=>{
  if(!proposed){notice.textContent='Preview a decision first.';return}
  const request={...proposed,result:{ok:false,message:'No decision saved.'}};
  root.dispatchEvent(new CustomEvent('lifeos-v75-approve-debt',{detail:request}));
  notice.textContent=request.result?.message||'Could not save the decision.';
  invalidate();options();updateInputs();
 });
 root.addEventListener('lifeos-v75-changed',options);
 root.addEventListener('lifeos-v65-plan-committed',options);
 window.addEventListener('focus',options);
 options();updateInputs();
}
const api={outstanding,suggest,review,applyInMemory,conflicts,ACTIONS};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount()}
return api;
});
