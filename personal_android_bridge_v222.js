/* V222: opt-in native Android origin-scoped WebMessage bridge.
 * Read-only projection of the canonical LifeOS active timer; does not alter
 * sessions, cloud state, or send personally sensitive workspace information.
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
let last='';
function publish(){
 const native=root.LifeOSNative;
 if(!native||typeof native.postMessage!=='function')return false;
 let sessions=[];try{sessions=root.lifeosReadOnlyWorkspace?.()?.sessions||[]}catch(_){}
 const s=pick(sessions);
 const message=s?{kind:'timer-status',id:String(s.id).slice(0,100),name:String(s.name||'Activity').slice(0,80),
   status:s.status,elapsedMs:Math.min(604800000,Math.floor(elapsed(s,Date.now())))}:
   {kind:'timer-status',status:'stopped'};
 // Running elapsed changes continuously; send on initial mount, return, or activity changes.
 const signature=s?String(s.id)+'|'+s.status+'|'+s.name:'none';
 if(signature===last&&!document.hasFocus())return true;
 last=signature;
 try{native.postMessage(JSON.stringify(message));return true}catch(_){return false}
}
if(root?.document){
 root.addEventListener('lifeos-v77-tracking-changed',()=>root.setTimeout(publish,100));
 root.addEventListener('pageshow',publish);
 root.addEventListener('focus',publish);
 root.addEventListener('load',()=>root.setTimeout(publish,400));
 // A bridge may be injected after scripts mount; one opportunistic retry.
 root.setTimeout(publish,1500);
}
root.LifeOSAndroidBridgeV222={pick,elapsed,publish};
})(typeof window!=='undefined'?window:globalThis);
