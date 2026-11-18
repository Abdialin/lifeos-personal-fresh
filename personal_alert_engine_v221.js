/* V221 browser alert engine: audible multi-tone signal and optional vibration
 * only during an active page. Does NOT claim sound/vibration from notifications
 * once the page is suspended, closed, muted or constrained by Android policy.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else if(root)root.LifeOSAlertEngineV221=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos.personal.alert-settings.v221';
const normalize=x=>({sound:x?.sound!==false,vibration:x?.vibration!==false,volume:Number.isFinite(Number(x?.volume))?Math.min(100,Math.max(0,Math.round(Number(x.volume)))):75,repeatSeconds:[10,20,30,60].includes(Number(x?.repeatSeconds))?Number(x.repeatSeconds):20});
function load(){try{return normalize(JSON.parse(root.localStorage?.getItem(KEY)||'null'))}catch{return normalize(null)}}
function save(v){const data=normalize(v);try{root.localStorage?.setItem(KEY,JSON.stringify(data));return {ok:true,value:data}}catch{return {ok:false,value:data}}}
let audio=null,primed=false;
async function unlock(){
 const C=root.AudioContext||root.webkitAudioContext;
 if(!C)return {ok:false,reason:'Audio playback unsupported in this browser.'};
 try{if(!audio||audio.state==='closed')audio=new C();
  if(audio.state==='suspended')await audio.resume();
  // A zero-volume oscillator primes mobile audio on the user's actual tap.
  const oscillator=audio.createOscillator(),gain=audio.createGain();
  gain.gain.value=0;oscillator.connect(gain);gain.connect(audio.destination);
  oscillator.start();oscillator.stop(audio.currentTime+0.01);
  primed=audio.state==='running';return {ok:primed,reason:primed?'Sound enabled for this open browser session.':'Audio remains suspended by the browser.'};
 }catch(e){return {ok:false,reason:'Audio could not start: '+String(e?.message||e)}}
}
function vibrate(pattern){try{return Boolean(root.navigator?.vibrate?.(pattern))}catch{return false}}
function play(settings){
 const cfg=normalize(settings);let sound=false,vibration=false;
 if(cfg.sound&&cfg.volume>0&&audio&&audio.state==='running'){
  try{
   const base=audio.currentTime+.02;
   const sequence=[{at:0,hz:880,ms:180},{at:.28,hz:660,ms:180},{at:.56,hz:880,ms:240},{at:1.00,hz:990,ms:280}];
   for(const note of sequence){
    const osc=audio.createOscillator(),gain=audio.createGain(),start=base+note.at;
    osc.type='sine';osc.frequency.value=note.hz;
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,Math.min(.25,cfg.volume/100*.20)),start+.025);
    gain.gain.exponentialRampToValueAtTime(.0001,start+note.ms/1000);
    osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+note.ms/1000+.02);
   }
   sound=true;
  }catch(_){}
 }
 if(cfg.vibration)vibration=vibrate([200,90,200,90,360]);
 return {sound,vibration,primed,notificationSoundGuaranteed:false};
}
function capabilities(){
 return {audioSupported:Boolean(root.AudioContext||root.webkitAudioContext),audioReady:Boolean(audio&&audio.state==='running'),
 vibrationSupported:typeof root.navigator?.vibrate==='function',
 notificationPermission:typeof root.Notification==='undefined'?'unsupported':root.Notification.permission,
 secureContext:Boolean(root.isSecureContext)};
}
return Object.freeze({KEY,normalize,load,save,unlock,play,vibrate,capabilities});
});
