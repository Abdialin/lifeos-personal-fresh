const assert=require('node:assert/strict');
const fs=require('node:fs');
const a=require('./lifeos_unified_analytics.js');
const h=3600000,start=100*h,end=108*h;
const ws={sessions:[
 {id:'a',status:'finished',startAt:start,endAt:start+3*h},
 {id:'b',status:'finished',startAt:start+h,endAt:start+4*h}
],schedule:[
 {id:'p1',startAt:start+2*h,endAt:start+5*h},
 {id:'p2',startAt:start+3*h,endAt:start+6*h}
]};
const r=a.summarize(ws,{start,end,now:end});
assert.equal(r.summedRecordedMs,6*h);
assert.equal(r.uniqueRecordedMs,4*h);
assert.equal(r.summedPlannedMs,6*h);
assert.equal(r.uniquePlannedMs,4*h);
assert.equal(r.recordedDuringPlannedMs,2*h,'Intersections must not double-count concurrent records or plans');
assert.equal(r.plannedOverlapMs,2*h);
assert.equal(a.intersectionDuration([{start:0,end:10},{start:5,end:15}],[{start:7,end:12}]),5);
assert.equal(a.intersectionDuration([],[]),0);
const visual=fs.readFileSync('personal_visual_intelligence_v4.js','utf8');
assert.match(visual,/Recorded during planned time/);
assert.match(visual,/Overlapping plans/);
console.log('Plan-versus-reality interval comparisons PASS');
