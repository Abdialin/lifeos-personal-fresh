/* LifeOS V85 — resumable and conservative onboarding draft storage.
 * Drafts are preferences and proposals, NEVER actual sessions. Stored only in
 * this device's browser until approved. No automatic import or plan writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSOnboardingResumeV85=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const KEY='lifeos.personal.onboarding.draft.v85',VERSION=1,MAX_BYTES=35000;
function valid(d){
 if(!d||d.version!==VERSION||!Number.isInteger(d.step)||d.step<0||d.step>3||!d.draft||typeof d.draft!=='object')return false;
 const {routines,habits,tasks}=d.draft;
 if(!Array.isArray(routines)||!Array.isArray(habits)||!Array.isArray(tasks)||routines.length>20||habits.length>20||tasks.length>30)return false;
 if(!routines.every(r=>r&&typeof r.name==='string'&&r.name.length<=80&&/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)&&Number.isInteger(r.minutes)&&r.minutes>=5&&r.minutes<=720&&Array.isArray(r.days)&&r.days.length>=1&&r.days.every(x=>Number.isInteger(x)&&x>=0&&x<=6)))return false;
 if(!habits.every(h=>h&&typeof h.title==='string'&&h.title.trim()&&h.title.length<=80&&Number.isInteger(h.everyDays)&&h.everyDays>=1&&h.everyDays<=30))return false;
 if(!tasks.every(t=>t&&typeof t.name==='string'&&t.name.trim()&&t.name.length<=80))return false;
 return true;
}
function save(store,draft,step,at=Date.now()){
 const snapshot={version:VERSION,step,draft:{routines:draft?.routines||[],habits:draft?.habits||[],tasks:draft?.tasks||[]},updatedAt:at};
 if(!valid(snapshot))return {ok:false,reason:'Invalid onboarding draft.'};
 const raw=JSON.stringify(snapshot);if(raw.length>MAX_BYTES)return {ok:false,reason:'Draft is too large.'};
 try{store.setItem(KEY,raw);return {ok:true}}catch{return {ok:false,reason:'Browser could not save your onboarding draft.'}}
}
function read(store){
 try{const raw=store.getItem(KEY);if(!raw)return {ok:false,reason:'No saved draft'};
 if(raw.length>MAX_BYTES)return {ok:false,reason:'Draft too large'};
 const saved=JSON.parse(raw);return valid(saved)?{ok:true,step:saved.step,draft:JSON.parse(JSON.stringify(saved.draft)),updatedAt:saved.updatedAt}:{ok:false,reason:'Draft format invalid'};}
 catch{return {ok:false,reason:'Draft unavailable'}}
}
function clear(store){try{store.removeItem(KEY);return true}catch{return false}}
function signature(review){
 if(!review?.ok)return null;
 return JSON.stringify({
 plans:review.plans?.map(p=>[p.name,p.startAt,p.endAt,p.source]),
 blocked:review.blocked?.map(p=>[p.name,p.startAt,p.endAt,p.reason]),
 habits:review.habits?.map(x=>[x.title,x.everyDays]),
 tasks:review.tasks?.map(x=>[x.name])
 });
}
function sameReview(a,b){return signature(a)!==null&&signature(a)===signature(b)}
return {KEY,valid,save,read,clear,signature,sameReview};
});
