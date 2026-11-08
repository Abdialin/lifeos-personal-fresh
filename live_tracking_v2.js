/* LifeOS Live Tracking 2.0: pure state transitions; no storage or network side effects. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.LifeOSLiveTrackingV2=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const validId=id=>typeof id==='string'&&id.length>0;
 function switchActivity(workspace,fromId,name,t,id){
  if(!workspace||!Array.isArray(workspace.sessions)||!Array.isArray(workspace.events)||!validId(id)||!name||!name.trim()||!Number.isFinite(t))throw Error('Invalid switch');
  const old=workspace.sessions.find(s=>s.id===fromId);
  if(!old||old.status==='finished')throw Error('Source activity is not open');
  if(workspace.sessions.some(s=>s.id===id))throw Error('Duplicate session ID');
  if(t<old.startAt)throw Error('Switch timestamp precedes session');
  const last=old.segments[old.segments.length-1];
  if(old.status==='running'){
   if(!last||last.end!==null||t<last.start)throw Error('Invalid running segment');
   last.end=t;
  }
  old.status='finished';old.endAt=t;
  const next={id,name:name.trim(),status:'running',createdAt:t,startAt:t,endAt:null,segments:[{start:t,end:null}],notes:'',precision:'measured',source:'local-web-app',plannedId:null,switchedFrom:old.id};
  workspace.sessions.push(next);
  workspace.events.push({id:id+'-switch-out',sessionId:old.id,type:'SWITCH_OUT',time:t,toSessionId:id});
  workspace.events.push({id:id+'-switch-in',sessionId:id,type:'SWITCH_IN',time:t,fromSessionId:old.id});
  return next;
 }
 function summarizeOpen(workspace){return (workspace.sessions||[]).filter(s=>s.status!=='finished').map(s=>({id:s.id,name:s.name,status:s.status,startedAt:s.startAt}));}
 function sessionQuality(session){const issues=[];if(!session||!Array.isArray(session.segments)||!session.segments.length)return ['missing-segments'];let prev=-Infinity;for(const seg of session.segments){if(!Number.isFinite(seg.start)||seg.start<prev||!(seg.end===null||Number.isFinite(seg.end))||(seg.end!==null&&seg.end<seg.start))issues.push('invalid-segment');if(seg.end!==null)prev=seg.end;}if(session.status==='finished'&&session.segments.some(seg=>seg.end===null))issues.push('unfinished-segment');return [...new Set(issues)];}
 return {switchActivity,summarizeOpen,sessionQuality};
});
