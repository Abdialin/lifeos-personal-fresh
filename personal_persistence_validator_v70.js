/* LifeOS V70: strict, read-only comparison between active and canonical saved records.
   No writes, no uploads, no record names or sensitive content in results. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSPersistenceValidatorV70=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function normalized(value){
 if(Array.isArray(value))return value.map(normalized);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalized(value[k])]));
 return value;
}
function same(a,b){return JSON.stringify(normalized(a))===JSON.stringify(normalized(b))}
function compareRecords(active,saved){
 const live=active&&typeof active==='object'?active:null,stored=saved&&typeof saved==='object'?saved:null;
 if(!live||!stored)return {ok:false,issues:['A complete active workspace or checkpoint is unavailable.']};
 const issues=[],counts={};
 for(const key of ['sessions','schedule','events']){
  const left=live[key],right=stored[key];
  if(!Array.isArray(left)||!Array.isArray(right)){issues.push('Missing or invalid '+key+' array.');continue;}
  counts[key]={active:left.length,saved:right.length};
  const ids=x=>new Map(x.filter(r=>r&&typeof r.id==='string').map(r=>[r.id,r]));
  const lmap=ids(left),rmap=ids(right);
  if(lmap.size!==left.length||rmap.size!==right.length)issues.push('Invalid or duplicate '+key+' identifiers.');
  for(const [id,record] of lmap){if(!rmap.has(id))issues.push('Unsaved active '+key+' record.');else if(!same(record,rmap.get(id)))issues.push('Changed '+key+' record not reflected in checkpoint.');}
  for(const id of rmap.keys())if(!lmap.has(id))issues.push('Saved '+key+' record missing from active workspace.');
 }
 return {ok:issues.length===0,issues:[...new Set(issues)].slice(0,10),counts};
}
function verify(raw,active,unpack){
 if(typeof raw!=='string'||!raw.trim())return {ok:false,issues:['Canonical recovery checkpoint is missing.']};
 try{
  const encoded=JSON.parse(raw);
  if(!encoded||![1,2].includes(encoded.format))return {ok:false,issues:['Unsupported checkpoint format.']};
  if(encoded.format===2&&typeof unpack!=='function')return {ok:false,issues:['Compact checkpoint decoder is unavailable.']};
  const record=encoded.format===2?unpack(encoded):encoded;
  const report=compareRecords(active,record?.workspace);
  return {...report,format:encoded.format};
 }catch(e){return {ok:false,issues:['Canonical recovery checkpoint could not be decoded.']}}
}
return {verify,compareRecords,same};
});
