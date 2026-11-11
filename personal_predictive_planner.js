/* LifeOS Personal: conservative, approval-only routine projection. No calendar writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSPersonalPlanner=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DAY=86400000;
function finite(n){return Number.isFinite(n)}
function overlaps(a,b){return a.startAt<b.endAt&&b.startAt<a.endAt}
function localDay(t){const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function validInterval(x){return x&&finite(x.startAt)&&finite(x.endAt)&&x.endAt>x.startAt}
function historyEvidence(sessions,anchor,minimumDays=14,lookbackDays=28){
 if(!finite(anchor)||!Number.isInteger(minimumDays)||minimumDays<1||minimumDays>365||!Number.isInteger(lookbackDays)||lookbackDays<1||lookbackDays>365)throw Error('Invalid evidence window');
 // Use local calendar-day boundaries, not a fixed millisecond offset: DST days can be 23 or 25 hours.
 const boundary=new Date(anchor);boundary.setHours(0,0,0,0);boundary.setDate(boundary.getDate()-lookbackDays);
 const start=boundary.getTime(),days=new Set();let records=0;
 for(const s of sessions||[]){
  if(!s||s.status!=='finished')continue;
  const end=Number(s.endAt??s.end??s.endedAt),begin=Number(s.startAt??s.start??s.startedAt);
  if(!finite(begin)||!finite(end)||end<=begin||end>anchor||end<start)continue;
  records++;days.add(localDay(end));
 }
 return {observedTrackedDays:days.size,historyRecords:records,lookbackDays,confidence:days.size>=minimumDays?'reviewable':'insufficient'};
}
function dayTypePatterns(sessions,anchor,{minimumDays=14,lookbackDays=28}={}){
 const evidence=historyEvidence(sessions,anchor,minimumDays,lookbackDays);
 const boundary=new Date(anchor);boundary.setHours(0,0,0,0);boundary.setDate(boundary.getDate()-lookbackDays);
 const buckets=Array.from({length:7},(_,dayOfWeek)=>({dayOfWeek,trackedDays:new Set(),minutes:0,activities:new Map()}));
 for(const s of sessions||[]){
  if(!s||s.status!=='finished')continue;
  const start=Number(s.startAt??s.start??s.startedAt),end=Number(s.endAt??s.end??s.endedAt);
  if(!finite(start)||!finite(end)||end<=start||end>anchor||end<boundary.getTime())continue;
  const d=new Date(end),b=buckets[d.getDay()],key=localDay(end),duration=Math.min((end-start)/60000,1440);
  b.trackedDays.add(key);b.minutes+=duration;
  const name=String(s.name||s.activity||'Activity').slice(0,80);
  b.activities.set(name,(b.activities.get(name)||0)+duration);
 }
 return {...evidence,dayTypes:buckets.map(b=>({dayOfWeek:b.dayOfWeek,observedDays:b.trackedDays.size,averageRecordedMinutes:b.trackedDays.size?Math.round(b.minutes/b.trackedDays.size):null,topActivities:[...b.activities].sort((a,c)=>c[1]-a[1]).slice(0,3).map(([name,minutes])=>({name,recordedMinutes:Math.round(minutes)})),confidence:evidence.confidence==='reviewable'&&b.trackedDays.size>=3?'pattern-observed':'insufficient'})),limitations:['Descriptive records only; no inferred availability','Overlapping activity durations may double-count','Averages cover tracked days only, not all calendar days','No automated schedule writes']};
}
function historicalSuggestions({sessions=[],schedule=[],from,to,minimumDays=14,lookbackDays=28}={}){
 if(!finite(from)||!finite(to)||to<=from||to-from>14*DAY)throw Error('Select a window of up to 14 days');
 const evidence=historyEvidence(sessions,from,minimumDays,lookbackDays);
 if(evidence.confidence!=='reviewable')return {...evidence,suggestions:[],limitations:['Insufficient completed tracking history','No inferred availability','Review required before scheduling']};
 const cutoff=new Date(from);cutoff.setHours(0,0,0,0);cutoff.setDate(cutoff.getDate()-lookbackDays);
 const groups=new Map();
 for(const s of sessions||[]){
  if(!s||s.status!=='finished')continue;
  const a=Number(s.startAt??s.start??s.startedAt),b=Number(s.endAt??s.end??s.endedAt);
  if(!finite(a)||!finite(b)||b<=a||b>from||b<cutoff.getTime()||b-a>6*3600000)continue;
  const date=new Date(a),name=String(s.name||s.activity||'').trim().slice(0,80);
  if(!name||date.getDate()!==new Date(b).getDate()||date.getMonth()!==new Date(b).getMonth())continue;
  const key=date.getDay()+'|'+name.toLocaleLowerCase(),day=localDay(a);
  const record=groups.get(key)||{name,weekday:date.getDay(),days:new Map()};
  // Count a given activity at most once per historical day to avoid inflated evidence.
  const duration=Math.round((b-a)/60000),startMinute=date.getHours()*60+date.getMinutes();
  if(!record.days.has(day)||duration>record.days.get(day).duration)record.days.set(day,{startMinute,duration});
  groups.set(key,record);
 }
 const templates=[...groups.values()].filter(g=>g.days.size>=3).map(g=>{
  const xs=[...g.days.values()],median=values=>{const a=values.sort((x,y)=>x-y);return a[Math.floor(a.length/2)]};
  return {name:g.name,weekday:g.weekday,observations:g.days.size,startMinute:median(xs.map(x=>x.startMinute)),durationMinutes:median(xs.map(x=>x.duration))};
 }).filter(g=>g.durationMinutes>=5);
 const suggestions=[];
 let day=new Date(from);day.setHours(0,0,0,0);
 for(;day.getTime()<to;day.setDate(day.getDate()+1)){
  for(const pattern of templates){
   if(day.getDay()!==pattern.weekday)continue;
   const at=new Date(day);at.setHours(Math.floor(pattern.startMinute/60),pattern.startMinute%60,0,0);
   const startAt=at.getTime(),endAt=startAt+pattern.durationMinutes*60000;
   if(startAt<from||startAt>=to||endAt>to)continue;
   const candidate={startAt,endAt};
   const conflicts=(schedule||[]).filter(p=>p&&p.status!=='skipped'&&validInterval(p)&&overlaps(candidate,p)).map(p=>String(p.id));
   const actualConflicts=(sessions||[]).filter(s=>s&&s.status!=='discarded'&&finite(s.startAt)&&finite(s.endAt)&&s.endAt>s.startAt&&overlaps(candidate,s)).map(s=>String(s.id));
   suggestions.push({id:'pattern:'+pattern.weekday+':'+pattern.name.toLocaleLowerCase()+'@'+startAt,name:pattern.name,startAt,endAt,observations:pattern.observations,conflicts,actualConflicts,confidence:'pattern-observed',requiresApproval:true,source:'historical-pattern',status:'proposed'});
  }
 }
 return {...evidence,suggestions:suggestions.sort((a,b)=>a.startAt-b.startAt),limitations:['Heuristic repeat-pattern suggestion, not a validated forecast','At least three distinct historical days for the same weekday and activity','Unlogged time is unknown, not available','No schedule or external calendar writes','Conflicts require explicit review']};
}
function build({routines=[],schedule=[],sessions=[],from,to,minimumDays=14,lookbackDays=28}={}){
 if(!finite(from)||!finite(to)||to<=from||to-from>14*DAY)throw Error('Select a window of up to 14 days');
 const evidence=historyEvidence(sessions,from,minimumDays,lookbackDays),proposals=[];
 for(const r of routines||[]){if(!r||!Number.isInteger(r.dayOfWeek)||r.dayOfWeek<0||r.dayOfWeek>6||!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.start)||!Number.isInteger(r.durationMinutes)||r.durationMinutes<5||r.durationMinutes>1440)continue;
  let day=new Date(from);day.setHours(0,0,0,0);
  for(;day.getTime()<to;day.setDate(day.getDate()+1)){
   if(day.getDay()!==r.dayOfWeek)continue;
   const [h,m]=r.start.split(':').map(Number),at=new Date(day);at.setHours(h,m,0,0);
   const startAt=at.getTime(),endAt=startAt+r.durationMinutes*60000;
   if(startAt<from||startAt>=to)continue;
   const candidate={startAt,endAt};
   const conflicts=(schedule||[]).filter(p=>p&&p.status!=='skipped'&&validInterval(p)&&overlaps(candidate,p)).map(p=>String(p.id));
   const actualConflicts=(sessions||[]).filter(s=>s&&s.status!=='discarded'&&finite(s.startAt)&&finite(s.endAt)&&s.endAt>s.startAt&&overlaps(candidate,s)).map(s=>String(s.id));
   proposals.push({id:String(r.id)+'@'+startAt,name:String(r.name||'Routine'),startAt,endAt,conflicts,actualConflicts,confidence:evidence.confidence,requiresApproval:true,source:'ideal-routine',status:'proposed'});
  }
 }
 return {...evidence,proposals,limitations:['Rule-based routine projection, not a learned forecast','Only completed records in the preceding evidence window count','No inferred free time','Missing logs are not evidence of availability','Plan and actual-session conflicts require review','No automatic schedule writes']};
}
function approve(proposal,existing,id,createdAt){
 if(!proposal||proposal.requiresApproval!==true||proposal.conflicts?.length||proposal.actualConflicts?.length||!id||!validInterval(proposal))throw Error('Proposal requires review or has conflicts');
 if((existing||[]).some(p=>p.idealProposalId===proposal.id||p.id===id||(p.status!=='skipped'&&validInterval(p)&&overlaps(proposal,p))))throw Error('Already approved or overlapping schedule');
 return {id,name:proposal.name,startAt:proposal.startAt,endAt:proposal.endAt,status:'planned',notes:'User-approved LifeOS proposal; no external calendar write',reminder:false,createdAt,idealProposalId:proposal.id};
}
return {build,approve,overlaps,historyEvidence,dayTypePatterns,historicalSuggestions,localDay};
});
