const assert=require('node:assert/strict');
const S=require('./personal_recovery_simulator'),P=require('./personal_pattern_suggestions');
let n=0;const check=(fn)=>{fn();n++};
const blank=()=>({version:1,sessions:[]});
check(()=>{const s=S.create(blank());S.edit(s,'A','a',x=>x.sessions.push({id:'1'}));assert.equal(S.sync(s,'A',{fail:'before-commit'}).status,'offline');assert.equal(s.remote.revision,0);assert.equal(s.clients.A.queue.length,1)});
check(()=>{const s=S.create(blank());S.edit(s,'A','a',x=>x.sessions.push({id:'1'}));assert.equal(S.sync(s,'A',{fail:'after-commit'}).status,'uncertain');assert.equal(S.reconnect(s,'A').status,'acknowledged-after-timeout');assert.equal(s.remote.revision,1);assert.equal(s.clients.A.queue.length,0)});
check(()=>{const s=S.create(blank());S.client(s,'B');S.edit(s,'A','a',x=>x.sessions.push({id:'1'}));S.edit(s,'B','b',x=>x.sessions.push({id:'2'}));S.sync(s,'A');assert.equal(S.sync(s,'B').status,'conflict');assert.equal(s.clients.B.local.sessions[0].id,'2');assert.equal(s.clients.B.queue.length,1)});
check(()=>{const s=S.create(blank());S.edit(s,'A','a',x=>x.sessions.push({id:'1'}));assert.throws(()=>S.edit(s,'A','a',()=>{}),/Duplicate/)});
check(()=>{const s=S.create(blank());S.edit(s,'A','a',x=>x.sessions.push({id:'1'}));const b=S.exportRecovery(s,'A');b.client.local.sessions.length=0;assert.equal(s.clients.A.local.sessions.length,1)});
check(()=>{const s=S.create(blank());S.edit(s,'A','a',x=>x.sessions.push({id:'1'}));S.sync(s,'A');assert.equal(S.reconnect(s,'B').status,'refreshed');assert.equal(s.clients.B.local.sessions.length,1)});
const now=new Date(2026,10,8,12).getTime();const logs=[];for(let i=1;i<=21;i++){const start=now-i*86400000;logs.push({status:'finished',name:'Study',startAt:start,endAt:start+1800000});}
check(()=>assert.equal(P.suggest(logs,{now}).trackedDays,21));
check(()=>assert.ok(P.suggest(logs,{now}).suggestions.length>0));
check(()=>assert.equal(P.suggest(logs,{now,minDays:25}).evidence,'insufficient'));
check(()=>assert.equal(P.suggest([{...logs[0],status:'running'}],{now}).trackedDays,0));
check(()=>assert.throws(()=>P.suggest([],{now,lookbackDays:0}),/Invalid/));
console.log(`Phase 1 combined local checks: ${n} passed`);
