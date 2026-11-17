/* LifeOS V91–V94 — read-only insights suite. No session, schedule, task,
 * nutrition, habit, or debt state is ever mutated by this module. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSInsightsSuiteV94=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const DAY=86400000;
const sample=x=>Boolean(x?.seedBatch||['assumed-demo','development-starter','imported-example'].includes(x?.source));
function duration(s,start,end){
 let ms=0;
 for(const seg of s?.segments||[]){
  const a=Number(seg?.start),b=seg?.end==null?(s.status==='running'?end:NaN):Number(seg.end);
  if(Number.isFinite(a)&&Number.isFinite(b)&&b>a)ms+=Math.max(0,Math.min(b,end)-Math.max(a,start));
 }
 return ms;
}
function distraction(workspace,now=Date.now(),days=7){
 if(![7,14,30].includes(days))throw Error('Select 7, 14 or 30 days.');
 const start=now-days*DAY,byCategory=new Map(),byHour=Array.from({length:24},()=>({count:0,ms:0})),byDay=new Map(),triggers=new Map(),rows=[];
 for(const s of workspace?.sessions||[]){
  if(!s||sample(s)||!(s.activityType==='distraction'||s.name==='Distraction'||/^Distraction[: —-]/i.test(String(s.name||''))))continue;
  const ms=duration(s,start,now);if(!ms)continue;
  const cat=String(s.distractionCategory||'Uncategorized').slice(0,60);
  const trigger=String(s.distractionTrigger||'Not provided').slice(0,100);
  const current=byCategory.get(cat)||{name:cat,count:0,ms:0};
  current.count++;current.ms+=ms;byCategory.set(cat,current);
  triggers.set(trigger,(triggers.get(trigger)||0)+1);
  for(const seg of s.segments||[]){
   const a=Number(seg?.start);if(!Number.isFinite(a))continue;
   const b=seg.end==null?(s.status==='running'?now:NaN):Number(seg.end);
   if(!Number.isFinite(b))continue;
   // Attribute time to actual calendar dates and hours, including midnight crossings.
   let cursor=Math.max(start,a),stop=Math.min(b,now),steps=0;
   while(cursor<stop&&steps++<24*366){
    const date=new Date(cursor),next=new Date(date);next.setMinutes(60,0,0);
    const until=Math.min(stop,next.getTime()),portion=Math.max(0,until-cursor);
    const day=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
    byHour[date.getHours()].ms+=portion;
    byDay.set(day,(byDay.get(day)||0)+portion);
    cursor=until>cursor?until:stop;
   }
  }
  rows.push({id:String(s.id),category:cat,trigger,ms,affectedPlanId:s.affectedPlanId||null});
 }
 const cats=[...byCategory.values()];
 return {days,start,end:now,count:rows.length,totalMs:rows.reduce((t,x)=>t+x.ms,0),
  frequent:cats.slice().sort((a,b)=>b.count-a.count||b.ms-a.ms),
  longest:cats.slice().sort((a,b)=>b.ms-a.ms||b.count-a.count),
  hours:byHour,daysSeries:[...byDay].sort(([a],[b])=>a.localeCompare(b)),
  triggers:[...triggers].sort((a,b)=>b[1]-a[1]),
  affectedPlans:rows.filter(x=>x.affectedPlanId).length,
  rows,
  caveat:'Only explicitly labeled, non-example distraction sessions. Missing time and deliberate leisure are never assumed to be distractions.'};
}
function debt(workspace,now=Date.now()){
 const engine=root.LifeOSDebtRecoveryV75;
 const report=engine?.outstanding?.(workspace,now);
 if(!report||report.error)return {ok:false,reason:report?.error||'Debt module unavailable'};
 const groups=new Map();
 for(const d of report.open||[]){
  const key=String(d.name||'Unlabeled goal'),g=groups.get(key)||{name:key,missedSessions:0,openMs:0};
  g.missedSessions++;g.openMs+=d.outstandingMs||0;groups.set(key,g);
 }
 return {ok:true,goals:[...groups.values()].sort((a,b)=>b.openMs-a.openMs),openMs:report.openMs||0,scheduledMs:report.scheduledMs||0,recoveredMs:report.recoveredMs||0,unverified:report.unverified?.length||0,
 caveat:'A recovery plan is not completed time. Unverified attendance is not counted as confirmed debt.'};
}
function lifestyle(workspace,now=Date.now(),days=7){
 const from=new Date(now);from.setHours(0,0,0,0);from.setDate(from.getDate()-days+1);
 const start=from.getTime(),end=now;
 const workouts=(workspace?.workouts||[]).filter(x=>x&&!sample(x)&&typeof x.date==='string'&&x.date>=local(start)&&x.date<=local(end));
 const meals=(workspace?.meals||[]).filter(x=>x&&!sample(x)&&typeof x.date==='string'&&x.date>=local(start)&&x.date<=local(end));
 const byType=new Map(),exerciseDays=new Set();
 for(const x of workouts){const type=String(x.type||'Other');byType.set(type,(byType.get(type)||0)+1);exerciseDays.add(x.date)}
 return {workouts:workouts.length,workoutDays:exerciseDays.size,meals:meals.length,
 types:[...byType].sort((a,b)=>b[1]-a[1]),favoriteMeals:(workspace?.mealTemplates||[]).length,
 warning:'Counts reflect recorded entries only, not missing meals, calories consumed, or medical conclusions.'};
}
function local(t){const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function planQuality(workspace,now=Date.now(),days=7){
 const start=now-days*DAY,plans=(workspace?.schedule||[]).filter(p=>p&&!sample(p)&&p.status!=='cancelled'&&Number.isFinite(p.startAt)&&Number.isFinite(p.endAt)&&p.startAt>=start&&p.startAt<now+days*DAY&&p.endAt>p.startAt);
 const confirmed=plans.filter(p=>p.sessionId&&workspace?.sessions?.some(s=>String(s.id)===String(p.sessionId)&&s.status==='finished'&&!sample(s)));
 const upcoming=plans.filter(p=>p.startAt>=now);
 const conflictIds=new Set();
 for(let i=0;i<upcoming.length;i++)for(let j=i+1;j<upcoming.length;j++){
  if(upcoming[i].startAt<upcoming[j].endAt&&upcoming[j].startAt<upcoming[i].endAt){conflictIds.add(upcoming[i].id);conflictIds.add(upcoming[j].id)}
 }
 return {plans:plans.length,confirmed:confirmed.length,upcoming:upcoming.length,conflicts:conflictIds.size,
 confidence:confirmed.length>=5?'Moderate evidence':confirmed.length>=2?'Limited evidence':'Insufficient evidence',
 caution:'Planning confidence depends on linked completed records; time overlap alone does not establish completion. Suggestions require approval.'};
}
function mount(){

 function mountGoalsSummary(){
  const target=document.getElementById('analyticsPanel');
  if(!target||document.getElementById('lo175-goal-insights'))return;
  const panel=document.createElement('div');panel.id='lo175-goal-insights';
  panel.style.cssText='padding:15px;margin:16px 0;border-radius:15px;border:1px solid #315c64;background:#0a2231;color:#e6f4f1';
  target.prepend(panel);
  const paint=()=>{
   const metrics=root.LifeOSGoalEvidenceV175;
   if(!metrics){panel.textContent='Goal progress is unavailable.';return}
   const w=root.lifeosReadOnlyWorkspace?.()||{},rows=metrics.rows(w);
   panel.replaceChildren();
   const h=document.createElement('h3');h.textContent='Goals · this week';h.style.cssText='margin:0 0 8px;font-size:17px';panel.append(h);
   const intro=document.createElement('p');intro.textContent='Completed activities update these figures automatically when their recorded names and sources match your goal rules. Linked workout logs and gym timers are counted once.';intro.style.cssText='color:#9cbfc4;font-size:12px;line-height:1.5';panel.append(intro);
   for(const item of rows){
    const card=document.createElement('div');card.style.cssText='padding:10px 0;border-top:1px solid #284b59';
    const name=document.createElement('strong');name.textContent=item.g.name||'Goal';name.style.cssText='display:block;font-size:13px';
    const value=document.createElement('div');value.textContent=Number(item.cur.value.toFixed(1))+' / '+item.t+' '+metrics.unit(item.g);value.style.cssText='font-size:16px;font-weight:800;margin:5px 0';
    const line=document.createElement('div');line.style.cssText='height:5px;border-radius:5px;background:#193e50;overflow:hidden';
    const fill=document.createElement('i');fill.style.cssText='display:block;height:100%;border-radius:5px;background:#18ae88;width:'+Math.min(100,item.t?100*item.cur.value/item.t:0)+'%';line.append(fill);
    const source=document.createElement('small');source.textContent=item.cur.records+' qualifying records · '+item.cur.excluded+' example records excluded';source.style.cssText='display:block;margin-top:5px;color:#98b9c0';
    card.append(name,value,line,source);panel.append(card);
   }
   if(!rows.length){const p=document.createElement('p');p.textContent='No goals configured yet.';panel.append(p)}
  };
  const update=()=>{if(document.body.dataset.lifeosView==='analytics')paint()};
  document.getElementById('lifeosNavigation')?.addEventListener('click',()=>setTimeout(update,90));
  root.addEventListener('lifeos-v77-tracking-changed',update);
  root.addEventListener('focus',update);
  paint();
 }
 mountGoalsSummary();
 if(document.getElementById('lo94-suite'))return;
 const target=document.getElementById('lo74-distraction')||document.getElementById('trackDistractionPanel');
 if(!target)return;
 const panel=document.createElement('section');panel.id='lo94-suite';panel.className='lo94-insights';
 panel.innerHTML='<h3>LifeOS Insights · evidence-based review</h3><label>Analysis period <select id="lo94-period"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label><div id="lo94-content"></div><button type="button" id="lo94-refresh" class="btn outline">Refresh insights</button><p class="sub">These reports are read-only. Planned, actual, missed, estimated, overlapping and unlogged time remain separate.</p>';
 target.append(panel);
 const sheet=document.createElement('style');sheet.textContent=`
 #lo94-suite{margin:15px 0;padding:16px;background:#17243a;border:1px solid #55718e;border-radius:14px;color:#edf4ff}
 #lo94-suite select{background:#233655;color:#fff;border:1px solid #7390aa;border-radius:8px;padding:8px}
 #lo94-suite .lo94-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px}
 #lo94-suite article{padding:12px;background:#263954;border-radius:9px}
 #lo94-suite article strong{display:block;font-size:20px}
 #lo94-suite small{color:#c0d2e6;display:block}
 `;document.head.append(sheet);
 const el=id=>panel.querySelector('#'+id),workspace=()=>root.lifeosReadOnlyWorkspace?.()||{};
 function fmt(ms){const m=Math.round(ms/60000);return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m'}
 function render(){
  const w=workspace(),days=Number(el('lo94-period').value),d=distraction(w,Date.now(),days),debtData=debt(w),life=lifestyle(w,Date.now(),days),plan=planQuality(w);
  const cards=[
   ['Distractions',String(d.count)+' sessions',fmt(d.totalMs)+' explicitly labeled'],
   ['Most frequent',d.frequent[0]?.name||'No evidence',d.frequent[0]?d.frequent[0].count+' records':'Not estimated'],
   ['Most time-consuming',d.longest[0]?.name||'No evidence',d.longest[0]?fmt(d.longest[0].ms):'Not estimated'],
   ['Peak distraction hour',d.hours.some(x=>x.ms)?String(d.hours.map(x=>x.ms).indexOf(Math.max(...d.hours.map(x=>x.ms)))).padStart(2,'0')+':00':'Unknown','Based on recorded durations'],
   ['Open confirmed debt',debtData.ok?fmt(debtData.openMs):'Unavailable',debtData.ok?debtData.goals.length+' goal(s)':'Debt module unavailable'],
   ['Recovery booked',debtData.ok?fmt(debtData.scheduledMs):'Unavailable','Plans only, not tracked'],
   ['Recovery verified',debtData.ok?fmt(debtData.recoveredMs):'Unavailable','Linked finished sessions'],
   ['Workouts',String(life.workouts),life.workoutDays+' distinct workout days'],
   ['Meals recorded',String(life.meals),'No assumptions about unlogged meals'],
   ['Upcoming plan conflicts',String(plan.conflicts),'Review plans before changing']
  ];
  const goalEvidence=root.LifeOSGoalEvidenceV175;
  const goalRows=goalEvidence?.rows?.(w)||[];
  for(const r of goalRows.slice(0,5)){
   const target=Number(r.t)||0,value=Number(r.cur?.value)||0;
   cards.push([String(r.g.name||'Goal'),Number(value.toFixed(1))+' / '+target+' '+goalEvidence.unit(r.g),
    r.cur.records+' qualifying records this week · '+(r.cur.excluded||0)+' examples excluded']);
  }
  const box=el('lo94-content');box.replaceChildren();
  const grid=document.createElement('div');grid.className='lo94-grid';
  for(const [title,value,note] of cards){const art=document.createElement('article');const h=document.createElement('span');h.textContent=title;const strong=document.createElement('strong');strong.textContent=value;const small=document.createElement('small');small.textContent=note;art.append(h,strong,small);grid.append(art)}box.append(grid);
  const text=document.createElement('p');
  const frequent=d.frequent[0],peak=d.hours.map(x=>x.ms);
  text.textContent=d.count?('Review: '+(frequent?.name||'')+' appeared '+(frequent?.count||0)+' times. Your records suggest checking its triggers before deciding whether to change a routine. '+(d.triggers[0]?'Most recorded trigger: '+d.triggers[0][0]+'. ':'')+'These are observations, not proof of cause.'):'No recorded distractions in this period. Unlogged time is not categorized as distraction.';
  box.append(text);
  const note=document.createElement('p');note.className='sub';note.textContent='Goal figures use the same saved-record rules as Goals; timed fitness and linked workouts count once. Plan evidence: '+plan.confidence+' · '+plan.confirmed+' completed linked sessions out of '+plan.plans+' relevant plans. Debt unverified: '+(debtData.ok?debtData.unverified:'unknown')+'.';box.append(note);
 }
 el('lo94-period').onchange=render;el('lo94-refresh').onclick=render;
 root.addEventListener('lifeos-v77-tracking-changed',render);
 root.addEventListener('lifeos-v65-plan-committed',render);
 render();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {distraction,debt,lifestyle,planQuality,duration};
});