const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('personal_conflict_resolution_v245.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const server=fs.readFileSync('server.py','utf8');
assert.doesNotThrow(()=>new Function(src));
const ctx={};ctx.window=ctx;vm.runInNewContext(src,ctx);
const tool=ctx.LifeOSConflictResolutionV245;
const current={version:1,sessions:[{id:'a',name:'Work',status:'running'}],events:[{id:'e1'}],schedule:[{id:'p',name:'Study',startAt:1}],goals:[{id:'goal'}],todos:[]};
const remote={version:1,sessions:[{id:'a',name:'Work',status:'finished'},{id:'b',name:'Reading'}],events:[{id:'e1'},{id:'e2'}],schedule:[{id:'p',name:'Study',startAt:2}],goals:[{id:'goal'}],todos:[]};
const queue=[{id:'op',snapshot:JSON.parse(JSON.stringify(current))}];
const result=tool.examine(current,remote,queue);
assert.equal(result.eligible,true);
assert.equal(result.records.length,2);
assert.equal(result.unmatched.length,0);
assert.deepEqual([...result.records.map(x=>x.key)].sort(),['schedule','sessions']);
assert.equal(result.records.find(x=>x.key==='sessions').changedFields.includes('status'),true);
assert.equal(tool.examine({...current,sessions:[...current.sessions,{id:'missing'}]},remote,queue).eligible,false);
assert.equal(tool.examine(current,remote,[{id:'q',snapshot:{...current,sessions:[...current.sessions,{id:'queued-only'}]}}]).eligible,false);
assert.equal(tool.examine({...current,settings:{safe:true}},remote,queue).eligible,false);
assert.equal(tool.examine(current,remote,[{id:'q',snapshot:{...current,sessions:[{id:'a',name:'Work',status:'paused'}]}}]).records.length,2);
assert.equal(current.sessions[0].status,'running','must be read-only');
const frag=html.slice(html.indexOf('let v245Reviewed'),html.indexOf('async function push(){',html.indexOf('let v245Reviewed')));
assert.doesNotThrow(()=>new Function(frag));
for(const clause of ['await v242Backup(', 'queue:outbox,syncMeta,checkpointRaw:review.checkpoint',
 'const selected=approval()', 'await v245Confirmation(expected.length)', 'latest.revision!==review.revision',
 'if(!atomicCommit(latest.data,[],meta))', 'KEEP SERVER VERSIONS'])
 assert.ok(frag.includes(clause),clause);
assert.doesNotMatch(frag,/requestState\('PUT'|fetch\('\/api\/state'/);
assert.match(server,/'personal_conflict_resolution_v245\.js'/);
console.log('PASS V245 per-record manual review; queued local-only blocks; backups, no server writes, revalidation');
