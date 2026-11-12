/* LifeOS V8 — concise visual quality reports; read-only workspace snapshots. */
(function(){
'use strict';
const $=id=>document.getElementById(id),HOUR=3600000,MIN=60000;
const pad=n=>String(n).padStart(2,'0');
const dayKey=d=>[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-');
const dateAt=s=>new Date(s+'T12:00:00');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hours=ms=>(ms/HOUR).toFixed(1)+'h';
const short=n=>Number(n).toFixed(1).replace(/\.0$/,'');
function snapshot(){try{return window.lifeosReadOnlyWorkspace?.()||null}catch(_){return null}}
function union(intervals){const sorted=intervals.slice().sort((a,b)=>a[0]-b[0]);let start=-1,end=-1,sum=0;for(const [a,b] of sorted){if(b<=a)continue;if(start<0){start=a;end=b}else if(a<=end){end=Math.max(end,b)}else{sum+=end-start;start=a;end=b}}return sum+(start<0?0:end-start)}
function dayData(ws,key){
 const d=dateAt(key),start=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime(),end=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime(),cap=Math.min(end,Date.now());
 const intervals=[];const coveredIds=new Set(),generatedIds=new Set(),measuredIds=new Set();
 if(cap>start)for(const s of ws.sessions||[]){
  for(const g of s.segments||[]){
   const a=Math.max(start,Number(g.start)),b=Math.min(cap,g.end===null?Date.now():Number(g.end));
   if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)continue;
   intervals.push([a,b]);coveredIds.add(s.id);
   if(s.seedBatch||s.source==='development-starter')generatedIds.add(s.id);
   else if(s.precision==='measured')measuredIds.add(s.id);
  }
 }
 const total=intervals.reduce((n,[a,b])=>n+b-a,0),unique=union(intervals);
 return {total,unique,overlap:total-unique,sessions:coveredIds.size,generated:generatedIds.size,measured:measuredIds.size};
}
function progressMetric(label,value){return '<div><b>'+esc(value)+'</b><span>'+esc(label)+'</span></div>'}
function bars(rows){
 const highest=Math.max(HOUR,...rows.map(x=>x.data.unique));
 return '<div class="v8-week-bars" role="img" aria-label="Seven-day chart of unique recorded hours">'+rows.map(x=>'<div class="v8-week-bar"><b>'+short(x.data.unique/HOUR)+'</b><div class="v8-bar-outer"><div class="v8-bar-fill" style="height:'+Math.min(100,x.data.unique/highest*100).toFixed(1)+'%"></div></div><small>'+esc(x.label)+'</small></div>').join('')+'</div>';
}
function safeSection(panelId,visualId,content){
 const panel=$(panelId);if(!panel)return;
 let node=$(visualId);if(!node){node=document.createElement('section');node.id=visualId;node.className='v8-visual';const before=[...panel.children].find(x=>x.tagName==='BUTTON'||x.tagName==='FORM'||x.classList?.contains('row'));panel.insertBefore(node,before||panel.lastElementChild);}
 node.innerHTML=content;
}
function moveLegacyToDisclosure(panelId,resultId,buttonIds){
 const panel=$(panelId);if(!panel||panel.querySelector('.v8-raw-report'))return;
 const result=$(resultId),buttons=buttonIds.map($).filter(Boolean);
 if(!result)return;
 const details=document.createElement('details');details.className='v8-raw-report';
 const summary=document.createElement('summary');summary.textContent='Detailed calculations and review tools';details.append(summary);
 for(const button of buttons)details.append(button);
 details.append(result);panel.append(details);
}
function renderWeekly(ws){
 const today=new Date(),rows=[];
 for(let i=6;i>=0;i--){const d=new Date(today.getFullYear(),today.getMonth(),today.getDate()-i);rows.push({key:dayKey(d),label:d.toLocaleDateString(undefined,{weekday:'short'}),data:dayData(ws,dayKey(d))})}
 const totals=rows.reduce((x,y)=>({total:x.total+y.data.total,unique:x.unique+y.data.unique,overlap:x.overlap+y.data.overlap,generated:x.generated+y.data.generated,measured:x.measured+y.data.measured}),{total:0,unique:0,overlap:0,generated:0,measured:0});
 const text='<h3>Time recorded over 7 days</h3><div class="v8-kpis">'+progressMetric('Unique tracked',hours(totals.unique))+progressMetric('Recorded total',hours(totals.total))+progressMetric('Overlapping',hours(totals.overlap))+'</div>'+bars(rows)+
 '<p class="v8-visual-sub">'+totals.generated+' generated-example session appearances across these dates. Measured and estimated data should be reviewed separately; overlapping hours are not additional available time.</p>';
 safeSection('weeklyDashboardPanel','v8WeeklyQuality',text);
 moveLegacyToDisclosure('weeklyDashboardPanel','weeklyDashboardResults',['weeklyDashboardRefresh']);
}
function goalValue(g,ws,begin,end){
 const sessions=(ws.sessions||[]).filter(s=>s.status==='finished'&&s.endAt>=begin&&s.endAt<end);
 if(g.category==='meals')return (ws.meals||[]).filter(x=>{const d=dateAt(x.date||'');return d>=begin&&d<end}).length;
 if(g.category==='fitness')return (ws.workouts||[]).filter(x=>{const linked=sessions.find(s=>s.id===x.sessionId);const dt=linked?linked.endAt:dateAt(x.date||'').getTime();return dt>=begin&&dt<end}).length;
 if(g.category==='personal')return (ws.personalLogs||[]).filter(x=>{const dt=dateAt(x.date||'').getTime();return dt>=begin&&dt<end&&String(x.category||'').toLowerCase()===String(g.match||'').toLowerCase()}).reduce((sum,x)=>sum+(g.unit==='quantity'?Number(x.quantity)||0:1),0);
 const relevant=sessions.filter(s=>String(s.name||'').toLowerCase().includes(String(g.match||'').toLowerCase()));
 if(g.unit==='hours')return relevant.reduce((sum,s)=>sum+(s.segments||[]).reduce((n,p)=>n+(p.end!==null&&p.end>p.start?(p.end-p.start)/HOUR:0),0),0);
 return relevant.length;
}
function renderGoals(ws){
 const d=new Date(),monday=new Date(d.getFullYear(),d.getMonth(),d.getDate()-(d.getDay()+6)%7).getTime(),end=new Date(monday);end.setDate(end.getDate()+7);
 const goals=(ws.goals||[]).slice(0,8);
 const rows=goals.map(g=>{
  const value=goalValue(g,ws,monday,end.getTime()),goal=Number(g.target)||0,percent=goal>0?Math.min(100,Math.max(0,value/goal*100)):0;
  const unit=g.unit==='quantity'?(g.quantityUnit||'units'):(g.unit||'sessions');
  return '<div class="v8-goal-item"><div class="v8-goal-head"><strong>'+esc(g.name)+'</strong><span>'+short(value)+' / '+short(goal)+' '+esc(unit)+'</span></div><div class="v8-goal-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(percent)+'" aria-label="'+esc(g.name)+'"><i style="width:'+percent.toFixed(1)+'%"></i></div></div>';
 }).join('');
 const sleep=(ws.personalLogs||[]).filter(x=>x.category==='Sleep'&&x.date>=dayKey(new Date(monday))&&Number(x.minutes)>0);
 const measured=sleep.filter(x=>x.precision==='measured'),estimated=sleep.filter(x=>x.precision==='estimated');
 const average=a=>a.length?short(a.reduce((n,x)=>n+Number(x.minutes),0)/a.length/60)+' h':'Not logged';
 const txt='<h3>Weekly goals</h3>'+(rows||'<p class="v8-visual-sub">No goals configured yet. Choose a suggested target in Goals.</p>')+
 '<div class="v8-kpis">'+progressMetric('Measured sleep avg.',average(measured))+progressMetric('Estimated sleep avg.',average(estimated))+progressMetric('Sleep logs',sleep.length)+'</div>'+
 '<p class="v8-visual-sub">A missing sleep log is unknown, not zero sleep. Generated activity examples are not verified attendance.</p>';
 safeSection('goalRecoveryPanel','v8GoalRecovery',txt);
 moveLegacyToDisclosure('goalRecoveryPanel','goalRecoveryResults',['goalRecoveryRefresh']);
}
function renderQuality(ws){
 const input=$('qualityDate'),key=input?.value||dayKey(new Date()),d=dayData(ws,key);
 const text='<h3>Day evidence · '+esc(dateAt(key).toLocaleDateString(undefined,{month:'short',day:'numeric'}))+'</h3><div class="v8-kpis">'+
 progressMetric('Unique time',hours(d.unique))+progressMetric('Recorded total',hours(d.total))+progressMetric('Overlap',hours(d.overlap))+
 progressMetric('Sessions',d.sessions)+progressMetric('Generated examples',d.generated)+progressMetric('Live measured',d.measured)+'</div>'+
 '<p class="v8-visual-sub">Unlogged gaps are unknown. Figures report sessions that touch the selected calendar day.</p>';
 safeSection('qualityPanel','v8DayEvidence',text);
 moveLegacyToDisclosure('qualityPanel','qualityResults',['qualityAnalyze']);
}
function renderRoutines(ws){
 const logs=ws.personalLogs||[],today=new Date(),rows=[];
 for(let i=6;i>=0;i--){const date=new Date(today.getFullYear(),today.getMonth(),today.getDate()-i),key=dayKey(date);rows.push({label:date.toLocaleDateString(undefined,{weekday:'short'}),count:logs.filter(x=>x.date===key).length})}
 const total=rows.reduce((n,x)=>n+x.count,0),max=Math.max(1,...rows.map(x=>x.count));
 const categories=new Map();for(const log of logs.filter(x=>x.date>=dayKey(new Date(today.getFullYear(),today.getMonth(),today.getDate()-6)))){const category=String(log.category||'Other');categories.set(category,(categories.get(category)||0)+1)}
 const top=[...categories].sort((a,b)=>b[1]-a[1]).slice(0,4);
 const content='<h3>Routine tracking · last 7 days</h3><div class="v8-kpis">'+progressMetric('Logged routines',total)+progressMetric('Days logged',rows.filter(x=>x.count).length+' / 7')+progressMetric('Categories',categories.size)+'</div>'+
 '<div class="v8-week-bars" role="img" aria-label="Personal routine logs recorded per day">'+rows.map(x=>'<div class="v8-week-bar"><b>'+x.count+'</b><div class="v8-bar-outer"><div class="v8-bar-fill" style="height:'+(x.count/max*100).toFixed(1)+'%"></div></div><small>'+esc(x.label)+'</small></div>').join('')+'</div>'+
 (top.length?'<p class="v8-visual-sub">Most logged: '+esc(top.map(([name,n])=>name+' ('+n+')').join(' · '))+'</p>':'<p class="v8-visual-sub">No routine logs in this period. Imported timer sessions are separate and are not automatically counted as personal logs.</p>');
 safeSection('personalActivityPanel','v8RoutineOverview',content);
 const panel=$('personalActivityPanel');if(!panel||panel.querySelector('#v8RoutineRaw'))return;
 const detail=document.createElement('details');detail.className='v8-raw-report';detail.id='v8RoutineRaw';
 const summary=document.createElement('summary');summary.textContent='Routine history and detailed calculations';detail.append(summary);
 for(const id of ['personalLogSummary','personalProgressSummary','personalLogList']){const el=$(id);if(el)detail.append(el)}
 panel.append(detail);
}
function optimizePlanning(){
 const panel=$('personalCompletionPanel');if(!panel||panel.querySelector('.v8-plan-compact'))return;
 const title=document.createElement('p');title.className='v8-visual-sub v8-plan-compact';title.textContent='Predictions and approvals remain read-only until you review them. Open the tools below when you need them.';
 panel.insertBefore(title,panel.querySelector('.row'));
 const row=panel.querySelector(':scope > .row'),results=$('personalCompletionResults');
 if(row&&results){
  const detail=document.createElement('details');detail.className='v8-raw-report';
  const summary=document.createElement('summary');summary.textContent='Open suggestion and workspace tools';
  detail.append(summary,row,results);panel.append(detail);
 }
}
let busy=false;
function refresh(){
 if(busy)return;
 const ws=snapshot();if(!ws)return;busy=true;
 try{renderWeekly(ws);renderGoals(ws);renderQuality(ws);renderRoutines(ws);optimizePlanning()}catch(e){console.warn('LifeOS V8 read-only report unavailable',e)}finally{busy=false}
}
function init(){
 const field=$('qualityDate');if(field)field.addEventListener('change',refresh);
 $('lifeosNavigation')?.addEventListener('click',()=>setTimeout(refresh,70));
 document.addEventListener('click',e=>{if(e.target.closest('#weeklyDashboardRefresh,#goalRecoveryRefresh,#qualityAnalyze,#personalCheckHealth,#personalReviewWeek'))setTimeout(refresh,120)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 refresh();setInterval(()=>{if(!document.hidden)refresh()},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();