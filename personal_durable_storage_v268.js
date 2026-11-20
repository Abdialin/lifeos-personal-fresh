/* LifeOS V268 — verified IndexedDB secondary recovery store.
 * Non-authoritative during migration: never replaces the current canonical
 * localStorage checkpoint, never changes server data, never deletes sessions.
 * A future release can switch the authoritative commit to this transaction. */
(function(root){
 'use strict';
 const DB='lifeos-personal-durable-v1',STORE='checkpoints',KEY='canonical';
 const status={available:false,savedAt:null,verified:false,error:null};
 let dbPromise=null,busy=Promise.resolve();
 const ensure=()=>{
  if(!root.indexedDB)return Promise.reject(new Error('IndexedDB unavailable in this Android WebView'));
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
   const request=root.indexedDB.open(DB,1);
   request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
   request.onerror=()=>reject(request.error||new Error('IndexedDB open failed'));
   request.onsuccess=()=>resolve(request.result);
  }).catch(err=>{dbPromise=null;throw err});
  return dbPromise;
 };
 const get=async()=>{
  const db=await ensure();return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(KEY);
   req.onsuccess=()=>resolve(req.result||null);
   req.onerror=()=>reject(req.error||new Error('Recovery lookup failed'));
   tx.onabort=()=>reject(tx.error||new Error('Recovery lookup aborted'));
  });
 };
 const put=async value=>{
  const db=await ensure();return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite');
   tx.oncomplete=()=>resolve(true);
   tx.onabort=()=>reject(tx.error||new Error('Recovery write aborted'));
   tx.onerror=()=>reject(tx.error||new Error('Recovery write failed'));
   tx.objectStore(STORE).put(value,KEY);
  });
 };
 async function copyCheckpoint(raw){
  if(typeof raw!=='string'||!raw.length)throw new Error('Canonical checkpoint missing');
  const record=JSON.parse(raw);
  if(!record||![1,2].includes(record.format)||!record.workspace||!record.meta)throw new Error('Invalid canonical checkpoint');
  const serialized=JSON.stringify(record);
  // Do not overwrite a newer verified backup with an older save.
  const prior=await get();
  if(prior?.raw===raw){status.available=true;status.savedAt=prior.savedAt;status.verified=true;return true}
  const timestamp=Number(record.committedAt)||0;
  // An earlier async callback must not replace a more recent durable shadow.
  if(prior&&Number(prior.committedAt)>timestamp){status.available=true;status.savedAt=prior.savedAt;status.verified=true;return true}
  await put({raw,savedAt:Date.now(),committedAt:timestamp});
  const saved=await get();
  if(saved?.raw!==raw)throw new Error('IndexedDB read-back differs from checkpoint');
  status.available=true;status.savedAt=saved.savedAt;status.verified=true;status.error=null;
  return true;
 }
 function scheduleCheckpoint(raw){
  // Explicitly a secondary recovery copy. Primary save still succeeds/fails
  // based solely on its synchronous canonical checkpoint transaction.
  busy=busy.catch(()=>{}).then(()=>copyCheckpoint(raw)).catch(e=>{status.available=false;status.verified=false;status.error=String(e.message||e);return false});
  return busy;
 }
 function inspect(){return {...status,backend:'IndexedDB',authority:'secondary',database:DB}}
 root.LifeOSDurableV268={scheduleCheckpoint,copyCheckpoint,get,inspect};
 if(root.document){
  const initial=()=>{
   // Only shadow a validated pre-existing checkpoint; do not initialize blank data.
   try{const raw=root.localStorage?.getItem('lifeos-v4-stage21-atomic');if(raw)scheduleCheckpoint(raw)}catch(e){status.error=String(e.message||e)}
  };
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',initial,{once:true});else initial();
 }
})(typeof window!=='undefined'?window:globalThis);
