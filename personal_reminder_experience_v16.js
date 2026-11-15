/* LifeOS Personal: unified Coming up + Reminders.
   Keeps plans and tasks distinct, never changes records, and only sends
   notifications when the browser is running and permission is granted. */
(()=>{'use strict';
const $=id=>document.getElementById(id),MIN=60000,DAY=86400000;
const ws=()=>{try{return window.lifeosReadOnlyWorkspace?.()||null}catch{return null}};
const local=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const validTime=t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const taskDate=t=>{const d=String(t.due||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return null;const tm=validTime(t.startTime)?t.startTime:validTime(t.dueTime)?t.dueTime:'23:59';const x=new Date(d+'T'+tm+':00');return Number.isFinite(x.getTime())?x.getTime():null};
const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
const shownNotices=new Set();
function entries(w,time){
 const result=[];
 for(const p of w.schedule||[]){
  if(!p||p.status==='skipped'||p.status==='completed'||!Number.isFinite(p.startAt)||!Number.isFinite(p.endAt))continue;
  const review=p.reminderReview||{};
  result.push({key:'plan:'+p.id,id:p.id,kind:'Activity',name:p.name||'Planned activity',start:p.startAt,end:p.endAt,created:Number(p.createdAt)||0,remind:p.reminder===true&&p.status==='planned'&&!p.sessionId&&review.state!=='dismissed'&&review.state!=='confirmed-not-started'&&!(review.snoozedUntil>time),past:p.endAt<time});
 }
 for(const t of w.todos||[]){
  if(!t||t.done)continue;const when=taskDate(t);if(when===null)continue;
  result.push({key:'task:'+t.id,id:t.id,kind:'To-do',name:t.name||'Task',start:when,end:when,created:Number(t.createdAt)||0,remind:validTime(t.startTime)||validTime(t.dueTime),past:when<time,anytime:!validTime(t.startTime)&&!validTime(t.dueTime)});
 }
 // Keep upcoming commitments distinct from overdue plans.
 // Date-only todos use their due date and 23:59 as the review deadline;
 // they are not presented as appointments with a fixed start time.
 return result.filter(x=>x.start<=time+7*DAY&&x.start>=time-7*DAY)
  .sort((a,b)=>a.start-b.start).slice(0,150);
}
function status(x,t){
 // A plan that started long ago must never remain labelled "Due now" because
 // its planned end is in the future or its duration is unusually long.
 if(x.past||x.start<t-10*MIN)return {label:'Earlier · Review',level:'past'};
 if(x.start<=t)return {label:'Due now',level:'now'};
 const minutes=Math.ceil((x.start-t)/MIN);
 if(minutes<=10)return {label:'Starting soon · '+minutes+'m',level:'soon'};
 return {label:'Scheduled',level:'normal'};
}
function go(x){
 document.querySelector('#lifeosNavigation [data-view="schedule"]')?.click();
 const d=local(new Date(x.start)),picker=$('scheduleDay');if(picker){picker.value=d;picker.dispatchEvent(new Event('change',{bubbles:true}))}
 const jump=document.querySelector('[data-v15-date-jump]');if(jump){jump.value=d;jump.dispatchEvent(new Event('change',{bubbles:true}))}
 setTimeout(()=>$('scheduleList')?.scrollIntoView({behavior:'smooth',block:'start'}),100);
}
async function showNotice(x){
 const preferences=window.LifeOSNotificationControlsV87?.read?.(localStorage);
 if(!preferences?.enabled||!('Notification'in window)||Notification.permission!=='granted')return;
 const stamp=x.key+':'+x.start;if(shownNotices.has(stamp))return;
 const hh=new Date(x.start).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
 try{
  const options={body:x.name+' · '+hh,tag:'lifeos-'+x.key,icon:undefined};
  if('serviceWorker'in navigator){
   const reg=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('No active notification worker')),2500))]);
   await reg.showNotification('LifeOS · Starting soon',options);
  }else{
   new Notification('LifeOS · Starting soon',options);
  }
  shownNotices.add(stamp);
 }catch(err){
  // Mobile browsers may reject Notification constructor; keep in-app alert.
  try{new Notification('LifeOS · Starting soon',{body:x.name+' · '+hh,tag:'lifeos-'+x.key});shownNotices.add(stamp)}catch(_){}
 }
}
function init(){
 const card=$('lo15Upcoming');if(!card)return;
 window.lifeosCombinedRemindersActive=true;
 if('Notification'in window&&Notification.permission==='granted'&&'serviceWorker'in navigator){navigator.serviceWorker.register('./lifeos_notifications_sw.js').catch(()=>{})}
 card.setAttribute('aria-label','Upcoming activities and reminders');
 const heading=card.querySelector('h2');if(heading)heading.textContent='Coming up & reminders';
 const head=card.querySelector('.lo15-upcoming-head');
 const notificationButton=el('button','lo16-notify','Enable notifications');notificationButton.type='button';
 head?.append(notificationButton);
 const list=card.querySelector('.lo15-upcoming-list');
 if(!list)return;
 const note=el('p','lo16-combined-note','Alerts are shown in LifeOS. Phone notifications require permission; delivery while the browser is closed is not guaranteed.');
 card.append(note);
 // The former standalone Reminders panel is intentionally merged into this card.
 const oldPanel=$('lo16ReminderPanel');if(oldPanel)oldPanel.remove();
 let expandedMore=false;
 let expandedReview=false;
 let lastPresentation='';
 function render(){
  const w=ws();if(!w)return;const current=Date.now(),items=entries(w,current);
  const capable='Notification'in window&&window.isSecureContext;
  const permission=capable?Notification.permission:'unavailable';
  const future=items.filter(x=>status(x,current).level!=='past');
  const past=items.filter(x=>status(x,current).level==='past').sort((a,b)=>b.start-a.start);
  const presentation=JSON.stringify(items.map(x=>[x.key,x.start,x.end,x.name,x.kind,status(x,current).level]))
    +'|'+permission;
  if(presentation===lastPresentation)return;
  lastPresentation=presentation;
  list.replaceChildren();

  const subtitle=el('p','lo124-upcoming-intro',
    'Next commitments first · past items needing attention are kept separate.');
  list.append(subtitle);

  const nextGroup=el('div','lo124-next');
  if(!future.length){
   nextGroup.append(el('div','lo124-no-next','Nothing scheduled in the next seven days.'));
  }
  const makeRow=(x,featured=false)=>{
   const state=status(x,current);
   const row=el('button',featured?'lo124-featured':'lo124-ladder-item');
   row.type='button';
   row.dataset.kind=x.kind.toLowerCase();
   row.dataset.reminderStatus=state.level;
   const date=new Date(x.start);
   const weekday=date.toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});
   const clock=x.anytime?'By end of day':date.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
   const name=el('strong','lo124-name',x.name);
   if(featured){
    row.append(el('span','lo124-eyebrow','NEXT UP'),name);
    const meta=el('span','lo124-meta');
    meta.append(el('span','lo124-date',weekday+' · '+clock),el('span','lo124-status '+state.level,state.label));
    row.append(meta);
   }else{
    const rail=el('span','lo124-rail');
    rail.append(el('span','lo124-clock',clock),el('i','lo124-node'));
    const body=el('span','lo124-row-body');
    body.append(name,el('small','',weekday+' · '+x.kind),el('span','lo124-status '+state.level,state.label));
    row.append(rail,body);
   }
   row.addEventListener('click',()=>go(x));
   return row;
  };

  // Never allow an old past-due item to occupy the featured Next Up card.
  if(future.length)nextGroup.append(makeRow(future[0],true));
  const later=future.slice(1);
  if(later.length){
   const ladder=el('div','lo124-ladder');
   for(const x of later.slice(0,2))ladder.append(makeRow(x));
   nextGroup.append(ladder);
   if(later.length>2){
    const extra=el('details','lo124-more');
    extra.open=expandedMore;
    extra.addEventListener('toggle',()=>{expandedMore=extra.open});
    extra.append(el('summary','', 'Show '+(later.length-2)+' more upcoming'));
    const inner=el('div','lo124-ladder');
    for(const x of later.slice(2))inner.append(makeRow(x));
    extra.append(inner);nextGroup.append(extra);
   }
  }
  list.append(nextGroup);

  if(past.length){
   const review=el('details','lo124-review');
   review.open=expandedReview;
   review.addEventListener('toggle',()=>{expandedReview=review.open});
   review.append(el('summary','',past.length+' earlier item'+(past.length===1?'':'s')+' to review'));
   const inner=el('div','lo124-review-items');
   for(const x of past.slice(0,12))inner.append(makeRow(x));
   if(past.length>12)inner.append(el('p','lo124-hint','More historical plans are available in Plan.'));
   review.append(inner);list.append(review);
  }

  for(const x of future){
   if(x.remind&&x.start-current<=10*MIN&&x.start-current>=-MIN)void showNotice(x);
  }
  // A disabled "Notifications enabled" button occupied an entire row on
  // mobile. Only show the button when the user can actually enable alerts.
  notificationButton.hidden=!capable||permission!=='default';
  notificationButton.disabled=permission!=='default';
  if(!notificationButton.hidden)notificationButton.textContent='Enable notifications';
  note.textContent=permission==='granted'?'Phone alerts enabled · delivery while the browser is closed is not guaranteed.':permission==='denied'?'Phone notifications blocked in browser settings. In-app reminders remain available.':'In-app reminders are available. Phone alerts require permission and may stop when the browser closes.';
 }
 notificationButton.addEventListener('click',async()=>{
  if(!('Notification'in window)||!window.isSecureContext)return;
  try{const permission=await Notification.requestPermission();if(permission==='granted'&&'serviceWorker'in navigator)navigator.serviceWorker.register('./lifeos_notifications_sw.js').catch(()=>{});}catch(_){}
  render();
 });
 document.getElementById('scheduleForm')?.addEventListener('submit',()=>setTimeout(render,120));
 document.getElementById('lifeosNavigation')?.addEventListener('click',()=>setTimeout(render,100));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 window.addEventListener('focus',render);
 setInterval(()=>{if(!document.hidden)render()},5000);
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();