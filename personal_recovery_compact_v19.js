/* LifeOS Personal V19 — reversible compact offline journal. No storage writes. */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function equal(a,b){
 if(a===b)return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 if(Array.isArray(a))return a.length===b.length&&a.every((v,i)=>equal(v,b[i]));
 const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.prototype.hasOwnProperty.call(b,k)&&equal(a[k],b[k]));
}
function difference(newer,older){
 if(equal(newer,older))return null;
 const replacement=['r',clone(older)];
 if(Array.isArray(newer)&&Array.isArray(older)){
  const changed={};
  for(let i=0;i<older.length;i++){if(i>=newer.length)changed[i]=['r',clone(older[i])];else{const delta=difference(newer[i],older[i]);if(delta)changed[i]=delta}}
  const patch=['a',older.length,changed];return JSON.stringify(patch).length<JSON.stringify(replacement).length?patch:replacement;
 }
 if(obj(newer)&&obj(older)){
  const changed={},removed=[];
  for(const k of Object.keys(older)){if(!Object.prototype.hasOwnProperty.call(newer,k))changed[k]=['r',clone(older[k])];else{const delta=difference(newer[k],older[k]);if(delta)changed[k]=delta}}
  for(const k of Object.keys(newer))if(!Object.prototype.hasOwnProperty.call(older,k))removed.push(k);
  const patch=['o',changed,removed];return JSON.stringify(patch).length<JSON.stringify(replacement).length?patch:replacement;
 }
 return replacement;
}
function apply(newer,delta){
 if(delta===null)return clone(newer);
 if(!Array.isArray(delta))throw Error('Invalid compact delta');
 if(delta[0]==='r'&&delta.length===2)return clone(delta[1]);
 if(delta[0]==='a'){
  if(!Array.isArray(newer)||!Number.isSafeInteger(delta[1])||delta[1]<0||!obj(delta[2]))throw Error('Invalid array delta');
  const result=clone(newer);result.length=delta[1];
  for(const [k,patch] of Object.entries(delta[2])){const i=Number(k);if(!Number.isSafeInteger(i)||i<0||i>=result.length)throw Error('Invalid array index');result[i]=apply(newer[i],patch)}
  return result;
 }
 if(delta[0]==='o'){
  if(!obj(newer)||!obj(delta[1])||!Array.isArray(delta[2]))throw Error('Invalid object delta');
  const result=clone(newer);
  for(const k of delta[2])delete result[k];
  for(const [k,patch] of Object.entries(delta[1]))result[k]=apply(newer[k],patch);
  return result;
 }
 throw Error('Unknown compact delta');
}
function unpack(record){
 if(!record||record.format!==2||!record.workspace||!Array.isArray(record.journalCompact))throw Error('Invalid compact record');
 let newer=record.workspace;const journal=new Array(record.journalCompact.length);
 for(let i=journal.length-1;i>=0;i--){const item=record.journalCompact[i];newer=apply(newer,item.delta);journal[i]={id:item.id,createdAt:item.createdAt,snapshot:newer}}
 return{workspace:clone(record.workspace),journal,meta:clone(record.meta),committedAt:record.committedAt};
}
function pack(workspace,journal,meta){
 if(!workspace||!Array.isArray(journal))throw Error('Missing workspace or journal');
 const entries=new Array(journal.length);let newer=workspace;
 for(let i=journal.length-1;i>=0;i--){const e=journal[i];if(!e||!e.snapshot||!e.id||!Number.isFinite(e.createdAt))throw Error('Invalid journal entry');entries[i]={id:e.id,createdAt:e.createdAt,delta:difference(newer,e.snapshot)};newer=e.snapshot}
 const record={format:2,workspace:clone(workspace),journalCompact:entries,meta:clone(meta),committedAt:Date.now()};
 const restored=unpack(record);
 if(!equal(workspace,restored.workspace)||restored.journal.length!==journal.length||!restored.journal.every((e,i)=>e.id===journal[i].id&&e.createdAt===journal[i].createdAt&&equal(e.snapshot,journal[i].snapshot)))throw Error('Lossless verification failed');
 return record;
}
root.LifeOSCompactRecovery={pack,unpack,equal};
})(typeof window!=='undefined'?window:globalThis);
