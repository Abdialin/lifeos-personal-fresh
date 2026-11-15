/* V123 Today ladder source-level checks — run node --test test_today_ladder_v123.test.cjs */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('personal_today_ladder_v123.css','utf8'),server=fs.readFileSync('server.py','utf8');
test('chronological sort is newest-first with user-reversible order',()=>{
 assert.match(html,/let todayHistoryNewestFirst=true/);
 assert.match(html,/entries\.sort\(\(x,y\)=>todayHistoryNewestFirst\?\(y\.start-x\.start/);
 assert.match(html,/todayHistoryNewestFirst=!todayHistoryNewestFirst/);
 assert.match(html,/renderTodayActivityHistory\(\)/);
 assert.match(html,/aria-label.*Activity history sorted newest first/);
});
test('ladder keeps original interval evidence including overnight labels',()=>{
 assert.match(html,/class="lo-today-activity lo123-ladder-item"/);
 assert.match(html,/class="lo123-rail-dot"/);
 assert.match(html,/class="lo123-ladder-range"/);
 assert.match(html,/continued from yesterday/);
 assert.match(html,/continues into tomorrow/);
 assert.match(html,/Sample — not verified/);
 assert.match(html,/This can be legitimate multitasking/);
});
test('ladder retains progressive disclosure and accessibility',()=>{
 assert.match(html,/id="todayHistoryExpand"/);
 assert.match(html,/id="todayHistoryOrder"/);
 assert.match(css,/lo-today-activities:not\(\.lo-today-expanded\)/);
 assert.match(css,/lo-today-activities\.lo-today-expanded/);
 assert.match(css,/lo123-rail-time time/);
 assert.match(css,/@media\(max-width:410px\)/);
 assert.match(css,/:focus-visible/);
});
test('display-only visual change, served as static asset',()=>{
 assert.match(html,/personal_today_ladder_v123\.css/);
 assert.match(server,/'personal_today_ladder_v123\.css'/);
 assert.doesNotMatch(css,/position:\s*fixed|animation:\s*infinite/);
});
test('inline scripts are parseable',()=>{
 const matches=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
 for(const m of matches){if(m[1].trim())assert.doesNotThrow(()=>new Function(m[1]))}
});
