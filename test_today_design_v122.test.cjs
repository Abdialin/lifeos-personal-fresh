const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const api=require('./personal_today_design_v122.js');
test('day parts handle local boundaries',()=>{
 const at=h=>new Date(2026,10,15,h,30).getTime();
 assert.equal(api.periodOf(at(4)),'night');assert.equal(api.periodOf(at(5)),'morning');
 assert.equal(api.periodOf(at(12)),'afternoon');assert.equal(api.periodOf(at(17)),'evening');
 assert.equal(api.periodOf(at(22)),'night');
});
test('agenda keeps plans separate from recorded activity and omits untimed tasks',()=>{
 const d='2026-11-15',now=new Date(d+'T12:00:00').getTime();
 const w={schedule:[{id:'p1',startAt:new Date(d+'T09:30:00').getTime(),name:'Meeting',status:'planned'},
   {id:'skip',startAt:new Date(d+'T13:00:00').getTime(),name:'Skipped',status:'skipped'}],
   todos:[{id:'t1',name:'Due',due:d,dueTime:'18:00',done:false},
      {id:'t2',name:'Flexible',due:d,done:false},
      {id:'t3',name:'Done',due:d,dueTime:'10:00',done:true}],
   sessions:[{name:'Do not copy'}]};
 const entries=api.plansForDay(w,now);
 assert.deepEqual(entries.map(x=>x.name),['Meeting','Due']);
 assert.equal(entries[0].period,'morning');assert.equal(entries[1].period,'evening');
 assert.equal(w.schedule.length,2);assert.equal(w.sessions.length,1);
});
test('date boundaries prevent neighboring-day agenda leakage',()=>{
 const now=new Date(2026,10,15,12).getTime();
 const w={schedule:[{id:'yesterday',startAt:new Date(2026,10,14,23).getTime()}],
 todos:[{id:'tomorrow',name:'Later',due:'2026-11-16',dueTime:'05:30'}]};
 assert.equal(api.plansForDay(w,now).length,0);
});
test('mode choice never modifies workspace data',()=>{
 assert.equal(api.modeValue('other'),'compact');
 assert.equal(api.modeValue('detailed'),'detailed');
 const script=fs.readFileSync('personal_today_design_v122.js','utf8');
 assert.doesNotMatch(script,/\b(?:persist|save_state|deleteSession|updateSession)\s*\(/);
 assert.match(script,/aria-pressed/);
 assert.match(script,/lifeosReadOnlyWorkspace/);
});
test('today page registers visual components and semantic buttons',()=>{
 const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('personal_today_design_v122.css','utf8');
 const timeline=fs.readFileSync('personal_visual_intelligence_v4.js','utf8');
 const server=fs.readFileSync('server.py','utf8');
 assert.match(html,/src="personal_today_design_v122\.js(?:\?[^"\s]*)?"/);
 assert.match(html,/href="personal_today_design_v122\.css(?:\?[^"\s]*)?"/);
 assert.match(server,/'personal_today_design_v122\.js'/);
 assert.match(timeline,/data-lo122-interval/);
 assert.match(timeline,/class="v4-track lo122-timeline-button"/);
 assert.match(css,/#lo122-agenda/);
 assert.match(css,/prefers-reduced-motion|@media\(max-width:550px\)/);
});
