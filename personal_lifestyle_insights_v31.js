/* LifeOS V31 — read-only Fitness + Nutrition comparison in Insights. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const key=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const dayLabel=s=>new Date(s+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
const workspace=()=>{try{return window.lifeosReadOnlyWorkspace?.()||null}catch{return null}};
let range=7,chosen=null,installed=false;
function byDay(w,date){
 const workouts=(w.workouts||[]).filter(x=>x.date===date);
 const meals=(w.meals||[]).filter(x=>x.date===date);
 const water=(w.waterIntake||[]).filter(x=>x.date===date);
 const kcal=meals.filter(x=>number(x.calories)!==null),protein=meals.filter(x=>number(x.proteinGrams)!==null);
 const duration=workouts.filter(x=>number(x.minutes)!==null);
 return {date,workouts,meals,water,
  calorieTotal:kcal.length?kcal.reduce((sum,x)=>sum+number(x.calories),0):null,
  proteinTotal:protein.length?protein.reduce((sum,x)=>sum+number(x.proteinGrams),0):null,
  waterTotal:water.length?water.reduce((sum,x)=>sum+number(x.ml),0):null,
  durationTotal:duration.length?duration.reduce((sum,x)=>sum+number(x.minutes),0):null,
  durationKnown:duration.length,calorieKnown:kcal.length,proteinKnown:protein.length};
}
function getDays(w){
 const d=new Date();d.setHours(12,0,0,0);
 return Array.from({length:range},(_,i)=>{const day=new Date(d);day.setDate(day.getDate()-range+1+i);return byDay(w,key(day))});
}
function fmt(v,unit){return v===null?'Unknown':Math.round(v*10)/10+' '+unit}
function metric(label,value,subtitle=''){return '<div class="lo31-metric"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong>'+(subtitle?'<span>'+esc(subtitle)+'</span>':'')+'</div>'}
function source(m){return Boolean(m.seedBatch||m.source==='assumed-demo')?' · Assumed example':''}
function selectedDetail(d,w){
 const goal=number(w.nutritionSettings?.calories);
 const validCal=d.calorieKnown===d.meals.length&&d.meals.length>0;
 const comparison=goal!==null&&goal>0&&validCal?' · '+Math.round(d.calorieTotal/goal*100)+'% of your '+goal+' kcal target':goal!==null&&goal>0?' · Goal comparison unavailable until all meals have calorie data':'';
 const workoutNames=d.workouts.map(x=>'<li>'+esc(x.type||'Workout')+(number(x.minutes)===null?'':' · '+esc(x.minutes)+' min')+esc(source(x))+'</li>').join('');
 const mealNames=d.meals.map(x=>'<li>'+esc(x.name||'Meal')+(number(x.calories)===null?' · calories unknown':' · '+esc(x.calories)+' kcal')+esc(source(x))+'</li>').join('');
 return '<div class="lo31-detail"><h4>'+esc(dayLabel(d.date))+'</h4><div class="lo31-metrics">'+
 metric('Workouts',d.workouts.length,d.durationKnown+'/'+d.workouts.length+' with duration')+
 metric('Workout time',fmt(d.durationTotal,'min'))+
 metric('Meals',d.meals.length,d.calorieKnown+'/'+d.meals.length+' with calories')+
 metric('Recorded calories',fmt(d.calorieTotal,'kcal'),comparison)+
 metric('Protein',fmt(d.proteinTotal,'g'),d.proteinKnown+'/'+d.meals.length+' meals with values')+
 metric('Water',fmt(d.waterTotal===null?null:d.waterTotal/1000,'L'))+'</div>'+
 '<div class="lo31-lists"><div><strong>Fitness entries</strong>'+(workoutNames?'<ul>'+workoutNames+'</ul>':'<p>No recorded workout.</p>')+'</div><div><strong>Meals</strong>'+(mealNames?'<ul>'+mealNames+'</ul>':'<p>No meals recorded.</p>')+'</div></div></div>';
}
function render(){
 const host=$('lo31Lifestyle'),w=workspace();if(!host||!w)return;
 const days=getDays(w);if(!chosen||!days.some(d=>d.date===chosen))chosen=days[days.length-1].date;
 const current=days.find(d=>d.date===chosen);
 const workoutDays=days.filter(d=>d.workouts.length>0).length;
 const mealDays=days.filter(d=>d.meals.length>0).length;
 const both=days.filter(d=>d.workouts.length>0&&d.meals.length>0).length;
 const known=days.filter(d=>d.meals.length&&d.calorieKnown===d.meals.length).length;
 const buttons=days.map(d=>'<button type="button" class="lo31-day'+(d.date===chosen?' selected':'')+'" data-lo31-day="'+d.date+'" aria-pressed="'+(d.date===chosen)+'" title="'+esc(dayLabel(d.date)+': '+d.workouts.length+' workouts, '+d.meals.length+' meals')+'"><span class="lo31-columns"><i style="height:'+Math.min(100,d.workouts.length*45)+'%" title="Workout records"></i><b style="height:'+Math.min(100,d.meals.length*25)+'%" title="Meal records"></b></span><small>'+esc(d.date.slice(5))+'</small></button>').join('');
 host.innerHTML='<div class="lo31-heading"><div><h3>Fitness + Nutrition · recorded evidence</h3><p>Compare your saved workout and food records on matching dates. No automatic calorie-burn estimates.</p></div><div class="lo31-range"><button data-lo31-range="7" aria-pressed="'+(range===7)+'">7 days</button><button data-lo31-range="28" aria-pressed="'+(range===28)+'">28 days</button></div></div>'+
 '<div class="lo31-kpis">'+metric('Days with workouts',workoutDays+'/'+range)+metric('Days with meals',mealDays+'/'+range)+metric('Days with both',both+'/'+range)+metric('Complete calorie days',known+'/'+range)+'</div>'+
 '<div class="lo31-legend"><span><i></i>Workout records</span><span><b></b>Meal records</span></div><div class="lo31-chart" role="group" aria-label="Recorded workouts and meals per day">'+buttons+'</div>'+
 selectedDetail(current,w)+
 '<p class="lo31-note">Counts represent separately saved entries. Workouts do not automatically imply calories burned; missing logs are unknown, and assumed examples remain identified. This comparison is descriptive rather than a nutritional or fitness recommendation.</p>';
}
function init(){
 const parent=$('analyticsPanel');if(!parent||installed)return;installed=true;
 const element=document.createElement('section');element.id='lo31Lifestyle';element.className='lo31-lifestyle';element.setAttribute('aria-label','Fitness and Nutrition combined insights');parent.append(element);
 element.addEventListener('click',e=>{
  const btn=e.target.closest('button');if(!btn)return;
  if(btn.dataset.lo31Range){range=Number(btn.dataset.lo31Range)===28?28:7;chosen=null;render()}
  else if(btn.dataset.lo31Day){chosen=btn.dataset.lo31Day;render()}
 });
 render();
 document.addEventListener('click',e=>{if(e.target.closest('#lifeosNavigation'))setTimeout(render,80)});
 document.addEventListener('submit',e=>{if(e.target.matches('#fitnessForm,#mealForm,#lo25WaterForm'))setTimeout(render,180)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();