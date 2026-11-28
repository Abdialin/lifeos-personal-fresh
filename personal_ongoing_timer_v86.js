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
 /* Today and Track can already present this timer. Restore the floating
    control as soon as its matching in-page clock leaves the viewport. */
 #lo86-timer.lo86-inline-visible{visibility:hidden;pointer-events:none}
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
 @media(max-width:750px){
  /* In Today the timer occupies its own sticky row rather than covering a
     control above the bottom navigation. Other sections retain their layout. */
  body.ap-today[data-lifeos-view="dashboard"]:not(.lo200-modal-open):not(.lo-track-dialog-open){overflow-x:clip}
  body[data-lifeos-view="dashboard"] .wrap>#lo86-timer{position:sticky;top:0;right:auto!important;bottom:auto;width:100%!important;max-width:none!important;margin:0 0 8px;padding:4px 8px!important;border-radius:11px}
  body.ap-today[data-lifeos-view="dashboard"] .wrap>#lo86-timer:not(#todayAPlus):not(#lifeosNavigation):not([hidden]):not(.lo86-inline-visible){display:block!important}
  body[data-lifeos-view="dashboard"] .wrap>#lo86-timer.lo86-inline-visible{display:none!important}
  body[data-lifeos-view="dashboard"] .wrap>#lo86-timer #lo86-name{display:block!important;max-width:none;font-size:12px}
  body[data-lifeos-view="dashboard"] #lo86-timer #lo86-toggle{min-width:44px!important;min-height:44px!important}
  body[data-lifeos-view="dashboard"] #lo86-timer:has(#lo86-details:not([hidden])) #lo86-name{display:block!important}
  body[data-lifeos-view="dashboard"]:has(#todayAPlus.ap-light) .wrap>#lo86-timer{background:#eaf4f1;color:#183047;border-color:#a3c7c0;box-shadow:0 4px 14px #274f4a33}
  body[data-lifeos-view="dashboard"]:has(#todayAPlus.ap-light) .wrap>#lo86-timer :is(button,select){background:#fff;color:#183047;border-color:#a3c7c0}
  body[data-lifeos-view="dashboard"]:has(#todayAPlus.ap-light) .wrap>#lo86-timer #lo86-status{color:#405f73}
  html:has(body[data-lifeos-view="dashboard"] .wrap>#lo86-timer:not([hidden]):not(.lo86-inline-visible)){scroll-padding-top:calc(var(--lo86-timer-height,54px) + 8px)}
  body[data-lifeos-view="dashboard"] #todayAPlus :is(button,summary,input,select,textarea){scroll-margin-top:calc(var(--lo86-timer-height,54px) + 8px)}
 }
 @media(max-width:520px){#lo86-timer{bottom:calc(84px + env(safe-area-inset-bottom,0px))}}
 `;document.head.append(style);
 const box=document.createElement('aside');box.id='lo86-timer';box.hidden=true;
 box.setAttribute('aria-label','Ongoing LifeOS activity timer');
 box.innerHTML='<div id="lo86-summary"><span aria-hidden="true">⏱</span><strong id="lo86-name">Active timer</strong><span id="lo86-clock" role="timer">00:00:00</span><button id="lo86-toggle" type="button" aria-controls="lo86-details" aria-expanded="false" aria-label="Show timer controls">⌃</button></div><div id="lo86-details" hidden><select id="lo86-select" aria-label="Choose active or paused activity"></select><button type="button" data-lo86="review">Review</button><button type="button" data-lo86="pause">Pause</button><button type="button" data-lo86="break">Break</button><button type="button" data-lo86="finish">Finish</button><p id="lo86-status" role="status"></p></div>';
 const header=document.querySelector('main.wrap > header.top');
 // Only Today uses the in-flow row. Keeping the original body placement on
 // other screens avoids inheriting their view-specific content-hiding rules.
 function placeTimer(){
  const row=header&&document.body.dataset.lifeosView==='dashboard'&&root.matchMedia('(max-width:750px)').matches;
  if(row){if(box.parentElement!==header.parentElement||box.previousElementSibling!==header)header.insertAdjacentElement('afterend',box)}
  else if(box.parentElement!==document.body)document.body.append(box);
 }
 placeTimer();
 if(root.ResizeObserver)new root.ResizeObserver(()=>document.documentElement.style.setProperty('--lo86-timer-height',Math.ceil(box.getBoundingClientRect().height)+'px')).observe(box);
 const get=id=>box.querySelector('#'+id),pick=get('lo86-select'),details=get('lo86-details'),toggle=get('lo86-toggle'),status=get('lo86-status');
 const sessions=()=>{try{return root.lifeosReadOnlyWorkspace?.()?.sessions||[]}catch{return []}};
 let current=null,currentSession=null,previous='';
 let visibilityFrame=0;
 function updateInlineVisibility(){
  visibilityFrame=0;
  let row=null,shownId=null;
  if(details.hidden&&document.body.dataset.lifeosView==='tracking'){
   row=document.querySelector('#caLive:not([hidden]) .ca-live-primary-row');
   shownId=row?.closest('.ca-primary')?.querySelector('[data-ca-act][data-ca-id]')?.dataset.caId;
  }else if(details.hidden&&document.body.dataset.lifeosView==='dashboard'){
   row=document.querySelector('#apPage0:not([hidden]) .ap-v1-live-row');
   shownId=row?.querySelector('[data-ap-live-clock]')?.dataset.apLiveClock;
  }
  const selected=currentSession,now=Date.now(),day=new Date(now);day.setHours(0,0,0,0);
  const segments=selected?.segments;
  const priorDay=Array.isArray(segments)&&segments.some(part=>{
   const start=Number(part.start),end=part.end==null?(selected.status==='running'?now:start):Number(part.end);
   return Number.isFinite(start)&&Number.isFinite(end)&&start<day.getTime()&&Math.min(end,day.getTime())>start;
  });
  const rect=row?.getBoundingClientRect(),viewport=root.visualViewport;
  const top=viewport?.offsetTop||0,viewportBottom=top+(viewport?.height||root.innerHeight);
  // When the sticky Today timer is displayed it occupies the top of the
  // visible area. Account for that area before hiding it as a duplicate.
  const timerStyle=getComputedStyle(box),stickyToday=timerStyle.position==='sticky'&&timerStyle.display!=='none';
  const visibleTop=top+(stickyToday?box.getBoundingClientRect().height:0);
  const nav=document.getElementById('lifeosNavigation');
  const bottom=nav&&getComputedStyle(nav).position==='fixed'?Math.min(viewportBottom,nav.getBoundingClientRect().top):viewportBottom;
  // The floating clock shows today's portion. For overnight activities keep
  // it visible, since the in-page clock shows a different full duration.
  const visible=!!(rect&&rect.width>0&&rect.height>0&&rect.top>=visibleTop&&rect.bottom<=bottom&&String(shownId)===String(current)&&Array.isArray(segments)&&segments.length&&!priorDay);
  box.classList.toggle('lo86-inline-visible',visible);
 }
 function queueInlineVisibility(){if(!visibilityFrame)visibilityFrame=root.requestAnimationFrame(updateInlineVisibility)}
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
  const all=active(sessions()),s=choose(all,current);currentSession=s;
  if(!s){current=null;box.hidden=true;box.classList.remove('lo86-inline-visible');return}
  box.hidden=false;current=String(s.id);
  box.setAttribute('aria-label',(s.status==='paused'?'Paused activity timer: ':'Running activity timer: ')+String(s.name||'Activity'));
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
  queueInlineVisibility();
 }
 pick.addEventListener('change',()=>{current=pick.value;render()});
 toggle.addEventListener('click',()=>{details.hidden=!details.hidden;toggle.setAttribute('aria-expanded',String(!details.hidden));toggle.textContent=details.hidden?'⌃':'⌄';queueInlineVisibility()});
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
 root.addEventListener('scroll',queueInlineVisibility,{passive:true});
 root.addEventListener('resize',()=>{placeTimer();queueInlineVisibility()},{passive:true});
 root.visualViewport?.addEventListener('resize',queueInlineVisibility,{passive:true});
 root.visualViewport?.addEventListener('scroll',queueInlineVisibility,{passive:true});
 document.addEventListener('click',e=>{if(e.target.closest('#lifeosNavigation [data-view],#loTrackConceptA [data-ca-tab],#todayAPlus [data-ap-tab]'))queueInlineVisibility()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 if(root.MutationObserver)new root.MutationObserver(()=>{placeTimer();queueInlineVisibility()}).observe(document.body,{attributes:true,attributeFilter:['data-lifeos-view']});
 root.addEventListener('pageshow',render);root.addEventListener('focus',render);
 root.setInterval(()=>{if(!document.hidden)render()},1000);render();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {active,choose};
});
