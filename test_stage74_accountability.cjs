'use strict';
const assert=require('node:assert/strict');
const m=require('./personal_accountability_v74.js');
const h=3600000,now=20*h,base=now-2*h;
const sessions=[
{id:'a',name:'Distraction',status:'finished',segments:[{start:base,end:base+600000}],distractionCategory:'Social media'},
{id:'b',name:'Distraction',status:'finished',segments:[{start:base+1000000,end:base+1600000}],distractionCategory:'Social media'},
{id:'c',name:'Distraction',status:'finished',segments:[{start:base+1700000,end:base+3500000}],distractionCategory:'Entertainment'},
{id:'demo',name:'Distraction',source:'assumed-demo',status:'finished',segments:[{start:base,end:base+9000000}],distractionCategory:'Fake'},
{id:'work',name:'Gym',status:'finished',segments:[{start:base,end:base+h}]}
];
const schedule=[
{id:'skip',name:'Gym',startAt:base,endAt:base+h,status:'skipped'},
{id:'short',name:'Study',startAt:base,endAt:base+2*h,status:'started',sessionId:'work'},
{id:'unknown',name:'Meeting',startAt:base,endAt:base+h,status:'planned'},
{id:'future',name:'Future',startAt:now+h,endAt:now+2*h,status:'planned'}];
const d=m.distractionReport({sessions,schedule},now);
assert.equal(d.count,3);assert.equal(d.totalMs,3000000);
assert.equal(d.mostFrequent.category,'Social media');assert.equal(d.mostFrequent.count,2);
assert.equal(d.mostTimeConsuming.category,'Entertainment');assert.equal(d.mostTimeConsuming.totalMs,1800000);
assert.equal(d.ranking.some(x=>x.category==='Fake'),false);
assert.equal(m.distractionReport({sessions:[sessions[4]]},now).count,0);
assert.equal(m.distractionReport({sessions:[{...sessions[0],isExample:true}]},now).count,0,'Example distraction records are not evidence');
const classified=[
 {id:'manual',name:'Social feed',status:'finished',activityDetailsV252:{category:'Distraction'},segments:[{start:base,end:base+60000}]},
 {id:'corrected',name:'Distraction: lecture',status:'finished',activityType:'distraction',activityDetailsV252:{category:'University'},segments:[{start:base,end:base+60000}]},
 {id:'empty-nested',name:'Distraction',status:'finished',category:'University',activityDetailsV252:{category:' '},segments:[{start:base,end:base+60000}]},
 {id:'automatic',name:'Distraction',status:'finished',activityDetailsV252:{category:''},segments:[{start:base,end:base+60000}]},
 {id:'unknown',name:'Discussing distraction',status:'finished',segments:[{start:base,end:base+60000}]}
];
assert.deepEqual(m.distractionReport({sessions:classified},now).entries.map(x=>x.id),['manual','automatic'],'Explicit classifications take precedence, blank values allow recognition, and ambiguous names remain unknown');
globalThis.lifeosActivityClassification=s=>({group:s.id==='unknown'?'Distraction':'Other / review'});
try{assert.deepEqual(m.distractionReport({sessions:classified},now).entries.map(x=>x.id),['unknown'],'The shared browser classifier is authoritative when present')}finally{delete globalThis.lifeosActivityClassification}
const debt=m.debtReport({sessions,schedule},now);
assert.equal(debt.confirmedCount,2);
assert.equal(debt.totalMs,2*h);
assert.equal(debt.unverifiedCount,1);
assert.equal(debt.confirmed.some(x=>x.id==='future'),false);
assert.equal(debt.unverified[0].reason,'completion-unverified');
const examplePlans=[{...schedule[0],id:'example-skipped',status:'skipped',source:'development-starter'},{...schedule[0],id:'assumed-plan',status:'skipped',assumed:true},{...schedule[0],id:'example-plan',status:'skipped',isExample:true}];
assert.equal(m.debtReport({sessions:[],schedule:examplePlans},now).confirmedCount,0,'Example plans cannot become real recovery obligations');
assert.equal(m.debtReport({sessions:[{...sessions[4],isExample:true}],schedule:[schedule[1]]},now).unverifiedCount,1,'Example sessions cannot confirm a real plan shortfall');
assert.equal(m.debtReport({sessions:[sessions[4],{...sessions[4]}],schedule:[schedule[1]]},now).unverifiedCount,1,'Duplicate session IDs are ambiguous evidence');
assert.equal(m.debtReport({sessions:[{...sessions[4],endAt:now+h}],schedule:[schedule[1]]},now).unverifiedCount,1,'A future-dated finished timer cannot establish a shortfall');
assert.match(m.debtReport({sessions:[],schedule:[schedule[0],{...schedule[0],name:'Duplicate'}]},now).error,/share an identifier/,'Duplicate plan IDs make recovery review unavailable');
assert.match(m.debtReport({sessions:[],schedule:[schedule[0],{...schedule[0],endAt:null}]},now).error,/share an identifier/,'Even a malformed duplicate must block ambiguous recovery');
assert.match(m.debtReport({sessions:[],schedule:[{...schedule[0],id:null}]},now).error,/no identifier/,'A plan without an ID cannot be safely selected for recovery');
assert.match(m.debtReport({sessions:[],schedule:[{...schedule[0],id:12}]},now).error,/unsupported identifier/,'A non-string plan ID cannot be safely selected for recovery');
assert.equal(m.debtReport({sessions:[],schedule:[schedule[0],schedule[3],{...schedule[3]}]},now).confirmedCount,1,'Unrelated future duplicates do not block past-plan review');
assert.equal(m.debtReport({sessions:[],schedule:[schedule[0],{...schedule[0],id:null,startAt:now-9*24*h,endAt:now-9*24*h+h}]},now).confirmedCount,1,'An unrelated old plan without an ID does not block current review');
assert.equal(m.debtReport({sessions:[],schedule:[schedule[1]]},now).confirmedCount,0);
assert.equal(m.duration({status:'running',segments:[{start:base,end:null}]},now),2*h);
assert.equal(m.fmt(3660000),'1h 01m');
assert.equal(m.CATEGORIES.includes('Social media'),true);
console.log('V74: distraction/debt assertions and classification precedence passed.');
