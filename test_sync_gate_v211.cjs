const assert=require('node:assert/strict'),g=require('./personal_sync_gate_v211.js');
const good={remoteRevision:7,activeRevision:7,acknowledgedRevision:7,queueLength:2,blocked:false};
assert.deepEqual(g.inspect(good),{ok:true,reason:'revision-matches'});
for(const [patch,reason] of [
 [{remoteRevision:8},'server-revision-changed'],
 [{activeRevision:6},'unacknowledged-local-revision'],
 [{acknowledgedRevision:null},'unknown-base-revision'],
 [{acknowledgedRevision:6},'unacknowledged-local-revision'],
 [{blocked:true},'recovery-blocked'],
 [{queueLength:0},'invalid-sync-state'],
 [{remoteRevision:-1},'invalid-sync-state']]){
 const result=g.inspect({...good,...patch});assert.equal(result.ok,false);assert.equal(result.reason,reason);
}
assert.equal(g.inspect({remoteRevision:0,activeRevision:0,acknowledgedRevision:null,queueLength:1,blocked:false}).ok,true);
console.log('V211 offline queue revision gate PASS');
