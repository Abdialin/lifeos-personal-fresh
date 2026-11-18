const assert=require('node:assert/strict'),api=require('./personal_cloud_parity_v210.js');
const workspace={version:1,sessions:[{id:'s1',name:'Work',segments:[{start:100,end:200}]}],events:[],schedule:[],todos:[],workouts:[],meals:[],goals:[],personalLogs:[],bodyMetrics:[],waterIntake:[],mealTemplates:[],habitDefinitions:[],habitChecks:[],friendShares:[],nutritionSettings:{}};
const clone=x=>JSON.parse(JSON.stringify(x));
assert.equal(api.compare(workspace,clone(workspace)).same,true);
const reordered=clone(workspace);reordered.sessions[0]={segments:[{end:200,start:100}],name:'Work',id:'s1'};
assert.equal(api.compare(workspace,reordered).same,true);
for(const key of ['sessions','schedule','events','workouts','meals','goals','habitChecks','todos']){
 const remote=clone(workspace);if(key==='sessions')remote.sessions[0].name='Changed';else remote[key].push({id:'added'});
 const result=api.compare(workspace,remote);
 assert.equal(result.same,false,key+' change must block cloud match');
 assert.ok(result.differences.some(x=>x.section===key),key+' difference should be reported');
}
const noNutrition=clone(workspace);delete noNutrition.nutritionSettings;assert.equal(api.compare(workspace,noNutrition).same,false);
const dup=clone(workspace);dup.sessions.push(clone(workspace.sessions[0]));assert.equal(api.compare(workspace,dup).same,false);
const unsaved=clone(workspace);unsaved.extraPreference={enabled:true};assert.equal(api.compare(workspace,unsaved).same,false);
const incomplete=clone(workspace);delete incomplete.meals;assert.equal(api.compare(workspace,incomplete).same,false);
assert.equal(api.compare(null,workspace).same,false);
console.log('V210 parity: all record types, schema gaps, duplicates, settings & metadata PASS');