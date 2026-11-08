/* LifeOS Personal — offline integrity preflight (read-only). */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LifeOSOfflineIntegrity=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function inspect(workspace,entries,metadata){
 const issues=[];const warnings=[];
 if(!workspace||workspace.version!==1||!Array.isArray(workspace.sessions))issues.push('invalid-workspace');
 if(!Array.isArray(entries))issues.push('invalid-journal');
 else{
  const ids=new Set();let previous=-Infinity;
  for(const e of entries){
   if(!e||typeof e.id!=='string'||!e.id||!Number.isSafeInteger(e.createdAt)||e.createdAt<0||!e.snapshot||e.snapshot.version!==1){issues.push('invalid-journal-entry');continue;}
   if(ids.has(e.id))issues.push('duplicate-operation-id');ids.add(e.id);
   if(e.createdAt<previous)warnings.push('nonchronological-entries');previous=e.createdAt;
  }
  if(entries.length&&workspace&&entries[entries.length-1]&&entries[entries.length-1].snapshot){
   if(JSON.stringify(canonical(entries[entries.length-1].snapshot))!==JSON.stringify(canonical(workspace)))warnings.push('latest-snapshot-differs-from-workspace');
  }
 }
 if(!metadata||typeof metadata!=='object')issues.push('invalid-sync-metadata');
 else{
  if(metadata.revision!==null&&(!Number.isSafeInteger(metadata.revision)||metadata.revision<0))issues.push('invalid-revision');
  if(typeof metadata.dirty!=='boolean')issues.push('invalid-dirty-flag');
  if(Array.isArray(entries)&&entries.length&&!metadata.dirty)warnings.push('pending-journal-marked-clean');
  if(Array.isArray(entries)&&!entries.length&&metadata.dirty)warnings.push('dirty-without-journal');
 }
 return {safeToAutoSync:issues.length===0&&warnings.length===0,requiresReview:issues.length>0||warnings.length>0,issues:[...new Set(issues)],warnings:[...new Set(warnings)],pending:Array.isArray(entries)?entries.length:null,changed:false};
}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v;}
return {inspect};
});
