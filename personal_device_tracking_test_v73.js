/* LifeOS Personal V73 — opt-in, read-only background tracking verification. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSDeviceTrackingTestV73=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos-v73-device-test-snapshot',ATOMIC='lifeos-v4-stage21-atomic';
function capture(workspace,id,at,engine){
 const s=(workspace?.sessions||[]).find(x=>String(x.id)===String(id));
 if(!s||!['running','paused'].includes(s.status))return {ok:false,reason:'Choose an existing running or paused activity.'};
 const report=engine?.inspect(workspace,at),entry=report?.timers?.find(x=>x.id===String(id));
 if(!entry?.valid)return {ok:false,reason:'The selected timer has invalid segment timestamps. Review tracking data first.'};
 return {ok:true,baseline:{version:1,id:String(s.id),status:s.status,at,elapsedMs:engine.elapsed(s,at),startAt:s.startAt,openStart:s.status==='running'?s.segments[s.segments.length-1].start:null}};
}
function evaluate(baseline,workspace,at,engine,checkpoint){
 if(!baseline||baseline.version!==1||typeof baseline.id!=='string'||!Number.isFinite(baseline.at)||!Number.isFinite(baseline.elapsedMs))return {state:'not-started',message:'No valid test baseline. Capture one first.'};
 const session=(workspace?.sessions||[]).find(s=>String(s.id)===baseline.id);
 if(!session)return {state:'fail',message:'The selected activity is missing from the current workspace.'};
 const elapsedTime=at-baseline.at;
 if(elapsedTime<0)return {state:'review',message:'Device clock moved backward. Timer continuity cannot be confirmed.'};
 if(elapsedTime<30000)return {state:'review',message:'Less than 30 seconds have elapsed. Lock or background your phone, then verify again.'};
 if(session.startAt!==baseline.startAt)return {state:'fail',message:'The activity start timestamp changed.'};
 if(session.status!==baseline.status)return {state:'review',message:'The timer status changed during the test. Verify whether you paused or finished it intentionally.'};
 const entry=engine?.inspect(workspace,at)?.timers?.find(x=>x.id===baseline.id);
 if(!entry?.valid)return {state:'fail',message:'The resumed timer has inconsistent segment timestamps.'};
 if(baseline.status==='running'&&session.segments?.at(-1)?.start!==baseline.openStart)return {state:'review',message:'The running segment changed; check for an intentional pause or restart.'};
 const current=engine.elapsed(session,at);
 const delta=current-baseline.elapsedMs;
 if(baseline.status==='running'&&Math.abs(delta-elapsedTime)>2500)return {state:'fail',message:'Recorded timer duration does not match elapsed device time.'};
 if(baseline.status==='paused'&&Math.abs(delta)>2500)return {state:'fail',message:'Paused activity duration changed unexpectedly.'};
 if(!checkpoint?.ok)return {state:'fail',message:'Timer continuity appears correct, but the local recovery checkpoint does not match the current workspace.'};
 return {state:'pass',message:baseline.status==='running'?'The running timer advanced by the expected wall-clock duration and matches the saved checkpoint.':'The paused timer remained unchanged and matches the saved checkpoint.',elapsedMs:current,intervalMs:elapsedTime};
}
function mount(){
 const parent=document.getElementById('lo72-background-status');if(!parent||document.getElementById('lo73-device-test'))return;
 const host=document.createElement('section');host.id='lo73-device-test';host.className='lo73-test';
 host.innerHTML='<h3>Real-device background test</h3><p class="sub">Use an activity you are already tracking. This check does not create or alter records. Capture its state, lock or background your phone for at least 30 seconds, then return and verify.</p><label class="sub" for="lo73-choice">Existing activity</label><select class="field" id="lo73-choice"></select><div class="lo73-actions"><button class="btn outline" type="button" id="lo73-capture">Capture baseline</button><button class="btn primary" type="button" id="lo73-verify">Verify after return</button><button class="btn outline" type="button" id="lo73-clear">Clear test snapshot</button></div><p id="lo73-status" class="lo73-status" role="status">No test baseline captured.</p><small class="lo73-note">The test snapshot contains only the selected activity ID, its timer state and timestamps. It stays in this browser tab’s session storage—not activity history. Some browsers discard it when fully closed. This test checks local saving, not PostgreSQL or cloud sync.</small>';
 parent.append(host);
 const picker=host.querySelector('#lo73-choice'),status=host.querySelector('#lo73-status');
 const state=()=>root.lifeosReadOnlyWorkspace?.();
 const engine=root.LifeOSBackgroundTrackingV72;
 function read(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{return null}}
 function options(){
  const previous=picker.value;picker.replaceChildren(new Option('Select an activity',''));
  for(const s of state()?.sessions||[])if(['running','paused'].includes(s.status))picker.add(new Option(String(s.name||'Activity')+' · '+s.status,String(s.id)));
  picker.value=Array.from(picker.options).some(x=>x.value===previous)?previous:'';
 }
 function message(m){status.textContent=m}
 host.querySelector('#lo73-capture').addEventListener('click',()=>{
  const workspace=state(),at=Date.now();
  const checkpoint=engine?.compareCheckpoint(workspace,localStorage.getItem(ATOMIC),root.LifeOSCompactRecovery?.unpack);
  if(!checkpoint?.ok){message('Cannot capture a trustworthy baseline: local checkpoint verification failed. Use Verify saved timer state first.');return}
  const result=capture(workspace,picker.value,at,engine);
  if(!result.ok){message(result.reason);return}
  try{sessionStorage.setItem(KEY,JSON.stringify(result.baseline));message('Baseline captured. Lock your phone or switch apps for at least 30 seconds, then return here and choose Verify after return.')}catch{message('Cannot save test snapshot in this tab. No activity data was changed.')}
 });
 host.querySelector('#lo73-verify').addEventListener('click',()=>{
  const baseline=read();if(!baseline){message('No test snapshot found in this tab. The browser may have cleared session storage; capture again.');return}
  const workspace=state(),at=Date.now();
  const checkpoint=engine?.compareCheckpoint(workspace,localStorage.getItem(ATOMIC),root.LifeOSCompactRecovery?.unpack);
  const result=evaluate(baseline,workspace,at,engine,checkpoint);
  message((result.state==='pass'?'✓ PASS: ':result.state==='fail'?'⚠ FAILED: ':'Review: ')+result.message);
 });
 host.querySelector('#lo73-clear').addEventListener('click',()=>{try{sessionStorage.removeItem(KEY)}catch{}message('Test snapshot cleared. No activity records were modified.')});
 window.addEventListener('pageshow',options);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)options()});
 options();
 if(read())message('A previous test baseline is available in this tab. Return from screen lock and choose Verify after return.');
}
const api={capture,evaluate};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount()}
return api;
});
