/* LifeOS V209 — evidence-first activity insights. Read-only, no inferred completions. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.LifeOSActivityInsightsV209=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const CATEGORIES=['study','work','fitness','quran','prayer','other'];
const EXCLUDED=new Set(['development-starter','development-seed','assumed-demo','imported-example']);
const sample=r=>!!(r?.seedBatch||r?.assumed||r?.isExample||r?.developmentExample||EXCLUDED.has(r?.source));
function category(s){
 const n=String(s?.name||'').toLowerCase(),detail=s?.activityDetails||{};
 if(/prayer|fajr|dhuhr|dhuhr|asr|maghrib|isha|salah|salat|salaah|bön/.test(n)||detail.prayer&&detail.prayer!=='Not specified')return 'prayer';
 if(/quran|qur.an|koran|hifdh|surah|memorization/.test(n)||detail.surah)return 'quran';
 if(/studying|study|lecture|coursework|assignment|exam|research|coding practice|homework|studier|plugg/.test(n)||detail.subject)return 'study';
 if(/gym|fitness|workout|training|running|walking|cycling|boxing|swim|yoga|strength|träning|promenad|löpning/.test(n)||detail.exercise)return 'fitness';
 if(/work|shift|business|development|arbete|jobba|jobb/.test(n)||detail.role)return 'work';
 return 'other';
}
function dayKey(t){const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function evidence(workspace,kind='study',now=Date.now(),days=7){
 if(!CATEGORIES.includes(kind)||!Number.isSafeInteger(days)||days<1||days>90)throw Error('Invalid insight type or date range');
 const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-(days-1));
 const a=start.getTime(),b=now;
 const sessions=(workspace?.sessions||[]).filter(s=>!sample(s)&&category(s)===kind);
 const byDay=new Map(),seen=new Set(),items=[],numeric={pages:0,sunnahPrayed:0,sunnahMissed:0};
 const detailsPresent={pages:0,sunnahPrayed:0,sunnahMissed:0};
 for(let offset=0;offset<days;offset++){const d=new Date(start);d.setDate(d.getDate()+offset);byDay.set(dayKey(d),{date:dayKey(d),minutes:0,sessionIds:new Set()})}
 for(const s of sessions){
  const segments=Array.isArray(s.segments)&&s.segments.length?s.segments:[{start:s.startAt,end:s.endAt}];
  let minutes=0;
  for(const z of segments){
   const begin=Number(z?.start),end=z?.end==null?(s.status==='running'?now:NaN):Number(z.end);
   if(!Number.isFinite(begin)||!Number.isFinite(end)||end<=begin||end<=a||begin>=b)continue;
   let cur=Math.max(begin,a),last=Math.min(end,b),safety=0;
   while(cur<last&&safety++<100){
    const d=new Date(cur),key=dayKey(cur),next=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime();
    const stop=Math.min(next,last),part=(stop-cur)/60000,slot=byDay.get(key);
    if(slot){slot.minutes+=part;slot.sessionIds.add(String(s.id))}
    minutes+=part;cur=stop;
   }
  }
  if(minutes<=0)continue;
  const detail=s.activityDetails||{};
  seen.add(String(s.id));
  const registeredAt=Number.isFinite(s.endAt)?s.endAt:Number.isFinite(s.startAt)?s.startAt:now;
  const row={id:String(s.id),name:String(s.name||'Activity'),minutes,startedAt:s.startAt,endAt:s.endAt,status:s.status,details:{}};
  for(const key of ['subject','topics','progress','focusLevel','role','workResult','workType','surah','practice','pages','result','exercise','activityType','intensity','prayer','setting','congregation','rowPosition','sunnahPrayed','sunnahMissed']){
   if(detail[key]!==undefined&&detail[key]!==null&&String(detail[key]).trim()!=='')row.details[key]=detail[key];
  }
  // Quantity fields are user-supplied only and are not inferred from elapsed time.
  for(const key of ['pages','sunnahPrayed','sunnahMissed']){
   if(row.details[key]!==undefined){
    const num=Number(row.details[key]);if(Number.isFinite(num)&&num>=0){numeric[key]+=num;detailsPresent[key]++}
   }
  }
  row.at=registeredAt;items.push(row);
 }
 // Explicit workout entries that aren't linked to a counted timer provide additional fitness evidence.
 if(kind==='fitness'){
  for(const w of workspace?.workouts||[]){
   if(sample(w)||w.sessionId&&seen.has(String(w.sessionId)))continue;
   const date=typeof w.date==='string'?new Date(w.date+'T12:00:00').getTime():Number(w.completedAt);
   if(!Number.isFinite(date)||date<a||date>b)continue;
   const val=Number(w.minutes??w.durationMinutes);const min=Number.isFinite(val)&&val>=0?val:0;
   const k=dayKey(date),slot=byDay.get(k);
   if(slot){slot.minutes+=min;slot.sessionIds.add('workout:'+String(w.id))}
   items.push({id:'workout:'+String(w.id),name:String(w.type||'Workout'),minutes:min,at:date,status:'recorded',details:{},source:'manual workout'});
  }
 }
 items.sort((x,y)=>y.at-x.at);
 const rows=[...byDay.values()].map(x=>({date:x.date,minutes:x.minutes,records:x.sessionIds.size}));
 const totalMinutes=rows.reduce((x,y)=>x+y.minutes,0);
 return {kind,days,from:dayKey(a),through:dayKey(now),rows,totalMinutes,
  recordedSessions:items.length,daysWithRecords:rows.filter(x=>x.records).length,
  numeric,detailsPresent,items:items.slice(0,35),excludedExamples:(workspace?.sessions||[]).filter(x=>sample(x)&&category(x)===kind).length};
}
function mount(){
 if(typeof document==='undefined'||document.getElementById('lo209-activity-insights'))return;
 const heading=document.getElementById('lifeosViewTitle');
 if(!heading)return;
 const rootEl=document.createElement('section');rootEl.id='lo209-activity-insights';rootEl.className='lo209-area';rootEl.dataset.view='analytics';
 rootEl.innerHTML='<div class="lo209-head"><div><span class="lo209-eyebrow">ONE RECORD · MANY INSIGHTS</span><h3>Explore your activities</h3><p>Individual activity reviews based on saved timers and details you entered.</p></div><span class="lo209-pill">Read-only</span></div><div class="lo209-picker" role="group" aria-label="Activity category"></div><div class="lo209-results" role="status"></div>';
 const weekly=document.getElementById('lo208-weekly-averages');if(weekly)weekly.after(rootEl);else heading.after(rootEl);
 const picker=rootEl.querySelector('.lo209-picker'),content=rootEl.querySelector('.lo209-results');
 let selected='study';
 const labels={study:'Studying',work:'Work',fitness:'Fitness',quran:'Quran',prayer:'Prayer',other:'Other'};
 for(const cat of CATEGORIES){
  const btn=document.createElement('button');btn.type='button';btn.dataset.kind=cat;btn.textContent=labels[cat];btn.setAttribute('aria-pressed',String(cat===selected));
  btn.addEventListener('click',()=>{selected=cat;paint()});picker.append(btn);
 }
 const clock=m=>{const v=Math.max(0,Math.round(m));return Math.floor(v/60)+'h '+String(v%60).padStart(2,'0')+'m'};
 const make=(tag,value,css)=>{const el=document.createElement(tag);el.textContent=String(value);if(css)el.className=css;return el};
 function paint(){
  if(document.body.dataset.lifeosView!=='analytics')return;
  picker.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===selected)));
  let ws;try{ws=window.lifeosReadOnlyWorkspace?.()}catch{}
  if(!ws){content.replaceChildren(make('p','Activity records are currently unavailable.'));return}
  const r=evidence(ws,selected,Date.now(),7);
  content.replaceChildren();
  const tiles=document.createElement('div');tiles.className='lo209-kpis';
  const stats=[['Recorded time',clock(r.totalMinutes)],['Recorded activities',r.recordedSessions],['Days with records',r.daysWithRecords+' / 7']];
  if(selected==='quran'&&r.detailsPresent.pages)stats.push(['Pages reported',r.numeric.pages]);
  if(selected==='prayer'&&r.detailsPresent.sunnahMissed)stats.push(['Reported missed sunnah units',r.numeric.sunnahMissed]);
  for(const [label,value] of stats){const card=make('div','', 'lo209-stat');card.append(make('strong',value),make('small',label));tiles.append(card)}
  content.append(tiles);
  const chart=make('div','','lo209-week');
  const max=Math.max(1,...r.rows.map(x=>x.minutes));
  for(const day of r.rows){
   const d=make('div','','lo209-day');
   const bar=make('span','','lo209-bar');bar.style.height=(day.minutes/max*100).toFixed(1)+'%';
   const label=make('small',new Date(day.date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'}));
   d.title=day.date+' · '+clock(day.minutes);d.append(bar,label);chart.append(d);
  }
  content.append(chart);
  if(!r.items.length){content.append(make('p','No qualifying activity is recorded in this seven-day period. Missing activity records do not mean the activity was missed.','lo209-disclaimer'));return}
  const details=document.createElement('details');details.className='lo209-history';
  details.append(make('summary','Review '+r.items.length+' saved activity record(s)'));
  for(const item of r.items){
   const card=make('article','','lo209-entry');
   card.append(make('strong',item.name),make('span',clock(item.minutes)+' recorded'));
   const entries=Object.entries(item.details).filter(([key,value])=>value!==''&&value!==null).slice(0,10);
   if(entries.length){const list=document.createElement('dl');for(const [k,v] of entries){list.append(make('dt',k.replace(/([A-Z])/g,' $1')),make('dd',v))}card.append(list)}
   else card.append(make('small','No additional details entered.'));
   details.append(card);
  }
  content.append(details);
  content.append(make('p','Summaries show recorded evidence, not inferred completion or performance. Example-tagged records are excluded.','lo209-disclaimer'));
 }
 let ticket=0;const update=()=>{clearTimeout(ticket);ticket=setTimeout(paint,40)};
 document.getElementById('lifeosNavigation')?.addEventListener('click',update);
 window.addEventListener('focus',update);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
 for(const e of ['lifeos-v77-tracking-changed','lifeos-v74-records-changed','lifeos-v207-gap-committed'])window.addEventListener(e,update);
 paint();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return Object.freeze({category,evidence,sample,dayKey});
});
