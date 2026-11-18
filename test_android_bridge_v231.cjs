const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('personal_android_bridge_v222.js','utf8');
const messages=[],listeners={},docListeners={};
let workspace={sessions:[{id:'one',name:'Work',status:'running',segments:[{start:1000,end:4000},{start:7000,end:null}]}]};
let currentNow=10000;
const root={
  document:{hidden:false,addEventListener:(type,cb)=>{docListeners[type]=cb}},
  addEventListener:(type,cb)=>{listeners[type]=cb},
  setTimeout:()=>0,setInterval:()=>0,
  LifeOSNative:{postMessage:value=>messages.push(JSON.parse(value))},
  lifeosReadOnlyWorkspace:()=>workspace,
  localStorage:{getItem:()=>null},
  Date:{now:()=>currentNow}
};
root.window=root;root.globalThis=root;
vm.runInNewContext(script,root);
const api=root.LifeOSAndroidBridgeV222;
assert.equal(api.publish(),true);
assert.equal(messages.filter(x=>x.kind==='timer-status').length,1);
assert.equal(api.publish(),true);
assert.equal(messages.filter(x=>x.kind==='timer-status').length,1,'Stable polling should not spam native service');
currentNow+=5000;
assert.equal(api.publish(true),true);
let timers=messages.filter(x=>x.kind==='timer-status');
assert.equal(timers.length,2,'Explicit refresh must bypass unchanged signature');
assert.ok(timers[1].elapsedMs>timers[0].elapsedMs,'Elapsed value must reflect newly resumed app time');
const before=messages.length;listeners.focus();
assert.equal(messages.length,before+2,'App returning to foreground refreshes timer and alarm');
assert.equal(messages.at(-2).kind,'timer-status');
assert.equal(messages.at(-1).kind,'alarm-status');
const count=messages.length;docListeners.visibilitychange();
assert.equal(messages.length,count+2,'Visibility return also reconciles');
root.document.hidden=true;docListeners.visibilitychange();
assert.equal(messages.length,count+2,'Hidden WebView does not repeatedly refresh');
console.log('V231 authoritative foreground timer/alarm refresh: PASS');
