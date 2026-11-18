/* LifeOS V221 focus + personal alarms. Local-only; no tracked activity writes.
 * Wall-clock pause/break accounting, explicit audible/vibration test, visible
 * acknowledgement and snooze, repeat while open only. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else if(root)root.LifeOSFocusV207=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos.personal.focus.v207',MIN=60000;
const remaining=(end,at)=>Math.max(0,Number(end)-Number(at));
const format=ms=>{const t=Math.floor(Math.max(0,Number(ms)||0)/1000);return String(Math.floor(t/3600)).padStart(2,'0')+':'+String(Math.floor(t/60)%60).padStart(2,'0')+':'+String(t%60).padStart(2,'0')};
const normalizeState=s=>s&&Number.isFinite(Number(s.end))&&Number(s.end)>0?{...s,mode:['running','paused','break','ringing'].includes(s.mode)?s.mode:'running',kind:s.kind==='alarm'?'alarm':'focus',label:String(s.label||'Focus').slice(0,80),remainingMs:Math.max(0,Number(s.remainingMs)||0),breakMs:Math.max(0,Number(s.breakMs)||0)}:null;
function init(){
 const parent=document.getElementById('trackQuickPanel');if(!parent||document.getElementById('lo207-focus'))return;
 const alerts=root.LifeOSAlertEngineV221;
 const details=document.createElement('details');details.id='lo207-focus';details.className='lo207-focus';
 details.innerHTML='<summary>Focus mode & alarms · Sound + vibration</summary>'+
 '<p class="sub">Focus sessions are independent of tracked activities. Sound and vibration need browser permission/support and may stop when your phone locks or the browser sleeps. Android system-wide Do Not Disturb is not controlled.</p>'+
 '<label class="sub" for="lo207-focus-label">Focus activity</label><input class="field" id="lo207-focus-label" maxlength="80" value="Studying">'+
 '<label class="sub" for="lo207-focus-minutes">Focus duration (minutes)</label><input class="field" id="lo207-focus-minutes" type="number" min="1" max="240" value="45">'+
 '<div class="row"><button class="btn primary" id="lo207-start-focus" type="button">Start focus</button><button class="btn outline" id="lo207-notify-permission" type="button">Allow notifications</button></div>'+
 '<label class="sub" for="lo207-alarm-time">Alarm clock time</label><div class="row"><input class="field" id="lo207-alarm-time" type="time"><button class="btn outline" id="lo207-set-alarm" type="button">Set alarm</button></div>'+
 '<div class="lo221-settings"><h4>Alert sound & vibration</h4>'+
 '<label><input type="checkbox" id="lo221-sound"> Play alarm sound</label>'+
 '<label><input type="checkbox" id="lo221-vibrate"> Vibrate on supported Android devices</label>'+
 '<label for="lo221-volume">Sound volume <output id="lo221-volume-label">75%</output></label><input type="range" min="0" max="100" step="5" id="lo221-volume">'+
 '<label for="lo221-repeat">Repeat while the app stays open</label><select class="field" id="lo221-repeat"><option value="10">Every 10 seconds</option><option value="20">Every 20 seconds</option><option value="30">Every 30 seconds</option><option value="60">Every 60 seconds</option></select>'+
 '<div class="row"><button class="btn outline" type="button" id="lo221-test">Test sound & vibration</button><button class="btn outline" type="button" id="lo221-stop-test">Stop alert</button></div>'+
 '<p class="sub" id="lo221-capabilities"></p></div>'+
 '<div id="lo221-live-controls" hidden><div class="row"><button class="btn outline" id="lo221-pause" type="button">Pause</button><button class="btn outline" id="lo221-break" type="button">Break</button><button class="btn outline" id="lo221-end" type="button">End</button><button class="btn primary" id="lo221-open" type="button">Open focus view</button></div><p id="lo221-session-stats" class="sub"></p></div>'+
 '<p id="lo207-focus-status" class="sub" role="status" aria-live="polite"></p>';
 parent.append(details);
 const style=document.createElement('style');
 style.textContent='#lo207-focus .lo221-settings{margin:12px 0;padding:12px;border:1px solid #3d7082;border-radius:13px;background:#142638}#lo207-focus .lo221-settings label{display:block;margin:8px 0;color:#e9f6fa}#lo207-focus input[type=range]{width:100%}#lo207-focus .row{display:flex;flex-wrap:wrap;gap:8px}#lo207-focus button{min-height:42px}#lo207-focus-layer[hidden],#lo221-alert-layer[hidden],#lo221-live-controls[hidden]{display:none!important}#lo207-focus-layer button,#lo221-alert-layer button{min-height:45px}#lo207-focus-layer .row,#lo221-alert-layer .row{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}#lo207-focus-layer h2,#lo221-alert-layer h2{color:#f7fcff}';
 document.head.append(style);
 const layer=document.createElement('aside');layer.id='lo207-focus-layer';layer.hidden=true;layer.setAttribute('aria-label','LifeOS Focus Mode');
 layer.style.cssText='position:fixed;inset:0;background:#081626;color:#e9faf7;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:20px';
 layer.innerHTML='<div style="width:min(100%,480px);border:1px solid #4e7e7a;border-radius:22px;padding:24px;background:#12253a;text-align:center"><p>FOCUS MODE · LifeOS</p><h2 id="lo207-focus-title"></h2><div id="lo207-focus-clock" role="timer" style="font-size:clamp(44px,11vw,70px);font-variant-numeric:tabular-nums;font-weight:750;margin:16px 0"></div><p id="lo221-focus-state">Focus running</p><p id="lo221-focus-detail" class="sub"></p><div class="row"><button type="button" class="btn primary" id="lo221-layer-pause">Pause</button><button type="button" class="btn outline" id="lo221-layer-break">Break</button><button type="button" class="btn outline" id="lo207-hide-focus">Minimize</button><button type="button" class="btn danger" id="lo207-cancel-focus">End focus</button></div><p class="sub">Your tracked activities keep their own timers. Focus pause/break time is separate.</p></div>';
 document.body.append(layer);
 const alarmPanel=document.createElement('aside');alarmPanel.id='lo221-alert-layer';alarmPanel.hidden=true;alarmPanel.setAttribute('role','alertdialog');alarmPanel.setAttribute('aria-modal','true');alarmPanel.setAttribute('aria-label','LifeOS alarm reached');alarmPanel.style.cssText='position:fixed;inset:0;background:#0a1422ed;color:#fff;z-index:2147483001;display:none;align-items:center;justify-content:center;padding:18px';
 alarmPanel.innerHTML='<div style="width:min(100%,460px);background:#20314a;border:2px solid #f0be74;border-radius:20px;text-align:center;padding:24px"><h2>⏰ Alarm reached</h2><p id="lo221-alert-label"></p><p class="sub">Sound and vibration repeat while this page remains active. Phone silent mode and background restrictions may prevent alerts.</p><div class="row"><button id="lo221-dismiss" class="btn primary" type="button">Dismiss alarm</button><button id="lo221-snooze" class="btn outline" type="button">Snooze 5 minutes</button></div></div>';
 document.body.append(alarmPanel);
 const $=id=>document.getElementById(id),status=$('lo207-focus-status');
 const load=()=>{try{return normalizeState(JSON.parse(root.localStorage.getItem(KEY)||'null'))}catch{return null}};
 function save(s){try{if(!s)root.localStorage.removeItem(KEY);else root.localStorage.setItem(KEY,JSON.stringify(s));return true}catch{status.textContent='Could not save focus state. Browser storage may be full.';return false}}
 let current=load(),lastAlertAt=0,alertOpen=false,audioCheck='';
 const config=alerts?.load?.()||{sound:true,vibration:true,volume:75,repeatSeconds:20};
 $('lo221-sound').checked=config.sound;$('lo221-vibrate').checked=config.vibration;$('lo221-volume').value=config.volume;$('lo221-repeat').value=config.repeatSeconds;
 function setConfig(){
  const cfg={sound:$('lo221-sound').checked,vibration:$('lo221-vibrate').checked,volume:Number($('lo221-volume').value),repeatSeconds:Number($('lo221-repeat').value)};
  $('lo221-volume-label').textContent=cfg.volume+'%';
  const saved=alerts?.save?.(cfg);if(saved&&!saved.ok)status.textContent='Alert settings were not saved.';
  capability();
 }
 function capability(){
  const c=alerts?.capabilities?.()||{};
  $('lo221-capabilities').textContent='Sound: '+(c.audioReady?'ready':c.audioSupported?'tap Test to unlock':'unsupported')+' · Vibration: '+(c.vibrationSupported?'supported by browser':'unavailable')+' · Notifications: '+(c.notificationPermission||'unsupported')+'. Browser and Android may suppress sound in the background.';
 }
 for(const id of ['lo221-sound','lo221-vibrate','lo221-volume','lo221-repeat'])$(id).addEventListener('change',setConfig);
 $('lo221-volume').addEventListener('input',()=>$('lo221-volume-label').textContent=$('lo221-volume').value+'%');
 function alertSignal(){
  const r=alerts?.play?.(alerts?.load?.());
  audioCheck=r?.sound?'Sound played inside this tab.':r?.primed?'Sound unavailable; check phone volume.':'Sound not unlocked — tap Test sound & vibration while this page is open.';
  if(r?.vibration)audioCheck+=' Vibration requested.';
  else if(alerts?.load?.()?.vibration)audioCheck+=' Vibration may be unsupported or blocked.';
 }
 async function primeSound(){
  const result=await alerts?.unlock?.();
  capability();return result;
 }
 $('lo221-test').onclick=async()=>{const r=await primeSound();alertSignal();status.textContent='Test: '+(r?.reason||'Sound unavailable')+' '+audioCheck};
 $('lo221-stop-test').onclick=()=>{alerts?.vibrate?.(0);status.textContent='Test finished. Browser tone ends automatically.'};
 async function notification(label){
  try{
   if(root.Notification?.permission!=='granted'||!root.navigator?.serviceWorker)return;
   const reg=await root.navigator.serviceWorker.register('./lifeos_notifications_sw.js');
   const opts={body:'Your scheduled focus or alarm time has arrived. Open LifeOS to dismiss or snooze.',tag:'lifeos-v221-alarm',requireInteraction:true,silent:false,data:{url:'/?timer=review'}};
   if(alerts?.load?.()?.vibration)opts.vibrate=[220,100,220,100,380];
   await reg.showNotification('LifeOS alarm · '+String(label).slice(0,65),opts);
  }catch(_){}
 }
 function startRinging(){
  if(!current)return;
  current.mode='ringing';current.remainingMs=0;
  save(current);alertOpen=true;lastAlertAt=0;
  alarmPanel.hidden=false;alarmPanel.style.display='flex';$('lo221-alert-label').textContent=current.label;
  layer.hidden=true;layer.style.display='none';status.textContent=current.label+' · Alarm reached. Dismiss or snooze.';
  if(document.visibilityState!=='hidden'){alertSignal();lastAlertAt=Date.now()}
  notification(current.label);
 }
 function update(){
  current=load();
  const c=current;
  if(!c){
   $('lo221-live-controls').hidden=true;
   layer.hidden=true;layer.style.display='none';
   alarmPanel.hidden=true;alarmPanel.style.display='none';alertOpen=false;return;
  }
  $('lo221-live-controls').hidden=false;
  if(c.mode==='ringing'){
   if(!alertOpen){startRinging();return}
   if(!document.hidden&&Date.now()-lastAlertAt>=(alerts?.load?.()?.repeatSeconds||20)*1000){alertSignal();lastAlertAt=Date.now()}
   return;
  }
  if(c.mode==='running'&&Date.now()>=c.end){startRinging();return}
  const left=c.mode==='running'?remaining(c.end,Date.now()):c.remainingMs;
  $('lo207-focus-title').textContent=c.label;
  $('lo207-focus-clock').textContent=format(left);
  $('lo221-focus-state').textContent=c.mode==='paused'?'Paused':c.mode==='break'?'Break':'Focus running';
  $('lo221-focus-detail').textContent='Break time '+format(c.breakMs+(c.mode==='break'?Date.now()-c.modeAt:0))+' · Focus left '+format(left);
  $('lo221-session-stats').textContent=c.label+' · '+format(left)+' left · '+(c.mode==='break'?'Break in progress':c.mode==='paused'?'Paused':'Running');
  $('lo221-layer-pause').textContent=c.mode==='paused'?'Resume':c.mode==='break'?'Resume focus':'Pause';
  $('lo221-layer-break').textContent=c.mode==='break'?'Resume focus':'Break';
  $('lo221-pause').textContent=$('lo221-layer-pause').textContent;
  $('lo221-break').textContent=$('lo221-layer-break').textContent;
  status.textContent=c.label+' · '+format(left)+' remaining ('+c.mode+').';
 }
 function changeMode(next){
  current=load();if(!current||current.kind!=='focus'||current.mode==='ringing')return;
  const t=Date.now(),previous=current.mode;
  if(previous==='running')current.remainingMs=remaining(current.end,t);
  if(previous==='break'&&Number.isFinite(current.modeAt))current.breakMs+=(t-current.modeAt);
  if(next==='running'){current.end=t+current.remainingMs;current.modeAt=t}
  else{current.modeAt=t;current.mode=next}
  if(next==='running')current.mode='running';
  if(save(current))update();
 }
 function pauseOrResume(){const s=load();if(!s||s.kind!=='focus')return;if(s.mode==='running')changeMode('paused');else changeMode('running')}
 function breakOrResume(){const s=load();if(!s||s.kind!=='focus')return;if(s.mode==='break')changeMode('running');else changeMode('break')}
 function stop(){current=null;save(null);alerts?.vibrate?.(0);update();status.textContent='Focus/alarm ended. No tracked activity was changed.'}
 async function start(kind){
  const label=$('lo207-focus-label').value.trim()||'Focus';
  let end;
  if(kind==='focus'){
   const m=Number($('lo207-focus-minutes').value);
   if(!Number.isSafeInteger(m)||m<1||m>240){status.textContent='Choose a focus duration from 1 to 240 minutes.';return}
   end=Date.now()+m*MIN;
  }else{
   const time=$('lo207-alarm-time').value;
   if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)){status.textContent='Choose a valid alarm time.';return}
   const [h,m]=time.split(':').map(Number),date=new Date();date.setHours(h,m,0,0);
   if(date.getTime()<=Date.now())date.setDate(date.getDate()+1);
   end=date.getTime();
  }
  if(load()&&!root.confirm('Replace your existing focus or alarm?'))return;
  const r=await primeSound();
  current={label,kind,end,mode:'running',remainingMs:end-Date.now(),modeAt:Date.now(),breakMs:0};
  if(!save(current))return;
  alarmPanel.hidden=true;alarmPanel.style.display='none';alertOpen=false;
  if(kind==='focus'){layer.hidden=false;layer.style.display='flex'}
  else{layer.hidden=true;layer.style.display='none'}
  update();status.textContent=label+' started. '+(r?.ok?'Sound unlocked while the browser stays active.':'Sound may be unavailable until you tap Test sound & vibration.');
 }
 $('lo207-start-focus').onclick=()=>start('focus');
 $('lo207-set-alarm').onclick=()=>start('alarm');
 $('lo221-pause').onclick=pauseOrResume;$('lo221-layer-pause').onclick=pauseOrResume;
 $('lo221-break').onclick=breakOrResume;$('lo221-layer-break').onclick=breakOrResume;
 $('lo221-end').onclick=stop;$('lo207-cancel-focus').onclick=stop;
 $('lo221-open').onclick=()=>{if(current?.kind==='focus'){layer.hidden=false;layer.style.display='flex'}};
 $('lo207-hide-focus').onclick=()=>{layer.hidden=true;layer.style.display='none'};
 $('lo221-dismiss').onclick=stop;
 $('lo221-snooze').onclick=()=>{const c=load();if(!c)return;current={...c,kind:'alarm',mode:'running',end:Date.now()+5*MIN,remainingMs:5*MIN,modeAt:Date.now()};if(!save(current))return;alertOpen=false;alarmPanel.hidden=true;alarmPanel.style.display='none';alerts?.vibrate?.(0);update();status.textContent='Alarm snoozed for 5 minutes.'};
 $('lo207-notify-permission').onclick=async()=>{
  if(!root.Notification){status.textContent='Notifications unsupported.';return}
  try{const result=await root.Notification.requestPermission();status.textContent=result==='granted'?'Notifications allowed. Android controls actual delivery and alert sound.':'Notifications were not granted.'}
  catch(e){status.textContent='Unable to request notification permission: '+String(e.message||e)}
 };
 root.addEventListener('focus',update);
 root.addEventListener('pageshow',update);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
 setInterval(update,1000);capability();setConfig();update();
}
if(root?.document){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()}
return Object.freeze({remaining,format,normalizeState});
});
