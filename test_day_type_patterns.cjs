const assert=require('node:assert/strict');
const planner=require('./personal_predictive_planner.js');
const anchor=new Date(2026,10,16,12).getTime();
const sessions=[];
for(let i=1;i<=14;i++){const d=new Date(2026,10,16-i,9);sessions.push({id:String(i),name:'Study',status:'finished',startAt:d.getTime(),endAt:d.getTime()+3600000});}
const report=planner.dayTypePatterns(sessions,anchor);
assert.equal(report.observedTrackedDays,14);
assert.equal(report.dayTypes.length,7);
assert.equal(report.dayTypes.reduce((n,d)=>n+d.observedDays,0),14);
assert.equal(report.dayTypes.every(d=>d.averageRecordedMinutes===60),true);
assert.equal(report.dayTypes.every(d=>d.confidence==='insufficient'),true,'Two samples per weekday are insufficient');
const empty=planner.dayTypePatterns([{status:'finished',endAt:anchor-1000}],anchor);
assert.equal(empty.observedTrackedDays,0);
assert.equal(empty.dayTypes.every(d=>d.averageRecordedMinutes===null),true);
assert.throws(()=>planner.dayTypePatterns([],anchor,{minimumDays:0}),/Invalid evidence window/);
console.log('Day-type pattern safety PASS');
