const assert=require('node:assert/strict');const q=require('./personal_analytics_quality.js');
const a=new Date(2026,10,8).getTime(),b=new Date(2026,10,9).getTime(),M=60000;
const s={sessions:[{name:'Study',precision:'measured',segments:[{start:a+60*M,end:a+180*M}]},{name:'Reading',precision:'estimated',segments:[{start:a+120*M,end:a+240*M}]}],schedule:[]};
let x=q.compute(s,a,b,a+300*M);assert.equal(x.totalMs,240*M);assert.equal(x.uniqueMs,180*M);assert.equal(x.overlapMs,60*M);assert.equal(x.unloggedGaps.length,2);assert.equal(x.unloggedMs,120*M);assert.equal(x.precisionMs.measured,120*M);assert.equal(x.precisionMs.estimated,120*M);assert.equal(x.plannedCount,0);
assert.equal(q.localDayBounds('2026-11-08')[0],a);assert.throws(()=>q.localDayBounds('2026-02-30'));
let y=q.compute({sessions:[{segments:[{start:a-30*M,end:a+30*M}]}]},a,b,a+30*M);assert.equal(y.uniqueMs,30*M);assert.equal(y.precisionMs.unknown,30*M);assert.equal(y.unloggedGaps.length,0);
console.log('Batch I quality analytics assertions passed');
