// Ensure every local JavaScript reference is served by the Python static-asset route.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const server=fs.readFileSync(path.join(root,'server.py'),'utf8');
const match=server.match(/path\.lstrip\('\/'\) in \(([^\n]+)\):/);
assert.ok(match,'Cannot find server.py JavaScript allowlist');
const allowed=new Set([...match[1].matchAll(/'([^']+)'/g)].map(m=>m[1]));
let checked=0;
for(const page of ['index.html','calendar.html']){
 const html=fs.readFileSync(path.join(root,page),'utf8');
 for(const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)){
  const src=m[1];if(/^(https?:)?\/\//i.test(src))continue;
  const asset=src.split(/[?#]/)[0].replace(/^\//,'');
  assert.ok(!asset.includes('..'),'Unsafe script path: '+src);
  assert.ok(fs.existsSync(path.join(root,asset)),page+': missing '+asset);
  assert.ok(allowed.has(asset),page+': route not allowlisted: '+asset);
  checked++;
 }
}
assert.ok(checked>0,'No local scripts detected');
for(const essential of ['lifeos_unified_analytics.js','personal_dashboard_live.js','personal_visual_intelligence_v4.js'])assert.ok(allowed.has(essential),'Critical script not allowlisted: '+essential);
console.log('Static asset route regression PASS ('+checked+' script references checked)');
