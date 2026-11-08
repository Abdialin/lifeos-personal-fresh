const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes("fetch('/api/calendar/commit'"));
assert(html.includes("sameSnapshot(remote.data,entry.snapshot)"));
assert(html.includes('snapshot.calendarAuditPending.filter(d=>d.id!==decision.id)'));
assert(html.includes('never write calendar audit separately'));
console.log('Stage 35 client atomic routing checks passed');
