const fs=require('fs'),assert=require('assert'),vm=require('vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const source=html.match(/function goalProgress\(g,begin,end\)\{[\s\S]*?\n\}/)[0];
// The extracted function runs in a browser and consults its optional evidence
// module. Provide the browser global so the fallback remains testable in Node.
const context={window:{},data:{personalLogs:[{date:'2026-11-02',category:'Quran',quantity:2},{date:'2026-11-03',category:'Quran',quantity:null},{date:'2026-11-04',category:'Sleep',quantity:9},{date:'2026-11-09',category:'Quran',quantity:3}],sessions:[],workouts:[]},fitnessGoalRecords:()=>[]};
vm.createContext(context);vm.runInContext(source+';this.goalProgress=goalProgress',context);
const a=new Date('2026-11-02T00:00:00').getTime(),b=new Date('2026-11-09T00:00:00').getTime();
assert.equal(context.goalProgress({category:'personal',match:'quran',unit:'sessions'},a,b),2);
assert.equal(context.goalProgress({category:'personal',match:'Quran',unit:'quantity'},a,b),2);
assert.equal(context.goalProgress({category:'personal',match:'Sleep',unit:'sessions'},a,b),1);
assert.equal(context.goalProgress({category:'personal',match:'Quran',unit:'quantity'},b,b+7*86400000),3);
let measured;
context.window.lifeosReadOnlyWorkspace=()=>context.data;
context.window.LifeOSGoalEvidenceV175={measure:(goal,workspace,begin,end)=>{measured={goal,workspace,begin,end};return {value:17}}};
const goal={category:'personal',match:'Quran',unit:'quantity'};
assert.equal(context.goalProgress(goal,a,b),17,'Shared evidence must take precedence when available');
assert.deepEqual(measured,{goal,workspace:context.data,begin:a,end:b});
assert(html.includes('value="personal"'));assert(html.includes('value="quantity"'));
console.log('8 personal goal integration checks passed');
