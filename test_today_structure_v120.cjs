/* LifeOS Today UI V120: source-level regression checks. Run: node test_today_structure_v120.cjs */
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const timeline=fs.readFileSync('personal_visual_intelligence_v4.js','utf8');
const reminder=fs.readFileSync('personal_reminder_experience_v16.js','utf8');
assert.doesNotThrow(()=>new Function(timeline),'Timeline JavaScript must parse');
assert.doesNotThrow(()=>new Function(reminder),'Reminder JavaScript must parse');
assert.match(html,/id="todayLegacyOverviewPanel" data-lifeos-area="tracking"/,'Duplicate Today overview must belong to Track');
assert.match(html,/id="todayActivityHistoryPanel"/);
assert.match(html,/id="todayHistoryExpand"/);
assert.match(html,/\.lo-today-activities:not\(\.lo-today-expanded\)>\.lo-today-activity:nth-child\(n\+4\)/,'Collapsed history shows three rows');
assert.match(html,/share exactly the same time window/,'Timestamp collisions require an explicit warning');
assert.match(html,/continued from yesterday/,'Midnight clipping must be labelled precisely');
assert.match(timeline,/v4-lane-time/,'24-hour timeline should expose clock ranges');
assert.match(timeline,/Full 24-hour scale/,'Small midnight bars should be explained');
assert.match(reminder,/x\.start<t-10\*MIN/,'Old activities must not be labelled Due now');
assert.doesNotMatch(reminder,/const recent=result\.filter/,'Old newly created items must not be injected in upcoming feed');
assert.doesNotMatch(timeline,/localStorage\.setItem|\bpersist\s*\(/,'Today visuals must stay read only');
console.log('Today structure V120 source checks PASS');
