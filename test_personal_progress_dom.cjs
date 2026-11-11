/* Regression: the personal progress renderer must have a target element
   and load its module before the main inline application script. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const element = /\bid=["']personalProgressSummary["']/g;
assert.equal([...html.matchAll(element)].length, 1, 'personalProgressSummary must exist exactly once');
assert.match(html, /\bid=["']personalLogSummary["']/, 'personal log summary should remain available');
assert.match(html, /<script\s+src=["']personal_progress\.js["']\s*><\/script>/, 'personal progress module must be loaded');
assert.ok(html.indexOf('personal_progress.js') < html.indexOf('function renderPersonalLogs()'), 'module must load before renderer');
const progress = require('./personal_progress.js');
assert.equal(typeof progress.summarize, 'function');
const result = progress.summarize([], '2026-11-01', '2026-11-07');
assert.ok(result && result.sleep && result.quran, 'empty personal logs must be supported');
console.log('Personal progress DOM/module regression: PASS');
