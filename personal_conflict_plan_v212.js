/* LifeOS V212 — bilateral reconciliation plan, read-only.
 * No auto-merge, no writes, no uploads; identifiers and record content
 * are not displayed in the high-level report. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else if(root)root.LifeOSConflictPlanV212=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const GROUPS=Object.freeze(['sessions','events','schedule','todos','workouts','meals','goals','personalLogs','bodyMetrics','waterIntake','mealTemplates','habitDefinitions','habitChecks','friendShares','idealRoutines']);
const normalize=v=>Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;
const same=(a,b)=>JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
function mapOf(rows){
 const m=new Map();let invalid=0;
 for(const row of rows){
  if(!row||typeof row!=='object'||row.id===null||row.id===undefined||String(row.id).trim()===''){invalid++;continue}
  const id=String(row.id);if(m.has(id)){invalid++;continue}m.set(id,row);
 }
 return {map:m,invalid};
}
function inspect(local,server,revision=null,baseRevision=null){
 if(!local||!server||typeof local!=='object'||typeof server!=='object'||Array.isArray(local)||Array.isArray(server))return {safe:false,reason:'unavailable-workspace',groups:[],summary:null};
 const groups=[],otherKeys=new Set([...Object.keys(local),...Object.keys(server)].filter(k=>!GROUPS.includes(k)));
 let localOnly=0,serverOnly=0,modified=0,invalid=0,missing=0,mutual=0;
 for(const name of GROUPS){
  const l=local[name],r=server[name];
  if(!Array.isArray(l)||!Array.isArray(r)){missing++;groups.push({name,localOnly:0,serverOnly:0,modified:0,mutual:0,invalid:0,missing:true});continue}
  const x=mapOf(l),y=mapOf(r);let onlyLocal=0,onlyServer=0,conflicting=0,shared=0;
  for(const [id,item] of x.map){if(!y.map.has(id))onlyLocal++;else if(!same(item,y.map.get(id)))conflicting++;else shared++}
  for(const id of y.map.keys())if(!x.map.has(id))onlyServer++;
  const issues=x.invalid+y.invalid;
  localOnly+=onlyLocal;serverOnly+=onlyServer;modified+=conflicting;mutual+=shared;invalid+=issues;
  groups.push({name,localOnly:onlyLocal,serverOnly:onlyServer,modified:conflicting,mutual:shared,invalid:issues,missing:false});
 }
 const metadataChanged=[...otherKeys].filter(k=>!same(local[k],server[k]));
 const revisionsKnown=Number.isSafeInteger(revision)&&revision>=0&&Number.isSafeInteger(baseRevision)&&baseRevision>=0;
 const revisionConflict=revisionsKnown&&revision!==baseRevision;
 const noDifferences=!localOnly&&!serverOnly&&!modified&&!invalid&&!missing&&!metadataChanged.length&&same(local.version,server.version);
 return {safe:false,reason:!revisionsKnown?'untrusted-revision':revisionConflict?'server-revision-changed':invalid||missing?'invalid-or-missing-records':modified?'conflicting-records':metadataChanged.length||!same(local.version,server.version)?'workspace-metadata-differs':noDifferences?'identical':'review-required',
  revisionsKnown,revisionConflict,revision,baseRevision,groups,summary:{localOnly,serverOnly,modified,invalid,missing,mutual,metadataChanged:metadataChanged.length,same:noDifferences}};
}
function explain(plan){
 if(!plan.summary)return 'No comparable server workspace is available.';
 const s=plan.summary;
 if(s.same)return 'The reviewed workspace copies match. Recheck the revision and offline queue before claiming that all devices are synchronized.';
 if(s.invalid||s.missing)return 'Record identifiers or categories need repair before reconciliation. No changes have been applied.';
 if(s.modified)return 'The same record has different content on different devices. A newer timestamp alone does not establish which record is correct.';
 if(s.localOnly&&s.serverOnly)return 'Both devices contain independent records. Review references, offline changes and settings before combining either copy.';
 return 'Review the differences before selecting any copy action. Neither workspace has been modified.';
}
return Object.freeze({inspect,explain,GROUPS,same});
});
