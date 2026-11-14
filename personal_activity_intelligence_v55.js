/* LifeOS Personal V55 — daily activity intelligence. Read-only and conservative by design. */
(function(root){
'use strict';
const KEY='lifeos-live-v1';
function intersect(first,second,merge){
 const a=merge(first),b=merge(second);let i=0,j=0,result=[];
 while(i<a.length&&j<b.length){const start=Math.max(a[i][0],b[j][0]),end=Math.min(a[i][1],b[j][1]);if(end>start)result.push([start,end]);if(a[i][1]<b[j][1])i++;else j++;}
 return result;
}
function inspect(workspace,date,now,engine){
 if(!engine||typeof engine.build!=='function')return {error:'Timeline engine is unavailable'};
 const day=engine.build(workspace,date,now);if(day.error)return {error:day.error};
 const end=day.cutoff,start=day.start;
 const actual=engine.merge(day.records.filter(r=>r.origin!=='sample'&&r.start<end).map(r=>[r.start,Math.min(end,r.end)]).filter(x=>x[1]>x[0]));
 const planned=engine.merge(day.plans.map(r=>[r.start,r.end]));
 const plannedToDate=engine.merge(day.plans.filter(r=>r.start<end).map(r=>[r.start,Math.min(r.end,end)]));
 const common=intersect(actual,plannedToDate,engine.merge);
 const actualMs=engine.length(actual),plannedMs=engine.length(planned),commonMs=engine.length(common),elapsedMs=Math.max(0,end-start);
 const gapMs=engine.length(day.gaps),smallUnobservedMs=Math.max(0,elapsedMs-actualMs-gapMs);
 // Time overlap is not proof that the planned activity was actually performed.
 const result={date,start,end,elapsedMs,actualMs,plannedMs,plannedToDateMs:engine.length(plannedToDate),overlapMs:commonMs,unplannedActualMs:Math.max(0,actualMs-commonMs),unloggedLongMs:gapMs,unloggedShortMs:smallUnobservedMs,
  coveragePct:elapsedMs?Math.round(actualMs/elapsedMs*100):null,
  planTimeCoveragePct:engine.length(plannedToDate)?Math.round(commonMs/engine.length(plannedToDate)*100):null,
  recordedCount:day.stats.recordCount,
  sampleCount:day.stats.exampleCount,
  overlappingSessions:day.overlaps.length,
  longGapCount:day.gaps.length,
  isFuture:now<=start,warning:null};
 result.warning=result.isFuture?'Future day; no real activity is assumed.':result.sampleCount?'Development examples excluded from actual-time calculations.':null;
 return result;
}
function localDate(t){const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function previousDates(date,n){const d=new Date(date+'T12:00:00');if(!Number.isFinite(d.getTime()))return [];return Array.from({length:n},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()-(n-1-i));return localDate(x.getTime())})}
function trend(workspace,date,now,engine){return previousDates(date,7).map(d=>inspect(workspace,d,now,engine))}
function format(ms){if(!Number.isFinite(ms))return '—';const m=Math.floor(ms/60000);return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m'}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(host,workspace,date,now,engine){
 const report=inspect(workspace,date,now,engine);
 const cards=host.querySelector('[data-v55-cards]'),bars=host.querySelector('[data-v55-trend]'),note=host.querySelector('[data-v55-note]');
 if(report.error){cards.textContent=report.error;bars.replaceChildren();return;}
 const metrics=[
 ['Recorded time',format(report.actualMs),'Unique recorded intervals'],
 ['Planned time',format(report.plannedMs),'Entire selected day'],
 ['Plan–record overlap',format(report.overlapMs),'Clock overlap only; activity not verified'],
 ['Recorded outside plans',format(report.unplannedActualMs),'Not assigned to a plan'],
 ['Long unlogged gaps',format(report.unloggedLongMs),report.longGapCount+' gaps of at least 45 min'],
 ['Record coverage',report.coveragePct===null?'—':report.coveragePct+'%','Share of elapsed day with records']
 ];
 cards.innerHTML=metrics.map(([title,value,help])=>'<article class="lo55-card"><span>'+esc(title)+'</span><strong>'+esc(value)+'</strong><small>'+esc(help)+'</small></article>').join('');
 const history=trend(workspace,date,now,engine).filter(x=>!x.error);
 const max=Math.max(1,...history.map(x=>x.elapsedMs));
 bars.innerHTML=history.map(x=>'<div class="lo55-trendrow"><span>'+esc(x.date.slice(5))+'</span><div class="lo55-bar" role="img" aria-label="'+esc(x.date+': '+format(x.actualMs)+' recorded, '+format(x.plannedMs)+' planned')+'"><div class="lo55-actual" style="width:'+(x.actualMs/max*100).toFixed(3)+'%"></div><div class="lo55-planned" style="width:'+(Math.min(x.plannedMs,x.elapsedMs)/max*100).toFixed(3)+'%"></div></div><b>'+esc(format(x.actualMs))+'</b></div>').join('');
 note.textContent='Coverage measures how much elapsed time has a recorded activity, not whether the day was productive. Plans are independent of actual time. Overlapping clock intervals cannot confirm which planned task was completed. Short gaps below 45 minutes are not shown as long gaps. '+(report.warning||'');
}
function mount(){
 if(typeof document==='undefined')return;const parent=document.getElementById('lo53-unified');if(!parent||document.getElementById('lo55-intelligence'))return;
 const host=document.createElement('section');host.id='lo55-intelligence';host.className='lo55-intelligence';
 host.innerHTML='<h3>Activity intelligence · 7-day perspective</h3><p class="sub">Compare evidence, plans and tracking coverage without changing your records.</p><div class="lo55-grid" data-v55-cards></div><h4>Recorded time across the last 7 dates</h4><div data-v55-trend></div><p class="lo55-note" data-v55-note></p>';parent.appendChild(host);
 const picker=parent.querySelector('#lo53-date');
 const update=()=>{try{const workspace=JSON.parse(localStorage.getItem(KEY)||'null');render(host,workspace,picker?.value||'',Date.now(),window.LifeOSActivityTimelineV54)}catch(e){host.querySelector('[data-v55-cards]').textContent='Could not read the activity workspace.';}};
 picker?.addEventListener('change',update);window.addEventListener('lifeos-v65-plan-committed',update);window.addEventListener('storage',e=>{if(e.key===KEY)update()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});update();setInterval(()=>{if(!document.hidden)update()},30000);
}
const api={inspect,intersect,trend,previousDates};
if(typeof module==='object'&&module.exports)module.exports=api;
if(typeof window!=='undefined')window.LifeOSActivityIntelligenceV55=api;
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount()}
})(typeof window!=='undefined'?window:globalThis);
