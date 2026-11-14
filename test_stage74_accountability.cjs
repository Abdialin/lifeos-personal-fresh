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
const debt=m.debtReport({sessions,schedule},now);
assert.equal(debt.confirmedCount,2);
assert.equal(debt.totalMs,2*h);
assert.equal(debt.unverifiedCount,1);
assert.equal(debt.confirmed.some(x=>x.id==='future'),false);
assert.equal(debt.unverified[0].reason,'completion-unverified');
assert.equal(m.debtReport({sessions:[],schedule:[schedule[1]]},now).confirmedCount,0);
assert.equal(m.duration({status:'running',segments:[{start:base,end:null}]},now),2*h);
assert.equal(m.fmt(3660000),'1h 01m');
assert.equal(m.CATEGORIES.includes('Social media'),true);
console.log('V74: 16/16 distraction/debt assertions passed.');
