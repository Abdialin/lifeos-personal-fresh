/* LifeOS Personal V5: presentation preferences only. Never writes activity or schedule data. */
(function(){
'use strict';
const KEY='lifeos.personal.theme.v5';
function storedTheme(){try{return localStorage.getItem(KEY)==='light'?'light':'dark'}catch(_){return 'dark'}}
function saveTheme(value){try{localStorage.setItem(KEY,value)}catch(_){}}
function init(){
 const root=document.documentElement,top=document.querySelector('.top'),status=document.getElementById('status');
 if(!top||top.querySelector('.lifeos-theme-toggle'))return;
 let current=storedTheme();
 const actions=document.createElement('div');actions.className='lifeos-header-actions';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='lifeos-theme-toggle';
 function apply(value){current=value;root.dataset.lifeosTheme=value;
  toggle.textContent=value==='dark'?'☀ Light mode':'☾ Dark mode';
  toggle.setAttribute('aria-label',value==='dark'?'Switch to light mode':'Switch to dark mode');
  toggle.setAttribute('aria-pressed',String(value==='light'));
  toggle.title='Change colour theme; your activity and plans are unaffected';
 }
 if(status)actions.appendChild(status);
 actions.appendChild(toggle);top.appendChild(actions);
 toggle.addEventListener('click',()=>{const next=current==='dark'?'light':'dark';saveTheme(next);apply(next)});
 apply(current);
}

/* V6 presentation enhancement. Layout and disclosure state only; no workspace writes. */
function enhanceViews(){
 const nav=document.getElementById('lifeosNavigation'),heading=document.getElementById('lifeosViewTitle');
 if(!nav||!heading||document.getElementById('lifeosViewIntro'))return;
 const descriptions={
  dashboard:'Your priorities, activity and progress — all in one calm overview.',
  tracking:'Start an activity, manage your timers, or review previous sessions.',
  schedule:'Compare your reality with your plans, then review suggested changes.',
  goals:'Focus on the next action and follow your progress over time.',
  analytics:'Understand your time with clear, evidence-based visual summaries.',
  life:'Explore routines, wellbeing and personal development in one place.'
 };
 const subtitle=document.createElement('p');subtitle.id='lifeosViewIntro';subtitle.className='lo-view-intro';
 heading.insertAdjacentElement('afterend',subtitle);
 function refresh(){
  const view=document.body.dataset.lifeosView||'dashboard';
  subtitle.textContent=descriptions[view]||descriptions.dashboard;
 }
 nav.addEventListener('click',()=>window.setTimeout(refresh,0));
 window.addEventListener('hashchange',()=>window.setTimeout(refresh,0));
 refresh();
 const labelChanges={
  trackingRecoveryPanel:'Timer recovery',activityHierarchyPanel:'Linked activities',
  calendarHandoffPanel:'Calendar transfer review',calendarChangePanel:'Calendar change approvals',
  personalCompletionPanel:'Planning review tools',weeklyDashboardPanel:'Weekly data quality',
  qualityPanel:'Daily data quality',intelligencePanel:'Pattern confidence',
  personalActivityPanel:'Personal routines & recovery'
 };
 for(const [id,label] of Object.entries(labelChanges)){
  const panel=document.getElementById(id);const title=panel?.querySelector('h2');
  if(title)title.textContent=label;
 }
 const optional={
  trackingRecoveryPanel:'Timer recovery options',
  activityHierarchyPanel:'Activity relationships',
  calendarHandoffPanel:'Calendar transfer controls',
  calendarChangePanel:'Calendar approval details',
  personalCompletionPanel:'Additional planning tools',
  weeklyDashboardPanel:'Detailed weekly report',
  qualityPanel:'Data quality report',
  intelligencePanel:'Pattern evidence tools',
  sessionToolsPanel:'Backup and restore controls',
  connectedDatabasePanel:'External database information',
  cloudSyncPanel:'Private cloud synchronization',
  trackPastPanel:'Manual activity entry'
 };
 for(const [id,caption] of Object.entries(optional)){
  const panel=document.getElementById(id),title=panel?.querySelector(':scope > h2');
  if(!title||panel.querySelector('.lo-advanced-toggle'))continue;
  const key='lifeos.personal.disclosure.'+id;
  let expanded=false;
  try{expanded=sessionStorage.getItem(key)==='open'}catch(_){}
  const button=document.createElement('button');button.type='button';
  button.className='lo-advanced-toggle';button.setAttribute('aria-expanded',String(expanded));
  button.setAttribute('aria-label',caption);
  function apply(value){
   expanded=value;panel.classList.toggle('lo-advanced-collapsed',!value);
   button.setAttribute('aria-expanded',String(value));
   button.textContent=value?'− Hide details':'+ Show details';
   try{sessionStorage.setItem(key,value?'open':'closed')}catch(_){}
  }
  title.insertAdjacentElement('afterend',button);
  button.addEventListener('click',()=>apply(!expanded));
  apply(expanded);
 }
}
function start(){init();enhanceViews();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
