/* LifeOS V129 | Track editorial visual system.
   Preserves all original controls, recording semantics and metrics.
   Product-quality presentation is derived from read-only evidence. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSTrackVisualV129=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const d=()=>root.document,$=id=>d().getElementById(id),el=(tag,cls,text)=>{
 const n=d().createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;
};
const fmt=m=>{let v=Math.max(0,Math.round(Number(m)||0));return v>=60?Math.floor(v/60)+'h '+String(v%60).padStart(2,'0')+'m':v+'m'};
const dateKey=t=>{const a=new Date(t);return [a.getFullYear(),String(a.getMonth()+1).padStart(2,'0'),String(a.getDate()).padStart(2,'0')].join('-')};
function makeMetric(title,value,detail,tone){
 const n=el('article','lo129-stat');n.dataset.tone=tone;
 n.append(el('span','lo129-stat-caption',title),el('strong','lo129-stat-value',value),el('small','lo129-stat-note',detail));
 return n;
}
function getReport(days=7){
 const w=root.lifeosReadOnlyWorkspace?.()||{},fn=root.LifeOSInsightsSuiteV94?.distraction;
 if(!fn)return null;
 try{return fn(w,Date.now(),[7,14,30].includes(Number(days))?Number(days):7)}catch{return null}
}
function cat(name){
 const label=String(name||'').toLowerCase();
 if(/prayer|quran|memor|hadith|arabic/.test(label))return 'spiritual';
 if(/study|read|course|school|university/.test(label))return 'learning';
 if(/business|work|project|security/.test(label))return 'work';
 if(/gym|fitness|run|exercise|walk/.test(label))return 'fitness';
 if(/eat|food|meal/.test(label))return 'food';
 if(/distraction/.test(label))return 'distraction';
 if(/sleep/.test(label))return 'sleep';
 return 'other';
}
const COLORS={work:'#E7A46D',learning:'#6EACFF',spiritual:'#BA9BFF',fitness:'#50CBB2',food:'#EBA58E',distraction:'#EF83A7',sleep:'#899BFA',other:'#A6C0D9'};
function themeQuick(){
 const grid=$('quick');if(!grid)return;
 for(const b of grid.querySelectorAll('button[data-name]')){
  const c=cat(b.dataset.name);
  b.dataset.lo129Category=c;b.style.setProperty('--lo129-icon',COLORS[c]);
 }
}
function createBars(rows,dayCount){
 const chart=el('div','lo129-mini-bars');
 const values=new Map((rows||[]).map(x=>[x[0],x[1]]));
 const today=new Date();today.setHours(12,0,0,0);
 const keys=[];
 for(let n=dayCount-1;n>=0;n--){
  const day=new Date(today);day.setDate(day.getDate()-n);keys.push([dateKey(day),day.toLocaleDateString(undefined,{weekday:'short'})]);
 }
 const max=Math.max(1,...keys.map(([key])=>Number(values.get(key)||0)));
 for(const [key,label] of keys){
  const minutes=Math.round(Number(values.get(key)||0)/60000);
  const bar=el('div','lo129-bar');
  const caption=el('span','lo129-bar-caption',label);
  const track=el('span','lo129-bar-track');track.title=key+': '+fmt(minutes);
  const fill=el('span','lo129-bar-fill');fill.style.width=Math.min(100,Number(values.get(key)||0)/max*100).toFixed(2)+'%';
  track.append(fill);
  bar.append(caption,track,el('span','lo129-bar-value',fmt(minutes)));
  chart.append(bar);
 }
 return chart;
}
function createDistractionDesign(){
 const shell=$('lo128DistractionDetails'),parent=$('trackDistractionPanel');
 if(!shell||!parent)return false;
 let dashboard=$('lo129DistractionDashboard');
 if(!dashboard){
  dashboard=el('section','lo129-distraction-dashboard');dashboard.id='lo129DistractionDashboard';
  const lead=el('div','lo129-section-heading');
  lead.append(el('span','lo129-kicker','DISTRACTION · EVIDENCE'),
   el('h3','','Patterns at a glance'),
   el('p','','What you recorded, without assumptions about unlogged time.'));
  dashboard.append(lead);
  const controls=el('div','lo129-range');controls.setAttribute('role','group');controls.setAttribute('aria-label','Distraction analysis period');
  for(const days of [7,14,30]){
   const b=el('button','lo129-range-btn',days+'d');b.type='button';b.dataset.days=String(days);
   b.addEventListener('click',()=>{
    dashboard.dataset.days=String(days);
    const sel=$('lo94-period');if(sel){sel.value=String(days);sel.dispatchEvent(new Event('change',{bubbles:true}))}
    renderDistraction();
   });controls.append(b);
  }
  dashboard.append(controls);
  dashboard.append(el('div','lo129-stat-grid'));
  const chartCard=el('div','lo129-chart-card');
  chartCard.append(el('div','lo129-chart-title','Recorded distraction by day'),el('div','lo129-chart-sub','Daily recorded duration · not unlogged time'));
  chartCard.append(el('div','lo129-chart-slot'));
  dashboard.append(chartCard);
  const takeaway=el('div','lo129-takeaway');takeaway.setAttribute('role','status');dashboard.append(takeaway);
  const note=el('p','lo129-evidence-note','Based only on explicitly labeled sessions. Patterns are descriptive, not proof of cause.');
  dashboard.append(note);
  // Put the high-value visual summary before the original long reports.
  const first=shell.querySelector(':scope > summary');if(first)first.after(dashboard);else shell.prepend(dashboard);
  dashboard.dataset.days='7';
 }
 let deep=$('lo129DistractionDeep');
 if(!deep){
  deep=el('details','lo129-deep');deep.id='lo129DistractionDeep';
  deep.append(el('summary','','Detailed statistics & original reports'));
  shell.append(deep);
 }
 // Move every verbose legacy analytics child behind the second-level drawer,
 // not just the V94 report. The existing classification forms and handlers stay intact.
 for(const node of [...shell.children]){
  if(node===dashboard||node===deep||node.tagName==='SUMMARY'||node.classList?.contains('lo128-context'))continue;
  deep.append(node);
 }
 // Move existing large report *inside* a second-level drawer.
 // Its original select and handlers continue running; nothing is cloned.
 const report=$('lo94-suite');
 if(report&&report.parentElement!==deep)deep.append(report);
 const heading=shell.querySelector(':scope > summary');
 if(heading)heading.textContent='Distraction insights';
 renderDistraction();return true;
}
function renderDistraction(){
 const dash=$('lo129DistractionDashboard');if(!dash)return;
 const days=Number(dash.dataset.days||7),result=getReport(days);
 for(const b of dash.querySelectorAll('[data-days]')){
  const selected=Number(b.dataset.days)===days;
  b.setAttribute('aria-pressed',selected?'true':'false');
 }
 const stats=dash.querySelector('.lo129-stat-grid');
 const takeaway=dash.querySelector('.lo129-takeaway');
 const slot=dash.querySelector('.lo129-chart-slot');
 if(!result){
  stats.replaceChildren(makeMetric('Sessions','—','Waiting for evidence','rose'));
  slot.replaceChildren(el('p','lo129-empty','The analytics engine is not ready.'));
  takeaway.textContent='Your tracking records are unchanged.';return;
 }
 const peak=result.hours?.some(x=>x.ms)?String(result.hours.reduce((best,x,i,a)=>x.ms>a[best].ms?i:best,0)).padStart(2,'0')+':00':'—';
 stats.replaceChildren(
  makeMetric('Recorded sessions',String(result.count),'Explicit distraction records','rose'),
  makeMetric('Recorded duration',fmt(result.totalMs/60000),'Within the selected period','blue'),
  makeMetric('Most frequent',result.frequent[0]?.name||'No pattern',result.frequent[0]?(result.frequent[0].count+' session(s)'):'Not enough evidence','purple'),
  makeMetric('Peak recorded hour',peak,'Not a prediction','amber')
 );
 slot.replaceChildren(createBars(result.daysSeries,Math.min(days,7)));
 const trigger=result.triggers?.[0]?.[0];
 takeaway.replaceChildren(el('strong','','Insight'),el('span','',result.count
  ?('Most recorded: '+(result.frequent[0]?.name||'Uncategorized')+'. '+(trigger&&trigger!=='Not provided'?'Top labeled trigger: '+trigger+'.':'No trigger information supplied.')+' Review before drawing conclusions.')
  :'No explicitly recorded distractions in this period. Unlogged time is unknown.'));
}
function improveDeep(){
 const report=$('lo94-suite'),deep=$('lo129DistractionDeep');
 if(!report||!deep)return;
 if(report.parentElement!==deep)deep.append(report);
 // The original V94 mixes debt, recovery, health and distraction in one ten-card
 // wall. Reframe them as small, separately labeled sections without dropping data.
 const cards=[...report.querySelectorAll('#lo94-content .lo94-grid article')];
 for(const art of cards){
  const label=art.querySelector('span')?.textContent?.toLowerCase()||'';
  art.dataset.lo129Domain=/distraction|frequent|time-consuming|peak/.test(label)?'distraction':
   /debt|recovery/.test(label)?'recovery':
   /workout|meal/.test(label)?'lifestyle':'planning';
 }
 report.classList.add('lo129-full-report');
}
function polishOverview(){
 const shell=$('lo126TotalsDetails'),h=$('todayLegacyOverviewPanel');
 if(!shell||!h)return;
 const sm=shell.querySelector(':scope > summary');if(sm)sm.textContent='Today · detailed time analysis';
 // Keep original live metric nodes; style the real metrics as evidence cards.
 h.classList.add('lo129-evidence-panel');
 const labels=h.querySelectorAll('.stat');
 for(const [i,a] of [...labels].entries())a.dataset.lo129Tone=['blue','mint','green','violet'][i%4];
}
function polishHistory(){
 const chart=$('lo127WeekDetails');if(chart?.querySelector(':scope > summary'))chart.querySelector(':scope > summary').textContent='Explore recorded time · 7 days';
 const list=$('history');if(list)list.classList.add('lo129-archive');
}
function polishActive(){
 const panel=$('trackActivePanel'),btn=$('lo128SessionsDetails');
 if(!panel)return;
 panel.classList.add('lo129-active');
 if(btn){
  const summary=btn.querySelector('summary');
  if(summary)summary.textContent=summary.textContent.replace(' & detailed controls',' · controls');
 }
}
function boot(){
 if($('lo129VisualReady'))return;
 if(!$('lo128DistractionDetails')||!$('lo127TrackSurface'))return;
 const mark=el('span','','');mark.id='lo129VisualReady';mark.hidden=true;$('lo127TrackSurface').append(mark);
 themeQuick();createDistractionDesign();polishOverview();polishHistory();polishActive();
 // A report refresh replaces V94 article elements; styles and taxonomy are
 // reapplied after render. Read only; never modifies workspace.
 const refresh=()=>root.setTimeout(()=>{renderDistraction();improveDeep();themeQuick()},80);
 root.addEventListener('lifeos-v77-tracking-changed',refresh);
 $('lo94-period')?.addEventListener('change',refresh);
 $('lo94-refresh')?.addEventListener('click',refresh);
 root.setTimeout(refresh,500);
}
function init(){root.setTimeout(boot,2100);root.setTimeout(boot,3500)}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}
return {fmt,cat,createBars};
});
