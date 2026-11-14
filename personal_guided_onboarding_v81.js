/* LifeOS V81 — guided first-use setup. Approval-first; no synthetic history.
   Proposes plans, habit definitions and to-dos, never actual tracked sessions.
   Imports remain delegated to existing Google Calendar / file review workflow. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSGuidedOnboardingV81=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],STEPS=['Welcome','Weekly activities','Habits & tasks','Imports & review'];
const DATE=/^([01]\d|2[0-3]):[0-5]\d$/,DAY=86400000;
function times(name,days,time,minutes){
 if(!String(name||'').trim()||String(name).length>80||!Array.isArray(days)||!days.length||!days.every(x=>Number.isInteger(x)&&x>=0&&x<=6)||!DATE.test(time)||!Number.isSafeInteger(minutes)||minutes<5||minutes>720)return null;
 return {name:String(name).trim(),days:[...new Set(days)],time,minutes};
}
function nextWeek(routines,now=Date.now()){
 const output=[],start=new Date(now);
 start.setHours(0,0,0,0);
 for(let offset=0;offset<7;offset++){
  const day=new Date(start);day.setDate(start.getDate()+offset);
  for(const r of routines||[]){
   const valid=times(r.name,r.days,r.time,r.minutes);
   if(!valid||!valid.days.includes(day.getDay()))continue;
   const [h,m]=valid.time.split(':').map(Number),from=new Date(day);
   from.setHours(h,m,0,0);const a=from.getTime(),b=a+valid.minutes*60000;
   if(b<=now)continue;
   output.push({name:valid.name,startAt:a,endAt:b,status:'planned',reminder:true,source:'onboarding-v81',notes:'First-week proposal approved during onboarding; not a tracked activity.'});
  }
 }
 return output.sort((a,b)=>a.startAt-b.startAt);
}
function conflicts(candidate,existing){
 return (existing||[]).filter(p=>p&&p.status!=='cancelled'&&p.status!=='skipped'&&Number.isFinite(p.startAt)&&Number.isFinite(p.endAt)&&p.startAt<candidate.endAt&&candidate.startAt<p.endAt);
}
function prepare(draft,workspace,now=Date.now()){
 const routines=Array.isArray(draft?.routines)?draft.routines:[],habits=Array.isArray(draft?.habits)?draft.habits:[],tasks=Array.isArray(draft?.tasks)?draft.tasks:[];
 if(routines.length>20||habits.length>20||tasks.length>30)return {ok:false,error:'Too many setup entries for one review.'};
 const plans=nextWeek(routines,now);
 const existing=workspace?.schedule||[],blocked=[],ready=[];
 for(const p of plans){
  const overlapping=conflicts(p,[...existing,...ready]);
  const duplicate=existing.some(x=>x&&x.name===p.name&&x.startAt===p.startAt&&x.endAt===p.endAt);
  if(overlapping.length||duplicate)blocked.push({...p,reason:duplicate?'duplicate':'overlap'});
  else ready.push(p);
 }
 const habitDefs=[];
 for(const h of habits){
  const title=String(h.title||'').trim(),everyDays=Number(h.everyDays);
  if(!title||title.length>80||!Number.isSafeInteger(everyDays)||everyDays<1||everyDays>30)return {ok:false,error:'Invalid habit name or frequency.'};
  if(!(workspace?.habitDefinitions||[]).some(x=>x.title?.toLowerCase()===title.toLowerCase()))habitDefs.push({title,everyDays,category:'Personal',matchText:title,targetMode:'completion',targetAmount:null,targetUnit:'',source:'onboarding-v81'});
 }
 const todoDefs=[];
 for(const t of tasks){
  const name=String(t.name||'').trim();
  if(!name||name.length>80)return {ok:false,error:'Invalid task name.'};
  if(!(workspace?.todos||[]).some(x=>!x.done&&x.name?.toLowerCase()===name.toLowerCase()))todoDefs.push({name,due:null,dueTime:null,startTime:null,endTime:null,timingType:'anytime',reminder:false,priority:'medium',category:'Onboarding',done:false,completedAt:null,source:'onboarding-v81'});
 }
 return {ok:true,plans:ready,blocked,habits:habitDefs,tasks:todoDefs,totalPlanned:plans.length};
}
function mount(){
 if(document.getElementById('lo81-onboarding'))return;
 const overlay=document.createElement('div');overlay.id='lo81-onboarding';overlay.className='lo81-overlay';overlay.hidden=true;
 overlay.innerHTML='<section class="lo81-card" role="dialog" aria-modal="true" aria-labelledby="lo81-title"><header class="lo81-head"><div><small id="lo81-step"></small><h2 id="lo81-title">Welcome to LifeOS</h2></div><button type="button" id="lo81-close" class="btn outline" aria-label="Close guided setup">Close</button></header><div id="lo81-content" class="lo81-content"></div><footer class="lo81-foot"><button class="btn outline" type="button" id="lo81-back">Back</button><button class="btn primary" type="button" id="lo81-next">Continue</button></footer><p id="lo81-message" role="status" class="lo81-message"></p></section>';
 document.body.append(overlay);
 const trigger=document.createElement('button');trigger.id='lo81-open';trigger.type='button';trigger.className='btn outline lo81-trigger';trigger.textContent='Guided setup';
 const settings=document.getElementById('lo14SettingsHub'),header=document.querySelector('header.top');
 (settings||header||document.body).append(trigger);
 const $=id=>document.getElementById(id);
 const draft={routines:[],habits:[],tasks:[]};let step=0,approved=null;
 const ws=()=>{try{return root.lifeosReadOnlyWorkspace?.()||{}}catch{return {}}};
 function message(s){$('lo81-message').textContent=s}
 function open(){overlay.hidden=false;document.body.classList.add('lo81-open');step=0;redraw()}
 function close(){overlay.hidden=true;document.body.classList.remove('lo81-open');try{sessionStorage.setItem('lifeos.personal.onboarding.offered.v81','1')}catch{}}
 trigger.addEventListener('click',open);$('lo81-close').addEventListener('click',close);
 overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 function el(tag,text){const n=document.createElement(tag);n.textContent=text;return n}
 function field(label,type,attrs={}){
  const box=document.createElement('label');box.className='lo81-field';box.append(el('span',label));
  const input=document.createElement('input');input.type=type;input.className='field';
  for(const [k,v]of Object.entries(attrs))input[k]=v;box.append(input);return {box,input};
 }
 function redraw(){
  approved=null;const area=$('lo81-content');area.replaceChildren();message('');
  $('lo81-step').textContent='Step '+(step+1)+' of '+STEPS.length;
  $('lo81-title').textContent=STEPS[step];
  $('lo81-back').disabled=step===0;$('lo81-next').textContent=step===STEPS.length-1?'Review first week':'Continue';
  if(step===0){
   area.append(el('p','Set up your week in a few minutes. Start with activities and habits; detailed gym and nutrition setup can wait.'));
   area.append(el('p','You can skip any step. Proposed times are plans only—not evidence that an activity happened.'));
   area.append(el('p','Existing sessions and imported records will not be replaced.'));
   const quick=document.createElement('button');quick.className='btn outline';quick.type='button';quick.textContent='Skip setup and start tracking';quick.onclick=()=>{close();document.querySelector('#lifeosNavigation button[data-view="tracking"]')?.click()};area.append(quick);
  }else if(step===1){
   area.append(el('p','Add repeating work, study, prayer or training blocks. Choose their days and approximate duration. Only the next seven days are proposed for approval.'));
   const name=field('Activity name','text',{maxLength:80,placeholder:'e.g. Gym or Studying'}),time=field('Local start time','time',{value:'18:00'}),min=field('Minutes','number',{value:'60',min:5,max:720});
   area.append(name.box,time.box,min.box);
   const selector=document.createElement('div');selector.className='lo81-weekdays';
   for(let i=0;i<7;i++){const wrap=document.createElement('label');const inp=document.createElement('input');inp.type='checkbox';inp.value=i;wrap.append(inp,el('span',DAYS[i]));selector.append(wrap)}area.append(selector);
   const add=document.createElement('button');add.type='button';add.className='btn outline';add.textContent='Add weekly activity';area.append(add);
   add.onclick=()=>{const days=[...selector.querySelectorAll('input:checked')].map(x=>Number(x.value)),entry=times(name.input.value,days,time.input.value,Number(min.input.value));if(!entry)return message('Enter a name, valid time, duration and at least one weekday.');draft.routines.push(entry);redraw()};
   const list=el('ul','');for(const [i,r]of draft.routines.entries()){const li=el('li',r.name+' · '+r.days.map(d=>DAYS[d]).join(', ')+' · '+r.time+' · '+r.minutes+' min');const remove=el('button','Remove');remove.type='button';remove.className='btn outline';remove.onclick=()=>{draft.routines.splice(i,1);redraw()};li.append(remove);list.append(li)}area.append(list);
  }else if(step===2){
   area.append(el('p','Choose habits and optional tasks. Detailed workout plans, favorite foods and nutrition preferences can be completed later.'));
   const habit=field('Habit name','text',{placeholder:'e.g. Read Quran, walk, read a book',maxLength:80});
   const freq=field('Repeat every N days','number',{value:'1',min:1,max:30});
   area.append(habit.box,freq.box);
   const addH=el('button','Add habit');addH.type='button';addH.className='btn outline';area.append(addH);
   addH.onclick=()=>{if(!habit.input.value.trim()||!Number.isSafeInteger(Number(freq.input.value))||Number(freq.input.value)<1||Number(freq.input.value)>30)return message('Add a valid habit and repetition interval.');draft.habits.push({title:habit.input.value.trim(),everyDays:Number(freq.input.value)});redraw()};
   const todo=field('Flexible to-do (optional)','text',{maxLength:80,placeholder:'e.g. Buy groceries or submit application'});area.append(todo.box);
   const addT=el('button','Add to-do');addT.type='button';addT.className='btn outline';area.append(addT);
   addT.onclick=()=>{if(!todo.input.value.trim())return message('Enter a task.');draft.tasks.push({name:todo.input.value.trim()});redraw()};
   for(const [label,entries,type]of [['Habits',draft.habits,'habits'],['Tasks',draft.tasks,'tasks']]){area.append(el('h3',label));const list=el('ul','');for(const [i,v]of entries.entries()){const li=el('li',v.title||v.name);const b=el('button','Remove');b.type='button';b.className='btn outline';b.onclick=()=>{draft[type].splice(i,1);redraw()};li.append(b);list.append(li)}area.append(list)}
  }else{
   area.append(el('p','Optional: import Google Calendar or an existing schedule file using the Plan import tools. Imported information must be reviewed and approved there before it becomes a plan.'));
   const openImports=el('a','Open Calendar Review (Google, ICS and documents)');openImports.className='btn outline';openImports.href='/calendar.html';area.append(openImports);
   const transfer=el('button','Review imported candidates in Plan');transfer.type='button';transfer.className='btn outline';
   transfer.onclick=()=>{close();document.querySelector('#lifeosNavigation button[data-view="schedule"]')?.click();root.setTimeout(()=>document.getElementById('calendarHandoffPanel')?.scrollIntoView({block:'start',behavior:'smooth'}),90)};
   area.append(transfer);
   area.append(el('p','After previewing your source in Calendar Review, approve its transfer there, return to LifeOS Plan, and approve its addition to your schedule. Imported plans are not actual tracked sessions.'));
   area.append(el('p','You can also add fixed deadlines in Plan → Tasks. Fitness and nutrition details remain optional.'));
   const preview=prepare(draft,ws(),Date.now());if(!preview.ok)return message(preview.error);
   const existing=ws()?.schedule||[];
   const from=new Date();from.setHours(0,0,0,0);const until=new Date(from);until.setDate(until.getDate()+7);
   const actual=existing.filter(p=>p&&Number.isFinite(p.startAt)&&Number.isFinite(p.endAt)&&p.startAt<until.getTime()&&p.endAt>from.getTime()&&p.status!=='cancelled');
   const imported=actual.filter(p=>p.calendarSource==='google'||p.calendarSource==='ics-import');
   area.append(el('p','Already in your week: '+actual.length+' plans, including '+imported.length+' calendar imports. New proposals below are checked against these plans.'));
   area.append(el('h3','First-week preview'));
   area.append(el('p',preview.plans.length+' nonconflicting proposed plans · '+preview.blocked.length+' conflicts/duplicates excluded · '+preview.habits.length+' habits · '+preview.tasks.length+' tasks.'));
   const list=el('ul','');for(const p of preview.plans.slice(0,30))list.append(el('li',p.name+' · '+new Date(p.startAt).toLocaleString()+' – '+new Date(p.endAt).toLocaleTimeString()));area.append(list);
   if(preview.blocked.length)area.append(el('p','Conflicting or duplicate plans will not be added. Adjust them later in Plan.'));
   approved=preview;
  }
 }
 $('lo81-back').onclick=()=>{if(step>0){step--;redraw()}};
 $('lo81-next').onclick=()=>{
  if(step<STEPS.length-1){step++;redraw();return}
  const latest=prepare(draft,ws(),Date.now());
  if(!latest.ok)return message(latest.error);
  // Revalidate against current workspace at approval time; no write from the UI.
  const detail={draft:JSON.parse(JSON.stringify(draft)),review:latest,result:{ok:false,message:'Setup not saved.'}};
  if(!root.confirm('Approve '+latest.plans.length+' first-week plans, '+latest.habits.length+' habits and '+latest.tasks.length+' tasks? No tracked activities will be generated.'))return message('Setup not applied.');
  root.dispatchEvent(new CustomEvent('lifeos-v81-approve-onboarding',{detail}));
  message(detail.result?.message||'Setup could not be saved.');
  if(detail.result?.ok){try{localStorage.setItem('lifeos.personal.onboarded.v81','1')}catch{}close();document.querySelector('#lifeosNavigation button[data-view="dashboard"]')?.click()}
 };
 // For genuinely empty accounts only. Do not interrupt an existing populated workspace.
 root.setTimeout(()=>{
  if(localStorage.getItem('lifeos.personal.onboarded.v81'))return;
  const w=ws();if((w.sessions||[]).length||(w.schedule||[]).length||(w.todos||[]).length||(w.habitDefinitions||[]).length)return;
  // User chooses to open; never surprise-show during a running activity.
  trigger.classList.add('lo81-new');
  // Offer once per browser tab on an entirely empty workspace; never overwrite data.
  try{if(!sessionStorage.getItem('lifeos.personal.onboarding.offered.v81')){sessionStorage.setItem('lifeos.personal.onboarding.offered.v81','1');open()}}catch{}
 },200);
}
const api={times,nextWeek,conflicts,prepare};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return api;
});
