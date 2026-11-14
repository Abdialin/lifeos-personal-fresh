'use strict';
const assert=require('node:assert/strict');
const planner=require('./personal_predictive_planner.js');
const preview=require('./personal_predictive_preview_v56.js');
const anchor=new Date('2026-11-14T12:00:00').getTime();
const base=new Date('2026-10-17T00:00:00');
const completed=[];
for(let i=0;i<28;i++){const date=new Date(base);date.setDate(base.getDate()+i);date.setHours(9,0,0,0);const start=date.getTime();completed.push({id:'s'+i,name:'Study',status:'finished',startAt:start,endAt:start+3600000,segments:[{start,end:start+3600000}]})}
const report=preview.build({sessions:[...completed,{id:'demo',name:'Study',source:'development-starter',status:'finished',startAt:completed[0].startAt,endAt:completed[0].endAt,segments:completed[0].segments}]},anchor,planner);
assert.equal(report.excludedRecords,1);assert.equal(report.confidence,'reviewable');assert.ok(report.suggestions.length>0);
assert.ok(report.suggestions.every(p=>p.requiresApproval&&p.startAt>=report.range.from&&p.startAt<report.range.to));
assert.equal(preview.credible({status:'finished',startAt:0,endAt:1000,segments:[{start:0,end:1000}],seedBatch:true}),false);
assert.equal(preview.build({sessions:[]},anchor,planner).suggestions.length,0);
assert.equal(preview.build({},anchor,null).error,'Predictive planner is unavailable');
console.log('V56 predictive preview checks passed');
