const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('personal_today_hero_v125.css','utf8');
const server=fs.readFileSync('server.py','utf8');
test('preserves all four live metric targets and underlying progress renderer',()=>{
 for(const id of ['todayRecorded','todayUnique','todayActive','todayTasks','todayFocus','loTodayProgress','todayTimerSignal'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/function renderTodayProgress\(\)/);
 assert.match(html,/function renderTodayActivityHistory\(\)/);
});
test('one primary action with compact Plan and Task navigation',()=>{
 assert.match(html,/class="lo125-main-action" data-today-jump="tracking"/);
 assert.match(html,/class="lo125-secondary-action" data-today-jump="schedule"/);
 assert.match(html,/class="lo125-secondary-action" data-today-jump="goals"/);
 assert.match(css,/\.today-actions\{\s*display:grid;grid-template-columns:/);
 assert.match(css,/grid-column:auto/);
});
test('plan evidence is available inside native details without duplicating the hero',()=>{
 assert.match(html,/<details class="lo125-progress-details" id="lo125ProgressDetails">/);
 assert.match(html,/Progress & tracking details/);
 assert.match(html,/id="loTodayProgress"/);
 assert.match(html,/Unlogged time is unknown, not automatically a distraction/);
 assert.match(css,/lo125-progress-details\[open\]/);
});
test('mobile responsive styling and route are valid',()=>{
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(max-width:375px\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/:focus-visible/);
 assert.match(html,/href="personal_today_hero_v125\.css"/);
 assert.match(server,/'personal_today_hero_v125\.css'/);
});
