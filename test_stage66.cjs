'use strict';
// V66 cross-module reliability regression. Run: node test_stage66.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const day=require('./personal_unified_activity_v53.js');
const timeline=require('./personal_activity_timeline_v54.js');
const intelligence=require('./personal_activity_intelligence_v55.js');
const predictor=require('./personal_predictive_preview_v56.js');
const reviewer=require('./personal_weekly_plan_review_v62.js');
const validator=require('./personal_planning_validation_v65.js');
const weekly=require('./personal_weekly_planning_v60.js');
const date='2026-11-14',start=new Date(date+'T00:00:00').getTime(),hour=3600000,now=start+18*hour;
const finished=(id,name,a,b,source)=>({id,name,status:'finished',startAt:a,endAt:b,segments:[{start:a,end:b}],source});
const sessions=[
 finished('real','Study',start+8*hour,start+10*hour,'local-web-app'),
 finished('import','Prayer',start+9*hour,start+10*hour,'historical-import'),
 finished('demo','Sample',start+11*hour,start+13*hour,'assumed-demo')
];
const plan={id:'plan',name:'Plan',startAt:start+9*hour,endAt:start+11*hour,status:'planned',sessionId:null};
const state={sessions,events:[{id:'event'}],schedule:[plan]};
const overview=day.buildDay(state,date,now),reality=timeline.build(state,date,now),metrics=intelligence.inspect(state,date,now,timeline);
assert.equal(overview.counts.historical,1,'historical import visible as real record');
assert.equal(overview.counts.sample,1,'synthetic example explicitly identified');
assert.equal(overview.counts.completed,2,'unverified example not counted completed');
assert.equal(timeline.classify(sessions[2]),'sample');
assert.equal(reality.stats.observedMs,2*hour,'overlapping actual sessions count once');
assert.equal(reality.stats.exampleCount,1);
assert.equal(metrics.actualMs,2*hour);
assert.equal(metrics.plannedMs,2*hour,'plans separate from actuals');
assert.equal(metrics.sampleCount,1);
assert.equal(predictor.credible(sessions[2]),false,'assumed sample excluded from prediction evidence');
assert.equal(predictor.credible(sessions[1]),true,'credible imported historical record eligible');
const target=start+14*hour;
const move=reviewer.preview(state,'plan',target,plan.startAt,plan.endAt,start+2*hour);
assert.equal(move.ok,true);
const updated={...state,schedule:[{...plan,startAt:target,endAt:target+2*hour}]};
assert.equal(validator.comparePlanVersions(state,updated,'plan').ok,true);
assert.equal(validator.verify(JSON.stringify({format:1,workspace:updated}),'plan',target,target+2*hour).ok,true);
assert.equal(validator.verify(JSON.stringify({format:2,blob:'encoded'}),'plan',target,target+2*hour,()=>({workspace:updated})).ok,true);
assert.equal(validator.verify('corrupt','plan',target,target+2*hour).ok,false);
assert.equal(reviewer.preview({...state,schedule:[{...plan,sessionId:'real'}]},'plan',target,plan.startAt,plan.endAt,start+2*hour).ok,false);
assert.equal(reviewer.preview({...state,schedule:[{...plan,startAt:plan.startAt+1}]},'plan',target,plan.startAt,plan.endAt,start+2*hour).ok,false);
assert.equal(state.schedule[0].startAt,plan.startAt,'preview must not mutate the original plan');
const future=new Date('2026-11-15T00:00:00').getTime();
const review=weekly.review({},start,{comparison:{compare(){return {error:null,range:{from:future,to:future+7*24*hour},plans:[{name:'Work',startAt:future+8*hour,endAt:future+13*hour},{name:'Study',startAt:future+12*hour,endAt:future+17*hour}],ideals:[],predictions:[],evidence:{confidence:'reviewable'}}}},predictor:{},planner:{},timeline:{}});
assert.equal(review.days.length,7);
assert.equal(review.days[0].plannedMs,9*hour,'weekly planned time is unique');
assert.equal(review.days[0].overlaps.length,1);
const index=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
assert.ok(index.includes('LifeOSPlanningValidationV65'),'both approval routes use canonical verification');
assert.ok(index.includes('lifeos-v65-plan-committed'),'in-tab commit notification emitted');
for(const file of ['personal_unified_activity_v53.js','personal_activity_timeline_v54.js','personal_activity_intelligence_v55.js','personal_predictive_preview_v56.js','personal_three_view_v57.js','personal_schedule_improvement_v59.js','personal_weekly_planning_v60.js','personal_weekly_recommendations_v61.js','personal_weekly_plan_review_v62.js','personal_planning_assistant_v63.js','personal_alternative_ranking_v64.js']){
 assert.ok(fs.readFileSync(require('node:path').join(__dirname,file),'utf8').includes('lifeos-v65-plan-committed'),file+' must refresh after a same-tab plan save');
}
console.log('V66: integrated activity, import, prediction, planning and checkpoint checks passed.');
