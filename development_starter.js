/* LifeOS Development Starter — mock but persistent workspace records.
 * Explicit opt-in only; pure generator, does not access storage/network.
 * These are NOT authenticated work, academic or prayer attendance records.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LifeOSDevelopmentStarter=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const BATCH='lifeos-development-seed-v1', HOUR=3600000,MIN=60000;
const localDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
function dateOffset(anchor,offset){const d=new Date(anchor);d.setHours(0,0,0,0);d.setDate(d.getDate()+offset);return d}
function at(day,h,m=0){const d=new Date(day);d.setHours(h,m,0,0);return d.getTime()}
function validDate(x){return x instanceof Date&&Number.isFinite(x.getTime())}
function generate(anchor=new Date()){
 if(!validDate(anchor))throw Error('Invalid seed reference date');
 const sessions=[],events=[],todos=[],schedule=[],workouts=[],meals=[],goals=[],personalLogs=[];
 let counter=0;const nextId=type=>BATCH+'-'+type+'-'+(++counter);
 // Times are illustrative templates, not verified timesheets, prayer times or attendance.
 function past(day,name,h,m,duration,tag='General'){
  const start=at(day,h,m),end=start+duration*MIN;
  if(end>=anchor.getTime())return;
  const id=nextId('activity');
  sessions.push({id,name,status:'finished',createdAt:start,startAt:start,endAt:end,segments:[{start,end}],notes:'Synthetic development starter · not verified actual attendance',precision:'retrospective-approximate',source:'development-starter',seedBatch:BATCH,category:tag});
  events.push({id:nextId('event'),sessionId:id,type:'START',time:start,seedBatch:BATCH},{id:nextId('event'),sessionId:id,type:'FINISH',time:end,seedBatch:BATCH});
  // Link a subset of completed tracked activities to historical plans.
  // This exercises the normal Plan → actual comparison without inventing
  // independent attendance evidence.
  if(['Study','Fitness','Work','Quran'].includes(tag)){
   const scheduledStart=start-10*MIN,scheduledEnd=end+10*MIN,planId=nextId('plan');
   schedule.push({id:planId,name,startAt:scheduledStart,endAt:scheduledEnd,
    notes:'Historical planned-vs-tracked sample; generated, not independently verified.',
    status:'started',reminder:false,createdAt:scheduledStart-24*HOUR,
    sessionId:id,seedBatch:BATCH});
   sessions[sessions.length-1].plannedId=planId;
  }
  return id;
 }
 function planned(day,name,h,m,duration,notes='Illustrative plan — review against actual commitments'){
  const startAt=at(day,h,m),endAt=startAt+duration*MIN;
  if(endAt<=anchor.getTime())return;
  schedule.push({id:nextId('plan'),name,startAt,endAt,notes,status:'planned',reminder:false,createdAt:anchor.getTime(),sessionId:null,seedBatch:BATCH});
 }
 function workout(day,type,minutes,sessionId){
  workouts.push({id:nextId('workout'),date:localDate(day),type,minutes,details:'Development starter workout — sample data',sessionId:sessionId||null,seedBatch:BATCH});
 }
 function meal(day,name,calories,proteinGrams){
  meals.push({id:nextId('meal'),date:localDate(day),name,calories,proteinGrams,seedBatch:BATCH});
 }
 function log(day,category,minutes,quantity=null,unit=null){
  personalLogs.push({id:nextId('routine'),date:localDate(day),category,minutes,precision:'estimated',quantity,unit,seedBatch:BATCH,notes:'Synthetic development starter'});
 }
 // 28 days ensure >=14 distinct tracked dates AND 3-4 examples per weekday.
 // All entries end strictly before the requested anchor time.
 for(let offset=-28;offset<0;offset++){
  const day=dateOffset(anchor,offset),weekday=day.getDay(),variation=(Math.abs(offset)*7)%13-6;
  past(day,'Sleep',0,10,390+(Math.abs(offset)%5)*15,'Recovery');
  past(day,'Fajr prayer',5,22+variation,12,'Prayer');
  past(day,'Quran memorization',6,0+Math.max(0,variation),48,'Quran');
  past(day,'Breakfast',7,5,25,'Nutrition');
  if(weekday>=1&&weekday<=5){
   past(day,'Focused studying',9,15+variation,105+(Math.abs(offset)%4)*12,'Study');
   past(day,'University coursework',13,15,75,'Study');
  }else{
   past(day,'Weekend walking',9,50+variation,48,'Fitness');
   past(day,'Reading',12,0,55,'Reading');
  }
  past(day,'Dhuhr prayer',12,3,12,'Prayer');
  past(day,'Lunch',12,45,32,'Nutrition');
  past(day,'Asr prayer',13,35,12,'Prayer');
  past(day,'Maghrib prayer',16,0,12,'Prayer');
  past(day,'Isha prayer',18,10,15,'Prayer');
  if([1,3,5].includes(weekday)){
   const gym=past(day,'Gym workout',17,5+variation,58+(Math.abs(offset)%3)*8,'Fitness');
   if(gym)workout(day,'Gym',65,gym);
  }
  if([2,4,6].includes(weekday))past(day,'Arabic language practice',19,28+variation,45,'Learning');
  if(weekday===2||weekday===4)past(day,'App development',20,15,70,'Business');
  if(weekday===5||weekday===6)past(day,'Security work shift',20,10,210,'Work');
  log(day,'Quran',48,1,'pages');
  if(Math.abs(offset)%2===0)meal(day,'Lunch (sample)',620+(Math.abs(offset)%5)*35,25+(Math.abs(offset)%3)*5);
 }
 // Two weeks of upcoming commitments. Prayer entries below are illustrative,
 // using approximate November daytime offsets, not authoritative religious times.
 for(let offset=0;offset<14;offset++){
  const day=dateOffset(anchor,offset),w=day.getDay(),n=day.getDate();
  planned(day,'Fajr prayer',5,30,15);
  planned(day,'Quran memorization',6,5,60);
  planned(day,'Dhuhr prayer',11,40,15);
  planned(day,'Asr prayer',13,5,15);
  planned(day,'Maghrib prayer',15,20,15);
  planned(day,'Isha prayer',17,45,20);
  if(w>=1&&w<=5)planned(day,'Focused studying',9,0,100);
  if([1,3,5].includes(w))planned(day,'Gym workout',17,15,70);
  if([2,4,6].includes(w))planned(day,'Arabic language practice',19,30,50);
 }
 // Semester/project events from the uploaded MDU schedule (illustrative copies).
 const classes=[
  [2026,10,17,13,15,105,'Technical Project Development · University'],
  [2026,10,20,9,15,165,'Project Work and Supervision · University'],
  [2026,10,24,13,15,105,'Evaluation and Validation · University'],
  [2026,10,27,9,15,165,'Project Work and Supervision · University'],
  [2026,11,1,13,15,105,'Progress Review and Interim Feedback · University']
 ];
 for(const [y,month,d,h,m,duration,name] of classes){const date=new Date(y,month,d);if(date.getTime()>=dateOffset(anchor,0).getTime()&&date.getTime()<dateOffset(anchor,14).getTime())planned(date,name,h,m,duration,'Based on provided course schedule screenshot; confirm current timetable');}
 // Reference work calendar displays evening/overnight shifts. These remain
 // TEST plans; the precise roster must be checked before real use.
 const shifts=[[13,18,20,550],[14,18,20,550],[15,18,20,550],[23,16,0,450],[24,16,0,450],[25,16,0,450]];
 for(const [d,h,m,duration] of shifts){const date=new Date(2026,10,d);if(date>=dateOffset(anchor,0)&&date<dateOffset(anchor,14))planned(date,'Security shift · verify roster',h,m,duration,'Sample work plan based on uploaded calendar. Overnight shift may finish next day; not verified.');}
 const tasks=[
  ['Review upcoming work shifts','Work','high',1],
  ['Confirm university seminar and coursework','Study','high',2],
  ['Review weekly LifeOS plan','Planning','normal',1],
  ['Complete assignment preparation','Study','high',3],
  ['Review Quran memorization','Quran','normal',1],
  ['Prepare gym session','Fitness','normal',2],
  ['Check next prayer timetable','Personal','normal',1],
  ['Test predictive schedule review','LifeOS','high',1],
  ['Compare planned vs actual activity charts','LifeOS','normal',4],
  ['Review to-do progress','Planning','normal',5]
 ];
 for(const [name,category,priority,days] of tasks){
  todos.push({id:nextId('todo'),name,category,priority,due:localDate(dateOffset(anchor,days)),done:false,createdAt:anchor.getTime(),completedAt:null,seedBatch:BATCH});
 }
 // Completed tasks demonstrate history and completion statistics as well as open work.
 for(let week=-3;week<0;week++){
  const day=dateOffset(anchor,week*7+1),completedAt=at(day,16,20);
  for(const [name,category] of [['Review weekly priorities','Planning'],['Study course material','Study'],['Review Quran pages','Quran']]){
   const createdAt=at(dateOffset(anchor,week*7),8,0);
   todos.push({id:nextId('todo'),name,category,priority:'normal',due:localDate(day),
    done:true,createdAt,completedAt,seedBatch:BATCH});
  }
 }
 goals.push(
  {id:nextId('goal'),name:'Study 8 hours weekly',category:'sessions',match:'studying',unit:'hours',target:8,seedBatch:BATCH},
  {id:nextId('goal'),name:'Gym three times weekly',category:'fitness',match:'',unit:'sessions',target:3,seedBatch:BATCH},
  {id:nextId('goal'),name:'Quran pages each week',category:'personal',match:'Quran',unit:'quantity',target:7,quantityUnit:'pages',seedBatch:BATCH}
 );
 return {batch:BATCH,sessions,events,todos,schedule,workouts,meals,goals,personalLogs};
}
const keys=['sessions','events','todos','schedule','workouts','meals','goals','personalLogs'];
function summary(seed){return Object.fromEntries(keys.map(k=>[k,(seed[k]||[]).length]))}
function hasBatch(workspace){return keys.some(k=>(workspace[k]||[]).some(x=>x.seedBatch===BATCH))}
function merge(workspace,seed){
 if(!workspace||workspace.version!==1||hasBatch(workspace))throw Error('Starter records already exist or workspace invalid');
 const result=JSON.parse(JSON.stringify(workspace));
 for(const k of keys)result[k]=[...(result[k]||[]),...(seed[k]||[])];
 return result;
}
function remove(workspace){
 const result=JSON.parse(JSON.stringify(workspace));
 const ids=new Set((result.sessions||[]).filter(s=>s.seedBatch===BATCH).map(s=>s.id));
 for(const k of keys)result[k]=(result[k]||[]).filter(x=>x.seedBatch!==BATCH&&(k!=='events'||!ids.has(x.sessionId)));
 return result;
}
return {BATCH,generate,summary,hasBatch,merge,remove};
});