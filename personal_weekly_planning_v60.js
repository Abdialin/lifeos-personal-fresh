/* LifeOS Personal V60 — weekly planning review (read-only). */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSWeeklyPlanningV60=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos-live-v1',MINUTE=60000;
const valid=x=>x&&Number.isFinite(x.startAt)&&Number.isFinite(x.endAt)&&x.endAt>x.startAt;
function localDay(t){const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function span(x,left,right){return valid(x)&&x.endAt>left&&x.startAt<right?[Math.max(left,x.startAt),Math.min(right,x.endAt)]:null}
function union(intervals){const sorted=intervals.filter(x=>x&&x[1]>x[0]).sort((a,b)=>a[0]-b[0]),merged=[];for(const [a,b] of sorted){const last=merged[merged.length-1];if(last&&a<=last[1])last[1]=Math.max(last[1],b);else merged.push([a,b])}return merged}
function total(intervals){return union(intervals).reduce((n,x)=>n+x[1]-x[0],0)}
function review(workspace,anchor,modules){
 if(!Number.isFinite(anchor)||!modules?.comparison||!modules?.predictor||!modules?.planner||!modules?.timeline)return {error:'Required planning modules unavailable'};
 const overview=modules.comparison.compare(workspace||{},anchor,modules.predictor,modules.planner,modules.timeline);
 if(overview.error)return {error:overview.error};
 const plans=overview.plans||[],ideals=overview.ideals||[],predictions=overview.predictions||[],days=[];
 let t=new Date(overview.range.from);t.setHours(0,0,0,0);
 for(let index=0;index<7;index++){
  const a=t.getTime(),endDate=new Date(t);endDate.setDate(endDate.getDate()+1);const b=endDate.getTime();
  const todays=plans.filter(x=>span(x,a,b)),times=todays.map(x=>span(x,a,b)),plannedMs=total(times);
  const sorted=todays.slice().sort((x,y)=>x.startAt-y.startAt),overlaps=[],shortBreaks=[];
  for(let i=0;i<sorted.length;i++){
   for(let j=i+1;j<sorted.length;j++){const x=sorted[i],y=sorted[j];if(x.startAt<y.endAt&&y.startAt<x.endAt)overlaps.push({first:String(x.name||'Plan'),second:String(y.name||'Plan')});}
   if(i){const previous=sorted[i-1],next=sorted[i],gap=next.startAt-previous.endAt;if(gap>=0&&gap<30*MINUTE)shortBreaks.push({from:String(previous.name||'Plan'),to:String(next.name||'Plan'),minutes:Math.floor(gap/MINUTE)});}
  }
  const idealToday=ideals.filter(x=>span(x,a,b)),predictedToday=predictions.filter(x=>span(x,a,b));
  const highLoad=plannedMs>=8*60*MINUTE;
  days.push({date:localDay(a),start:a,end:b,plans:todays,plannedMs,overlaps,shortBreaks,idealCount:idealToday.length,predictions:predictedToday,
   highLoad,warnings:[...(highLoad?['At least 8 hours scheduled (review workload and recovery)']:[]),...(overlaps.length?[overlaps.length+' overlapping plan pairs']:[]),...(shortBreaks.length?[shortBreaks.length+' breaks shorter than 30 minutes']:[])]});
  t=endDate;
 }
 return {error:null,range:overview.range,days,summary:{plannedMs:total(plans.map(p=>[p.startAt,p.endAt])),planCount:plans.length,overlapDays:days.filter(d=>d.overlaps.length).length,highLoadDays:days.filter(d=>d.highLoad).length,shortBreakDays:days.filter(d=>d.shortBreaks.length).length,predictions:predictions.length,ideal:ideals.length,evidence:overview.evidence},
  limitations:['Eight hours is a review flag, not a universal safe workload limit','Short breaks are suggestions, not proof of inadequate recovery','Unlogged time is unknown, never confirmed available','All changes require explicit separate approval']};
}
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function time(ms){return new Date(ms).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}
function mins(ms){return Math.round(ms/MINUTE)}
function render(host,workspace,anchor){
 const body=host.querySelector('[data-v60-days]'),summary=host.querySelector('[data-v60-summary]');if(!body||!summary)return;
 const report=review(workspace,anchor,{comparison:root.LifeOSThreeViewV57,predictor:root.LifeOSPredictivePreviewV56,planner:root.LifeOSPersonalPlanner,timeline:root.LifeOSActivityTimelineV54});
 if(report.error){summary.textContent=report.error;body.replaceChildren();return;}
 summary.textContent=report.summary.planCount+' plans · '+Math.round(report.summary.plannedMs/MINUTE/60*10)/10+' unique scheduled hours · '+report.summary.overlapDays+' days with plan overlaps · '+report.summary.highLoadDays+' days flagged for high load.';
 body.innerHTML=report.days.map(d=>'<article class="lo60-day"><header><strong>'+esc(new Date(d.start).toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'}))+'</strong><span>'+esc((d.plannedMs/3600000).toFixed(1))+' h scheduled</span></header><div class="lo60-items">'+(d.plans.length?d.plans.map(p=>'<div>'+esc(time(p.startAt))+'–'+esc(time(p.endAt))+' · '+esc(p.name||'Plan')+'</div>').join(''):'<small>No plans recorded; availability unknown.</small>')+'</div><p class="lo60-context">'+d.idealCount+' ideal routine(s) · '+d.predictions.length+' predicted suggestion(s)</p>'+(d.warnings.length?'<p class="lo60-warn">'+esc(d.warnings.join(' · '))+'</p>':'')+'</article>').join('');
}
function mount(){
 const parent=document.getElementById('lo59-improvements');if(!parent||document.getElementById('lo60-weekly'))return;
 const section=document.createElement('section');section.id='lo60-weekly';section.className='lo60-weekly';section.innerHTML='<h3>Intelligent weekly planning</h3><p class="sub">A review-only seven-day planner. Plans, ideal routines and predictions remain separate, and unlogged time is unknown.</p><p data-v60-summary class="lo60-summary" role="status"></p><div data-v60-days class="lo60-grid"></div><p class="sub">Workload flags use an illustrative threshold of 8 scheduled hours. Breaks under 30 minutes are highlighted for review; neither flag establishes personal recovery requirements. No schedule changes are made automatically.</p>';parent.appendChild(section);
 const refresh=()=>{let w=null;try{w=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}render(section,w,Date.now())};
 window.addEventListener('storage',e=>{if(e.key===KEY)refresh()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});refresh();
}
const api={review,union,total,span};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount()}
return api;
});
