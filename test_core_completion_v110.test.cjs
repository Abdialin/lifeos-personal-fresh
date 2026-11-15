/* Run: node --test test_core_completion_v110.test.cjs.
   Pure in-memory test fixtures: never write actual or planned LifeOS records. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('./personal_core_completion_v110.js');
const now=Date.parse('2026-11-15T12:00:00Z');
const date='2026-11-15';
test('V106 only reports synchronization boundaries',()=>{
 const out=api.syncAudit({sessions:[{status:'finished',segments:[]}]},{getItem:()=>null});
 assert.equal(out.accountIsolated,false);
 assert.equal(out.activitySyncVerified,false);
 assert.equal(out.trackedSessions,1);
});
test('V107 warns about overdue timer without modifying it',()=>{
 const session={id:'t1',name:'Prayer',status:'running',segments:[{start:now-60*60000,end:null}]};
 const original=JSON.stringify(session);
 const result=api.timerAudit({sessions:[session]},now,{savedProfiles:()=>({}),effective:()=>({minutes:30})},{elapsed:()=>60*60000});
 assert.equal(result.overdue,1);assert.equal(result.invalid,0);
 assert.equal(JSON.stringify(session),original);
});
test('V108 counts only confirmed scheduled habits',()=>{
 const ws={habitDefinitions:[{id:'h',title:'Read',everyDays:1,startDate:date}],habitChecks:[{habitId:'h',date,done:true}]};
 const result=api.habitsAudit(ws,now,7);
 assert.equal(result.scheduled,1);assert.equal(result.completed,1);
 assert.equal(api.habitsAudit({habitDefinitions:ws.habitDefinitions,habitChecks:[]},now,7).completed,0);
});
test('V109 links exercise detail to real workout ID and date',()=>{
 const ws={workouts:[{id:'w1',date,type:'Gym'}],meals:[]};
 const details=[{workoutId:'w1',date,exercise:'Squat',sets:3,reps:10,load:50},
 {workoutId:'missing',date,exercise:'Squat',sets:3,reps:10,load:50}];
 const result=api.lifestyleAudit(ws,details,now,7);
 assert.equal(result.linkedExerciseEntries,1);assert.equal(result.unmatchedExerciseEntries,1);
});
test('V110 flags planning overlap and never commits imported events',()=>{
 const ws={schedule:[{id:'existing',status:'planned',startAt:now+3600000,endAt:now+7200000}]};
 const state={events:[{uid:'x',source:'ics-import',start:now+5400000,end:now+9000000}],approved:['x|'+(now+5400000)]};
 const old=JSON.stringify(ws);
 const result=api.calendarAudit(state,ws,now);
 assert.equal(result.conflicts,1);assert.equal(result.ready,0);
 assert.equal(JSON.stringify(ws),old);
});
