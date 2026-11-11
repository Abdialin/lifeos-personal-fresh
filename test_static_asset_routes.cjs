// Regression guard: every local script referenced by the UI must be served by server.py.
// Read-only source check; no production services, credentials or user data required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const server = fs.readFileSync(path.join(root, 'server.py'), 'utf8');
const allowlist = server.match(/path\.lstrip\('\/'\) in \(([^\n]+)\):/);
assert.ok(allowlist, 'Cannot locate server.py static asset allowlist');
const allowed = new Set([...allowlist[1].matchAll(/'([^']+)'/g)].map(m => m[1]));
let checked = 0;
for (const page of ['index.html', 'calendar.html']) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  for (const match of html.matchAll(/<script\\b[^>]*\\bsrc=["']([^"']+)["']/gi)) {
    const src = match[1];
    if (/^(https?:)?\\/\\//i.test(src)) continue;
    const asset = src.split(/[?#]/)[0].replace(/^\\//, '');
    assert.ok(!asset.includes('..'), 'Unsafe script path: ' + src);
    assert.ok(fs.existsSync(path.join(root, asset)), page + ': missing script ' + asset);
    assert.ok(allowed.has(asset), page + ': script not served by server.py: ' + asset);
    checked++;
  }
}
assert.ok(checked > 0, 'No local script references found');
for (const essential of ['lifeos_unified_analytics.js', 'personal_dashboard_live.js', 'personal_visual_intelligence_v4.js']) {
  assert.ok(allowed.has(essential), 'Critical visual script not allowlisted: ' + essential);
}
console.log('Static asset route regression PASS (' + checked + ' script references checked)');
