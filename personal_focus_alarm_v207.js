/* V207: opt-in, local countdown and in-app focus display.
   Notifications when page is closed/phone locked are NOT guaranteed.
   No changes to tracked activity data; no claim to control Android DND. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSFocusV207=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';const KEY='lifeos.personal.focus.v207';
const remaining=(end,at)=>Math.max(0,Number(end)-Number(at));
const format=ms=>{const t=Math.floor(Math.max(0,ms)/1000);return String(Math.floor(t/3600)).padStart(2,'0')+':'+String(Math.floor(t/60)%60).padStart(2,'0')+':'+String(t%60).padStart(2,'0')};
function init(){
 const parent=document.getElementById('trackQuickPanel');if(!parent||document.getElementById('lo207-focus'))return;
 const details=document.createElement('details');details.id='lo207-focus';details.className='lo207-focus';
 details.innerHTML='<summary>Focus mode & personal alarms</summary><p class="sub">An optional distraction-free view and local alarm. This is separate from a tracked activity. For guaranteed lock-screen alarms or Do Not Disturb, Android-level integration is required.</p><label class="sub" for="lo207-focus-label">What will you focus on?</label><input class="field" id="lo207-focus-label" maxlength="80" value="Studying"><label class="sub" for="lo207-focus-minutes">Focus duration (minutes)</label><input class="field" id="lo207-focus-minutes" type="number" min="1" max="240" value="45"><div class="row"><button class="btn primary" id="lo207-start-focus" type="button">Start focus countdown</button><button class="btn outline" id="lo207-notify-permission" type="button">Enable browser notification</button></div><label class="sub" for="lo207-alarm-time">Or set a local alarm for</label><div class="row"><input class="field" id="lo207-alarm-time" type="time"><button class="btn outline" id="lo207-set-alarm" type="button">Set alarm</button></div><p id="lo207-focus-status" class="sub" role="status"></p>';
 parent.append(details);
 const layer=document.createElement('aside');layer.id='lo207-focus-layer';layer.hidden=true;layer.setAttribute('aria-label','LifeOS focus mode');
 layer.style.cssText='position:fixed;inset:0;background:#081626;color:#e9faf7;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:20px';
 layer.innerHTML='<div style="width:min(100%,450px);border:1px solid #4e7e7a;border-radius:22px;padding:28px;background:#12253a;text-align:center"><p>FOCUS MODE · LifeOS</p><h2 id="lo207-focus-title"></h2><div id="lo207-focus-clock" style="font-size:clamp(45px,12vw,72px);font-variant-numeric:tabular-nums;font-weight:700;margin:16px 0"></div><p class="sub">LifeOS is simplified while you focus. Your phone’s system notifications are not blocked.</p><div class="row" style="justify-content:center"><button type="button" class="btn outline" id="lo207-hide-focus">Leave focus view</button><button type="button" class="btn danger" id="lo207-cancel-focus">Stop timer</button></div></div>';
 document.body.append(layer);
 const $=id=>document.getElementById(id),status=$('lo207-focus-status');
 const load=()=>{try{const s=JSON.parse(localStorage.getItem(KEY)||'null');return s&&Number.isFinite(s.end)&&s.end>0?s:null}catch{return null}};
 const save=s=>{try{if(!s)localStorage.removeItem(KEY);else localStorage.setItem(KEY,JSON.stringify(s));return true}catch{status.textContent='Unable to store alarm. Check browser storage.';return false}};
 let current=load(),ringed=false;
 function alarm(){
  const label=String(current?.label||'LifeOS alarm');
  status.textContent=label+' · Alarm reached. Confirm the next activity manually.';
  try{if(root.Notification?.permission==='granted')new Notification('LifeOS reminder',{body:label})}catch(_){}
  try{const C=root.AudioContext||root.webkitAudioContext;if(C){const ctx=new C(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);gain.gain.value=.08;osc.frequency.value=750;osc.start();osc.stop(ctx.currentTime+.3);setTimeout(()=>ctx.close(),600)}}catch(_){}
 }
 function tick(){
  current=load();
  if(!current){layer.hidden=true;layer.style.display='none';return}
  const left=remaining(current.end,Date.now());$('lo207-focus-title').textContent=current.label;
  $('lo207-focus-clock').textContent=format(left);
  if(left>0){ringed=false;status.textContent=current.label+' · '+format(left)+' remaining';return}
  if(!ringed){ringed=true;alarm();save(null);current=null;layer.hidden=true;layer.style.display='none'}
 }
 $('lo207-start-focus').onclick=()=>{
  const minutes=Number($('lo207-focus-minutes').value);
  if(!Number.isSafeInteger(minutes)||minutes<1||minutes>240){status.textContent='Choose between 1 and 240 minutes.';return}
  const label=$('lo207-focus-label').value.trim()||'Focus';
  current={label,end:Date.now()+minutes*60000,kind:'focus'};
  if(!save(current))return;
  layer.hidden=false;layer.style.display='flex';tick();
 };
 $('lo207-set-alarm').onclick=()=>{
  const value=$('lo207-alarm-time').value;
  if(!/^\d{2}:\d{2}$/.test(value)){status.textContent='Choose a clock time first.';return}
  const [h,m]=value.split(':').map(Number),d=new Date();d.setHours(h,m,0,0);if(d.getTime()<=Date.now())d.setDate(d.getDate()+1);
  current={label:$('lo207-focus-label').value.trim()||'LifeOS alarm',end:d.getTime(),kind:'alarm'};
  if(save(current)){layer.hidden=true;layer.style.display='none';tick()}
 };
 $('lo207-notify-permission').onclick=async()=>{
  if(!('Notification' in root)){status.textContent='Browser notification API unavailable.';return}
  try{const result=await Notification.requestPermission();status.textContent=result==='granted'?'Notifications allowed when supported. Lock-screen delivery still depends on browser/Android.':'Notifications not granted.'}catch{status.textContent='Notification permission could not be requested.'}
 };
 $('lo207-hide-focus').onclick=()=>{layer.hidden=true;layer.style.display='none';status.textContent='Focus timer continues until its deadline.'};
 $('lo207-cancel-focus').onclick=()=>{current=null;save(null);tick();status.textContent='Focus timer stopped. Tracked activities were not changed.'};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
 root.addEventListener('focus',tick);
 setInterval(tick,1000);tick();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()}
return {remaining,format};
});
