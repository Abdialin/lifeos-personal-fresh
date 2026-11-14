/* LifeOS V72 — read-only mobile background timer status and checkpoint comparison. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSBackgroundTrackingV72=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos-v4-stage21-atomic';
function elapsed(session,now){
 if(!session||!Array.isArray(session.segments)||!Number.isFinite(now))return 0;
 return session.segments.reduce((sum,seg)=>{if(!seg||!Number.isFinite(seg.start))return sum;const end=Number.isFinite(seg.end)?seg.end:session.status==='running'?now:seg.start;return sum+Math.max(0,Math.min(now,end)-seg.start)},0);
}
function inspect(workspace,now=Date.now()){
 const sessions=Array.isArray(workspace?.sessions)?workspace.sessions:[];
 const active=sessions.filter(s=>s&&(s.status==='running'||s.status==='paused'));
 const timers=active.map(s=>{
  const segments=Array.isArray(s.segments)?s.segments:[];
  const open=segments.filter(seg=>seg&&seg.end==null);
  const malformed=!segments.length||segments.some(seg=>!seg||!Number.isFinite(seg.start)||(seg.end!=null&&(!Number.isFinite(seg.end)||seg.end<seg.start)));
  const valid=(s.status==='running'&&open.length===1&&segments[segments.length-1]===open[0])||(s.status==='paused'&&open.length===0);
  const future=segments.some(seg=>seg&&Number.isFinite(seg.start)&&seg.start>now+60000);
  return {id:String(s.id||''),name:String(s.name||'Activity'),status:s.status,elapsedMs:elapsed(s,now),valid:valid&&!malformed&&!future,warning:future?'Session start timestamp lies in the future.':malformed||!valid?'Timer segment state requires review.':null};
 });
 return {active:timers.length,running:timers.filter(x=>x.status==='running').length,paused:timers.filter(x=>x.status==='paused').length,timers,warnings:timers.filter(x=>!x.valid).length};
}
function compareCheckpoint(workspace,raw,unpack){
 if(!raw)return {ok:false,reason:'Canonical local checkpoint is unavailable.'};
 try{
  const encoded=JSON.parse(raw);
  if(!encoded||![1,2].includes(encoded.format))return {ok:false,reason:'Unsupported local checkpoint format.'};
  if(encoded.format===2&&typeof unpack!=='function')return {ok:false,reason:'Compact checkpoint decoder is unavailable.'};
  const saved=(encoded.format===2?unpack(encoded):encoded)?.workspace;
  const validator=root.LifeOSPersistenceValidatorV70;
  if(!validator||typeof validator.compareRecords!=='function')return {ok:false,reason:'Checkpoint comparison module is unavailable.'};
  const assessment=validator.compareRecords(workspace,saved);
  return {ok:assessment.ok,reason:assessment.ok?'Active timer records match the saved local checkpoint.':'Current activity records do not match the local checkpoint.',issues:assessment.issues||[]};
 }catch{return {ok:false,reason:'Local checkpoint could not be decoded.'}}
}
function fmt(ms){const seconds=Math.floor(ms/1000),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);return hours+':'+String(minutes).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')}
function mount(){
 const parent=document.getElementById('trackActivePanel');if(!parent||document.getElementById('lo72-background-status'))return;
 const section=document.createElement('section');section.id='lo72-background-status';section.className='lo72-background';
 section.innerHTML='<div class="lo72-header"><strong>Background Tracking Status</strong><span id="lo72-count" class="lo72-pill">Checking…</span></div><p class="lo72-explain">Running timers use saved timestamps, not background screen updates. After unlocking or reopening LifeOS, the time is recalculated. Nothing is modified by this panel.</p><div id="lo72-timers" class="lo72-timers"></div><div id="lo72-checkpoint" role="status" class="lo72-checkpoint">Local checkpoint not checked yet.</div><button class="btn outline" id="lo72-verify" type="button">Verify saved timer state</button><small class="lo72-note">This checks local persistence only. It does not verify Google Calendar or PostgreSQL syncing.</small>';
 const sessions=parent.querySelector('#sessions');if(sessions)sessions.after(section);else parent.append(section);
 const count=section.querySelector('#lo72-count'),list=section.querySelector('#lo72-timers'),status=section.querySelector('#lo72-checkpoint');
 let lastFingerprint='',lastResume=Date.now();
 const workspace=()=>root.lifeosReadOnlyWorkspace?.()||null;
 const paint=()=>{
  if(document.hidden)return;
  const state=workspace();
  if(!state){count.textContent='Unavailable';list.textContent='Active workspace not available.';return;}
  const report=inspect(state,Date.now());
  count.textContent=report.running+' running · '+report.paused+' paused';
  const fingerprint=report.timers.map(s=>s.id+'|'+s.status+'|'+s.valid).join(';');
  if(lastFingerprint!==fingerprint){list.replaceChildren();for(const t of report.timers){const line=document.createElement('div');line.className='lo72-timer';const label=document.createElement('span');label.textContent=t.name+' · '+t.status;const duration=document.createElement('strong');duration.dataset.lo72Timer=t.id;duration.textContent=fmt(t.elapsedMs);line.append(label,duration);if(t.warning){const warning=document.createElement('small');warning.textContent=t.warning;line.append(warning)}list.append(line)}if(!report.timers.length)list.textContent='No active or paused timers.';lastFingerprint=fingerprint}
  for(const t of report.timers){const el=Array.from(list.querySelectorAll('[data-lo72-timer]')).find(x=>x.dataset.lo72Timer===t.id);if(el)el.textContent=fmt(t.elapsedMs)}
 };
 const verify=()=>{
  const state=workspace();if(!state){status.textContent='Cannot verify: active workspace unavailable.';return}
  const report=compareCheckpoint(state,localStorage.getItem(KEY),root.LifeOSCompactRecovery?.unpack);
  status.textContent=(report.ok?'✓ ':'⚠ ')+report.reason+(report.issues?.length?' '+report.issues.join(' '):'')+' Last checked '+new Date().toLocaleTimeString()+'.';
 };
 section.querySelector('#lo72-verify').addEventListener('click',verify);
 const resume=()=>{if(document.hidden)return;lastResume=Date.now();paint();verify()};
 document.addEventListener('visibilitychange',resume);window.addEventListener('pageshow',resume);window.addEventListener('focus',resume);
 window.setInterval(paint,1000);
 paint();verify();
}
const api={elapsed,inspect,compareCheckpoint};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount()}
return api;
});
