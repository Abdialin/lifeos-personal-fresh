/* LifeOS V41 — Reality vs Ideal: cautious, evidence-linked comparison.
 * Read-only: an unmatched session means unknown, not a failed commitment. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const key=t=>{const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const normal=v=>String(v||'').toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/g,' ').trim();
const mins=ms=>Math.round(ms/60000);
let expanded=false;
function elapsed(s){
 if(!Array.isArray(s?.segments))return null;
 let v=0,valid=false;
 for(const seg of s.segments){
  const start=Number(seg.start),end=seg.end==null?Number(s.endAt):Number(seg.end);
  if(Number.isFinite(start)&&Number.isFinite(end)&&end>start){v+=end-start;valid=true}
 }
 return valid?v:null;
}
function dayDates(now=Date.now()){
 const d=new Date(now);d.setHours(12,0,0,0);
 return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(x.getDate()-7+i);return x});
}
function evaluate(w,now=Date.now()){
 const days=dayDates(now),sessions=(w.sessions||[]).filter(s=>s.status==='finished'&&Number.isFinite(Number(s.startAt)));
 const valid=sessions.filter(s=>!s.seedBatch&&!['assumed-demo','development-starter'].includes(s.source));
 const assumed=sessions.length-valid.length;
 const preferences=(w.idealRoutines||[]).filter(r=>Number.isInteger(Number(r.dayOfWeek))&&Number(r.dayOfWeek)>=0&&Number(r.dayOfWeek)<=6&&Number(r.durationMinutes)>0&&Number(r.durationMinutes)<=1440&&normal(r.name));
 const projected=[];
 for(const p of preferences){
  const scheduled=days.filter(d=>d.getDay()===Number(p.dayOfWeek));
  for(const d of scheduled){
   const target=Number(p.durationMinutes),date=key(d.getTime()),matches=valid.filter(s=>key(s.startAt)===date&&normal(s.name)===normal(p.name));
   const matched=matches.reduce((total,s)=>total+(elapsed(s)||0),0);
   const unknownDurations=matches.filter(s=>elapsed(s)===null).length;
   const samples=matches.length;
   const kind=!samples?'no matching record':unknownDurations?'duration uncertain':matched>=target*60000?'recorded target met':'recorded below target';
   const examples=sessions.filter(s=>key(s.startAt)===date&&normal(s.name)===normal(p.name)&&!valid.includes(s)).length;
   projected.push({preferenceId:p.id||'',name:p.name,date,day:d.getDay(),targetMinutes:target,matchedMinutes:mins(matched),matchedCount:samples,unknownDurations,assumedExamples:examples,kind});
  }
 }
 const aggregate=[];
 for(const p of preferences){
  const rows=projected.filter(r=>(p.id&&r.preferenceId===p.id)||(!p.id&&normal(p.name)===normal(r.name)&&p.dayOfWeek===r.day));
  const met=rows.filter(r=>r.kind==='recorded target met').length;
  const partial=rows.filter(r=>r.kind==='recorded below target').length;
  const uncertain=rows.filter(r=>r.kind==='duration uncertain').length;
  const missing=rows.filter(r=>r.kind==='no matching record').length;
  aggregate.push({preference:p,rows,met,partial,uncertain,missing});
 }
 return {aggregates:aggregate,projected,total:projected.length,met:projected.filter(x=>x.kind==='recorded target met').length,partial:projected.filter(x=>x.kind==='recorded below target').length,uncertain:projected.filter(x=>x.kind==='duration uncertain').length,unmatched:projected.filter(x=>x.kind==='no matching record').length,assumed};
}
function suggestion(item){
 if(item.missing===item.rows.length)return 'No matching finished timer was found on this scheduled day. Confirm whether you logged the activity elsewhere before deciding to change your routine.';
 if(item.partial>0)return 'Some matched timers are shorter than the preferred duration. Review the activity details and decide whether to adjust timing or the preference.';
 if(item.met===item.rows.length)return 'The recorded timer evidence meets your preferred duration on the scheduled day. Keep the preference if it still suits you.';
 return 'Your recorded evidence is mixed or duration is incomplete. Review it before making changes.';
}
function render(){
 const parent=$('lo40Details');if(!parent)return;
 let root=$('lo41RealityGap');
 if(!root){root=document.createElement('section');root.id='lo41RealityGap';root.className='lo41-gap';parent.append(root)}
 const previously=$('lo41GapDetails')?.open??expanded;
 const state=window.lifeosReadOnlyWorkspace?.()||{},data=evaluate(state);
 root.innerHTML='<details id="lo41GapDetails" '+(previously?'open':'')+'><summary>Reality vs Ideal · evidence gaps <small>previous 7 complete days</small></summary>'+
 '<p class="lo41-note">Compares each configured ideal routine with finished timers of the same activity name on its scheduled weekday. This is a narrow, name-based match; it does not prove that other differently named activities did not occur.</p>'+
 '<div class="lo41-metrics"><span><strong>'+data.met+'</strong><small>Recorded targets met</small></span><span><strong>'+data.partial+'</strong><small>Recorded below target</small></span><span><strong>'+data.unmatched+'</strong><small>No matching timer</small></span><span><strong>'+data.uncertain+'</strong><small>Duration uncertain</small></span></div>'+
 (data.aggregates.length?data.aggregates.map(group=>{
  const p=group.preference;return '<article class="lo41-entry"><header><strong>'+esc(p.name)+'</strong><small>'+esc(String(p.durationMinutes))+' min preferred on '+['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][Number(p.dayOfWeek)]+'</small></header>'+
  group.rows.map(day=>'<p class="lo41-evidence"><span>'+esc(day.date)+' · '+esc(day.kind)+'</span><small>Tracked '+day.matchedMinutes+' min / ideal '+day.targetMinutes+' min · '+day.matchedCount+' matching finished timer(s)'+(day.assumedExamples?' · '+day.assumedExamples+' assumed example(s) excluded':'')+'</small></p>').join('')+
  '<p class="lo41-advice">'+esc(suggestion(group))+'</p></article>';
 }).join(''):'<p class="lo41-note">No ideal routines defined yet. Use “Configure ideal weekly routines” to set preferences. No past activities have been reclassified.</p>')+
 '<p class="lo41-note">A missing timer is unknown, not a missed commitment. The comparison is based on the previous seven complete calendar days, not the coming week. Overlapping timers may inflate total duration. No schedules or habits were changed.</p>'+
 '<button class="btn outline" id="lo41EditIdeal" type="button">Review ideal routine settings ↗</button></details>';
 expanded=previously;
}
function init(){
 if(!$('lo40Compare'))return;
 const container=$('lo40Compare');
 container.addEventListener('click',e=>{
  if(e.target.closest('#lo41EditIdeal')){
   const settings=$('idealRoutineForm')?.closest('details');
   if(settings){settings.open=true;settings.scrollIntoView({behavior:'smooth',block:'start'})}
  }
 });
 container.addEventListener('toggle',e=>{if(e.target.id==='lo41GapDetails')expanded=e.target.open},true);
 render();
 document.addEventListener('click',e=>{if(e.target.closest('#lifeosNavigation,#scheduleList,#idealRoutineForm,#lo40Compare'))setTimeout(render,130)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.lifeosRealityGapV41={evaluate,render};
})();