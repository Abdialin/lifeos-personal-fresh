/* LifeOS V213 — guarded selective reconciliation and linked-evidence validation.
 * Pure functions, no automatic merges, deletes or storage writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else if(root)root.LifeOSReconcileGuardV213=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const RELATIONS=Object.freeze([
 {type:'workouts',field:'sessionId',target:'sessions'},
 {type:'meals',field:'sessionId',target:'sessions'},
 {type:'schedule',field:'sessionId',target:'sessions'},
 {type:'habitChecks',field:'evidenceSourceId',target:'sessions',filter:r=>r.evidenceType==='session'}
]);
const id=v=>v===undefined||v===null||String(v).trim()===''?null:String(v);
function dangling(workspace){
 const w=workspace||{},out=[];
 for(const link of RELATIONS){
  const targets=new Set((Array.isArray(w[link.target])?w[link.target]:[]).map(r=>id(r?.id)).filter(Boolean));
  for(const row of Array.isArray(w[link.type])?w[link.type]:[]){
   if(link.filter&&!link.filter(row))continue;
   const target=id(row?.[link.field]);if(!target||targets.has(target))continue;
   out.push({type:link.type,row:id(row?.id),targetType:link.target,target});
  }
 }
 return out;
}
function introduced(before,after){
 const prior=new Set(dangling(before).map(x=>[x.type,x.row,x.targetType,x.target].join('::')));
 return dangling(after).filter(x=>!prior.has([x.type,x.row,x.targetType,x.target].join('::')));
}
function preview(local,server,selections){
 if(!local||!server||!Array.isArray(selections))return {ok:false,reason:'invalid-input',missing:[],introduced:[]};
 const allowed=new Set(['sessions','events','todos','workouts','meals','goals','schedule','personalLogs']);
 const next=JSON.parse(JSON.stringify(local)),missing=[],selected=new Set();
 for(const chosen of selections){
  const type=chosen?.kind,key=id(chosen?.id),token=String(type)+'::'+key;
  if(!allowed.has(type)||!key||selected.has(token)){missing.push({kind:String(type||''),reason:'invalid-or-duplicate-selection'});continue}
  selected.add(token);
  const row=(Array.isArray(server[type])?server[type]:[]).find(x=>id(x?.id)===key);
  if(!row){missing.push({kind:type,reason:'selected-server-record-missing'});continue}
  if(!Array.isArray(next[type]))next[type]=[];
  const at=next[type].findIndex(x=>id(x?.id)===key);
  if(at<0)next[type].push(JSON.parse(JSON.stringify(row)));
  else next[type][at]=JSON.parse(JSON.stringify(row));
 }
 const problems=introduced(local,next);
 return {ok:!missing.length&&!problems.length,reason:missing.length?'invalid-selection':problems.length?'new-dangling-reference':'safe-for-manual-review',missing,introduced:problems,next};
}
return Object.freeze({preview,dangling,introduced,RELATIONS});
});
