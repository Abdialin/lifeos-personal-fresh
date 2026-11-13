/* LifeOS Personal V12 — reorganize planning and tracking without changing record data.
   Existing event handlers remain attached because native DOM nodes are moved, not cloned. */
(function(){'use strict';
const $=id=>document.getElementById(id);
function button(label,cls='btn outline'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;return b}
function openPanel(panel){
 if(!panel)return;
 const collapsed=panel.classList.contains('lo-advanced-collapsed');
 if(collapsed)panel.querySelector('.lo-advanced-toggle')?.click();
 for(const p of panel.parents||[]){if(p.tagName==='DETAILS')p.open=true}
 let node=panel.parentElement;while(node){if(node.tagName==='DETAILS')node.open=true;node=node.parentElement}
 panel.scrollIntoView({behavior:'smooth',block:'start'});
}
function planIntro(){
 const panel=$('scheduleEditorPanel');if(!panel||$('lo12PlanIntro'))return;
 const intro=document.createElement('div');intro.className='lo12-plan-intro';intro.id='lo12PlanIntro';
 intro.innerHTML='<div><strong>Plan your day</strong><span>Select a date, add activities or bring in an existing calendar.</span></div>';
 const actions=document.createElement('div');actions.className='lo12-plan-actions';
 const importBtn=button('Import schedule','btn outline lo12-import');importBtn.id='lo12ImportSchedule';
 importBtn.addEventListener('click',()=>window.location.assign('/calendar.html'));
 const reviewBtn=button('Review calendar changes','btn outline lo12-review');reviewBtn.id='lo12ReviewCalendar';
 reviewBtn.addEventListener('click',()=>openPanel($('lo12CalendarTools')));
 actions.append(importBtn,reviewBtn);
 intro.append(actions);
 const head=panel.querySelector(':scope > .head');if(head)head.after(intro);else panel.prepend(intro);
}
function organizeCalendarTools(){
 const editor=$('scheduleEditorPanel'),transfer=$('calendarHandoffPanel'),changes=$('calendarChangePanel'),review=$('calendarReviewPanel');
 if(!editor||$('lo12CalendarTools'))return;
 const wrap=document.createElement('section');wrap.id='lo12CalendarTools';wrap.className='panel lo12-calendar-tools';
 wrap.innerHTML='<div class="lo12-tool-head"><div><h2>Calendar import & approvals</h2><p class="sub">Import a schedule or review proposed changes. Nothing is applied without approval.</p></div><a class="btn outline" href="/calendar.html">Open import</a></div>';
 const holder=document.createElement('details');holder.className='lo12-tool-details';
 holder.innerHTML='<summary>Transfer proposals, approvals & audit history</summary>';
 wrap.append(holder);
 for(const p of [review,transfer,changes])if(p){p.classList.add('lo12-nested-tool');holder.append(p)}
 editor.after(wrap);
}
function organizeDevelopment(){
 const editor=$('scheduleEditorPanel'),tools=$('lo12CalendarTools'),panel=$('smartSchedulePanel');if(!editor||!panel||$('lo12DevDetails'))return;
 const details=document.createElement('details');details.className='lo12-development';details.id='lo12DevDetails';
 const summary=document.createElement('summary');summary.textContent='Advanced schedule analysis & development data';
 panel.before(details);details.append(summary,panel);
 if(tools)tools.after(details);
 const oldIntro=panel.querySelector(':scope > p.sub');if(oldIntro)oldIntro.textContent='Optional diagnostic views, ideal-routine settings and development-only sample records. Open these tools when needed.';
 const output=$('smartScheduleOutput');if(output&&!$('lo12DebugData')){
  const diagnostic=document.createElement('details');diagnostic.id='lo12DebugData';diagnostic.className='lo12-debug-data';
  const title=document.createElement('summary');title.textContent='Recorded activity diagnostics';diagnostic.append(title);
  output.before(diagnostic);diagnostic.append(output);
 }
 const starter=$('lifeosStarterPanel');if(starter&&!$('lo12StarterDetails')){
  const d=document.createElement('details');d.className='lo12-starter-details';d.id='lo12StarterDetails';
  const title=document.createElement('summary');title.textContent='Manage generated development records';d.append(title);starter.before(d);d.append(starter);
 }
}
function distraction(){
 const panel=$('trackDistractionPanel'),quick=$('trackQuickPanel');if(!panel||!quick)return;
 // A small, clearly located control belongs beside tracking, not between plans and imports.
 quick.after(panel);panel.classList.add('lo12-distraction');
 const title=panel.querySelector('h2');if(title)title.textContent='Distraction tracking';
 const subtitle=panel.querySelector('.head .sub');if(subtitle)subtitle.textContent='One tap to log interruptions alongside your other activities.';
 const note=panel.querySelector('p.note');if(note)note.textContent='Distraction is counted only when you record it; unlogged time is never assumed to be distraction.';
}
function init(){
 // Defer one frame so the existing page setup attaches its listeners first.
 requestAnimationFrame(()=>{
  distraction();organizeCalendarTools();organizeDevelopment();planIntro();
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();