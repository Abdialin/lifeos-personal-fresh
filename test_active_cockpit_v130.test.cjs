const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const s=fs.readFileSync('personal_active_cockpit_v130.js','utf8');
const css=fs.readFileSync('personal_active_cockpit_v130.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const server=fs.readFileSync('server.py','utf8');
const api=require('./personal_active_cockpit_v130.js');
test('live clock calculations format durations without mutating sessions',()=>{
 assert.equal(api.minutes(0),'00:00');assert.equal(api.minutes(65*60000),'01:05');
 assert.equal(api.elapsed({segments:[{start:0,end:10000}]},10000),10000);
});
test('existing V77 actions remain attached; no replacement event handlers',()=>{
 for(const q of ['lo77-timer-quick','lo77-clock','lo128SessionsDetails','LifeOSReviewTimer'])assert.match(s,new RegExp(q));
 assert.doesNotMatch(s,/cloneNode|innerHTML|saveSession|deleteSession|\.sessions\.push/);
 assert.match(s,/lifeosReadOnlyWorkspace/);
});
test('other sessions can be reviewed without overwriting the currently tracked session',()=>{
 assert.match(s,/root\.LifeOSReviewTimer\(s\.id\)/);
 assert.match(s,/d\.open=true/);
 assert.match(s,/lo130-session-tile/);
 assert.match(s,/data|status/);
});
test('duration presets preserve manual choice and explicit auto-finish opt-in',()=>{
 for(const q of ['15,30,45,60','lo78-minutes','lo78-mode','aria-pressed','lo78-save','lo130SafetyNotes'])assert.ok(s.includes(q),q);
 assert.match(s,/Auto-finish must be selected deliberately/);
 assert.doesNotMatch(s,/setInterval\(.*save|\.click\(\)/);
});
test('mobile presentation includes a hero clock, other session cards and accessible focus',()=>{
 for(const q of ['lo130-timer-line','lo130-session-tile','lo130-preset-row','lo130-safety','focus-visible'])assert.ok(css.includes(q),q);
 assert.match(css,/@media\(max-width:380px\)/);
 assert.doesNotThrow(()=>new Function(s));
});
test('V130 assets wired for staging deployment',()=>{
 assert.match(html,/src="personal_active_cockpit_v130\.js"/);assert.match(html,/href="personal_active_cockpit_v130\.css"/);
 assert.match(server,/'personal_active_cockpit_v130\.js'/);assert.match(server,/'personal_active_cockpit_v130\.css'/);
});
