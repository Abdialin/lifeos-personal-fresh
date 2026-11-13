/* LifeOS V35 — user-approved, conflict-aware habit plan proposals.
   This writes only to private LifeOS plans after explicit approval; external calendars are untouched. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const toInput=d=>dateKey(d)+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
const fmt=t=>new Date(t).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const habitApi=()=>window.lifeosSocialHabitBridge;
let selectedId=null,installed=false;
function habit(){return (habitApi()?.read().habitDefinitions||[]).find(x=>x.id===selectedId)}
function proposal(){
 const name=$('lo35PlanName')?.value.trim()||'',start=Date.parse($('lo35PlanStart')?.value||''),minutes=Number($('lo35PlanDuration')?.value),def=habit();
 const valid=def&&name&&name.length<=80&&Number.isFinite(start)&&Number.isInteger(minutes)&&minutes>=5&&minutes<=480&&start>=Date.now()-60000;
 const end=start+minutes*60000;
 const schedules=window.lifeosReadOnlyWorkspace?.().schedule||[];
 const conflict=valid?schedules.filter(x=>x.status!=='skipped'&&x.status!=='cancelled'&&Number(x.startAt)<end&&Number(x.endAt)>start):[];
 return {valid,start,end,minutes,name,def,conflict};
}
function preview(){
 const panel=$('lo35DraftReview'),approve=$('lo35ApprovePlan');if(!panel||!approve)return;
 const p=proposal();approve.disabled=!p.valid||p.conflict.length>0;
 if(!p.valid){panel.innerHTML='<p class="lo35-warning">Enter a valid future start time, a name, and a duration from 5 to 480 minutes.</p>';return}
 panel.innerHTML='<div class="lo35-preview"><strong>'+esc(p.name)+'</strong><p>'+esc(fmt(p.start))+' – '+esc(fmt(p.end))+' · '+p.minutes+' min</p>'+
 '<small>New LifeOS planned activity, not a completed timer session or habit check.</small></div>'+
 (p.conflict.length?'<div class="lo35-conflicts"><strong>'+p.conflict.length+' overlapping LifeOS plan(s)</strong>'+
 p.conflict.map(x=>'<p>'+esc(x.name||'Planned activity')+' · '+esc(fmt(x.startAt))+' – '+esc(fmt(x.endAt))+'</p>').join('')+
 '<p>Choose another time to proceed. This proposal does not change or overwrite existing plans.</p></div>':
 '<p class="lo35-safe">No overlaps found with currently saved LifeOS plans.</p>')+
 '<p class="lo35-warning">External calendars, including Google Calendar, are not checked here. Review them separately before approval.</p>';
}
function show(id,preferred=null){
 selectedId=id;const def=habit();if(!def)return;
 const host=$('lo35PlanReview');if(!host)return;
 const next=new Date(Date.now()+24*3600000);next.setHours(19,0,0,0);
 const duration=preferred?.duration|| (def.targetMode==='minutes'&&Number(def.targetAmount)>=5?Math.min(480,Math.round(def.targetAmount)):30);
 host.hidden=false;host.innerHTML='<div class="lo35-head"><h3>Review a Smart Schedule proposal</h3><button type="button" class="btn outline tiny" id="lo35Close">Close</button></div>'+
 '<p class="lo35-description">For <strong>'+esc(def.title)+'</strong>. You choose the time and must approve the final plan. No habit is marked complete.</p>'+
 '<form id="lo35ProposalForm"><label>Planned activity<input id="lo35PlanName" maxlength="80" required value="'+esc(preferred?.name||def.title)+'"></label>'+
 '<label>Start date and time<input id="lo35PlanStart" type="datetime-local" required value="'+esc(preferred?.startAt?toInput(new Date(preferred.startAt)):toInput(next))+'"></label>'+
 '<label>Duration (minutes)<input id="lo35PlanDuration" type="number" min="5" max="480" step="1" required value="'+duration+'"></label>'+
 '<div id="lo35DraftReview" aria-live="polite"></div>'+
 '<button type="submit" class="btn primary" id="lo35ApprovePlan">Approve & save to LifeOS Plan</button></form>'+
 '<p id="lo35SaveStatus" role="status"></p>';
 preview();host.scrollIntoView({behavior:'smooth',block:'start'});
}
function save(e){
 e.preventDefault();const p=proposal(),status=$('lo35SaveStatus');if(!p.valid||p.conflict.length){preview();return}
 if(!confirm('Save this planned activity in LifeOS Plan?\n'+p.name+'\n'+fmt(p.start)+' – '+fmt(p.end)+'\nYour habit will not be marked complete.'))return;
 const res=habitApi()?.proposeHabitPlan({habitId:p.def.id,name:p.name,startAt:p.start,endAt:p.end});
 if(!res?.ok){status.textContent=res?.error||'Saving failed';preview();return}
 status.textContent='Saved to LifeOS Plan. It is planned, not tracked or completed.';
 $('lo35ApprovePlan').disabled=true;
 const goto=document.createElement('button');goto.type='button';goto.className='btn outline';goto.id='lo35OpenPlan';goto.textContent='View in Plan →';status.after(goto);
}
function init(){
 if(installed)return;
 const base=$('lo34Recommendations');if(!base)return;installed=true;
 const panel=document.createElement('section');panel.id='lo35PlanReview';panel.className='lo35-plan-review';panel.hidden=true;base.after(panel);
 document.addEventListener('click',e=>{
  const btn=e.target.closest('[data-lo35-plan]');if(btn){show(btn.dataset.lo35Plan);return}
 });
 panel.addEventListener('input',e=>{if(e.target.closest('#lo35ProposalForm'))preview()});
 panel.addEventListener('change',e=>{if(e.target.closest('#lo35ProposalForm'))preview()});
 panel.addEventListener('submit',e=>{if(e.target.id==='lo35ProposalForm')save(e)});
 panel.addEventListener('click',e=>{
  if(e.target.closest('#lo35Close')){panel.hidden=true;selectedId=null;return}
  if(e.target.closest('#lo35OpenPlan')){
   document.querySelector('#lifeosNavigation [data-view="schedule"]')?.click();
   const day=$('scheduleDay');const p=proposal();
   if(day&&p.valid){day.value=dateKey(new Date(p.start));day.dispatchEvent(new Event('change',{bubbles:true}))}
  }
 });
}
window.lifeosHabitPlanApprovalV35={show};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();