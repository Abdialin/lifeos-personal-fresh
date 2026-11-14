'use strict';
const assert=require('node:assert/strict');
const schedule=require('./personal_schedule_improvement_v59.js');
const mock={timeline:{},intelligence:{},planner:{},predictor:{},comparison:{compare(){
 return {error:null,range:{from:1000,to:5000},reality:[{recordedMs:3600000,unloggedMs:7200000}],evidence:{observedDays:8,confidence:'insufficient'},ideals:[{name:'Reading',startAt:1600,endAt:2500}],predictions:[{needsReview:true}],summary:{planned:2}};
}}};
const state={schedule:[{id:'a',name:'Study',status:'planned',startAt:1200,endAt:2200},{id:'b',name:'Meeting',status:'planned',startAt:1700,endAt:2300}]};
const report=schedule.summarize(state,1000,mock);
assert.equal(report.error,null);
assert.equal(report.metrics.planCollisions,1);
assert.equal(report.metrics.idealOverlaps,2);
assert.equal(report.metrics.observedEvidenceDays,8);
assert.equal(report.metrics.predictionConflicts,1);
assert.ok(report.recommendations.every(r=>r.requiresApproval));
assert.ok(report.recommendations.some(r=>r.code==='tracking-evidence'));
assert.ok(report.recommendations.some(r=>r.code==='plan-conflict'));
assert.deepEqual(state.schedule.map(x=>x.id),['a','b'],'must never mutate plans');
assert.ok(schedule.summarize({},1000,{}).error);
console.log('V59 schedule recommendation checks passed');
