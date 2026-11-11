const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
assert.equal((html.match(/src="lifeos_unified_analytics\.js"/g)||[]).length,1,'analytics module should be loaded once');
assert.equal((html.match(/id="personalProgressSummary"/g)||[]).length,1,'progress summary target should exist once');
assert.equal((html.match(/id="lifeos-mobile-consolidation"/g)||[]).length,1,'mobile stylesheet should exist once');
const main=html.indexOf('function renderPersonalLogs()');
assert.ok(main>0&&html.indexOf('src="lifeos_unified_analytics.js"')<main,'analytics module must load before main app');
console.log('LifeOS integration smoke test: PASS');
