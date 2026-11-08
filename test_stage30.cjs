const assert=require('node:assert/strict'),fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
for(const feature of ['function undoCalendarAudit(id)','function renderCalendarAudit()','function recordCalendarDecision(entry)','calendarAuditHistory','calendarAuditExport','calendarPlanSnapshot(plan)','if(!recordCalendarDecision(entry))','if(!persist()){Object.assign(plan,current)'])assert(html.includes(feature),feature);
assert(html.indexOf('if(!recordCalendarDecision(entry))')<html.indexOf('queue.splice(index,1)'));
assert(html.includes('JSON.stringify(calendarPlanSnapshot(plan))!==JSON.stringify(entry.after)'));
console.log('Stage 30 audit/undo static regression passed');
