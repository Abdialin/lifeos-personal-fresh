/* V234: user-requested, user-chosen Android JSON export via SAF.
   No automatic file writes and no network requests. */
(function(root){
'use strict';
const pending=new Map();
function id(){return 'b'+Date.now().toString(36)+Math.random().toString(36).slice(2,10)}
function ack(requestId,ok){
 const key=String(requestId||'');const entry=pending.get(key);if(!entry)return false;
 clearTimeout(entry.timer);pending.delete(key);
 if(ok===true)entry.resolve(true);
 else entry.reject(new Error('Android backup save failed or was cancelled. Restore remains disabled.'));
 return true;
}
function save(filename,contents){
 if(!root.LifeOSNative||typeof root.LifeOSNative.postMessage!=='function')
  return Promise.reject(new Error('Native file export is not available in this browser.'));
 if(!/^LifeOS_v234_(android_local_before_adoption|server_revision_[0-9]+)\.json$/.test(filename))
  return Promise.reject(new Error('Invalid backup filename.'));
 if(typeof contents!=='string'||contents.length>10_000_000)
  return Promise.reject(new Error('Backup exceeds the 10 MB Android export limit.'));
 const requestId=id();
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('Android backup save timed out.'))},180000);
  pending.set(requestId,{timer,resolve,reject});
  try{root.LifeOSNative.postMessage(JSON.stringify({kind:'backup-export',requestId,filename,contents}))}
  catch(e){clearTimeout(timer);pending.delete(requestId);reject(e)}
 });
}
root.LifeOSV234BackupBridge={ack,save};
})(typeof window!=='undefined'?window:globalThis);
