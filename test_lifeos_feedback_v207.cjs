const assert=require('node:assert/strict'),fs=require('node:fs');
const s=fs.readFileSync('index.html','utf8');
assert.match(s,/function todaySessionMs\(s,t\)/);
assert.match(s,/reason==='break'\?'BREAK_START':'PAUSE'/);
assert.match(s,/data-act="break"/);
assert.match(s,/lifeos-v207-backfill-gap/);
assert.match(s,/Record by day:|Recorded by day:/);
assert.match(s,/Sunnah units prayed/);
for(const src of ['personal_gap_review_v207.js','personal_prayer_insights_v207.js']){
 assert.doesNotThrow(()=>new Function(fs.readFileSync(src,'utf8')));
 assert.ok(s.includes('src="'+src+'?'),'Missing script '+src);
}
console.log('V207 quick start, breaks, day split, gap review, prayer detail checks PASS');
