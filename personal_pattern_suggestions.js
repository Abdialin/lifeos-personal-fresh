/* Explainable, read-only historical activity suggestions. No calendar writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSPatternSuggestions=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function suggest(sessions,{now=Date.now(),lookbackDays=28,minDays=7,minSamples=3}={}){
 if(!Number.isFinite(now)||!Number.isInteger(lookbackDays)||lookbackDays<1||lookbackDays>90)throw Error('Invalid window');
 const start=now-lookbackDays*86400000,days=new Set(),groups=new Map();
 for(const s of sessions||[]){if(!s||s.status!=='finished'||!Number.isFinite(s.startAt)||!Number.isFinite(s.endAt)||s.endAt<=s.startAt||s.endAt>now||s.endAt<=start)continue;
  const d=new Date(s.startAt),day=`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;days.add(day);
  const category=String(s.category||s.name||s.label||'Activity').trim().slice(0,80),weekday=d.getDay(),slot=Math.floor((d.getHours()*60+d.getMinutes())/60),key=JSON.stringify([category,weekday,slot]);
  const v=groups.get(key)||{category,weekday,hour:slot,days:new Set(),durations:[]};v.days.add(day);v.durations.push(Math.round((s.endAt-s.startAt)/60000));groups.set(key,v);
 }
 const sufficient=days.size>=minDays;
 const suggestions=[...groups.values()].filter(g=>g.days.size>=minSamples).map(g=>({category:g.category,weekday:g.weekday,hour:g.hour,sampleDays:g.days.size,typicalDurationMinutes:Math.round(g.durations.sort((a,b)=>a-b)[Math.floor(g.durations.length/2)]),confidence:sufficient?'reviewable':'insufficient',requiresApproval:true,source:'historical-pattern',status:'observation-only'})).sort((a,b)=>b.sampleDays-a.sampleDays||a.category.localeCompare(b.category));
 return {trackedDays:days.size,lookbackDays,evidence:sufficient?'reviewable':'insufficient',suggestions,limitations:['Observational pattern, not proof of optimal timing','Missing logs do not indicate free time','Daylight-saving transitions and overlapping sessions require manual review','No automatic scheduling or calendar changes']};
}
return {suggest};
});
