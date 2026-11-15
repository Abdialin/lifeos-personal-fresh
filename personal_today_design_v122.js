/* LifeOS Personal V122 — reusable day-view UX primitives.
   Today only. Read-only data presentation; display-mode preference is local.
   No timers, sessions, plans, todos, cloud records, or navigation are changed. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSTodayDesignV122=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const PREF='lifeos.personal.today.display.v122';
const PERIODS=[
 {id:'morning',label:'Morning',hours:[5,12],icon:'☀'},
 {id:'afternoon',label:'Afternoon',hours:[12,17],icon:'◒'},
 {id:'evening',label:'Evening',hours:[17,22],icon:'☾'},
 {id:'night',label:'Night',hours:[22,5],icon:'✦'}
];
function periodOf(timestamp){
 const hour=new Date(timestamp).getHours();
 if(hour>=5&&hour<12)return 'morning';
 if(hour>=12&&hour<17)return 'afternoon';
 if(hour>=17&&hour<22)return 'evening';
 return 'night';
}
function sameDay(timestamp,reference){
 const a=new Date(timestamp),b=new Date(reference);
 return Number.isFinite(a.getTime())&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
}
function plansForDay(workspace,now){
 const seen=new Set(),out=[];
 if(!workspace||typeof workspace!=='object')return out;
 for(const p of workspace.schedule||[]){
  if(!p||!Number.isFinite(p.startAt)||!sameDay(p.startAt,now)||p.status==='skipped')continue;
  const key='activity:'+String(p.id||p.name||p.startAt);
  if(seen.has(key))continue;seen.add(key);
  out.push({key,name:String(p.name||'Planned activity'),at:p.startAt,kind:'Activity',period:periodOf(p.startAt)});
 }
 for(const t of workspace.todos||[]){
  if(!t||t.done||typeof t.due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(t.due))continue;
  const d=new Date(t.due+'T12:00:00');
  if(!sameDay(d.getTime(),now))continue;
  const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.startTime||'')?t.startTime:
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.dueTime||'')?t.dueTime:null;
  if(!time)continue; // Flexible untimed tasks belong in Plan, not an arbitrary night.
  const at=new Date(t.due+'T'+time+':00').getTime();
  if(!Number.isFinite(at))continue;
  const key='todo:'+String(t.id||t.name||at);
  if(seen.has(key))continue;seen.add(key);
  out.push({key,name:String(t.name||'To-do'),at,kind:'To-do',period:periodOf(at)});
 }
 return out.sort((a,b)=>a.at-b.at).slice(0,100);
}
function modeValue(value){return value==='detailed'?'detailed':'compact'}
function safeRead(){try{return modeValue(root.localStorage.getItem(PREF))}catch{return 'compact'}}
function safeWrite(value){try{root.localStorage.setItem(PREF,modeValue(value))}catch{}}
function timeLabel(at){return new Date(at).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}
function create(tag,cls,txt){
 const node=root.document.createElement(tag);
 if(cls)node.className=cls;
 if(txt!==undefined)node.textContent=txt;
 return node;
}
let selectedPeriod='morning',selectedInterval=null;
function goToPlan(timestamp){
 const nav=root.document.querySelector('#lifeosNavigation [data-view="schedule"]');
 nav?.click();
 const d=new Date(timestamp);
 const key=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const picker=root.document.getElementById('scheduleDay');
 if(picker){picker.value=key;picker.dispatchEvent(new Event('change',{bubbles:true}))}
}
function createAgenda(){
 const upcoming=root.document.getElementById('lo15Upcoming');
 if(!upcoming||root.document.getElementById('lo122-agenda'))return;
 const shell=create('section','lo122-agenda');shell.id='lo122-agenda';shell.setAttribute('aria-label','Today agenda');
 const head=create('div','lo122-head');
 const title=create('div','');
 title.append(create('span','lo122-eyebrow','TODAY · TIME BLOCKS'),create('h2','','Your day, in four parts'));
 const mode=create('div','lo122-mode');mode.setAttribute('role','group');mode.setAttribute('aria-label','Today display density');
 for(const [value,label] of [['compact','Compact'],['detailed','Detailed']]){
  const button=create('button','lo122-mode-button',label);
  button.type='button';button.dataset.lo122Mode=value;mode.append(button);
 }
 head.append(title,mode);
 const grid=create('div','lo122-periods');
 const details=create('div','lo122-agenda-detail');details.id='lo122-agenda-detail';
 details.setAttribute('aria-live','polite');
 shell.append(head,grid,details);
 upcoming.before(shell);
 function render(){
  let workspace=null;
  try{workspace=root.lifeosReadOnlyWorkspace?.()||null}catch{}
  const now=Date.now(),items=plansForDay(workspace,now);
  const activePeriod=periodOf(now);
  // Default to the part of the day the user is currently experiencing.
  if(!grid.dataset.initialized){selectedPeriod=activePeriod;grid.dataset.initialized='true'}
  grid.replaceChildren();
  for(const p of PERIODS){
   const selected=p.id===selectedPeriod,count=items.filter(x=>x.period===p.id).length;
   const button=create('button','lo122-period'+(selected?' is-selected':''));
   button.type='button';button.dataset.lo122Period=p.id;
   button.setAttribute('aria-pressed',String(selected));
   button.setAttribute('aria-label',p.label+', '+count+' timed commitment'+(count===1?'':'s'));
   const ico=create('span','lo122-period-icon',p.icon);ico.setAttribute('aria-hidden','true');
   button.append(ico,create('span','lo122-period-label',p.label),create('strong','lo122-period-count',String(count)));
   grid.append(button);
  }
  const selected=PERIODS.find(p=>p.id===selectedPeriod)||PERIODS[0];
  const matching=items.filter(x=>x.period===selected.id);
  details.replaceChildren();
  const label=create('div','lo122-detail-header');
  label.append(create('strong','',selected.label+' · '+matching.length+' timed commitment'+(matching.length===1?'':'s')));
  const action=create('button','lo122-view-plan','Open Plan ↗');action.type='button';
  action.addEventListener('click',()=>goToPlan(now));label.append(action);details.append(label);
  const limit=safeRead()==='compact'?2:6;
  if(!matching.length)details.append(create('p','lo122-empty','No timed commitments in this part of the day.'));
  for(const x of matching.slice(0,limit)){
   const row=create('button','lo122-item');
   row.type='button';row.dataset.kind=x.kind.toLowerCase();
   row.append(create('span','lo122-item-time',timeLabel(x.at)),create('span','lo122-item-name',x.name));
   row.addEventListener('click',()=>goToPlan(x.at));
   details.append(row);
  }
  if(matching.length>limit){
   const more=create('button','lo122-expand','+'+(matching.length-limit)+' more · View in Plan');
   more.type='button';more.addEventListener('click',()=>goToPlan(now));details.append(more);
  }
  root.document.body.dataset.lo122Mode=safeRead();
  for(const b of mode.querySelectorAll('[data-lo122-mode]')){
   b.setAttribute('aria-pressed',String(b.dataset.lo122Mode===safeRead()));
  }
 }
 grid.addEventListener('click',e=>{
  const b=e.target.closest('[data-lo122-period]');if(!b)return;
  selectedPeriod=b.dataset.lo122Period;render();
 });
 mode.addEventListener('click',e=>{
  const b=e.target.closest('[data-lo122-mode]');if(!b)return;
  safeWrite(b.dataset.lo122Mode);render();
 });
 root.document.addEventListener('visibilitychange',()=>{if(!root.document.hidden)render()});
 root.addEventListener('focus',render);
 let signature='';
 root.setInterval(()=>{
  if(root.document.hidden||root.document.body.dataset.lifeosView!=='dashboard')return;
  let w=null;try{w=root.lifeosReadOnlyWorkspace?.()||null}catch{}
  const now=Date.now(),items=plansForDay(w,now);
  const next=items.map(x=>[x.key,x.at,x.name]).join('|')+'|'+new Date(now).getDate()+'|'+safeRead();
  if(signature!==next){signature=next;render()}
 },30000);
 render();
}
function createIntervalDetails(){
 const rootEl=root.document.getElementById('v4Today');
 if(!rootEl||root.document.getElementById('lo122-timeline-detail'))return;
 const detail=create('div','lo122-timeline-detail');
 detail.id='lo122-timeline-detail';detail.hidden=true;
 rootEl.after(detail);
 root.document.addEventListener('click',event=>{
  const button=event.target.closest('#v4Today [data-lo122-interval]');
  if(!button)return;
  const start=Number(button.dataset.start),end=Number(button.dataset.end);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return;
  selectedInterval=button.dataset.lo122Interval;
  detail.replaceChildren();
  const title=create('div','lo122-detail-header');
  title.append(create('strong','',button.dataset.name||'Tracked activity'));
  const close=create('button','lo122-detail-close','Close ×');close.type='button';
  close.addEventListener('click',()=>{detail.hidden=true;selectedInterval=null});
  title.append(close);detail.append(title);
  const clock=create('p','lo122-interval-time',timeLabel(start)+'–'+timeLabel(end));
  const mins=(end-start)/60000;
  const duration=mins<1?'<1 minute':Math.round(mins)+' minutes';
  detail.append(clock,create('p','lo122-interval-label','Recorded interval · '+duration+
    '. This view does not infer whether the activity was planned or completed.'));
  detail.hidden=false;
  button.setAttribute('aria-pressed','true');
 });
}
function init(){
 createAgenda();
 createIntervalDetails();
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
}
return {PREF,PERIODS,periodOf,sameDay,plansForDay,modeValue};
});
