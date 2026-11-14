'use strict';
const assert=require('node:assert/strict'),v=require('./personal_import_review_v82.js');
const now=Date.UTC(2026,10,15,10),H=3600000;
const schedule=[{id:'a',name:'Work',startAt:now+H,endAt:now+3*H,status:'planned',calendarKey:'old',calendarSource:'ics-import'}];
const good={format:v.KEY,candidates:[
{key:'new',name:'Study',source:'ics-import',startAt:now+2*H,endAt:now+4*H},
{key:'old',name:'Work',source:'ics-import',startAt:now+H,endAt:now+3*H},
{key:'other',name:'Gym',source:'google',startAt:now+5*H,endAt:now+6*H}
]};
assert.equal(v.inspect(null,{schedule},now).state,'empty');
assert.equal(v.inspect('{',{},now).state,'invalid');
assert.equal(v.inspect(JSON.stringify({...good,format:'bad'}),{},now).state,'invalid');
assert.equal(v.inspect(JSON.stringify({...good,candidates:[{...good.candidates[0],endAt:now}]}),{},now).state,'invalid');
assert.equal(v.inspect(JSON.stringify({...good,candidates:[{...good.candidates[0],source:'manual'}]}),{},now).state,'invalid');
const report=v.inspect(JSON.stringify(good),{schedule},now);
assert.equal(report.state,'ready');
assert.equal(report.count,3);
assert.equal(report.eligible,2);
assert.equal(report.duplicates,1);
assert.equal(report.conflicts,1);
assert.equal(report.items.find(x=>x.key==='old').duplicate,true);
assert.equal(report.items.find(x=>x.key==='new').conflict,true);
assert.equal(report.items.find(x=>x.key==='other').conflict,false);
assert.equal(v.inspect(JSON.stringify({...good,candidates:Array.from({length:101},(_,i)=>({...good.candidates[0],key:String(i)}))}),{},now).state,'invalid');
const week=v.firstWeek({schedule},now);
assert.equal(week.plans.length,1);
assert.equal(week.imported,1);
assert.equal(week.tracked,0);
assert.equal(week.planned,1);
assert.equal(v.firstWeek({schedule:[{...schedule[0],status:'cancelled'}]},now).plans.length,0);
console.log('V82: 19/19 import and first-week checks passed.');
