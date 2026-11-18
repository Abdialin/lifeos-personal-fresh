/* LifeOS V210 — strict read-only whole-workspace cloud parity.
   Privacy: no activity titles, record IDs, or tokens in generated reports.
   No merges, sync actions, storage mutations or network requests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else if(root)root.LifeOSCloudParityV210=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ARRAYS=Object.freeze(['sessions','events','schedule','todos','workouts','meals','goals','personalLogs','bodyMetrics','waterIntake','mealTemplates','habitDefinitions','habitChecks','friendShares']);
const OBJECTS=Object.freeze(['nutritionSettings']);
const normalize=x=>{
 if(Array.isArray(x))return x.map(normalize);
 if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalize(x[k])]));
 return x;
};
const same=(a,b)=>JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
function compare(local,server){
 if(!local||!server||typeof local!=='object'||typeof server!=='object'||Array.isArray(local)||Array.isArray(server))
  return {same:false,complete:false,differences:[{section:'workspace',problem:'unavailable'}],sections:[]};
 const sections=[],differences=[];
 for(const name of ARRAYS){
  const l=local[name],r=server[name];
  if(!Array.isArray(l)||!Array.isArray(r)){
   const entry={name,same:false,missing:true,localCount:Array.isArray(l)?l.length:null,serverCount:Array.isArray(r)?r.length:null,changed:0,localOnly:0,serverOnly:0,invalid:0};
   sections.push(entry);differences.push({section:name,problem:'missing-array'});continue;
  }
  const ids=rows=>{
   const map=new Map();let invalid=0;
   for(const row of rows){
    if(!row||typeof row!=='object'||row.id===null||row.id===undefined||String(row.id).trim()===''){invalid++;continue}
    const id=String(row.id);if(map.has(id)){invalid++;continue}map.set(id,row);
   }
   return {map,invalid};
  };
  const a=ids(l),b=ids(r);let changed=0,localOnly=0,serverOnly=0;
  for(const [id,item] of a.map){
   if(!b.map.has(id))localOnly++;
   else if(!same(item,b.map.get(id)))changed++;
  }
  for(const id of b.map.keys())if(!a.map.has(id))serverOnly++;
  const invalid=a.invalid+b.invalid,ok=!invalid&&!changed&&!localOnly&&!serverOnly;
  sections.push({name,same:ok,missing:false,localCount:l.length,serverCount:r.length,changed,localOnly,serverOnly,invalid});
  if(!ok)differences.push({section:name,problem:'records-differ',changed,localOnly,serverOnly,invalid});
 }
 for(const name of OBJECTS){
  const l=local[name],r=server[name],ok=l&&r&&typeof l==='object'&&typeof r==='object'&&!Array.isArray(l)&&!Array.isArray(r)&&same(l,r);
  sections.push({name,same:Boolean(ok),missing:!l||!r,kind:'settings'});
  if(!ok)differences.push({section:name,problem:'settings-differ'});
 }
 // Other top-level workspace metadata is not automatically considered proven
 // identical merely because the known record categories match.
 const known=new Set([...ARRAYS,...OBJECTS,'version']);
 const extraKeys=new Set([...Object.keys(local),...Object.keys(server)].filter(x=>!known.has(x)));
 for(const key of extraKeys){
  if(!same(local[key],server[key]))differences.push({section:'additional-workspace-fields',problem:'metadata-differ'});
 }
 if(!same(local.version,server.version))differences.push({section:'version',problem:'schema-differ'});
 return {same:differences.length===0,complete:true,differences,sections};
}
return Object.freeze({compare,ARRAYS,OBJECTS,same});
});
