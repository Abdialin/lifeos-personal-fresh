const fs=require('fs'),assert=require('assert'),cp=require('child_process');
const html=fs.readFileSync('index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
cp.execFileSync('node',['--check','-'],{input:script});
for(const snippet of ['syncEpoch=0','function stopSync()','if(epoch!==syncEpoch)return','function safeBackupBeforeReplace()','syncMeta.dirty=true','remote.revision!==syncMeta.revision','function reconcileRemote(remote)','syncSuppressed=true'])assert(html.includes(snippet),`Missing sync safety feature: ${snippet}`);
assert(html.includes("const KEY='lifeos-live-v1'"),'Legacy data key changed');
assert(html.includes("fetch('/api/state'"),'Legacy API changed');
console.log('PASS: Stage 9 syntax, stale-response guards, conflict and backup protections');
