/* LifeOS Personal V14: stable views, single schedule entry, focused workflows.
 * Presentation-only: never saves, syncs, mutates workspace data, or edits sessions.
 */
(()=>{'use strict';const $=id=>document.getElementById(id);
const btn=(label,on)=>{const b=document.createElement('button');b.type='button';b.className='btn outline lo14-button';b.textContent=label;b.addEventListener('click',on);return b};
const goto=view=>{const target=document.querySelector('#lifeosNavigation button[data-view="'+view+'"]');if(target)target.click();else if(view==='settings'){location.hash='settings';}};
const label=el=>(el?.querySelector('h2,h3')?.textContent||'').trim();
function settings(){
 if($('lo14SettingsHub'))return;
 const hub=document.createElement('div');hub.id='lo14SettingsHub';hub.className='lo14-settings-hub';hub.setAttribute('aria-label','Settings and data management');
 const heading=document.createElement('div');heading.className='lo14-hub-heading';heading.innerHTML='<h2>Settings & data</h2><p>Backups, storage, cloud synchronization, timer recovery and advanced diagnostic tools.</p>';
 hub.append(heading);
 const host=$('lifeosViewTitle')?.parentElement;if(!host)return;host.insertBefore(hub,$('todayOverview')||host.firstElementChild?.nextSibling);
 const tech=$('lo13TechnicalTools');
 if(tech){const children=[...tech.children].filter(e=>e.tagName!=='SUMMARY');for(const el of children)hub.append(el);tech.remove()}
 for(const id of ['trackingRecoveryPanel','activityHierarchyPanel','connectedDatabasePanel','cloudSyncPanel','sessionToolsPanel','personalCompletionPanel']){
  const panel=$(id);if(panel)hub.append(panel);
 }
 const troubleshooting=document.createElement('details');troubleshooting.className='lo14-tech-details';
 troubleshooting.innerHTML='<summary>Advanced planning diagnostics</summary>';
 const note=document.createElement('p');note.textContent='Schedule suggestions remain in Plan; evidence quality and prediction analysis remain in Insights.';troubleshooting.append(note);
 hub.append(troubleshooting);
 // A link, rather than another primary bottom tab, keeps the six-tab mobile navigation uncluttered.
 const trigger=btn('Settings & data',()=>goto('settings'));trigger.id='lo14SettingsButton';trigger.setAttribute('aria-label','Open Settings and data');trigger.classList.add('lo14-settings-button');
 const header=document.querySelector('header.top');if(header)header.append(trigger);
}
function improveTrack(){
 const active=$('trackActivePanel'),quick=$('trackQuickPanel'),distraction=$('trackDistractionPanel'),history=$('trackHistoryPanel');
 if(!active||!quick)return;
 active.after(quick);
 if(distraction)quick.after(distraction);
 const hint=distraction?.querySelector('.sub');if(hint)hint.textContent='Record interruptions without interrupting another timer.';
 if(history){const past=$('trackPastPanel');if(past)past.after(history)}
 const root=active.parentElement;
 // Use visual shortcut cards, not repeated full analytics reports.
 if(!$('lo14TrackTools')){
 const actions=document.createElement('div');actions.id='lo14TrackTools';actions.className='lo14-shortcuts';
 actions.append(btn('Review today',()=>goto('dashboard')),btn('Explore Insights',()=>goto('analytics')),btn('Manage tasks',()=>goto('schedule')));
 if(history)history.before(actions);else distraction?.after(actions);
 }
}
function plan(){
 const editor=$('scheduleEditorPanel'),todo=$('todoForm')?.closest('section.panel');if(!editor)return;
 if(todo){const bottom=editor.querySelector('#scheduleList');if(bottom)bottom.after(todo);else editor.after(todo);todo.classList.add('lo14-tasks-panel');}
 // Main Smart Schedule calendar remains the sole month selector. Retain schedule-for-date picker and weekly strip.
 const jump=$('lo11ScheduleCalendar');
 if(jump){jump.classList.add('lo14-secondary-calendar');const wrap=jump.closest('.lo11-schedule-calendar,.lo11-calendar-box');if(wrap)wrap.classList.add('lo14-secondary-calendar');}
 // Keep import, transfer and approvals accessible but collapse them by default.
 const tool=$('lo12CalendarTools');if(tool)tool.querySelectorAll('details').forEach(d=>d.open=false);
 const actions=editor.querySelector('.lo12-plan-actions');
 if(actions&&!$('lo14ManageTasks')){const task=btn('Weekly tasks',()=>{goto('schedule');setTimeout(()=>todo?.scrollIntoView({behavior:'smooth',block:'start'}),80)});task.id='lo14ManageTasks';actions.append(task)}

}
function goals(){
 $('lo13GoalLink')?.remove();
 const goals=$('goalForm')?.closest('section.panel');if(!goals)return;
 if(!$('lo14GoalsBridge')){
 const box=document.createElement('div');box.id='lo14GoalsBridge';box.className='lo14-section-bridge';
 box.innerHTML='<strong>Goals & progress</strong><span>Set targets here, then explore the same progress over time in Insights.</span>';
 box.append(btn('See activity trends',()=>goto('analytics')));
 goals.prepend(box);}
 const review=$('goalRecoveryPanel');if(review)review.classList.add('lo14-compact-review');
 if(review&&!$('lo14GoalReviewDetails')){
  const group=document.createElement('details');group.id='lo14GoalReviewDetails';group.className='lo14-evidence-details';
  group.innerHTML='<summary>Recovery and detailed goal calculations</summary>';
  review.before(group);group.append(review);
 }

}
function insights(){
 const history=$('trackHistoryPanel');
 if(history)history.classList.add('lo14-history');
 const weekly=$('weeklyDashboardPanel');if(weekly)weekly.classList.add('lo14-analytics-detail');
 const quality=$('qualityPanel');if(quality)quality.classList.add('lo14-analytics-detail');
 if(!$('lo14EvidenceDetails')){
   const group=document.createElement('details');group.id='lo14EvidenceDetails';group.className='lo14-evidence-details';
   const summary=document.createElement('summary');summary.textContent='Data reliability & prediction evidence';
   group.append(summary);
   const base=$('analyticsPanel');if(base){base.after(group);for(const id of ['weeklyDashboardPanel','qualityPanel','intelligencePanel']){const panel=$(id);if(panel)group.append(panel)}}
 }

 if(!$('lo14InsightsBridge')){
 const card=document.createElement('div');card.id='lo14InsightsBridge';card.className='lo14-section-bridge';
 card.innerHTML='<strong>Insights & trends</strong><span>Explore how time is spent, then compare trends against your goals.</span>';
 card.append(btn('Review goals',()=>goto('goals')),btn('Find a session',()=>{goto('tracking');setTimeout(()=>history?.scrollIntoView({behavior:'smooth',block:'start'}),80)}));
 const region=$('analyticsPanel');if(region)region.before(card);
 }
}
function life(){
 const tabs=$('loLifeSectionTabs');const routine=$('personalActivityPanel');
 if(tabs){const heading=$('lifeosViewTitle');if(heading)heading.after(tabs);}
 // The tabs should be visible before content, rather than following analytics and cloud sync.
 if(tabs){tabs.classList.add('lo14-life-tabs');}
 const h=$('personalActivityPanel')?.querySelector('h2');if(h)h.textContent='Personal routines & recovery';
 const health=$('cloudSyncPanel');if(health)health.classList.add('lo14-cloud-settings');
}
function category(n){
 n=String(n).toLowerCase();
 if(/sleep|rest/.test(n))return 'sleep';
 if(/stud|read|course|university|learn/.test(n))return 'study';
 if(/gym|fitness|workout|exercise|box|running|walking|cycling/.test(n))return 'fitness';
 if(/pray|quran|hadith|arabic|fajr|asr|dhuhr|maghrib|isha/.test(n))return 'spiritual';
 if(/business|work|shift|security|job/.test(n))return 'work';
 if(/meal|food|lunch|breakfast|dinner|eat/.test(n))return 'food';
 if(/distraction|social media/.test(n))return 'distraction';return 'other';
}
function decorate(){
 // Scope category colors to actual named activity rows; do not recolor day-series bars as categories.
 document.querySelectorAll('.v4-category').forEach(el=>{
   const text=(el.querySelector('span')?.textContent||'').trim();
   el.dataset.lo14Category=category(text);
 });
 // Repair donut legend flex layout and preserve existing accessible text.
 const mix=document.querySelectorAll('[id*="TimeMix"],[id*="timeMix"],.v4-mix,.v5-time-mix');
 mix.forEach(el=>el.classList.add('lo14-time-mix'));
 // Label routine data provenance clearly without treating sample data as measured facts.
}
function init(){
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  settings();improveTrack();plan();goals();insights();life();decorate();
  document.addEventListener('click',()=>setTimeout(decorate,70));
 }));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();