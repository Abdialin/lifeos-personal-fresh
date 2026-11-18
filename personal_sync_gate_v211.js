/* LifeOS V211: fail-closed revision gate for offline queue upload.
   Pure preflight: never writes data, never attempts automatic merges. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else if(root)root.LifeOSSyncGateV211=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function inspect({remoteRevision,activeRevision,acknowledgedRevision,queueLength,blocked}){
 const invalid=x=>!Number.isSafeInteger(x)||x<0;
 if(blocked)return {ok:false,reason:'recovery-blocked'};
 if(invalid(remoteRevision)||invalid(activeRevision)||!Number.isSafeInteger(queueLength)||queueLength<1)return {ok:false,reason:'invalid-sync-state'};
 if(acknowledgedRevision!==null&&invalid(acknowledgedRevision))return {ok:false,reason:'invalid-base-revision'};
 if(acknowledgedRevision!==null&&acknowledgedRevision!==activeRevision)return {ok:false,reason:'unacknowledged-local-revision'};
 if(acknowledgedRevision===null&&remoteRevision>0)return {ok:false,reason:'unknown-base-revision'};
 if(remoteRevision!==activeRevision)return {ok:false,reason:'server-revision-changed'};
 return {ok:true,reason:'revision-matches'};
}
return Object.freeze({inspect});
});
