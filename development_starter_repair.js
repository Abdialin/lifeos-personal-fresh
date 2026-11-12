/* LifeOS development-data repair. Pure transformations; no storage, network or UI.
   Only explicitly tagged generated records can be adjusted. Existing untagged
   tracking remains byte-for-byte unchanged. All timestamps are local dates. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LifeOSStarterRepair=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const BATCH='lifeos-development-seed-v1', MIN=60000, HOUR=3600000;
const pad=v=>String(v).padStart(2,'0');
function dayKey(ts){const d=new Date(ts);return [d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-')}
function midnight(ts){const d=new Date(ts);d.setHours(0,0,0,0);return d}
function at(day,h,m){const d=new Date(day);d.setHours(h,m,0,0);return d.getTime()}
const slots={
 'Sleep':[0,10,305],
 'Fajr prayer':[5,22,12],
 'Quran memorization':[5,48,48],
 'Breakfast':[7,5,25],
 'Focused studying':[9,15,105],
 'University coursework':[14,0,75],
 'Weekend walking':[9,50,48],
 'Reading':[10,50,55],
 'Dhuhr prayer':[11,40,12],
 'Lunch':[12,45,32],
 'Asr prayer':[13,35,12],
 'Maghrib prayer':[16,0,12],
 'Gym workout':[16,35,65],
 'Isha prayer':[18,10,15],
 'Arabic language practice':[18,50,45],
 'App development':[20,25,70],
 'Security work shift':[20,10,210]
};
function intervalsOverlap(a,b){return a.startAt<b.endAt&&b.startAt<a.endAt}
function getSeedSessions(ws){return (ws.sessions||[]).filter(x=>x.seedBatch===BATCH)}
function analyze(ws){
 const ses=getSeedSessions(ws);
 const counts={taggedSessions:ses.length,taggedPlans:(ws.schedule||[]).filter(x=>x.seedBatch===BATCH).length,days:new Set(ses.map(x=>dayKey(x.startAt))).size,overlapMinutes:0};
 const arr=ses.map(x=>({startAt:x.startAt,endAt:x.endAt})).sort((a,b)=>a.startAt-b.startAt);
 let prior=-Infinity;for(const x of arr){counts.overlapMinutes+=Math.max(0,Math.min(prior,x.endAt)-x.startAt)/MIN;prior=Math.max(prior,x.endAt)}
 counts.overlapMinutes=Math.round(counts.overlapMinutes);
 return counts;
}
function durationFor(name,original){return slots[name]?.[2]||Math.max(5,Math.min(240,Math.round((original.endAt-original.startAt)/MIN)))}
function hasBatch(ws){return getSeedSessions(ws).length>0}
function idealRoutines(){
 const entries=[
  ['Fajr prayer',0,'05:22',12],['Quran memorization',0,'05:48',48],
  ['Focused studying',1,'09:15',105],['Focused studying',2,'09:15',105],['Focused studying',3,'09:15',105],['Focused studying',4,'09:15',105],['Focused studying',5,'09:15',105],
  ['Gym workout',1,'16:35',65],['Gym workout',3,'16:35',65],['Gym workout',5,'16:35',65],
  ['Weekend walking',0,'09:50',48],['Weekend walking',6,'09:50',48],
  ['Arabic language practice',2,'18:50',45],['Arabic language practice',4,'18:50',45],['Arabic language practice',6,'18:50',45],
  ['Quran memorization',1,'05:48',48],['Quran memorization',2,'05:48',48],['Quran memorization',3,'05:48',48],['Quran memorization',4,'05:48',48],['Quran memorization',5,'05:48',48],['Quran memorization',6,'05:48',48]
 ];
 return entries.map(([name,dayOfWeek,start,durationMinutes],i)=>({
  id:BATCH+'-ideal-'+i,name,dayOfWeek,start,durationMinutes,seedBatch:BATCH
 }));
}
function change(ws,anchor=Date.now()){
 if(!hasBatch(ws))throw Error('No generated starter history in this workspace');
 if(!Number.isFinite(anchor))throw Error('Invalid reference time');
 const next=JSON.parse(JSON.stringify(ws));
 const original=analyze(next);
 const scheduled=new Map((next.schedule||[]).filter(p=>p.seedBatch===BATCH).map(x=>[x.id,x]));
 const events=new Map((next.events||[]).map(x=>[x.sessionId,(next.events||[]).filter(e=>e.sessionId===x.sessionId)]));
 let adjusted=0,skipped=0;
 // Adjust older generated sessions to coherent local-time blocks. Each
 // original ID is kept, maintaining plan, events and workout references.
 for(const s of getSeedSessions(next)){
  if(dayKey(s.startAt)===dayKey(anchor))continue;
  const slot=slots[s.name];if(!slot)continue;
  const day=midnight(s.startAt),start=at(day,slot[0],slot[1]);
  const end=start+durationFor(s.name,s)*MIN;
  if(start===s.startAt&&end===s.endAt)continue;
  s.startAt=start;s.endAt=end;s.segments=[{start,end}];
  s.notes=(s.notes||'')+' · Starter time normalized for visualization';
  const p=scheduled.get(s.plannedId);
  if(p){p.startAt=start-10*MIN;p.endAt=end+10*MIN;}
  for(const e of events.get(s.id)||[]){if(e.type==='START')e.time=start;if(e.type==='FINISH')e.time=end;}
  adjusted++;
 }
 // Prevent overlaps among generated activities. Work and study may have
 // competing synthetic entries; conflicts are handled by shortening/removing
 // only the generated session, never by touching real sessions.
 const generated=getSeedSessions(next).sort((a,b)=>a.startAt-b.startAt);
 const toDelete=new Set();
 let previousByDay=new Map();
 for(const s of generated){
  const key=dayKey(s.startAt),prev=previousByDay.get(key);
  if(prev&&s.startAt<prev.endAt){
   const delta=prev.endAt-s.startAt;
   if(s.endAt-prev.endAt<5*MIN){toDelete.add(s.id);skipped++;continue}
   s.startAt=prev.endAt;s.segments=[{start:s.startAt,end:s.endAt}];
   const p=scheduled.get(s.plannedId);if(p){p.startAt=s.startAt-5*MIN;p.endAt=s.endAt+5*MIN;}
   for(const e of events.get(s.id)||[]){if(e.type==='START')e.time=s.startAt;}
   adjusted++;
  }
  previousByDay.set(key,s);
 }
 if(toDelete.size){
  next.sessions=next.sessions.filter(s=>!toDelete.has(s.id));
  next.events=next.events.filter(e=>!toDelete.has(e.sessionId));
  next.workouts=(next.workouts||[]).filter(w=>!toDelete.has(w.sessionId));
  next.schedule=(next.schedule||[]).filter(p=>!toDelete.has(p.sessionId));
 }
 // Fill today with earlier completed activity blocks, avoiding both real
 // and generated sessions. Never insert future timestamps.
 const today=midnight(anchor), weekday=today.getDay();
 const names=['Sleep','Fajr prayer','Quran memorization','Breakfast',weekday===0||weekday===6?'Weekend walking':'Focused studying',
 'Dhuhr prayer','Lunch','Asr prayer',...(weekday>=1&&weekday<=5?['University coursework']:[]),
 'Maghrib prayer',...([1,3,5].includes(weekday)?['Gym workout']:[]),'Isha prayer',...([2,4,6].includes(weekday)?['Arabic language practice']:[])];
 let added=0;
 for(const name of names){
  const slot=slots[name];if(!slot)continue;
  const startAt=at(today,slot[0],slot[1]),endAt=startAt+slot[2]*MIN;
  if(endAt>=anchor-5*MIN)continue;
  const candidate={startAt,endAt};
  if(next.sessions.some(s=>s.status!=='finished'&&s.startAt<endAt&&s.endAt==null))continue;
  if(next.sessions.some(s=>s.status==='finished'&&intervalsOverlap(candidate,s)))continue;
  const id=BATCH+'-today-'+dayKey(anchor)+'-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  if(next.sessions.some(s=>s.id===id))continue;
  next.sessions.push({id,name,status:'finished',createdAt:startAt,startAt,endAt,segments:[{start:startAt,end:endAt}],
   notes:'Synthetic development record; not verified attendance',precision:'retrospective-approximate',source:'development-starter',
   seedBatch:BATCH});
  next.events.push({id:id+'-start',sessionId:id,type:'START',time:startAt,seedBatch:BATCH},{id:id+'-finish',sessionId:id,type:'FINISH',time:endAt,seedBatch:BATCH});
  added++;
 }
 const existingIds=new Set((next.idealRoutines||[]).map(x=>x.id));
 let addedIdeal=0;
 next.idealRoutines=next.idealRoutines||[];
 for(const p of idealRoutines())if(!existingIds.has(p.id)){next.idealRoutines.push(p);addedIdeal++}
 const after=analyze(next);
 return {workspace:next,report:{addedToday:added,adjustedHistorical:adjusted,removedOverlapping:skipped,addedIdeal,before:original,after}};
}
return {BATCH,hasBatch,analyze,change,idealRoutines};
});