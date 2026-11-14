'use strict';
/* V71 staged source regression. No browser storage, network, or user data touched. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
assert.ok(scripts.length>0);
for(const script of scripts)new Function(script); // all inline scripts parse
assert.ok(html.includes('let v71ObservedCheckpoint=localStorage.getItem(ATOMIC_KEY),v71StaleTab=false'));
assert.ok(html.includes('event.key===ATOMIC_KEY||event.key===null'));
assert.ok(html.includes('function v71StopStaleTab()'));
assert.ok(html.includes('atomicBlocked=true;'));
assert.ok(html.includes('stopSync();'));
assert.ok(html.includes('v71CheckpointUnchanged(localStorage.getItem(ATOMIC_KEY))'));
assert.ok(html.includes('v71ObservedCheckpoint=serialized;'));
assert.ok(html.includes('v71ObservedCheckpoint=compactSerialized;'));
const guardSource=html.match(/function v71CheckpointUnchanged\(current\)\{[^}]*\}/)?.[0];
assert.ok(guardSource,'guard must be extractable');
const guard=new Function('last','stale','current',guardSource+';let v71ObservedCheckpoint=last,v71StaleTab=stale;return v71CheckpointUnchanged(current)');
assert.equal(guard('checkpoint-A',false,'checkpoint-A'),true);
assert.equal(guard('checkpoint-A',false,'checkpoint-B'),false);
assert.equal(guard(null,false,null),true,'first-use with no checkpoint is permitted');
assert.equal(guard('checkpoint-A',true,'checkpoint-A'),false,'stale flag refuses writes even if content later matches');
console.log('V71 stale-tab protection: all 14 source and guard checks passed.');
