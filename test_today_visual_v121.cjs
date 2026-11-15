/* Today V121 visual design checks (node test_today_visual_v121.cjs).
 * Source-level only. No activity writes, no data migration or device access. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const file=x=>fs.readFileSync(x,'utf8');
const html=file('index.html');
const visual=file('personal_visual_intelligence_v4.js');
const reminders=file('personal_reminder_experience_v16.js');
const css=file('personal_today_visual_refresh_v121.css');
const server=file('server.py');
assert.doesNotThrow(()=>new Function(visual),'Timeline JavaScript should parse');
assert.doesNotThrow(()=>new Function(reminders),'Reminder JavaScript should parse');
assert.match(html,/href="personal_today_visual_refresh_v121\.css"/,'New stylesheet should load');
assert.match(server,/'personal_today_visual_refresh_v121\.css'/,'Stylesheet should be served');
assert.match(reminders,/lo124-next/,'Next-up area should be present');
assert.match(reminders,/lo124-more/,'Additional reminders should use progressive disclosure');
assert.match(reminders,/if\(future\.length\)nextGroup\.append\(makeRow\(future\[0\],true\)\)/,'Only future activity can be featured');
assert.match(reminders,/presentation===lastPresentation/,'Reminder refresh should preserve controls');
assert.match(visual,/lo121-time-composition/,'Unique versus overlap composition should render');
assert.match(visual,/todayCategory\(r\.name\)/,'Visual categories should be read-only');
assert.match(html,/data-lo121-category/,'Compact activity history should carry colors');
assert.match(css,/\.lo121-next-grid/,'Responsive cards must be styled');
assert.match(css,/@media\(max-width:540px\)/,'Mobile card layout must reflow');
assert.doesNotMatch(css,/animation:\s*infinite/,'No unnecessary perpetual animation');
console.log('Today V121 visual source checks PASS');
