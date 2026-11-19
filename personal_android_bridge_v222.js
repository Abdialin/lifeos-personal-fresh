/* V222: opt-in native Android origin-scoped WebMessage bridge.
 * Projects the canonical active timer. Verified native pause/resume requests
 * enter the existing authoritative V77 action handler; never mutate storage directly.
 */
(function(root){
'use strict';
function pick(sessions){
 const all=Array.isArray(sessions)?sessions:[];
 return all.find(s=>s&&s.id!=null&&s.status==='running')||
        all.find(s=>s&&s.id!=null&&s.status==='paused')||null;
}
function elapsed(s,at){
 if(!s)return 0;
 return Math.max(0,(Array.isArray(s.segments)?s.segments:[]).reduce((sum,part)=>{
  const a=Number(part?.start),b=part?.end==null?(s.status==='running'?at:a):Number(part.end);
  return sum+(Number.isFinite(a)&&Number.isFinite(b)&&b>=a?b-a:0);
 },0));
}
function nativeTimerAction(id,action){
 if(typeof id!=='string'||!id||id.length>100||!['pause','resume'].includes(action))return false;
 let sessions=[];try{sessions=root.lifeosReadOnlyWorkspace?.()?.sessions||[]}catch(_){return false}
 if(!Array.isArray(sessions))return false;
 const item=Array.isArray(sessions)?sessions.find(x=>x&&String(x.id)===id):null;
 if(!item||(action==='pause'&&item.status!=='running')||(action==='resume'&&item.status!=='paused'))return false;
 if(typeof root.dispatchEvent!=='function'||typeof root.CustomEvent!=='function')return false;
 const detail={id,action,result:{ok:false,message:'Native timer action was not accepted.'}};
 root.dispatchEvent(new root.CustomEvent('lifeos-v77-timer-action',{detail}));
 // The authoritative event handler synchronously updates status and result.
 if(detail.result?.ok!==true)return false;
 publish();
 return true;
}
let last='',lastAlarm='';
function publishAlarm(force=false){
 const native=root.LifeOSNative;
 if(!native||typeof native.postMessage!=='function')return false;
 let saved=null;try{saved=JSON.parse(root.localStorage?.getItem('lifeos.personal.focus.v207')||'null')}catch(_){}
 const active=saved&&['focus','alarm'].includes(saved.kind)&&saved.mode==='running'&&Number.isFinite(Number(saved.end))&&saved.end>Date.now();
 const value=active?{kind:'alarm-status',status:'scheduled',name:String(saved.label||'LifeOS alarm').slice(0,80),endMs:Math.floor(Number(saved.end))}:
   saved?.mode==='ringing'?{kind:'alarm-status',status:'ringing'}:{kind:'alarm-status',status:'cancelled'};
 const signature=value.status+'|'+(value.endMs||'');
 if(signature===lastAlarm&&!force)return true;
 try{native.postMessage(JSON.stringify(value));lastAlarm=signature;return true}catch(_){return false}
}
function publish(force=false){
 const native=root.LifeOSNative;
 if(!native||typeof native.postMessage!=='function')return false;
 let sessions=[];try{sessions=root.lifeosReadOnlyWorkspace?.()?.sessions||[]}catch(_){}
 if(!Array.isArray(sessions))sessions=[];
 const s=pick(sessions);
 const openCount=sessions.filter(x=>x&&['running','paused'].includes(x.status)&&x.id!=null).length;
 const message=s?{kind:'timer-status',id:String(s.id).slice(0,100),name:String(s.name||'Activity').slice(0,80),
   status:s.status,activeCount:Math.min(100,openCount),
   elapsedMs:Math.min(604800000,Math.floor(elapsed(s,Date.now()))),
   // Native foreground service may use this snapshot to create a running
   // Android chronometer without depending on WebView timers after screen lock.
   snapshotAtMs:Date.now(),segmentsCount:Array.isArray(s.segments)?s.segments.length:0,
   runningSegmentStartMs:s.status==='running'&&Array.isArray(s.segments)&&s.segments.at(-1)?.end==null?Number(s.segments.at(-1).start):null,
   requiresForegroundService:s.status==='running',notificationType:'ongoing-timer'}:
   {kind:'timer-status',status:'stopped'};
 // Running elapsed changes continuously; send on initial mount, return, or activity changes.
 const signature=s?String(s.id)+'|'+s.status+'|'+s.name+'|'+openCount:'none';
 if(signature===last&&!force)return true;
 try{native.postMessage(JSON.stringify(message));last=signature;return true}catch(_){return false}
}
if(root?.document){
 root.addEventListener('lifeos-v77-tracking-changed',()=>root.setTimeout(publish,100));
 root.addEventListener('lifeos-v221-focus-changed',()=>root.setTimeout(publishAlarm,100));
 root.addEventListener('pageshow',()=>{publish(true);publishAlarm(true)});
 root.addEventListener('focus',()=>{publish(true);publishAlarm(true)});
 root.document.addEventListener('visibilitychange',()=>{if(!root.document.hidden){publish(true);publishAlarm(true)}});
 root.addEventListener('load',()=>root.setTimeout(()=>{publish(true);publishAlarm(true)},400));
 // A bridge may be injected after scripts mount; one opportunistic retry.
 root.setTimeout(()=>{publish(true);publishAlarm(true)},1500);
 // Quick Start and legacy handlers do not all dispatch v77 events. Read-only
 // change detection keeps the native display in sync without duplicating writes.
 root.setInterval(()=>{if(!document.hidden)publish()},2000);
}
root.LifeOSAndroidBridgeV222={pick,elapsed,publish,publishAlarm,nativeTimerAction};
})(typeof window!=='undefined'?window:globalThis);
