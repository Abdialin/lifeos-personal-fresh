'use strict';
const assert=require('node:assert/strict');
const {buildDay,dayBounds,provenance}=require('./personal_unified_activity_v53.js');
const date='2026-11-14',a=new Date(date+'T00:00:00').getTime(),hr=3600000;
assert.ok(dayBounds(date));assert.equal(dayBounds('2026-02-30'),null);
const data={sessions:[
 {id:'s1',name:'Gym',status:'finished',segments:[{start:a+9*hr,end:a+10*hr}]},
 {id:'s2',name:'Reading',status:'running',segments:[{start:a+11*hr,end:null}],source:'historical-import'},
 {id:'s3',name:'Example',status:'finished',segments:[{start:a+14*hr,end:a+15*hr}],source:'development-starter'}
],schedule:[
 {id:'p1',name:'Gym appointment',status:'started',sessionId:'s1',startAt:a+9*hr,endAt:a+10*hr},
 {id:'p2',name:'Study plan',status:'planned',startAt:a+16*hr,endAt:a+17*hr}
]};
const out=buildDay(data,date,a+12*hr);
assert.equal(out.rows.length,4,'linked plan must not duplicate the gym session');
assert.equal(out.counts.planned,1);assert.equal(out.counts.completed,2);assert.equal(out.counts.running,1);
assert.equal(out.counts.historical,1);assert.equal(out.counts.sample,1);
assert.equal(out.rows.find(r=>r.key==='session:s1').linkedPlan,'Gym appointment');
assert.equal(provenance({precision:'retrospective-approximate'}).kind,'historical');
assert.equal(buildDay({schedule:[{id:'future',startAt:a+hr,endAt:a+2*hr,status:'planned'}]},date,a+3*hr).counts.completed,0);
console.log('V53 unified activity model tests passed');
