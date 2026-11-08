const fs=require('fs'),assert=require('assert'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
for(const fragment of [
 'lifeos-v4-sync-meta','lifeos-v4-stage11-outbox','function queueCurrentState()',
 'function scheduleSync(','window.addEventListener(\'online\'',
 'remote.revision!==syncMeta.revision','syncSuppressed=true',
 'if(!atomicCommit(data,next,nextMeta))return false'
])assert(script.includes(fragment),'Missing sync safety feature: '+fragment);
assert(script.includes("const KEY='lifeos-live-v1'"));
assert(script.includes("fetch('/api/state'"));
console.log('PASS: Stage 5 syntax, retry/revision guards, local outbox wiring and API compatibility');
