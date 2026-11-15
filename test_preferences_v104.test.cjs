/* LifeOS V104 — execute with node --test test_preferences_v104.test.cjs
 * Synthetic records only. Never contacts LifeOS staging or modifies activities. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const exercise=require('./personal_exercise_plans_v95.js');
globalThis.LifeOSExercisePlansV95=exercise;
const hub=require('./personal_preferences_hub_v88.js');
const sync=require('./personal_preferences_sync_v89.js');
const key=exercise.KEY;
function memory(values={}){
 const m=new Map(Object.entries(values));
 return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
}
const plan={id:'p1',name:'Strength A',type:'Gym',exercises:[{name:'Squat',sets:3,reps:8,load:60}]};
test('exercise plan template is available for cloud transfer',()=>{
 assert.equal(sync.ALLOWED.includes('exercisePlans'),true);
 const local={exercisePlans:[plan]};
 assert.deepEqual(sync.cloudSubset(local),local);
});
test('local export keeps historical workouts out',()=>{
 const store=memory({[key]:JSON.stringify([plan]),'lifeos-live-v1':'personal history'});
 const saved=hub.packageExport(store);
 assert.equal(saved.preferences.exercisePlans.length,1);
 assert.equal(JSON.stringify(saved).includes('personal history'),false);
});
test('cloud and export parsing ignore harmless JSON key order',()=>{
 const reordered={id:'p1',name:'Strength A',type:'Gym',exercises:[{load:60,reps:8,sets:3,name:'Squat'}]};
 const parsed=hub.parseImport(JSON.stringify({format:hub.FORMAT,version:hub.VERSION,scope:'local-preferences-only',preferences:{exercisePlans:[reordered]}}));
 assert.equal(parsed.ok,true);
});
test('bad sets are rejected and cannot overwrite local templates',()=>{
 const prior=JSON.stringify([plan]);const store=memory({[key]:prior});
 const changed={...plan,exercises:[{name:'Squat',sets:0,reps:8,load:60}]};
 const proposal=hub.parseImport(JSON.stringify({format:hub.FORMAT,version:hub.VERSION,scope:'local-preferences-only',preferences:{exercisePlans:[changed]}}));
 assert.equal(proposal.ok,false);
 assert.equal(hub.applySelected(store,proposal,['exercisePlans']).ok,false);
 assert.equal(store.getItem(key),prior);
});
test('user selected group does not overwrite unrelated groups',()=>{
 const old=JSON.stringify([{id:'legacy',label:'Run',type:'Running',minutes:30,intensity:'Easy',detail:''}]);
 const store=memory({[key]:'[]','lifeos.personal.fitness-presets.v83':old});
 const proposal=hub.parseImport(JSON.stringify({format:hub.FORMAT,version:hub.VERSION,scope:'local-preferences-only',preferences:{exercisePlans:[plan]}}));
 assert.equal(hub.applySelected(store,proposal,['exercisePlans']).ok,true);
 assert.equal(store.getItem('lifeos.personal.fitness-presets.v83'),old);
});
