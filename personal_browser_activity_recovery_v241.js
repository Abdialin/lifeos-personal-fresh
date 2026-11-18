/* V241 read-only planning for Samsung Browser -> Android historical sessions/events.
   Never infer, backdate or fabricate any activity timestamps. */
(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const canon=v=>{
 if(Array.isArray(v))return v.map(canon);
 if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])]));
 return v;
};
const same=(a,b)=>JSON.stringify(canon(a))===JSON.stringify(canon(b));
const kinds=['sessions','events'];
function validRows(workspace){
 if(!workspace||workspace.version!==1||typeof workspace!=='object'||Array.isArray(workspace))throw Error('Not a LifeOS workspace.');
 for(const kind of kinds){
  if(!Array.isArray(workspace[kind]))throw Error(kind+' collection missing.');
  const ids=new Set();
  for(const row of workspace[kind]){
   if(!row||typeof row!=='object'||typeof row.id!=='string'||!row.id||ids.has(row.id))
    throw Error(kind+' contains an invalid or duplicate record ID. Review the source file.');
   ids.add(row.id);
  }
 }
}
function unpack(file){
 if(!file||typeof file!=='object')throw Error('Invalid recovery file.');
 if(file.exportType!=='lifeos-browser-activity-transfer-v241')throw Error('Choose a V241 export from the original Samsung Browser.');
 if(file.version!==1||!file.workspace)throw Error('Unsupported transfer format.');
 validRows(file.workspace);
 if(!Number.isFinite(file.createdAt)||file.createdAt<=0)throw Error('Export timestamp is invalid.');
 return clone(file.workspace);
}
function preview(local,importFile){
 validRows(local);
 const incoming=unpack(importFile),additions={},conflicts={},matches={};
 for(const kind of kinds){
  const byId=new Map(local[kind].map(row=>[row.id,row]));
  additions[kind]=[];conflicts[kind]=[];matches[kind]=0;
  for(const row of incoming[kind]){
   if(!byId.has(row.id))additions[kind].push(clone(row));
   else if(same(byId.get(row.id),row))matches[kind]++;
   else conflicts[kind].push(row.id);
  }
 }
 return {ok:!conflicts.sessions.length&&!conflicts.events.length,
  addedSessions:additions.sessions.length,addedEvents:additions.events.length,
  matchedSessions:matches.sessions,matchedEvents:matches.events,
  conflictSessions:conflicts.sessions.length,conflictEvents:conflicts.events.length,
  additions,source:incoming,
  reason:conflicts.sessions.length||conflicts.events.length?
   'At least one shared record ID differs. Nothing will be automatically overwritten. Export both workspaces for explicit reconciliation.':null};
}
function apply(local,plan){
 validRows(local);
 if(!plan?.ok||!plan.source)throw Error('Plan contains unresolved conflicts.');
 // Recheck all shared IDs: activity may have changed after the preview.
 const fresh=preview(local,{exportType:'lifeos-browser-activity-transfer-v241',version:1,createdAt:Date.now(),workspace:plan.source});
 if(!fresh.ok||fresh.addedSessions!==plan.addedSessions||fresh.addedEvents!==plan.addedEvents)
  throw Error('Local records changed since review. Run comparison again.');
 const next=clone(local);
 for(const kind of kinds)next[kind].push(...fresh.additions[kind]);
 return next;
}
root.LifeOSBrowserActivityRecoveryV241={preview,apply,unpack,validRows,same};
})(typeof window!=='undefined'?window:globalThis);
