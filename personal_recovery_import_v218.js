/* LifeOS V218: read-only recovery backup format inspection.
   Does not save, merge, import journals or send any data to the network. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else if(root)root.LifeOSRecoveryImportV218=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function inspect(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))return {ok:false,reason:'File must be a JSON object.'};
 const bundle=payload.format==='lifeos-recovery-v1';
 if(payload.format!==undefined&&!bundle&&payload.version!==1)return {ok:false,reason:'Unsupported backup format.'};
 const workspace=bundle?payload.workspace:payload;
 if(!workspace||typeof workspace!=='object'||Array.isArray(workspace)||workspace.version!==1||!Array.isArray(workspace.sessions)||!Array.isArray(workspace.events))
  return {ok:false,reason:'No supported LifeOS workspace was found.'};
 if(bundle){
  if(payload.atomicCheckpointIssue)return {ok:false,reason:'Recovery checkpoint was reported invalid; review the original export.'};
  if(payload.atomicCheckpoint){
   const checkpoint=payload.atomicCheckpoint;
   if(![1,2].includes(checkpoint.format)||!checkpoint.workspace||!checkpoint.meta)return {ok:false,reason:'Invalid canonical checkpoint in recovery bundle.'};
  }
 }
 let journalEntries=0;
 if(bundle){
  const c=payload.atomicCheckpoint;
  if(Array.isArray(c?.journal))journalEntries=c.journal.length;
  else if(Array.isArray(c?.journalCompact))journalEntries=c.journalCompact.length;
  else if(typeof payload.offlineJournalRaw==='string'){
   try{const parsed=JSON.parse(payload.offlineJournalRaw);if(Array.isArray(parsed))journalEntries=parsed.length}catch(_){}
  }
 }
 return {ok:true,workspace,isBundle:bundle,journalEntries,
  message:bundle?
   'Recovery bundle detected. Restore imports the workspace only. Offline operation history is retained in the downloaded file but NOT replayed automatically. Cloud sync stays disconnected and the restored workspace is marked unsynchronized.':
   'Workspace JSON detected. Restore replaces local workspace only and disconnects cloud sync.'};
}
return Object.freeze({inspect});
});
