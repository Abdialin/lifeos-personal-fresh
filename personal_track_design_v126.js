/* LifeOS Personal V126 — Track command center.
 * DOM reorganization only. Existing timer, history, edit, backup and plan handlers
 * are retained on the original nodes. Read-only visual data summaries are derived
 * from confirmed non-development session segments; no workspace writes.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSTrackDesignV126=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const $=id=>root.document.getElementById(id);
const make=(tag,cls,label)=>{const x=root.document.createElement(tag);if(cls)x.className=cls;if(label!==undefined)x.textContent=label;return x};
const isExample=s=>Boolean(s&&(s.seedBatch||s.source==='development-starter'||s.source==='development-example'||s.isExample===true));
const ms=60000,DAY=86400000;
function uniqueLength(intervals){
 const valid=intervals.filter(x=>Array.isArray(x)&&Number.isFinite(x[0])&&Number.isFinite(x[1])&&x[1]>x[0]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 let total=0,left=-Infinity,right=-Infinity;
 for(const [a,b] of valid){if(a>right){if(right>left)total+=right-left;left=a;right=b;}else right=Math.max(right,b)}
 if(right>left)total+=right-left;return total;
}
function dailyEvidence(workspace,end=Date.now(),count=7){
 const result=[],today=new Date(end);
 for(let daysAgo=count-1;daysAgo>=0;daysAgo--){
  const date=new Date(today.getFullYear(),today.getMonth(),today.getDate()-daysAgo);
  const start=date.getTime(),stop=new Date(date.getFullYear(),date.getMonth(),date.getDate()+1).getTime(),cutoff=Math.min(stop,end);
  const segments=[];let sourceSessions=0;
  if(cutoff>start)for(const s of workspace?.sessions||[]){
   if(!s||isExample(s)||!Array.isArray(s.segments))continue;
   let present=false;
   for(const seg of s.segments){
    if(!Number.isFinite(seg?.start))continue;
    const finish=Number.isFinite(seg.end)?seg.end:(seg.end==null&&s.status==='running'?end:NaN);
    if(!Number.isFinite(finish)||finish<seg.start)continue;
    const a=Math.max(start,seg.start),b=Math.min(cutoff,finish);
    if(b>a){segments.push([a,b]);present=true}
   }
   if(present)sourceSessions++;
  }
  const covered=uniqueLength(segments);
  result.push({start,dateLabel:date.toLocaleDateString(undefined,{weekday:'short'}),dateKey:[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-'),minutes:Math.round(covered/ms),sessionCount:sourceSessions,dayMinutes:(cutoff-start)/ms});
 }
 return result;
}
function category(text){
 const n=String(text||'').toLowerCase();
 if(/prayer|fajr|dhuhr|asr|maghrib|isha|quran|memor|hadith|arabic/.test(n))return 'spiritual';
 if(/study|read|school|course|assign|university/.test(n))return 'learning';
 if(/work|business|security|shift|project/.test(n))return 'work';
 if(/fitness|gym|walk|run|exercise|workout/.test(n))return 'fitness';
 if(/meal|eat|food|lunch/.test(n))return 'food';
 if(/distraction/.test(n))return 'distraction';
 return 'other';
}
function shell(summary,cls,id){
 const d=make('details',cls);if(id)d.id=id;
 d.append(make('summary','',summary));return d;
}
function targetJump(target){
 const node=$(target);if(!node)return;
 let p=node.parentElement;
 while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement}
 root.requestAnimationFrame(()=>node.scrollIntoView({behavior:'smooth',block:'start'}));
}
let initialized=false;
function build(){
 if(initialized)return;
 const active=$('trackActivePanel'),quick=$('trackQuickPanel'),history=$('trackHistoryPanel');
 if(!active||!quick||!history)return;
 initialized=true;
 const column=active.parentElement,document=root.document;
 const guide=make('div','lo126-guide');guide.id='lo126TrackGuide';
 guide.setAttribute('aria-label','Tracking command center');
 const heading=make('div','lo126-guide-heading');
 heading.append(make('span','lo126-eyebrow','TRACK · LIVE WORKSPACE'),make('h2','','Track your time, effortlessly'),
   make('p','','Start an activity, manage running timers, and review what you actually recorded.'));
 const metrics=make('div','lo126-metrics');
 for(const [id,label,colour] of [['lo126Active','Active timers','mint'],['lo126Finished','Finished today','purple'],['lo126Unique','Unique time today','blue']]){
  const cell=make('div','lo126-metric');cell.dataset.tone=colour;
  cell.append(make('small','',label),make('strong','', '—'));cell.querySelector('strong').id=id;metrics.append(cell);
 }
 const actions=make('div','lo126-actions');
 for(const [label,id,cls] of [['▶ Start activity','trackQuickPanel','primary'],['◉ Manage timers','trackActivePanel','secondary'],['▥ History','trackHistoryPanel','secondary']]){
  const button=make('button','lo126-action '+cls,label);
  button.type='button';button.addEventListener('click',()=>targetJump(id));actions.append(button);
 }
 guide.append(heading,metrics,actions);
 active.before(guide);
 // A timer already running is the highest-priority evidence; otherwise
 // Quick Start should appear before the empty Active sessions panel.
 const current=Number(($('activeCount')?.textContent||'0').match(/\d+/)?.[0]||0);
 if(current===0)guide.after(quick,active);else guide.after(active,quick);
 const distraction=$('trackDistractionPanel');
 if(distraction)quick.after(distraction);
 const context=make('p','lo126-quick-context','Tap a category to start its timer. Other timers can keep running alongside it.');
 const quickGrid=$('quick');quickGrid?.before(context);
 const more=make('button','lo126-more','Show all quick activities');
 more.type='button';more.id='lo126QuickMore';more.setAttribute('aria-expanded','false');
 if(quickGrid)quickGrid.after(more);
 let showAll=false;
 function quickRefresh(){
  if(!quickGrid)return;
  for(const button of quickGrid.children){
   button.dataset.lo126Category=category(button.textContent);
  }
  const total=quickGrid.children.length;
  more.hidden=total<=6;
  more.textContent=showAll?'Show fewer activities':'Show all '+total+' quick activities';
  quickGrid.classList.toggle('lo126-quick-expanded',showAll);
  more.setAttribute('aria-expanded',String(showAll));
 }
 more.addEventListener('click',()=>{showAll=!showAll;quickRefresh()});
 quickRefresh();
 // Keep visible timer controls (including V77 live clock) above the optional
 // duration profiles, local checkpoint tests and device diagnostics.
 const settings=shell('Timer duration settings & background checks','lo126-timer-settings','lo126TimerSettings');
 const detail=make('p','lo126-help','Configure expected durations and review local timer diagnostics when needed. Existing timers are not changed by opening this panel.');
 settings.append(detail);active.append(settings);
 function activeRefresh(){
  for(const child of [...active.children]){
   if(child===settings||child===active.querySelector(':scope > .head')||child.id==='sessions'||child.id==='lo77-timer-quick')continue;
   if(child.classList?.contains('lo126-protected'))continue;
   if(child.tagName==='SCRIPT'||child.tagName==='STYLE')continue;
   settings.append(child);
  }
 }
 activeRefresh();
 // Place history immediately after the primary timer actions, not after a
 // large body of unrelated planning/analytics reports.
 const anchor=distraction||quick;
 anchor.after(history);
 const archive=make('div','lo126-history-head');
 archive.append(make('span','lo126-eyebrow','YOUR ACTUAL RECORDS'),
  make('p','','Search, edit, or review your recorded sessions. Month, week and day remain expandable.'));
 history.prepend(archive);
 const chart=make('div','lo126-week-chart');chart.id='lo126WeekChart';chart.setAttribute('aria-label','Seven-day verified recording coverage');
 history.querySelector('.lo-history-toolbar')?.before(chart);
 // Secondary tasks are discoverable without occupying multiple screens.
 const past=$('trackPastPanel');
 if(past){
  const wrap=shell('＋ Log a past activity','lo126-detail','lo126PastDetails');
  history.after(wrap);wrap.append(past);
 }
 const summary=$('todayLegacyOverviewPanel');
 if(summary){
  const wrap=shell('Today’s full tracking totals','lo126-detail','lo126TotalsDetails');
  (past?.parentElement?.id==='lo126PastDetails'?past.parentElement:history).after(wrap);
  wrap.append(summary);
 }
 const extras=shell('More tracking tools & detailed reviews','lo126-extras','lo126TrackExtras');
 const sub=make('div','lo126-extra-intro');
 sub.append(make('p','','Advanced activity evidence, schedule recommendations, technical diagnostics, and supporting reports remain available here.'),
  make('p','lo126-muted','Planned time is never counted as tracked time; example activities remain unverified.'));
 extras.append(sub);
 const extrasList=make('div','lo126-extra-list');extras.append(extrasList);
 (summary?.parentElement?.id==='lo126TotalsDetails'?summary.parentElement:past?.parentElement?.id==='lo126PastDetails'?past.parentElement:history).after(extras);
 const reserved=new Set(['trackActivePanel','trackQuickPanel','trackDistractionPanel','trackHistoryPanel','trackPastPanel','todayLegacyOverviewPanel']);
 function foldExtras(){
  if(document.body.dataset.lifeosView!=='tracking')return;
  const columns=[column,document.querySelector('.layout > aside')].filter(Boolean);
  for(const container of columns){
   for(const item of [...container.children]){
    if(!item.matches?.('section.panel')||reserved.has(item.id)||item.hidden||item.classList.contains('lifeos-hidden-panel'))continue;
    if(item.dataset.lifeosArea&&item.dataset.lifeosArea!=='tracking')continue;
    extrasList.append(item);
   }
  }
  extras.hidden=extrasList.children.length===0;
  quickRefresh();activeRefresh();
 }
 foldExtras();
 function summaryUpdate(){
  if(document.body.dataset.lifeosView!=='tracking')return;
  const activeText=$('activeCount')?.textContent||'0';
  $('lo126Active').textContent=activeText.match(/\d+/)?.[0]||'0';
  $('lo126Finished').textContent=$('completed')?.textContent?.trim()||'—';
  $('lo126Unique').textContent=$('uniqueTime')?.textContent?.trim()||'—';
  let ws=null;try{ws=root.lifeosReadOnlyWorkspace?.()||null}catch{}
  if(!ws){chart.textContent='Recording history is temporarily unavailable.';return}
  const evidence=dailyEvidence(ws),signature=evidence.map(x=>x.minutes+'/'+x.sessionCount).join('|');
  if(chart.dataset.signature===signature)return;chart.dataset.signature=signature;
  chart.replaceChildren();
  const header=make('div','lo126-chart-head');
  header.append(make('strong','','Unique tracked time · last 7 days'),
    make('small','','Actual sessions only · no development examples'));
  chart.append(header);
  const rows=make('div','lo126-chart-rows');
  for(const x of evidence){
   const row=make('div','lo126-chart-row');
   row.setAttribute('aria-label',x.dateKey+': '+x.minutes+' unique recorded minutes from '+x.sessionCount+' sessions');
   row.append(make('span','lo126-day',x.dateLabel));
   const bar=make('div','lo126-chart-track');
   bar.setAttribute('role','img');bar.setAttribute('aria-label',x.dateKey+' recorded '+x.minutes+' minutes');
   const fill=make('i','lo126-chart-fill');
   fill.style.width=Math.min(100,Math.max(0,x.dayMinutes?x.minutes/x.dayMinutes*100:0))+'%';
   bar.append(fill);row.append(bar);
   const hr=Math.floor(x.minutes/60),mins=x.minutes%60;
   row.append(make('span','lo126-day-count',hr?hr+'h '+String(mins).padStart(2,'0')+'m':mins+'m'));rows.append(row);
  }
  chart.append(rows,make('p','lo126-chart-note','This is clock coverage, not a productivity rating. Unlogged periods are unknown, and simultaneous activities count once.'));
 }
 const scan=()=>{
  if(document.body.dataset.lifeosView!=='tracking')return;
  foldExtras();summaryUpdate();
 };
 root.setInterval(scan,6000);
 root.addEventListener('focus',scan);
 root.document.addEventListener('visibilitychange',()=>{if(!document.hidden)scan()});
 document.querySelector('#lifeosNavigation')?.addEventListener('click',()=>root.setTimeout(scan,100));
 root.setTimeout(scan,500);
 root.setTimeout(scan,1800);
}
function init(){root.setTimeout(build,500);}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()}
return {uniqueLength,dailyEvidence,category};
});
