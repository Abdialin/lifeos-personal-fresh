/* LifeOS V56 — evidence-driven next-week preview; no automatic schedule mutations. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSPredictivePreviewV56=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos-live-v1',DAY=86400000;
function credible(s){
 if(!s||s.status!=='finished'||s.source==='development-starter'||s.source==='assumed-demo'||s.seedBatch)return false;
 if(!Array.isArray(s.segments)||!s.segments.length)return false;
 const spans=s.segments.filter(x=>x&&Number.isFinite(x.start)&&Number.isFinite(x.end)&&x.end>x.start);
 if(!spans.length)return false;
 if(!Number.isFinite(s.startAt)||!Number.isFinite(s.endAt)||s.endAt<=s.startAt)return false;
 return true;
}
function windowNextWeek(anchor){const d=new Date(anchor);d.setHours(0,0,0,0);d.setDate(d.getDate()+1);const start=d.getTime();const end=new Date(d);end.setDate(end.getDate()+7);return {from:start,to:end.getTime()};}
function build(workspace,anchor,planner){
 if(!planner||typeof planner.historicalSuggestions!=='function')return {error:'Predictive planner is unavailable',suggestions:[]};
 if(!Number.isFinite(anchor))return {error:'Invalid time',suggestions:[]};
 const sessions=(Array.isArray(workspace?.sessions)?workspace.sessions:[]).filter(credible);
 const schedule=Array.isArray(workspace?.schedule)?workspace.schedule:[];
 const range=windowNextWeek(anchor);
 const result=planner.historicalSuggestions({sessions,schedule,from:range.from,to:range.to,minimumDays:14,lookbackDays:28,recoveryBufferMinutes:30});
 return {...result,range,excludedRecords:(workspace?.sessions||[]).length-sessions.length,
  suggestions:result.suggestions.map(p=>({...p,requiresApproval:true,confidence:p.patternConsistency==='consistent'?'observed-consistent':'observed-variable',warning:p.conflicts.length?'Scheduled conflict':p.actualConflicts.length?'Activity conflict':p.recoveryConflicts.length?'Recovery buffer conflict':'No detected conflict; unlogged time remains unknown'}))};
}
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function stamp(ms){return new Date(ms).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function render(host,workspace,anchor,planner){
 const output=host.querySelector('[data-v56-output]'),status=host.querySelector('[data-v56-status]');
 if(!output||!status)return;
 try{
  const report=build(workspace,anchor,planner);
  if(report.error){status.textContent=report.error;output.replaceChildren();return}
  const sufficient=report.confidence==='reviewable';
  status.textContent=sufficient?'Evidence: '+report.observedTrackedDays+' distinct tracked days in the past 28 days. Preview only.':'Insufficient history: '+report.observedTrackedDays+'/14 distinct tracked days in the last 28 days. Continue tracking before relying on predictions.';
  const items=report.suggestions.slice(0,14);
  output.innerHTML=items.length?items.map(p=>'<article class="lo56-item"><div><strong>'+esc(p.name)+'</strong><small>'+esc(stamp(p.startAt))+' · '+Math.round((p.endAt-p.startAt)/60000)+' min</small><small>'+esc(p.observations+' historical matching days · '+p.patternConsistency+' · '+p.warning)+'</small></div><span class="lo56-proposal">Suggestion only</span></article>').join(''):'<div class="lo56-empty">No reliable repeated activities to suggest for next week. This does not mean the week is free.</div>';
 }catch(e){status.textContent='Unable to calculate predictions from the current records.';output.replaceChildren();}
}
function mount(){
 if(typeof document==='undefined')return;
 const parent=document.getElementById('lo55-intelligence');if(!parent||document.getElementById('lo56-preview'))return;
 const section=document.createElement('section');section.id='lo56-preview';section.className='lo56-preview';
 section.innerHTML='<h3>My Predicted Week · evidence preview</h3><p class="sub">Patterns from previously completed, credible records. No suggested times are added to your schedule automatically.</p><p data-v56-status role="status" class="lo56-status"></p><div data-v56-output></div><p class="sub">Minimum: 14 distinct recorded days in 28 days, with repeated weekday/activity evidence. Conflicts and recovery buffers are considered. Predictions are not proof of future availability.</p>';
 parent.appendChild(section);
 const refresh=()=>{let data=null;try{data=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}render(section,data,Date.now(),root.LifeOSPersonalPlanner)};
 const picker=document.getElementById('lo53-date');
 picker?.addEventListener('change',refresh);window.addEventListener('lifeos-v65-plan-committed',refresh);window.addEventListener('storage',e=>{if(e.key===KEY)refresh()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});refresh();
}
const api={build,credible,windowNextWeek};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();}
return api;
});
