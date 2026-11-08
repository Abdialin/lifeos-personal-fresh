const assert=require('node:assert/strict');const t=require('./live_tracking_v2.js');
function ws(){return {sessions:[{id:'a',name:'Study',status:'running',startAt:100,segments:[{start:100,end:null}]}],events:[]}}
let w=ws(),n=t.switchActivity(w,'a','Gym',200,'b');assert.equal(w.sessions[0].segments[0].end,200);assert.equal(w.sessions[0].status,'finished');assert.equal(n.switchedFrom,'a');assert.equal(n.status,'running');assert.equal(w.events.length,2);assert.equal(t.summarizeOpen(w).length,1);
w=ws();assert.throws(()=>t.switchActivity(w,'a','Gym',99,'b'));assert.equal(w.sessions.length,1);assert.equal(w.sessions[0].status,'running');
w=ws();w.sessions[0].status='paused';w.sessions[0].segments[0].end=150;t.switchActivity(w,'a','Walk',200,'b');assert.equal(w.sessions[0].segments[0].end,150);assert.equal(w.sessions[0].endAt,200);
w=ws();assert.throws(()=>t.switchActivity(w,'a','',200,'b'));assert.throws(()=>t.switchActivity(w,'a','Gym',200,'a'));assert.deepEqual(t.sessionQuality({status:'finished',segments:[{start:1,end:null}]}),['unfinished-segment']);
console.log('Live Tracking V2: 8 assertions groups passed');
