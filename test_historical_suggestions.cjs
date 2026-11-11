const assert=require('node:assert/strict');
const p=require('./personal_predictive_planner.js');
const from=new Date(2026,10,16,0,0,0).getTime(),to=new Date(2026,10,23,0,0,0).getTime();
const history=[];
for(let i=1;i<=21;i++){
 const d=new Date(2026,10,16-i,9,0,0),startAt=d.getTime();
 history.push({id:'h'+i,name:d.getDay()===1?'Study':'Other',status:'finished',startAt,endAt:startAt+3600000});
}
const base=p.historicalSuggestions({sessions:history,from,to});
assert.equal(base.confidence,'reviewable');
const study=base.suggestions.find(s=>s.name==='Study');
assert.ok(study,'Three recurring Mondays should produce a suggestion');
assert.equal(study.observations,3);
assert.equal(study.requiresApproval,true);
assert.equal(study.startAt,new Date(2026,10,16,9).getTime());
assert.equal(study.conflicts.length,0);
assert.equal(study.patternConsistency,'consistent');
assert.equal(study.startTimeSpreadMinutes,0);
assert.equal(study.recoveryBufferMinutes,30);
assert.deepEqual(study.recoveryConflicts,[]);
const near=[{id:'near',status:'planned',startAt:study.endAt+5*60000,endAt:study.endAt+20*60000}];
const buffered=p.historicalSuggestions({sessions:history,schedule:near,from,to}).suggestions.find(s=>s.name==='Study');
assert.deepEqual(buffered.conflicts,[]);
assert.deepEqual(buffered.recoveryConflicts,['near']);
assert.throws(()=>p.approve(buffered,near,'near-approval',from),/conflicts/);
const noBuffer=p.historicalSuggestions({sessions:history,schedule:near,from,to,recoveryBufferMinutes:0}).suggestions.find(s=>s.name==='Study');
assert.deepEqual(noBuffer.recoveryConflicts,[]);
assert.throws(()=>p.historicalSuggestions({sessions:history,from,to,recoveryBufferMinutes:-1}),/Invalid recovery buffer/);

assert.equal(p.historicalSuggestions({sessions:history.slice(0,10),from,to}).suggestions.length,0,'Insufficient history must suppress suggestions');
const schedule=[{id:'conflict',status:'planned',startAt:study.startAt+1000,endAt:study.endAt}];
const blocked=p.historicalSuggestions({sessions:history,schedule,from,to}).suggestions.find(s=>s.name==='Study');
assert.deepEqual(blocked.conflicts,['conflict']);
assert.throws(()=>p.approve(blocked,schedule,'new',from),/conflicts/);
assert.throws(()=>p.historicalSuggestions({sessions:history,from,to:from+15*86400000}),/14 days/);
const moduleCode=require('node:fs').readFileSync('personal_visual_intelligence_v4.js','utf8');
assert.match(moduleCode,/planner\.historicalSuggestions/);
assert.match(moduleCode,/They are not automatically applied/);
console.log('Historical suggestion safety PASS');
