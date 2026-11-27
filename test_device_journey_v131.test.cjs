const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const s=fs.readFileSync('personal_device_journey_v131.js','utf8');
const css=fs.readFileSync('personal_device_journey_v131.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const server=fs.readFileSync('server.py','utf8');
const api=require('./personal_device_journey_v131.js');
test('recovery journey status derives from original verification messages',()=>{
 const check=api.stateMessage;
 assert.equal(check('✓ PASS: The running timer advanced'),'pass');
 assert.equal(check('⚠ FAILED: Local checkpoint mismatch'),'fail');
 assert.equal(check('Baseline captured. Lock phone'),'ready');
 assert.equal(check('A previous test baseline is available in this tab'),'ready');
 assert.equal(check('Review: Less than 30 seconds have elapsed'),'review');
 assert.equal(check('No test baseline captured.'),'idle');
});
test('active clock is explicitly moved ahead of diagnostics and original nodes preserved',()=>{
 assert.match(s,/anchor\.after\(item\)/);
 assert.match(s,/lo77-timer-quick/);assert.match(s,/lo130OtherSessions/);
 assert.match(s,/repairCockpit/);
 assert.doesNotMatch(s,/cloneNode|innerHTML|\.sessions\.push|saveSession|deleteSession/);
});
test('check uses existing capture verify and clear native buttons',()=>{
 for(const id of ['lo73-capture','lo73-verify','lo73-clear','lo73-status','lo73-choice'])assert.ok(s.includes(id),id);
 assert.match(s,/MutationObserver/);assert.match(s,/Advanced recovery diagnostics/);
 assert.doesNotMatch(s,/\.click\(\)/);
});
test('mobile guided 3-step interface is concise and responsive',()=>{
 assert.match(s,/Choose timer/);assert.match(s,/Lock your phone/);assert.match(s,/Verify return/);
 assert.match(css,/lo131-step/);assert.match(css,/lo131-actions/);assert.match(css,/@media\(max-width:380px\)/);
 assert.doesNotThrow(()=>new Function(s));
});
test('stage scripts and styles are allowlisted',()=>{
 assert.match(html,/src="personal_device_journey_v131\.js(?:\?[^"\s]*)?"/);assert.match(html,/href="personal_device_journey_v131\.css(?:\?[^"\s]*)?"/);
 assert.match(server,/'personal_device_journey_v131\.js'/);assert.match(server,/'personal_device_journey_v131\.css'/);
});
