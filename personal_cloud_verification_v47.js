/* LifeOS V47 — authenticated, read-only cloud persistence verification.
 * Never uploads, replaces, merges, or logs private activity records or auth tokens.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const live=()=>window.lifeosReadOnlyWorkspace?.()||null;
const localStatus=()=>window.lifeosCloudStatusV47?.()||{};
let running=false,checkedAt='';
function recordDifferences(local,remote){
 const l=local||{},r=remote||{};
 const leftSessions=Array.isArray(l.sessions)?l.sessions:[],rightSessions=Array.isArray(r.sessions)?r.sessions:[];
 const leftPlans=Array.isArray(l.schedule)?l.schedule:[],rightPlans=Array.isArray(r.schedule)?r.schedule:[];
 const rs=new Map(rightSessions.map(x=>[x.id,x])),ls=new Map(leftSessions.map(x=>[x.id,x]));
 const rp=new Map(rightPlans.map(x=>[x.id,x])),lp=new Map(leftPlans.map(x=>[x.id,x]));
 let missingRemoteSessions=0,remoteOnlySessions=0,changedSessions=0;
 for(const x of leftSessions){const y=rs.get(x.id);
  if(!y){missingRemoteSessions++;continue}
  if(['status','name','startAt','endAt','plannedId'].some(k=>x[k]!==y[k])||
    JSON.stringify(x.segments||[])!==JSON.stringify(y.segments||[]))changedSessions++;
 }
 for(const x of rightSessions)if(!ls.has(x.id))remoteOnlySessions++;
 let missingRemotePlans=0,remoteOnlyPlans=0,changedPlans=0;
 for(const x of leftPlans){const y=rp.get(x.id);
  if(!y){missingRemotePlans++;continue}
  if(['status','name','startAt','endAt','sessionId'].some(k=>x[k]!==y[k]))changedPlans++;
 }
 for(const x of rightPlans)if(!lp.has(x.id))remoteOnlyPlans++;
 const all=[missingRemoteSessions,remoteOnlySessions,changedSessions,missingRemotePlans,remoteOnlyPlans,changedPlans];
 return {same:all.every(n=>n===0),missingRemoteSessions,remoteOnlySessions,changedSessions,
  missingRemotePlans,remoteOnlyPlans,changedPlans,
  localSessions:leftSessions.length,serverSessions:rightSessions.length,
  localPlans:leftPlans.length,serverPlans:rightPlans.length};
}
async function request(path,token){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(path,{method:'GET',headers:{'X-LifeOS-Token':token},
   cache:'no-store',credentials:'same-origin',signal:controller.signal});
  if(!response.ok){
   if(response.status===401)throw Error('Authentication failed. Check the private sync token and browser login.');
   if(response.status===503)throw Error('Server storage is not currently readable. No records were changed.');
   throw Error('Server responded with HTTP '+response.status+'. No records were changed.');
  }
  return await response.json();
 }finally{clearTimeout(timer)}
}
function interpret(status,remoteRevision,diff,cloudHasState){
 if(status.blocked)return {level:'blocked',label:'Local recovery needs attention',detail:'Local recovery or offline journal is blocked. Export a recovery backup before any synchronization attempt.'};
 if(status.uploading)return {level:'pending',label:'Sync operation in progress',detail:'Cloud state could change while this check runs. Repeat after the upload finishes.'};
 if(status.dirty||status.queuedOperations>0)return {level:'pending',label:'Local changes may still be pending',detail:'The offline journal reports '+(status.queuedOperations||0)+' queued operation(s), or local unsynchronized state. Do not treat this device as fully synced.'};
 if(!cloudHasState)return {level:'pending',label:'Cloud workspace is empty',detail:'No server workspace is stored yet. Local data have not been confirmed in PostgreSQL.'};
 if(!diff.same)return {level:'different',label:'Local and cloud activity records differ',detail:'Use the existing Compare with server and recovery tools before resolving differences. Do not overwrite either copy blindly.'};
 if(status.acknowledgedRevision!==remoteRevision)return {level:'pending',label:'Data match, but revision is not acknowledged',detail:'The locally acknowledged revision ('+(status.acknowledgedRevision??'unknown')+') differs from PostgreSQL revision '+remoteRevision+'. Review connection state before claiming synchronization.'};
 return {level:'ok',label:'Cloud activity data match this device',detail:'Timer and plan records match the saved PostgreSQL workspace at the checked revision, with no local queue reported. This does not verify other devices or future changes.'};
}
function renderResult(payload){
 const target=$('lo47CloudCheckResult');if(!target)return;
 const {status,backend,revision,hasState,diff,verdict}=payload;
 target.innerHTML='<div class="lo47-result-head lo47-'+esc(verdict.level)+'"><strong>'+esc(verdict.label)+'</strong><span>'+esc(backend)+' · revision '+esc(revision)+'</span></div>'+
 '<p>'+esc(verdict.detail)+'</p>'+
 '<div class="lo47-grid"><span><b>'+diff.localSessions+'</b><small>Device sessions</small></span>'+
 '<span><b>'+diff.serverSessions+'</b><small>Cloud sessions</small></span>'+
 '<span><b>'+diff.localPlans+'</b><small>Device plans</small></span>'+
 '<span><b>'+diff.serverPlans+'</b><small>Cloud plans</small></span></div>'+
 (!diff.same?'<p class="lo47-differences">Missing from cloud: '+diff.missingRemoteSessions+' sessions / '+diff.missingRemotePlans+' plans.'+
 ' Cloud-only: '+diff.remoteOnlySessions+' sessions / '+diff.remoteOnlyPlans+' plans.'+
 ' Changed records: '+diff.changedSessions+' sessions / '+diff.changedPlans+' plans.</p>':'')+
 '<p class="lo47-note">Local offline queue: '+esc(status.queuedOperations??'unknown')+
 ' · Last acknowledged revision: '+esc(status.acknowledgedRevision??'unknown')+
 ' · '+esc(checkedAt)+'.</p>'+
 '<p class="lo47-note">Read-only verification. No server or local records were modified, and no token was saved by this check. Cross-device recovery needs a separate check on the second device.</p>';
}
async function check(){
 const result=$('lo47CloudCheckResult'),button=$('lo47CloudCheck');
 if(!result||running)return;
 const token=$('syncToken')?.value.trim();
 if(!token){result.textContent='Enter your private sync token in Cloud sync first. No data were transferred.';return}
 running=true;button.disabled=true;
 result.textContent='Reading PostgreSQL status and workspace revision without changing anything…';
 const startLocal=live();
 const startStatus=localStatus();
 try{
  if(!startLocal)throw Error('Local workspace is unavailable. Try reloading; do not clear browser storage.');
  const storage=await request('/api/storage/status',token);
  if(storage.backend!=='postgresql'||storage.storage_readable!==true||storage.read_only!==true)
   throw Error('Server did not confirm a readable PostgreSQL backend. Check the server configuration before relying on cloud persistence.');
  const remote=await request('/api/state',token);
  if(!Number.isInteger(remote.revision)||remote.revision!==storage.revision)
   throw Error('Server revision changed during verification. Repeat the read-only check.');
  const endLocal=live(),endStatus=localStatus();
  const localChanged=JSON.stringify(startLocal.sessions)!==JSON.stringify(endLocal?.sessions)||
    JSON.stringify(startLocal.schedule)!==JSON.stringify(endLocal?.schedule)||
    startStatus.queuedOperations!==endStatus.queuedOperations;
  if(localChanged)throw Error('Your device changed while checking. Repeat verification after the current activity or upload is finished.');
  const difference=recordDifferences(endLocal,remote.data);
  const verdict=interpret(endStatus,remote.revision,difference,remote.data!==null);
  checkedAt=new Date().toLocaleString();
  renderResult({status:endStatus,backend:storage.backend,revision:remote.revision,
   hasState:storage.has_state,diff:difference,verdict});
 }catch(err){
  result.innerHTML='<strong class="lo47-caution">Cloud check incomplete</strong><p>'+esc(err.name==='AbortError'?'Server request timed out. No local or cloud data were changed.':err.message||String(err))+'</p>'+
   '<p class="lo47-note">This does not mean your data were lost. Retain browser data and use the existing recovery export before attempting any repair.</p>';
 }finally{running=false;button.disabled=false}
}
function init(){
 const panel=$('cloudSyncPanel');if(!panel||$('lo47CloudCheckPanel'))return;
 const details=document.createElement('details');details.id='lo47CloudCheckPanel';details.className='lo47-cloud-check';
 details.innerHTML='<summary>Verify PostgreSQL sync · read only</summary>'+
 '<p>Check whether PostgreSQL is readable and whether this device\'s timer and plan records match the server. This will never upload, replace, merge, or delete activity data.</p>'+
 '<button type="button" id="lo47CloudCheck" class="btn outline">Verify server and activity records</button>'+
 '<div id="lo47CloudCheckResult" role="status" aria-live="polite"></div>';
 const status=$('syncStatus');if(status)status.after(details);else panel.append(details);
 details.addEventListener('click',e=>{if(e.target.closest('#lo47CloudCheck'))check()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.lifeosCloudVerificationV47={recordDifferences,interpret,check};
})();