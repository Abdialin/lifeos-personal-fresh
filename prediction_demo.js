/* Fictional LifeOS prediction demo. In-memory only; NEVER persist or sync. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LifeOSPredictionDemo=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function generate(anchor=Date.now(),days=28){
 if(!Number.isFinite(anchor)||!Number.isInteger(days)||days<21||days>28)throw Error('Demo requires 21–28 days');
 let seed=20261112;
 function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
 const sessions=[];
 function add(day,name,hour,minute,duration){
  const start=new Date(day);start.setHours(hour,minute,0,0);
  const a=start.getTime(),end=a+duration*60000;
  if(end>anchor||a>=end)return;
  const id='DEMO-ONLY-'+sessions.length+'-'+a;
  sessions.push({id,name,status:'finished',startAt:a,endAt:end,createdAt:a,segments:[{start:a,end}],precision:'measured',source:'demo-only-not-saved'});
 }
 const boundary=new Date(anchor);boundary.setHours(0,0,0,0);
 for(let offset=days;offset>=1;offset--){
  const d=new Date(boundary);d.setDate(d.getDate()-offset);
  const weekday=d.getDay(),jitter=Math.round((random()-.5)*16);
  add(d,'Morning reading',7,Math.max(0,30+jitter),30+Math.round(random()*20));
  if(weekday>=1&&weekday<=5){
   add(d,'Focused study',9,Math.max(0,15+jitter),85+Math.round(random()*40));
   add(d,'Lunch',12,10+Math.round(random()*20),30);
  }else{
   add(d,'Weekend walk',10,10+Math.round(random()*18),45+Math.round(random()*20));
  }
  if([1,3,5].includes(weekday))add(d,'Gym workout',17,Math.max(0,20+jitter),55+Math.round(random()*20));
  if([2,4,6].includes(weekday))add(d,'Language practice',19,Math.max(0,10+jitter),45+Math.round(random()*15));
 }
 return sessions;
}
return {generate};
});
