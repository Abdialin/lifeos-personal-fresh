const assert=require('node:assert/strict');const {assess}=require('./personal_schedule_evidence');
const now=new Date(2026,10,8,12).getTime(),day=86400000;
assert.equal(assess([],now).confidence,'insufficient');
const sessions=Array.from({length:16},(_,i)=>({status:'finished',startAt:now-(i+1)*day-3600000,endAt:now-(i+1)*day,precision:'measured'}));
assert.equal(assess(sessions,now).confidence,'reviewable');
assert.equal(assess([...sessions,{status:'finished',startAt:now+day,endAt:now+day+3600000,precision:'measured'}],now).trackedDays,16);
assert.equal(assess(sessions.map(x=>({...x,precision:'estimated'})),now).confidence,'insufficient');
assert.equal(assess([{status:'finished',startAt:20,endAt:10}],now).invalid,1);
assert.throws(()=>assess([],NaN));console.log('Schedule evidence: 6 checks passed');
