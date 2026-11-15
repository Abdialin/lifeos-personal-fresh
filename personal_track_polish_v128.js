/* V128 — Track presentation refinement. No record writes or timer replacements. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSTrackPolishV128=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const $=id=>root.document.getElementById(id);
const make=(tag,cls,text)=>{const el=root.document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
const nums=v=>{const s=String(v||'').trim(),h=s.match(/(\d+)\s*h/),m=s.match(/(\d+)\s*m/);return h||m?(Number(h?.[1]||0)*60+Number(m?.[1]||0)):0};
function createDetails(id,title){const d=make('details','lo128-accordion');d.id=id;d.append(make('summary','',title));return d}
function compactTimer(){
 const active=$('trackActivePanel'),sessions=$('sessions'),clock=$('lo77-timer-quick');if(!active||!sessions||!clock)return;
 let d=$('lo128SessionsDetails');
 if(!d){
  d=createDetails('lo128SessionsDetails','All active sessions & detailed controls');
  d.classList.add('lo126-protected');
  const after=$('lo126TimerSettings');
  if(after)after.before(d);else active.append(d);
  d.append(sessions);
 }
 const s=root.lifeosReadOnlyWorkspace?.()?.sessions;
 const n=Array.isArray(s)?s.filter(x=>['running','paused'].includes(x?.status)).length:0;
 d.hidden=n<1;
 const message=$('lo77-status');
 if(n>0&&message&&/timer finished and verified/i.test(message.textContent||'')){
  message.textContent='';
 }
 d.querySelector('summary').textContent='All active sessions'+(n?' · '+n:'')+' & detailed controls';
}
function distraction(){
 const p=$('trackDistractionPanel');if(!p)return;
 let d=$('lo128DistractionDetails');
 if(!d){
  d=createDetails('lo128DistractionDetails','See distraction patterns & classification');
  const h=make('p','lo128-context','Only explicitly tracked distractions count. Review periods, causes, and classifications when needed.');
  d.append(h);
  p.append(d);
 }
 for(const node of [...p.childNodes]){
  if(node===d||node.nodeType!==1)continue;
  if(node.matches?.('.head,.row,.note'))continue;
  if(node.id==='lo128DistractionShort')continue;
  d.append(node);
 }
 const summary=p.querySelector('.head .sub');if(summary)summary.textContent='A dedicated one-tap distraction timer.';
 p.classList.add('lo128-distraction-compact');
}
function summary(){
 const host=$('todayLegacyOverviewPanel');if(!host)return;
 const wrap=$('lo126TotalsDetails');
 if(wrap?.querySelector('summary'))wrap.querySelector('summary').textContent='Today’s time breakdown';
 if(host.querySelector('.lo128-time-visual'))return;
 const visual=make('div','lo128-time-visual');
 visual.setAttribute('aria-label','Visual breakdown of unique time and concurrent recorded durations');
 const ring=make('div','lo128-time-ring'),inner=make('div','lo128-time-ring-inner');
 inner.append(make('small','','UNIQUE'),make('strong','lo128-ring-number','—'));
 ring.append(inner);
 const legend=make('div','lo128-time-legend');
 legend.append(make('div','lo128-time-legend-row','● Clock coverage (overlaps counted once)'),
   make('div','lo128-time-legend-row','● Additional overlapping activity duration'));
 visual.append(ring,legend);
 const date=$('todayDate');if(date)date.after(visual);else host.prepend(visual);
}
function updateVisual(){
 if(document.body.dataset.lifeosView!=='tracking')return;
 const ring=$('todayLegacyOverviewPanel .lo128-time-ring'),number=$('todayLegacyOverviewPanel .lo128-ring-number');
 if(!ring||!number)return;
 const total=nums($('tracked')?.textContent),unique=nums($('uniqueTime')?.textContent),overlap=nums($('overlapTime')?.textContent);
 const denominator=total>0?total:unique+overlap;
 const ratio=denominator>0?Math.min(100,Math.max(0,unique/denominator*100)):0;
 ring.style.setProperty('--lo128-ratio',ratio.toFixed(2)+'%');
 number.textContent=$('uniqueTime')?.textContent?.trim()||'0m';
 const host=$('todayLegacyOverviewPanel');host.dataset.lo128HasEvidence=denominator>0?'yes':'no';
}
function quick(){
 const panel=$('trackQuickPanel'),grid=$('quick');if(!panel||!grid)return;
 const sub=panel.querySelector('.head .sub');if(sub)sub.textContent='Tap once to start. Use Show All for more activities.';
 const context=panel.querySelector('.lo126-quick-context');if(context)context.hidden=true;
 for(const button of grid.querySelectorAll('button')){
  const label=button.dataset.name||button.textContent;
  // Always derive visual category from the existing V126 heuristic.
  const cat=root.LifeOSTrackDesignV126?.category?.(label)||'other';
  button.dataset.lo126Category=cat;
  button.classList.add('lo128-tile');
 }
 const note=panel.querySelector('.note');
 if(note&&!note.closest('details')){
  let d=$('lo128QuickHelp');
  if(!d){d=createDetails('lo128QuickHelp','How parallel timers work');panel.append(d)}
  d.append(note);
 }
}
function history(){
 const p=$('trackHistoryPanel');if(!p)return;
 const meta=p.querySelector('.head .sub');
 if(meta)meta.textContent='Search, correct and export your activity records.';
 let ribbon=$('lo128HistoryIntro');
 if(!ribbon){
  ribbon=make('div','lo128-history-ribbon');
  ribbon.id='lo128HistoryIntro';
  ribbon.append(make('span','lo128-ribbon-label','YOUR ACTIVITY ARCHIVE'),make('span','','Month → Week → Day'));
  const header=p.querySelector('.head');if(header)header.before(ribbon);else p.prepend(ribbon);
 }
 const chart=$('lo127WeekDetails');
 if(chart){
  const h=chart.querySelector(':scope > summary');if(h)h.textContent='7-day activity chart';
  // Closing the chart initially is deliberate; preserve user's own clicks.
  if(!chart.dataset.lo128Initialized){chart.open=false;chart.dataset.lo128Initialized='1'}
 }
}
function mount(){
 if($('lo128Mounted'))return;
 const r=$('lo127TrackSurface');if(!r)return;
 const marker=make('span','');marker.id='lo128Mounted';marker.hidden=true;r.append(marker);
 compactTimer();distraction();summary();quick();history();updateVisual();
 // The original V77 Review action scrolls to #sessions. Because V128 folds
 // that list, open its parent first so Review cannot land on hidden controls.
 document.addEventListener('click',event=>{
  if(event.target.closest('#lo77-timer-quick [data-v77-action="review"],#lo86-timer [data-lo86="review"]')){
   const d=$('lo128SessionsDetails');if(d)d.open=true;
  }
 },true);
 const check=()=>{if(document.body.dataset.lifeosView==='tracking'){compactTimer();distraction();quick();updateVisual()}};
 root.setInterval(check,6000);root.addEventListener('focus',check);
}
function init(){root.setTimeout(mount,1900);root.setTimeout(mount,3000)}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()}
return {nums};
});
