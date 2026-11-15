/* LifeOS Plan V133 — visual-first, read-only calendar explorer. Never writes activity or plan data. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const dayKey=t=>{const d=new Date(t);return Number.isFinite(d.getTime())?[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'):''};
const dayDate=s=>new Date(s+'T12:00:00');
const time=t=>new Date(t).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',hour12:false});
const minutes=n=>Math.floor(n/60)+'h '+String(Math.floor(n%60)).padStart(2,'0')+'m';
const reading=()=>{try{return window.lifeosReadOnlyWorkspace?.()||{}}catch(_){return {}}};
const safe=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let mode='day',lastRender=0;
function detect(name){const n=String(name||'').toLowerCase();if(/fajr|dhuhr|asr|maghrib|isha|prayer|quran|arabic|hadith/.test(n))return 'spiritual';if(/gym|fitness|walk|run|workout/.test(n))return 'fitness';if(/study|course|university|read|class|assignment/.test(n))return 'study';if(/shift|work|security|business|meeting/.test(n))return 'work';if(/sleep|rest/.test(n))return 'sleep';return 'other'}
function categoryLabel(x){return ({spiritual:'Spiritual',fitness:'Fitness',study:'Learning',work:'Work',sleep:'Recovery',other:'Other'})[x]}
function dates(anchor,count){const base=dayDate(anchor),out=[];for(let i=0;i<count;i++){const n=new Date(base);n.setDate(n.getDate()+i);out.push(dayKey(n))}return out}
function spans(start,end,date){const a=dayDate(date);a.setHours(0,0,0,0);const b=new Date(a);b.setDate(b.getDate()+1);return Math.max(0,Math.min(end,b.getTime())-Math.max(start,a.getTime()))}
function weekDays(anchor){const d=dayDate(anchor);d.setDate(d.getDate()-(d.getDay()+6)%7);return dates(dayKey(d),7)}
function intervals(items,day){const a=dayDate(day);a.setHours(0,0,0,0);const b=new Date(a);b.setDate(b.getDate()+1);return items.map(x=>[Math.max(a.getTime(),x.startAt),Math.min(b.getTime(),x.endAt)]).filter(x=>x[1]>x[0]).sort((x,y)=>x[0]-y[0])}
function uniqueMs(items,day){let sum=0,until=0;for(const [a,b] of intervals(items,day)){sum+=Math.max(0,b-Math.max(a,until));until=Math.max(until,b)}return sum}
function extract(w,now){const plausible=x=>x&&Number.isFinite(Number(x.startAt))&&Number.isFinite(Number(x.endAt))&&Number(x.endAt)>Number(x.startAt);
const plans=(Array.isArray(w.schedule)?w.schedule:[]).filter(plausible).map(x=>({...x,startAt:Number(x.startAt),endAt:Number(x.endAt),kind:'plan'}));
const records=(Array.isArray(w.sessions)?w.sessions:[]).filter(x=>plausible(x)&&x.status==='finished'&&!x.assumed&&!x.isExample&&!x.developmentExample).map(x=>({...x,startAt:Number(x.startAt),endAt:Number(x.endAt),kind:'record'}));
const tasks=Array.isArray(w.todos)?w.todos:[];
return {plans,records,tasks,now};}
function isOdd(x){const d=(x.endAt-x.startAt)/60000;return d>=180&&/prayer|fajr|dhuhr|asr|maghrib|isha/i.test(x.name||'')||d>=24*60}
function cards(data,date,limited){const a=dayDate(date);a.setHours(0,0,0,0);const b=new Date(a);b.setDate(b.getDate()+1);
const events=[...data.plans,...data.records].filter(x=>x.startAt<b.getTime()&&x.endAt>a.getTime()).sort((x,y)=>x.startAt-y.startAt);
const count=events.length,visible=limited?events.slice(0,5):events;const all=visible.map(x=>{
 const group=detect(x.name),duration=Math.round((x.endAt-x.startAt)/60000),flag=x.kind==='record'&&isOdd(x);
 return '<div class="lo133-event" data-type="'+x.kind+'" data-tone="'+group+'"><div class="lo133-event-time"><strong>'+safe(time(Math.max(x.startAt,a.getTime())))+'</strong><span>'+safe(time(Math.min(x.endAt,b.getTime())))+'</span></div><div class="lo133-event-body"><strong>'+safe(x.name||'Activity')+'</strong><small>'+categoryLabel(group)+' · '+(x.kind==='plan'?'Planned':'Recorded')+' · '+minutes(duration)+'</small>'+(flag?'<span class="lo133-review-flag">Duration needs review</span>':'')+'</div><span class="lo133-type-mark" aria-label="'+(x.kind==='plan'?'Planned':'Recorded')+'"></span></div>';
 }).join('');
return {count,markup:all+(count>visible.length?'<p class="lo133-more-note">+'+(count-visible.length)+' more items · use the existing day review below</p>':'')||(count?all:'<div class="lo133-empty">No saved plans or verified sessions on this date.<small>Empty does not mean available.</small></div>')};
}
function render(){
 const root=$('lo133PlanStudio'),picker=$('scheduleDay');if(!root||!picker)return;
 const chosen=picker.value&&/^\d{4}-\d{2}-\d{2}$/.test(picker.value)?picker.value:dayKey(Date.now());if(!chosen)return;
 const data=extract(reading(),Date.now()),days=mode==='week'?weekDays(chosen):dates(chosen,mode==='three'?3:1),last=new Date(dayDate(days[days.length-1]));
 const dayCards=days.map((key,i)=>{const d=dayDate(key),plan=data.plans.filter(x=>spans(x.startAt,x.endAt,key)>0),actual=data.records.filter(x=>spans(x.startAt,x.endAt,key)>0),task=data.tasks.filter(x=>x.due===key&&!x.done),list=cards(data,key,mode!=='day');
 return '<article class="lo133-day-card"><div class="lo133-day-head"><div><small>'+safe(d.toLocaleDateString(undefined,{weekday:'short',month:'short'}))+'</small><h3>'+d.getDate()+' <span>'+safe(d.toLocaleDateString(undefined,{weekday:'long'}))+'</span></h3></div><div class="lo133-day-count"><span class="lo133-blue-dot"></span>'+plan.length+' planned <span class="lo133-green-dot"></span>'+actual.length+' tracked</div></div>'+
 '<div class="lo133-day-overview"><div><strong>'+minutes(Math.round(uniqueMs(plan,key)/60000))+'</strong><small>Planned</small></div><div><strong>'+minutes(Math.round(uniqueMs(actual,key)/60000))+'</strong><small>Recorded</small></div><div><strong>'+task.length+'</strong><small>Tasks due</small></div></div>'+
 '<div class="lo133-day-events">'+list.markup+'</div>'+(mode!=='day'?'<button class="lo133-open-day" data-lo133-open-day="'+key+'" type="button">Review this day <span>↗</span></button>':'')+'</article>'}).join('');
 const counts=days.reduce((r,k)=>{r.planned+=data.plans.filter(x=>spans(x.startAt,x.endAt,k)>0).length;r.recorded+=data.records.filter(x=>spans(x.startAt,x.endAt,k)>0).length;return r},{planned:0,recorded:0});
 const title=mode==='week'?'Week of '+dayDate(days[0]).toLocaleDateString(undefined,{month:'short',day:'numeric'}):mode==='three'?'Three-day outlook':dayDate(chosen).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
 const summary=$('lo133Overview');if(summary)summary.innerHTML='<div class="lo133-kpi"><span>Planned entries</span><strong>'+counts.planned+'</strong></div><div class="lo133-kpi"><span>Recorded entries</span><strong>'+counts.recorded+'</strong></div><div class="lo133-kpi"><span>Days in view</span><strong>'+days.length+'</strong></div>';
 root.dataset.mode=mode;
 root.querySelector('#lo133DateHeading').textContent=title;
 root.querySelector('#lo133View').innerHTML=dayCards;
 root.querySelectorAll('[data-lo133-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lo133Mode===mode)));
 root.querySelector('#lo133MonthPanel').hidden=mode!=='month';
 root.querySelector('#lo133View').hidden=mode==='month';
 if(mode==='month')root.querySelector('#lo133DateHeading').textContent='Monthly overview';
 lastRender=Date.now();
}
function makeDetails(id,title,node){if(!node||$(id))return;const box=document.createElement('details');box.id=id;box.className='lo133-disclosure';const summary=document.createElement('summary');summary.innerHTML='<span>'+title+'</span><span class="lo133-chevron" aria-hidden="true">⌄</span>';node.before(box);box.append(summary,node);}
function init(){const editor=$('scheduleEditorPanel'),calendar=$('lo11ScheduleCalendar'),picker=$('scheduleDay'),upcoming=$('loUpcomingPlans'),list=$('scheduleList');if(!editor||!calendar||!picker||$('lo133PlanStudio'))return;
 const hero=document.createElement('section');hero.id='lo133PlanStudio';hero.className='lo133-studio';hero.setAttribute('aria-label','Visual schedule');
 hero.innerHTML='<header class="lo133-studio-head"><div><span class="lo133-kicker">YOUR WEEK · LIVE PLANNING</span><h2>Plan with clarity</h2><p>Plans, real tracking, and tasks—separate, but easy to compare.</p></div><button type="button" id="lo133Add" class="lo133-add" aria-label="Add a planned activity">＋ <span>Add</span></button></header>'+
 '<div class="lo133-overview" id="lo133Overview"></div>'+
 '<div class="lo133-toolbar"><div class="lo133-segments" role="group" aria-label="Calendar view"><button type="button" data-lo133-mode="day">Day</button><button type="button" data-lo133-mode="three">3 days</button><button type="button" data-lo133-mode="week">Week</button><button type="button" data-lo133-mode="month">Month</button></div><div class="lo133-nav"><button type="button" data-lo133-shift="-1" aria-label="Previous period">‹</button><strong id="lo133DateHeading"></strong><button type="button" data-lo133-shift="1" aria-label="Next period">›</button></div><button class="lo133-today" type="button" data-lo133-today>Jump to today</button></div><div id="lo133View" class="lo133-day-grid"></div><div id="lo133MonthPanel" hidden></div><footer class="lo133-foot"><span><i class="lo133-legend-green"></i> Tracked</span><span><i class="lo133-legend-blue"></i> Planned</span><span><i class="lo133-legend-orange"></i> Tasks</span></footer>';
 const intro=$('lo12PlanIntro')||editor.querySelector(':scope > .head');if(intro)intro.after(hero);else editor.prepend(hero);
 hero.querySelector('#lo133MonthPanel').append(calendar);
 makeDetails('lo133UpcomingDetails','Upcoming planned activities',upcoming);
 const daySummary=$('lifeosSelectedDaySummary'),dayNav=$('lifeosDayNavigation'),alert=$('scheduleAlert'),remind=$('reminderReview'),note=editor.querySelector(':scope > p.note');
 const details=document.createElement('details');details.id='lo133DailyDetails';details.className='lo133-disclosure';details.innerHTML='<summary><span>Selected day · full activity review</span><span class="lo133-chevron" aria-hidden="true">⌄</span></summary>';
 if(dayNav)dayNav.before(details);else if(list)list.before(details);
 for(const node of [dayNav,daySummary,alert,remind,list,note])if(node)details.append(node);
 const dateLabel=editor.querySelector('label[for="scheduleDay"]');if(dateLabel){dateLabel.classList.add('lo133-date-label');}
 // Preserve the original native date picker and all existing event listeners.
 hero.querySelector('#lo133Add').addEventListener('click',()=>{const toggle=$('v7TogglePlanForm'),form=$('scheduleForm');if(form?.hidden)toggle?.click();form?.scrollIntoView({behavior:'smooth',block:'center'});});
 hero.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.lo133Mode){mode=b.dataset.lo133Mode;render();return}
 if(b.hasAttribute('data-lo133-today')){picker.value=dayKey(Date.now());picker.dispatchEvent(new Event('change',{bubbles:true}));render();return}
 if(b.hasAttribute('data-lo133-shift')){const d=dayDate(picker.value||dayKey(Date.now()));d.setDate(d.getDate()+Number(b.dataset.lo133Shift)*(mode==='week'?7:mode==='three'?3:mode==='month'?30:1));picker.value=dayKey(d);picker.dispatchEvent(new Event('change',{bubbles:true}));render();return}
 if(b.dataset.lo133OpenDay){picker.value=b.dataset.lo133OpenDay;picker.dispatchEvent(new Event('change',{bubbles:true}));mode='day';render();}
 });
 picker.addEventListener('change',render);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 setInterval(()=>{if(document.body.dataset.lifeosView==='schedule'&&Date.now()-lastRender>12000)render()},15000);
 // After legacy V11 initializes, calendar remains attached to the exact original node.
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();