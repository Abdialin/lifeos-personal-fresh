const assert=require('node:assert/strict');
const timeline=require('./personal_activity_timeline_v54.js');
const t=s=>new Date('2026-11-17T'+s+':00').getTime();
const workspace={sessions:[{id:'work-1',name:'Work',status:'finished',segments:[
 {start:t('08:00'),end:t('10:00')},
 {start:t('12:00'),end:t('14:00')}
]}],schedule:[]};
const before=JSON.stringify(workspace);
const result=timeline.build(workspace,'2026-11-17',t('18:00'));
assert.equal(result.error,null);
assert.equal(result.pauses.length,1);
assert.equal(result.pauses[0].start,t('10:00'));
assert.equal(result.pauses[0].end,t('12:00'));
assert.equal(result.pauses[0].durationMs,2*60*60*1000);
assert.equal(result.stats.observedMs,4*60*60*1000);
assert.equal(JSON.stringify(workspace),before,'Read-only timeline may not edit records');
workspace.sessions[0].segments=[{start:t('08:00'),end:t('08:40')},
 {start:t('08:41'),end:t('09:10')}];
const short=timeline.build(workspace,'2026-11-17',t('18:00'));
assert.equal(short.pauses.length,0,'Minute-long interruptions remain hidden');
console.log('V225 pause/resume history, duration accounting, read-only safety PASS');
