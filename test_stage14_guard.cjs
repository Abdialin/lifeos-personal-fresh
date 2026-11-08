const fs=require('fs'),assert=require('assert'),vm=require('vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new Function(script);
const start=script.indexOf('let outbox=[],outboxCorrupt=false;'),end=script.indexOf('function syncStatus(t)',start);
assert(start>0&&end>start);
const block=script.slice(start,end);
function check(raw){const store={'lifeos-v4-stage11-outbox':raw};const context={localStorage:{getItem:k=>store[k]??null},JSON,Number,Error};vm.createContext(context);vm.runInContext('const SYNC_META_KEY="lifeos-v4-sync-meta",OUTBOX_KEY="lifeos-v4-stage11-outbox";let syncMeta={revision:null,dirty:false};'+block+';globalThis.result={bad:outboxCorrupt,count:outbox.length,dirty:syncMeta.dirty}',context);return context.result}
assert.equal(check('[{"id":"ok","createdAt":123,"snapshot":{"version":1}}]').bad,false);
assert.equal(check('[{"id":"ok","createdAt":123,"snapshot":{"version":1}}]').count,1);
for(const value of ['{bad json','{}','[{"id":1}]','null']){const result=check(value);assert.equal(result.bad,true,value);assert.equal(result.dirty,true,value)}
assert(script.includes("if(outboxCorrupt)return syncStatus('SYNC BLOCKED"));
assert(script.includes('if(outboxCorrupt){syncStatus('));
console.log('PASS: Stage 14 malformed offline journal is detected and blocks synchronization');
