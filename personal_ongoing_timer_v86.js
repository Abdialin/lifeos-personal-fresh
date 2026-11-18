/* LifeOS V86 — compact, accessible ongoing timer controls across views.
 * Browser/PWA controls only; not a native Android foreground notification.
 * All mutations go through the existing V77 event handler, never local fake state. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSOngoingTimerV86=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const active=sessions=>(Array.isArray(sessions)?sessions:[]).filter(x=>x&&['running','paused'].includes(x.status)&&x.id!=null);
const choose=(sessions,id)=>active(sessions).find(s=>String(s.id)===String(id))||active(sessions).find(s=>s.status==='running')||active(sessions)[0]||null;
function mount(){
 if(document.getElementById('lo86-timer'))return;
 const style=document.createElement('style');style.textContent=`
 #lo86-timer{position:fixed;right:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));width:min(350px,calc(100vw - 24px));z-index:750;background:#152138;color:#edf4ff;border:1px solid #537296;box-shadow:0 7px 28px #0008;border-radius:15px;padding:10px;font:14px system-ui;box-sizing:border-box}
 #lo86-timer[hidden],#lo86-details[hidden]{display:none!important}
 /* Only one floating timer: preserve the original control as fallback when V86 is hidden. */
 body:has(#lo86-timer:not([hidden])) #lo32ActiveTimer{display:none!important}
 body:has(#lo86-timer:not([hidden])) #todayTimerSignal{display:none!important}
 #lo86-timer{max-width:min(260px,calc(100vw - 24px))!important;padding:7px 9px!important}
 #lo86-summary strong{max-width:88px;font-size:11px}
 #lo86-summary{gap:6px}
 #lo86-clock{font-size:12px;font-weight:800}
 #lo86-toggle{min-width:30px!important;min-height:30px!important;padding:4px!important}

 #lo86-summary{display:flex;align-items:center;gap:9px;min-width:0}
 #lo86-summary strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
 #lo86-clock{font-variant-numeric:tabular-nums;white-space:nowrap}
 #lo86-timer button,#lo86-timer select{font:inherit;border-radius:8px;border:1px solid #526889;background:#293c5a;color:#fff;padding:8px;min-height:38px}
 #lo86-timer button:focus-visible,#lo86-timer select:focus-visible{outline:3px solid #82ddcd;outline-offset:2px}
 #lo86-toggle{min-width:40px}
 #lo86-details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}
 #lo86-select{grid-column:1/-1;width:100%;min-width:0}
 #lo86-details{grid-template-columns:repeat(2,minmax(0,1fr))}
 #lo86-status{grid-column:1/-1;font-size:12px;min-height:0;margin:0;color:#bbd7f4}
 @media(max-width:520px){#lo86-timer{bottom:calc(84px + env(safe-area-inset-bottom,0px))}}
 `;document.head.append(style);
 const box=document.createElement('aside');box.id='lo86-timer';box.hidden=true;
 box.setAttribute('aria-label','Ongoing LifeOS activity timer');
 box.innerHTML='<div id="lo86-summary"><span aria-hidden="true">⏱</span><strong id="lo86-name">Active timer</strong><span id="lo86-clock" role="timer">00:00:00</span><button id="lo86-toggle" type="button" aria-controls="lo86-details" aria-expanded="false" aria-label="Show timer controls">⌃</button></div><div id="lo86-details" hidden><select id="lo86-select" aria-label="Choose active or paused activity"></select><button type="button" data-lo86="review">Review</button><button type="button" data-lo86="pause">Pause</button><button type="button" data-lo86="break">Break</button><button type="button" data-lo86="finish">Finish</button><p id="lo86-status" role="status"></p></div>';
 document.body.append(box);
 const get=id=>box.querySelector('#'+id),pick=get('lo86-select'),details=get('lo86-details'),toggle=get('lo86-toggle'),status=get('lo86-status');
 const sessions=()=>{try{return root.lifeosReadOnlyWorkspace?.()?.sessions||[]}catch{return []}};
 let current=null,previous='';
 function elapsed(s,now){return root.LifeOSTimerFocusV77?.duration?.(s,now)||0}
 function dayDuration(s,now){
 const d=new Date(now);d.setHours(0,0,0,0);const midnight=d.getTime();
 return (s?.segments||[]).reduce((ms,z)=>{
  const a=Math.max(midnight,Number(z.start)),end=z.end==null?(s.status==='running'?now:z.start):Number(z.end),b=Math.min(now,end);
  return ms+(Number.isFinite(a)&&Number.isFinite(b)&&b>a?b-a:0);
 },0);
}

 function clock(ms){return root.LifeOSTimerFocusV77?.clock?.(ms)||'00:00:00'}
 function render(){
  const all=active(sessions()),s=choose(all,current);
  if(!s){current=null;box.hidden=true;return}
  box.hidden=false;current=String(s.id);
  get('lo86-name').textContent=(s.status==='paused'?'Paused: ':'')+String(s.name||'Activity');
  get('lo86-clock').textContent=clock(dayDuration(s,Date.now()));
  const sig=all.map(x=>String(x.id)+'|'+x.status+'|'+x.name).join(';');
  if(sig!==previous){
   previous=sig;pick.replaceChildren();
   for(const x of all){const option=new Option((x.status==='paused'?'Ⅱ ':'▶ ')+String(x.name||'Activity'),String(x.id));pick.add(option)}
  }
  pick.value=current;
  box.querySelector('[data-lo86="pause"]').textContent=s.status==='paused'?'Resume':'Pause';
  box.querySelector('[data-lo86="break"]').hidden=s.status==='paused';
 }
 pick.addEventListener('change',()=>{current=pick.value;render()});
 toggle.addEventListener('click',()=>{details.hidden=!details.hidden;toggle.setAttribute('aria-expanded',String(!details.hidden));toggle.textContent=details.hidden?'⌃':'⌄'});
 details.addEventListener('click',e=>{
  const button=e.target.closest('[data-lo86]');if(!button)return;
  const s=choose(sessions(),current);if(!s)return;
  let action=button.dataset.lo86;
  if(action==='review'){root.LifeOSReviewTimer?.(s.id);return}
  if(action==='pause')action=s.status==='paused'?'resume':'pause';
  if(action==='finish'&&!root.confirm('Finish '+String(s.name||'activity')+' now?'))return;
  const detail={id:String(s.id),action,result:{ok:false,message:'Timer action unavailable.'}};
  root.dispatchEvent(new CustomEvent('lifeos-v77-timer-action',{detail}));
  status.textContent=detail.result?.message||'Unable to update timer.';
  render();
 });
 root.addEventListener('lifeos-v77-tracking-changed',render);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 root.addEventListener('pageshow',render);root.addEventListener('focus',render);
 root.setInterval(()=>{if(!document.hidden)render()},1000);render();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {active,choose};
});