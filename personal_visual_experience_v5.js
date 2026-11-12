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
    const button=group.querySelector('[data-lo-life-section="'+item.key+'"]');
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
/* V11: read-only storage health visibility. Never repairs, replaces or writes activity data. */
function initStorageHealth(){
 const active=document.getElementById('trackActivePanel');
 if(!active||document.getElementById('loStorageHealth'))return;
 const indicator=document.createElement('div');indicator.id='loStorageHealth';
 indicator.className='lo-storage-health';indicator.setAttribute('role','status');
 indicator.setAttribute('aria-live','off');
 indicator.innerHTML='<strong>Storage status</strong><span class="lo-storage-health-state">Checking this device…</span><small>Local data stays on this device unless private cloud sync is connected.</small>';
 active.insertAdjacentElement('afterend',indicator);
 const status=indicator.querySelector('.lo-storage-health-state');
 const detail=indicator.querySelector('small');
 function inspect(){
  if(document.body.dataset.lifeosView!=='tracking')return;
  try{
   const raw=localStorage.getItem('lifeos-v4-stage21-atomic');
   const journalRaw=localStorage.getItem('lifeos-v4-stage11-outbox');
   const syncRaw=localStorage.getItem('lifeos-v4-sync-meta');
   const legacy=localStorage.getItem('lifeos-live-v1');
   const record=raw===null?null:JSON.parse(raw);
   const valid=record&&record.format===1&&record.workspace?.version===1&&Array.isArray(record.workspace.sessions)&&Array.isArray(record.journal)&&record.meta&&typeof record.meta==='object';
   if(raw!==null&&!valid)throw new Error('Recovery record needs review');
   const queue=valid?record.journal:(journalRaw===null?[]:JSON.parse(journalRaw));
   if(!Array.isArray(queue))throw new Error('Offline journal needs review');
   const meta=valid?record.meta:(syncRaw?JSON.parse(syncRaw):{});
   const pending=queue.length;
   const hasLocal=!!valid||!!legacy;
   const revision=Number.isInteger(meta?.revision)?meta.revision:null;
   const hasSyncMessage=(document.getElementById('syncStatus')?.textContent||'');
   const connected=/^Synced to server|^Loaded from server/.test(hasSyncMessage)&&pending===0;
   indicator.dataset.health='ok';
   status.textContent=!hasLocal?'No stored sessions yet':connected?'Synced server copy available':pending?'Saved on device · '+pending+' change'+(pending===1?'':'s')+' not confirmed on server':'Saved on device';
   detail.textContent=hasLocal?(revision===null?'Browser storage confirmed · cloud sync not verified':'Server revision '+revision+' last acknowledged · current data kept locally'):'Activity history will be stored here when you start tracking.';
  }catch(_){
   indicator.dataset.health='warning';
   status.textContent='Storage needs attention';
   detail.textContent='The saved record could not be inspected. Do not clear browser data. Review recovery options in Track.';
  }
 }
 document.getElementById('lifeosNavigation')?.addEventListener('click',()=>setTimeout(inspect,80));
 window.addEventListener('focus',inspect);
 window.addEventListener('storage',inspect);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)inspect()});
 setInterval(()=>{if(!document.hidden)inspect()},15000);
 setTimeout(inspect,70);
}
/* V12: verify the live server storage without downloading or altering a workspace. */
function initServerStorageProbe(){
 const panel=document.getElementById('cloudSyncPanel'),token=document.getElementById('syncToken');
 if(!panel||!token||document.getElementById('loVerifyStorage'))return;
 const button=document.createElement('button');button.type='button';button.className='btn outline';
 button.id='loVerifyStorage';button.textContent='Check server storage (read-only)';
 const feedback=document.createElement('p');feedback.id='loServerStorageResult';
 feedback.className='note';feedback.setAttribute('role','status');feedback.textContent='Checks the configured backend and revision. No activities are retrieved or changed.';
 const status=document.getElementById('syncStatus');
 if(status){status.insertAdjacentElement('afterend',feedback);feedback.insertAdjacentElement('beforebegin',button)}
 else{panel.append(button,feedback)}
 button.addEventListener('click',async()=>{
  if(!token.value.trim()){feedback.textContent='Enter your private sync token first. No request sent.';return}
  button.disabled=true;feedback.textContent='Checking server storage without reading activities…';
  try{
   const res=await fetch('/api/storage/status',{headers:{'X-LifeOS-Token':token.value.trim()},cache:'no-store'});
   const body=await res.json();
   if(!res.ok)throw new Error(res.status===401?'Token rejected':body.error||'Storage probe failed');
   if(body.read_only!==true||body.storage_readable!==true)throw new Error('Storage status did not confirm a readable backend');
   feedback.textContent='Server database: '+(body.backend==='postgresql'?'PostgreSQL':body.backend==='sqlite'?'SQLite':'Unknown')+' · revision '+body.revision+(body.has_state?' · saved workspace present':' · no server workspace yet')+'. Read-only verification; multi-device sync not yet confirmed.';
  }catch(e){feedback.textContent='Server storage not verified: '+e.message+'. Your local activity records were not changed.'}
  finally{button.disabled=false}
 });
}
function start(){init();enhanceViews();initStorageHealth();initServerStorageProbe();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
