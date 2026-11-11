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
  smartSchedulePanel:'Advanced schedule analysis and routine configuration',
  calendarReviewPanel:'Optional calendar import',
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

 /* V8: Goals and My Life retain their records but expose editor forms only on demand. */
 const formDefinitions=[
  ['todoForm','Add task','To-do list'],
  ['goalForm','Add goal','Weekly goals'],
  ['fitnessForm','Log workout','Fitness Studio'],
  ['mealForm','Log meal','Nutrition'],
  ['personalLogForm','Log routine','Personal routines']
 ];
 for(const [id,action,label] of formDefinitions){
  const form=document.getElementById(id),panel=form?.closest('section.panel');
  if(!form||!panel||panel.querySelector('[data-lo-form-toggle]'))continue;
  const title=panel.querySelector('h2');
  if(!title)continue;
  const bar=document.createElement('div');bar.className='lo-editor-bar';
  bar.innerHTML='<span class="lo-editor-label">'+label+'</span>';
  const toggle=document.createElement('button');toggle.type='button';
  toggle.className='lo-editor-toggle';toggle.dataset.loFormToggle=id;
  toggle.setAttribute('aria-controls',id);
  toggle.setAttribute('aria-expanded','false');
  function apply(open,focus=false){
   form.hidden=!open;
   toggle.setAttribute('aria-expanded',String(open));
   toggle.textContent=open?'− Close editor':'+ '+action;
   panel.classList.toggle('lo-editor-open',open);
   if(open&&focus)form.querySelector('input:not([type="hidden"]),select,textarea')?.focus();
  }
  bar.append(toggle);title.insertAdjacentElement('afterend',bar);
  title.classList.add('lo-editor-heading');
  toggle.addEventListener('click',()=>apply(form.hidden,true));
  form.addEventListener('submit',()=>window.setTimeout(()=>apply(false),180));
  apply(false);
 }
 /* My Life: three clear workspaces, one visible editor area at a time. */
 const lifeSections=[
  ['personalLogForm','routines','Routines'],
  ['fitnessForm','fitness','Fitness'],
  ['mealForm','nutrition','Nutrition']
 ].map(([formId,key,label])=>({panel:document.getElementById(formId)?.closest('section.panel'),key,label}));
 if(lifeSections.every(x=>x.panel)&&!document.getElementById('loLifeSectionTabs')){
  const group=document.createElement('nav');group.id='loLifeSectionTabs';
  group.className='lo-life-tabs';group.setAttribute('aria-label','My Life sections');
  const area=lifeSections[0].panel.parentElement;
  area.insertBefore(group,lifeSections[0].panel);
  let selected='routines';
  const activate=key=>{
   selected=key;
   for(const item of lifeSections){
    const show=item.key===key;
    item.panel.classList.toggle('lo-life-inactive',!show);
    const button=group.querySelector('[data-lo-life-section="'+key+'"]');
    if(button)button.setAttribute('aria-pressed',String(show));
   }
  };
  for(const {key,label} of lifeSections){
   const button=document.createElement('button');button.type='button';
   button.dataset.loLifeSection=key;button.textContent=label;
   button.addEventListener('click',()=>activate(key));
   group.appendChild(button);
  }
  activate(selected);
 }
 const planToggle=document.getElementById('v7TogglePlanForm');
 const planForm=document.getElementById('scheduleForm');
 if(planToggle&&planForm){
  function togglePlanForm(open,focus=false){
   planForm.hidden=!open;
   planToggle.setAttribute('aria-expanded',String(open));
   planToggle.textContent=open?'− Close editor':'+ Add plan';
   if(open&&focus)document.getElementById('scheduleName')?.focus();
  }
  planToggle.addEventListener('click',()=>togglePlanForm(planForm.hidden,true));
  planForm.addEventListener('submit',()=>window.setTimeout(()=>togglePlanForm(false),200));
  togglePlanForm(false);
 }
}
function start(){init();enhanceViews();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
