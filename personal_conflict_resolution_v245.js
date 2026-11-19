/* V245: plan explicit per-record server-wins reconciliation.
 * No IO. No automatic merge. No silent changes to queued snapshots. */
(function(root){
 'use strict';
 const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
 const equal=(a,b)=>JSON.stringify(canon(a))===JSON.stringify(canon(b));
 function examine(local,server,queue){
  if(!local||!server||local.version!==1||server.version!==1||!Array.isArray(queue))throw Error('Invalid recovery workspace');
  const changes=new Map(),unmatched=[],other=[];
  const snapshots=[{label:'Current Android',workspace:local},...queue.map((q,i)=>({label:'Pending operation '+(i+1),workspace:q?.snapshot}))];
  for(const source of snapshots){
   if(!source.workspace||source.workspace.version!==1)throw Error(source.label+' is invalid');
   const fields=new Set([...Object.keys(source.workspace),...Object.keys(server)]);
   for(const key of fields){
    const before=source.workspace[key],after=server[key];
    if(Array.isArray(before)||Array.isArray(after)){
     if(!Array.isArray(before)||!Array.isArray(after)){other.push(source.label+': '+key+' collection shape changed');continue}
     const map=new Map();
     for(const row of after){
      if(!row||typeof row.id!=='string'||!row.id||map.has(row.id))throw Error('Invalid or duplicate server IDs in '+key);
      map.set(row.id,row);
     }
     const seen=new Set();
     for(const row of before){
      if(!row||typeof row.id!=='string'||!row.id||seen.has(row.id))throw Error('Invalid or duplicate local IDs in '+key);
      seen.add(row.id);
      if(!map.has(row.id)){unmatched.push({group:key,id:row.id,origin:source.label});continue}
      const target=map.get(row.id);
      if(equal(row,target))continue;
      const id=key+'\u0000'+row.id;
      let entry=changes.get(id);
      if(!entry){
       entry={key,id:row.id,sourceNames:[],changedFields:[],displayName:String(target.name||target.title||row.name||row.title||key).slice(0,90)};
       changes.set(id,entry);
      }
      entry.sourceNames.push(source.label);
      const fields=new Set([...Object.keys(row),...Object.keys(target)]);
      for(const field of fields)if(!equal(row[field],target[field])&&!entry.changedFields.includes(field))entry.changedFields.push(field);
     }
    }else if(!equal(before,after))other.push(source.label+': '+key+' differs');
   }
  }
  const records=[...changes.values()].sort((a,b)=>a.key.localeCompare(b.key)||a.id.localeCompare(b.id));
  const eligible=unmatched.length===0&&other.length===0&&records.length>0;
  return {eligible,records,unmatched,other,reason:eligible?
   'All local and queued IDs exist on the server, but some versions differ. Review each item before choosing to retain the server version.':
   'Local-only records, incompatible fields or no conflicts were found; do not discard pending edits.'};
 }
 root.LifeOSConflictResolutionV245={examine};
})(typeof window!=='undefined'?window:globalThis);