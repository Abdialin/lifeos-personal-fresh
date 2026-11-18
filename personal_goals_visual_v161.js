/* LifeOS Goals V161: compact metrics and charts, read-only extension. */
(()=>{'use strict';
const E=id=>document.getElementById(id),H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const read=()=>{try{return window.lifeosReadOnlyWorkspace?.()||{}}catch(_){return {}}};
const sample=x=>!!(x?.assumed||x?.isExample||x?.developmentExample||x?.seedBatch||['development-starter','development-seed','assumed-demo'].includes(x?.source));
const monday=n=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7+7*n);return d.getTime()};
const time=x=>{const n=Number(x?.endAt);if(Number.isFinite(n)&&n>0)return n;const d=x?.date||x?.completedAt;return typeof d==='string'?Date.parse(d.length===10?d+'T12:00:00':d):NaN};
const interval=(x,a,b)=>{const t=time(x);return Number.isFinite(t)&&t>=a&&t<b};
const dur=x=>(x?.segments||[]).reduce((sum,z)=>{const a=Number(z.start),b=Number(z.end);return sum+(Number.isFinite(a)&&Number.isFinite(b)&&b>a?(b-a)/60000:0)},0);
function sessionParts(s,a,b){
 const raw=Array.isArray(s?.segments)&&s.segments.length?s.segments:[{start:s?.startAt,end:s?.endAt}];
 return raw.flatMap(z=>{
  const x=Number(z.start),y=z.end==null?(s.status==='running'?Date.now():NaN):Number(z.end);
  if(!Number.isFinite(x)||!Number.isFinite(y)||y<=x||y<=a||x>=b)return [];
  return [[Math.max(a,x),Math.min(b,y)]];
 });
}
function activeMinutes(s,a,b){return sessionParts(s,a,b).reduce((n,[x,y])=>n+(y-x)/60000,0)}
function activeDays(s,a,b){
 const days=new Set();
 for(const [x,y] of sessionParts(s,a,b)){
  let p=x,limit=0;
  while(p<y&&limit++<3700){
   const d=new Date(p),day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
   days.add(day);
   const next=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime();
   p=Math.min(next,y);
  }
 }
 return days;
}
const within=(s,a,b)=>sessionParts(s,a,b).length>0;
const norm=x=>String(x||'').toLowerCase().trim(),unit=g=>g.unit==='quantity'?g.quantityUnit||'units':g.unit==='hours'?'hours':'sessions';
function measure(g,w,a,b){let all=[],good=[],minutes=0,value=0,src='finished timers';const cat=norm(g.category);
if(cat==='fitness'){
 src='workout records + qualifying finished timers';
 const sessions=(w.sessions||[]).filter(x=>x?.status==='finished'&&within(x,a,b));
 // Use the same activity classification as My Life so Gym/Training in different
 // languages contributes to Goals exactly once (linked workout IDs are deduplicated below).
 const isWorkoutSession=x=>{
  const classify=window.LifeOSMyLifeV190?.kindOf;
  if(typeof classify==='function'&&classify(x.name)==='fitness')return true;
  return /\b(gym|workout|fitness|strength|weightlifting|exercise|running|run|boxing|cardio|cycling|swimming|pilates|yoga|training|walking|walk|jogging|träning|träna|promenad|löpning|styrketräning|boxning)\b/i.test(String(x.name||''));
 };
 const linked=new Map(sessions.map(x=>[String(x.id),x]));
 const workouts=(w.workouts||[]).filter(x=>interval(linked.get(String(x.sessionId))||x,a,b));
 const countedIds=new Set();
 all=workouts.slice();
 good=workouts.filter(x=>!sample(x)&&(!x.sessionId||linked.has(String(x.sessionId)))&&!sample(linked.get(String(x.sessionId)))).filter((x,i,list)=>!x.sessionId||list.findIndex(y=>String(y.sessionId)===String(x.sessionId))===i);
 for(const x of good)if(x.sessionId)countedIds.add(String(x.sessionId));
 minutes=good.reduce((v,x)=>v+(linked.has(String(x.sessionId))?activeMinutes(linked.get(String(x.sessionId)),a,b):Math.max(0,Number(x.durationMinutes)||Number(x.minutes)||0)),0);
 for(const x of sessions.filter(x=>isWorkoutSession(x)&&!countedIds.has(String(x.id)))){
  all.push(x);
  if(sample(x))continue;
  good.push(x);countedIds.add(String(x.id));minutes+=activeMinutes(x,a,b);
 }
 value=good.length;
}
else if(cat==='meals'){src='meal records';all=(w.meals||[]).filter(x=>interval(x,a,b));good=all.filter(x=>!sample(x));value=good.length}
else if(cat==='personal'){src='personal logs';all=(w.personalLogs||[]).filter(x=>interval(x,a,b)&&norm(x.category)===norm(g.match));good=all.filter(x=>!sample(x));value=g.unit==='quantity'?good.filter(x=>!g.quantityUnit||norm(x.unit)===norm(g.quantityUnit)).reduce((v,x)=>v+Math.max(0,Number(x.quantity)||0),0):good.length}
else if(cat==='habit'){
 src='finished timers + explicit personal logs';
 const keyword=norm(g.match||'');
 const timers=(w.sessions||[]).filter(x=>{const name=norm(x?.name);return x?.status==='finished'&&within(x,a,b)&&keyword&&name.includes(keyword)&&!(keyword==='reading'&&/quran|qur’an|qur'an|koran/.test(name))});
 const logs=(w.personalLogs||[]).filter(x=>interval(x,a,b)&&keyword&&norm(x.category).includes(keyword));
 const validTimers=timers.filter(x=>!sample(x)),validLogs=logs.filter(x=>!sample(x));
 const timerIds=new Set(validTimers.map(x=>String(x.id)));
 const uniqueLogs=validLogs.filter(x=>!x.sessionId||!timerIds.has(String(x.sessionId)));
 all=[...timers,...logs];
 if(g.unit==='quantity'){
  const qtyLogs=validLogs.filter(x=>norm(x.unit)===norm(g.quantityUnit)&&Number(x.quantity)>0);
  good=qtyLogs;value=qtyLogs.reduce((n,x)=>n+Number(x.quantity),0);
 }else if(g.unit==='hours'){
  good=[...validTimers,...uniqueLogs.filter(x=>Number(x.minutes)>0)];
  minutes=validTimers.reduce((n,x)=>n+activeMinutes(x,a,b),0)+uniqueLogs.reduce((n,x)=>n+Math.max(0,Number(x.minutes)||0),0);
  value=minutes/60;
 }else{
  good=[...validTimers,...uniqueLogs];value=validTimers.reduce((n,x)=>n+activeDays(x,a,b).size,0)+uniqueLogs.length;
 }
}
else {all=(w.sessions||[]).filter(x=>x.status==='finished'&&within(x,a,b)&&norm(g.match||g.name).length>0&&norm(x.name).includes(norm(g.match||g.name)));good=all.filter(x=>!sample(x));minutes=good.reduce((v,x)=>v+activeMinutes(x,a,b),0);value=g.unit==='hours'?minutes/60:good.reduce((v,x)=>v+activeDays(x,a,b).size,0)}
return {value,records:good.length,minutes,excluded:cat==='habit'?all.filter(sample).length:all.length-good.length,src}};
const weekday=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const dayBreakdown=(g,w,from)=>weekday.map((day,i)=>{const a=new Date(from);a.setDate(a.getDate()+i);const b=new Date(a);b.setDate(b.getDate()+1);return {day,date:a.toLocaleDateString(undefined,{month:'short',day:'numeric'}),...measure(g,w,a.getTime(),b.getTime())}});
const dayStrip=(r,w)=>{const days=dayBreakdown(r.g,w,monday(0));if(!days.some(d=>d.records>0))return '<div class="gv169-nologs"><strong>No activity recorded this week</strong><span>No chart yet. Missing logs do not mean a missed goal.</span></div>';const max=Math.max(1,...days.map(x=>x.value),r.t/7),filled=days.filter(x=>x.records>0).length;return '<div class="gv167-days gv168-days"><div class="gv167-dayshead"><b>Daily activity</b><small>'+filled+'/7 days with qualifying logs</small></div><div class="gv167-weekstrip">'+days.map(x=>'<div class="gv167-day gv168-day" title="'+H(x.day+' '+x.date+': '+Number(x.value.toFixed(1))+' '+unit(r.g))+'"><span>'+x.day+'</span><i style="height:'+Math.round(Math.max(3,x.value/max*100))+'%;opacity:'+(x.records?1:.25)+'"></i><strong>'+(x.records?fmt(x.value):'—')+'</strong></div>').join('')+'</div><small class="gv167-note">An empty day means no qualifying saved record, not that the activity was missed.</small></div>'};
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
const tone=g=>({fitness:'gym',personal:'personal',meals:'nutrition'})[norm(g.category)]||'study';
const progress=(v,t)=>Math.max(0,Math.min(100,t?v/t*100:0));
const bar=(v,t)=>'<div class="gv161-bar"><i style="width:'+progress(v,t)+'%"></i></div>';
const rows=w=>(w.goals||[]).map(g=>({g,t:Number(g.target)||0,cur:measure(g,w,monday(0),monday(1)),prev:measure(g,w,monday(-1),monday(0)),old:measure(g,w,monday(-2),monday(-1))}));
window.LifeOSGoalEvidenceV175=Object.freeze({measure,rows,sample,unit,monday,sessionParts,activeMinutes,activeDays});
let root,legacy,tab='overview',expanded='',selected='',weeks=4;
function dailyReading(r,w){const name=norm(r.g.name||''),match=norm(r.g.match||'');if(!(name.includes('quran')&&name.includes('read'))&&!(match.includes('quran')&&match.includes('read')))return '';const start=monday(0),days=weekday;let reached=0;const cells=days.map((day,i)=>{const from=start+i*86400000,to=from+86400000;const entries=(w.sessions||[]).filter(s=>s?.status==='finished'&&!sample(s)&&within(s,from,to)&&norm(s.name).includes(match||'quran reading'));const mins=entries.reduce((a,s)=>a+activeMinutes(s,from,to),0);if(mins>=90)reached++;const fraction=Math.min(100,mins/90*100);return '<div class="gv164-day" title="'+day+' '+Math.round(mins)+' of 90 minutes"><small>'+day+'</small><i style="--fill:'+fraction+'%"></i><b>'+Math.round(mins)+'</b></div>'}).join('');return '<div class="gv164-reading"><strong>Daily reading · 90 min goal</strong><div class="gv164-weekdays">'+cells+'</div><small>'+reached+'/7 days have 90 recorded minutes. Minutes are based on saved finished timers; missing days are unlogged, not missed.</small></div>'}
function card(r,w){const id=String(r.g.id??r.g.name),p=progress(r.cur.value,r.t);return '<article class="gv161-card gv161-'+tone(r.g)+'"><div class="gv161-top"><div><small>'+H(r.g.category||'Goal')+'</small><h3>'+H(r.g.name)+'</h3></div><div class="gv161-ring" style="--progress:'+p+'"><b>'+Math.round(p)+'%</b></div></div><div class="gv161-metrics"><div><b>'+fmt(r.cur.value)+' / '+fmt(r.t)+'</b><small>'+H(unit(r.g))+'</small></div><div><b>'+r.cur.records+'</b><small>saved entries</small></div><div><b>'+(r.cur.minutes?Math.round(r.cur.minutes)+' min':'—')+'</b><small>recorded time</small></div></div>'+bar(r.cur.value,r.t)+dailyReading(r,w)+'<div class="gv161-foot"><span>'+(r.cur.records?'Recorded progress':'Awaiting evidence')+'</span><button data-v161-detail="'+H(id)+'">'+(expanded===id?'Less −':'Details ↗')+'</button></div>'+(expanded===id?'<div class="gv161-expand">'+dayStrip(r,w)+'<div><span>Previous week<b>'+fmt(r.prev.value)+' '+H(unit(r.g))+'</b></span><span>Average duration<b>'+(r.cur.records&&r.cur.minutes?Math.round(r.cur.minutes/r.cur.records)+' min':'Unavailable')+'</b></span><span>Counted from<b>'+H(r.cur.src)+'</b></span><span>Excluded examples<b>'+r.cur.excluded+'</b></span></div><p>Only qualifying records count; development examples and plans are not verified completions.</p><button data-v161-edit="1">Edit goal and counting rule →</button></div>':'')+'</article>'}
function plot(r,w){if(!r)return '<p>Create a goal to inspect trends.</p>';const data=Array.from({length:weeks},(_,i)=>measure(r.g,w,monday(i-weeks),monday(i-weeks+1)).value);const max=Math.max(1,r.t,...data);if(!data.some(v=>v>0))return '<div class="gv168-emptystate" role="status"><span class="gv168-emptyicon" aria-hidden="true">▥</span><strong>No qualifying records in these weeks</strong><p>The selected goal has no matching completed entries in this period. This does not mean no activity took place.</p><small>Check the activity name, counting rule, or tracking history.</small></div>';return '<div class="gv161-plot" role="img" aria-label="Weekly recorded history">'+data.map((v,i)=>'<div class="gv161-col"><b>'+fmt(v)+'</b><span><i style="height:'+(v/max*100)+'%"></i></span><small>W'+(i-weeks)+'</small></div>').join('')+'</div><p class="gv161-muted">Completed weeks only · target '+fmt(r.t)+' '+H(unit(r.g))+'/week. Example data excluded.</p>'}
function render(){if(!root||document.body.dataset.lifeosView!=='goals')return;const w=read(),rs=rows(w),put=(k,s)=>E('gv161-'+k).innerHTML=s;

root.querySelector('nav').innerHTML=[['overview','Overview'],['improve','Improve'],['history','History']].map(([name,label])=>'<button type="button" role="tab" data-v161-tab="'+name+'" aria-selected="'+(tab===name)+'">'+label+'</button>').join('');
const qualified=rs.filter(r=>r.cur.records>0).length, met=rs.filter(r=>r.t>0&&r.cur.value>=r.t).length;
put('overview','<header class="gv161-hero gv165-hero"><div><small>YOUR WEEK</small><h2>Goals at a glance</h2><p>Set priorities, see progress, explore the details.</p></div><button data-v161-add="1">+ Goal</button></header><div class="gv161-kpis gv165-kpis"><div><b>'+rs.length+'</b><span>Active goals</span></div><div><b>'+met+'</b><span>Targets recorded</span></div><div><b>'+qualified+'</b><span>With evidence</span></div></div><div class="gv161-heading gv165-heading"><h3>Your goals</h3><button data-v161-add="1">Edit / Add →</button></div><div class="gv161-grid gv165-grid">'+(rs.length?rs.map(r=>card(r,w)).join(''):'<div class="gv165-empty">No goals yet. Add your first goal to begin.</div>')+'</div><div class="gv165-next"><b>Next step</b><span>'+(rs.find(r=>r.t>r.cur.value)?'Review '+H(rs.find(r=>r.t>r.cur.value).g.name)+' or add a completed activity.':'Review your results and choose a new priority.')+'</span><button data-v161-tab="improve">Improve →</button></div>');
put('improve','<div class="gv165-title"><div><small>SMART REVIEW</small><h2>Improve your approach</h2><p>Compare your two completed weeks. Only logged evidence counts; nothing changes without approval.</p></div><button type="button" data-gv162-review="1">Review settings ↗</button></div><div class="gv162-reviewgrid gv165-reviewgrid">'+rs.map(r=>{const delta=r.prev.value-r.old.value,has=r.prev.records+r.old.records>0,noted=!has?'Not enough recorded evidence':delta>0?'Recorded progress increased':delta<0?'Recorded progress decreased':'Progress steady';return '<article class="gv162-reviewcard gv161-'+tone(r.g)+'"><div class="gv162-reviewhead"><b>'+H(r.g.name)+'</b><span>'+H(unit(r.g))+'</span></div><div class="gv162-compare"><div><small>Two weeks ago</small><strong>'+fmt(r.old.value)+'</strong>'+bar(r.old.value,r.t)+'</div><div><small>Last week</small><strong>'+fmt(r.prev.value)+'</strong>'+bar(r.prev.value,r.t)+'</div></div><div class="gv162-reviewbottom"><span>'+noted+'</span><button data-v161-goal="'+H(String(r.g.id??r.g.name))+'">Explore ↗</button></div></article>'}).join('')+'</div><div class="gv165-advice"><b>Review before adjusting</b><p>Check incomplete tracking, recovery and available time before changing targets. An unlogged goal is not necessarily a missed goal.</p><button type="button" data-gv162-review="1">Two-week review & recovery →</button></div>');
const active=rs.find(r=>String(r.g.id??r.g.name)===selected)||rs[0];
put('history','<div class="gv165-title"><div><small>YOUR HISTORY</small><h2>Progress over time</h2><p>Completed weeks, separated from example records and planned activities.</p></div></div><div class="gv161-controls gv165-controls"><label>Goal<select id="gv161-select">'+rs.map(r=>'<option value="'+H(String(r.g.id??r.g.name))+'" '+(active===r?'selected':'')+'>'+H(r.g.name)+'</option>').join('')+'</select></label><label>Period<select id="gv161-weeks"><option value="4" '+(weeks===4?'selected':'')+'>4 weeks</option><option value="8" '+(weeks===8?'selected':'')+'>8 weeks</option><option value="13" '+(weeks===13?'selected':'')+'>13 weeks</option></select></label></div><div class="gv161-chart gv165-chart">'+plot(active,w)+'</div><div class="gv167-historydetail">'+(active?dayStrip(active,w):'')+'</div><div class="gv165-historyheader"><b>Past two weeks</b><span>Recorded totals</span></div><div class="gv162-reviewgrid gv165-reviewgrid">'+rs.map(r=>'<article class="gv162-reviewcard gv161-'+tone(r.g)+'"><div class="gv162-reviewhead"><b>'+H(r.g.name)+'</b><span>'+H(unit(r.g))+'</span></div><div class="gv162-compare"><div><small>Two weeks ago</small><strong>'+fmt(r.old.value)+' <em>/ '+fmt(r.t)+'</em></strong>'+bar(r.old.value,r.t)+'</div><div><small>Last week</small><strong>'+fmt(r.prev.value)+' <em>/ '+fmt(r.t)+'</em></strong>'+bar(r.prev.value,r.t)+'</div></div><div class="gv162-reviewbottom"><span>'+(r.old.records+r.prev.records?'Saved activity':'No qualifying logs')+'</span><button data-v161-goal="'+H(String(r.g.id??r.g.name))+'">Details ↗</button></div></article>').join('')+'</div><p class="gv162-disclaimer">Missing entries mean unknown, not zero effort. Development examples are excluded.</p>');
root.querySelectorAll('[data-gv161-panel]').forEach(n=>n.hidden=n.dataset.gv161Panel!==tab);if(legacy)legacy.hidden=!root.classList.contains('gv163-editing');}
function consistentReview(){
 const host=E('gv174-consistent-review');if(!host)return;
 const r=rows(read());
 host.innerHTML='<h3>Completed weeks · verified counting rules</h3><p class="gv174-explainer">Same records and counting rules as Goals overview and history. Example-based records are excluded. Your current week is not included.</p>'+r.map(x=>'<article class="gv174-row"><strong>'+H(x.g.name)+'</strong><div><span>Two weeks ago</span><b>'+fmt(x.old.value)+' / '+fmt(x.t)+' '+H(unit(x.g))+'</b></div>'+bar(x.old.value,x.t)+'<div><span>Last week</span><b>'+fmt(x.prev.value)+' / '+fmt(x.t)+' '+H(unit(x.g))+'</b></div>'+bar(x.prev.value,x.t)+'<small>Source: '+H(x.prev.src)+' · '+(x.old.excluded+x.prev.excluded)+' excluded example records</small></article>').join('')+'<p class="gv174-explainer">These figures count matching saved evidence, not estimated effort. Goals are never changed automatically.</p>';
}
function init(){if(E('gv161-app')||!E('goalForm')||!E('todayOverview'))return;legacy=E('goalForm').closest('section.panel');root=document.createElement('section');root.id='gv161-app';root.className='gv161-app';root.dataset.view='goals';root.hidden=true;root.innerHTML='<nav class="gv161-tabs"></nav>'+['overview','improve','history'].map(x=>'<section id="gv161-'+x+'" data-gv161-panel="'+x+'"></section>').join('')+'<div id="gv161-legacy"><div class="gv172-toolbar"><button type="button" class="gv163-close" data-gv163-close="1">← Goals</button><span>Manage goals</span></div><div class="gv172-switch"><button type="button" data-gv172-mode="edit">Targets</button><button type="button" data-gv172-mode="review">Two-week review</button></div><div id="gv174-consistent-review"></div></div>';E('todayOverview').before(root);if(legacy){E('gv161-legacy').appendChild(legacy);legacy.dataset.lifeosArea='goals';legacy.hidden=true}
root.addEventListener('click',e=>{const t=e.target.closest('[data-v161-tab]');if(t){tab=t.dataset.v161Tab;root.classList.remove('gv163-editing','gv169-reviewing');render();root.scrollIntoView({block:'start'});return}const d=e.target.closest('[data-v161-detail]');if(d){expanded=expanded===d.dataset.v161Detail?'':d.dataset.v161Detail;render();return}const c=e.target.closest('[data-v161-choose]');if(c){selected=c.dataset.v161Choose;render();return}const g=e.target.closest('[data-v161-goal]');if(g){expanded=g.dataset.v161Goal;tab='overview';render();root.scrollIntoView({block:'start'});return}if(e.target.closest('[data-v161-add],[data-v161-edit]')){tab='overview';root.classList.add('gv163-editing');root.classList.remove('gv169-reviewing');render();consistentReview();const host=E('gv161-legacy');if(host)host.scrollTop=0;}});
root.addEventListener('click',e=>{if(e.target.closest('[data-gv162-review]')){tab='improve';root.classList.add('gv163-editing','gv169-reviewing');render();const host=E('gv161-legacy');if(host)host.scrollTop=0;}if(e.target.closest('[data-gv162-quran]')){tab='overview';root.classList.add('gv163-editing');render();const fields=[['goalName','Quran reading · 90 minutes daily'],['goalCategory','sessions'],['goalMatch','Quran reading'],['goalTarget','10.5'],['goalUnit','hours']];fields.forEach(([id,value])=>{const n=E(id);if(n){n.value=value;n.dispatchEvent(new Event('change',{bubbles:true}));}});const f=E('goalForm');if(f){f.hidden=false;f.scrollIntoView({block:'center',behavior:'smooth'});}E('goalName')?.focus();}});
root.addEventListener('click',e=>{const mode=e.target.closest('[data-gv172-mode]');if(!mode)return;root.classList.toggle('gv169-reviewing',mode.dataset.gv172Mode==='review');consistentReview();const legacyHost=E('gv161-legacy');if(legacyHost)legacyHost.scrollTop=0;});
root.addEventListener('click',e=>{if(e.target.closest('[data-gv163-close]')){root.classList.remove('gv163-editing','gv169-reviewing');render();root.scrollIntoView({block:'start'})}});
root.addEventListener('change',e=>{if(e.target.id==='gv161-select')selected=e.target.value;if(e.target.id==='gv161-weeks')weeks=Number(e.target.value)||4;render()});
const refresh=()=>{const active=document.body.dataset.lifeosView==='goals';root.hidden=!active;if(!active)return;if(E('g160-app'))E('g160-app').hidden=true;if(E('loGoalsVisual'))E('loGoalsVisual').hidden=true;render();consistentReview()};
E('lifeosNavigation')?.addEventListener('click',()=>setTimeout(refresh,35));window.addEventListener('focus',refresh);document.addEventListener('submit',e=>{if(e.target.id==='goalForm')setTimeout(refresh,140)});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 // Recalculate from the canonical workspace when a timer or a linked record changes,
 // without creating additional workout, meal, or goal records.
 let pendingRefresh=0;
 const onEvidenceChange=()=>{if(document.body.dataset.lifeosView!=='goals')return;clearTimeout(pendingRefresh);pendingRefresh=setTimeout(refresh,120)};
 ['lifeos-v77-tracking-changed','lifeos-v74-records-changed','lifeos-v76-activation-changed'].forEach(name=>window.addEventListener(name,onEvidenceChange));
 refresh();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();