/* Deterministic local sync fault simulator. No network or production writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSRecoverySimulator=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const canon=x=>JSON.stringify(sort(x));
function sort(x){if(Array.isArray(x))return x.map(sort);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])]));return x;}
function create(initial){return {remote:{revision:0,data:clone(initial)},clients:{}};}
function client(sim,name){if(!sim.clients[name])sim.clients[name]={baseRevision:sim.remote.revision,local:clone(sim.remote.data),queue:[],conflict:false};return sim.clients[name];}
function edit(sim,name,id,mutate){const c=client(sim,name);if(c.queue.some(e=>e.id===id))throw Error('Duplicate operation ID');const next=clone(c.local);mutate(next);c.local=next;c.queue.push({id,snapshot:clone(next)});return c;}
function sync(sim,name,{fail='none'}={}){const c=client(sim,name);if(!c.queue.length)return {status:'idle'};
 const head=c.queue[0];if(canon(sim.remote.data)===canon(head.snapshot)){c.baseRevision=sim.remote.revision;c.queue.shift();return {status:'acknowledged-after-timeout'};}
 if(c.baseRevision!==sim.remote.revision){c.conflict=true;return {status:'conflict',localPreserved:true};}
 if(fail==='before-commit')return {status:'offline',localPreserved:true};
 sim.remote={revision:sim.remote.revision+1,data:clone(head.snapshot)};
 if(fail==='after-commit')return {status:'uncertain',localPreserved:true};
 c.baseRevision=sim.remote.revision;c.queue.shift();return {status:'committed'};
}
function reconnect(sim,name){const c=client(sim,name);if(c.queue.length)return sync(sim,name);c.baseRevision=sim.remote.revision;c.local=clone(sim.remote.data);return {status:'refreshed'};}
function exportRecovery(sim,name){return clone({remote:sim.remote,client:client(sim,name)});}
return {create,client,edit,sync,reconnect,exportRecovery};
});
