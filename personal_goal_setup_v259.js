/* LifeOS V259 — activity-aware goal setup, bound to existing goal form.
 * Does not create goals directly; user reviews form and saves via existing addGoal.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSGoalSetupV259=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const presets=[
{id:'prayer',label:'Fajr',name:'Fajr prayer',category:'sessions',match:'Fajr',unit:'sessions',target:7,description:'Counts completed timers whose names contain Fajr. Create separate goals for Dhuhr, Asr, Maghrib and Isha. On-time and congregation goals need a future metric-specific engine.'},
{id:'dhuhr',label:'Dhuhr',name:'Dhuhr prayer',category:'sessions',match:'Dhuhr',unit:'sessions',target:7,description:'Counts completed Dhuhr-named timers. Sessions recorded under Zuhr need a separate name match.'},
{id:'asr',label:'Asr',name:'Asr prayer',category:'sessions',match:'Asr',unit:'sessions',target:7,description:'Counts completed Asr-named timers.'},
{id:'maghrib',label:'Maghrib',name:'Maghrib prayer',category:'sessions',match:'Maghrib',unit:'sessions',target:7,description:'Counts completed Maghrib-named timers.'},
{id:'isha',label:'Isha',name:'Isha prayer',category:'sessions',match:'Isha',unit:'sessions',target:7,description:'Counts completed Isha-named timers.'},
{id:'quran',label:'Quran',name:'Quran sessions',category:'sessions',match:'Quran',unit:'sessions',target:7,description:'Counts completed Quran tracking sessions. Pages memorized are recorded in activity review; page-based goals need an explicitly logged quantity or a future linked measure.'},
{id:'study',label:'Studying',name:'Study hours',category:'sessions',match:'Stud',unit:'hours',target:8,description:'Uses matched finished study timer duration. Activities named Study rather than Studying may need an additional matching goal under current rules.'},
{id:'fitness',label:'Fitness',name:'Gym workouts',category:'fitness',match:'',unit:'sessions',target:3,description:'Counts qualifying Fitness Studio workout entries using existing goal evidence.'},
{id:'work',label:'Work',name:'Work hours',category:'sessions',match:'Work',unit:'hours',target:35,description:'Counts finished tracked sessions whose names match Work.'},
{id:'reading',label:'Reading',name:'Reading hours',category:'sessions',match:'Reading',unit:'hours',target:5,description:'Counts matched reading timer duration. Reading pages require explicit quantity records.'},
{id:'family',label:'Family',name:'Family time',category:'sessions',match:'Family',unit:'hours',target:5,description:'Counts finished Family-named tracked sessions.'},
{id:'friends',label:'Friends',name:'Friends time',category:'sessions',match:'Friends',unit:'hours',target:3,description:'Counts finished Friends-named tracked sessions.'},
{id:'nutrition',label:'Nutrition',name:'Meal logs',category:'meals',match:'',unit:'sessions',target:21,description:'Counts explicit Nutrition meal records; 21 is an optional weekly target, not inferred meal consumption.'},
{id:'sleep',label:'Sleep',name:'Sleep hours',category:'sessions',match:'Sleep',unit:'hours',target:56,description:'Counts tracked Sleep timer duration, not verified sleep quality.'},
{id:'chores',label:'Household',name:'Chores sessions',category:'sessions',match:'Chores',unit:'sessions',target:4,description:'Counts matched finished timer sessions.'}
];
function applyPreset(p,doc){
 if(!p||!doc)return false;
 const ids={name:'goalName',category:'goalCategory',match:'goalMatch',target:'goalTarget',unit:'goalUnit',quantityUnit:'goalQuantityUnit'};
 const fields=Object.fromEntries(Object.entries(ids).map(([k,id])=>[k,doc.getElementById(id)]));
 if(Object.values(fields).some(x=>!x))return false;
 fields.name.value=p.name;fields.category.value=p.category;fields.match.value=p.match;fields.target.value=String(p.target);
 fields.unit.value=p.unit;fields.quantityUnit.value='';
 for(const key of ['name','category','match','target','unit'])fields[key].dispatchEvent(new Event('change',{bubbles:true}));
 return true;
}
function mount(){
 const doc=root.document,form=doc?.getElementById('goalForm'),presetsHost=doc?.getElementById('lifeosGoalSuggestions');
 if(!form||!presetsHost||doc.getElementById('lo259-goal-helper'))return;
 const panel=doc.createElement('section');panel.id='lo259-goal-helper';panel.className='lo259-goal-helper';
 const title=doc.createElement('h3');title.textContent='Create an activity goal';panel.append(title);
 const explain=doc.createElement('p');explain.textContent='Choose an activity, review the suggested target below, then use the existing Save goal button.';panel.append(explain);
 const tiles=doc.createElement('div');tiles.className='lo259-goal-tiles';
 for(const p of presets){
  const b=doc.createElement('button');b.type='button';b.className='lo259-goal-chip';b.textContent=p.label;
  b.onclick=()=>{
   if(!applyPreset(p,doc))return;
   for(const peer of tiles.querySelectorAll('button'))peer.setAttribute('aria-pressed',String(peer===b));
   message.textContent=p.description;
   form.classList.add('lo259-goal-ready');form.scrollIntoView({behavior:'smooth',block:'center'});
  };
  b.setAttribute('aria-pressed','false');tiles.append(b);
 }
 panel.append(tiles);
 const message=doc.createElement('p');message.id='lo259-goal-context';message.setAttribute('role','status');message.textContent='Select an activity to prepare a supported weekly goal.';panel.append(message);
 presetsHost.before(panel);
 if(!doc.getElementById('lo259-legacy-presets')){
  const oldPresets=doc.createElement('details');oldPresets.id='lo259-legacy-presets';oldPresets.className='lo259-other-presets';
  const label=doc.createElement('summary');label.textContent='Other existing goal suggestions';oldPresets.append(label);
  presetsHost.before(oldPresets);oldPresets.append(presetsHost);
 }
 const original=presetsHost.querySelector('p.note');if(original)original.textContent='Existing quick-start presets remain available below. Always review values before saving.';
 const disclaimer=doc.createElement('p');disclaimer.className='lo259-goal-caveat';disclaimer.textContent='Advanced targets such as first-row prayer attendance, sunnah units, intensity, or concentration remain activity details for analytics; they are not automatically counted by the current goal engine.';panel.append(disclaimer);
}
if(root.document){const begin=()=>{mount();root.setTimeout?.(mount,1100)};if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',begin,{once:true});else begin()}
return {presets,applyPreset,mount};
});