/* LifeOS V130 — Active Sessions cockpit. Presentation-only: original handlers remain. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSActiveCockpitV130=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const $=id=>root.document.getElementById(id);
const node=(tag,cls,text)=>{const x=root.document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
const minutes=n=>{const t=Math.floor(Math.max(0,Number(n)||0)/60000);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');};
function active(){try{return (root.lifeosReadOnlyWorkspace?.()?.sessions||[]).filter(s=>s&&['running','paused'].includes(s.status))}catch{return []}}
function elapsed(s,t=Date.now()){
 if(root.LifeOSTimerFocusV77?.duration)return root.LifeOSTimerFocusV77.duration(s,t);
 return (s?.segments||[]).reduce((v,g)=>v+Math.max(0,(Number.isFinite(g.end)?g.end:t)-g.start),0);
}
function setup(){
 const host=$('trackActivePanel'),primary=$('lo77-timer-quick'),details=$('lo128SessionsDetails');
 if(!host||!primary||!details)return false;
 host.classList.add('lo130-cockpit');
 const h=host.querySelector(':scope > .head');
 if(h){const title=h.querySelector('h2');if(title)title.textContent='Your live activity';const sub=h.querySelector('.sub');if(sub)sub.textContent='Focus on one session. Others remain accessible below.'}
 let hero=$('lo130LiveHeading');
 if(!hero){
  hero=node('div','lo130-heading');hero.id='lo130LiveHeading';
  hero.append(node('span','lo130-kicker','LIVE · IN PROGRESS'),node('span','lo130-live-dot','● Tracking'));
  primary.before(hero);
 }
 const bar=primary.querySelector('.lo77-timer-line');if(bar)bar.classList.add('lo130-timer-line');
 const actions=primary.querySelector('.lo77-actions');if(actions)actions.classList.add('lo130-actions');
 let switcher=$('lo130OtherSessions');
 if(!switcher){switcher=node('section','lo130-other');switcher.id='lo130OtherSessions';primary.after(switcher)}
 const setting=$('lo126TimerSettings');
 if(setting){
  setting.classList.add('lo130-tools');
  const summary=setting.querySelector(':scope > summary');if(summary)summary.textContent='Timer preferences & recovery tools';
 }
 const smart=$('lo78-duration');
 if(smart&&!smart.dataset.lo130Ready){
  smart.dataset.lo130Ready='1';smart.classList.add('lo130-smart');
  const heading=smart.querySelector('h3');if(heading)heading.textContent='Set a timer limit';
  const intro=smart.querySelector(':scope > p.sub');if(intro)intro.textContent='Get a reminder at your chosen duration, or explicitly opt in to automatic finishing.';
  const field=$('lo78-minutes');
  if(field){
   const row=node('div','lo130-preset-row');row.setAttribute('role','group');row.setAttribute('aria-label','Quick duration choices');
   for(const m of [15,30,45,60]){
    const b=node('button','lo130-preset',m+' min');b.type='button';b.dataset.minutes=String(m);
    b.addEventListener('click',()=>{field.value=String(m);field.dispatchEvent(new Event('input',{bubbles:true}));updatePresets()});row.append(b);
   }
   field.after(row);field.addEventListener('input',updatePresets);
  }
  const mode=$('lo78-mode');
  if(mode){const hint=node('p','lo130-mode-tip','Reminder is the safer default. Auto-finish must be selected deliberately for each timer.');mode.after(hint)}
  const footer=smart.querySelector(':scope > small.sub');
  if(footer&&!$('lo130SafetyNotes')){
   const d=node('details','lo130-safety');d.id='lo130SafetyNotes';
   d.append(node('summary','','How timer limits and estimates work'));footer.before(d);d.append(footer);
  }
 }
 updatePresets();render();
 return true;
}
function updatePresets(){
 const val=Number($('lo78-minutes')?.value);
 for(const b of root.document.querySelectorAll('#lo78-duration .lo130-preset'))b.setAttribute('aria-pressed',String(Number(b.dataset.minutes)===val));
}
function render(){
 const switcher=$('lo130OtherSessions'),hero=$('lo130LiveHeading');if(!switcher)return;
 const list=active(),selectedName=$('lo77-name')?.textContent?.trim()||'';
 const clock=$('lo77-timer-quick');
 if(hero)hero.hidden=!list.length;
 if(!list.length){switcher.replaceChildren();switcher.hidden=true;return}
 switcher.hidden=false;
 // Mirror the existing V77 primary selection by its exact display name.
 // Name collisions are handled safely by making every card a review link.
 const current=list.find(s=>s.name===selectedName);
 const other=list.filter(s=>s!==current);
 const label=node('div','lo130-other-heading');
 label.append(node('strong','','OTHER ACTIVE SESSIONS'),node('span','',String(other.length)));
 switcher.replaceChildren(label);
 if(!other.length){
  switcher.append(node('p','lo130-other-empty','One activity in progress. You can start another alongside it.'));
 }else{
  for(const s of other){
   const b=node('button','lo130-session-tile');b.type='button';
   b.setAttribute('aria-label','Review '+String(s.name||'activity'));
   const icon=node('span','lo130-session-icon',String(s.name||'').toLowerCase().includes('distraction')?'↯':'◉');
   const middle=node('span','lo130-session-middle');
   middle.append(node('strong','',String(s.name||'Activity')),node('small','',(s.status==='paused'?'Paused':'Running')+' · Tap to review'));
   const dur=node('span','lo130-session-duration',minutes(elapsed(s)));
   b.append(icon,middle,dur);
   b.addEventListener('click',()=>{
    // Using the public V77 reviewer retains its original selection and
    // opens the exact session details, with no session writes.
    const d=$('lo128SessionsDetails');if(d)d.open=true;
    const settings=$('lo126TimerSettings');if(settings)settings.open=false;
    if(typeof root.LifeOSReviewTimer==='function')root.LifeOSReviewTimer(s.id);
   });
   switcher.append(b);
  }
 }
 // Native V77 selected timer handles all Finish/Pause/Resume actions.
 if(clock)clock.classList.toggle('lo130-multiple',list.length>1);
 const d=$('lo128SessionsDetails');if(d){const heading=d.querySelector(':scope > summary');if(heading)heading.textContent='Session details & advanced controls · '+list.length}
}
function init(){
 if(!setup())return;
 const update=()=>{if(root.document.body.dataset.lifeosView==='tracking'){render();updatePresets()}};
 root.addEventListener('lifeos-v77-tracking-changed',update);
 root.addEventListener('focus',update);
 root.setInterval(update,3000);
}
function boot(){root.setTimeout(init,2300);root.setTimeout(()=>{if(!$('lo130LiveHeading'))init()},4000)}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()}
return {elapsed,minutes};
});
