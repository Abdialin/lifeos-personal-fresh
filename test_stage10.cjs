const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const match=html.match(/function validateWorkspace\(d\)\{[\s\S]*?\n\}/);assert(match,'validator missing');
const validate=vm.runInNewContext('('+match[0]+')');
const base=()=>({version:1,sessions:[{id:'a',name:'Study',status:'finished',startAt:100,endAt:300,segments:[{start:100,end:300}]}],events:[]});
assert.doesNotThrow(()=>validate(base()));
for(const modify of [
 d=>d.sessions.push({...d.sessions[0]}),
 d=>d.sessions[0].segments[0].end=50,
 d=>d.sessions[0].segments[0].start=120,
 d=>d.sessions[0].status='running',
 d=>d.sessions[0].segments=[{start:100,end:null},{start:200,end:300}],
 d=>d.todos={},
 d=>d.sessions[0].endAt=null,
]){const d=base();modify(d);assert.throws(()=>validate(d));}
assert(html.includes('validateWorkspace(r.data)'),'server load must validate');
assert(html.includes('stopSync();if(!writeOutbox([]))return;' ),'restore must invalidate sync');
console.log('Stage 10 workspace integrity tests passed');
