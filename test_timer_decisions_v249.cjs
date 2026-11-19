const assert=require('node:assert/strict'),fs=require('node:fs');
const api=require('./personal_timer_decisions_v249.js'),MIN=60000,H=3600000;
const at=10*H;
const sessions=[
 {id:'prayer',name:'Fajr prayer',status:'running',segments:[{start:8*H,end:null}]},
 {id:'work',name:'Work',status:'running',segments:[{start:9*H,end:null}]},
 {id:'quran',name:'Quran',status:'paused',segments:[{start:7*H,end:7*H+20*MIN}]},
 {id:'finished',name:'Gym',status:'finished',segments:[{start:3*H,end:4*H}]}
];
const guard={valid:s=>s.id==='work'?{targetMinutes:120,mode:'warn'}:null,
 suggestion:s=>/prayer/i.test(s)?30:60,
 elapsed:(s,now)=>s.segments.reduce((n,seg)=>n+(seg.end===null&&s.status==='running'?now-seg.start:seg.end===null?0:seg.end-seg.start),0)};
const rows=api.assess(sessions,at,guard);
assert.equal(rows.length,3);
assert.equal(rows[0].id,'prayer');assert.equal(rows[0].category,'needs-review');
assert.equal(rows[0].overdueMs,90*MIN);
assert.equal(rows.find(r=>r.id==='work').configured,true);
assert.equal(rows.find(r=>r.id==='work').expectedMinutes,120);
assert.equal(rows.find(r=>r.id==='quran').category,'paused');
assert.equal(rows.find(r=>r.id==='quran').elapsedMs,20*MIN);
assert.equal(sessions[0].segments[0].end,null,'No mutation of running sessions');
assert.equal(api.fmt(90*MIN),'1h 30m');
assert.doesNotThrow(()=>new Function(fs.readFileSync('personal_timer_decisions_v249.js','utf8')));
const src=fs.readFileSync('personal_timer_decisions_v249.js','utf8');
assert.match(src,/lifeos-v77-timer-action/,'Use existing transactional timer action event');
assert.match(src,/root\.confirm\('Finish/,'Finish requires confirmation');
assert.match(src,/Duration options/);
assert.doesNotMatch(src,/atomicCommit\(|localStorage\.setItem\(|requestState\('PUT'/,'New UI must not bypass canonical records');
assert.match(fs.readFileSync('index.html','utf8'),/personal_timer_decisions_v249\.js\?v=20261119-v249/);
assert.match(fs.readFileSync('server.py','utf8'),/'personal_timer_decisions_v249\.js'/);
console.log('PASS V249 overdue, configured limit, paused time, finish confirmation and transactional controls');
