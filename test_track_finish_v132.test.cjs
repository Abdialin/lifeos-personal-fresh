const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('personal_track_finish_v132.js','utf8');
const style=fs.readFileSync('personal_track_finish_v132.css','utf8');
const html=fs.readFileSync('index.html','utf8'),server=fs.readFileSync('server.py','utf8');
const api=require('./personal_track_finish_v132.js');
test('durations parse both display and clock formats',()=>{
 assert.equal(api.parseDuration('5h 10m'),310);
 assert.equal(api.parseDuration('2h 07m'),127);
 assert.equal(api.parseDuration('37m'),37);
 assert.equal(api.parseDuration('02:07'),127);
 assert.equal(api.parseDuration('00:24:30'),24.5);
 assert.equal(api.parseDuration('—')===api.parseDuration('—'),false);
});
test('very long prayer and generic sessions flagged without marking normal sessions',()=>{
 assert.equal(api.suspicious('Dhuhr prayer',469),true);
 assert.equal(api.suspicious('Asr prayer',469),true);
 assert.equal(api.suspicious('Fajr prayer',37),false);
 assert.equal(api.suspicious('Quran memorization',64),false);
 assert.equal(api.suspicious('Security shift',540),false);
 assert.equal(api.suspicious('Security shift',1500),true);
});
test('archive controls preserved and original detail/edit dispatched',()=>{
 assert.match(source,/\.lo-history-item/);assert.match(source,/\.lo-history-actions/);
 assert.match(source,/\[data-act="details"\]/);
 assert.match(source,/\.click\(\)/);
 assert.doesNotMatch(source,/\.sessions\.push|\.sessions\.splice|saveSession\(|deleteSession\(|localStorage\.setItem/);
});
test('ring uses visible real metrics, and chart is accessible',()=>{
 assert.match(source,/lo128-time-ring/);assert.match(source,/lo128-ring-number/);
 assert.match(source,/unique\/denom\*100/);assert.match(source,/setAttribute\('role','img'\)/);
});
test('design is responsive, loaded and accessible',()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.match(style,/@media\(max-width:390px\)/);
 assert.match(style,/focus-visible/);
 assert.match(html,/personal_track_finish_v132\.js/);
 assert.match(html,/personal_track_finish_v132\.css/);
 assert.match(server,/'personal_track_finish_v132\.js'/);
 assert.match(server,/'personal_track_finish_v132\.css'/);
});
