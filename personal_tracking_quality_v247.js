/* LifeOS V247 — explain recorded vs unique time and overdue timers.
 * Read-only: never changes sessions, plans, queues, or sync metadata. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSTrackingQualityV247=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const DAY=86400000,MIN=60000;
function clamp(n,a,b){return Math.max(a,Math.min(n,b))}
function segmentsFor(s,from,to,at){
 const out=[];
 if(!s||!Array.isArray(s.segments))return out;
 for(const seg of s.segments){
  if(!seg||!Number.isFinite(seg.start))continue;
  const end=seg.end==null&&s.status==='running'?at:Number(seg.end);
  if(!Number.isFinite(end)||end<=seg.start)continue;
  const a=Math.max(from,seg.start),b=Math.min(to,end,at);
  if(b>a)out.push([a,b]);
 }
 return out;
}
function inspect(sessions,from,to,at=Date.now()){
 if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from||to-from>25*3600000||!Number.isFinite(at))
  throw Error('Inspect a local calendar day (up to 25 hours during daylight-saving changes).');
 const intervals=[];let recordedMs=0,periodCount=0;
 for(const s of Array.isArray(sessions)?sessions:[]){
  for(const pair of segmentsFor(s,from,to,at)){
   intervals.push(pair);recordedMs+=pair[1]-pair[0];periodCount++;
  }
 }
 intervals.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 let uniqueMs=0,lastStart=null,lastEnd=null;
 for(const [a,b] of intervals){
  if(lastStart===null){lastStart=a;lastEnd=b;continue}
  if(a<=lastEnd)lastEnd=Math.max(lastEnd,b);
  else{uniqueMs+=lastEnd-lastStart;lastStart=a;lastEnd=b}
 }
 if(lastStart!==null)uniqueMs+=lastEnd-lastStart;
 const elapsedWindow=clamp(at-from,0,to-from);
 const unknownMs=Math.max(0,elapsedWindow-uniqueMs);
 const overlapMs=Math.max(0,recordedMs-uniqueMs);
 return {recordedMs,uniqueMs,overlapMs,unknownMs,elapsedWindow,periodCount,
  over24h:recordedMs>DAY,
  highCoverage:elapsedWindow>0&&uniqueMs/elapsedWindow>=.95,
  overlapRatio:recordedMs>0?overlapMs/recordedMs:0};
}
function openRisk(sessions,at=Date.now(),guard=root.LifeOSDurationGuardV78){
 return (Array.isArray(sessions)?sessions:[]).filter(s=>s&&s.status==='running').map(s=>{
  const name=String(s.name||'Activity');
  const elapsed=guard?.elapsed?.(s,at)??segmentsFor(s,0,at,at).reduce((sum,[a,b])=>sum+b-a,0);
  const expected=guard?.valid?.(s)?.targetMinutes??guard?.suggestion?.(name)??60;
  const over=elapsed-expected*MIN;
  return {id:String(s.id),name,elapsedMs:elapsed,expectedMinutes:expected,overdueMs:Math.max(0,over),
   needsReview:over>=Math.max(30,expected)*MIN};
 }).filter(s=>s.needsReview).sort((a,b)=>b.overdueMs-a.overdueMs);
}
function localDay(time){const d=new Date(time);d.setHours(0,0,0,0);return d.getTime()}
function fmt(ms){const n=Math.round(Math.max(0,ms)/MIN);return Math.floor(n/60)+'h '+String(n%60).padStart(2,'0')+'m'}
function recentDays(sessions,at=Date.now(),days=7){
 if(!Number.isInteger(days)||days<1||days>14)throw Error('Choose 1–14 days');
 const today=localDay(at),rows=[];
 for(let offset=0;offset<days;offset++){
  const start=new Date(today);start.setDate(start.getDate()-offset);
  const from=start.getTime();
  const end=new Date(start);end.setDate(end.getDate()+1);
  const report=inspect(sessions,from,end.getTime(),at);
  rows.push({date:new Date(from).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}),from,...report});
 }
 return rows;
}
function render(){
 const overview=root.document?.getElementById('todayOverview');
 if(!overview)return;
 let card=root.document.getElementById('lo247-quality');
 if(!card){
  card=root.document.createElement('details');
  card.id='lo247-quality';
  card.style.cssText='margin:16px 0;border:1px solid #50748a;border-radius:16px;padding:14px 16px;background:#142a40;color:#e6f6fa;line-height:1.5';
  const title=root.document.createElement('summary');
  title.textContent='Tracking quality';
  title.style.cssText='cursor:pointer;font-weight:700;font-size:16px;min-height:44px';
  const body=root.document.createElement('div');body.id='lo247-quality-body';
  card.append(title,body);
  overview.append(card);
 }
 const body=root.document.getElementById('lo247-quality-body');
 if(!body)return;
 const sessions=root.lifeosReadOnlyWorkspace?.()?.sessions;
 if(!Array.isArray(sessions)){body.textContent='Tracking records are not yet ready.';return}
 const at=Date.now(),from=localDay(at),today=inspect(sessions,from,from+DAY,at);
 const risk=openRisk(sessions,at);
 body.replaceChildren();
 const metrics=root.document.createElement('div');metrics.className='lo286-quality-metrics';
 for(const [label,value] of [['Unique',fmt(today.uniqueMs)],['Overlap',fmt(today.overlapMs)],['Unlogged',fmt(today.unknownMs)]]){
  const tile=root.document.createElement('div');tile.className='lo286-quality-tile';
  const val=root.document.createElement('strong');val.textContent=value;
  const name=root.document.createElement('span');name.textContent=label;
  tile.append(val,name);metrics.append(tile);
 }
 body.append(metrics);
 const note=root.document.createElement('p');note.className='lo286-quality-note';
 note.textContent='Overlapping time is counted once. Unlogged time is unknown.';
 body.append(note);
 const week=recentDays(sessions,at,7);
 const unusual=week.filter(day=>day.over24h||day.overlapRatio>=.25||day.highCoverage);
 const detail=root.document.createElement('details');detail.style.cssText='margin:10px 0;padding:10px;background:#0b2335;border:1px solid #426176;border-radius:12px';
 const heading=root.document.createElement('summary');
 heading.textContent='Last 7 days · '+unusual.length+' day'+(unusual.length===1?'':'s')+' worth reviewing';
 detail.append(heading);
 const list=root.document.createElement('div');list.style.cssText='display:grid;gap:8px;margin-top:12px;font-size:13px';
 for(const day of week){
  if(!day.periodCount)continue;
  const row=root.document.createElement('div');row.style.cssText='padding:9px;border-bottom:1px solid #34516b';
  row.textContent=day.date+' · summed '+fmt(day.recordedMs)+' · unique '+fmt(day.uniqueMs)+
   ' · parallel '+fmt(day.overlapMs)+(day.over24h?' · more than 24h SUMMED':'')+
   (day.highCoverage?' · nearly full-day coverage':'');
  list.append(row);
 }
 if(!list.children.length)list.textContent='No activity periods in the last seven days.';
 detail.append(list);body.append(detail);
 if(risk.length){
  const warning=root.document.createElement('p');warning.style.cssText='color:#f3c98b;font-weight:600';
  warning.textContent=risk.length+' running timer'+(risk.length===1?' needs':'s need')+
   ' duration review. Nothing will be ended automatically.';
  body.append(warning);
  const list=root.document.createElement('ul');list.style.cssText='padding-left:22px';
  for(const row of risk.slice(0,4)){
   const item=root.document.createElement('li');
   item.textContent=row.name+' · '+fmt(row.elapsedMs)+' active · expected about '+row.expectedMinutes+'m';
   list.append(item);
  }
  body.append(list);
 }
 const b=root.document.createElement('button');b.type='button';b.className='btn outline';
 b.textContent='Review activities in Track →';
 b.style.minHeight='44px';
 b.onclick=()=>{root.document.querySelector('#lifeosNavigation button[data-view="tracking"]')?.click();
  root.document.querySelector('[data-lo127-tab="review"]')?.click();};
 body.append(b);
}
function mount(){
 if(!root.document)return;
 render();
 root.document.addEventListener('lifeos-v77-tracking-changed',render);
 root.addEventListener?.('lifeos-v77-tracking-changed',render);
 root.addEventListener?.('focus',render);
 root.setInterval?.(()=>{if(root.document.visibilityState!=='hidden')render()},60000);
}
if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {inspect,openRisk,segmentsFor,localDay,recentDays,fmt,render};
});
