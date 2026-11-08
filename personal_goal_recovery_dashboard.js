/* Read-only goal/recovery snapshot; no changes to user data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LifeOSGoalRecoveryDashboard=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
function summarize(goals,progress,logs,start,end){
 if(!Array.isArray(goals)||!Array.isArray(logs)||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||typeof progress!=='function')throw Error('Invalid dashboard inputs');
 const goalRows=goals.map(g=>{const target=Number(g.target);const achieved=Number(progress(g,start,end));const valid=Number.isFinite(target)&&target>0&&Number.isFinite(achieved)&&achieved>=0;return {id:g.id,name:g.name,unit:g.unit||'',target:valid?target:null,achieved:valid?achieved:null,percent:valid?Math.round(100*achieved/target):null};});
 const sleep=logs.filter(x=>x&&x.category==='Sleep'&&typeof x.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&(()=>{const t=new Date(x.date+'T12:00:00').getTime();return t>=start&&t<end;})());
 const valid=sleep.filter(x=>Number.isFinite(x.minutes)&&x.minutes>=0&&['measured','estimated'].includes(x.precision));
 const measured=valid.filter(x=>x.precision==='measured');const estimated=valid.filter(x=>x.precision==='estimated');
 const avg=arr=>arr.length?Math.round(arr.reduce((s,x)=>s+x.minutes,0)/arr.length):null;
 return {goals:goalRows,goalsMet:goalRows.filter(g=>g.percent!==null&&g.percent>=100).length,goalsEvaluable:goalRows.filter(g=>g.percent!==null).length,sleep:{totalLogs:sleep.length,measuredCount:measured.length,measuredAverageMinutes:avg(measured),estimatedCount:estimated.length,estimatedAverageMinutes:avg(estimated),unknownCount:sleep.length-valid.length},note:'Sleep log averages are not recovery scores. Missing logs do not mean zero sleep. Goal progress may contain provisional activity data.'};
}
return {summarize};
});
