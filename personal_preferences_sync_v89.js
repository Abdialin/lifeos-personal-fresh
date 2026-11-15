/* LifeOS V89 — explicit single-workspace preference exchange.
 * Uses existing sync token field (never stores or exports token). Cloud data
 * is previewed; local preferences are never overwritten without approval. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSPreferencesSyncV89=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const ENDPOINT='/api/preferences/v89';
const ALLOWED=['durations','workouts','exercisePlans'];
function cloudSubset(local){const out={};for(const k of ALLOWED)if(Object.prototype.hasOwnProperty.call(local||{},k))out[k]=local[k];return out}
function mergeRemote(remote,local,selected){const result={...cloudSubset(remote)};for(const name of selected)if(ALLOWED.includes(name)&&Object.prototype.hasOwnProperty.call(local,name))result[name]=local[name];return result}
function mount(){
 const host=document.getElementById('lo88-preferences');if(!host||document.getElementById('lo89-cloud'))return;
 const section=document.createElement('section');section.id='lo89-cloud';
 section.innerHTML='<h4>Single-workspace cloud preferences · optional</h4><p>This uses your existing LifeOS private workspace and sync token. It is not a multi-user account service. Duration profiles, favorite workout presets and exercise plan templates can be exchanged. Device notification permissions stay on each phone.</p><div><button type="button" class="btn outline" id="lo89-load">Compare cloud preferences</button></div><div id="lo89-preview" hidden></div><p id="lo89-status" role="status"></p><small>For another device: use the existing server sync token, compare cloud settings, review differences, and approve each direction. Cloud conflicts will not be silently overwritten. No activity history is included.</small>';
 host.append(section);
 const el=id=>section.querySelector('#'+id),status=el('lo89-status'),preview=el('lo89-preview');
 const hub=root.LifeOSPreferencesV88;
 let remote=null,revision=null;
 function token(){return document.getElementById('syncToken')?.value?.trim()||''}
 function clear(){remote=null;revision=null;preview.hidden=true;preview.replaceChildren()}
 async function request(method,body){
  const t=token();if(!t)throw Error('Enter your existing LifeOS server sync token in Settings & data first.');
  const response=await fetch(ENDPOINT,{method,headers:{'X-LifeOS-Token':t,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'same-origin'});
  let data={};try{data=await response.json()}catch{}
  if(!response.ok)throw Error(response.status===409?'Another device updated cloud preferences. Compare again.':String(data.error||'Cloud request failed')+' (HTTP '+response.status+')');
  return data;
 }
 async function load(){
  clear();status.textContent='Reading cloud preferences…';
  try{
   const result=await request('GET');
   if(!Number.isSafeInteger(result.revision)||result.revision<0||!result.preferences||typeof result.preferences!=='object')throw Error('Unexpected cloud response.');
   // Run the same strict validation as V88 on the remotely supplied preferences.
   const candidate={format:hub.FORMAT,version:hub.VERSION,scope:'local-preferences-only',preferences:result.preferences};
   if(Object.keys(result.preferences).length){
    const checked=hub.parseImport(JSON.stringify(candidate));
    if(!checked.ok)throw Error('Cloud preferences did not pass local validation: '+checked.reason);
   }
   remote=cloudSubset(result.preferences);revision=result.revision;render();
   status.textContent='Comparison ready. Nothing has changed on this device.';
  }catch(e){clear();status.textContent=String(e.message||e)}
 }
 function render(){
  if(remote===null)return;preview.hidden=false;preview.replaceChildren();
  const local=cloudSubset(hub.snapshot(root.localStorage));
  for(const name of ALLOWED){
   const exists=Object.prototype.hasOwnProperty.call(remote,name);
   const there=exists?remote[name]:null;
   const here=Object.prototype.hasOwnProperty.call(local,name)?local[name]:null;
   const diff=JSON.stringify(here)!==JSON.stringify(there);
   const row=document.createElement('p');row.textContent=(name==='durations'?'Duration profiles':name==='exercisePlans'?'Exercise plan templates':'Workout favorites')+': '+(diff?'different':'matches')+' · cloud '+(exists?'has settings':'empty')+' · this device '+(here===null?'empty':'has settings');preview.append(row);
  }
  const receive=document.createElement('div');receive.innerHTML='<strong>Restore selected cloud groups on this device</strong>';preview.append(receive);
  const send=document.createElement('div');send.innerHTML='<strong>Upload selected local groups to cloud</strong>';preview.append(send);
  function checkboxes(parent,values,prefix){
   for(const name of ALLOWED){
    if(!Object.prototype.hasOwnProperty.call(values,name))continue;
    const label=document.createElement('label');label.style.display='block';
    const box=document.createElement('input');box.type='checkbox';box.value=name;box.dataset.direction=prefix;
    label.append(box,document.createTextNode(' '+(name==='durations'?'Duration profiles':name==='exercisePlans'?'Exercise plan templates':'Workout favorites')));parent.append(label);
   }
  }
  checkboxes(receive,remote,'receive');checkboxes(send,local,'send');
  const down=document.createElement('button');down.type='button';down.textContent='Apply selected cloud settings to this device';receive.append(down);
  down.addEventListener('click',()=>{
   const selected=[...receive.querySelectorAll('input:checked')].map(x=>x.value);
   if(!selected.length)return status.textContent='Select cloud groups to restore.';
   if(!root.confirm('Replace selected local settings with reviewed cloud values? This does not affect activity records.'))return;
   const group=Object.fromEntries(selected.map(n=>[n,remote[n]]));
   const proposed=hub.parseImport(JSON.stringify({format:hub.FORMAT,version:hub.VERSION,scope:'local-preferences-only',preferences:group}));
   const result=hub.applySelected(root.localStorage,proposed,selected);
   status.textContent=result.ok?'Selected preferences restored locally. Reload to refresh existing editors.':result.reason;
   if(result.ok)render();
  });
  const up=document.createElement('button');up.type='button';up.textContent='Upload selected settings to cloud';send.append(up);
  up.addEventListener('click',async()=>{
   const selected=[...send.querySelectorAll('input:checked')].map(x=>x.value);
   if(!selected.length)return status.textContent='Select local groups to upload.';
   if(!root.confirm('Upload selected local preferences to this private cloud workspace? Other cloud preference groups remain unchanged.'))return;
   const updated=mergeRemote(remote,cloudSubset(hub.snapshot(root.localStorage)),selected);
   try{const result=await request('PUT',{revision,preferences:updated});revision=result.revision;remote=updated;render();status.textContent='Cloud preferences saved at revision '+revision+'.'}catch(e){clear();status.textContent=String(e.message||e)+' No local records were changed.'}
  });
 }
 el('lo89-load').addEventListener('click',load);
 const tok=document.getElementById('syncToken');tok?.addEventListener('input',()=>{clear();status.textContent='Sync token changed. Compare again before transferring preferences.'});
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {ENDPOINT,ALLOWED,cloudSubset,mergeRemote};
});