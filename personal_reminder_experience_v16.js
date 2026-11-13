/* LifeOS Personal: unified Coming up + Reminders.
   Keeps plans and tasks distinct, never changes records, and only sends
   notifications when the browser is running and permission is granted. */
(()=>{'use strict';
const $=id=>document.getElementById(id),MIN=60000,DAY=86400000;
const ws=()=>{try{return window.lifeosReadOnlyWorkspace?.()||null}catch{return null}};
const local=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const validTime=t=>typeof t==='string'&&/^([01]\\d|2[0-3]):[0-5]\\d$/.test(t);
const taskDate=t=>{const d=String(t.due||'');if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(d))return null;const tm=validTime(t.startTime)?t.startTime:validTime(t.dueTime)?t.dueTime:'23:59';const x=new Date(d+'T'+tm+':00');return Number.isFinite(x.getTime())?x.getTime():null};
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
 const upcoming=result.filter(x=>x.end>=time-60*MIN&&x.start<=time+7*DAY).sort((a,b)=>a.start-b.start);
 // Include a freshly added historical plan, so saving is immediately visible.
 const recent=result.filter(x=>x.kind==='Activity').sort((a,b)=>b.created-a.created).slice(0,3);
 const selected=upcoming.slice(0,8);
 for(const x of recent){if(x.created&&time-x.created<20*MIN&&!selected.some(y=>y.key===x.key))selected.push(x)}
 return selected;
}
function status(x,t){
 if(x.past)return {label:'Past · Review',level:'past'};
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
 if(!('Notification'in window)||Notification.permission!=='granted')return;
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
 function render(){
  const w=ws();if(!w)return;const current=Date.now(),items=entries(w,current);
  list.replaceChildren();
  if(!items.length)list.append(el('p','lo15-muted','No upcoming activities or timed to-dos. New saved plans appear here.'));
  for(const x of items){
   const s=status(x,current),row=el('button','lo15-upcoming-row');row.type='button';row.dataset.kind=x.kind.toLowerCase();row.dataset.reminderStatus=s.level;
   const date=el('span','lo15-upcoming-date',new Date(x.start).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'}));
   const body=el('span','lo15-upcoming-content');
   const name=el('strong','',x.name);
   const timeLabel=new Date(x.start).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
   body.append(name,el('small','',x.kind+' · '+(x.anytime?'Any time':timeLabel)));
   const badge=el('span','lo16-combined-badge '+s.level,(s.level==='soon'||s.level==='now'?'● ':'')+s.label);
   row.append(date,body,badge);row.addEventListener('click',()=>go(x));list.append(row);
   if(x.remind&&!x.past&&x.start-current<=10*MIN&&x.start-current>=-MIN)void showNotice(x);
  }
  const capable='Notification'in window&&window.isSecureContext;
  notificationButton.hidden=!capable;
  if(capable){notificationButton.textContent=Notification.permission==='granted'?'Notifications enabled':Notification.permission==='denied'?'Notifications blocked':'Enable notifications';notificationButton.disabled=Notification.permission!=='default'}
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