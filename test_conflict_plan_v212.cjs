const assert=require('node:assert/strict'),api=require('./personal_conflict_plan_v212.js');
function make(){return Object.fromEntries([...api.GROUPS].map(k=>[k,[]]).concat([['version',1],['nutritionSettings',{}]]))}
const a=make(),b=make();
assert.equal(api.inspect(a,b,2,2).summary.same,true);
a.sessions.push({id:'one',name:'Work'});b.sessions.push({id:'two',name:'Gym'});
let r=api.inspect(a,b,3,2);
assert.equal(r.summary.localOnly,1);assert.equal(r.summary.serverOnly,1);
assert.equal(r.revisionConflict,true);assert.equal(r.safe,false);
b.sessions.push({id:'one',name:'Work edited'});r=api.inspect(a,b,2,2);assert.equal(r.summary.modified,1);
a.habitChecks.push({id:'habit',date:'2026-11-18'});r=api.inspect(a,b,2,2);assert.equal(r.groups.find(x=>x.name==='habitChecks').localOnly,1);
a.meals.push({id:'duplicate'},{id:'duplicate'});r=api.inspect(a,b,2,2);assert.equal(r.summary.invalid,1);
const missing=make();delete missing.workouts;r=api.inspect(a,missing,2,2);assert.ok(r.summary.missing>=1);
const metadata=make();metadata.nutritionSettings={calories:2200};r=api.inspect(make(),metadata,2,2);assert.equal(r.summary.metadataChanged,1);
const reOrdered=make();a.sessions=[];a.meals=[];a.habitChecks=[];reOrdered.sessions=[{id:'id',name:'x',info:{a:1,b:2}}];a.sessions=[{info:{b:2,a:1},name:'x',id:'id'}];assert.equal(api.inspect(a,reOrdered,1,1).summary.same,true);
assert.ok(!JSON.stringify(api.inspect(a,b,1,1)).includes('Work edited'));
console.log('V212 bilateral reconciliation report: both-side additions, collisions, invalid IDs, metadata, revisions PASS');
