/* V234. Pure, fail-closed policy for adopting an existing cloud workspace on
   a fresh device with a single identical, unbased initialization snapshot.
   This module performs NO reads, writes, network calls or automatic actions. */
(function(root){
'use strict';
const collections=['sessions','events','todos','workouts','meals','goals','schedule',
 'personalLogs','bodyMetrics','waterIntake','habitDefinitions','habitChecks',
 'friendShares','idealRoutines','mealTemplates'];
function normalize(value){
 if(Array.isArray(value))return value.map(normalize);
 if(value&&typeof value==='object')return Object.fromEntries(
  Object.keys(value).sort().map(k=>[k,normalize(value[k])]));
 return value;
}
function equivalent(a,b){return JSON.stringify(normalize(a))===JSON.stringify(normalize(b))}
function describe(workspace){
 if(!workspace||typeof workspace!=='object'||Array.isArray(workspace)||workspace.version!==1)return null;
 const counts={};
 for(const k of collections){
  if(workspace[k]!==undefined&&!Array.isArray(workspace[k]))return null;
  counts[k]=Array.isArray(workspace[k])?workspace[k].length:0;
 }
 // Unknown data-bearing arrays also block "fresh device" status: never
 // silently discard records of future modules.
 for(const [k,v] of Object.entries(workspace))
  if(Array.isArray(v)&&v.length>0&&!collections.includes(k))return null;
 return counts;
}
function inspect({local,queue,meta,remote,blocked=false}={}){
 const deny=reason=>({ok:false,reason});
 if(blocked)return deny('Local recovery storage is blocked or corrupt.');
 const localCounts=describe(local),remoteCounts=describe(remote?.data);
 if(!localCounts||!remoteCounts)return deny('Workspace schema is unsupported or malformed.');
 if(Object.values(localCounts).some(v=>v!==0))return deny('This device already contains records. Use record-level reconciliation.');
 if(!Array.isArray(queue)||queue.length!==1)return deny('Expected exactly one initialization operation; manual review is required.');
 const entry=queue[0];
 if(!entry||typeof entry.id!=='string'||!entry.id||
   !Number.isFinite(entry.createdAt)||!entry.snapshot||!equivalent(entry.snapshot,local))
  return deny('The queued operation differs from the empty local workspace.');
 if(!meta||meta.revision!==null||meta.dirty!==true)
  return deny('Local journal has an unexpected synchronization baseline.');
 if(!Number.isSafeInteger(remote?.revision)||remote.revision<1)
  return deny('No trusted nonempty server revision is available.');
 if(!Object.values(remoteCounts).some(v=>v>0))
  return deny('The server workspace has no records to restore.');
 return {ok:true,revision:remote.revision,queueId:entry.id,counts:remoteCounts,
   summary:'Empty-device initialization is identical to the sole queued snapshot; server data can be adopted locally after separate backups and explicit confirmation.'};
}
root.LifeOSFreshDeviceAdoptionV234={inspect,describe,equivalent,collections};
})(typeof window!=='undefined'?window:globalThis);
