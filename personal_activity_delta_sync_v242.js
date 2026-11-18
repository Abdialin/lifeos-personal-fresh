/* V242: conservative, by-ID additive activity synchronization policy.
   No network/storage operations. Server snapshots are the base for publication. */
(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const canonical=v=>Array.isArray(v)?v.map(canonical):
 v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function prepared(local,remote){
 const api=root.LifeOSBrowserActivityRecoveryV241;
 if(!api)throw Error('Activity comparator unavailable.');
 api.validRows(local);api.validRows(remote);
 const file={exportType:'lifeos-browser-activity-transfer-v241',version:1,createdAt:Date.now(),workspace:{
  version:1,sessions:local.sessions,events:local.events}};
 const plan=api.preview(remote,file);
 return {...plan,merged:api.apply(remote,plan)};
}
function publishPlan(browser,server){
 // Published output always starts with the *current server* workspace.
 const p=prepared(browser,server);
 return {ok:true,addSessions:p.addedSessions,addEvents:p.addedEvents,
  skippedSessions:p.conflictSessions,skippedEvents:p.conflictEvents,
  merged:p.merged};
}
function receivePlan(device,server){
 const p=prepared(device,server);
 if(p.addedSessions||p.addedEvents)
  return {ok:false,reason:'Local activities are not present in the server. Review these records before adopting server history.'};
 if(p.conflictSessions||p.conflictEvents)
  return {ok:false,reason:'Shared activity IDs differ. Do not replace local history without explicit reconciliation.'};
 const other=w=>{const copy=clone(w);delete copy.sessions;delete copy.events;return copy};
 if(!equal(other(device),other(server)))
  return {ok:false,reason:'Other workspace collections or settings changed on server. Use full workspace comparison.'};
 const localIds={
  sessions:new Set(device.sessions.map(x=>x.id)),
  events:new Set(device.events.map(x=>x.id))
 };
 const missingSessions=server.sessions.filter(x=>!localIds.sessions.has(x.id)).length;
 const missingEvents=server.events.filter(x=>!localIds.events.has(x.id)).length;
 return {ok:missingSessions+missingEvents>0,addSessions:missingSessions,addEvents:missingEvents,
  merged:clone(server),reason:missingSessions+missingEvents?'':'Both copies already contain the same activity IDs.'};
}
root.LifeOSActivityDeltaSyncV242={publishPlan,receivePlan,equal};
})(typeof window!=='undefined'?window:globalThis);
