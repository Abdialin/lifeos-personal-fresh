const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={Date};ctx.window=ctx;
vm.runInNewContext(fs.readFileSync('personal_browser_activity_recovery_v241.js','utf8'),ctx);
vm.runInNewContext(fs.readFileSync('personal_activity_delta_sync_v242.js','utf8'),ctx);
const api=ctx.LifeOSActivityDeltaSyncV242;
const remote={version:1,sessions:[{id:'s-old',name:'Work',status:'running',startAt:1,segments:[{start:1,end:null}]}],
 events:[{id:'e-old',at:1}],todos:[{id:'task',name:'Preserve'}],schedule:[{id:'plan',name:'Plan'}],goals:[{id:'goal',name:'Goal'}]};
const browser={...JSON.parse(JSON.stringify(remote)),sessions:[
 {...remote.sessions[0],status:'paused',segments:[{start:1,end:2}]},
 {id:'s17',name:'Gym',status:'finished',startAt:1794916800000,segments:[{start:1794916800000,end:1794918600000}],endAt:1794918600000},
 {id:'s18',name:'Study',status:'finished',startAt:1795003200000,segments:[{start:1795003200000,end:1795006800000}],endAt:1795006800000}
 ],events:[...remote.events,{id:'e17',at:1794918600000},{id:'e18',at:1795006800000}]};
const p=api.publishPlan(browser,remote);
assert.equal(p.addSessions,2);assert.equal(p.addEvents,2);assert.equal(p.skippedSessions,1);
assert.equal(p.merged.sessions.length,3);
assert.equal(p.merged.sessions[0].status,'running','Existing server ID preserved');
assert.deepEqual(JSON.parse(JSON.stringify(p.merged.goals)),remote.goals);
assert.deepEqual(JSON.parse(JSON.stringify(p.merged.schedule)),remote.schedule);
assert.equal(remote.sessions.length,1,'Neither source mutated');
const fast=api.receivePlan(remote,p.merged);
assert.equal(fast.ok,true);assert.equal(fast.addSessions,2);assert.equal(fast.addEvents,2);
assert.equal(api.receivePlan(p.merged,p.merged).ok,false,'No unnecessary replacement');
const changed={...remote,sessions:[{...remote.sessions[0],status:'paused'}]};
assert.equal(api.receivePlan(changed,p.merged).ok,false,'Existing ID conflicts must block');
assert.equal(api.receivePlan({...remote,todos:[{id:'different'}]},p.merged).ok,false,'Other records must not be erased');
assert.equal(api.receivePlan(browser,remote).ok,false,'Browser-only local IDs cannot be overwritten by server');
const html=fs.readFileSync('index.html','utf8');
const fragment=html.slice(html.indexOf('let v242Review'),html.indexOf('async function push(){',html.indexOf('let v242Review')));
assert.doesNotThrow(()=>new Function(fragment));
assert.match(fragment,/await requestState\('PUT',\{revision:latest\.revision,data:fresh\.merged\}\)/);
assert.match(fragment,/const latest=await requestState\(\)/);
assert.match(fragment,/localStorage\.getItem\(ATOMIC_KEY\)!==review\.checkpoint/);
assert.match(fragment,/if\(!atomicCommit\(fresh\.merged,\[\],meta\)\)/);
assert.match(fragment,/if\(mode==='publish'\)stopSync\(\)/);
assert.match(fragment,/v242Backup/);
assert.match(fragment,/I saved and verified both the source and destination JSON backups/);
assert.match(fs.readFileSync('server.py','utf8'),/'personal_activity_delta_sync_v242\.js'/);
console.log('PASS V242 additive safe server CAS plan and non-destructive beta adoption');
