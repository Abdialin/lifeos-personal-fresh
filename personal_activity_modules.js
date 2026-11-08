/* LifeOS Personal Batch J: pure, offline-safe personal log helpers. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSPersonalActivities=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const CATEGORIES=Object.freeze(['Sleep','Quran','Prayer','Arabic','Hadith','Reading','Family','Study','Recovery','Other']);
function validDate(s){if(typeof s!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;}
function createLog({id,category,date,minutes=null,quantity=null,unit='',notes='',precision='estimated'}){
 if(typeof id!=='string'||!id.trim()||!CATEGORIES.includes(category)||!validDate(date))throw Error('Invalid personal activity identity, category or date');
 if(minutes!==null&&(!Number.isFinite(minutes)||minutes<0||minutes>1440))throw Error('Invalid duration');
 if(quantity!==null&&(!Number.isFinite(quantity)||quantity<0))throw Error('Invalid quantity');
 if(!['measured','estimated','unknown'].includes(precision))throw Error('Invalid precision');
 if(typeof notes!=='string'||notes.length>500||typeof unit!=='string'||unit.length>30)throw Error('Invalid notes or unit');
 return{id,category,date,minutes,quantity,unit,notes,precision,source:'manual',createdAt:new Date().toISOString()};
}
function summary(logs,from,to){const items=(Array.isArray(logs)?logs:[]).filter(x=>x&&validDate(x.date)&&x.date>=from&&x.date<=to&&CATEGORIES.includes(x.category));const byCategory={};for(const x of items){const c=byCategory[x.category]||(byCategory[x.category]={records:0,minutes:0,durationKnown:0,quantity:0,quantityKnown:0,measured:0,estimated:0,unknown:0});c.records++;if(Number.isFinite(x.minutes)&&x.minutes>=0){c.minutes+=x.minutes;c.durationKnown++}if(Number.isFinite(x.quantity)&&x.quantity>=0){c.quantity+=x.quantity;c.quantityKnown++}c[['measured','estimated','unknown'].includes(x.precision)?x.precision:'unknown']++;}return{records:items.length,byCategory};}
function goalProgress(logs,category,from,to,metric='days'){const items=(Array.isArray(logs)?logs:[]).filter(x=>x&&x.category===category&&validDate(x.date)&&x.date>=from&&x.date<=to);if(metric==='days')return new Set(items.map(x=>x.date)).size;if(metric==='sessions')return items.length;if(metric==='minutes')return items.reduce((sum,x)=>sum+(Number.isFinite(x.minutes)&&x.minutes>=0?x.minutes:0),0);throw Error('Unsupported metric');}
return{CATEGORIES,createLog,summary,goalProgress,validDate};
});
