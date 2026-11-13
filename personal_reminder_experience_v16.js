/* LifeOS V16: non-destructive reminders for plans and timed to-dos.
   Notifications are optional, available only while this page is running. */
(()=>{'use strict';const $=id=>document.getElementById(id),M=60000;
const ws=()=>{try{return window.lifeosReadOnlyWorkspace?.()||null}catch{return null}};
const local=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const inRange=v=>typeof v==='string'&&/^\d{2}:\d{2}$/.test(v)&&Number(v.slice(0,2))<24&&Number(v.slice(3))<60;
const datetime=(d,t)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(d))||!inRange(t))return null;const x=new Date(d+'T'+t+':00');return Number.isFinite(x.getTime())&&local(x)===d?x.getTime():null};
const seen=new Set();
let allowed=false;
function active(w,t){
 const result=[],horizon=10*M;
 for(const p of w.schedule||[]){
  if(p.status!=='planned'||p.sessionId||p.reminder!==true||!Number.isFinite(p.startAt)||!Number.isFinite(p.endAt))continue;
  const r=p.reminderReview||{};if(['dismissed','confirmed-not-started'].includes(r.state)||(r.snoozedUntil||0)>t)continue;
  if(p.startAt-t>horizon||t-p.endAt>60*M)continue;
  result.push({key:'plan:'+p.id,label:p.name||'Planned activity',date:p.startAt,kind:'Activity',late:t>=p.endAt});
 }
 for(const task of w.todos||[]){
  if(task.done)continue;
  const due=task.startTime||task.dueTime;
  const time=datetime(task.due,due);
  if(time===null||time-t>horizon||t-time>60*M)continue;
  result.push({key:'task:'+task.id,label:task.name||'Task',date:time,kind:'To-do',late:t>time});
 }
 return result.sort((a,b)=>a.date-b.date);
}
const el=(tag,cls,val)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(val!==undefined)n.textContent=val;return n};
function go(date){document.querySelector('#lifeosNavigation [data-view="schedule"]')?.click();const d=local(new Date(date));const picker=$('scheduleDay');if(picker){picker.value=d;picker.dispatchEvent(new Event('change',{bubbles:true}))}const jump=document.querySelector('[data-v15-date-jump]');if(jump){jump.value=d;jump.dispatchEvent(new Event('change',{bubbles:true}))}}
function init(){
 if(!$('todayOverview')||$('lo16ReminderPanel'))return;
 const panel=el('section','lo16-reminders');panel.id='lo16ReminderPanel';
 const head=el('div','lo16-head');head.append(el('h2','', 'Reminders'));
 const btn=el('button','lo16-notify','Enable notifications');btn.type='button';head.append(btn);panel.append(head);
 const hint=el('p','lo16-hint','In-app reminders work while LifeOS is open. Browser notifications require permission and are not guaranteed when the browser is closed.');panel.append(hint);
 const list=el('div','lo16-list');panel.append(list);
 const parent=$('lo15Upcoming');(parent||$('todayOverview')).after(panel);
 function render(){
  const w=ws();if(!w)return;const now=Date.now(),items=active(w,now);list.replaceChildren();
  if(!items.length){list.append(el('p','lo16-empty','No timed tasks or activities need attention right now.'))}
  for(const x of items){
   const row=el('button','lo16-reminder-row');row.type='button';
   const time=new Date(x.date).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
   row.append(el('span','lo16-reminder-type',x.kind),el('span','lo16-reminder-name',x.label),el('span','lo16-reminder-time',x.late?'Review · '+time:time));
   row.addEventListener('click',()=>go(x.date));list.append(row);
   if(allowed&&window.Notification?.permission==='granted'&&!seen.has(x.key+':'+x.date)){try{new Notification('LifeOS · '+x.kind,{body:x.label+' · '+time,tag:'lifeos-'+x.key});seen.add(x.key+':'+x.date)}catch{}}
  }
  btn.hidden=!(typeof Notification!=='undefined'&&window.isSecureContext);
  if(!btn.hidden){btn.textContent=Notification.permission==='granted'?'Notifications enabled':Notification.permission==='denied'?'Notifications blocked':'Enable notifications';btn.disabled=Notification.permission!=='default'}
 }
 btn.addEventListener('click',async()=>{if(!('Notification'in window)||!window.isSecureContext)return;try{allowed=(await Notification.requestPermission())==='granted'}catch{}render()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 window.addEventListener('focus',render);
 $('lifeosNavigation')?.addEventListener('click',()=>setTimeout(render,40));
 setInterval(()=>{if(!document.hidden)render()},30000);
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();