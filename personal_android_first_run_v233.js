/* V233: read-only Android first-run diagnostics; never loads/uploads/changes user records. */
(function(root){
'use strict';
function inspect(workspace){
 const keys=['sessions','todos','schedule','goals','workouts','meals','personalLogs','habitChecks','bodyMetrics','waterIntake'];
 if(!workspace||typeof workspace!=='object')return {known:false,count:0};
 let count=0,known=false;
 for(const k of keys){if(Array.isArray(workspace[k])){count+=workspace[k].length;known=true}}
 return {known,count};
}
function init(){
 if(!root.LifeOSNative||typeof root.LifeOSNative.postMessage!=='function')return;
 document.documentElement.classList.add('lo240-native');
 if(document.getElementById('lo233-first-run'))return;
 let data;try{data=root.lifeosReadOnlyWorkspace?.()}catch(_){}
 const state=inspect(data);
 if(!state.known||state.count>0)return;
 const parent=document.querySelector('main.wrap');
 const head=parent?.querySelector('header.top');
 if(!parent||!head)return;
 const box=document.createElement('aside');
 box.id='lo233-first-run';box.setAttribute('role','status');
 box.innerHTML='<strong>New Android installation: no local records detected</strong>'+
 '<p>LifeOS Android has its own local storage. Signing in to the website does not automatically import the activity records saved in Samsung Browser or on your cloud server. Your older records may still exist.</p>'+
 '<p><b>Before tracking or importing:</b> open Settings & data → Cloud sync, check the connection, and compare existing records. Do <b>not</b> use “Upload local data” from an empty installation. Do not clear Samsung Browser data.</p>'+
 '<button type="button" id="lo233-settings">Open server history recovery</button>';
 head.insertAdjacentElement('afterend',box);
 document.getElementById('lo233-settings').addEventListener('click',()=>{
  const settings=[...document.querySelectorAll('button')].find(b=>
    /settings\s*&\s*data/i.test((b.textContent||'').trim()));
  if(settings)settings.click();
  else{
   const nav=document.querySelector('#lifeosNavigation button[data-view="settings"]');
   if(nav)nav.click();
   else box.querySelector('p:last-of-type').textContent='Open Settings & data → Cloud sync manually. Do not upload an empty workspace.';
  }
  setTimeout(()=>{
    const recovery=document.getElementById('lo234-adopt');
    const cloud=document.getElementById('cloudSyncPanel');
    const target=recovery||cloud;
    if(target){target.scrollIntoView({behavior:'smooth',block:'start'});target.style.scrollMarginTop='24px'}
  },200);
 });
}
if(root.document){
 const start=()=>{setTimeout(init,1100);setTimeout(init,3000)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
}
root.LifeOSAndroidFirstRunV233={inspect,init};
})(typeof window!=='undefined'?window:globalThis);
