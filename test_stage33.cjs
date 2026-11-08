const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
for(const fragment of ['calendarAuditPending','function flushCalendarAudit()','/api/calendar/audit','serverAuditEntry(entry)','scheduleCalendarAuditUpload();','action:\'undo\'','if(!persist()){data.calendarAuditPending=old;return;}']) assert(html.includes(fragment),`Missing ${fragment}`);
assert(html.includes("if(outbox.length)break"));
console.log('Stage 33 client queue wiring checks passed (static checks).');
