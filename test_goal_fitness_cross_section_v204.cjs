// Regression: one completed timer must count once even when workout details link to it.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context={
 window:{LifeOSMyLifeV190:{kindOf:name=>/^(gym|träning|promenad)$/i.test(name)?'fitness':null}},
 document:{readyState:'loading',addEventListener(){}},
 Date,console,setTimeout
};
vm.runInNewContext(fs.readFileSync(require.resolve('./personal_goals_visual_v161.js'),'utf8'),context);
const api=context.window.LifeOSGoalEvidenceV175;
assert.ok(api,'Goals evidence API mounted');
// Use a completed week so the synthetic finished sessions are never future-dated.
const a=api.monday(-1),b=api.monday(0),start=a+12*3600000;
const timer=(id,name,source)=>({id,name,source,status:'finished',startAt:start,endAt:start+3600000,segments:[{start,end:start+3600000}]});
const w={
 sessions:[timer('gym-1','Träning'),timer('walk-1','Promenad'),timer('demo-1','Gym','assumed-demo')],
 workouts:[{id:'details-1',sessionId:'gym-1',date:new Date(start).toISOString().slice(0,10),minutes:60}]
};
const result=api.measure({category:'fitness',unit:'sessions'},w,a,b);
assert.equal(result.value,2,'linked training timer plus walking timer, without double count or demo');
assert.equal(result.minutes,60,'two concurrent timers remain two sessions but contribute one hour of elapsed goal time');
assert.equal(result.rawMinutes,120,'the two original recorded durations are still available');
assert.ok(result.excluded>=1,'demo should be excluded');
console.log('V204 Goals ↔ My Life fitness evidence: pass');
