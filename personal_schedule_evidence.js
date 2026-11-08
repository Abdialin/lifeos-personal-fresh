/* LifeOS Personal: conservative schedule evidence; pure read-only helper. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSScheduleEvidence=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function assess(sessions=[],now=Date.now(),days=28){
 if(!Number.isFinite(now)||!Number.isInteger(days)||days<1||days>90)throw Error('Invalid evidence window');
 const first=now-days*86400000;const dates=new Set();let measured=0,estimated=0,unknown=0,invalid=0;
 for(const s of sessions){if(!s||s.status!=='finished')continue;
  const end=Number(s.endAt);const start=Number(s.startAt);
  if(!Number.isFinite(end)||!Number.isFinite(start)||end<=start){invalid++;continue;}
  if(end>now||end<first)continue;
  const d=new Date(end);dates.add([d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'));
  if(s.precision==='measured')measured++;else if(s.precision==='estimated'||s.precision==='approximate')estimated++;else unknown++;
 }
 const total=measured+estimated+unknown;const trackedDays=dates.size;const measuredRatio=total?measured/total:0;
 const confidence=trackedDays>=14&&measuredRatio>=0.7?'reviewable':'insufficient';
 return {trackedDays,measured,estimated,unknown,invalid,measuredRatio,confidence,windowDays:days,explanation:confidence==='reviewable'?'Enough recent measured activity for cautious review; not proof of free time.':'Insufficient recent measured tracking for evidence-backed scheduling.'};
}
return {assess};
});
