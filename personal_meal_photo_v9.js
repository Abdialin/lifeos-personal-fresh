/* LifeOS Personal optional meal photography. All image bytes remain in device IndexedDB.
 * No upload, no nutrition inference, no changes to activity timers.
 */
(function(){'use strict';
const $=id=>document.getElementById(id),DB='lifeos-meal-photos-v1',STORE='photos';
let pickedId=null;
function database(){return new Promise((ok,fail)=>{if(!window.indexedDB){fail(Error('IndexedDB unavailable'));return}
 const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
 r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error||Error('Photo storage failed'))})}
async function write(id,file){
 if(!file||!file.type.startsWith('image/'))throw Error('Please choose an image file');
 if(file.size>8*1024*1024)throw Error('Photo too large: maximum 8 MB');
 const db=await database();try{await new Promise((ok,fail)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(file,id);tx.oncomplete=ok;tx.onerror=()=>fail(tx.error||Error('Photo save error'));tx.onabort=()=>fail(tx.error||Error('Photo storage aborted'))})}finally{db.close()}
}
async function read(id){const db=await database();try{return await new Promise((ok,fail)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).get(id);req.onsuccess=()=>ok(req.result||null);req.onerror=()=>fail(req.error)})}finally{db.close()}}
function eligible(s){return /eating|meal|breakfast|lunch|dinner|snack|food/i.test(s.name)}
function message(value){const box=$('loMealCameraStatus');if(box)box.textContent=value}
async function preview(id){
 const box=$('loMealPhotoPreview');if(!box)return;box.replaceChildren();
 try{const file=await read(id);if(!file){box.textContent='No meal photo saved yet.';return}
 const img=document.createElement('img');img.alt='Meal photograph saved locally';img.style.cssText='display:block;width:100%;max-height:220px;object-fit:contain;border-radius:12px';
 const url=URL.createObjectURL(file);img.src=url;img.onload=()=>URL.revokeObjectURL(url);box.append(img);
 const txt=document.createElement('p');txt.className='note';txt.textContent='Photo stored on this device only. Calories are not estimated automatically.';box.append(txt);
 }catch(e){box.textContent='Photo preview unavailable: '+e.message}
}
function trigger(id){pickedId=id;let input=$('loMealCameraInput');if(!input){
 input=document.createElement('input');input.id='loMealCameraInput';input.type='file';input.accept='image/*';input.setAttribute('capture','environment');input.hidden=true;document.body.append(input);
 input.addEventListener('change',async()=>{const file=input.files?.[0],target=pickedId;pickedId=null;input.value='';if(!target||!file)return;
  try{await write(target,file);message('Photo saved privately on this device. Add portions and calories manually if you wish.');await preview(target)}
  catch(e){message('Photo not saved: '+e.message)}
 });
 }input.click()}
function decorateDetails(){
 const modal=$('activityDetailsModal'),box=$('loDetailFields');if(!modal||!box||modal.hidden)return;
 const title=$('loDetailSummary')?.textContent||'';if(!/eating|meal|breakfast|lunch|dinner|snack|food/i.test(title))return;
 if($('loMealCameraInDetails'))return;
 const row=document.createElement('div');row.id='loMealCameraInDetails';row.className='lo-meal-camera';row.innerHTML='<button type="button" class="btn outline" id="loMealCameraAction">Take / choose a meal photo</button><p class="note">Optional. Photo is stored locally and not included in cloud sync or backups. No automatic calorie estimate is made.</p><div id="loMealPhotoPreview"></div><div role="status" id="loMealCameraStatus" class="sub"></div>';
 box.append(row);
 const data=window.lifeosReadOnlyWorkspace?.(),items=data?.sessions||[];
 const active=items.filter(eligible).filter(s=>s.status==='finished').sort((a,b)=>b.endAt-a.endAt);
 const matching=active.find(s=>title.startsWith(s.name+' · '));
 if(!matching){row.querySelector('button').disabled=true;return}
 row.querySelector('button').addEventListener('click',()=>trigger(matching.id));preview(matching.id);
}
function decorateActive(){
 const data=window.lifeosReadOnlyWorkspace?.();if(!data)return;
 const active=(data.sessions||[]).filter(s=>s.status!=='finished'&&eligible(s));
 const root=$('sessions');if(!root)return;
 for(const s of active){
  const clock=[...root.querySelectorAll('[data-timer]')].find(x=>x.dataset.timer===s.id);const parent=clock?.closest('.session');if(!parent||parent.querySelector('[data-lo-photo-id]'))continue;
  const button=document.createElement('button');button.type='button';button.className='btn outline lo-capture-while-eating';
  button.dataset.loPhotoId=s.id;button.textContent='Take meal photo';
  button.addEventListener('click',()=>trigger(s.id));parent.querySelector('.controls')?.append(button);
 }
}
function init(){
 const observer=new MutationObserver(()=>{decorateActive();decorateDetails()});
 for(const id of ['sessions','activityDetailsModal']){const el=$(id);if(el)observer.observe(el,{childList:true,subtree:true,attributes:id==='activityDetailsModal',attributeFilter:id==='activityDetailsModal'?['hidden']:undefined})}
 decorateActive();decorateDetails();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();