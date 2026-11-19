/* V244: fail-closed plan for adopting a newer server revision while old
 * local journals are pending. It never writes records or calls the network.
 * Local history can be fast-forwarded ONLY if every local record still exists
 * identically in the server copy and all non-collection metadata matches. */
(function(root){
'use strict';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?
 Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const summaryRows=(local,remote)=>{
 const fields=new Set([...Object.keys(local),...Object.keys(remote)]);
 const collections={};const otherDifferences=[];
 let localOnlyTotal=0,serverOnlyTotal=0,conflictTotal=0;
 for(const key of [...fields].sort()){
  const a=local[key],b=remote[key];
  if(Array.isArray(a)||Array.isArray(b)){
   if(!Array.isArray(a)||!Array.isArray(b)){otherDifferences.push(key+' has incompatible collection types');continue;}
   const scan=(rows,label)=>{
    const ids=new Map();
    for(const item of rows){
     if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.id!=='string'||!item.id||ids.has(item.id))
      throw Error(key+' has invalid or duplicate IDs in '+label+'.');
     ids.set(item.id,item);
    }
    return ids;
   };
   const la=scan(a,'local'),rb=scan(b,'server');let localOnly=0,serverOnly=0,conflicts=0;
   for(const [id,item] of la){
    if(!rb.has(id))localOnly++;
    else if(!equal(item,rb.get(id)))conflicts++;
   }
   for(const id of rb.keys())if(!la.has(id))serverOnly++;
   collections[key]={local:a.length,server:b.length,localOnly,serverOnly,conflicts};
   localOnlyTotal+=localOnly;serverOnlyTotal+=serverOnly;conflictTotal+=conflicts;
  }else if(!equal(a,b))otherDifferences.push(key);
 }
 return {collections,otherDifferences,localOnlyTotal,serverOnlyTotal,conflictTotal};
};
function inspect({local,remote,queue,meta,remoteRevision,blocked=false}={}){
 const reject=reason=>({ok:false,reason});
 if(blocked)return reject('Local recovery checkpoint or journal is blocked.');
 if(!local||!remote||local.version!==1||remote.version!==1||
  Array.isArray(local)||Array.isArray(remote))return reject('Workspace schema invalid.');
 if(!Number.isSafeInteger(remoteRevision)||remoteRevision<1)return reject('Untrusted server revision.');
 if(!Array.isArray(queue)||queue.some(q=>!q||!q.snapshot||q.snapshot.version!==1||
  typeof q.id!=='string'||!q.id))return reject('The pending operation journal is invalid.');
 if(!meta||!(meta.revision===null||Number.isSafeInteger(meta.revision)))
  return reject('Missing trusted local sync metadata.');
 let diff;
 try{diff=summaryRows(local,remote)}catch(e){return reject(e.message)}
 const fastForwardSafe=diff.localOnlyTotal===0&&diff.conflictTotal===0&&diff.otherDifferences.length===0;
 return {...diff,ok:true,fastForwardSafe,remoteRevision,queued:queue.length,
  acknowledgedRevision:meta.revision,
  reason:fastForwardSafe?
   'All local records are already present identically on server. A backup-first local fast-forward can safely adopt server history while archiving the pending queue.':
   'Local-only records, changed shared records or other field differences require separate reconciliation. The queue must not be cleared.'};
}
root.LifeOSPendingQueueRecoveryV244={inspect,equal};
})(typeof window!=='undefined'?window:globalThis);
