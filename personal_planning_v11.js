/* LifeOS Personal V11: monthly date jumper, time-based task review/reminders and grouped history.
 * Read-only calendar and grouped history; tasks remain tasks, never auto-converted to completed sessions. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const valid=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''));
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const get=()=>{try{return window.lifeosReadOnlyWorkspace?.()||null}catch(_){return null}};
let displayMonth=null,rendering=false;
const byDay=s=>new Date(s+'T12:00:00');
function mondayWeek(date){const d=byDay(date);d.setDate(d.getDate()+3-(d.getDay()+6)%7);const year=d.getFullYear(),four=new Date(year,0,4,12);return {year,week:1+Math.round(((d-four)/86400000-3+(four.getDay()+6)%7)/7)}}
function calendar(){
 const host=$('lo11ScheduleCalendar'),picker=$('scheduleDay');if(!host||!picker||rendering)return;
 const w=get();if(!w)return;const selected=picker.value||ymd(new Date());
 if(!displayMonth)displayMonth=selected.slice(0,7);
 const [year,month]=displayMonth.split('-').map(Number),first=new Date(year,month-1,1),monthLength=new Date(year,month,0).getDate(),offset=(first.getDay()+6)%7;
 const sessions=new Set((w.sessions||[]).filter(s=>s.status==='finished').map(s=>ymd(new Date(s.endAt))));
 const plans=new Set((w.schedule||[]).map(p=>ymd(new Date(p.startAt))));
 const tasks=new Set((w.todos||[]).filter(t=>t.due).map(t=>t.due));
 const header='<div class="lo11-calendar-top"><div><strong>Jump to a date</strong><small>Select any day to open its schedule and daily review</small></div><div class="lo11-calendar-controls"><button type="button" data-lo11-month="-1" aria-label="Previous month">‹</button><strong>'+esc(first.toLocaleDateString(undefined,{month:'long',year:'numeric'}))+'</strong><button type="button" data-lo11-month="1" aria-label="Next month">›</button><button type="button" data-lo11-today>Today</button></div></div>';
 const weekdays='<div class="lo11-cal-grid lo11-cal-labels">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>'<span>'+x+'</span>').join('')+'</div>';
 let cells=Array(offset).fill('<span aria-hidden="true"></span>').join('');
 for(let i=1;i<=monthLength;i++){
  const key=year+'-'+String(month).padStart(2,'0')+'-'+String(i).padStart(2,'0');
  const dot=(sessions.has(key)?'<i class="lo11-dot lo11-recorded" title="Recorded activity"></i>':'')+
    (plans.has(key)?'<i class="lo11-dot lo11-planned" title="Planned activity"></i>':'')+
    (tasks.has(key)?'<i class="lo11-dot lo11-task" title="Task due"></i>':'');
  cells+='<button type="button" data-lo11-day="'+key+'" class="lo11-cal-day'+(key===selected?' is-selected':'')+(key===ymd(new Date())?' is-today':'')+'" aria-label="'+esc(byDay(key).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}))+'" aria-pressed="'+(key===selected)+'"><b>'+i+'</b><span class="lo11-dots">'+dot+'</span></button>';
 }
 const legend='<div class="lo11-cal-legend"><span><i class="lo11-dot lo11-recorded"></i> Recorded</span><span><i class="lo11-dot lo11-planned"></i> Planned</span><span><i class="lo11-dot lo11-task"></i> Task due</span></div>';
 host.innerHTML=header+weekdays+'<div class="lo11-cal-grid lo11-cal-days">'+cells+'</div>'+legend;
}
function jump(day){
 const picker=$('scheduleDay');if(!picker||!valid(day))return;
 displayMonth=day.slice(0,7);picker.value=day;
 picker.dispatchEvent(new Event('change',{bubbles:true}));
 render();
 const summary=$('lifeosSelectedDaySummary')||$('scheduleList');
 if(summary){summary.scrollIntoView({behavior:'smooth',block:'start'});}
}
function render(){calendar();timedTasks()}
function timedTasks(){
 const list=$('scheduleList'),picker=$('scheduleDay');if(!list||!picker)return;const ws=get();if(!ws)return;
 let node=$('lo11TimedTasks');if(!node){node=document.createElement('section');node.id='lo11TimedTasks';node.className='lo11-timed-tasks';list.before(node)}
 const date=picker.value||ymd(new Date());
 const tasks=(ws.todos||[]).filter(t=>t.due===date).sort((a,b)=>(a.dueTime||'99:99').localeCompare(b.dueTime||'99:99'));
 const rows=tasks.map(t=>'<div class="lo11-timed-row"><div><b>'+esc(t.name)+'</b><small>'+esc(t.dueTime||'Any time')+' · '+esc(t.priority||'normal')+' priority'+(t.done?' · Complete':'')+'</small></div><span class="lo11-task-status '+(t.done?'is-done':'')+'">'+(t.done?'Done':'To do')+'</span></div>').join('');
 node.innerHTML='<div class="lo11-timed-head"><strong>Tasks for this date</strong><span>'+tasks.length+' total · '+tasks.filter(t=>t.done).length+' done</span></div>'+(rows||'<p class="lo11-muted">No tasks due on this date.</p>')+'<p class="lo11-muted">Tasks are shown with schedule plans, but are not automatically counted as tracked activity.</p>';
}
function history(finished){
 const root=$('history'),status=$('loHistoryCount');if(!root)return;
 const term=($('loHistorySearch')?.value||'').trim().toLocaleLowerCase(),period=$('loHistoryPeriod')?.value||'7',cutoff=period==='all'?-Infinity:Date.now()-Number(period)*86400000;
 const visible=finished.filter(s=>s.endAt>=cutoff&&(s.name+' '+(s.notes||'')+' '+ymd(new Date(s.endAt))).toLocaleLowerCase().includes(term));
 const months=new Map();
 for(const s of visible){
  const date=ymd(new Date(s.endAt)),m=date.slice(0,7),w=mondayWeek(date),weekKey=w.year+'-'+String(w.week).padStart(2,'0');
  if(!months.has(m))months.set(m,new Map());const month=months.get(m);
  if(!month.has(weekKey))month.set(weekKey,{year:w.year,week:w.week,days:new Map()});
  const week=month.get(weekKey);if(!week.days.has(date))week.days.set(date,[]);week.days.get(date).push(s);
 }
 const dayHTML=(day,sessions,open)=>{
  const sum=sessions.reduce((n,s)=>n+elapsed(s),0),large=sessions.filter(s=>elapsed(s)>12*3600000).length,examples=sessions.filter(s=>s.seedBatch||s.source==='development-starter').length;
  return '<details class="lo11-history-day" '+(open?'open':'')+'><summary><strong>'+esc(byDay(day).toLocaleDateString(undefined,{weekday:'long',day:'numeric'}))+'</strong><small>'+sessions.length+' sessions · '+short(sum)+(large?' · '+large+' long':'')+'</small></summary>'+
  (examples?'<p class="lo11-muted">'+examples+' generated example(s).</p>':'')+
  sessions.map(s=>{
   const duration=elapsed(s),start=new Date(s.startAt),end=new Date(s.endAt);
   const provenance=s.seedBatch||s.source==='development-starter'?'Development example':s.precision==='measured'?'Measured':'Recorded';
   return '<article class="lo-history-item"><div class="lo-history-entry"><strong>'+esc(s.name)+'</strong><span>'+short(duration)+'</span></div><div class="lo-history-foot"><small>'+esc(start.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}))+'–'+esc(end.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}))+' · '+provenance+(duration>12*3600000?' · Review long session':'')+'</small><span class="lo-history-actions"><button class="btn outline tiny" data-act="details" data-id="'+esc(s.id)+'">Details</button><button class="btn outline tiny" data-act="edit" data-id="'+esc(s.id)+'">Edit</button></span></div></article>';
  }).join('')+'</details>';
 };
 let idx=0;
 root.innerHTML=[...months].map(([month,weeks])=>{
  const openMonth=idx===0;idx++;
  const name=new Date(month+'-01T12:00:00').toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const monthCount=[...weeks.values()].reduce((n,w)=>n+[...w.days.values()].reduce((a,v)=>a+v.length,0),0);
  return '<details class="lo11-history-month" '+(openMonth?'open':'')+'><summary><strong>'+esc(name)+'</strong><small>'+monthCount+' sessions · '+weeks.size+' weeks</small></summary>'+
  [...weeks].map(([_,w],weekIndex)=>{
   const count=[...w.days.values()].reduce((n,x)=>n+x.length,0);
   return '<details class="lo11-history-week" '+(openMonth&&weekIndex===0?'open':'')+'><summary><strong>Week '+w.week+' · '+w.year+'</strong><small>'+count+' sessions</small></summary>'+
   [...w.days].map(([d,s],dayIndex)=>dayHTML(d,s,false)).join('')+'</details>';
  }).join('')+'</details>';
 }).join('')||'<div class="empty">No sessions match this period and search.</div>';
 if(status)status.textContent=visible.length+' of '+finished.length+' completed sessions · month / week / day';
}
function elapsed(s){return (s.segments||[]).reduce((sum,x)=>sum+Math.max(0,(x.end??Date.now())-x.start),0)}
function short(ms){const n=Math.round(ms/60000),hours=Math.floor(n/60);return hours?hours+'h '+String(n%60).padStart(2,'0')+'m':n+'m'}
const seen=new Set();
function reminders(){
 const ws=get(),list=$('lo11TaskReminder');if(!ws)return;
 const now=new Date(),today=ymd(now),time=Date.now();
 const due=(ws.todos||[]).filter(t=>{
  if(t.done||!t.due||!t.dueTime||t.reminder===false)return false;
  const at=new Date(t.due+'T'+t.dueTime+':00').getTime(),delta=at-time;
  return delta<=10*60000&&delta>=-10*60000;
 });
 if(!list&&!due.length)return;
 let panel=list;
 if(!panel){const anchor=$('lo11ScheduleCalendar')||$('scheduleAlert');if(!anchor)return;panel=document.createElement('aside');panel.id='lo11TaskReminder';panel.className='lo11-reminder';anchor.before(panel)}
 const show=due.filter(t=>!seen.has(t.id+'-'+t.due+'-'+t.dueTime));
 if(show.length){panel.hidden=false;panel.innerHTML='<strong>Upcoming timed tasks</strong>'+show.map(t=>'<p>'+esc(t.dueTime)+' · '+esc(t.name)+'</p>').join('')+'<button type="button" id="lo11DismissReminder" class="btn outline tiny">Dismiss</button>';panel.querySelector('button')?.addEventListener('click',()=>{show.forEach(t=>seen.add(t.id+'-'+t.due+'-'+t.dueTime));panel.hidden=true});}
 else if(!due.length)panel.hidden=true;
}
function init(){
 const root=$('lo11ScheduleCalendar');if(root)root.addEventListener('click',e=>{
  const m=e.target.closest('[data-lo11-month]');if(m){const [y,mo]=displayMonth.split('-').map(Number),d=new Date(y,mo-1+Number(m.dataset.lo11Month),1);displayMonth=ymd(d).slice(0,7);calendar();return;}
  if(e.target.closest('[data-lo11-today]')){jump(ymd(new Date()));return;}
  const day=e.target.closest('[data-lo11-day]');if(day)jump(day.dataset.lo11Day);
 });
 const picker=$('scheduleDay');if(picker)picker.addEventListener('change',()=>{if(valid(picker.value)){displayMonth=picker.value.slice(0,7);render()}});
 document.addEventListener('submit',e=>{if(e.target?.id==='todoForm')setTimeout(()=>{render();reminders()},20)});
 document.addEventListener('click',e=>{if(e.target.closest('[data-todo-act],[data-schedule-act]'))setTimeout(render,30)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();reminders()}});
 render();reminders();setInterval(()=>{if(!document.hidden)reminders()},30000);
}
window.lifeosPlanningV11={renderHistory:history,renderCalendar:calendar,renderTimedTasks:timedTasks};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();