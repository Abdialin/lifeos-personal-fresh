/* Run: node --test test_exercise_transfer_v105.test.cjs
 * Only synthetic local fixtures; no network, cloud or actual workouts modified. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const progress=require('./personal_exercise_progress_v100.js');
globalThis.LifeOSExerciseProgressV100=progress;
const transfer=require('./personal_exercise_transfer_v105.js');
const row={id:'record-1',workoutId:'workout-1',exercise:'Squat',date:'2026-11-15',sets:3,reps:8,load:50};
const workout={id:'workout-1',date:'2026-11-15',type:'Gym'};
const store=()=>{
 const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key),has:key=>data.has(key)};
};
test('export includes confirmed exercise details but not workout history',()=>{
 const document=transfer.exportData([row]);
 assert.equal(document.entries.length,1);
 assert.equal(document.entries[0].id,row.id);
 assert.equal(document.scope,'exercise-progress-only');
 assert.equal(JSON.stringify(document).includes('lifeos-live-v1'),false);
});
test('matching workout ID and date required before review',()=>{
 const raw=JSON.stringify(transfer.exportData([row]));
 assert.equal(transfer.inspect(raw,[workout],[],progress).entries.length,1);
 assert.equal(transfer.inspect(raw,[{...workout,date:'2026-11-14'}],[],progress).unmatched.length,1);
 assert.equal(transfer.inspect(raw,[],[],progress).entries.length,0);
});
test('duplicate and invalid rows are excluded',()=>{
 const dup=transfer.exportData([row,row,{...row,id:'bad',sets:0}]);
 const checked=transfer.inspect(JSON.stringify(dup),[workout],[],progress);
 assert.equal(checked.entries.length,1);
 assert.equal(checked.duplicates.length,1);
});
test('requires explicit selected IDs and preserves existing actual history',()=>{
 const device=store();device.setItem('lifeos-live-v1','{"actual":"preserve"}');
 const proposal=transfer.inspect(JSON.stringify(transfer.exportData([row])),[workout],[],progress);
 assert.equal(transfer.applySelected(device,proposal,[],[workout],progress).ok,false);
 assert.equal(transfer.applySelected(device,proposal,[row.id],[workout],progress).ok,true);
 assert.equal(progress.read(device).length,1);
 assert.equal(device.getItem('lifeos-live-v1'),'{"actual":"preserve"}');
});
test('rejects stale links and prevents duplicate import',()=>{
 const device=store(),proposal=transfer.inspect(JSON.stringify(transfer.exportData([row])),[workout],[],progress);
 assert.equal(transfer.applySelected(device,proposal,[row.id],[{...workout,date:'2026-11-14'}],progress).ok,false);
 assert.equal(transfer.applySelected(device,proposal,[row.id],[workout],progress).ok,true);
 assert.equal(transfer.applySelected(device,proposal,[row.id],[workout],progress).ok,false);
});
