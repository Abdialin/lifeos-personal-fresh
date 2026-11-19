/* LifeOS V253: cross-category, evidence-based activity analytics.
   Reads canonical tracking and confirmed detail records; does not edit sessions.
   Data completeness and source distinctions are intentional. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSActivityAnalyticsV253=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const DAY=86400000,MIN=60000;
const excluded=s=>!s||!!s.seedBatch||['development-starter','assumed-demo','imported-example'].includes(s.source);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function category(s){
 const direct=String(s?.activityDetailsV252?.category||'').trim().toLowerCase();
 const catalog=root.LifeOSActivityIntelligenceV251?.catalog||[];
 if(catalog.some(c=>c.id===direct))return direct;
 if(s?.activityType==='distraction')return 'distraction';
 return root.LifeOSActivityIntelligenceV251?.match?.(s?.name)?.id||'other';
}
function slices(s,from,to,at){
 const result=[];
 if(!Array.isArray(s?.segments))return result;
 for(const seg of s.segments){
  const start=Number(seg?.start),end=seg?.end==null&&s.status==='running'?at:Number(seg?.end);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)continue;
  const a=Math.max(start,from),b=Math.min(end,to,at);
  if(b>a)result.push([a,b]);
 }
 return result;
}
function unionMs(ranges){ranges.sort((a,b)=>a[0]-b[0]);let sum=0,left=null,right=null;for(const [a,b] of ranges){if(left===null){left=a;right=b}else if(a<=right)right=Math.max(right,b);else{sum+=right-left;left=a;right=b}}return sum+(left!==null?right-left:0)}
function percentage(values,predicate=x=>x===true){const known=values.filter(v=>v!==undefined&&v!==null&&v!=='');const yes=known.filter(predicate).length;return {known:known.length,yes,pct:known.length?Math.round(yes*100/known.length):null}}
function calculate(workspace,id,days=14,at=Date.now()){
 if(![7,14,30].includes(days))throw Error('Invalid date range.');
 const from=at-days*DAY;
 const sessions=(workspace?.sessions||[]).filter(s=>!excluded(s)&&category(s)===id&&s.status==='finished'&&finite(Number(s.startAt))&&Number(s.startAt)<=at&&Number(s.endAt||s.startAt)>=from);
 const daily=new Map(),ranges=[];let sumMs=0,prep=0,travel=0,documented=0;
 const details=[];
 for(const s of sessions){
  const pieces=slices(s,from,at,at);let ms=0;
  for(const pair of pieces){ranges.push(pair);ms+=pair[1]-pair[0]}
  sumMs+=ms;
  const day=new Date(s.startAt);day.setHours(0,0,0,0);
  const key=day.getTime(),entry=daily.get(key)||{start:key,ms:0,count:0};
  entry.ms+=ms;entry.count++;daily.set(key,entry);
  const d=s.activityDetailsV252||{};if(Object.keys(d).some(k=>k!=='updatedAt'))documented++;
  if(finite(d.preparationMinutes))prep+=d.preparationMinutes;
  if(finite(d.travelMinutes))travel+=d.travelMinutes;
  details.push({session:s,details:d,ms});
 }
 const trends=[];const base=new Date(at);base.setHours(0,0,0,0);
 for(let i=days-1;i>=0;i--){const d=new Date(base);d.setDate(d.getDate()-i);const e=daily.get(d.getTime());trends.push({date:d.toLocaleDateString(undefined,{month:'short',day:'numeric'}),ms:e?.ms||0,count:e?.count||0})}
 const metrics={},numeric=(key)=>details.map(x=>x.details[key]).filter(finite),numberSum=key=>numeric(key).reduce((a,b)=>a+b,0);
 const countKnown=key=>numeric(key).length;
 const bool=key=>percentage(details.map(x=>x.details[key]));
 const frequency=key=>{const map={};for(const x of details){const v=String(x.details[key]||'').trim();if(v)map[v]=(map[v]||0)+1}return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5)};
 if(id==='prayer'){
   Object.assign(metrics,{onTime:bool('onTime'),congregation:bool('congregation'),mosque:bool('mosque'),firstRow:percentage(details.map(x=>x.details.row),x=>x==='first'),sunnahUnits:numberSum('sunnahUnits'),sunnahRecorded:countKnown('sunnahUnits'),prayers:frequency('prayerName')});
 }else if(id==='study'){
   Object.assign(metrics,{pages:numberSum('studyPages'),pagesRecorded:countKnown('studyPages'),subjects:frequency('studySubject'),focus:frequency('studyFocus')});
 }else if(id==='fitness'){
   Object.assign(metrics,{workoutTypes:frequency('workoutType'),setsRecorded:details.filter(x=>x.details.workoutSets).length,
    linkedWorkouts:(workspace?.workouts||[]).filter(w=>!excluded(w)&&Number(w.date?Date.parse(w.date):w.startAt)>=from&&Number(w.date?Date.parse(w.date):w.startAt)<=at).length});
 }else if(id==='nutrition'){Object.assign(metrics,{mealTypes:frequency('mealType'),notedMeals:details.filter(x=>x.details.mealNotes).length})}
 else if(id==='family'){Object.assign(metrics,{companions:frequency('familyWith')})}
 else if(id==='friends'){Object.assign(metrics,{activities:frequency('socialContext')})}
 else if(id==='distraction'){Object.assign(metrics,{causes:frequency('distractionCategory'),triggers:frequency('distractionTrigger')})}
 else if(id==='work'){Object.assign(metrics,{exceededSessions:details.filter(x=>finite(x.session.durationGuardV78?.targetMinutes)&&x.ms>x.session.durationGuardV78.targetMinutes*MIN).length,projects:frequency('workProject'),workQuality:frequency('workQuality'),breakMinutes:numberSum('workBreakMinutes')})}
 else if(id==='sleep'){Object.assign(metrics,{sleepQuality:frequency('sleepQuality'),interruptions:numberSum('sleepInterruptions')})}
 else if(id==='quran'){Object.assign(metrics,{quranPages:numberSum('quranPages'),quranPagesRecorded:countKnown('quranPages'),surahs:frequency('quranSurah'),revision:percentage(details.map(x=>x.details.quranRevision))})}
 else if(id==='reading'){Object.assign(metrics,{bookPages:numberSum('bookPages'),bookPagesRecorded:countKnown('bookPages'),books:frequency('bookTitle')})}
 else if(id==='chores'){Object.assign(metrics,{tasks:frequency('choresTask')})}
 else if(id==='errands'){Object.assign(metrics,{errands:frequency('errandsTask'),waitingMinutes:numberSum('waitingMinutes')})}
 else if(id==='travel'){Object.assign(metrics,{modes:frequency('travelMode'),purposes:frequency('travelPurpose')})}
 else if(id==='health'){Object.assign(metrics,{healthActivities:frequency('healthType')})}
 else if(id==='hobbies'){Object.assign(metrics,{hobbies:frequency('hobbyType'),projects:frequency('hobbyProgress')})}
 else if(id==='outdoors'){Object.assign(metrics,{distanceKm:numberSum('distanceKm'),places:frequency('outdoorPlace')})}
 else if(id==='volunteer'){Object.assign(metrics,{causes:frequency('volunteerCause')})}
 const activeDays=trends.filter(x=>x.count).length,uniqueMs=unionMs(ranges);
 return {id,days,sessions:sessions.length,finishedCount:sessions.length,activeDays,trackedMs:sumMs,uniqueMs,averagePerActiveDayMs:activeDays?sumMs/activeDays:0,averagePerCalendarDayMs:sumMs/days,
 averageSessionMs:sessions.length?sumMs/sessions.length:0,preparationMinutes:prep,travelMinutes:travel,detailsConfirmed:documented,detailsCoverage:sessions.length?Math.round(100*documented/sessions.length):null,trends,metrics};
}
const fmt=ms=>{const min=Math.round(ms/MIN);return Math.floor(min/60)+'h '+String(min%60).padStart(2,'0')+'m'};
function mount(){
 const doc=root.document;if(!doc||doc.getElementById('lo253-activity-analytics'))return;
 const routines=doc.getElementById('personalActivityPanel'),fitness=doc.getElementById('lifeosFitnessDashboard');
 const host=routines||fitness;if(!host)return;
 const box=doc.createElement('section');box.id='lo253-activity-analytics';box.className='panel';
 box.style.cssText='border:1px solid #477e96;background:#11273c;max-width:100%';
 const h=doc.createElement('h2');h.textContent='My Life · Activity intelligence';box.append(h);
 const desc=doc.createElement('p');desc.className='sub';desc.textContent='Explore each activity independently, then compare trends. Only confirmed tracking is counted. Unknown details remain unknown.';box.append(desc);
 const controls=doc.createElement('div');controls.className='row';
 const select=doc.createElement('select');select.id='lo253-category';select.className='field';select.style.cssText='flex:1;min-width:180px;max-width:420px';
 const catalog=root.LifeOSActivityIntelligenceV251?.catalog||[];
 for(const item of catalog){const option=doc.createElement('option');option.value=item.id;option.textContent=item.title;select.append(option)}
 const period=doc.createElement('select');period.className='field';period.style.cssText='width:115px';for(const n of [7,14,30]){const o=doc.createElement('option');o.value=n;o.textContent=n+' days';period.append(o)}period.value='14';controls.append(select,period);box.append(controls);
 const status=doc.createElement('p');status.className='sub';status.setAttribute('role','status');box.append(status);
 const overview=doc.createElement('div');overview.id='lo253-all-overview';overview.style.cssText='display:grid;gap:7px;margin:12px 0 18px';box.append(overview);
 const kpis=doc.createElement('div');kpis.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:9px';box.append(kpis);
 const chart=doc.createElement('div');chart.style.cssText='display:flex;align-items:end;gap:3px;height:135px;padding:12px 4px 2px;border-bottom:1px solid #6886a3;margin:14px 0';chart.setAttribute('role','img');box.append(chart);
 const details=doc.createElement('div');details.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:9px';box.append(details);
 const foot=doc.createElement('p');foot.className='sub';foot.textContent='Summed tracked time may include simultaneous activities. Unique time removes overlap within this category. Preparation and travel are separately reported and are not added to the activity total.';box.append(foot);
 function stat(parent,label,value,sub=''){
  const card=doc.createElement('div');card.style.cssText='padding:12px;background:#1c3651;border:1px solid #355978;border-radius:13px;min-width:0';
  const strong=doc.createElement('strong');strong.style.cssText='display:block;font-size:22px;font-variant-numeric:tabular-nums';strong.textContent=String(value);
  const title=doc.createElement('span');title.style.cssText='display:block;font-size:12px;color:#c3d9ea';title.textContent=label;card.append(strong,title);
  if(sub){const p=doc.createElement('small');p.textContent=sub;p.style.color='#93b2c9';card.append(p)}parent.append(card);
 }
 function render(){
  const data=root.lifeosReadOnlyWorkspace?.();if(!data){status.textContent='Activity records unavailable.';return}
  const report=calculate(data,select.value,Number(period.value));kpis.replaceChildren();details.replaceChildren();chart.replaceChildren();overview.replaceChildren();
  const totals=catalog.map(c=>({title:c.title,id:c.id,stats:calculate(data,c.id,Number(period.value))})).filter(x=>x.stats.sessions>0).sort((a,b)=>b.stats.trackedMs-a.stats.trackedMs).slice(0,6);
  const heading=doc.createElement('strong');heading.textContent='Your activity mix · top tracked categories';overview.append(heading);
  if(!totals.length){const p=doc.createElement('small');p.textContent='No completed sessions in this period.';overview.append(p)}
  for(const item of totals){
   const row=doc.createElement('button');row.type='button';row.style.cssText='display:grid;grid-template-columns:minmax(105px,1fr) 2fr auto;align-items:center;gap:8px;border:0;border-radius:8px;background:#193650;color:#eef8ff;text-align:left;padding:7px 9px;min-height:42px';
   const label=doc.createElement('span');label.textContent=item.title;label.style.cssText='font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';row.append(label);
   const track=doc.createElement('span');track.style.cssText='height:10px;border-radius:7px;background:#314f6b;overflow:hidden';
   const bar=doc.createElement('span');bar.style.cssText='display:block;height:100%;width:'+Math.round(100*item.stats.trackedMs/totals[0].stats.trackedMs)+'%;background:#6accc6;border-radius:7px';track.append(bar);row.append(track);
   const value=doc.createElement('span');value.textContent=fmt(item.stats.trackedMs);value.style.fontSize='12px';row.append(value);
   row.onclick=()=>{select.value=item.id;render()};overview.append(row);
  }
  status.textContent=report.sessions+' finished sessions · '+report.detailsConfirmed+' with saved activity details ('+(report.detailsCoverage??'—')+'% completeness).';
  stat(kpis,'Tracked time',fmt(report.trackedMs));
  stat(kpis,'Finished sessions',report.sessions);
  stat(kpis,'Average per session',fmt(report.averageSessionMs));
  stat(kpis,'Days active',report.activeDays+'/'+report.days);
  stat(kpis,'Average per calendar day',fmt(report.averagePerCalendarDayMs));
  stat(kpis,'Preparation / travel',report.preparationMinutes+' / '+report.travelMinutes+' min');
  const top=Math.max(MIN,...report.trends.map(x=>x.ms));
  for(const [i,day] of report.trends.entries()){
   const item=doc.createElement('div');item.style.cssText='flex:1;min-width:0;height:'+Math.max(2,Math.round(day.ms/top*100))+'%;background:linear-gradient(#79d3ca,#4f8ce0);border-radius:5px 5px 0 0;position:relative';
   item.title=day.date+' · '+fmt(day.ms)+' · '+day.count+' sessions';item.setAttribute('aria-label',item.title);chart.append(item);
  }
  chart.setAttribute('aria-label','Daily tracked activity time over '+report.days+' days');
  const m=report.metrics;
  for(const [key,label] of [['onTime','On time'],['congregation','In congregation'],['mosque','At mosque'],['firstRow','First row']]){
   if(m[key])stat(details,label,m[key].pct===null?'Unknown':m[key].pct+'%',m[key].known+' recorded answers');
  }
  if(m.revision)stat(details,'Quran revision',m.revision.pct===null?'Unknown':m.revision.pct+'%',m.revision.known+' confirmed answers');
  for(const [key,label] of [['sunnahUnits','Sunnah units'],['pages','Study pages/questions'],['linkedWorkouts','Workout entries'],['setsRecorded','Sessions with sets'],['notedMeals','Meals with details'],['exceededSessions','Exceeded duration sessions'],['quranPages','Quran pages'],['bookPages','Book pages'],['interruptions','Sleep interruptions'],['breakMinutes','Work break minutes'],['waitingMinutes','Waiting minutes'],['distanceKm','Distance (km)']])
   if(m[key]!==undefined)stat(details,label,m[key],key==='sunnahUnits'?m.sunnahRecorded+' sessions with sunnah records':key==='pages'?m.pagesRecorded+' sessions with page records':'');
  for(const [key,label] of [['prayers','Prayer types'],['subjects','Study subjects'],['focus','Focus quality'],['workoutTypes','Workout types'],['mealTypes','Meal types'],['companions','Family members'],['activities','Social activities'],['causes','Distraction types'],['triggers','Distraction triggers'],['projects','Projects and progress'],['workQuality','Work quality'],['sleepQuality','Sleep quality'],['surahs','Surahs'],['books','Books'],['tasks','Household tasks'],['errands','Errands'],['modes','Travel modes'],['purposes','Travel purposes'],['healthActivities','Self-care'],['hobbies','Hobbies'],['places','Outdoor places']])
   if(m[key]?.length)stat(details,label,m[key].map(([name,n])=>name+' ('+n+')').join(' · '));
  if(!report.sessions){stat(details,'Data confidence','No finished sessions','Start and finish activities to build this dashboard.')}
 }
 select.addEventListener('change',render);period.addEventListener('change',render);
 root.addEventListener?.('lifeos-v77-tracking-changed',render);doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)render()});
 host.before(box);render();
}
if(root.document){const init=()=>{mount();root.setTimeout?.(mount,1000)};if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',init,{once:true});else init();}
return {category,slices,unionMs,percentage,calculate,mount};
});