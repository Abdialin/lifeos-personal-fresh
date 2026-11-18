const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('personal_browser_activity_recovery_v241.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const server=fs.readFileSync('server.py','utf8');
const context={};context.window=context;vm.runInNewContext(js,context);
const tool=context.LifeOSBrowserActivityRecoveryV241;
const local={version:1,sessions:[{id:'old',name:'Work',status:'running',startAt:1,segments:[{start:1,end:null}]}],events:[{id:'e1',kind:'start',at:1}],goals:[{id:'keep',name:'Keep me'}],schedule:[{id:'p1',name:'Plan'}]};
const source={exportType:'lifeos-browser-activity-transfer-v241',version:1,createdAt:1795000000000,
 workspace:{version:1,sessions:[
  {id:'old',name:'Work',status:'paused',startAt:1,segments:[{start:1,end:2}]},
  {id:'new17',name:'Reading',status:'finished',startAt:1794916800000,segments:[{start:1794916800000,end:1794918600000}]},
  {id:'new18',name:'Study',status:'finished',startAt:1795003200000,segments:[{start:1795003200000,end:1795006800000}]}
 ],events:[{id:'e1',kind:'start',at:1},{id:'e2',kind:'finish',at:1794918600000}]}};
const plan=tool.preview(local,source);
assert.equal(plan.ok,true);assert.equal(plan.addedSessions,2);assert.equal(plan.addedEvents,1);
assert.equal(plan.conflictSessions,1);assert.equal(plan.conflictEvents,0);
const merged=tool.apply(local,plan);
assert.equal(merged.sessions.length,3);
assert.equal(merged.events.length,2);
assert.equal(merged.sessions[0].status,'running','Never overwrite shared ID');
assert.equal(merged.sessions[1].startAt,source.workspace.sessions[1].startAt,'Exact source timestamp');
assert.equal(merged.goals[0].name,'Keep me','All non-activity records untouched');
assert.equal(merged.schedule.length,1);
assert.equal(local.sessions.length,1,'Comparator must not mutate source');
assert.equal(tool.preview(merged,source).addedSessions,0,'Repeated imports idempotent');
assert.throws(()=>tool.preview(local,{...source,workspace:{...source.workspace,sessions:[source.workspace.sessions[0],source.workspace.sessions[0]]}}),/duplicate record ID/);
assert.throws(()=>tool.preview(local,{...source,exportType:'lifeos-v234-local-recovery'}),/Choose a V241 export/);
assert.throws(()=>tool.apply({...local,sessions:[...local.sessions,{id:'new17'}]},plan),/Local records changed/);
const ui=html.slice(html.indexOf('let v241Reviewed'),html.indexOf('async function push(){',html.indexOf('let v241Reviewed')));
assert.doesNotThrow(()=>new Function(ui));
assert.match(ui,/await window\.LifeOSV234BackupBridge\.save/);
assert.match(ui,/await v241ConfirmImport\(review\.plan\)/);
assert.match(ui,/const nextMeta=\{revision:null,dirty:true\}/);
assert.match(ui,/if\(!atomicCommit\(merged,\[\],nextMeta\)\)/);
assert.doesNotMatch(ui,/requestState\('PUT'|fetch\('/api\/state'/,'Import must never write server data');
assert.match(server,/'personal_browser_activity_recovery_v241\.js'/);
console.log('PASS V241 browser activity transfer, conflict skip, timestamps, repeat safety and no server writes');
