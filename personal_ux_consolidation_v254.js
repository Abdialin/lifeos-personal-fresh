/* LifeOS V254 — mobile UX consolidation, existing records and handlers retained.
 * Reduce repeated panels; bring high-frequency actions forward.
 * Never changes sessions, goals, schedules or background notification permissions. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSUXV254=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const $=id=>root.document?.getElementById(id);
const make=(tag,cls,text)=>{const el=root.document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el};
function collapseExisting(id,title,open=false){
 const el=$(id);if(!el||el.closest('details.lo254-disclosure'))return;
 const shell=make('details','lo254-disclosure');shell.open=open;
 const summary=make('summary','',title);shell.append(summary);
 el.before(shell);shell.append(el);
 el.style.margin='0';
 return shell;
}
function activityLibrary(){
 const section=$('lo251-activity'),cards=section?.querySelector('div[style*="grid-template-columns"]');
 if(!section||!cards||$('lo254-library-actions'))return;
 const header=make('div','lo254-library-actions');header.id='lo254-library-actions';
 const search=make('input','field');search.type='search';search.placeholder='Search activities · prayer, study, family...';search.setAttribute('aria-label','Find an activity');
 const button=make('button','btn outline','Browse all activities');button.type='button';button.setAttribute('aria-expanded','false');
 const results=make('div','lo254-library-results');
 header.append(search,button,results);
 cards.before(header);
 cards.classList.add('lo254-catalog-hidden');
 const all=[...cards.querySelectorAll('button')];
 function draw(){
  results.replaceChildren();const q=search.value.trim().toLowerCase();
  const hits=q?all.filter(b=>b.textContent.toLowerCase().includes(q)):all.filter(b=>['Prayer','Studying','Family time','Friends and social','Fitness and exercise','Meals and nutrition'].includes(b.textContent));
  for(const b of hits.slice(0,q?12:6)){
   const chip=make('button','lo254-chip',b.textContent);chip.type='button';chip.onclick=()=>{b.click();const el=$('customName');if(el)el.scrollIntoView({behavior:'smooth',block:'center'})};results.append(chip);
  }
  if(!hits.length)results.append(make('span','sub','No matching category. Use Custom activity to create your own.'));
 }
 button.onclick=()=>{const expanded=cards.classList.toggle('lo254-catalog-hidden')===false;button.setAttribute('aria-expanded',String(expanded));button.textContent=expanded?'Show fewer categories':'Browse all activities'};
 search.addEventListener('input',draw);draw();
 const p=section.querySelector('p.sub');if(p)p.textContent='Choose a common activity or search the library. Details can be recorded at the end.';
}
function reviewEditor(){
 const section=$('lo252-review');if(!section||$('lo254-review-shell'))return;
 const details=make('details','lo254-disclosure');details.id='lo254-review-shell';
 const title=make('summary','','Review or correct an activity');details.append(title);
 section.before(details);details.append(section);
 const intro=section.querySelector('p.sub');if(intro)intro.textContent='Add details, classify a distraction or correct the time of a completed activity.';
 const launch=(host,label)=>{
  if(!host||host.querySelector('.lo254-open-review'))return;
  const b=make('button','btn outline lo254-open-review',label);b.type='button';
  b.onclick=()=>{details.open=true;details.scrollIntoView({behavior:'smooth',block:'start'});$('lo252-picker')?.focus({preventScroll:true})};host.append(b);
 };
 launch($('trackDistractionPanel'),'Classify / edit distraction');
 const active=$('trackActivePanel');if(active){const area=active.querySelector('.head')||active;launch(area,'Edit finished activity')}
}
function focus(){
 const focus=$('lo207-focus');if(!focus)return;
 const quick=$('lo252-focus-quick'),settings=$('lo14SettingsHub');
 if(quick){const p=quick.querySelector('p.sub');if(p)p.textContent='Optional Focus Mode for study, work, Quran, reading and exercise. Timer controls remain available.'}
 // Move background-notification settings away from the activity start panel.
 const native=$('lo224-native-settings'),controls=$('lo252-android-settings');
 if(settings&&controls&&controls.parentElement!==settings)settings.append(controls);
 const alarms=$('lo221-volume')?.closest('.lo221-settings');
 if(alarms&&settings&&!$('lo254-alarm-settings')){
  const box=make('details','lo254-disclosure');box.id='lo254-alarm-settings';
  box.append(make('summary','','Alarm sound, vibration and repeat'));
  alarms.before(box);box.append(alarms);settings.append(box);
 }
 // Bring the existing focus controls nearer the primary start action; no duplicate timer created.
 if(focus&&!$('lo254-focus-summary')){
  const title=focus.querySelector('summary');if(title){title.id='lo254-focus-summary';title.textContent='Focus Mode · Start / Pause / Break'}
 }
 if(!focus.dataset.lo254Initialized){focus.open=false;focus.dataset.lo254Initialized='1'}
}
function moveSecondary(){
 const settings=$('lo14SettingsHub');
 const shortcut=$('lo87-notifications');
 if(settings&&shortcut&&shortcut.parentElement!==settings){settings.append(shortcut)}
 const track=$('trackQuickPanel');
 if(track){const small=[...track.querySelectorAll('details')].find(el=>/Phone timer shortcut/i.test(el.querySelector('summary')?.textContent||''));if(small&&settings)settings.append(small)}
 // Legacy prayer panel remains accessible beneath the consolidated My Life dashboard.
 const prayer=$('lo251-prayer-insights'),analytics=$('lo253-activity-analytics');
 if(prayer&&analytics&&!$('lo254-prayer-history')){
  const block=make('details','lo254-disclosure');block.id='lo254-prayer-history';block.append(make('summary','','Prayer tracking summary · additional details'));analytics.after(block);block.append(prayer);
 }
 const quality=$('lo247-quality');if(quality&&quality.tagName==='DETAILS')quality.open=false;
 const report=$('lo94-report')||$('lo94-insights');
 if(report)collapseExisting(report.id,'Extended insights and technical details');
}
function compactAnalytics(){
 const analytics=$('lo253-activity-analytics');if(!analytics||$('lo254-analytics-more'))return;
 const kpis=analytics.querySelector('div[style*="grid-template-columns"]');
 // Do not modify current chart data; only progressive disclosure for secondary statistics.
 const children=[...analytics.children];const detail=children.find(n=>n.style?.gridTemplateColumns&&n!==kpis&&n.id!=='lo253-all-overview');
 if(detail){
  const shell=make('details','lo254-disclosure');shell.id='lo254-analytics-more';shell.append(make('summary','','Detailed category performance and data coverage'));
  detail.before(shell);shell.append(detail);
 }
 const refresh=()=>{if(!kpis)return;const cards=[...kpis.children];cards.forEach((card,i)=>{card.classList.toggle('lo254-secondary-kpi',i>=3)});
  const open=$('lo254-kpi-toggle')?.getAttribute('aria-expanded')==='true';
  kpis.classList.toggle('lo254-kpis-expanded',open)};
 if(kpis&&!$('lo254-kpi-toggle')){
  const button=make('button','lo254-link','Show more measurements');button.id='lo254-kpi-toggle';button.type='button';button.setAttribute('aria-expanded','false');
  button.onclick=()=>{const on=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(on));button.textContent=on?'Show fewer measurements':'Show more measurements';refresh()};
  kpis.after(button);
  const observer=new MutationObserver(()=>refresh());observer.observe(kpis,{childList:true});
  refresh();
 }
}
function mount(){
 const doc=root.document;if(!doc||doc.documentElement.classList.contains('lo254-ui'))return;
 doc.documentElement.classList.add('lo254-ui');
 activityLibrary();reviewEditor();focus();moveSecondary();compactAnalytics();
}
if(root.document&&!root.document.getElementById('lo255-script')){
 const load=()=>{
  if(root.document.getElementById('lo255-script'))return;
  if(!root.document.getElementById('lo255-style')){const sheet=root.document.createElement('link');sheet.id='lo255-style';sheet.rel='stylesheet';sheet.href='/personal_mobile_review_v255.css?v=261';root.document.head.appendChild(sheet)}
  const script=root.document.createElement('script');script.id='lo255-script';script.src='/personal_mobile_review_v255.js?v=261';script.defer=true;root.document.head.appendChild(script);
 };
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',load,{once:true});else load();
}
if(root.document){
 const init=()=>{mount();[450,1200,2500].forEach(t=>root.setTimeout?.(mountModules,t))};
 const mountModules=()=>{activityLibrary();reviewEditor();focus();moveSecondary();compactAnalytics()};
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}
return {mount,collapseExisting};
});