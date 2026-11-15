/* Track V126 source + pure-metric regression tests. Run node --test test_track_design_v126.test.cjs */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const api=require('./personal_track_design_v126.js');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('personal_track_design_v126.css','utf8');
const source=fs.readFileSync('personal_track_design_v126.js','utf8');
const server=fs.readFileSync('server.py','utf8');
test('unique time merges simultaneous sessions without double-counting',()=>{
 assert.equal(api.uniqueLength([[0,60000],[10000,70000],[70000,80000]]),80000);
 assert.equal(api.uniqueLength([[0,2000],[5000,7000]]),4000);
 assert.equal(api.uniqueLength([]),0);
});
test('week chart excludes unverified examples, clips to day, and counts unique time',()=>{
 const end=new Date(2026,10,15,14,0).getTime();
 const start=new Date(2026,10,15,10,0).getTime();
 const w={sessions:[
 {id:'real1',name:'Study',status:'finished',segments:[{start,end:start+90*60000}]},
 {id:'real2',name:'Prayer',status:'finished',segments:[{start:start+60*60000,end:start+120*60000}]},
 {id:'example',seedBatch:'test',segments:[{start,end:start+200*60000}]},
 {id:'dev',source:'development-starter',segments:[{start,end:start+200*60000}]}
 ]};
 const rows=api.dailyEvidence(w,end);
 assert.equal(rows.length,7);
 assert.equal(rows[6].minutes,120);
 assert.equal(rows[6].sessionCount,2);
 assert.equal(rows[6].dateKey,'2026-11-15');
});
test('week chart uses real segment data only, never fills unknown gaps',()=>{
 const end=new Date(2026,10,15,14,0).getTime();
 const rows=api.dailyEvidence({sessions:[{name:'Plan without timer',status:'finished',startAt:end-7200000,endAt:end}]},end);
 assert.equal(rows[6].minutes,0);
});
test('Track preserves live timer, quick-start and archive operations',()=>{
 for(const id of ['trackActivePanel','sessions','trackQuickPanel','quick','startCustom','trackHistoryPanel','history','exportCsv','loHistorySearch','loHistoryPeriod','trackPastPanel','pastForm','trackDistractionPanel'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(source,/active\.querySelector\(':scope > \.head'\)/);
 assert.match(source,/child\.id==='lo77-timer-quick'/);
 assert.match(source,/#?trackHistoryPanel/);
 assert.match(source,/lifeosReadOnlyWorkspace/);
 assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage)\.setItem\s*\(/);
});
test('Track has progressive disclosure and responsive semantic colors',()=>{
 assert.match(source,/lo126-timer-settings/);
 assert.match(source,/lo126TrackExtras/);
 assert.match(source,/lo126PastDetails/);
 assert.match(source,/lo126TotalsDetails/);
 assert.match(source,/lo126QuickMore/);
 assert.match(css,/#lo126WeekChart/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(css,/focus-visible/);
 assert.match(css,/var\(--lo121-prayer\)/);
 assert.match(html,/src="personal_track_design_v126\.js"/);
 assert.match(html,/href="personal_track_design_v126\.css"/);
 assert.match(server,/'personal_track_design_v126\.js'/);
});
test('scripts parse and Track design has no record mutation methods',()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.doesNotMatch(source,/\b(?:saveSession|finishSession|deleteSession|updateSession|persistWorkspace)\s*\(/);
});
