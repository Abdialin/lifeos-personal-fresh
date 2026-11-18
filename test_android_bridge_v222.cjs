const assert=require('node:assert/strict');
require('./personal_android_bridge_v222.js');
const api=global.LifeOSAndroidBridgeV222;
assert.equal(api.pick([]),null);
assert.equal(api.pick([{id:1,status:'paused'},{id:2,status:'running'}]).id,2);
assert.equal(api.elapsed({status:'running',segments:[{start:100,end:500},{start:700,end:null}]},1000),700);
assert.equal(api.elapsed({status:'paused',segments:[{start:0,end:1000}]},9999),1000);
assert.equal(api.elapsed({status:'finished',segments:[]},9999),0);
console.log('V222 native projection: choose, pause, multi-segment duration PASS');
