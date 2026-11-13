/* LifeOS V42 — reviewable Reality → Ideal adjustments.
   Evidence is suggestive only. Changes require explicit user approval. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const get=()=>window.lifeosReadOnlyWorkspace?.()||{};
const gap=()=>window.lifeosRealityGapV41;
const bridge=()=>window.lifeosSocialHabitBridge;
const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
let selectedId='',notice='',expanded=false,draft=null;
function proposals(group){
 const record=group.rows||[],known=record.filter(x=>x.kind==='recorded below target'||x.kind==='recorded target met');
 const below=known.filter(x=>x.kind==='recorded below target');
 const missing=record.filter(x=>x.kind==='no matching record');
 const uncertain=record.filter(x=>x.kind==='duration uncertain');
 const total=record.length;
 const suggestion=known.length<2?
  'Limited evidence: this seven-day comparison normally contains one scheduled occurrence per weekly routine. Verify your historical activity records before adjusting your ideal target.':
  below.length>=2?'Recorded duration was below your target on multiple scheduled dates. You may review a smaller duration.':
  'There is no repeated recorded shortfall sufficient to recommend changing this routine.';
 return {total,known:known.length,below:below.length,missing:missing.length,uncertain:uncertain.length,
  suggestion,confidence:known.length>=3?'Limited':'Insufficient',canRecommend:known.length>=3&&below.length>=2};
}
function openEditor(id){
 const routine=(get().idealRoutines||[]).find(x=>x.id===id);
 if(!routine){notice='Routine not found. No change made.';return}
 selectedId=id;draft={id:routine.id,originalStart:routine.start,originalDuration:Number(routine.durationMinutes),
  start:routine.start,durationMinutes:Number(routine.durationMinutes)};
 notice='';
 render();
 $('lo42EditDuration')?.focus();
}
function render(){
 const parent=$('lo41GapDetails');if(!parent)return;
 let host=$('lo42ImprovementActions');
 if(!host){host=document.createElement('section');host.id='lo42ImprovementActions';host.className='lo42-actions';parent.append(host)}
 const state=get(),analysis=gap()?.evaluate(state);if(!analysis)return;
 const groups=analysis.aggregates||[];
 const selected=draft?(state.idealRoutines||[]).find(x=>x.id===draft.id):null;
 const info=selected?groups.find(g=>g.preference.id===selected.id):null;
 const rows=groups.map(g=>{
  const p=proposals(g),r=g.preference;
  return '<article class="lo42-row"><div><strong>'+esc(r.name)+'</strong><small>'+
  esc(days[Number(r.dayOfWeek)]||'Weekly')+' · '+esc(r.start)+' · '+esc(r.durationMinutes)+' min target</small><p>'+
  p.known+' recorded comparable date(s) · '+p.missing+' missing matching timer(s). '+esc(p.suggestion)+'</p></div>'+
  '<button class="btn outline" type="button" data-lo42-edit="'+esc(r.id)+'" '+(!r.id?'disabled':'')+'>Review adjustment</button></article>';
 }).join('');
 let editor='';
 if(draft&&selected){
  const reason=info?proposals(info):null;
  editor='<form id="lo42Editor" class="lo42-editor"><h4>Review proposed ideal routine change</h4><p class="lo42-note">'+
   esc(selected.name)+' · '+esc(days[Number(selected.dayOfWeek)])+
   '. Your history stays unchanged. This edits a preference only—not a calendar booking.</p>'+
   '<div class="lo42-before"><strong>Current</strong><span>'+esc(draft.originalStart)+' · '+draft.originalDuration+' minutes</span></div>'+
   '<label>New preferred start<input id="lo42EditStart" type="time" required value="'+esc(draft.start)+'"></label>'+
   '<label>New preferred duration (minutes)<input id="lo42EditDuration" type="number" min="5" max="1440" step="1" required value="'+draft.durationMinutes+'"></label>'+
   '<div class="lo42-impact" id="lo42Impact"></div>'+
   '<p class="lo42-note">'+esc(reason?.suggestion||'Review before changing')+
   ' Days per week cannot be changed here; edit recurring weekdays in the ideal routine settings.</p>'+
   '<button class="btn primary" type="submit" id="lo42Approve">Approve ideal preference change</button>'+
   '<button class="btn outline" type="button" id="lo42Cancel">Cancel</button></form>';
 }else if(draft&&!selected){draft=null;notice='The routine was removed before approval. Nothing changed.'}
 host.innerHTML='<details id="lo42ImprovementDetails" '+(expanded?'open':'')+'><summary>Reviewable improvement actions</summary>'+
 '<p class="lo42-note">These are decision aids, not automatic corrections. One week alone is insufficient to establish a repeated pattern. Missing timers are unknown, not missed commitments.</p>'+
 (rows||'<p class="lo42-note">Create an ideal routine to review potential changes.</p>')+
 editor+(notice?'<p class="lo42-notice" role="status">'+esc(notice)+'</p>':'')+
 '<p class="lo42-note">Any approved change updates only your saved ideal routine. Existing tracked sessions, habit completions, and planned activities are not modified.</p></details>';
 showImpact();
}
function showImpact(){
 const box=$('lo42Impact');if(!box||!draft)return;
 const start=$('lo42EditStart')?.value||'',duration=Number($('lo42EditDuration')?.value);
 const valid=/^([01]\d|2[0-3]):[0-5]\d$/.test(start)&&Number.isInteger(duration)&&duration>=5&&duration<=1440;
 const changed=valid&&(start!==draft.originalStart||duration!==draft.originalDuration);
 const approve=$('lo42Approve');if(approve)approve.disabled=!changed;
 box.textContent=!valid?'Enter a valid start and duration between 5 and 1440 minutes.':
 !changed?'No change from your current ideal preference.':
 'Proposed: '+start+' · '+duration+' min ('+(duration-draft.originalDuration>=0?'+':'')+(duration-draft.originalDuration)+' min vs current). No calendar event will be added or changed.';
}
function approve(e){
 e.preventDefault();if(!draft)return;
 const current=(get().idealRoutines||[]).find(x=>x.id===draft.id);
 if(!current){notice='Routine no longer exists. No changes made.';draft=null;render();return}
 const start=$('lo42EditStart')?.value||'',duration=Number($('lo42EditDuration')?.value);
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!Number.isInteger(duration)||duration<5||duration>1440)return;
 if(start===draft.originalStart&&duration===draft.originalDuration)return;
 if(!confirm('Update only the ideal weekly preference for '+current.name+'?\n'+draft.originalStart+' / '+draft.originalDuration+' min → '+start+' / '+duration+' min\nNo tracked sessions or actual plans will change.'))return;
 const outcome=bridge()?.reviewIdealChange({...draft,start,durationMinutes:duration});
 if(!outcome?.ok){notice=outcome?.error||'Save failed';render();return}
 draft=null;notice='Approved: ideal preference updated. Activity and plan history were preserved.';
 gap()?.render();render();
}
function init(){
 const container=$('lo40Compare');if(!container)return;
 container.addEventListener('click',e=>{
  const button=e.target.closest('[data-lo42-edit]');
  if(button){expanded=true;openEditor(button.dataset.lo42Edit);return}
  if(e.target.closest('#lo42Cancel')){draft=null;notice='Cancelled; no changes made.';render()}
 });
 container.addEventListener('submit',e=>{if(e.target.id==='lo42Editor')approve(e)});
 container.addEventListener('input',e=>{if(e.target.closest('#lo42Editor'))showImpact()});
 container.addEventListener('toggle',e=>{if(e.target.id==='lo42ImprovementDetails')expanded=e.target.open},true);
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.lifeosIdealActionsV42={proposals,render};
})();