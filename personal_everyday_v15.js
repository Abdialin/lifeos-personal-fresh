/* LifeOS Personal V15: actionable Today preview, read-only and safe.
 * Does not alter activity data, sync, task state or timers.
 */
(()=>{'use strict';const $=id=>document.getElementById(id);
const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const fmt=d=>new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit'}).format(d);
const human=d=>new Intl.DateTimeFormat(undefined,{weekday:'short',day:'numeric',month:'short'}).format(d);
function workspace(){try{return window.lifeosReadOnlyWorkspace?.()||null}catch(_){return null}}
function taskTime(t){const date=String(t.due||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;const time=/^\d{2}:\d{2}$/.test(t.startTime||'')?t.startTime:(/^\d{2}:\d{2}$/.test(t.dueTime||'')?t.dueTime:'23:59');const when=new Date(date+'T'+time+':00');return Number.isFinite(when.getTime())?when:null}
function records(w){
 const now=Date.now(),end=now+7*86400000,all=[];
 for(const p of (w.schedule||[])){
  const start=Number(p.startAt);if(!Number.isFinite(start)||start<now-3600000||start>end||p.status==='skipped')continue;
  all.push({date:new Date(start),name:p.name||'Planned activity',kind:'Planned',sort:start});
 }
 for(const t of (w.todos||[])){
  if(t.done)continue;const d=taskTime(t);if(!d||d.getTime()<now-86400000||d.getTime()>end)continue;
  all.push({date:d,name:t.name||'Task',kind:'Task',sort:d.getTime(),anytime:!t.startTime&&!t.dueTime});
 }
 return all.sort((a,b)=>a.sort-b.sort).slice(0,4);
}
function element(tag,cls,value){const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n}
function openPlan(d){
 const nav=document.querySelector('#lifeosNavigation button[data-view="schedule"]');nav?.click();
 const picker=$('scheduleDay');if(picker){picker.value=dateKey(d);picker.dispatchEvent(new Event('change',{bubbles:true}))}
 const day=dateKey(d),inCalendar=document.querySelector('#v4Plan [data-v4-day="'+day+'"]');
 if(inCalendar)inCalendar.click();else document.querySelector('[data-v15-date-jump]')?.dispatchEvent(new Event('change',{bubbles:true}));
 setTimeout(()=>$('lifeosSelectedDaySummary')?.scrollIntoView({behavior:'smooth',block:'start'}),120);
}
function init(){
 const today=$('todayOverview');if(!today||$('lo15Upcoming'))return;
 const card=element('section','lo15-upcoming');card.id='lo15Upcoming';card.setAttribute('aria-label','Upcoming activities and tasks');
 const header=element('div','lo15-upcoming-head');
 header.append(element('h2','', 'Coming up'));
 const action=element('button','lo15-open-plan','View schedule →');action.type='button';action.addEventListener('click',()=>document.querySelector('#lifeosNavigation button[data-view="schedule"]')?.click());
 header.append(action);card.append(header);
 const list=element('div','lo15-upcoming-list');card.append(list);today.after(card);
 function render(){
  if(document.body.dataset.lifeosView!=='dashboard')return;
  const w=workspace();list.replaceChildren();if(!w){list.append(element('p','lo15-muted','Your upcoming plans are temporarily unavailable.'));return}
  const upcoming=records(w);
  if(!upcoming.length){list.append(element('p','lo15-muted','No upcoming timed plans or dated tasks in the next seven days.'));return}
  for(const x of upcoming){
   const b=element('button','lo15-upcoming-row');b.type='button';b.dataset.kind=x.kind.toLowerCase();
   const date=element('span','lo15-upcoming-date',human(x.date));
   const body=element('span','lo15-upcoming-content');body.append(element('strong','',x.name),element('small','',x.anytime?'Task · Any time':x.kind+' · '+fmt(x.date)));
   b.append(date,body);b.addEventListener('click',()=>openPlan(x.date));list.append(b);
  }
 }
 document.getElementById('lifeosNavigation')?.addEventListener('click',()=>setTimeout(render,30));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 window.addEventListener('focus',render);
 setInterval(()=>{if(!document.hidden)render()},60000);
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();