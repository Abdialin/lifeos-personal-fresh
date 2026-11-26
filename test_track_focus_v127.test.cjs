const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('personal_track_focus_v127.js','utf8');
const css=fs.readFileSync('personal_track_focus_v127.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const server=fs.readFileSync('server.py','utf8');
const focus=require('./personal_track_focus_v127.js');
test('Track focus JS is parseable, user navigates across three distinct panes',()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.deepEqual(focus.MODES,['live','history','review']);
 for(const label of ['Live','History','Review'])assert.match(source,new RegExp("'"+label+"'"));
 assert.match(source,/role','tablist/);
 assert.match(source,/aria-selected/);
 assert.match(source,/ArrowLeft/);
});
test('existing timer, activity, history and past-edit nodes are moved rather than cloned',()=>{
 for(const id of ['trackActivePanel','trackQuickPanel','trackDistractionPanel','trackHistoryPanel','lo126PastDetails','lo126TotalsDetails','lo126TrackExtras'])
  assert.ok(source.includes("moveInto(live,'"+id+"')")||source.includes("moveInto(archive,'"+id+"')")||source.includes("moveInto(review,'"+id+"')"),id);
 assert.match(source,/target\.append\(item\)/);
 assert.doesNotMatch(source,/cloneNode|innerHTML\s*=/);
 assert.doesNotMatch(source,/localStorage|sessionStorage|data\.sessions\s*=/);
});
test('continuous Track scrolling is eliminated without hiding Plan or Insights',()=>{
 assert.match(css,/body\[data-lifeos-view="tracking"\] \.layout\{display:none!important\}/);
 assert.match(css,/body:not\(\[data-lifeos-view="tracking"\]\) #lo127TrackSurface\{display:none!important\}/);
 assert.match(css,/lo127-pane\[hidden\]\{display:none!important\}/);
 assert.match(css,/@media\(max-width:410px\)/);
 assert.match(css,/focus-visible/);
});
test('visible timer remains accessible while optional settings remain folded',()=>{
 assert.match(source,/lo86-timer/);
 assert.match(source,/lo126TrackExtras/);
 assert.match(source,/lo127-legacy-details/);
 assert.match(source,/if\(result==='review'\)collect\(\)/);
 assert.match(css,/#lo86-timer:not\(\[hidden\]\)/);
});
test('deployed and permitted as static files',()=>{
 assert.match(html,/href="personal_track_focus_v127\.css(?:\?[^"]+)?"/);
 assert.match(html,/src="personal_track_focus_v127\.js(?:\?[^"]+)?"/);
 assert.match(server,/'personal_track_focus_v127\.js'/);
 assert.match(server,/'personal_track_focus_v127\.css'/);
});
