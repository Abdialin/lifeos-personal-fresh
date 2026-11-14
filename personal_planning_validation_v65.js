/* LifeOS Personal V65 — canonical plan checkpoint verification and consistency. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSPlanningValidationV65=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
function verify(raw,planId,startAt,endAt,unpack){
 let checkpoint;
 try{
  checkpoint=typeof raw==='string'?JSON.parse(raw):raw;
  if(!checkpoint||![1,2].includes(checkpoint.format))return {ok:false,reason:'Unsupported recovery format'};
  if(checkpoint.format===2){
   if(typeof unpack!=='function')return {ok:false,reason:'Compact recovery decoder unavailable'};
   checkpoint=unpack(checkpoint);
  }
  const plans=checkpoint?.workspace?.schedule;
  if(!Array.isArray(plans))return {ok:false,reason:'Recovery schedule unavailable'};
  const saved=plans.find(p=>p&&String(p.id)===String(planId));
  if(!saved)return {ok:false,reason:'Updated plan missing from canonical recovery checkpoint'};
  return saved.startAt===startAt&&saved.endAt===endAt?{ok:true,reason:'Saved plan matches canonical recovery checkpoint'}:{ok:false,reason:'Recovery checkpoint contains a different plan time'};
 }catch(err){return {ok:false,reason:'Recovery verification failed: '+String(err?.message||err)};}
}
function comparePlanVersions(before,after,id){
 const a=(before?.schedule||[]).find(p=>String(p.id)===String(id));
 const b=(after?.schedule||[]).find(p=>String(p.id)===String(id));
 if(!a||!b)return {ok:false,reason:'Plan not available in both snapshots'};
 const unaffected=(before.sessions||[]).length===(after.sessions||[]).length&&JSON.stringify(before.sessions||[])===JSON.stringify(after.sessions||[])&&JSON.stringify(before.events||[])===JSON.stringify(after.events||[]);
 const others=JSON.stringify((before.schedule||[]).filter(p=>String(p.id)!==String(id)))===JSON.stringify((after.schedule||[]).filter(p=>String(p.id)!==String(id)));
 const metadata=Object.keys(a).filter(k=>!['startAt','endAt'].includes(k)).every(k=>JSON.stringify(a[k])===JSON.stringify(b[k]));
 const duration=b.endAt-b.startAt===a.endAt-a.startAt;
 return {ok:unaffected&&others&&metadata&&duration,unaffectedSessions:unaffected,unaffectedPlans:others,metadataPreserved:metadata,durationPreserved:duration};
}
const api={verify,comparePlanVersions};
return api;
});
