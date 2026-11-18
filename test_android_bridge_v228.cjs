const assert=require('node:assert/strict');
const sessions=[{id:'s1',name:'Study',status:'running',segments:[{start:100,end:null}]},
 {id:'s2',name:'Gym',status:'paused',segments:[{start:100,end:200}]}];
const sent=[],actions=[];
global.lifeosReadOnlyWorkspace=()=>({sessions});
global.LifeOSNative={postMessage:raw=>sent.push(JSON.parse(raw))};
global.CustomEvent=class {constructor(type,opts){this.type=type;this.detail=opts.detail}};
global.dispatchEvent=evt=>{
 if(evt.type==='lifeos-v77-timer-action'){
  actions.push({id:evt.detail.id,action:evt.detail.action});
  const session=sessions.find(s=>s.id===evt.detail.id);
  if(session){session.status=evt.detail.action==='pause'?'paused':'running';evt.detail.result={ok:true}}
 }
};
require('./personal_android_bridge_v222.js');
const api=global.LifeOSAndroidBridgeV222;
assert.equal(api.nativeTimerAction('s1','pause'),true);
assert.deepEqual(actions,[{id:'s1',action:'pause'}]);
assert.equal(sessions[0].status,'paused');
assert.equal(api.nativeTimerAction('s1','pause'),false,'Reject stale action');
assert.equal(api.nativeTimerAction('s3','resume'),false,'Reject unknown timer');
assert.equal(api.nativeTimerAction('s2','finish'),false,'Never finish via notification');
assert.equal(api.nativeTimerAction('s2','resume'),true);
assert.equal(sessions[1].status,'running');
assert.ok(sent.some(x=>x.kind==='timer-status'&&x.activeCount===2));
assert.equal(actions.length,2,'No duplicate or invented action');
console.log('V228 native command guard and existing V77 handler only: PASS');
