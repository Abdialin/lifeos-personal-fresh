/* LifeOS V252: saved activity detail and corrections UI. Uses canonical V252 event bridge. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSActivityReviewV252=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const $=id=>root.document?.getElementById(id),dt=n=>{const d=new Date(n);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
const schemas={
 prayer:[['prayerName','Prayer','select',['','Fajr','Dhuhr','Asr','Maghrib','Isha']],['onTime','On time','boolean'],['congregation','In congregation','boolean'],['mosque','In mosque','boolean'],['row','Row','select',['','first','other','unknown']],['sunnahUnits','Sunnah units','number']],
 study:[['studySubject','Subject/course','text'],['studyPages','Pages/questions completed','number'],['studyFocus','Focus quality','select',['','low','medium','high']]],
 fitness:[['workoutType','Workout type','text'],['workoutSets','Sets or repetitions','text']],
 nutrition:[['mealType','Meal type','select',['','breakfast','lunch','dinner','snack']],['mealNotes','Food notes','text']],
 family:[['familyWith','Spent time with','text']],friends:[['socialContext','Social activity','text']],
 distraction:[['distractionCategory','Distraction category','select',['','social-media','phone','entertainment','unplanned-task','interruption','other']],['distractionTrigger','Trigger or reason','text']]
};
function category(name){return root.LifeOSActivityIntelligenceV251?.match(name)?.id||'other'}
function inputField(doc,key,label,type,options,value){
 const wrap=doc.createElement('label');wrap.style.cssText='display:grid;gap:5px;font-size:13px;color:#c6d9eb';
 const caption=doc.createElement('span');caption.textContent=label;wrap.append(caption);
 let input;
 if(type==='select'){input=doc.createElement('select');for(const opt of options){const o=doc.createElement('option');o.value=opt;o.textContent=opt||'Not specified';input.append(o)}}
 else if(type==='boolean'){input=doc.createElement('select');for(const [v,label] of [['','Not specified'],['true','Yes'],['false','No']]){const o=doc.createElement('option');o.value=v;o.textContent=label;input.append(o)}}
 else{input=doc.createElement('input');input.type=type;input.placeholder=label;if(type==='number'){input.min='0';input.max='10000';input.step='1'}else input.maxLength=240;}
 input.className='field';input.style.margin='0';input.value=value===true?'true':value===false?'false':value??'';input.dataset.key=key;input.dataset.type=type;wrap.append(input);return wrap;
}
function mount(){
 const doc=root.document,host=$('trackDistractionPanel')||$('trackActivePanel');
 if(!host||$('lo252-review'))return;
 const card=doc.createElement('section');card.id='lo252-review';card.className='panel';card.style.cssText='border:1px solid #4f8394;background:#102539';
 const title=doc.createElement('h2');title.textContent='Review activity · edit details and time';card.append(title);
 const intro=doc.createElement('p');intro.className='sub';intro.textContent='Classify a finished distraction immediately, record prayer/study details or correct a single-interval timer. Original time corrections remain in the activity audit history.';card.append(intro);
 const pick=doc.createElement('select');pick.className='field';pick.id='lo252-picker';card.append(pick);
 const body=doc.createElement('div');body.id='lo252-fields';body.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px';card.append(body);
 const period=doc.createElement('div');period.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:12px';card.append(period);
 const start=inputField(doc,'startAt','Start time','datetime-local',null,'');const end=inputField(doc,'endAt','Finish time','datetime-local',null,'');period.append(start,end);
 const note=doc.createElement('p');note.className='sub';note.textContent='Time edits are available only for completed single-interval sessions. Multi-segment pause/resume sessions require separate review.';card.append(note);
 const buttons=doc.createElement('div');buttons.className='row';const save=doc.createElement('button');save.type='button';save.className='btn primary';save.textContent='Save reviewed details';buttons.append(save);
 const refresh=doc.createElement('button');refresh.type='button';refresh.className='btn outline';refresh.textContent='Refresh activities';buttons.append(refresh);card.append(buttons);
 const status=doc.createElement('p');status.className='sub';status.setAttribute('role','status');card.append(status);
 const get=()=>root.lifeosReadOnlyWorkspace?.()?.sessions||[];
 function eligible(s){return s&&s.status==='finished'&&s.source!=='development-starter'&&s.source!=='assumed-demo'&&!s.seedBatch&&Number.isFinite(+s.startAt)}
 function current(){return get().find(s=>String(s.id)===pick.value)}
 function render(){
  const s=current();body.replaceChildren();if(!s){status.textContent='No completed editable activity available.';return}
  const cat=category(s.name),fields=s.activityDetailsV252||{},schema=schemas[cat]||[];
  body.append(inputField(doc,'category','Activity category','text',null,cat));
  for(const [key,label,type,options] of schema)body.append(inputField(doc,key,label,type,options,fields[key]));
  for(const [key,label] of [['preparationMinutes','Preparation minutes'],['travelMinutes','Travel minutes']])body.append(inputField(doc,key,label,'number',null,fields[key]));
  body.append(inputField(doc,'notes','Optional details or notes','text',null,fields.notes));
  start.querySelector('input').value=dt(s.startAt);end.querySelector('input').value=dt(s.endAt||s.startAt);
  const editable=s.status==='finished'&&s.segments?.length===1&&s.segments[0]?.end!=null;
  start.querySelector('input').disabled=!editable;end.querySelector('input').disabled=!editable;
  status.textContent='Selected: '+s.name+'. '+(editable?'Time can be corrected.':'This activity has a complex timeline; details can still be saved.');
 }
 function populate(selected){
  const rows=get().filter(eligible).sort((a,b)=>b.startAt-a.startAt).slice(0,150);
  pick.replaceChildren();for(const s of rows){const op=doc.createElement('option');op.value=s.id;op.textContent=new Date(s.startAt).toLocaleDateString()+' · '+s.name;pick.append(op)}
  if(rows.some(s=>String(s.id)===String(selected)))pick.value=String(selected);render();
 }
 pick.addEventListener('change',render);refresh.onclick=()=>populate(pick.value);
 save.onclick=()=>{
  const s=current();if(!s)return;
  const values={};for(const node of body.querySelectorAll('[data-key]')){
   const type=node.dataset.type,raw=node.value;
   if(type==='boolean')values[node.dataset.key]=raw===''?null:raw==='true';
   else if(type==='number'){if(raw==='')continue;const n=Number(raw);if(!Number.isFinite(n)||n<0||n>10000){status.textContent='Enter a valid nonnegative number.';return}values[node.dataset.key]=n}
   else values[node.dataset.key]=raw;
  }
  const begin=Date.parse(start.querySelector('input').value),finish=Date.parse(end.querySelector('input').value);
  const timeChanged=Number.isFinite(begin)&&Number.isFinite(finish)&&(begin!==s.startAt||finish!==s.endAt);
  if(timeChanged&&!root.confirm('Correct recorded start/end time? The original interval will be retained in an audit event.'))return;
  const d={id:String(s.id),fields:values,correction:timeChanged?{startAt:begin,endAt:finish,reason:'User-reviewed activity time'}:null,result:{ok:false}};
  root.dispatchEvent(new CustomEvent('lifeos-v252-save-review',{detail:d}));
  status.textContent=d.result?.message||'Save was not confirmed.';
  if(d.result?.ok)populate(s.id);
 };
 host.after(card);populate();root.addEventListener?.('lifeos-v77-tracking-changed',()=>{const id=pick.value;populate(id)});
}
if(root.document){const init=()=>{mount();root.setTimeout?.(mount,900)};if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',init,{once:true});else init()}
return {category,mount};
});