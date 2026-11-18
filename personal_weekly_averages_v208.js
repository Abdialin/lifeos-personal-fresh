/* LifeOS V208: seven-day evidence averages; local dates, no storage writes. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSWeeklyAveragesV208=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const DAY=86400000;
const isSample=s=>!!(s?.seedBatch||s?.assumed||s?.isExample||s?.developmentExample||
 ['development-starter','development-seed','assumed-demo'].includes(s?.source));
const dateKey=t=>{const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const fmtMinutes=minutes=>{const m=Math.round(minutes);return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m'};
function merge(ranges){
 ranges.sort((a,b)=>a[0]-b[0]);const out=[];
 for(const [a,b] of ranges){const last=out[out.length-1];if(last&&a<=last[1])last[1]=Math.max(last[1],b);else out.push([a,b])}
 return out;
}
function compute(workspace,now=Date.now()){
 const latest=new Date(now);latest.setHours(0,0,0,0);const days=[];
 const sessions=Array.isArray(workspace?.sessions)?workspace.sessions:[];
 for(let back=6;back>=0;back--){
  const d=new Date(latest);d.setDate(d.getDate()-back);
  const start=d.getTime(),end=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime(),cutoff=Math.min(end,now);
  const intervals=[];let totalMs=0,sessionIds=new Set(),sampleCount=0;
  for(const s of sessions){
   if(!s||isSample(s)){if(s&&isSample(s))sampleCount++;continue}
   const segments=Array.isArray(s.segments)&&s.segments.length?s.segments:[{start:s.startAt,end:s.endAt}];
   for(const z of segments){
    const a=Number(z.start),b=z.end==null?(s.status==='running'?now:NaN):Number(z.end);
    if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)continue;
    const from=Math.max(start,a),to=Math.min(cutoff,b);
    if(to<=from)continue;intervals.push([from,to]);totalMs+=to-from;sessionIds.add(String(s.id));
   }
  }
  const uniqueMs=merge(intervals).reduce((sum,[a,b])=>sum+b-a,0);
  days.push({date:dateKey(start),label:d.toLocaleDateString(undefined,{weekday:'short'}),uniqueMs,totalMs,overlapMs:Math.max(0,totalMs-uniqueMs),recordCount:sessionIds.size,sampleCount});
 }
 const sum=key=>days.reduce((v,x)=>v+x[key],0);
 return {days,averageUniqueMinutes:sum('uniqueMs')/60000/7,
  averageRecordedMinutes:sum('totalMs')/60000/7,
  totalOverlapMinutes:sum('overlapMs')/60000,
  activeDays:days.filter(x=>x.uniqueMs>0).length,
  records:sum('recordCount'),completeThrough:dateKey(now),
  excludedExamples:days[0]?.sampleCount||0};
}
function mount(){
 if(typeof document==='undefined'||document.getElementById('lo208-weekly-averages'))return;
 const target=document.getElementById('lifeosViewTitle');
 if(!target)return;
 const host=document.createElement('section');host.id='lo208-weekly-averages';host.className='lo208-card';
 host.innerHTML='<div class="lo208-head"><div><span class="lo208-eyebrow">7-DAY RECORDING RHYTHM</span><h3>Weekly averages</h3><p>Actual saved activity, split at local midnight · overlapping minutes shown separately.</p></div><span class="lo208-badge">Read-only</span></div><div class="lo208-kpis"></div><div class="lo208-graph" role="group" aria-label="Recorded activity by day"></div><p class="lo208-note">An empty day means there is no qualifying recorded activity. It does not establish that nothing happened. Sample-tagged records are excluded.</p><p class="lo208-selected" role="status"></p>';
 target.after(host);
 const kpis=host.querySelector('.lo208-kpis'),chart=host.querySelector('.lo208-graph'),selected=host.querySelector('.lo208-selected');
 let selectedDay='';
 function paint(){
  if(document.body.dataset.lifeosView!=='analytics')return;
  let w;try{w=root.lifeosReadOnlyWorkspace?.()}catch{}
  if(!w){selected.textContent='Workspace not available.';return}
  const data=compute(w),max=Math.max(1,...data.days.map(x=>x.uniqueMs));
  const stats=[
   ['Average occupied time',fmtMinutes(data.averageUniqueMinutes)],
   ['Average recorded time',fmtMinutes(data.averageRecordedMinutes)],
   ['Days with records',data.activeDays+' / 7'],
   ['Parallel activity overlap',fmtMinutes(data.totalOverlapMinutes)]
  ];
  kpis.replaceChildren();for(const [label,value] of stats){const box=document.createElement('div');box.className='lo208-kpi';const b=document.createElement('strong');b.textContent=value;const small=document.createElement('span');small.textContent=label;box.append(b,small);kpis.append(box)}
  chart.replaceChildren();
  if(!data.days.some(x=>x.uniqueMs>0)){selected.textContent='There are no qualifying recorded intervals in this seven-day view.'}
  else if(!selectedDay||!data.days.some(x=>x.date===selectedDay))selectedDay=data.days[data.days.length-1].date;
  for(const day of data.days){
   const b=document.createElement('button');b.type='button';b.className='lo208-day';b.dataset.date=day.date;b.setAttribute('aria-pressed',String(selectedDay===day.date));
   b.setAttribute('aria-label',day.date+': '+fmtMinutes(day.uniqueMs/60000)+' uniquely recorded');
   const number=document.createElement('strong');number.textContent=day.uniqueMs?fmtMinutes(day.uniqueMs/60000):'—';
   const track=document.createElement('span');track.className='lo208-track';const bar=document.createElement('i');bar.style.height=(day.uniqueMs/max*100).toFixed(1)+'%';track.append(bar);
   const label=document.createElement('small');label.textContent=day.label;b.append(number,track,label);
   b.addEventListener('click',()=>{selectedDay=day.date;paint();const picker=document.getElementById('lo53-date');if(picker){picker.value=day.date;picker.dispatchEvent(new Event('change',{bubbles:true}))}});
   chart.append(b);
  }
  if(selectedDay){const d=data.days.find(x=>x.date===selectedDay);if(d)selected.textContent=d.date+' · '+fmtMinutes(d.uniqueMs/60000)+' occupied · '+fmtMinutes(d.totalMs/60000)+' recorded across '+d.recordCount+' activity record(s). Selecting a day also updates the activity timeline when available.'}
 }
 let pending=0;const schedule=()=>{clearTimeout(pending);pending=setTimeout(paint,15)};
 document.getElementById('lifeosNavigation')?.addEventListener('click',schedule);
 for(const event of ['lifeos-v77-tracking-changed','lifeos-v74-records-changed','lifeos-v207-gap-committed'])root.addEventListener(event,schedule);
 root.addEventListener('focus',schedule);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
 paint();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return Object.freeze({compute,merge,fmtMinutes,dateKey});
});
