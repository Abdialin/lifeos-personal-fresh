/* LifeOS V127: focused Track surfaces — Live / History / Review.
   Pure DOM navigation. All original tracking controls and listeners preserved.
   Existing layout remains intact and reappears on other app views. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSTrackFocusV127=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const $=id=>root.document.getElementById(id);
const element=(tag,cls,text)=>{const n=root.document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const MODES=['live','history','review'];
function makeTab(mode,label,icon){
 const b=element('button','lo127-tab');b.type='button';b.dataset.lo127Tab=mode;
 b.setAttribute('role','tab');b.setAttribute('aria-controls','lo127-'+mode);
 b.append(element('span','lo127-icon',icon),element('span','',label));return b;
}
function applyMode(mode){
 if(!MODES.includes(mode))mode='live';
 const rootEl=$('lo127TrackSurface');if(!rootEl)return 'live';
 rootEl.dataset.mode=mode;
 root.document.body.dataset.lo127Mode=mode;
 for(const b of rootEl.querySelectorAll('[data-lo127-tab]')){
  const selected=b.dataset.lo127Tab===mode;
  b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;
 }
 for(const pane of rootEl.querySelectorAll('[data-lo127-pane]')){
  pane.hidden=pane.dataset.lo127Pane!==mode;
 }
 return mode;
}
function moveInto(target,id){const item=$(id);if(item&&target&&!target.contains(item))target.append(item);return item}
function attach(){
 if($('lo127TrackSurface'))return;
 const guide=$('lo126TrackGuide'),active=$('trackActivePanel'),quick=$('trackQuickPanel'),history=$('trackHistoryPanel'),title=$('lifeosViewTitle');
 if(!guide||!active||!quick||!history||!title)return;
 const rootEl=element('section','lo127-track-surface');
 rootEl.id='lo127TrackSurface';rootEl.setAttribute('aria-label','Track workspace');
 title.after(rootEl);
 moveInto(rootEl,'lo126TrackGuide');
 const nav=element('div','lo127-segments');
 nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Track sections');
 nav.append(makeTab('live','Live','◉'),makeTab('history','History','▥'),makeTab('review','Review','✦'));
 rootEl.append(nav);
 for(const [mode,label] of [['live','Start tracking and manage timers'],['history','Activity history and corrections'],['review','Additional tracking and evidence tools']]){
  const pane=element('div','lo127-pane');
  pane.dataset.lo127Pane=mode;pane.id='lo127-'+mode;
  pane.setAttribute('role','tabpanel');pane.setAttribute('aria-label',label);
  rootEl.append(pane);
 }
 const live=$('lo127-live'),archive=$('lo127-history'),review=$('lo127-review');
 const intro=element('div','lo127-live-intro');
 intro.append(element('strong','','Start, pause and finish'),element('small','','The live clock stays prominent. Additional settings are optional.'));
 live.append(intro);
 moveInto(live,'trackActivePanel');moveInto(live,'trackQuickPanel');
 moveInto(live,'trackDistractionPanel');
 const archiveIntro=element('div','lo127-pane-intro');
 archiveIntro.append(element('strong','','Your recording history'),
  element('small','','Search and correct sessions; historical examples remain labeled.'));
 archive.append(archiveIntro);
 moveInto(archive,'trackHistoryPanel');moveInto(archive,'lo126PastDetails');moveInto(archive,'lo126TotalsDetails');
 // The visual analytics chart is useful, but should not block access to search
 // and edit controls. Keep it one tap away below the history filters.
 const chart=$('lo126WeekChart'),toolbar=history.querySelector('.lo-history-toolbar');
 if(chart&&toolbar&&!$('lo127WeekDetails')){
  const chartDetails=element('details','lo127-week-details');
  chartDetails.id='lo127WeekDetails';
  chartDetails.append(element('summary','','▥ Seven-day recording chart'));
  toolbar.after(chartDetails);chartDetails.append(chart);
 }
 const reviewIntro=element('div','lo127-pane-intro');
 reviewIntro.append(element('strong','','Optional analysis and tools'),
  element('small','','Technical diagnostics and detailed reports are available on demand.'));
 review.append(reviewIntro);
 const insights=element('div','lo127-review-links');
 const visit=(label,view)=>{const b=element('button','lo127-link',label+' ↗');b.type='button';b.addEventListener('click',()=>document.querySelector('#lifeosNavigation button[data-view="'+view+'"]')?.click());return b};
 insights.append(visit('Explore Insights','analytics'),visit('Improve your Plan','schedule'));
 review.append(insights);
 // V126 has already collected many optional panels into a single details shell.
 moveInto(review,'lo126TrackExtras');
 // If older module panels were added later as separate page-level sections,
 // hide their distracting Track display without unmounting their handlers.
 // Explicit review access only moves panels currently assigned to Track.
 const external=element('details','lo127-legacy-details');
 external.id='lo127AdditionalReports';
 external.append(element('summary','','Other tracking reports'));
 const holder=element('div','lo127-legacy-list');external.append(holder);
 review.append(external);
 const excluded=new Set(['trackActivePanel','trackQuickPanel','trackDistractionPanel','trackHistoryPanel','trackPastPanel','todayLegacyOverviewPanel']);
 function collect(){
  if(document.body.dataset.lifeosView!=='tracking')return;
  const layout=document.querySelector('.layout');if(!layout)return;
  for(const p of [...layout.querySelectorAll('section.panel')]){
   if(excluded.has(p.id)||p.closest('#lo127TrackSurface,#lo14SettingsHub,#lo12CalendarTools,#lo14EvidenceDetails,#lo12DevDetails'))continue;
   if(p.hidden||p.classList.contains('lifeos-hidden-panel'))continue;
   // Avoid moving nested panels: only independent top-level panel components.
   if(p.parentElement?.closest('section.panel'))continue;
   if(p.dataset.lifeosArea&&p.dataset.lifeosArea!=='tracking')continue;
   if(holder.contains(p))continue;
   const section=element('details','lo127-report');
   section.append(element('summary','',p.querySelector('h2,h3')?.textContent?.trim()||'Tracking detail'));
   section.append(p);holder.append(section);
  }
  external.hidden=holder.children.length===0;
 }
 const activate=mode=>{
  const result=applyMode(mode);
  if(result==='review')collect();
  return result;
 };
 nav.addEventListener('click',e=>{const b=e.target.closest('[data-lo127-tab]');if(b){activate(b.dataset.lo127Tab)}});
 nav.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  const current=MODES.indexOf(rootEl.dataset.mode);
  const next=e.key==='Home'?0:e.key==='End'?2:(current+(e.key==='ArrowRight'?1:2))%3;
  activate(MODES[next]);nav.querySelector('[data-lo127-tab="'+MODES[next]+'"]')?.focus();e.preventDefault();
 });
 // Keep existing quick action destinations working even after switching panes.
 guide.querySelectorAll('.lo126-action').forEach((b,i)=>b.addEventListener('click',()=>{
  if(i===2)activate('history');else activate('live');
 },{capture:true}));
 const navMain=document.querySelector('#lifeosNavigation');
 navMain?.addEventListener('click',e=>{
  if(e.target.closest('[data-view="tracking"]'))root.setTimeout(()=>{applyMode(rootEl.dataset.mode||'live');},60);
 });
 // A jump initiated from the existing V77 floating timer should always reveal
 // the Live surface before scrolling into Active Sessions.
 document.addEventListener('click',e=>{
  if(e.target.closest('#lo86-timer [data-lo86="review"],#lo77-timer-quick [data-v77-action="review"]'))activate('live');
 },true);
 activate('live');
 root.setTimeout(collect,350);
}
function boot(){root.setTimeout(attach,1050)}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()}
return {applyMode,MODES};
});
