/* LifeOS Personal V48 — safe second-device recovery preview, read-only.
   Never imports, overwrites, or exports user records; uses authenticated GET only. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cloud=()=>window.lifeosCloudStatusV47?.()||{};
const local=()=>{
 const w=window.lifeosReadOnlyWorkspace?.();if(!w)return null;
 const habits=window.lifeosSocialHabitBridge?.read?.()||{};
 return {...w,habitDefinitions:habits.habitDefinitions||[],habitChecks:habits.habitChecks||[]};
};
let checking=false;
const TYPES=['sessions','schedule','todos','goals','workouts','meals','personalLogs','habitDefinitions','habitChecks','idealRoutines'];
function counts(w){
 const o={};
 for(const type of TYPES)o[type]=Array.isArray(w?.[type])?w[type].length:0;
 return o;
}
function summarize(w){return TYPES.reduce((total,key)=>total+counts(w)[key],0)}
function assess(localWorkspace,remoteWorkspace,status,revision){
 const onDevice=counts(localWorkspace),server=counts(remoteWorkspace);
 const localCount=Object.values(onDevice).reduce((n,k)=>n+k,0);
 const remoteCount=Object.values(server).reduce((n,k)=>n+k,0);
 const pending=Number(status.queuedOperations)>0||status.dirty===true;
 const preview={localCount,remoteCount,local:onDevice,remote:server,revision,
  level:'unknown',heading:'Cannot confirm recovery readiness',explanation:'No records have been changed.'};
 if(status.blocked){preview.level='blocked';preview.heading='Local recovery is blocked';preview.explanation='The local journal or recovery checkpoint has a reported problem. Keep browser data and export a recovery bundle before proceeding.'}
 else if(status.uploading){preview.level='blocked';preview.heading='Cloud transfer in progress';preview.explanation='Wait until the current operation finishes, then repeat this read-only check.'}
 else if(pending){preview.level='blocked';preview.heading='Unsent local changes';preview.explanation='This device has pending or unacknowledged local edits. Do not load from the server: doing so could discard those edits. Export a recovery bundle and review conflicts first.'}
 else if(!remoteWorkspace||remoteCount===0){preview.level='empty';preview.heading='No recoverable cloud records confirmed';preview.explanation='PostgreSQL is readable but the inspected workspace has no tracked/planned records in these categories. Loading from server would not restore activities.'}
 else if(localCount===0){preview.level='candidate';preview.heading='Potential new-device recovery';preview.explanation='This browser has no records in the inspected categories, and PostgreSQL has data. Recovery may be possible after backup and explicit review. This preview has not loaded anything.'}
 else {
  const diff=window.lifeosCloudVerificationV47?.recordDifferences?.(localWorkspace,remoteWorkspace);
  const basicMatch=diff?.same===true;
  const sameOther=TYPES.filter(k=>k!=='sessions'&&k!=='schedule').every(k=>{
   const a=Array.isArray(localWorkspace?.[k])?localWorkspace[k]:[];
   const b=Array.isArray(remoteWorkspace?.[k])?remoteWorkspace[k]:[];
   return JSON.stringify(a)===JSON.stringify(b);
  });
  preview.level=basicMatch&&sameOther?'review':'conflict';
  preview.heading=basicMatch&&sameOther?'Device records broadly match PostgreSQL':'Existing local records require comparison';
  preview.explanation=basicMatch&&sameOther?'The inspected record categories match. Other workspace fields and revision status may still differ. Do not replace local state without reviewing its backup.':
  'The browser already contains records that may differ from PostgreSQL. Use Compare with server and review both versions rather than automatically replacing either.';
 }
 return preview;
}
async function fetchReadOnly(path,token){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(path,{method:'GET',headers:{'X-LifeOS-Token':token},
   credentials:'same-origin',cache:'no-store',signal:controller.signal});
  if(!response.ok)throw new Error(response.status===401?'Authentication failed: check your private token.':
   response.status===503?'Server storage is temporarily unavailable.':'Server returned HTTP '+response.status+'.');
  return await response.json();
 }finally{clearTimeout(timeout)}
}
function show(preview){
 const host=$('lo48RecoveryResult');if(!host)return;
 const parts=TYPES.map(k=>[k,preview.local[k],preview.remote[k]]).filter(([,a,b])=>a||b);
 host.innerHTML='<div class="lo48-outcome lo48-'+esc(preview.level)+'"><strong>'+esc(preview.heading)+'</strong><p>'+esc(preview.explanation)+'</p></div>'+
 '<div class="lo48-count"><span>On this device: <b>'+preview.localCount+'</b> records</span><span>In PostgreSQL: <b>'+preview.remoteCount+'</b> records</span></div>'+
 (parts.length?'<div class="lo48-types">'+parts.map(([k,a,b])=>'<div><span>'+esc(k)+'</span><small>Device '+a+' · Cloud '+b+'</small></div>').join('')+'</div>':'')+
 '<p class="lo48-foot">Server revision '+esc(preview.revision)+'. Comparison only; record counts are not a guarantee of successful recovery. Some types may be omitted from this summary. Neither copy was modified.</p>'+
 '<p class="lo48-foot">To continue safely, make a recovery export, then use the existing <strong>Compare with server</strong> and <strong>Load from server</strong> controls under Cloud sync. Loading requires explicit confirmation and is not performed by this preview.</p>';
}
async function check(){
 const result=$('lo48RecoveryResult'),btn=$('lo48RecoveryPreview');
 if(!result||checking)return;
 const token=$('syncToken')?.value.trim();
 if(!token){result.textContent='Enter your existing private sync token above. No data were transferred.';return}
 checking=true;btn.disabled=true;result.textContent='Comparing local and PostgreSQL records without making changes…';
 const before=local(),beforeStatus=cloud();
 try{
  if(!before)throw Error('The local workspace is unavailable. Do not clear local browser data.');
  const status=await fetchReadOnly('/api/storage/status',token);
  if(status.backend!=='postgresql'||status.storage_readable!==true||status.read_only!==true)
   throw Error('PostgreSQL read-only storage status could not be confirmed.');
  const response=await fetchReadOnly('/api/state',token);
  if(!Number.isInteger(response.revision)||response.revision!==status.revision)
   throw Error('Server revision changed while checking. Run the preview again.');
  const after=local(),afterStatus=cloud();
  if(JSON.stringify(before)!==JSON.stringify(after)||JSON.stringify(beforeStatus)!==JSON.stringify(afterStatus))
   throw Error('Local activity or sync status changed during this check. Repeat the preview after current operations complete.');
  show(assess(after,response.data,afterStatus,response.revision));
 }catch(err){
  result.innerHTML='<strong class="lo48-warning">Preview incomplete</strong><p>'+esc(err.name==='AbortError'?'Request timed out.':err.message||String(err))+'</p>'+
   '<p class="lo48-foot">No records were changed. Keep your original device and its recovery backup intact.</p>';
 }finally{checking=false;btn.disabled=false}
}
function init(){
 const panel=$('cloudSyncPanel');if(!panel||$('lo48RecoveryPreviewPanel'))return;
 const section=document.createElement('details');section.id='lo48RecoveryPreviewPanel';section.className='lo48-preview';
 section.innerHTML='<summary>Second-device recovery preview · read only</summary>'+
 '<p>Before restoring data on a new phone or computer, compare saved PostgreSQL records with this browser. This preview never loads or overwrites your workspace.</p>'+
 '<button type="button" id="lo48RecoveryPreview" class="btn outline">Preview recovery readiness</button>'+
 '<div id="lo48RecoveryResult" role="status" aria-live="polite"></div>';
 const prev=$('lo47CloudCheckPanel');if(prev)prev.after(section);else panel.append(section);
 section.addEventListener('click',e=>{if(e.target.closest('#lo48RecoveryPreview'))check()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.lifeosRecoveryPreviewV48={counts,assess,check};
})();