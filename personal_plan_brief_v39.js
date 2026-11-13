/* LifeOS V39 — Compact planning briefing; read-only until explicit approval. */
(()=>{'use strict';
const el=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ws=()=>window.lifeosReadOnlyWorkspace?.()||{};
const hs=()=>window.lifeosSocialHabitBridge?.read()||{};
const when=t=>new Date(t).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const day=t=>{const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
let selected='',expanded=false,initialized=false;
function planReview(w,now=Date.now()){
 const end=new Date(now);end.setDate(end.getDate()+7);
 const plans=(w.schedule||[]).filter(p=>p.startAt>=now&&p.startAt<end.getTime()&&p.status!=='skipped'&&p.status!=='cancelled');
 const pairs=[];for(let i=0;i<plans.length;i++)for(let j=i+1;j<plans.length;j++)if(plans[i].startAt<plans[j].endAt&&plans[j].startAt<plans[i].endAt)pairs.push([plans[i],plans[j]]);
 return {plans,pairs,pending:plans.filter(p=>p.status==='planned'&&!p.sessionId),nearest:plans.slice().sort((a,b)=>a.startAt-b.startAt).slice(0,3)};
}
function recoveryReview(w,now=Date.now()){
 const first=new Date(now);first.setHours(12,0,0,0);first.setDate(first.getDate()-6);
 const records=(w.personalLogs||[]).filter(x=>x.date>=day(first)&&x.date<=day(now));
 const sleep=records.filter(x=>String(x.category||'').toLowerCase()==='sleep');
 const recovery=records.filter(x=>String(x.category||'').toLowerCase()==='recovery');
 const group=precision=>{
  const matching=sleep.filter(x=>x.precision===precision);
  const known=matching.filter(x=>x.minutes!==null&&x.minutes!==undefined&&Number.isFinite(Number(x.minutes))&&Number(x.minutes)>=0);
  return {count:matching.length,known:known.length,average:known.length?known.reduce((n,x)=>n+Number(x.minutes),0)/known.length:null};
 };
 return {measured:group('measured'),estimated:group('estimated'),other:group('unknown'),sleepDays:new Set(sleep.map(x=>x.date)).size,recoveryCount:recovery.length};
}
function findProposal(def,w){
 const engine=window.lifeosPredictiveHabitsV37;
 if(!engine||!def)return null;
 try{return engine.predict(def,w,7).options.find(x=>!x.conflict?.length)||null}catch{return null}
}
function render(){
 const root=el('lo39PlanningBrief');if(!root)return;
 const w=ws(),h=hs().habitDefinitions||[],summary=planReview(w),recovery=recoveryReview(w);
 if(!h.some(x=>x.id===selected))selected=h[0]?.id||'';
 const def=h.find(x=>x.id===selected),proposal=findProposal(def,w),open=el('lo39Details')?.open??expanded;
 const avg=g=>g.average===null?'No recorded duration':(g.average/60).toFixed(1)+'h / logged entry';
 const upcoming=summary.nearest.map(p=>'<div class="lo39-upcoming"><strong>'+esc(p.name||'Activity')+'</strong><small>'+esc(when(p.startAt))+'</small></div>').join('');
 const choice=h.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===selected?'selected':'')+'>'+esc(x.title)+'</option>').join('');
 const option=proposal?'<div class="lo39-candidate"><div><strong>'+esc(when(proposal.startAt))+'</strong><small>'+proposal.duration+' min · '+esc(proposal.confidence)+' evidence confidence · '+esc(proposal.pattern||'history')+'</small>'+
 (proposal.nearby?.length?'<small>'+proposal.nearby.length+' saved plan(s) within 15 minutes</small>':'')+'</div><button type="button" class="btn primary" id="lo39Propose">Review proposal</button></div>':
 '<p class="lo39-info">No conflict-free habit proposal in the coming 7 days. This is not evidence of no available time.</p>';
 root.innerHTML='<details id="lo39Details" '+(open?'open':'')+'><summary>Planning intelligence <small>· 7-day briefing</small></summary>'+
 '<p class="lo39-info">Quick context for plans, optional habit suggestions, and logged recovery. Predictions are not booked activities or proof of free time.</p>'+
 '<div class="lo39-metrics"><span><strong>'+summary.plans.length+'</strong><small>Upcoming plans</small></span><span><strong>'+summary.pairs.length+'</strong><small>Overlapping pairs</small></span><span><strong>'+summary.pending.length+'</strong><small>Not started</small></span></div>'+
 '<div class="lo39-columns"><section><h4>Next commitments</h4>'+(upcoming||'<p class="lo39-info">No upcoming saved LifeOS plans. Unlogged commitments remain unknown.</p>')+
 (summary.pairs.length?'<p class="lo39-caution">Some plans overlap. Check your calendar before adding a new one.</p>':'')+'</section>'+
 '<section><h4>Sleep & recovery records · last 7 days</h4>'+
 '<p class="lo39-info"><strong>Measured sleep:</strong> '+esc(avg(recovery.measured))+' ('+recovery.measured.known+' entries)</p>'+
 '<p class="lo39-info"><strong>Estimated sleep:</strong> '+esc(avg(recovery.estimated))+' ('+recovery.estimated.known+' entries)</p>'+
 '<p class="lo39-info">'+recovery.sleepDays+'/7 days with sleep logs · '+recovery.recoveryCount+' recovery logs · '+recovery.other.count+' unknown-precision sleep logs.</p>'+
 '<p class="lo39-info">No recovery score or readiness is inferred. Missing data is unknown.</p></section></div>'+
 '<div class="lo39-next"><h4>Next habit proposal</h4>'+
 (def?'<label>Habit <select id="lo39SelectHabit">'+choice+'</select></label>'+option:
 '<p class="lo39-info">Create a habit under My Life → Habits to see optional suggestions.</p>')+
 '<p class="lo39-info">Only your approval can save the proposed activity. External calendars and unlogged commitments are not checked.</p></div>'+
 '<div class="lo39-actions"><button class="btn outline" id="lo39Refresh" type="button">Refresh</button><button class="btn outline" id="lo39Calendar" type="button">View calendar ↓</button></div></details>';
 expanded=open;
}
function review(){
 const w=ws(),def=(hs().habitDefinitions||[]).find(x=>x.id===selected),p=findProposal(def,w);
 if(!p||!def)return;
 const approval=window.lifeosHabitPlanApprovalV35;
 if(typeof approval?.show!=='function')return alert('Approval interface is unavailable. Nothing was saved.');
 approval.show(def.id,{name:def.title,startAt:p.startAt,duration:p.duration});
 el('lo35PlanReview')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function init(){
 const parent=el('scheduleEditorPanel');if(!parent||initialized)return;initialized=true;
 const root=document.createElement('section');root.id='lo39PlanningBrief';root.className='lo39-brief';
 const head=parent.querySelector('.head');if(head)head.after(root);else parent.prepend(root);
 root.addEventListener('change',e=>{if(e.target.id==='lo39SelectHabit'){selected=e.target.value;render()}});
 root.addEventListener('click',e=>{
  if(e.target.closest('#lo39Propose'))review();
  if(e.target.closest('#lo39Refresh'))render();
  if(e.target.closest('#lo39Calendar'))el('lo11ScheduleCalendar')?.scrollIntoView({behavior:'smooth',block:'start'});
 });
 root.addEventListener('toggle',e=>{if(e.target.id==='lo39Details')expanded=e.target.open},true);
 render();
 document.addEventListener('click',e=>{if(e.target.closest('#lifeosNavigation,#scheduleList,#lo35ApprovePlan'))setTimeout(render,110)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.lifeosPlanningBriefV39={planReview,recoveryReview,render};
})();