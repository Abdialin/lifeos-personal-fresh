'use strict';
const assert=require('node:assert/strict');
const g=require('./personal_duration_guard_v78.js');
const p=require('./personal_duration_profiles_v80.js');
const t=Date.UTC(2026,10,15,1),MIN=60000;
assert.equal(p.category('Fajr prayer'),'fajr');
assert.equal(p.category('Dhuhr prayer'),'dhuhr');
assert.equal(p.category('Asr prayer'),'asr');
assert.equal(p.category('Maghrib prayer'),'maghrib');
assert.equal(p.category('Isha prayer'),'isha');
assert.equal(p.category('Quran memorization'),'quran');
assert.equal(p.category('Gym'),'gym');
assert.equal(p.category('Security shift'),'work');
assert.equal(p.category('Study assignment'),'study');
assert.equal(p.category('Miscellaneous'),'other');
assert.equal(p.validProfile({minutes:30}).minutes,30);
assert.equal(p.validProfile({minutes:0}),null);
assert.equal(p.validProfile({minutes:1500}),null);
assert.equal(p.validProfile({minutes:'30'}),null);
assert.equal(p.clean({fajr:{minutes:35},quran:{minutes:80},unknown:{minutes:45}}).unknown,undefined);
assert.equal(p.effective('Fajr prayer',{fajr:{minutes:40}},g).minutes,40);
assert.equal(p.effective('Fajr prayer',{},g).minutes,30);
const store={getItem(){return JSON.stringify({fajr:{minutes:40},gym:{minutes:90}})}};
assert.equal(p.settingsForNew('Fajr prayer',store,t).targetMinutes,40);
assert.equal(p.settingsForNew('Fajr prayer',store,t).mode,'warn');
assert.equal(p.settingsForNew('Fajr prayer',store,t).source,'saved-duration-profile-v80');
assert.equal(p.settingsForNew('Dhuhr prayer',store,t),null,'no unapproved copy from Fajr');
assert.equal(p.settingsForNew('Fajr prayer',{getItem(){throw Error('storage unavailable')}},t),null);
const sessions=[
 {id:'a',name:'Fajr prayer',status:'running',segments:[{start:t-7*60*MIN,end:null}]},
 {id:'b',name:'Gym',status:'running',segments:[{start:t-120*MIN,end:null}]},
 {id:'c',name:'Quran',status:'paused',segments:[{start:t-120*MIN,end:t-60*MIN}]},
 {id:'d',name:'Study',status:'finished',segments:[{start:t-120*MIN,end:t-60*MIN}]}
];
const results=p.forgotten(sessions,t,{fajr:{minutes:40},gym:{minutes:90}},g);
assert.equal(results.length,2);
assert.equal(results[0].id,'a');
assert.equal(results[0].expectedMinutes,40);
assert.equal(results[0].overdueMs,(7*60-40)*MIN);
assert.equal(results[1].id,'b');
assert.equal(p.forgotten([],t,{},g).length,0);
console.log('V80: 28 duration profile and overdue timer assertions passed');
