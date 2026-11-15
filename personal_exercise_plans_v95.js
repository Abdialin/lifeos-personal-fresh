/* LifeOS V95 — optional detailed exercise plan templates. No workout logging.
 * A saved plan is a reusable definition, never evidence that exercise occurred. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSExercisePlansV95=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos.personal.exercise-plans.v95',MAX=20;
function cleanExercise(x){
 const name=String(x?.name||'').trim();
 const sets=Number(x?.sets),reps=Number(x?.reps),load= x?.load===''||x?.load==null?null:Number(x.load);
 if(!name||name.length>65||!Number.isInteger(sets)||sets<1||sets>20||!Number.isInteger(reps)||reps<1||reps>100||load!==null&&(!Number.isFinite(load)||load<0||load>1000))return null;
 return {name,sets,reps,load};
}
function validate(plan){
 const name=String(plan?.name||'').trim(),type=String(plan?.type||'Gym');
 if(!name||name.length>70||!['Gym','Walking','Running','Boxing','Cycling','Swimming','Yoga','Team sports','Other'].includes(type))return {ok:false,reason:'Enter a supported plan name and type.'};
 if(!Array.isArray(plan.exercises)||plan.exercises.length<1||plan.exercises.length>30)return {ok:false,reason:'A plan needs 1–30 exercises.'};
 const exercises=plan.exercises.map(cleanExercise);if(exercises.some(x=>!x))return {ok:false,reason:'Review exercise names, sets, reps and optional load.'};
 return {ok:true,plan:{name,type,exercises}};
}
function read(store){try{const p=JSON.parse(store.getItem(KEY)||'[]');return Array.isArray(p)?p.slice(0,MAX).filter(x=>x&&typeof x.id==='string'&&validate(x).ok).map(x=>({id:x.id,...validate(x).plan})):[]}catch{return []}}
function mount(){
 const f=document.getElementById('fitnessForm');if(!f||document.getElementById('lo95-plans'))return;
 const section=document.createElement('details');section.id='lo95-plans';section.innerHTML='<summary>Exercise plans · optional detail</summary><p class="sub">Build a reusable list of exercises, sets, repetitions and optional weight. Plans do not create completed workouts. Reuse a plan by copying its details into your workout form, then save an actual record only after training.</p><label class="sub">Plan name<input id="lo95-name" class="field" maxlength="70" placeholder="Full body A"></label><label class="sub">Activity type<select id="lo95-type" class="field"><option>Gym</option><option>Walking</option><option>Running</option><option>Boxing</option><option>Cycling</option><option>Swimming</option><option>Yoga</option><option>Team sports</option><option>Other</option></select></label><div id="lo95-inputs"></div><button type="button" class="btn outline" id="lo95-add">Add exercise</button><button type="button" class="btn primary" id="lo95-save">Save exercise plan</button><div id="lo95-library"></div><p id="lo95-message" role="status" class="sub"></p>';
 f.after(section);
 const style=document.createElement('style');style.textContent=`
 #lo95-plans{margin:14px 0;padding:14px;border:1px solid #536c8a;border-radius:12px;background:#17243b;color:#edf4ff}
 #lo95-plans .lo95-row{display:grid;grid-template-columns:minmax(110px,2fr) repeat(3,minmax(50px,1fr)) auto;gap:5px;margin:8px 0}
 #lo95-plans input{min-width:0;max-width:100%;border-radius:6px;padding:8px;background:#101e33;color:white;border:1px solid #567494}
 #lo95-plans button{margin:4px;min-height:40px}
 @media(max-width:520px){#lo95-plans .lo95-row{grid-template-columns:1fr 1fr}.lo95-row input:first-child{grid-column:1/-1}}
 `;document.head.append(style);
 const el=id=>section.querySelector('#'+id),inputs=el('lo95-inputs'),message=el('lo95-message'),library=el('lo95-library');
 let plans=read(root.localStorage);
 function field(type,placeholder,min,max,value){const x=document.createElement('input');x.type=type;x.placeholder=placeholder;if(min!=null)x.min=min;if(max!=null)x.max=max;if(value!=null)x.value=value;return x}
 function add(x){
  const row=document.createElement('div');row.className='lo95-row';
  const name=field('text','Exercise',null,65,x?.name||''),sets=field('number','Sets',1,20,x?.sets||3),reps=field('number','Reps',1,100,x?.reps||10),load=field('number','kg optional',0,1000,x?.load??'');
  name.maxLength=65;load.step='0.5';const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Remove exercise';remove.onclick=()=>row.remove();
  for(const [a,label] of [[name,'Exercise'],[sets,'Sets'],[reps,'Repetitions'],[load,'Load in kilograms']])a.setAttribute('aria-label',label);
  row.append(name,sets,reps,load,remove);inputs.append(row);
 }
 function collect(){return [...inputs.querySelectorAll('.lo95-row')].map(row=>{const a=row.querySelectorAll('input');return {name:a[0].value,sets:Number(a[1].value),reps:Number(a[2].value),load:a[3].value===''?null:Number(a[3].value)}})}
 function persist(next){try{root.localStorage.setItem(KEY,JSON.stringify(next));plans=next;return true}catch{return false}}
 function render(){
  library.replaceChildren();if(!plans.length){library.textContent='No saved exercise plans yet.';return}
  for(const p of plans){const wrapper=document.createElement('div'),name=document.createElement('strong');name.textContent=p.name+' · '+p.exercises.length+' exercises';wrapper.append(name);
   const apply=document.createElement('button');apply.type='button';apply.textContent='Fill workout notes';apply.onclick=()=>{
    const details=document.getElementById('fitnessDetail'),type=document.getElementById('fitnessType');
    if(!details)return message.textContent='Workout form unavailable.';
    if(type&&[...type.options].some(o=>o.value===p.type))type.value=p.type;
    details.value=p.exercises.map(x=>x.name+': '+x.sets+' × '+x.reps+(x.load==null?'':' @ '+x.load+' kg')).join('; ');
    details.dispatchEvent(new Event('input',{bubbles:true}));message.textContent='Workout details filled, not recorded. Review before saving.';f.scrollIntoView({behavior:'smooth',block:'start'});
   };wrapper.append(apply);
   const remove=document.createElement('button');remove.type='button';remove.textContent='Delete plan';remove.onclick=()=>{if(!root.confirm('Remove this exercise template? Past workouts will not change.'))return;const next=plans.filter(x=>x.id!==p.id);if(persist(next))render()};wrapper.append(remove);library.append(wrapper)}
 }
 el('lo95-add').onclick=()=>{if(inputs.children.length<30)add();else message.textContent='Maximum 30 exercises per plan.'};
 el('lo95-save').onclick=()=>{
  const result=validate({name:el('lo95-name').value,type:el('lo95-type').value,exercises:collect()});
  if(!result.ok)return message.textContent=result.reason;
  if(plans.length>=MAX)return message.textContent='Maximum 20 plans.';
  const id=root.crypto?.randomUUID?.()||String(Date.now())+'-'+String(Math.random()).slice(2);
  if(!persist([...plans,{id,...result.plan}]))return message.textContent='Unable to save exercise plan.';
  message.textContent='Exercise plan saved on this device. No workout was logged.';render();
 };
 add();render();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {KEY,MAX,cleanExercise,validate,read};
});