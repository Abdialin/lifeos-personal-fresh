/* LifeOS V103 — run with node --test test_debt_cancellation_v102.test.cjs
   Pure synthetic records only. This test never connects to production. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const cancel=require('./personal_debt_cancellation_v102.js');
const debt=require('./personal_debt_recovery_v75.js');
const progress=require('./personal_exercise_progress_v100.js');

const now=Date.parse('2026-11-15T12:00:00Z');
function fixture(){
 const originStart=now-4*3600000, originEnd=now-3*3600000;
 const start=now+3600000;
 return {sessions:[],schedule:[
  {id:'original',name:'Gym',startAt:originStart,endAt:originEnd,status:'skipped',debtDecisionsV75:[
    {action:'recover',decidedAt:now-3000,originalStartAt:originStart,originalEndAt:originEnd,
     amountBeforeMs:3600000,portionMs:3600000,recoveryPlanId:'recovery'}
  ]},
  {id:'recovery',name:'Recovery: Gym',startAt:start,endAt:start+3600000,status:'planned',
   source:'debt-recovery-v75',recoveryForPlanId:'original',sessionId:null}
 ]};
}
const fakeEngine={
 debtReport(workspace){
  return {confirmed:[{id:'original',name:'Gym',outstandingMs:3600000,plannedMs:3600000,actualMs:0,reason:'explicitly-skipped'}],
   unverified:[]};
 },
 duration(){return 0;}
};
test('cancels unstarted recovery by append-only audit',()=>{
 const w=fixture(),proposal=cancel.review(w,'original',now);
 assert.equal(proposal.ok,true);
 const entry=cancel.apply(w,proposal,now);
 assert.equal(entry.action,'cancel');
 assert.equal(entry.cancelDecisionIndex,0);
 assert.equal(w.schedule[0].status,'skipped');
 assert.equal(w.schedule[0].debtDecisionsV75.length,2);
 assert.equal(w.schedule[1].status,'cancelled');
 assert.equal(cancel.review(w,'original',now).ok,false);
});
test('restores outstanding debt without double counting planned recovery',()=>{
 const w=fixture();
 assert.equal(debt.outstanding(w,now,fakeEngine).openMs,0);
 cancel.apply(w,cancel.review(w,'original',now),now);
 const report=debt.outstanding(w,now,fakeEngine);
 assert.equal(report.openMs,3600000);
 assert.equal(report.scheduledMs,0);
 assert.equal(report.recoveredMs,0);
});
test('does not cancel recovery with linked or started time',()=>{
 const w=fixture();w.schedule[1].sessionId='tracked';
 assert.equal(cancel.review(w,'original',now).ok,false);
 w.schedule[1].sessionId=null;w.schedule[1].startAt=now-1000;
 assert.equal(cancel.review(w,'original',now).ok,false);
});
test('rejects stale reviewed cancellation',()=>{
 const w=fixture(),proposal=cancel.review(w,'original',now);
 w.schedule[0].debtDecisionsV75.push({action:'forgive',originalStartAt:w.schedule[0].startAt,originalEndAt:w.schedule[0].endAt});
 assert.throws(()=>cancel.apply(w,proposal,now),/changed/i);
});
test('exercise records reject nonexistent dates',()=>{
 assert.equal(progress.valid({workoutId:'x',exercise:'Squat',date:'2026-02-30',sets:3,reps:8,load:40}),null);
 assert.ok(progress.valid({workoutId:'x',exercise:'Squat',date:'2026-02-28',sets:3,reps:8,load:40}));
});
