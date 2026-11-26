process.env.TZ='Europe/Stockholm';
const assert=require('node:assert/strict');
global.LifeOSUnifiedAnalytics=require('../lifeos_unified_analytics.js');
global.LifeOSPersonalPlanner=require('../personal_predictive_planner.js');
const api=require('../personal_plan_concept_a.js');
const t=s=>new Date(s).getTime(),now=t('2026-11-26T16:00:00');
const tasks=api.taskGroups([
 {id:'late',name:'Late',due:'2026-11-25'},
 {id:'late-today',name:'Past deadline',due:'2026-11-26',dueTime:'12:00'},
 {id:'today',name:'Today',due:'2026-11-26'},
 {id:'future',name:'Future',due:'2026-11-27'},
 {id:'none',name:'No date'},
 {id:'done',name:'Done',done:true}
],now);
assert.deepEqual(tasks.overdue.map(x=>x.id),['late','late-today']);
assert.deepEqual(tasks.today.map(x=>x.id),['today']);assert.deepEqual(tasks.upcoming.map(x=>x.id),['future']);assert.equal(tasks.anytime[0].id,'none');assert.equal(tasks.completed[0].id,'done');
const original={name:'Gym',seriesId:'series-test',startAt:t('2026-12-01T18:00:00'),endAt:t('2026-12-01T19:00:00'),until:'2026-12-15',frequency:'weekly',reminder:true};
const generated=api.series(original,[],now);assert.equal(generated.length,3);assert.deepEqual(generated.map(x=>new Date(x.startAt).getDate()),[1,8,15]);
assert.throws(()=>api.series(original,generated,now),/already been saved/);
assert.throws(()=>api.series(original,[{id:'series-test-2026-12-01',status:'skipped'}],now),/identifier already exists/);
assert.throws(()=>api.series({...original,seriesId:'other'},generated,now),/overlaps/);
assert.throws(()=>api.series({...original,until:'2026-11-30'},[],now),/end date/);
const monthly=api.series({...original,seriesId:'monthly',startAt:t('2027-01-31T18:00:00'),endAt:t('2027-01-31T19:00:00'),until:'2027-03-31',frequency:'monthly'},[],now);assert.deepEqual(monthly.map(x=>new Date(x.startAt).getMonth()),[0,2]);
assert.throws(()=>api.series({...original,seriesId:'dst',startAt:t('2027-03-27T02:30:00'),endAt:t('2027-03-27T03:30:00'),until:'2027-03-28',frequency:'daily'},[],now),/clock change/);
const day=api.day('2026-11-24'),sessions=[{id:'paused',name:'Study',status:'finished',startAt:day+9*3600000,endAt:day+11*3600000,segments:[{start:day+9*3600000,end:day+10*3600000},{start:day+10.5*3600000,end:day+11*3600000}]},{id:'overlap',name:'Work',status:'finished',startAt:day+9.5*3600000,endAt:day+10.5*3600000,segments:[{start:day+9.5*3600000,end:day+10.5*3600000}]}];
const w={sessions,schedule:[{id:'p',name:'Study',startAt:day+12*3600000,endAt:day+13*3600000,status:'planned'}],idealRoutines:[]};
const model=api.compareModel(w,api.week(now),7,now);assert.equal(model.totals.reality,2*3600000);assert.equal(model.totals.planned,3600000);assert.equal(model.totals.ideal,null);assert.equal(model.totals.predicted,null);assert.equal(model.series.at(-1).reality,null);
const assigned=api.lanes([{start:0,end:20},{start:10,end:15},{start:20,end:30}]);assert.deepEqual(assigned.map(x=>x.lanes),[2,2,1]);assert.equal(assigned[0].end,20);
const forecastFrom=t('2026-11-23T00:00:00'),history=[];
for(let d=1;d<=28;d++){const dayStart=api.shift(forecastFrom,-d),a=dayStart+9*3600000;history.push({id:'h'+d,name:'Study',status:'finished',startAt:a,endAt:a+2*3600000,segments:[{start:a,end:a+3600000}]})}
const forecast=api.forecasts({sessions:history,schedule:[]},forecastFrom,api.shift(forecastFrom,30),now);assert.equal(forecast.available,true);assert(forecast.rows.length>=28);assert(forecast.rows.every(x=>x.durationMinutes===undefined||x.durationMinutes===60));assert(forecast.rows.every(x=>x.endAt-x.startAt===3600000),'Prediction uses active time, not pause duration');
const examples=history.map(s=>({...s,seedBatch:'sample'}));assert.equal(api.forecasts({sessions:examples},forecastFrom,api.shift(forecastFrom,7),now).available,false);
console.log('PASS: Plan groups, safe recurring series, DST, overlap lanes, raw accounting and evidence-based forecasts');
