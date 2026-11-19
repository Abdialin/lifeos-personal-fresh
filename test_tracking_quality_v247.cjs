const assert=require('node:assert/strict');
const fs=require('node:fs');
const moduleApi=require('./personal_tracking_quality_v247.js');
const {inspect,openRisk,fmt}=moduleApi;
const H=3600000;
const at=12*H;
const sessions=[
 {id:'a',name:'Work',status:'finished',segments:[{start:1*H,end:6*H}]},
 {id:'b',name:'Study',status:'finished',segments:[{start:3*H,end:5*H}]},
 {id:'c',name:'Gym',status:'finished',segments:[{start:6*H,end:8*H}]},
 {id:'paused',name:'Quran',status:'paused',segments:[{start:8*H,end:9*H},{start:9.5*H,end:null}]},
 {id:'running',name:'Prayer',status:'running',segments:[{start:11*H,end:null}]}
];
const r=inspect(sessions,0,24*H,at);
assert.equal(r.recordedMs,11*H);
assert.equal(r.uniqueMs,9*H);
assert.equal(r.overlapMs,2*H);
assert.equal(r.unknownMs,3*H);
assert.equal(r.periodCount,5);
assert.equal(fmt(r.uniqueMs),'9h 00m');
const over=inspect([{id:'long',status:'finished',segments:[{start:0,end:13*H},{start:0,end:13*H}]}],0,24*H,24*H);
assert.equal(over.over24h,true);
assert.equal(over.recordedMs,26*H);
assert.equal(over.uniqueMs,13*H);
assert.equal(over.overlapMs,13*H);
assert.equal(inspect([],0,24*H,12*H).unknownMs,12*H);
assert.equal(moduleApi.recentDays(sessions,at,7).length,7);
assert.equal(moduleApi.recentDays(sessions,at,7)[0].recordedMs,11*H);
assert.throws(()=>moduleApi.recentDays(sessions,at,15),/1–14 days/);
const warnings=openRisk(sessions,at,{elapsed:s=>(s.id==='running'?H:0),valid:()=>null,suggestion:()=>30});
assert.equal(warnings.length,1);
assert.equal(warnings[0].id,'running');
assert.equal(inspect([],0,25*H,at).recordedMs,0,'Support 25-hour DST days');
assert.throws(()=>inspect([],0,26*H,at),/local calendar day/);
const html=fs.readFileSync('index.html','utf8'),server=fs.readFileSync('server.py','utf8');
assert.match(html,/personal_tracking_quality_v247\.js\?v=20261119-v247/);
assert.match(server,/'personal_tracking_quality_v247\.js'/);
const src=fs.readFileSync('personal_tracking_quality_v247.js','utf8');
assert.doesNotMatch(src,/atomicCommit\(|requestState\('PUT'|localStorage\.setItem\(|data\.sessions\.push/);
console.log('PASS V247 24h unique-vs-summed accounting, paused exclusion, overlap and read-only overdue review');
