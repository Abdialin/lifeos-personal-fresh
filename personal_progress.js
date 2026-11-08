/* LifeOS Personal: conservative progress summaries from optional manual logs.
   These are counts of logs, never additional tracked time. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSPersonalProgress=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function summarize(logs,from,to){
 const inRange=(Array.isArray(logs)?logs:[]).filter(x=>x&&typeof x.date==='string'&&x.date>=from&&x.date<=to);
 const q=inRange.filter(x=>x.category==='Quran');
 const classify=x=>String(x.unit||'').toLowerCase().trim();
 const sum=(arr)=>arr.reduce((a,x)=>a+(Number.isFinite(x.quantity)&&x.quantity>=0?x.quantity:0),0);
 const newPages=q.filter(x=>['new pages','memorized pages'].includes(classify(x)));
 const revision=q.filter(x=>['revision pages','reviewed pages'].includes(classify(x)));
 const uncategorized=q.filter(x=>!['new pages','memorized pages','revision pages','reviewed pages'].includes(classify(x)));
 const sleep=inRange.filter(x=>x.category==='Sleep');
 const measuredSleep=sleep.filter(x=>Number.isFinite(x.minutes)&&x.minutes>=0&&x.precision==='measured');
 const estimatedSleep=sleep.filter(x=>Number.isFinite(x.minutes)&&x.minutes>=0&&x.precision==='estimated');
 const average=arr=>arr.length?Math.round(arr.reduce((a,x)=>a+x.minutes,0)/arr.length):null;
 return {quran:{newPages:sum(newPages),revisionPages:sum(revision),uncategorizedLogs:uncategorized.length,days:new Set(q.map(x=>x.date)).size},sleep:{logs:sleep.length,measuredCount:measuredSleep.length,measuredAverageMinutes:average(measuredSleep),estimatedCount:estimatedSleep.length,estimatedAverageMinutes:average(estimatedSleep)},note:'Manual personal logs are not added to timer totals; unknown durations are excluded from averages.'};
}
return{summarize};
});
