/* LifeOS Personal Management — deterministic helpers, no storage or network access. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSPersonalManagement=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TEMPLATES=Object.freeze([{name:'Review weekly priorities',priority:'normal',category:'Planning'},{name:'Study session',priority:'high',category:'Study'},{name:'Fitness session',priority:'normal',category:'Fitness'},{name:'Family check-in',priority:'normal',category:'Family'}]);
const FITNESS_TYPES=Object.freeze(['Gym','Walking','Running','Boxing','Cycling','Swimming','Yoga','Team sports','Other']);
function safeNumber(v){return v===null||v===undefined||v===''?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;}
function mealTotals(meals,date){const list=(Array.isArray(meals)?meals:[]).filter(m=>m&&m.date===date);const sum=k=>list.reduce((a,m)=>a+(safeNumber(m[k])??0),0);return{count:list.length,calories:sum('calories'),proteinGrams:sum('proteinGrams'),caloriesKnown:list.filter(m=>safeNumber(m.calories)!==null).length,proteinKnown:list.filter(m=>safeNumber(m.proteinGrams)!==null).length};}
function todoSummary(todos,today){const list=Array.isArray(todos)?todos:[];return{total:list.length,open:list.filter(t=>!t.done).length,completed:list.filter(t=>t.done).length,overdue:list.filter(t=>!t.done&&t.due&&t.due<today).length,highPriority:list.filter(t=>!t.done&&t.priority==='high').length};}
function fitnessSummary(workouts,begin,end){const list=(Array.isArray(workouts)?workouts:[]).filter(w=>w&&typeof w.date==='string'&&w.date>=begin&&w.date<=end);const minutes=list.reduce((a,w)=>a+(safeNumber(w.minutes)??0),0);const byType={};for(const w of list){const k=FITNESS_TYPES.includes(w.type)?w.type:'Other';byType[k]=(byType[k]||0)+1;}return{sessions:list.length,recordedMinutes:minutes,minutesKnown:list.filter(w=>safeNumber(w.minutes)!==null).length,byType};}
return{TEMPLATES,FITNESS_TYPES,mealTotals,todoSummary,fitnessSummary,safeNumber};
});
