(function(){'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const key=d=>{const x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const num=v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const fmt=(v,u='')=>v==null?'Not logged':(Math.round(v*10)/10)+u;
const read=()=>{try{return window.lifeosReadOnlyWorkspace?.()}catch{return null}};
const stat=(label,value)=>'<div class="lo9-stat"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>';
const bar=(v,max)=>'<div class="lo9-bar"><i style="width:'+Math.max(0,Math.min(100,max?v/max*100:0)).toFixed(1)+'%"></i></div>';
function week(fn){
 return Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return {day:key(d),label:d.toLocaleDateString(undefined,{weekday:'short'}),value:fn(key(d))}});
}
function trend(rows){const max=Math.max(1,...rows.map(x=>x.value));return '<div class="lo9-week">'+rows.map(x=>'<div><b>'+x.value+'</b><span class="lo9-column"><i style="height:'+Math.round(x.value/max*100)+'%"></i></span><small>'+esc(x.label)+'</small></div>').join('')+'</div>'}
function history(id,label){const el=$(id);if(!el||el.closest('.lo9-log-details'))return;const d=document.createElement('details');d.className='lo9-log-details';d.innerHTML='<summary>'+esc(label)+'</summary>';el.before(d);d.append(el)}
function fitness(w){
 const entries=w.workouts||[],dates=week(day=>entries.filter(x=>x.date===day).length),cut=dates[0].day,active=entries.filter(x=>x.date>=cut);
 const durations=active.filter(x=>num(x.minutes)!==null),minutes=durations.reduce((n,x)=>n+num(x.minutes),0);
 const types=new Map();for(const x of active)types.set(x.type||'Workout',(types.get(x.type||'Workout')||0)+1);
 const measurements=(w.bodyMetrics||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)),last=measurements.at(-1);
 const stats=stat('Workouts / 7 days',active.length)+stat('Minutes logged',durations.length?fmt(minutes,' min'):'Unknown')+stat('Activity types',types.size);
 const body=last?stat('Weight',fmt(num(last.weightKg),' kg'))+stat('Body fat',fmt(num(last.bodyFatPct),'%'))+stat('Waist',fmt(num(last.waistCm),' cm')):'<p class="lo9-muted">No body measurements logged. These are optional self-reported values.</p>';
 const x=$('lifeosFitnessDashboard');if(x)x.innerHTML='<h3>Fitness overview</h3><div class="lo9-grid">'+stats+'</div>'+trend(dates)+'<div class="lo9-chiprow">'+[...types].map(([name,n])=>'<span>'+esc(name)+' · '+n+'</span>').join('')+'</div><h4>Body progress</h4><div class="lo9-grid">'+body+'</div>';
 history('fitnessList','Workout history · expand to view or delete');
}
function nutrition(w){
 const entries=w.meals||[],today=entries.filter(x=>x.date===key(new Date())),known=(k)=>today.filter(x=>num(x[k])!==null),sum=(a,k)=>a.reduce((n,x)=>n+num(x[k]),0);
 const calories=known('calories'),protein=known('proteinGrams'),carbs=known('carbsGrams'),fat=known('fatGrams');
 const stats=stat('Meals logged today',today.length)+stat('Calories',calories.length?fmt(sum(calories,'calories'),' kcal'):'Unknown')+stat('Protein',protein.length?fmt(sum(protein,'proteinGrams'),' g'):'Unknown');
 const macros=stat('Carbs',carbs.length?fmt(sum(carbs,'carbsGrams'),' g'):'Unknown')+stat('Fat',fat.length?fmt(sum(fat,'fatGrams'),' g'):'Unknown')+stat('Calorie data',calories.length+' / '+today.length+' meals');
 const x=$('lifeosNutritionDashboard');if(x)x.innerHTML='<h3>Nutrition overview</h3><div class="lo9-grid">'+stats+macros+'</div><h4>Meals recorded during the last 7 days</h4>'+trend(week(day=>entries.filter(x=>x.date===day).length))+'<p class="lo9-muted">These are manually entered values; missing values are unknown, not zero. No calorie target or health conclusion is assumed.</p>';
 history('mealList','Meal history · expand to view or delete');
}
function pattern(w){
 const p=$('intelligencePanel');if(!p)return;let x=$('lo9PatternOverview');if(!x){x=document.createElement('section');x.id='lo9PatternOverview';x.className='lo-health-dashboard';p.insertBefore(x,p.querySelector('#analyzePatterns'))}
 const cut=Date.now()-28*86400000,all=(w.sessions||[]).filter(s=>s.status==='finished'&&s.endAt>=cut);
 const generated=all.filter(s=>s.seedBatch||s.source==='development-starter'),measured=all.filter(s=>s.precision==='measured'&&!s.seedBatch&&s.source!=='development-starter');
 const days=new Set(all.map(s=>key(s.endAt))).size,pct=all.length?Math.round(measured.length/all.length*100):0;
 x.innerHTML='<h3>Prediction evidence</h3><div class="lo9-grid">'+stat('Days with records',days+' / 28')+stat('Measured sessions',measured.length)+stat('Generated examples',generated.length)+'</div>'+bar(pct,100)+'<p class="lo9-muted">'+pct+'% measured non-generated sessions (record count). This is not a validated prediction-confidence score. Recommendations must be reviewed before approval.</p>';
 if(!p.querySelector('#lo9PatternDetails')){const d=document.createElement('details');d.id='lo9PatternDetails';d.className='lo9-log-details';d.innerHTML='<summary>Detailed evidence and analysis</summary>';const b=$('analyzePatterns'),r=$('patternResults');if(b)d.append(b);if(r)d.append(r);p.append(d)}
}
function refresh(){const w=read();if(!w)return;try{fitness(w);nutrition(w);pattern(w)}catch(e){console.warn('Optional health dashboard unavailable',e)}}
function init(){refresh();document.addEventListener('submit',e=>{if(e.target.matches('#fitnessForm,#mealForm,#bodyMetricsForm'))setTimeout(refresh,150)});document.addEventListener('click',e=>{if(e.target.closest('[data-delete]'))setTimeout(refresh,150)});$('lifeosNavigation')?.addEventListener('click',()=>setTimeout(refresh,80));document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});setInterval(()=>{if(!document.hidden)refresh()},30000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();