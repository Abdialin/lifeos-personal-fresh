/* LifeOS V76 — deterministic My Life navigation and health of activity sections.
 * UI-only repair; no activity record writes. */
(function(root){'use strict';
const choose=(key)=>{
 const lookup={
  routines:document.getElementById('personalActivityPanel'),
  fitness:document.getElementById('fitnessForm')?.closest('section.panel'),
  nutrition:document.getElementById('mealForm')?.closest('section.panel'),
  habits:document.getElementById('lo32HabitHub'),
  friends:document.getElementById('lo32FriendHub')
 };
 if(key!=='overview'&&!lookup[key])key='overview';
 const inLife=document.body.dataset.lifeosView==='life';
 for(const [name,panel] of Object.entries(lookup)){
  if(!panel)continue;
  const active=inLife&&(name===key||(key==='routines'&&name==='habits'));
  panel.hidden=!active;
  panel.classList.toggle('lifeos-hidden-panel',!active);
  panel.classList.toggle('lo-life-inactive',!active);
  panel.setAttribute('aria-hidden',String(!active));
 }
 document.body.dataset.loLifeSection=key;
 const tabs=document.getElementById('loLifeSectionTabs');
 for(const button of tabs?.querySelectorAll('button[data-lo-life-section]')||[]){
  const active=button.dataset.loLifeSection===key;
  button.setAttribute('aria-pressed',String(active));
  button.setAttribute('aria-selected',String(active));
 }
 const visual=document.getElementById('loLifeVisual');
 if(visual)visual.hidden=!inLife||key!=='overview';
 return {key,inLife,available:Object.fromEntries(Object.entries(lookup).map(([k,v])=>[k,!!v]))};
};
function setup(){
 const tabs=document.getElementById('loLifeSectionTabs');
 if(!tabs)return;
 const oldHabit=tabs.querySelector('[data-lo-life-section="habits"]');if(oldHabit)oldHabit.hidden=true;
 const overview=document.createElement('button');overview.type='button';overview.dataset.loLifeSection='overview';overview.textContent='Overview';tabs.prepend(overview);
 const routine=tabs.querySelector('[data-lo-life-section="routines"]');if(routine)routine.textContent='Routines';
 const perform=()=>choose(document.body.dataset.loLifeSection||'overview');
 tabs.addEventListener('click',e=>{
  const button=e.target.closest('button[data-lo-life-section]');if(!button)return;
  // The legacy tab handlers run first. Reconcile all five sections after their handlers.
  root.setTimeout(()=>choose(button.dataset.loLifeSection),0);
 });
 const nav=document.getElementById('lifeosNavigation');
 nav?.addEventListener('click',()=>root.setTimeout(perform,0));
 root.addEventListener('hashchange',()=>root.setTimeout(perform,0));
 root.addEventListener('lifeos-v76-route-check',perform);
 root.setTimeout(()=>choose('overview'),0);
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
}
root.LifeOSLifeNavigationV76={choose};
})(typeof window!=='undefined'?window:globalThis);
