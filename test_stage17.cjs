const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new Function(script);
assert(html.includes('id="adoptServerReviewed"'));
for(const fragment of ['function canAdoptReviewed(', 'function adoptReviewedServer(', "prompt('Type REPLACE LOCAL", 'sameSnapshot(data,preview.local)', 'remote.revision', 'exportRecovery();exportConflict();', 'syncSuppressed=true', 'if(!persist())throw', "$('adoptServerReviewed').addEventListener"]){assert(script.includes(fragment),fragment)}
assert(script.includes('!outboxCorrupt && !outbox.length && !syncMeta.dirty && !syncBusy'));
console.log('Stage 17 resolution safeguards and JS syntax passed');
