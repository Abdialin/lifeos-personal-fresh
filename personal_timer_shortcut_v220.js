/* LifeOS V220 — opt-in browser notification shortcut for a tracked activity.
 * Static notification, updated only on tracked state changes while the page is active.
 * NO background polling, native foreground service, wake locks or automatic timer mutations.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else if(root)root.LifeOSTimerShortcutV220=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos.personal.timer-shortcut.v220',TAG='lifeos-v220-timer';
function safeState(value){return value===true;}
function selected(sessions){
 const list=Array.isArray(sessions)?sessions:[];
 return list.find(x=>x&&x.status==='running'&&x.id!=null)||
        list.find(x=>x&&x.status==='paused'&&x.id!=null)||null;
}
function notificationData(s){
 if(!s)return null;
 const id=String(s.id),name=String(s.name||'Activity').slice(0,90);
 return {title:'LifeOS · '+name,
  body:s.status==='paused'?'Paused · Tap to review or finish in LifeOS':'Running · Tap to review, pause or finish in LifeOS',
  tag:TAG,url:'/?timer=review&id='+encodeURIComponent(id),requireInteraction:true};
}
function mount(){
 if(!root.document||document.getElementById('lo220-phone-shortcut'))return;
 const host=document.getElementById('trackQuickPanel')||document.getElementById('trackActivePanel');if(!host)return;
 const section=document.createElement('details');section.id='lo220-phone-shortcut';section.className='lo220-phone-shortcut';
 section.innerHTML='<summary>Phone timer shortcut <span id="lo220-summary" aria-live="polite">· Optional</span></summary>'+
 '<p class="sub">Show a static notification for a running or paused activity on supported browsers. Tap it to reopen LifeOS. Its time does not tick in Android’s notification center. Android may dismiss it or stop delivery after the browser closes.</p>'+
 '<div class="row"><button type="button" class="btn primary" id="lo220-pin">Show notification shortcut</button><button type="button" class="btn outline" id="lo220-test-alert">Test phone sound & vibration</button><button type="button" class="btn outline" id="lo220-clear">Remove shortcut</button></div>'+
 '<p id="lo220-status" class="sub" role="status" aria-live="polite">Not enabled on this device.</p>';
 host.append(section);
 const style=document.createElement('style');style.textContent='#lo220-phone-shortcut{margin:12px 0 0;border:1px solid #48637a;border-radius:13px;padding:11px;background:#142539}#lo220-phone-shortcut summary{cursor:pointer;font-weight:700;color:#e6f7fa}#lo220-phone-shortcut button{min-height:42px}#lo220-status{margin:8px 0 2px;overflow-wrap:anywhere}';document.head.append(style);
 const status=section.querySelector('#lo220-status'),hint=section.querySelector('#lo220-summary');
 const store=root.localStorage;
 const read=()=>{try{return safeState(JSON.parse(store.getItem(KEY)))}catch{return false}};
 const write=v=>{try{store.setItem(KEY,JSON.stringify(Boolean(v)));return true}catch{return false}};
 let pinned=read(),last='';
 const permission=()=>typeof root.Notification==='undefined'?'unsupported':root.Notification.permission;
 const active=()=>{try{return selected(root.lifeosReadOnlyWorkspace?.()?.sessions)}catch{return null}};
 async function registration(){
  if(!root.isSecureContext||!root.navigator?.serviceWorker)throw Error('Secure HTTPS and service worker support are required.');
  return await root.navigator.serviceWorker.register('./lifeos_notifications_sw.js');
 }
 async function clearNotification(){
  const reg=await registration();
  if(typeof reg.getNotifications!=='function')throw Error('Notification management is unsupported.');
  const existing=await reg.getNotifications({tag:TAG});
  for(const n of existing)if(n.tag===TAG)n.close();
 }
 function report(note){
  hint.textContent=pinned?'· Enabled':'· Optional';
  section.querySelector('#lo220-pin').disabled=permission()==='denied'||permission()==='unsupported'||!root.isSecureContext;
  if(note)status.textContent=note;
 }
 async function show(force=false){
  if(!pinned||permission()!=='granted')return;
  const s=active(),data=notificationData(s);
  if(!data){last='';await clearNotification();report('No active or paused activity. Start a timer and use Show notification shortcut.');return}
  const signature=String(s.id)+'|'+String(s.status)+'|'+String(s.name);
  if(!force&&signature===last)return;
  const reg=await registration();
  if(typeof reg.showNotification!=='function')throw Error('Browser notification display is unsupported.');
  const opts={body:data.body,tag:data.tag,renotify:false,silent:false,
    requireInteraction:true,data:{url:data.url}};
  if(root.LifeOSAlertEngineV221?.load?.()?.vibration)opts.vibrate=[180,80,180];
  await reg.showNotification(data.title,opts);
  last=signature;
  report('Shortcut displayed for '+String(s.name||'activity')+'. Tap the notification to reopen LifeOS; it is not a live clock.');
 }
 section.querySelector('#lo220-pin').addEventListener('click',async()=>{
  try{
   if(permission()==='default'){
    const granted=await root.Notification.requestPermission();if(granted!=='granted'){report('Notification permission was not granted.');return}
   }
   if(permission()!=='granted'){report('Notifications are blocked in Android or browser settings.');return}
   if(!active()){report('Start or resume an activity before showing its notification.');return}
   // Only opt in after registration and display succeeds.
   const signal=root.LifeOSAlertEngineV221;
   if(signal)await signal.unlock();
   pinned=true;await show(true);
   const audible=signal?.play?.(signal.load());
   if(!write(true)){pinned=false;report('Could not store this preference. Check browser storage.');return}
   report('Notification displayed. '+(audible?.sound?'In-app confirmation tone played.':'Notification sound is controlled by Android; in-app tone unavailable or muted.')+(audible?.vibration?' Vibration requested.':''));
  }catch(e){pinned=false;report('Could not display a notification: '+String(e.message||e))}
 });
 section.querySelector('#lo220-test-alert').addEventListener('click',async()=>{
  try{
   const alert=root.LifeOSAlertEngineV221;
   if(!alert)throw Error('Alert engine unavailable.');
   const unlocked=await alert.unlock();
   const result=alert.play(alert.load());
   report('Alert test: '+(result.sound?'Sound requested.':unlocked?.reason||'No audible sound.')+' '+(result.vibration?'Vibration requested.':'Vibration not available or disabled.')+' Phone settings may mute both. Open Focus mode & alarms to adjust sound, vibration, and volume.');
  }catch(e){report('Sound/vibration test unavailable: '+String(e.message||e))}
 });
 section.querySelector('#lo220-clear').addEventListener('click',async()=>{
  pinned=false;last='';const saved=write(false);
  try{await clearNotification();report(saved?'Notification shortcut removed.':'Shortcut closed, but browser preference could not be saved.')}
  catch(e){report('Shortcut disabled locally; notification removal may require browser controls: '+String(e.message||e))}
 });
 root.addEventListener('lifeos-v77-tracking-changed',()=>{
  if(!pinned||document.hidden)return;
  root.setTimeout(()=>{
   const before=last;
   show().then(()=>{
    if(last&&before!==last){
     const signal=root.LifeOSAlertEngineV221;
     signal?.play?.(signal.load());
    }
   }).catch(e=>report('Notification not refreshed: '+String(e.message||e)));
  },100);
 });
 report(pinned?'Previously enabled. Notification display depends on browser permission.':'Not enabled on this device.');
}
if(root?.document){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return Object.freeze({selected,notificationData,safeState,KEY,TAG});
});
