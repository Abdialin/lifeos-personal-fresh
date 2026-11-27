const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const reminder=fs.readFileSync('personal_reminder_experience_v16.js','utf8');
const css=fs.readFileSync('personal_today_upcoming_v124.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const server=fs.readFileSync('server.py','utf8');
test('upcoming code parses and keeps historic plans out of Next Up',()=>{
 assert.doesNotThrow(()=>new Function(reminder));
 assert.match(reminder,/const future=items\.filter\(x=>status\(x,current\)\.level!=='past'\)/);
 assert.match(reminder,/const past=items\.filter\(x=>status\(x,current\)\.level==='past'\)/);
 assert.match(reminder,/if\(future\.length\)nextGroup\.append\(makeRow\(future\[0\],true\)\)/);
 assert.match(reminder,/lo124-review/);
});
test('future commitments form a chronological ladder with expandable remainder',()=>{
 assert.match(reminder,/sort\(\(a,b\)=>a\.start-b\.start\)/);
 assert.match(reminder,/lo124-ladder/);
 assert.match(reminder,/lo124-node/);
 assert.match(reminder,/lo124-more/);
 assert.match(reminder,/Show .* more upcoming/);
 assert.match(reminder,/expandedMore/);
});
test('notification controls and click-to-plan remain',()=>{
 assert.match(reminder,/Notification\.requestPermission/);
 assert.match(reminder,/row\.addEventListener\('click',\(\)=>go\(x\)\)/);
 assert.match(reminder,/if\(x\.remind&&x\.start-current<=10\*MIN/);
 assert.doesNotMatch(reminder,/data\.schedule\s*=/);
});
test('touch friendly styling and no tiny wrapping sort button',()=>{
 assert.match(css,/lo124-featured/);
 assert.match(css,/lo124-review-items/);
 assert.match(css,/lo123-sort\{min-width:112px/);
 assert.match(css,/@media\(max-width:480px\)/);
 assert.match(css,/focus-visible/);
 assert.match(server,/'personal_today_upcoming_v124\.css'/);
 assert.match(html,/href="personal_today_upcoming_v124\.css(?:\?[^"\s]*)?"/);
});
