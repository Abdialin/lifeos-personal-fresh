/* LifeOS V77 — reliable active timer navigation and accessible quick controls.
 * In-app controls only. Device notification from V16 is preserved; native Android
 * ongoing chronometer is NOT claimed or emulated via unreliable repeated alerts. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSTimerFocusV77=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
function choose(sessions,preferredId){
 const active=(Array.isArray(sessions)?sessions:[]).filter(s=>s&&['running','paused'].includes(s.status));
 if(!active.length)return null;
 return active.find(s=>String(s.id)===String(preferredId))||active.find(s=>s.status==='running')||active[0];
}
function duration(s,t=Date.now()){
 if(!s||!Array.isArray(s.segments))return 0;
 return s.segments.reduce((total,seg)=>{
  if(!seg||!Number.isFinite(seg.start))return total;
  const end=seg.end==null?(s.status==='running'?t:seg.start):Number(seg.end);
  return total+(Number.isFinite(end)?Math.max(0,end-seg.start):0);
 },0);
}
function clock(ms){
 const t=Math.floor(Math.max(0,ms)/1000);
 return String(Math.floor(t/3600)).padStart(2,'0')+':'+String(Math.floor(t/60)%60).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
}
function mount(){
 const panel=document.getElementById('trackActivePanel'),body=document.body;
 if(!panel||document.getElementById('lo77-timer-quick'))return;
 const top=document.createElement('div');top.id='lo77-timer-quick';top.className='lo77-quick';
 top.innerHTML='<div class="lo77-timer-line"><span class="lo77-led" aria-hidden="true">●</span><div class="lo77-name-group"><strong id="lo77-name">No active timer</strong><small id="lo77-count">0 active</small></div><strong id="lo77-clock" class="lo77-clock" role="timer">00:00:00</strong></div><div class="lo77-actions"><button type="button" class="btn outline" data-v77-action="review">Review timer</button><button type="button" class="btn outline" data-v77-action="pause">Pause</button><button type="button" class="btn outline" data-v77-action="resume">Resume</button><button type="button" class="btn danger" data-v77-action="finish">Finish activity</button></div><p class="lo77-message" id="lo77-status" role="status"></p>';
 panel.insertBefore(top,panel.querySelector('#sessions'));
 const name=top.querySelector('#lo77-name'),count=top.querySelector('#lo77-count'),timer=top.querySelector('#lo77-clock');
 const pause=top.querySelector('[data-v77-action="pause"]'),resume=top.querySelector('[data-v77-action="resume"]'),status=top.querySelector('#lo77-status');
 let currentId=null;
 const state=()=>{try{return root.lifeosReadOnlyWorkspace?.()?.sessions||[]}catch{return []}};
 function repaint(){
  const active=state().filter(s=>s&&['running','paused'].includes(s.status));
  const chosen=choose(active,currentId);
  if(!chosen){
   currentId=null;top.hidden=true;return;
  }
  currentId=String(chosen.id);
  top.hidden=false;
  name.textContent=String(chosen.name||'Activity');
  count.textContent=(chosen.status==='paused'?'Paused':'Running')+' · '+active.length+' open';
  timer.textContent=clock(duration(chosen,Date.now()));
  pause.hidden=chosen.status!=='running';resume.hidden=chosen.status!=='paused';
  const bottom=document.getElementById('lo32ActiveTimer');
  if(bottom&&!bottom.querySelector('[data-v77-action="review"]')){
   const old=bottom.querySelector('.lo32-open-tracker');
   if(old){old.textContent='Review timer →';old.dataset.v77Action='review';}
  }
 }
 function go(id){
  const item=choose(state(),id);
  if(!item){status.textContent='No active or paused timer to review.';return false}
  currentId=String(item.id);
  const tab=document.querySelector('#lifeosNavigation button[data-view="tracking"]');
  if(tab)tab.click();else root.location.hash='#tracking';
  const target=document.getElementById('trackActivePanel');
  // A stale router must not leave the user's timer completely inaccessible.
  if(target){target.hidden=false;target.classList.remove('lifeos-hidden-panel');target.setAttribute('aria-hidden','false')}
  root.setTimeout(()=>{
   const session=[...document.querySelectorAll('#sessions details[data-session-id]')].find(x=>x.dataset.sessionId===currentId);
   if(session){session.open=true;session.scrollIntoView({block:'center',behavior:'smooth'});session.classList.add('lo77-highlight');root.setTimeout(()=>session.classList.remove('lo77-highlight'),1800)}
   else target?.scrollIntoView({block:'start',behavior:'smooth'});
   repaint();
  },80);
  return true;
 }
 function act(action,id){
  const item=choose(state(),id||currentId);
  if(!item){status.textContent='No timer is available.';return}
  if(action==='review')return go(item.id);
  if(!['pause','resume','finish'].includes(action))return;
  if(action==='finish'&&!root.confirm('Finish '+item.name+' now? You can add details after saving.'))return;
  const request={id:String(item.id),action,result:{ok:false,message:'Timer operation unavailable.'}};
  root.dispatchEvent(new CustomEvent('lifeos-v77-timer-action',{detail:request}));
  status.textContent=request.result?.message||'Timer action could not be completed.';
  repaint();
 }
 top.addEventListener('click',event=>{
  const button=event.target.closest('[data-v77-action]');if(button)act(button.dataset.v77Action);
 });
 // Intercept old navigation BEFORE generic handlers consume the click.
 document.addEventListener('click',event=>{
  const button=event.target.closest('.lo32-open-tracker, #todayTimerSignal [data-today-jump="tracking"], #todayTimerSignal button');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  const bottom=document.getElementById('lo32ActiveTimer');
  act('review',bottom?.dataset.currentId||currentId);
 },true);
 root.LifeOSReviewTimer=id=>go(id);
 root.addEventListener('lifeos-v77-tracking-changed',repaint);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)repaint()});
 root.addEventListener('pageshow',repaint);
 root.addEventListener('focus',repaint);
 root.setInterval(()=>{if(!document.hidden)repaint()},1000);
 repaint();
}
const api={choose,duration,clock};
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
}
return api;
});
