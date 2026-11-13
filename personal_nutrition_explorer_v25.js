/* LifeOS V25: interactive nutrition, goals and hydration. Existing records remain authoritative. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const today=()=>dateKey(new Date());
const pretty=d=>new Date(d+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'});
const api=()=>window.lifeosNutritionV25;
const state={day:null,initialized:false};
const settingsDefault={calories:null,protein:null,carbs:null,fat:null,meals:null,waterMl:null,reminder:false,servingMl:300,intervalHours:3,from:'08:00',until:'21:00'};
const cleanSetting=s=>({...settingsDefault,...(s||{})});
const sum=(rows,key)=>rows.reduce((v,x)=>v+(n(x[key])??0),0);
const known=(rows,key)=>rows.filter(x=>n(x[key])!==null);
const val=(rows,key,unit)=>{const k=known(rows,key);return k.length?Math.round(sum(k,key)*10)/10+' '+unit:'Unknown'};
const count=rows=>rows.length;
function block(label,value){return '<div class="lo25-stat"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>'}
function donut(meal){
 const p=n(meal.proteinGrams),c=n(meal.carbsGrams),f=n(meal.fatGrams);
 if(p===null||c===null||f===null||p<0||c<0||f<0)return '<div class="lo25-donut unknown" aria-label="Incomplete macro information">?</div>';
 const a=p*4,b=c*4,d=f*9,total=a+b+d;
 if(!total)return '<div class="lo25-donut unknown" aria-label="Zero recorded macros">0</div>';
 const p1=Math.round(a/total*100),p2=Math.round((a+b)/total*100);
 return '<div class="lo25-donut" role="img" aria-label="Approximate energy from protein '+p1+' percent, carbohydrates '+(p2-p1)+' percent, fat '+(100-p2)+' percent" style="background:conic-gradient(#69c7b5 0% '+p1+'%,#6589d9 '+p1+'% '+p2+'%,#e8ad6d '+p2+'% 100%)"><span>Macros</span></div>'
}
function mealCard(m){
 const fields=[['Calories',n(m.calories),'kcal'],['Protein',n(m.proteinGrams),'g'],['Carbs',n(m.carbsGrams),'g'],['Fat',n(m.fatGrams),'g'],['Fiber',n(m.fiberGrams),'g']];
 return '<article class="lo25-meal">'+donut(m)+'<div class="lo25-meal-body"><div><strong>'+esc(m.name||'Meal')+'</strong><small> · '+esc(m.mealCategory||'Meal')+(m.mealTime?' · '+esc(m.mealTime):'')+'</small>'+(m.seedBatch?'<span class="lo25-demo">Assumed example</span>':'')+'</div><div class="lo25-tags">'+fields.map(([label,v,u])=>'<span>'+esc(label)+': <b>'+esc(v===null?'Unknown':(Math.round(v*10)/10)+' '+u)+'</b></span>').join('')+'</div>'+(m.description?'<p>'+esc(m.description)+'</p>':'')+'</div></article>'
}
function progress(name,actual,target,coverage,unit){
 if(target===null||target<=0)return '<div class="lo25-goal"><span>'+esc(name)+'</span><small>Set a goal to compare</small></div>';
 const pct=actual===null?0:Math.max(0,Math.min(100,actual/target*100));
 const actualText=actual===null?'Unknown':Math.round(actual*10)/10+' '+unit;
 return '<div class="lo25-goal"><div><strong>'+esc(name)+'</strong><span>'+esc(actualText)+' / '+esc(target)+' '+esc(unit)+'</span></div><div class="lo25-meter"><i style="width:'+pct.toFixed(1)+'%"></i></div>'+(coverage?'<small>'+esc(coverage)+'</small>':'')+'</div>'
}
function dayProgress(meals,water,goals){
 const metrics=[['Calories','calories','calories','kcal'],['Protein','protein','proteinGrams','g'],['Carbs','carbs','carbsGrams','g'],['Fat','fat','fatGrams','g']];
 let rows=progress('Meals',meals.length,n(goals.meals),null,'meals');
 for(const [title,goal,key,unit] of metrics){const found=known(meals,key);rows+=progress(title,found.length?sum(found,key):null,n(goals[goal]),meals.length?found.length+'/'+meals.length+' meals with recorded '+title.toLowerCase():'No meals logged',unit)}
 rows+=progress('Water',water.length?sum(water,'ml'):null,n(goals.waterMl),water.length?water.length+' water entries':'Nothing logged','ml');
 return '<div class="lo25-goals">'+rows+'</div>'
}
function daysOfWeek(){const d=new Date();d.setHours(12,0,0,0);return Array.from({length:7},(_,i)=>{const a=new Date(d);a.setDate(a.getDate()-6+i);return {day:dateKey(a),short:a.toLocaleDateString(undefined,{weekday:'short'})}})}
function waterCards(water){
 return water.slice().sort((a,b)=>String(b.time).localeCompare(String(a.time))).map(w=>'<div class="lo25-water-entry"><span>'+esc(w.time||'Time not recorded')+' · <strong>'+esc(w.ml)+' ml</strong></span><button class="btn outline tiny" data-lo25-remove="'+esc(w.id)+'">Delete</button></div>').join('')||'<p class="lo25-muted">No water recorded for this day.</p>';
}
function show(){
 const root=$('lifeosNutritionDashboard'),model=api()?.get();if(!root||!model)return;
 if(root.contains(document.activeElement)&&document.activeElement.matches('input,select'))return;
 const meals=model.meals||[],waterEntries=model.waterIntake||[],goals=cleanSetting(model.nutritionSettings);
 const day=state.day||today(),selected=meals.filter(m=>m.date===day),water=waterEntries.filter(w=>w.date===day);
 const daily=daysOfWeek(),max=Math.max(1,...daily.map(d=>meals.filter(x=>x.date===d.day).length));
 const goalWasOpen=$('lo25GoalDetails')?.open ?? true,reminderWasOpen=$('lo25RemindersForm')?.closest('details')?.open ?? false;
 const todayMeals=meals.filter(m=>m.date===today()),todayWater=waterEntries.filter(w=>w.date===today());
 const bars=daily.map(d=>{const amount=meals.filter(m=>m.date===d.day).length;return '<button type="button" class="lo25-day '+(day===d.day?'selected':'')+'" data-lo25-day="'+d.day+'" aria-pressed="'+(day===d.day?'true':'false')+'" aria-label="'+esc(pretty(d.day)+': '+amount+' meals')+'"><b>'+amount+'</b><span class="lo25-bar"><i style="height:'+Math.round(100*amount/max)+'%"></i></span><small>'+esc(d.short)+'</small></button>'}).join('');
 const knownToday=known(todayMeals,'calories').length;
 root.innerHTML='<h3>Nutrition overview</h3><div class="lo25-today-grid">'+block('Meals today',count(todayMeals))+block('Calories today',val(todayMeals,'calories','kcal'))+block('Water today',todayWater.length?Math.round(sum(todayWater,'ml'))+' ml':'Not logged')+block('Calorie coverage',knownToday+' / '+count(todayMeals))+'</div>'+
 '<h4>Tap a day to explore meals</h4><div class="lo25-week" role="group" aria-label="Select a nutrition day">'+bars+'</div>'+
 '<section class="lo25-day-panel" aria-label="Selected day meals"><div class="lo25-day-header"><div><h4>'+esc(pretty(day))+'</h4><small>'+selected.length+' meals · '+water.length+' water entries</small></div><label class="lo25-date-label">Choose date<input type="date" id="lo25Date" value="'+day+'"></label></div>'+
 (selected.length?selected.slice().sort((a,b)=>(a.mealTime||'').localeCompare(b.mealTime||'')).map(mealCard).join(''):'<p class="lo25-muted">No meals on this day. Select a chart bar or choose another date.</p>')+
 '<details class="lo25-panel" id="lo25GoalDetails" '+(goalWasOpen?'open':'')+'><summary>Goals vs. recorded nutrition</summary>'+dayProgress(selected,water,goals)+'<p class="lo25-muted">The goals are yours to set. Incomplete meal values remain unknown rather than being treated as zero. Macro rings use approximate energy proportions, not clinical estimates.</p><form id="lo25GoalsForm" class="lo25-grid-fields">'+[
 ['calories','Calories (kcal/day)'],['protein','Protein (g/day)'],['carbs','Carbs (g/day)'],['fat','Fat (g/day)'],['meals','Meals (per day)'],['waterMl','Water (ml/day)']
 ].map(([key,label])=>'<label>'+esc(label)+'<input name="'+key+'" type="number" min="0" max="10000" step="1" placeholder="Not set" value="'+esc(goals[key]??'')+'"></label>').join('')+'<button class="btn primary" type="submit">Save my goals</button></form></details>'+
 '<section class="lo25-panel"><h4>Water intake · '+esc(pretty(day))+'</h4><div class="lo25-water-summary"><b>'+esc(water.length?Math.round(sum(water,'ml'))+' ml':'Not logged')+'</b><small>'+esc(n(goals.waterMl)?'Your goal: '+goals.waterMl+' ml':'No water goal set')+'</small></div>'+
 '<div class="lo25-water-days">'+daily.map(d=>{const dayWater=waterEntries.filter(w=>w.date===d.day);const total=dayWater.length?Math.round(sum(dayWater,'ml')):null;return '<button type="button" data-lo25-day="'+d.day+'" class="'+(day===d.day?'selected':'')+'"><small>'+esc(d.short)+'</small><strong>'+esc(total===null?'—':(total/1000).toFixed(2)+' L')+'</strong></button>'}).join('')+'</div>'+'<div class="lo25-quick"><button type="button" class="btn outline" data-lo25-water="200">+ 200 ml</button><button type="button" class="btn outline" data-lo25-water="300">+ 300 ml</button><button type="button" class="btn outline" data-lo25-water="500">+ 500 ml</button></div>'+
 '<form id="lo25WaterForm" class="lo25-water-form"><label>Custom amount (ml)<input type="number" name="ml" required min="1" max="3000" placeholder="e.g. 250"></label><button class="btn primary">Log water</button></form>'+waterCards(water)+
 '<details class="lo25-reminders" '+(reminderWasOpen?'open':'')+'><summary>Water reminder settings · optional</summary><form id="lo25RemindersForm" class="lo25-grid-fields"><label class="lo25-checkbox"><input type="checkbox" name="reminder" '+(goals.reminder?'checked':'')+'> Enable reminders</label>'+
 '<label>Amount per reminder (ml)<input type="number" name="servingMl" min="50" max="1000" required value="'+esc(goals.servingMl)+'"></label>'+
 '<label>Every (hours)<input type="number" name="intervalHours" min="1" max="12" required value="'+esc(goals.intervalHours)+'"></label>'+
 '<label>Start at<input type="time" name="from" required value="'+esc(goals.from)+'"></label><label>Stop at<input type="time" name="until" required value="'+esc(goals.until)+'"></label>'+
 '<button type="submit" class="btn primary">Save reminder schedule</button><button type="button" class="btn outline" id="lo25Notify">Allow browser notifications</button></form><p class="lo25-muted">Reminders work while LifeOS is open. Browser notifications require your permission and may not appear when the browser is closed. Goals and reminders are not medical hydration recommendations.</p></details><div id="lo25ReminderNotice" role="status"></div></section></section>';
 checkReminder();
}
function settingsSave(form,keys){const before=cleanSetting(api().get().nutritionSettings),next={...before};for(const key of keys){const value=form.elements.namedItem(key)?.value??'';next[key]=value===''?null:Number(value)}
 if(keys.includes('waterMl')&&next.waterMl!==null&&next.waterMl>10000){alert('Water goal must be 10,000 ml or less.');return}
 if(Object.values(next).some(x=>typeof x==='number'&&(!Number.isFinite(x)||x<0))){alert('Please enter valid non-negative goals.');return}
 if(!api().saveSettings(next)){alert('Goals were not saved.');return}show();
}
function saveReminder(form){
 const current=cleanSetting(api().get().nutritionSettings),v=k=>form.elements.namedItem(k)?.value;
 const next={...current,reminder:form.elements.namedItem('reminder').checked,servingMl:Number(v('servingMl')),intervalHours:Number(v('intervalHours')),from:v('from'),until:v('until')};
 if(!Number.isFinite(next.servingMl)||next.servingMl<50||next.servingMl>1000||!Number.isInteger(next.intervalHours)||next.intervalHours<1||next.intervalHours>12||!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(next.from)||!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(next.until)||next.until<=next.from){alert('Check the reminder amount, interval and start/stop times.');return}
 if(!api().saveSettings(next)){alert('Reminder settings were not saved.');return}show();
}
function logWater(ml){const date=state.day||today();if(!api().saveWater({date,ml,time:new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})})){alert('Water was not saved.');return}show()}
function checkReminder(){
 const notice=$('lo25ReminderNotice'),prefs=cleanSetting(api()?.get().nutritionSettings);if(!notice||!prefs.reminder||document.hidden)return;
 const now=new Date(),minute=now.getHours()*60+now.getMinutes(),from=prefs.from.split(':').map(Number),until=prefs.until.split(':').map(Number);
 const first=from[0]*60+from[1],last=until[0]*60+until[1],step=Number(prefs.intervalHours)*60;
 if(!Number.isFinite(step)||step<=0||minute<first||minute>last)return;
 const slot=first+Math.floor((minute-first)/step)*step;if(minute-slot>15)return;
 const id=today()+'-'+slot,storageKey='lo25-reminded-'+id;
 try{if(sessionStorage.getItem(storageKey))return;sessionStorage.setItem(storageKey,'1')}catch{}
 notice.innerHTML='<p class="lo25-water-reminder">Water reminder: '+esc(prefs.servingMl)+' ml planned for this interval. <button type="button" class="btn outline tiny" data-lo25-water="'+esc(prefs.servingMl)+'">Log '+esc(prefs.servingMl)+' ml</button></p>';
 if('Notification' in window&&Notification.permission==='granted'){try{new Notification('LifeOS · Water reminder',{body:'Time for your planned '+prefs.servingMl+' ml of water.'})}catch{}}
}
function bind(){
 const root=$('lifeosNutritionDashboard');if(!root||state.initialized)return;state.initialized=true;
 root.addEventListener('click',e=>{
  const b=e.target.closest('[data-lo25-day]');if(b){state.day=b.dataset.lo25Day;show();return}
  const w=e.target.closest('[data-lo25-water]');if(w){logWater(Number(w.dataset.lo25Water));return}
  const del=e.target.closest('[data-lo25-remove]');if(del){if(!confirm('Delete this water entry?'))return;if(api().removeWater(del.dataset.lo25Remove))show();else alert('Could not delete water entry.');return}
  if(e.target.closest('#lo25Notify')){if(!('Notification' in window)){alert('Notifications are not supported in this browser. In-app reminders still work while LifeOS is open.');return}Notification.requestPermission().then(p=>alert(p==='granted'?'Notifications allowed while LifeOS is open.':'Notifications not enabled. In-app reminders remain available.'))}
 });
 root.addEventListener('change',e=>{if(e.target.id==='lo25Date'&&/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)){state.day=e.target.value;show()}});
 root.addEventListener('submit',e=>{
  if(e.target.id==='lo25GoalsForm'){e.preventDefault();settingsSave(e.target,['calories','protein','carbs','fat','meals','waterMl'])}
  if(e.target.id==='lo25RemindersForm'){e.preventDefault();saveReminder(e.target)}
  if(e.target.id==='lo25WaterForm'){e.preventDefault();logWater(Number(e.target.elements.namedItem('ml').value))}
 });
 show();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)show()});
 setInterval(()=>{if(!document.hidden)checkReminder()},60000);
}
window.lifeosNutritionV25UI={render:()=>{if(!state.initialized)bind();else show()}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();