/* Read-only weekly dashboard, local calendar days and distinct precision classes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LifeOSWeeklyDashboard=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
function build(workspace,endingDate,quality,at=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(endingDate))throw Error('Invalid date');
 const [y,m,d]=endingDate.split('-').map(Number);const last=new Date(y,m-1,d);if(last.getFullYear()!==y||last.getMonth()!==m-1||last.getDate()!==d)throw Error('Invalid date');
 const days=[];let unique=0,total=0,overlap=0,measured=0,estimated=0,unknown=0,unlogged=0,planned=0;
 for(let i=6;i>=0;i--){const a=new Date(y,m-1,d-i),b=new Date(y,m-1,d-i+1);const result=quality.compute(workspace,a.getTime(),b.getTime(),at);days.push({date:[a.getFullYear(),String(a.getMonth()+1).padStart(2,'0'),String(a.getDate()).padStart(2,'0')].join('-'),uniqueMs:result.uniqueMs,recordedMs:result.totalMs,overlapMs:result.overlapMs});unique+=result.uniqueMs;total+=result.totalMs;overlap+=result.overlapMs;measured+=result.precisionMs.measured;estimated+=result.precisionMs.estimated;unknown+=result.precisionMs.unknown;unlogged+=result.unloggedMs;planned+=result.plannedCount;}
 return {days,uniqueMs:unique,recordedMs:total,overlapMs:overlap,precisionMs:{measured,estimated,unknown},unloggedMs:unlogged,plannedCount:planned,measuredShare:total?measured/total:null};
}
return {build};
});
