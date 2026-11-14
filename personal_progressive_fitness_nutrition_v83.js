/* LifeOS V83 — progressive Fitness and Nutrition favorites.
   Presets only prefill existing forms. They never create logged workouts, meals,
   timed activities, nutrition estimates or health claims. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSProgressivePersonalizationV83=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos.personal.fitness-presets.v83',MAX=30;
const TYPES=['Gym','Walking','Running','Boxing','Cycling','Swimming','Yoga','Team sports','Other'];
const FORM_FIELDS=['fitnessType','fitnessMinutes','fitnessIntensity','fitnessDetail'];
function validateWorkout(input){
 const label=String(input?.label||'').trim(),type=String(input?.type||''),detail=String(input?.detail||'').trim(),minutes=input?.minutes===''||input?.minutes==null?null:Number(input.minutes);
 if(!label||label.length>70)return {ok:false,reason:'Preset name must contain 1–70 characters.'};
 if(!TYPES.includes(type))return {ok:false,reason:'Choose a supported workout type.'};
 if(detail.length>500)return {ok:false,reason:'Workout notes must be 500 characters or fewer.'};
 if(minutes!==null&&(!Number.isSafeInteger(minutes)||minutes<0||minutes>1440))return {ok:false,reason:'Duration must be 0–1440 minutes or blank.'};
 const intensity=String(input?.intensity||'');
 if(!['','Easy','Moderate','Hard'].includes(intensity))return {ok:false,reason:'Invalid intensity.'};
 return {ok:true,preset:{label,type,minutes,intensity,detail}};
}
function cleanPresets(raw){
 const list=Array.isArray(raw)?raw:[];
 return list.slice(0,MAX).filter(v=>v&&typeof v.id==='string'&&v.id.length<=90).map(v=>{
  const result=validateWorkout(v);
  return result.ok?{...result.preset,id:v.id}:null;
 }).filter(Boolean);
}
function addPreset(list,preset,id){
 const check=validateWorkout(preset);
 if(!check.ok)return check;
 const previous=cleanPresets(list);
 if(previous.length>=MAX)return {ok:false,reason:'You can save up to 30 workout presets.'};
 if(previous.some(p=>p.label.toLocaleLowerCase()===check.preset.label.toLocaleLowerCase()))return {ok:false,reason:'A preset with that name already exists.'};
 return {ok:true,list:[...previous,{...check.preset,id:String(id)}]};
}
function favoriteMeals(meals){return (Array.isArray(meals)?meals:[]).filter(m=>m&&typeof m.id==='string'&&typeof m.name==='string'&&m.name.trim())}
function summary(workspace){
 const workouts=(workspace?.workouts||[]).filter(x=>!x.seedBatch&&x.source!=='assumed-demo'&&x.source!=='development-starter');
 const meals=(workspace?.meals||[]).filter(x=>!x.seedBatch&&x.source!=='assumed-demo'&&x.source!=='development-starter');
 return {workouts:workouts.length,meals:meals.length,templates:favoriteMeals(workspace?.mealTemplates).length};
}
function mount(){
 const fitness=document.getElementById('fitnessForm'),nutrition=document.getElementById('mealForm');
 if(!fitness||!nutrition||document.getElementById('lo83-fitness'))return;
 const f=document.createElement('details');f.id='lo83-fitness';f.className='lo83-optional';
 f.innerHTML='<summary>Favorite workouts & exercises · optional</summary><p class="sub">Save a workout preset and reuse it later. It only fills the form; tap Save workout to create an actual record.</p><label class="sub" for="lo83-workout-select">Saved workout</label><select class="field" id="lo83-workout-select"></select><div class="lo83-buttons"><button type="button" class="btn outline" id="lo83-apply-workout">Fill workout form</button><button type="button" class="btn outline" id="lo83-remove-workout">Remove favorite</button></div><label class="sub" for="lo83-workout-label">Preset name</label><input class="field" id="lo83-workout-label" maxlength="70" placeholder="e.g. Upper-body strength or football training"><p class="sub">Choose type, duration, intensity and exercises in the regular workout form above, then save those fields as a preset.</p><button type="button" class="btn outline" id="lo83-save-workout">Save current form as favorite</button><p id="lo83-fitness-msg" role="status" class="sub"></p>';
 fitness.after(f);
 const n=document.createElement('details');n.id='lo83-nutrition';n.className='lo83-optional';
 n.innerHTML='<summary>Favorite meals & foods · optional</summary><p class="sub">Meal favorites use LifeOS’s existing reusable templates. They prefill your meal form but never log a meal automatically. Nutritional values are only user-entered estimates.</p><label class="sub" for="lo83-meal-select">Saved favorite meal</label><select class="field" id="lo83-meal-select"></select><div class="lo83-buttons"><button type="button" class="btn outline" id="lo83-apply-meal">Fill meal form</button><button type="button" class="btn outline" id="lo83-remove-meal">Remove favorite</button></div><button type="button" class="btn outline" id="lo83-save-meal">Save current meal form as favorite</button><p id="lo83-nutrition-msg" role="status" class="sub"></p>';
 nutrition.after(n);
 const $=id=>document.getElementById(id),ws=()=>{try{return root.lifeosReadOnlyWorkspace?.()||{}}catch{return {}}};
 let workouts=[];
 try{workouts=cleanPresets(JSON.parse(localStorage.getItem(KEY)||'[]'))}catch{}
 function store(next){try{localStorage.setItem(KEY,JSON.stringify(next));workouts=next;return true}catch{return false}}
 function fill(id,value){
  const element=$(id);if(!element)return;
  if(element.tagName==='SELECT'&&![...element.options].some(o=>o.value===String(value??'')))return;
  element.value=value==null?'':String(value);
  element.dispatchEvent(new Event('change',{bubbles:true}));
 }
 function drawWorkouts(){
  const select=$('lo83-workout-select'),old=select.value;select.replaceChildren(new Option('Choose favorite workout',''));
  for(const p of workouts)select.add(new Option(p.label,p.id));
  select.value=[...select.options].some(o=>o.value===old)?old:'';
 }
 function drawMeals(){
  const select=$('lo83-meal-select'),old=select.value;select.replaceChildren(new Option('Choose favorite meal',''));
  for(const m of favoriteMeals(ws().mealTemplates))select.add(new Option(m.name,m.id));
  select.value=[...select.options].some(o=>o.value===old)?old:'';
 }
 $('lo83-save-workout').onclick=()=>{
  const candidate={label:$('lo83-workout-label').value,type:$('fitnessType').value,minutes:$('fitnessMinutes').value,intensity:$('fitnessIntensity').value,detail:$('fitnessDetail').value};
  const result=addPreset(workouts,candidate,root.crypto?.randomUUID?.()||String(Date.now()));
  if(!result.ok)return $('lo83-fitness-msg').textContent=result.reason;
  $('lo83-fitness-msg').textContent=store(result.list)?'Favorite workout saved on this device. No workout was logged.':'Could not store favorite. No workout was logged.';
  drawWorkouts();
 };
 $('lo83-apply-workout').onclick=()=>{
  const p=workouts.find(p=>p.id===$('lo83-workout-select').value);
  if(!p)return $('lo83-fitness-msg').textContent='Choose a saved favorite first.';
  fill('fitnessType',p.type);fill('fitnessMinutes',p.minutes);fill('fitnessIntensity',p.intensity);fill('fitnessDetail',p.detail);
  $('lo83-fitness-msg').textContent='Workout form filled. Review and tap Save workout to log it.';
  fitness.scrollIntoView({behavior:'smooth',block:'start'});
 };
 $('lo83-remove-workout').onclick=()=>{
  const id=$('lo83-workout-select').value;
  if(!id)return;
  const p=workouts.find(p=>p.id===id);
  if(!p||!root.confirm('Remove favorite '+p.label+'? Historical workouts will not change.'))return;
  $('lo83-fitness-msg').textContent=store(workouts.filter(p=>p.id!==id))?'Favorite removed.':'Could not remove favorite.';
  drawWorkouts();
 };
 $('lo83-save-meal').onclick=()=>{
  const name=$('mealName').value.trim();
  if(!name)return $('lo83-nutrition-msg').textContent='Enter a meal name in the form first.';
  const num=id=>$(id).value===''?null:Number($(id).value);
  const item={name,mealCategory:$('mealCategory').value,calories:num('mealCalories'),proteinGrams:num('mealProtein'),carbsGrams:num('mealCarbs'),fatGrams:num('mealFat'),fiberGrams:num('mealFiber'),description:$('mealDescription').value};
  const ok=root.lifeosNutritionV25?.saveTemplate?.(item);
  $('lo83-nutrition-msg').textContent=ok?'Meal favorite saved in existing LifeOS templates. No meal was logged.':'Could not save favorite, or this meal already has a template.';
  drawMeals();
 };
 $('lo83-apply-meal').onclick=()=>{
  const m=favoriteMeals(ws().mealTemplates).find(x=>x.id===$('lo83-meal-select').value);
  if(!m)return $('lo83-nutrition-msg').textContent='Choose a favorite meal first.';
  for(const [id,key] of [['mealName','name'],['mealCategory','mealCategory'],['mealCalories','calories'],['mealProtein','proteinGrams'],['mealCarbs','carbsGrams'],['mealFat','fatGrams'],['mealFiber','fiberGrams'],['mealDescription','description']])fill(id,m[key]);
  $('lo83-nutrition-msg').textContent='Meal form filled. Review and tap Save meal to log it.';
  nutrition.scrollIntoView({behavior:'smooth',block:'start'});
 };
 $('lo83-remove-meal').onclick=()=>{
  const id=$('lo83-meal-select').value,m=favoriteMeals(ws().mealTemplates).find(x=>x.id===id);
  if(!m||!root.confirm('Remove favorite '+m.name+'? Existing meals will stay recorded.'))return;
  const ok=root.lifeosNutritionV25?.removeTemplate?.(id);
  $('lo83-nutrition-msg').textContent=ok?'Favorite removed. Existing meal records are unchanged.':'Could not remove favorite.';
  drawMeals();
 };
 root.addEventListener('lifeos-v81-onboarded',()=>{drawWorkouts();drawMeals()});
 root.addEventListener('focus',drawMeals);
 nutrition.addEventListener('submit',()=>root.setTimeout(drawMeals,100));
 drawWorkouts();drawMeals();
}
const api={validateWorkout,cleanPresets,addPreset,favoriteMeals,summary,KEY,TYPES};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return api;
});
