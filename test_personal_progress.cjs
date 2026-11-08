const assert=require('node:assert/strict');const {summarize}=require('./personal_progress.js');
const logs=[
{category:'Quran',date:'2026-11-02',quantity:2,unit:'new pages'},
{category:'Quran',date:'2026-11-02',quantity:4,unit:'revision pages'},
{category:'Quran',date:'2026-11-03',quantity:1,unit:'pages'},
{category:'Sleep',date:'2026-11-02',minutes:420,precision:'measured'},
{category:'Sleep',date:'2026-11-03',minutes:480,precision:'estimated'},
{category:'Sleep',date:'2026-11-04',minutes:null,precision:'unknown'},
{category:'Sleep',date:'2026-10-20',minutes:100,precision:'measured'}];
const s=summarize(logs,'2026-11-01','2026-11-07');
assert.equal(s.quran.newPages,2);assert.equal(s.quran.revisionPages,4);assert.equal(s.quran.days,2);assert.equal(s.quran.uncategorizedLogs,1);assert.equal(s.sleep.measuredAverageMinutes,420);assert.equal(s.sleep.estimatedAverageMinutes,480);assert.equal(s.sleep.logs,3);assert.equal(s.sleep.measuredCount,1);assert.equal(summarize([], '2026-11-01','2026-11-07').sleep.measuredAverageMinutes,null);console.log('Personal progress: 9 checks passed');
