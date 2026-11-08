const assert=require('node:assert/strict'),m=require('./smart_schedule');
const p={id:'a',name:'Study',startAt:0,endAt:3600000,status:'planned'};
assert.equal(m.conflicts([p,{id:'b',startAt:1800000,endAt:5400000}]).length,1);
assert.equal(m.conflicts([p,{id:'b',startAt:3600000,endAt:5400000}]).length,0);
const v=m.threeViews({sessions:[{id:'s',name:'Work',segments:[{start:-3600000,end:1800000}]}],schedule:[p],start:0,end:7200000});
assert.equal(v.reality[0].startAt,0);assert.equal(v.reality[0].endAt,1800000);assert.equal(v.predicted.length,1);assert.equal(v.ideal.length,0);
const shift=m.proposeShift(p,30,[{id:'b',startAt:3600000,endAt:5400000}]);assert.equal(shift.requiresApproval,true);assert.equal(shift.conflicts.length,1);assert.equal(p.startAt,0);
assert.throws(()=>m.proposeShift(p,2000));assert.throws(()=>m.threeViews({start:3,end:2}));
console.log('Smart schedule: 9 assertions passed');
