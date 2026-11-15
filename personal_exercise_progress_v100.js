/* LifeOS V100 — optional user-confirmed exercise progression.
 * Performance entries are manual self-reports linked to a saved workout ID.
 * Never modifies actual time tracking, meals or the source workout. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSExerciseProgressV100=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos.personal.exercise-progress.v100';
function valid(input){
 const workoutId=String(input?.workoutId||''),exercise=String(input?.exercise||'').trim();
 const sets=Number(input?.sets),reps=Number(input?.reps),load=input?.load==null||input.load===''?null:Number(input.load);
 const date=String(input?.date||'');
 if(!workoutId||workoutId.length>100||!exercise||exercise.length>65||!/^\d{4}-\d\d-\d\d$/.test(date))return null;
 const parsed=new Date(date+'T12:00:00');
 if(!Number.isFinite(parsed.getTime())||[parsed.getFullYear(),String(parsed.getMonth()+1).padStart(2,'0'),String(parsed.getDate()).padStart(2,'0')].join('-')!==date)return null;
 if(!Number.isInteger(sets)||sets<1||sets>20||!Number.isInteger(reps)||reps<1||reps>100||load!==null&&(!Number.isFinite(load)||load<0||load>1000))return null;
 return {workoutId,exercise,date,sets,reps,load};
}
function read(store){try{const data=JSON.parse(store.getItem(KEY)||'[]');return Array.isArray(data)?data.slice(-500).filter(x=>x&&typeof x.id==='string'&&valid(x)).map(x=>({id:x.id,...valid(x)})):[]}catch{return []}}
function trend(records,workoutId,exercise){return records.filter(x=>x.workoutId===workoutId&&x.exercise===exercise).sort((a,b)=>a.date.localeCompare(b.date)).map(x=>({date:x.date,volume:x.load==null?null:Math.round(x.sets*x.reps*x.load*10)/10,reps:x.reps,sets:x.sets,load:x.load}))}
function mount(){
 const form=document.getElementById('fitnessForm');if(!form||document.getElementById('lo100-progress'))return;
 const panel=document.createElement('details');panel.id='lo100-progress';panel.innerHTML='<summary>Exercise progression · optional actual performance</summary><p class="sub">Select a previously logged workout and manually confirm sets and repetitions. These entries are self-reported exercise details, not new workouts or tracked minutes.</p><label>Logged workout<select id="lo100-workout" class="field"></select></label><label>Exercise<input id="lo100-exercise" class="field" maxlength="65" placeholder="e.g. Squat"></label><label>Sets<input type="number" id="lo100-sets" class="field" min="1" max="20" value="3"></label><label>Repetitions<input type="number" id="lo100-reps" class="field" min="1" max="100" value="10"></label><label>Load in kg (optional)<input type="number" id="lo100-load" class="field" min="0" max="1000" step="0.5"></label><button type="button" class="btn outline" id="lo100-save">Save confirmed exercise details</button><div id="lo100-history"></div><p id="lo100-message" role="status" class="sub"></p>';
 form.after(panel);
 const el=id=>panel.querySelector('#'+id),message=el('lo100-message'),select=el('lo100-workout');
 const store=root.localStorage;let records=read(store);
 const getWorkouts=()=>((root.lifeosReadOnlyWorkspace?.()?.workouts)||[]).filter(w=>w&&w.id&&!w.seedBatch&&!['assumed-demo','development-starter'].includes(w.source));
 function loadWorkouts(){
  const previous=select.value;select.replaceChildren(new Option('Select a logged workout',''));
  for(const w of getWorkouts().slice(-100).reverse())select.add(new Option((w.date||'')+' · '+(w.type||'Workout'),String(w.id)));
  if([...select.options].some(x=>x.value===previous))select.value=previous;
 }
 function render(){
  const list=el('lo100-history');list.replaceChildren();
  const validIds=new Set(getWorkouts().map(x=>String(x.id)));
  const entries=records.filter(x=>validIds.has(x.workoutId)).slice(-25).reverse();
  if(!entries.length)list.textContent='No exercise-performance entries linked to logged workouts.';
  for(const entry of entries){
   const line=document.createElement('p');line.textContent=entry.date+' · '+entry.exercise+' · '+entry.sets+'×'+entry.reps+(entry.load==null?'':' @ '+entry.load+' kg');
   const remove=document.createElement('button');remove.type='button';remove.textContent='Delete entry';remove.className='btn outline';remove.onclick=()=>{if(!root.confirm('Delete this self-reported exercise detail? The workout record remains unchanged.'))return;const next=records.filter(x=>x.id!==entry.id);try{store.setItem(KEY,JSON.stringify(next));records=next;render()}catch{message.textContent='Could not delete detail.'}};
   line.append(remove);list.append(line);
  }
 }
 el('lo100-save').onclick=()=>{
  const w=getWorkouts().find(x=>String(x.id)===select.value);if(!w)return message.textContent='Choose an existing logged workout.';
  const item=valid({workoutId:String(w.id),exercise:el('lo100-exercise').value,date:w.date,sets:el('lo100-sets').value,reps:el('lo100-reps').value,load:el('lo100-load').value});
  if(!item)return message.textContent='Check exercise name, sets, repetitions, date and load.';
  if(records.length>=500)return message.textContent='Maximum 500 entries; remove older details before adding more.';
  if(!root.confirm('Confirm these exercise details were completed during the selected logged workout?'))return;
  const next=[...records,{...item,id:root.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2)}];
  try{store.setItem(KEY,JSON.stringify(next));records=next;message.textContent='Exercise details saved locally. No timer time or new workout was added.';render()}catch{message.textContent='Storage failed. No exercise details were saved.'}
 };
 root.addEventListener('focus',()=>{loadWorkouts();render()});loadWorkouts();render();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {KEY,valid,read,trend};
});