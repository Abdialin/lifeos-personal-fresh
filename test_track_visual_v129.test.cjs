const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('personal_track_visual_v129.js','utf8');
const css=fs.readFileSync('personal_track_visual_v129.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const server=fs.readFileSync('server.py','utf8');
const api=require('./personal_track_visual_v129.js');
test('duration labels are concise',()=>{assert.equal(api.fmt(0),'0m');assert.equal(api.fmt(165),'2h 45m');assert.equal(api.fmt(5),'5m')});
test('categories are distinct and consistently named',()=>{
 const names=['Business · App Development','Studying','Reading','Prayer','Quran','Fitness','Eating','Distraction','Sleep'];
 const expected=['work','learning','learning','spiritual','spiritual','fitness','food','distraction','sleep'];
 assert.deepEqual(names.map(api.cat),expected);
});
test('existing distraction reports and forms are preserved under progressive disclosure',()=>{
 assert.match(src,/lo129DistractionDeep/);
 assert.match(src,/deep\.append\(node\)/);
 assert.match(src,/deep\.append\(report\)/);
 assert.match(src,/lo94-period/);
 assert.match(src,/dispatchEvent\(new Event\('change'/);
 assert.doesNotMatch(src,/remove\(\)|cloneNode|localStorage\.setItem/);
});
test('read only analytics use existing evidence module, do not invent or modify records',()=>{
 assert.match(src,/LifeOSInsightsSuiteV94\?\.distraction/);
 assert.match(src,/lifeosReadOnlyWorkspace/);
 assert.match(src,/result\.daysSeries/);
 assert.match(src,/result\.totalMs/);
 assert.match(src,/Unlogged time/);
 assert.doesNotMatch(src,/saveSession|deleteSession|\.sessions\.push|workspace\.sessions\s*=/);
});
test('original quick-start SVG artwork is recolored using category-level tokens',()=>{
 assert.match(css,/\.lo-quick-glyph svg \*/);
 assert.match(css,/stroke:var\(--lo129-icon\)!important/);
 for(const v of ['work','learning','spiritual','fitness','sleep'])assert.match(css,new RegExp('data-lo129-category="'+v+'"'));
});
test('mobile visuals are semantic accessible and responsive',()=>{
 assert.match(css,/\.lo129-stat-grid/);assert.match(css,/\.lo129-mini-bars/);
 assert.match(css,/@media\(max-width:400px\)/);
 assert.match(src,/aria-pressed/);assert.match(src,/type='button'/);
 assert.doesNotThrow(()=>new Function(src));
});
test('V129 assets are deployed through HTML and allowlisted',()=>{
 assert.match(html,/src="personal_track_visual_v129\.js(?:\?[^"]+)?"/);
 assert.match(html,/href="personal_track_visual_v129\.css(?:\?[^"]+)?"/);
 assert.match(server,/'personal_track_visual_v129\.js'/);
 assert.match(server,/'personal_track_visual_v129\.css'/);
});
