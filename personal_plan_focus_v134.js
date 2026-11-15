/* LifeOS Plan V134: focused mobile planning shell. Presentation only; no record mutations. */
(()=>{'use strict';
const $=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const key=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
let selected='calendar';
function workspace(){try{return window.lifeosReadOnlyWorkspace?.()||{}}catch{return {}}}
function review(){
 const w=workspace(),now=Date.now(),plans=Array.isArray(w.schedule)?w.schedule:[],sessions=Array.isArray(w.sessions)?w.sessions:[];
 const start=new Date();start.setHours(0,0,0,0);const end=start.getTime()+86400000;
 const today=plans.filter(p=>Number(p.endAt)>start.getTime()&&Number(p.startAt)<end&&p.status!=='cancelled'&&p.status!=='skipped');
 const future=plans.filter(p=>Number(p.startAt)>now&&p.status!=='cancelled'&&p.status!=='skipped').sort((a,b)=>a.startAt-b.startAt);
 const finished=sessions.filter(s=>s.status==='finished'&&!s.assumed&&!s.isExample&&!s.developmentExample&&s.source!=='assumed-demo'&&Number(s.endAt)>start.getTime()&&Number(s.startAt)<end);
 const anomalies=finished.filter(s=>{const m=(Number(s.endAt)-Number(s.startAt))/60000;return m>1440||m>=180&&/prayer|fajr|dhuhr|asr|maghrib|isha/i.test(s.name||'')});
 let debt=null;try{debt=window.LifeOSDebtRecoveryV75?.outstanding?.(w,now)}catch{}
 const unresolved=Array.isArray(debt?.open)?debt.open.length:null,unverified=Array.isArray(debt?.unverified)?debt.unverified.length:null;
 const summary=$('lo134Summary');if(!summary)return;
 summary.innerHTML='<div class="lo134-metrics"><div><strong>'+today.length+'</strong><span>Planned today</span></div><div><strong>'+finished.length+'</strong><span>Finished today</span></div><div><strong>'+anomalies.length+'</strong><span>Check durations</span></div></div>'+
 '<div class="lo134-next"><span class="lo134-eyebrow">NEXT COMMITMENT</span><strong>'+esc(future[0]?.name||'Nothing upcoming')+'</strong><small>'+ (future[0]?.startAt?esc(new Date(future[0].startAt).toLocaleString(undefined,{weekday:'short',hour:'2-digit',minute:'2-digit'})):'Your calendar is ready') +'</small></div>'+
 '<button type="button" id="lo134Review" class="lo134-review">Commitments to review <strong>'+ (unresolved===null?'Review':unresolved+' confirmed') +'</strong>'+(unverified?' · '+unverified+' unverified':'')+' →</button>';
 $('lo134Review')?.addEventListener('click',()=>navigate('review'));
}
function to(id,open){const node=$(id);if(!node)return false;for(const n of open||[]){const d=$(n);if(d?.tagName==='DETAILS')d.open=true}node.scrollIntoView({behavior:'smooth',block:'start'});return true}
function findDebt(){const root=document.querySelector('[data-lifeos-area="schedule"]')||document.body;const headings=[...root.querySelectorAll('h2,h3,h4,summary')];return headings.find(x=>/Debt Chamber|Review and resolve outstanding commitments/i.test(x.textContent||''))?.closest('section,details,.panel')||headings.find(x=>/Debt Chamber/i.test(x.textContent||''));}
function navigate(tab){
 selected=tab;
 document.querySelectorAll('[data-lo134-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.lo134Tab===tab)));
 if(tab==='calendar'){const picker=$('scheduleDay');if(picker){picker.value=key();picker.dispatchEvent(new Event('change',{bubbles:true}))}to('lo133PlanStudio');return}
 if(tab==='tasks'){to('todoForm');return}
 if(tab==='compare'){to('lo40Compare',['lo40Details']);return}
 if(tab==='improve'){to('lo42ImprovementActions',['lo40Details','lo41GapDetails','lo42ImprovementDetails']);return}
 if(tab==='review'){const node=findDebt();if(node){if(node.tagName==='DETAILS')node.open=true;node.scrollIntoView({behavior:'smooth',block:'start'});}else to('lo75-debt');return}
 if(tab==='tools'){to('lo68-readiness');return}
}
function init(){
 const editor=$('scheduleEditorPanel'),studio=$('lo133PlanStudio');if(!editor||!studio||$('lo134Shell'))return;
 const shell=document.createElement('section');shell.id='lo134Shell';shell.setAttribute('aria-label','Plan overview');
 shell.innerHTML='<div class="lo134-header"><div><span class="lo134-eyebrow">LIFEOS · PLAN</span><h2>Your day, clearly planned.</h2></div><button type="button" id="lo134Today" class="lo134-today">⌖ Today</button></div>'+
 '<nav class="lo134-tabs" aria-label="Plan sections"><button type="button" data-lo134-tab="calendar" aria-selected="true">Calendar</button><button type="button" data-lo134-tab="tasks">Tasks</button><button type="button" data-lo134-tab="compare">Compare</button><button type="button" data-lo134-tab="improve">Improve</button><button type="button" data-lo134-tab="review">Review</button><button type="button" data-lo134-tab="tools">Tools</button></nav><div id="lo134Summary" aria-live="polite"></div>';
 editor.prepend(shell);
 shell.addEventListener('click',e=>{const b=e.target.closest('[data-lo134-tab]');if(b)navigate(b.dataset.lo134Tab)});
 $('lo134Today').addEventListener('click',()=>navigate('calendar'));
 const old=$('lo44PlanShortcuts');if(old)old.setAttribute('aria-hidden','true');
 const heading=editor.querySelector(':scope > .head');if(heading)heading.classList.add('lo134-legacy-heading');
 const picker=$('scheduleDay');picker?.addEventListener('change',()=>{if($('lo134Today'))$('lo134Today').classList.toggle('is-current',picker.value===key())});
 review();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)review()});
 // Refresh only the read-only overview; do not change original planning logic.
 setInterval(()=>{if(!document.hidden&&document.body.dataset.lifeosView==='schedule')review()},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,100),{once:true});else setTimeout(init,100);
})();