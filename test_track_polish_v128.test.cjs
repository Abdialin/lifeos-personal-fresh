const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('personal_track_polish_v128.js','utf8');
const css=fs.readFileSync('personal_track_polish_v128.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const server=fs.readFileSync('server.py','utf8');
const api=require('./personal_track_polish_v128.js');
test('duration formatting supports hour and minute presentation',()=>{
 assert.equal(api.nums('3h 29m'),209);assert.equal(api.nums('1h 07m'),67);
 assert.equal(api.nums('00:00'),0);assert.equal(api.nums('0m'),0);
});
test('original active session list remains accessible but no longer duplicated by default',()=>{
 assert.match(source,/lo128SessionsDetails/);
 assert.match(source,/d\.append\(sessions\)/);
 assert.match(source,/d\.hidden=n<1/);
 assert.match(source,/lo126-protected/);
 assert.doesNotMatch(source,/cloneNode/);
});
test('distraction details only move old nodes and preserve original one-tap controls',()=>{
 assert.match(source,/lo128DistractionDetails/);
 assert.match(source,/p\.append\(d\)/);
 assert.match(source,/d\.append\(node\)/);
 assert.match(source,/\.head,\.row,\.note/);
 assert.match(html,/id="distractionToggle"/);
});
test('tracking summary uses actual unique and concurrent durations and visually separates them',()=>{
 assert.match(source,/lo128-time-visual/);
 assert.match(source,/denominator>0/);
 assert.match(source,/unique\/denominator\*100/);
 assert.match(source,/lo128-ring-number/);
 assert.match(css,/conic-gradient/);
 assert.match(css,/lo128-time-legend/);
});
test('Quick Start uses category-specific icon backgrounds without modifying button actions',()=>{
 assert.match(source,/button\.dataset\.lo126Category=cat/);
 assert.match(source,/lo128-tile/);
 assert.match(css,/lo-quick-glyph svg/);
 for(const c of ['work','learning','spiritual','fitness','food','distraction'])assert.ok(css.includes('[data-lo126-category="'+c+'"]'),c);
 assert.doesNotMatch(source,/\.onclick\s*=/);
});
test('history keeps search and editing, chart is collapsed initially and responsive',()=>{
 assert.match(source,/lo127WeekDetails/);
 assert.match(source,/chart\.open=false/);
 assert.match(html,/id="loHistorySearch"/);
 assert.match(html,/id="loHistoryPeriod"/);
 assert.match(css,/@media\(max-width:410px\)/);
});
test('new assets are parseable, wired, allowlisted and read-only',()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.match(html,/src="personal_track_polish_v128\.js"/);
 assert.match(html,/href="personal_track_polish_v128\.css"/);
 assert.match(server,/'personal_track_polish_v128\.js'/);
 assert.match(server,/'personal_track_polish_v128\.css'/);
 assert.doesNotMatch(source,/localStorage\.setItem|saveSession\(|deleteSession\(|finishSession\(/);
});
