/* LifeOS V87 — explicit notification preferences and timer entry.
 * Notifications are opportunistic, not an Android native foreground chronometer.
 * Do not start, finish, alter, or import any tracking records from notifications. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSNotificationControlsV87=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos.personal.notification-preferences.v87';
function normalize(value){
 const data=value&&typeof value==='object'?value:{};
 return {enabled:data.enabled===true,timerShortcut:data.timerShortcut===true};
}
function read(store){try{return normalize(JSON.parse(store.getItem(KEY)||'{}'))}catch{return normalize(null)}}
function save(store,value){const next=normalize(value);try{store.setItem(KEY,JSON.stringify(next));return {ok:true,value:next}}catch{return {ok:false,reason:'Unable to save notification preferences in this browser.'}}}
function status(permission,secure,serviceWorker){
 if(!secure)return 'Notifications require a secure HTTPS connection.';
 if(permission==='unsupported')return 'This browser does not support notifications.';
 if(permission==='denied')return 'Notifications are blocked in your browser or phone settings.';
 if(permission==='default')return 'Permission not granted. Tap Enable to request access.';
 if(!serviceWorker)return 'Notifications are allowed, but a notification service worker is unavailable on this device.';
 return 'Browser notifications are allowed. Delivery while LifeOS is closed is not guaranteed.';
}
function mount(){
 if(document.getElementById('lo87-notifications'))return;
 const host=document.getElementById('lo14SettingsHub')||document.getElementById('trackActivePanel')||document.querySelector('header.top');
 if(!host)return;
 const style=document.createElement('style');style.textContent=`
 #lo87-notifications{margin:14px 0;padding:16px;border:1px solid #526889;border-radius:14px;background:#162138;color:#eaf0ff}
 #lo87-notifications label{display:flex;align-items:start;gap:10px;margin:12px 0}
 #lo87-notifications button{background:#304f76;color:white;border:1px solid #6a86ac;border-radius:9px;padding:10px;min-height:42px;margin:3px}
 #lo87-notifications button:focus-visible{outline:3px solid #83ded0}
 #lo87-notifications small{display:block;color:#c2cee1;line-height:1.5}
 #lo87-notifications input{width:19px;height:19px;flex:none}
 `;document.head.append(style);
 const panel=document.createElement('section');panel.id='lo87-notifications';
 panel.innerHTML='<h3>Phone notifications & timer shortcut</h3><p id="lo87-permission" role="status"></p><label><input type="checkbox" id="lo87-enabled">Allow LifeOS to send optional browser reminders on this device</label><label><input type="checkbox" id="lo87-shortcut">Offer a notification shortcut for an ongoing timer when I ask for it</label><div><button type="button" id="lo87-enable">Enable notifications</button><button type="button" id="lo87-test">Send test notification</button><button type="button" id="lo87-timer">Show ongoing timer shortcut</button><button type="button" id="lo87-clear">Clear LifeOS notifications</button></div><small>Notification shortcuts are static and do not display a continuously updating clock. No notification is automatically kept on your phone. Android foreground chronometers and iOS Live Activities require native app integrations. Browser reminders may not arrive after you close or suspend LifeOS. Timer durations are recalculated from saved timestamps when you return.</small><p id="lo87-message" role="status"></p>';
 host.append(panel);
 const el=id=>panel.querySelector('#'+id),pref=read(root.localStorage),enabled=el('lo87-enabled'),shortcut=el('lo87-shortcut'),message=el('lo87-message');
 enabled.checked=pref.enabled;shortcut.checked=pref.timerShortcut;
 const permission=()=>typeof Notification==='undefined'?'unsupported':Notification.permission;
 function report(note){
  el('lo87-permission').textContent=status(permission(),root.isSecureContext,Boolean(root.navigator?.serviceWorker));
  el('lo87-enable').disabled=!root.isSecureContext||!['default','granted'].includes(permission());
  el('lo87-test').disabled=permission()!=='granted'||!enabled.checked;
  el('lo87-timer').disabled=permission()!=='granted'||!enabled.checked||!shortcut.checked;
  if(note)message.textContent=note;
 }
 function persist(){const r=save(root.localStorage,{enabled:enabled.checked,timerShortcut:shortcut.checked});report(r.ok?'Preferences saved for this browser.':r.reason)}
 enabled.addEventListener('change',persist);shortcut.addEventListener('change',persist);
 async function registration(){
  if(!('serviceWorker'in root.navigator))throw Error('Service workers unavailable.');
  return await root.navigator.serviceWorker.register('./lifeos_notifications_sw.js');
 }
 async function notify(title,body,tag,url){
  if(!enabled.checked||permission()!=='granted')throw Error('Enable LifeOS browser notifications first.');
  const reg=await registration();
  await reg.showNotification(title,{body,tag,renotify:false,data:{url},requireInteraction:false});
 }
 el('lo87-enable').addEventListener('click',async()=>{
  try{
   const p=permission()==='default'?await Notification.requestPermission():permission();
   if(p==='granted'){await registration();enabled.checked=true;persist();report('Notifications are permitted on this device. They are not guaranteed when LifeOS is closed.')}
   else report('Permission was not granted. You can change it in browser settings.');
  }catch(e){report('Unable to initialize notifications: '+String(e.message||e))}
 });
 el('lo87-test').addEventListener('click',async()=>{try{await notify('LifeOS test','Your browser accepted a test notification.','lifeos-v87-test','/?timer=review');report('Test sent. Check whether your phone displays it.')}catch(e){report('Test failed: '+String(e.message||e))}});
 el('lo87-timer').addEventListener('click',async()=>{
  const sessions=root.lifeosReadOnlyWorkspace?.()?.sessions||[];
  const item=root.LifeOSOngoingTimerV86?.choose?.(sessions,null);
  if(!item)return report('No active or paused timer exists.');
  try{await notify('LifeOS · '+String(item.name||'Activity'),item.status==='paused'?'Paused — tap to review':'Running — tap to review or finish in LifeOS','lifeos-v87-timer','/?timer=review&id='+encodeURIComponent(String(item.id)));report('Timer shortcut sent. It is not a live background clock.')}catch(e){report('Unable to show timer shortcut: '+String(e.message||e))}
 });
 el('lo87-clear').addEventListener('click',async()=>{
  try{const reg=await registration(),notices=await reg.getNotifications();
   let count=0;for(const n of notices){if(String(n.tag||'').startsWith('lifeos-')){n.close();count++}}
   report('Closed '+count+' LifeOS notification(s) on this device.');
  }catch(e){report('Unable to clear notifications: '+String(e.message||e))}
 });
 async function deepLink(){
  try{const url=new URL(root.location.href);if(url.searchParams.get('timer')!=='review')return;
   const id=url.searchParams.get('id');url.searchParams.delete('timer');url.searchParams.delete('id');
   root.history.replaceState(null,'',url.pathname+url.search+url.hash);
   root.setTimeout(()=>{if(!root.LifeOSReviewTimer?.(id)){report('Open Track to review your timer.')}},450);
  }catch{}
 }
 root.addEventListener('focus',()=>report());root.addEventListener('pageshow',()=>report());
 report();deepLink();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {KEY,normalize,read,save,status};
});