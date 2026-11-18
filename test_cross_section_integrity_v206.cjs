const assert=require('node:assert/strict');
const integrity=require('./personal_cross_section_integrity_v206.js');
const goals=require('node:fs').readFileSync('./personal_goals_visual_v161.js','utf8');
const t=Date.now(),h=3600000;
const live={id:'s1',name:'Gym',status:'finished',segments:[{start:t-h,end:t}]};
const w={sessions:[live],workouts:[{id:'w1',sessionId:'s1',minutes:60}],
 meals:[{id:'m1',sessionId:'no-longer-present'}],schedule:[],habitChecks:[{id:'h1',evidenceType:'session',evidenceSourceId:'s1'}]};
let r=integrity.inspect(w,t);
assert.equal(r.summary.activities,1);assert.equal(r.summary.invalidIntervals,0);
assert.equal(r.counts.meals.orphanLinks,1);assert.equal(r.summary.missingHabitEvidence,0);
assert.equal(integrity.duration(live,t).ms,h);
assert.equal(integrity.duration({status:'paused',segments:[{start:t-h,end:null}]},t).malformed,true);
w.workouts.push({id:'w2',sessionId:'s1'});
r=integrity.inspect(w,t);assert.equal(r.summary.linkedWorkoutDuplicates,1);
w.sessions.push({...live});r=integrity.inspect(w,t);assert.equal(r.counts.sessions.duplicates,1);
assert.ok(/g\.unit==='hours'\?minutes\/60:good\.length/.test(goals),'Fitness hours must use recorded minutes, not session count');
assert.ok(!/localStorage\.setItem|fetch\(|mutate\(/.test(require('node:fs').readFileSync('./personal_cross_section_integrity_v206.js','utf8')));
console.log('V206 cross-section integrity and fitness-hour rules PASS');
