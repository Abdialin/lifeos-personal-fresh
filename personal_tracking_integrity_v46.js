/* LifeOS Personal V46 — read-only, on-device canonical checkpoint verification.
 * Does not write, delete, repair, sync, or upload user activity data. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KEY='lifeos-v4-stage21-atomic';
function inspect(live,raw,unpack){
 if(!raw)return {ok:false,reason:'Canonical recovery checkpoint missing. A browser refresh may not restore the latest work.'};
 let checkpoint;
 try{
  const encoded=JSON.parse(raw);
  if(!encoded||![1,2].includes(encoded.format))throw Error('Unsupported checkpoint format');
  checkpoint=encoded.format===2?unpack?.(encoded):encoded;
  if(!checkpoint?.workspace||!Array.isArray(checkpoint.workspace.sessions)||!Array.isArray(checkpoint.workspace.schedule))throw Error('Incomplete saved workspace');
 }catch(err){return {ok:false,reason:'Cannot read or decode the canonical recovery checkpoint: '+String(err.message||err)}}
 const saved=checkpoint.workspace,active=(live&&typeof live==='object')?live:{};
 const sessions=Array.isArray(active.sessions)?active.sessions:[],plans=Array.isArray(active.schedule)?active.schedule:[];
 const sMap=new Map(saved.sessions.map(s=>[s.id,s])),pMap=new Map(saved.schedule.map(p=>[p.id,p]));
 const differences=[];
 for(const s of sessions){
  const stored=sMap.get(s.id);
  if(!stored){differences.push('Timer missing from checkpoint: '+s.name);continue}
  if(stored.status!==s.status||stored.endAt!==s.endAt||JSON.stringify(stored.segments)!==JSON.stringify(s.segments))
    differences.push('Timer status or duration not yet saved: '+s.name);
 }
 for(const p of plans){
  const stored=pMap.get(p.id);
  if(!stored||stored.status!==p.status||stored.sessionId!==p.sessionId)
   differences.push('Plan or timer link not yet saved: '+p.name);
 }
 const linked=plans.filter(p=>p.sessionId),broken=linked.filter(p=>!sessions.some(s=>s.id===p.sessionId));
 const savedLinked=saved.schedule.filter(p=>p.sessionId);
 const brokenSaved=savedLinked.filter(p=>!saved.sessions.some(s=>s.id===p.sessionId));
 return {ok:!differences.length&&!broken.length&&!brokenSaved.length,
  reason:differences.length?'Local changes do not match the canonical saved checkpoint.':
   broken.length||brokenSaved.length?'One or more plans reference a missing timer session.':
   'Current plans and timers match the canonical recovery checkpoint on this device.',
  storedSessions:saved.sessions.length,storedPlans:saved.schedule.length,
  finished:saved.sessions.filter(s=>s.status==='finished').length,
  linkedPlans:savedLinked.length,issues:[...differences,...broken.map(x=>'Current plan missing linked timer: '+x.name),
   ...brokenSaved.map(x=>'Saved plan missing linked timer: '+x.name)].slice(0,8),
  format:JSON.parse(raw).format};
}
function check(){
 const root=$('lo46IntegrityResult');if(!root)return;
 try{
  const live=window.lifeosReadOnlyWorkspace?.();
  if(!live)throw Error('LifeOS activity workspace is unavailable');
  const raw=localStorage.getItem(KEY),unpack=window.LifeOSCompactRecovery?.unpack;
  const info=inspect(live,raw,unpack);
  root.innerHTML='<strong class="'+(info.ok?'lo46-good':'lo46-bad')+'">'+(info.ok?'✓ Local checkpoint verified':'⚠ Checkpoint needs attention')+'</strong>'+
   '<p>'+esc(info.reason)+'</p>'+
   (info.storedSessions!==undefined?'<div class="lo46-stats"><span>Saved timers: <b>'+info.storedSessions+'</b></span><span>Finished: <b>'+info.finished+'</b></span><span>Saved plans: <b>'+info.storedPlans+'</b></span><span>Linked plans: <b>'+info.linkedPlans+'</b></span></div>':'')+
   (info.issues?.length?'<p>'+info.issues.map(esc).join('<br>')+'</p>':'')+
   '<small>This verifies this browser\'s saved checkpoint only—not Google Calendar, Render PostgreSQL, another device, or cloud synchronization. Refresh the page and run the check again to test reload recovery.</small>';
 }catch(err){root.textContent='Cannot verify local recovery: '+String(err.message||err)+'. Do not clear browser data; export a backup if records are missing.'}
}
function init(){
 const panel=$('scheduleEditorPanel');if(!panel||$('lo46Integrity'))return;
 const details=document.createElement('details');details.id='lo46Integrity';details.className='lo46-integrity';
 details.innerHTML='<summary>Verify saved tracking data</summary>'+
 '<p>After finishing an activity, use this read-only check. Refresh the page and check again to confirm its recorded status and plan link were restored.</p>'+
 '<button type="button" class="btn outline" id="lo46Check">Check saved checkpoint</button>'+
 '<div id="lo46IntegrityResult" role="status" aria-live="polite"></div>';
 const shortcuts=$('lo44PlanShortcuts'),anchor=shortcuts||panel.querySelector('.head');
 if(anchor)anchor.after(details);else panel.prepend(details);
 details.addEventListener('click',e=>{if(e.target.closest('#lo46Check'))check()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.lifeosCheckpointAuditV46={inspect,check};
})();