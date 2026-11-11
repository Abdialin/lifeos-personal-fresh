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
return {build,approve,overlaps,historyEvidence,localDay};
});
