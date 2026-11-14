'use strict';
const assert=require('node:assert/strict');
const engine=require('./personal_activity_timeline_v54.js');
const intel=require('./personal_activity_intelligence_v55.js');
const date='2026-11-14',start=new Date(date+'T00:00:00').getTime(),h=3600000;
const state={sessions:[
{id:'a',name:'Study',status:'finished',segments:[{start:start+8*h,end:start+10*h}]},
{id:'b',name:'Reading',status:'finished',segments:[{start:start+9*h,end:start+11*h}]},
{id:'sample',name:'Unverified',status:'finished',source:'development-starter',segments:[{start:start+11*h,end:start+13*h}]}
],schedule:[{id:'one',name:'Gym plan',startAt:start+9*h,endAt:start+12*h,status:'planned'}]};
const result=intel.inspect(state,date,start+14*h,engine);
assert.equal(result.actualMs,3*h,'parallel sessions count once');
assert.equal(result.plannedMs,3*h);
assert.equal(result.overlapMs,2*h,'clock intersection, not confirmed task completion');
assert.equal(result.unplannedActualMs,h);
assert.equal(result.sampleCount,1);
assert.equal(result.planTimeCoveragePct,67);
assert.equal(result.coveragePct,21);
assert.equal(intel.trend(state,date,start+14*h,engine).length,7);
const future=intel.inspect({},'2026-11-15',start+14*h,engine);
assert.equal(future.actualMs,0);
assert.equal(future.coveragePct,null);
assert.equal(future.isFuture,true);
console.log('V55 activity intelligence checks passed');
