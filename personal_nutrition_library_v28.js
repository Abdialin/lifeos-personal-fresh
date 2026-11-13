/* LifeOS V28 — reusable meals and trend review, scoped to Nutrition only. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const api=()=>window.lifeosNutritionV25;
const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const num=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const sum=(arr,key)=>arr.reduce((a,x)=>a+(num(x[key])??0),0);
let initialized=false,trendRange=28,trendMetric='calories';
function selectDate(){return $('lo25Date')?.value||dateKey(new Date())}
function templates(s){
 const saved=s.mealTemplates||[];
 const candidates=new Map();
 for(const meal of [...s.meals].reverse()){
  const name=String(meal.name||'').trim();if(!name||candidates.has(name.toLowerCase()))continue;
  candidates.set(name.toLowerCase(),meal);
  if(candidates.size>=12)break;
 }
 const choices=[...candidates.values()].filter(m=>!saved.some(t=>t.name.toLowerCase()===m.name.toLowerCase())).slice(0,6);
 const d=selectDate();
 return '<details class="lo28-card" id="lo28SavedDetails"><summary>Reusable meals · '+saved.length+' saved</summary>'+
 '<p class="lo28-hint">Save a frequently eaten meal once and log it for any selected day. Values are copied from the original record; review portions before reusing.</p>'+
 (saved.length?'<div class="lo28-items">'+saved.map(t=>'<div class="lo28-entry"><div><strong>'+esc(t.name)+'</strong><small>'+esc(num(t.calories)===null?'Calories unknown':t.calories+' kcal')+(t.source==='from-assumed-example'?' · Based on assumed example':'')+'</small></div><div class="lo28-actions"><button type="button" class="btn outline tiny" data-lo28-draft="'+esc(t.id)+'">Review / edit</button><button type="button" class="btn primary tiny" data-lo28-log="'+esc(t.id)+'">Log for '+esc(d)+'</button><button type="button" class="btn outline tiny" data-lo28-remove="'+esc(t.id)+'">Remove</button></div></div>').join('')+'</div>':'<p class="lo28-hint">No reusable meals saved yet.</p>')+
 (choices.length?'<h4>Save a meal from your history</h4><div class="lo28-items">'+choices.map(m=>'<div class="lo28-entry"><div><strong>'+esc(m.name)+'</strong><small>'+esc(m.mealCategory||'Meal')+(m.seedBatch?' · Assumed record':'')+'</small></div><button type="button" class="btn outline tiny" data-lo28-save="'+esc(m.id)+'">Save template</button></div>').join('')+'</div>':'')+'</details>';
}
function nutritionChart(entries){
 const unit={calories:'kcal',protein:'g',water:'ml'}[trendMetric];
 const label={calories:'Calories',protein:'Protein',water:'Water'}[trendMetric];
 const observed=entries.map(x=>x[trendMetric]).filter(x=>x!==null);
 const max=Math.max(1,...observed);
 const columns=entries.map(e=>{
  const v=e[trendMetric],valid=v!==null;
  const text=valid?Math.round(v*10)/10+' '+unit:'Not recorded';
  return '<button type="button" class="lo29-day" data-lo29-day="'+esc(e.day)+'" aria-label="'+esc(e.day+' · '+text+' · open day')+'" title="'+esc(e.day+' · '+text)+'"><span class="lo29-day-track">'+(valid?'<i style="height:'+Math.max(3,Math.round(v/max*100))+'%"></i>':'<em>—</em>')+'</span><small>'+esc(e.day.slice(5))+'</small></button>';
 }).join('');
 return '<div class="lo29-trend-visual"><div class="lo29-trend-head"><strong>'+esc(label)+' by day</strong><small>'+observed.length+'/'+entries.length+' days recorded</small></div>'+
 (observed.length?'<div class="lo29-trend-columns" role="group" aria-label="'+esc(label)+' trend">'+columns+'</div>':'<p class="lo28-hint">No recorded data for this metric.</p>')+
 '<p class="lo28-hint">Tap a column to inspect that date’s meals. Unlogged values remain unknown.</p></div>';
}

function mealInsights(meals,water,entries,goals){
 const count=meals.length;
 const numericKeys=[['calories','Calories'],['proteinGrams','Protein'],['carbsGrams','Carbs'],['fatGrams','Fat'],['fiberGrams','Fiber']];
 const knownCount=key=>meals.filter(m=>num(m[key])!==null).length;
 const byType=new Map();
 for(const m of meals){
  const name=String(m.mealCategory||'Unspecified').trim()||'Unspecified';
  byType.set(name,(byType.get(name)||0)+1);
 }
 const categories=[...byType].sort((a,b)=>b[1]-a[1]);
 const maximum=Math.max(1,...categories.map(x=>x[1]));
 const quality='<div class="lo30-quality">'+numericKeys.map(([key,label])=>{
  const filled=knownCount(key),pct=count?Math.round(100*filled/count):0;
  return '<div class="lo30-quality-row"><span>'+esc(label)+'</span><div class="lo30-quality-track"><i style="width:'+pct+'%"></i></div><strong>'+filled+'/'+count+'</strong></div>';
 }).join('')+'</div>';
 const categoryRows=categories.length?categories.slice(0,7).map(([name,amount])=>
  '<div class="lo30-category-row"><span>'+esc(name)+'</span><div class="lo30-category-track"><i style="width:'+(amount/maximum*100).toFixed(1)+'%"></i></div><strong>'+amount+'</strong></div>'
 ).join(''):'<p class="lo28-hint">No meal types recorded in this period.</p>';
 const assumed=meals.filter(m=>Boolean(m.seedBatch||m.source==='assumed-demo')).length;
 const entered=count-assumed;
 // Macronutrient-energy shares are shown only for meals where all three macros were recorded.
 const complete=meals.filter(m=>['proteinGrams','carbsGrams','fatGrams'].every(k=>num(m[k])!==null&&num(m[k])>=0));
 const kcalProtein=sum(complete,'proteinGrams')*4,kcalCarbs=sum(complete,'carbsGrams')*4,kcalFat=sum(complete,'fatGrams')*9;
 const kcal=kcalProtein+kcalCarbs+kcalFat;
 const protPct=kcal?Math.round(kcalProtein/kcal*100):0,carbPct=kcal?Math.round(kcalCarbs/kcal*100):0;
 const macro=kcal?'<div class="lo30-macro"><div class="lo30-macro-ring" role="img" aria-label="Approximate macro energy: protein '+protPct+'%, carbs '+(carbPct)+'%, fat '+(100-protPct-carbPct)+'%" style="background:conic-gradient(#69c7b5 0% '+protPct+'%,#6589d9 '+protPct+'% '+(protPct+carbPct)+'%,#e8ad6d '+(protPct+carbPct)+'% 100%)"><span>Macros</span></div><div class="lo30-macro-legend"><span><i style="background:#69c7b5"></i> Protein '+protPct+'%</span><span><i style="background:#6589d9"></i> Carbs '+carbPct+'%</span><span><i style="background:#e8ad6d"></i> Fat '+(100-protPct-carbPct)+'%</span></div></div>':'<p class="lo28-hint">No complete macro records available for a distribution chart.</p>';
 const target=num(goals?.calories);
 const completeDays=entries.filter(e=>e.meals>0&&e.coverage===e.meals);
 const targetDays=target>0?completeDays.filter(e=>Math.abs(e.calories-target)<=target*0.1).length:0;
 const hydrationDays=entries.filter(e=>e.water!==null).length;
 return '<details class="lo30-pattern-details"><summary>Meal patterns & data quality</summary>'+
 '<div class="lo30-kpis"><div><strong>'+count+'</strong><small>Meals in period</small></div><div><strong>'+entered+'</strong><small>Non-assumed records</small></div><div><strong>'+assumed+'</strong><small>Assumed examples</small></div></div>'+
 '<h4>Recorded meal types</h4><div class="lo30-category-list">'+categoryRows+'</div>'+
 '<h4>Nutrition data coverage</h4>'+quality+
 '<h4>Recorded macro-energy proportions</h4>'+macro+
 '<p class="lo28-hint">Distribution uses '+complete.length+' of '+count+' meals with all three macros recorded, using 4/4/9 kcal per gram. It is an approximation, not a health assessment.</p>'+
 '<div class="lo30-evidence"><strong>Daily comparison evidence</strong><p>'+completeDays.length+' of '+entries.length+' days had meals with complete calorie values. '+hydrationDays+' days have a water log.'+
 (target>0?' '+targetDays+' complete days were within ±10% of your chosen '+target+' kcal target.':' Set a calorie target to compare recorded days.')+'</p>'+
 '<p>Incomplete days are excluded from the calorie-target comparison. Not logging a meal or water does not prove zero intake.</p></div></details>';
}
function trends(s){
 const d=new Date();d.setHours(12,0,0,0);const dates=Array.from({length:trendRange},(_,i)=>{const v=new Date(d);v.setDate(v.getDate()-(trendRange-1-i));return dateKey(v)});
 const meals=s.meals||[],water=s.waterIntake||[],goals=s.nutritionSettings||{},periodStart=dates[0],periodMeals=meals.filter(m=>m.date>=periodStart&&m.date<=dates.at(-1)),entries=dates.map(day=>{
  const ms=meals.filter(m=>m.date===day),w=water.filter(m=>m.date===day),known=ms.filter(m=>num(m.calories)!==null);
  const pk=ms.filter(m=>num(m.proteinGrams)!==null);
  return {day,meals:ms.length,calories:known.length?sum(known,'calories'):null,protein:pk.length?sum(pk,'proteinGrams'):null,coverage:known.length,water:w.length?sum(w,'ml'):null};
 });
 const totalMeals=entries.reduce((n,e)=>n+e.meals,0),covered=entries.reduce((n,e)=>n+e.coverage,0);
 const totalWater=entries.filter(e=>e.water!==null),max=Math.max(1,...entries.map(e=>e.meals));
 const first=entries[0].day,last=entries.at(-1).day;
 const interval=trendRange===7?7:7;
 const grouped=[];for(let start=0;start<entries.length;start+=interval){
  const chunk=entries.slice(start,start+interval),mealCount=chunk.reduce((n,e)=>n+e.meals,0);
  const calorieKnown=chunk.filter(e=>e.calories!==null),waterKnown=chunk.filter(e=>e.water!==null);
  const days=chunk.length,avg=calorieKnown.length?Math.round(calorieKnown.reduce((n,e)=>n+e.calories,0)/calorieKnown.length):null;
  const avgWater=waterKnown.length?Math.round(waterKnown.reduce((n,e)=>n+e.water,0)/waterKnown.length):null;
  grouped.push({start:chunk[0].day,end:chunk.at(-1).day,meals:mealCount,calories:avg,water:avgWater,days,calorieDays:calorieKnown.length,waterDays:waterKnown.length});
 }
 return '<details class="lo28-card" id="lo28TrendDetails"><summary>Nutrition trends · last '+trendRange+' days</summary>'+
 '<div class="lo28-trend-actions"><button type="button" data-lo28-range="7" aria-pressed="'+(trendRange===7)+'">7 days</button><button type="button" data-lo28-range="28" aria-pressed="'+(trendRange===28)+'">28 days</button></div>'+
 '<div class="lo29-trend-metrics" role="group" aria-label="Trend metric"><button type="button" data-lo29-metric="calories" aria-pressed="'+(trendMetric==='calories')+'">Calories</button><button type="button" data-lo29-metric="protein" aria-pressed="'+(trendMetric==='protein')+'">Protein</button><button type="button" data-lo29-metric="water" aria-pressed="'+(trendMetric==='water')+'">Water</button></div>'+nutritionChart(entries)+
 '<div class="lo28-scores"><span><b>'+totalMeals+'</b><small>Meals logged</small></span><span><b>'+covered+'/'+totalMeals+'</b><small>Calories recorded</small></span><span><b>'+totalWater.length+'/'+trendRange+'</b><small>Days with water logs</small></span></div>'+
 '<p class="lo28-hint">Recorded nutrition from '+esc(first)+' to '+esc(last)+'. Unlogged days and missing values are unknown, not zero.</p>'+
 grouped.map(g=>'<div class="lo28-week"><div><strong>'+esc(g.start)+' – '+esc(g.end)+'</strong><span>'+g.meals+' meals</span></div>'+
 '<div class="lo28-bar"><i style="width:'+Math.min(100,g.meals/(g.days*3)*100).toFixed(0)+'%"></i></div>'+
 '<small>Average recorded calories: '+(g.calories===null?'Unknown':g.calories+' kcal')+' ('+g.calorieDays+'/'+g.days+' days) · Water: '+(g.water===null?'Unknown':(g.water/1000).toFixed(2)+' L')+' ('+g.waterDays+'/'+g.days+' days)</small></div>').join('')+mealInsights(periodMeals,water,entries,goals)+'</details>';
}
function render(){
 const anchor=$('lifeosNutritionDashboard'),s=api()?.get();if(!anchor||!s)return;
 let container=$('lo28NutritionExtras');
 if(!container){container=document.createElement('div');container.id='lo28NutritionExtras';container.setAttribute('aria-label','Meal shortcuts and nutrition trends');anchor.after(container)}
 const openA=$('lo28SavedDetails')?.open??false,openB=$('lo28TrendDetails')?.open??false,openPatterns=$('lo28NutritionExtras .lo30-pattern-details')?.open??false;
 container.innerHTML=templates(s)+trends(s);
 $('lo28SavedDetails').open=openA;$('lo28TrendDetails').open=openB;const patterns=$('lo28NutritionExtras .lo30-pattern-details');if(patterns)patterns.open=openPatterns;
}
function init(){
 const root=$('lifeosNutritionDashboard');if(!root||initialized)return;initialized=true;
 render();
 const extras=$('lo28NutritionExtras');
 extras.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.lo28Range){trendRange=Number(b.dataset.lo28Range)===7?7:28;render();$('lo28TrendDetails').open=true;return}
  if(b.dataset.lo29Metric){trendMetric=['calories','protein','water'].includes(b.dataset.lo29Metric)?b.dataset.lo29Metric:'calories';render();$('lo28TrendDetails').open=true;return}
  if(b.dataset.lo29Day){
   const date=$('lo25Date');if(!date)return;
   date.value=b.dataset.lo29Day;date.dispatchEvent(new Event('change',{bubbles:true}));
   $('lifeosNutritionDashboard')?.querySelector('.lo25-day-panel')?.scrollIntoView({behavior:'smooth',block:'start'});return
  }
  const s=api()?.get();if(!s)return;
  if(b.dataset.lo28Save){
   const meal=s.meals.find(m=>m.id===b.dataset.lo28Save);if(!meal)return;
   if(!api().saveTemplate(meal))alert('This meal is already saved, or saving failed.');
   render();$('lo28SavedDetails').open=true;return
  }
  if(b.dataset.lo28Remove){
   if(!confirm('Remove this reusable meal template? Logged meals will stay unchanged.'))return;
   if(!api().removeTemplate(b.dataset.lo28Remove))alert('Unable to remove template.');
   render();$('lo28SavedDetails').open=true;return
  }
  if(b.dataset.lo28Draft){
   const meal=s.mealTemplates.find(t=>t.id===b.dataset.lo28Draft),form=$('mealForm');if(!meal||!form)return;
   if(form.hidden){const toggle=document.querySelector('[data-lo-form-toggle="mealForm"]');if(toggle)toggle.click();else form.hidden=false}
   const set=(id,value)=>{const input=$(id);if(input)input.value=value??''};
   set('mealName',meal.name);set('mealDate',selectDate());
   set('mealTime',new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'}));
   set('mealCategory',meal.mealCategory);set('mealCalories',meal.calories);set('mealProtein',meal.proteinGrams);
   set('mealCarbs',meal.carbsGrams);set('mealFat',meal.fatGrams);set('mealFiber',meal.fiberGrams);set('mealDescription',meal.description);
   const extra=form.querySelector('.lo-extra-fields');if(extra)extra.open=true;
   form.scrollIntoView({behavior:'smooth',block:'start'});$('mealName')?.focus({preventScroll:true});return
  }
  if(b.dataset.lo28Log){
   const day=selectDate();
   if(!confirm('Log this reusable meal on '+day+'? Confirm the nutritional values fit the portion you ate.'))return;
   if(!api().logTemplate(b.dataset.lo28Log,day)){alert('Unable to save meal.');return}
   window.lifeosNutritionV25UI?.render();window.lifeosHealthHistoryV10?.render(window.lifeosReadOnlyWorkspace?.().workouts||[],api().get().meals||[]);
   render();$('lo28SavedDetails').open=true;
  }
 });
 document.addEventListener('click',e=>{if(e.target.closest('[data-lo25-day]'))setTimeout(render,80)});
 document.addEventListener('change',e=>{if(e.target.id==='lo25Date')setTimeout(render,80)});
 document.addEventListener('submit',e=>{if(e.target.id==='mealForm'||e.target.id==='lo25WaterForm')setTimeout(render,200)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 window.setInterval(()=>{if(!document.hidden&&$('lo28NutritionExtras')?.offsetParent!==null)render()},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.lifeosNutritionV28UI={render};
})();