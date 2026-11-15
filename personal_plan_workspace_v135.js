/* LifeOS V135: actual Plan workspace separation and non-destructive review.
   All original forms remain mounted; records and approval paths are untouched. */
(function(){'use strict';
const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'" :'&#39;'}[c]));
const day=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const clampMs=x=>Math.max(0,Number(x)||0),format=ms=>{const m=Math.round(clampMs(ms)/60000);return (m>=60?Math.floor(m/60)+'h ':'')+(m%60)+'m'};
let selected='calendar',editor,root,observer,processing=false;
const groups={
 calendar:/^(lo133PlanStudio|scheduleForm|lo133DailyDetails|lo133UpcomingDetails|scheduleDay|lifeosDayNavigation|lifeosSelectedDaySummary|scheduleList|lo11ScheduleCalendar)$/,
 compare:/^(lo40Compare|lo41|lo57|lo56|lo53|lo54)/,
 review:/^(lo74-debt|lo75-debt|lo99-audit|lo102)/,
 tools:/^(lo68-readiness|lo46Integrity|lo47|lo70|lo73|lo82|lo12|lo66)/,
 improve:/^(lo39PlanningBrief|lo42|lo48|lo58|lo59|lo60|lo61|lo62|lo63|lo64|lo65|lo33|lo34|lo35|lo36|lo37|lo38)/
};
function classify(el){
 if(el===root||el.id==='lo134Shell')return 'shell';
 if(el.classList.contains('head')||el.classList.contains('divider'))return 'tools';
 const id=el.id||'';
 for(const [k,re] of Object.entries(groups))if(re.test(id))return k;
 const h=(el.querySelector(':scope > summary,:scope > h2,:scope > h3,:scope > .head h2')?.textContent||'').toLowerCase();
 if(/readiness|diagnostic|generated|development|check saved|verify|checkpoint|migration|import|transfer|audit history/.test(h))return 'tools';
 if(/debt|outstanding|recovery|missed|commitment review/.test(h))return 'review';
 if(/reality|predicted|compare|schedule gap/.test(h))return 'compare';
 if(/planning intelligence|suggest|ideal|recommend|improv|weekly|habit|prediction/.test(h))return 'improve';
 return 'tools'; // unrecognized modules remain accessible, never discarded.
}
function mark(){
 if(processing)return;processing=true;
 try{for(const el of [...editor.children]){
  if(el===root)continue;
  const group=classify(el);
  el.dataset.lo135Pane=group;
  el.hidden=group!==selected;
 }}finally{processing=false}
}
function set(tab){
 selected=tab;editor.dataset.lo135View=tab;
 root.querySelectorAll('[data-lo135-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.lo135Tab===tab)));
 root.querySelectorAll('[data-lo135-screen]').forEach(n=>n.hidden=n.dataset.lo135Screen!==tab);
 mark();if(tab==='review')renderReview();if(tab==='calendar')refreshToday(false);
 root.scrollIntoView({block:'start',behavior:'auto'});
}
function read(){try{return window.lifeosReadOnlyWorkspace?.()||{}}catch{return {}}}
function debt(){try{return window.LifeOSDebtRecoveryV75?.outstanding?.(read(),Date.now())||null}catch{return null}}
function renderReview(){
 const el=$('lo135Recovery');if(!el)return;const w=read(),d=debt(),list=Array.isArray(d?.open)?d.open:[],unknown=Array.isArray(d?.unverified)?d.unverified:[],history=Array.isArray(w.sessions)?w.sessions:[];
 const flagged=history.filter(s=>s.status==='finished'&&!s.assumed&&!s.isExample&&!s.seedBatch&&s.source!=='development-starter'&&Number.isFinite(+s.startAt)&&Number.isFinite(+s.endAt)&&(+s.endAt- +s.startAt)/60000>=180&&/prayer|fajr|dhuhr|asr|maghrib|isha/i.test(s.name||''));
 el.innerHTML='<div class="lo135-recovery-heading"><span class="lo135-kicker">COMMITMENTS · REVIEW FIRST</span><h3>Resolve, don\'t accumulate.</h3><p>Unverified plans are not missed time. Recoveries stay proposals until you approve them.</p></div>'+
 '<div class="lo135-review-stats"><div><strong>'+list.length+'</strong><small>Calculated shortfalls</small></div><div><strong>'+unknown.length+'</strong><small>Unverified plans</small></div><div><strong>'+flagged.length+'</strong><small>Suspicious durations</small></div></div>'+
 (list.length?'<div class="lo135-review-list">'+list.slice(0,12).map(x=>'<article class="lo135-review-card"><div><strong>'+escape(x.name||'Commitment')+'</strong><small>'+format(x.outstandingMs)+' calculated shortfall · confirm before recovery</small></div><button type="button" data-lo135-choose="'+escape(x.id)+'">Review</button></article>').join('')+'</div>':'<p class="lo135-clear">No calculated shortfalls currently require a recovery decision.</p>')+
 (unknown.length?'<details class="lo135-unknown"><summary>'+unknown.length+' past plans need attendance confirmation</summary><p>LifeOS cannot infer whether these happened without tracking. Review them in the existing schedule controls before treating them as missed.</p></details>':'')+
 '<details id="lo135RecoveryControls"><summary>Open recovery decisions and approval controls</summary><p>The original recovery engine is preserved. Preview before approving; nothing is booked automatically.</p><p>Use the original approval form below after opening this section.</p></details>';
 const controls=$('lo75-debt-tools');
 el.querySelectorAll('[data-lo135-choose]').forEach(b=>b.addEventListener('click',()=>{
  const id=b.dataset.lo135Choose,select=$('lo75-item'),wrapper=$('lo135RecoveryControls');
  if(wrapper)wrapper.open=true;
  if(controls)controls.open=true;
  if(select){select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}))}
  controls?.scrollIntoView({block:'nearest',behavior:'smooth'});
 }));
}
function refreshToday(scroll){
 const picker=$('scheduleDay');if(!picker)return;
 if(scroll||!picker.value){picker.value=day();picker.dispatchEvent(new Event('change',{bubbles:true}))}
}
function init(){
 editor=$('scheduleEditorPanel');if(!editor||$('lo135Workspace'))return;
 root=document.createElement('section');root.id='lo135Workspace';root.className='lo135-workspace';
 root.innerHTML='<div class="lo135-mainhead"><div><span class="lo135-kicker">LIFEOS / PLAN</span><h2>Make time for what matters.</h2></div><button id="lo135Now" type="button">⌖ Today</button></div>'+
 '<nav class="lo135-menu" aria-label="Planning workspace"><button type="button" data-lo135-tab="calendar" aria-selected="true">Calendar</button><button type="button" data-lo135-tab="review">Review</button><button type="button" data-lo135-tab="compare">Compare</button><button type="button" data-lo135-tab="improve">Improve</button><button type="button" data-lo135-tab="tasks">Tasks</button><button type="button" data-lo135-tab="tools">More</button></nav>'+
 '<section class="lo135-screen" data-lo135-screen="calendar"><div class="lo135-intro"><strong>Your schedule</strong><span>Browse day, 3 days, week or month below. Recorded time is never assumed from a plan.</span></div></section>'+
 '<section class="lo135-screen" data-lo135-screen="review" hidden><div id="lo135Recovery"></div></section>'+
 '<section class="lo135-screen" data-lo135-screen="compare" hidden><h3>Reality ↔ Prediction ↔ Ideal</h3><p>Your completed sessions, future commitments and preferred routines are different evidence types. Explore the existing comparison below.</p></section>'+
 '<section class="lo135-screen" data-lo135-screen="improve" hidden><h3>Improve your week</h3><p>Recommendations are optional. Review conflicts and approve any new schedule entry.</p></section>'+
 '<section class="lo135-screen" data-lo135-screen="tasks" hidden><h3>Tasks, not appointments</h3><p>Keep flexible to-dos separate from fixed calendar commitments. Times and deadlines are optional unless you choose them.</p><button type="button" id="lo135OpenTasks">Open task manager →</button></section>'+
 '<section class="lo135-screen" data-lo135-screen="tools" hidden><h3>More planning tools</h3><p>Imports, diagnostics, generated development records, advanced planning modules and verification remain here, outside the everyday schedule.</p></section>';
 editor.prepend(root);
 root.addEventListener('click',e=>{const b=e.target.closest('[data-lo135-tab]');if(b)set(b.dataset.lo135Tab)});
 // Default to a compact floating timer when entering Plan; user may expand it manually.
 if(document.body.dataset.lifeosView==='schedule')document.body.dataset.lo79TimerMinimized='true';
 document.querySelector('#lifeosNavigation [data-view="schedule"]')?.addEventListener('click',()=>{document.body.dataset.lo79TimerMinimized='true'});
 $('lo135Now').onclick=()=>{set('calendar');refreshToday(true)};
 $('lo135OpenTasks').onclick=()=>{const todo=$('todoForm');const section=todo?.closest('.panel');if(section){document.querySelector('#lifeosNavigation [data-view="goals"]')?.click();setTimeout(()=>section.scrollIntoView({behavior:'smooth',block:'start'}),150)}else document.querySelector('#lifeosNavigation [data-view="goals"]')?.click()};
 mark();
 observer=new MutationObserver(()=>{if(!processing)mark()});observer.observe(editor,{childList:true});
 window.addEventListener('lifeos-v75-changed',()=>{if(selected==='review')renderReview()});
 window.addEventListener('focus',()=>{if(selected==='review')renderReview()});
}
function boot(){if($('lo133PlanStudio'))init();else setTimeout(init,1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,500),{once:true});else setTimeout(boot,500);
})();