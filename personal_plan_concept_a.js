/* Plan Concept A+: presentation over the existing workspace and action bridges. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSPlanConcept=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const $=id=>root.document?.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const key=x=>{const d=new Date(x);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const day=x=>{const d=new Date(typeof x==='string'?x+'T12:00:00':x);return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()};
const shift=(x,n)=>{const d=new Date(day(x));d.setDate(d.getDate()+n);return d.getTime()};
const week=x=>{const d=new Date(day(x));d.setDate(d.getDate()-(d.getDay()+6)%7);return d.getTime()};
const numeric=x=>x!==null&&x!==undefined&&String(x).trim()!==''&&Number.isFinite(+x);
const valid=x=>x&&numeric(x.startAt)&&numeric(x.endAt)&&+x.endAt>+x.startAt;
const planOk=p=>valid(p)&&!['cancelled','skipped'].includes(p.status);
const sample=s=>!!(s?.assumed||s?.isExample||s?.developmentExample||s?.seedBatch||['development-starter','assumed-demo','imported-example'].includes(s?.source));
const sessionOk=s=>s&&s.status!=='discarded'&&!sample(s);
const overlap=(a,b,c,d)=>a<d&&c<b;
const clock=t=>{const d=new Date(t);return pad(d.getHours())+':'+pad(d.getMinutes())};
const date=t=>new Date(t).toLocaleDateString(undefined,{day:'numeric',month:'short'});
const hrs=ms=>(Math.round(Math.max(0,ms)/360000)/10).toLocaleString(undefined,{maximumFractionDigits:1})+'h';
const dur=ms=>{const m=Math.round(Math.max(0,ms)/60000);return m>=60?Math.floor(m/60)+'h'+(m%60?' '+m%60+'m':''):m+'m'};
const read=()=>{try{return root.lifeosReadOnlyWorkspace?.()||{}}catch{return {}}};
const analytics=()=>root.LifeOSUnifiedAnalytics;
const sum=(workspace,a,b,now)=>analytics().summarize(workspace,{start:a,end:b,now});
const fmtWeek=t=>{const d=new Date(t),u=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));u.setUTCDate(u.getUTCDate()+4-(u.getUTCDay()||7));return Math.ceil((((u-new Date(Date.UTC(u.getUTCFullYear(),0,1)))/86400000)+1)/7)};
const labelPeriod=(a,b)=>date(a)+' – '+new Date(b-1).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
function taskDate(t){const value=String(t?.due||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||key(new Date(value+'T12:00:00'))!==value)return 'No date';return new Date(value+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'})}
function category(item){
 let name='Other / review';try{name=root.lifeosActivityClassification?.(item)?.group||name}catch{}
 return {name,css:/sleep/i.test(name)?'sleep':/university|study|learn/i.test(name)?'study':/work|business/i.test(name)?'work':/fitness|exercise/i.test(name)?'fitness':/prayer|spiritual/i.test(name)?'prayer':/nutrition|eat/i.test(name)?'nutrition':'other'};
}
function normalized(workspace){return {sessions:(workspace.sessions||[]).filter(sessionOk),schedule:(workspace.schedule||[]).filter(p=>planOk(p)&&!sample(p))}}
function rowsForDay(workspace,start,end,now){
 const rows=[];for(const p of workspace.schedule||[])if(planOk(p)&&overlap(+p.startAt,+p.endAt,start,end))rows.push({kind:'plan',source:p,start:Math.max(start,+p.startAt),end:Math.min(end,+p.endAt)});
 for(const s of (workspace.sessions||[]).filter(s=>s&&s.status!=='discarded'))for(const segment of analytics().sessionIntervals(s,now))if(overlap(segment.start,segment.end,start,end))rows.push({kind:'record',source:s,start:Math.max(start,segment.start),end:Math.min(end,segment.end)});
 return rows.sort((a,b)=>a.start-b.start||a.end-b.end);
}
function lanes(rows){
 // Assign lanes per connected overlap cluster, without changing interval geometry.
 let cluster=[],limit=-Infinity;const out=[];
 function flush(){if(!cluster.length)return;const ends=[];for(const r of cluster){let lane=ends.findIndex(e=>e<=r.start);if(lane<0)lane=ends.length;ends[lane]=r.end;r.lane=lane}const count=ends.length;cluster.forEach(r=>{r.lanes=count;out.push(r)});cluster=[]}
 for(const row of rows.map(x=>({...x}))){if(cluster.length&&row.start>=limit)flush();cluster.push(row);limit=Math.max(cluster.length===1?-Infinity:limit,row.end)}flush();return out;
}
function taskGroups(todos,now){
 const today=key(now),groups={overdue:[],today:[],upcoming:[],anytime:[],completed:[]};
 for(const t of todos||[]){if(!t||!t.id)continue;const due=String(t.due||'').slice(0,10),validDate=/^\d{4}-\d{2}-\d{2}$/.test(due)&&key(new Date(due+'T12:00:00'))===due;
  if(t.done){groups.completed.push(t);continue}if(!validDate){groups.anytime.push(t);continue}
  const deadline=t.dueTime&&/^\d\d:\d\d$/.test(t.dueTime)?new Date(due+'T'+t.dueTime).getTime():null;
  if(due<today||(due===today&&deadline!==null&&deadline<now))groups.overdue.push(t);else if(due===today)groups.today.push(t);else groups.upcoming.push(t);
 }
 for(const k of Object.keys(groups))groups[k].sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999'))||String(a.dueTime||a.startTime||'99:99').localeCompare(String(b.dueTime||b.startTime||'99:99'))||String(a.name).localeCompare(String(b.name)));
 return groups;
}
function series(request,existing,now){
 const {name,frequency,until,seriesId}=request||{},start=Number(request?.startAt),end=Number(request?.endAt);
 if(!String(name||'').trim()||String(name).trim().length>80||!['daily','weekly','monthly'].includes(frequency)||!seriesId||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<=now||end<=start)throw Error('Enter a name and a future start and finish.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(until||''))||key(new Date(until+'T12:00:00'))!==until||until<key(start))throw Error('Choose an end date on or after the first activity.');
 if((existing||[]).some(p=>p.seriesId===seriesId))throw Error('This series has already been saved.');
 const first=new Date(start),last=new Date(end),dayOffset=Math.round((Date.UTC(last.getFullYear(),last.getMonth(),last.getDate())-Date.UTC(first.getFullYear(),first.getMonth(),first.getDate()))/86400000),rows=[];
 if(dayOffset>7)throw Error('A repeated activity cannot span more than seven days.');
 const cutoff=shift(until,1),limit=shift(start,731);if(cutoff>limit)throw Error('Choose an end date within two years.');
 for(let i=0;i<731;i++){
  let d;if(frequency==='monthly'){d=new Date(first.getFullYear(),first.getMonth()+i,1);if(d.getTime()>=cutoff)break;if(new Date(d.getFullYear(),d.getMonth()+1,0).getDate()<first.getDate())continue;d.setDate(first.getDate())}
  else {d=new Date(first.getFullYear(),first.getMonth(),first.getDate()+i*(frequency==='weekly'?7:1));if(d.getTime()>=cutoff)break}
  d.setHours(first.getHours(),first.getMinutes(),first.getSeconds(),first.getMilliseconds());
  if(d.getHours()!==first.getHours()||d.getMinutes()!==first.getMinutes())throw Error('A repeated time does not exist during a clock change. Choose another time.');
  const finish=new Date(d.getFullYear(),d.getMonth(),d.getDate()+dayOffset,last.getHours(),last.getMinutes(),last.getSeconds(),last.getMilliseconds());
  if(finish.getHours()!==last.getHours()||finish.getMinutes()!==last.getMinutes()||finish<=d)throw Error('A repeated finish time is invalid during a clock change.');
  const a=+d,b=+finish,id=seriesId+'-'+key(a);if((existing||[]).some(p=>String(p.id)===id))throw Error('This occurrence identifier already exists.');
  if((existing||[]).some(p=>planOk(p)&&overlap(a,b,+p.startAt,+p.endAt))||rows.some(p=>overlap(a,b,p.startAt,p.endAt)))throw Error('A repeated activity overlaps another plan. Review the calendar before saving.');
  rows.push({id,seriesId,seriesFrequency:frequency,name:String(name).trim(),startAt:a,endAt:b,status:'planned',sessionId:null,reminder:!!request.reminder,notes:String(request.notes||'').slice(0,1000),createdAt:now});
  if(rows.length>366)throw Error('A series can contain at most 366 activities.');
 }
 if(!rows.length)throw Error('No activities fall within this period.');return rows;
}
function ideal(workspace,from,to){
 const rows=[];for(let t=day(from);t<to;t=shift(t,1))for(const r of workspace.idealRoutines||[]){
  if(sample(r)||+r.dayOfWeek!==new Date(t).getDay())continue;const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(r.start||''));const minutes=+r.durationMinutes;if(!m||!Number.isFinite(minutes)||minutes<=0||minutes>1440)continue;
  const d=new Date(t);d.setHours(+m[1],+m[2],0,0);const a=+d,b=a+minutes*60000;if(overlap(a,b,from,to))rows.push({name:r.name||'Ideal activity',startAt:a,endAt:b});
 }return rows;
}
function forecasts(workspace,from,to,now){
 const engine=root.LifeOSPersonalPlanner;if(!engine?.historicalSuggestions)return {available:false,rows:[],reason:'Prediction engine unavailable'};
 const evidenceAt=Math.min(from,now),sessions=(workspace.sessions||[]).filter(sessionOk).filter(s=>s.status==='finished'&&Number.isFinite(+s.endAt)&&+s.endAt<=evidenceAt);const schedule=(workspace.schedule||[]).filter(p=>planOk(p)&&!sample(p));let rows=[],enough=false;
 try{for(let a=from;a<to;){const b=Math.min(shift(a,7),to);const result=engine.historicalSuggestions({sessions,schedule,from:a,to:b,evidenceAt,minimumDays:14,lookbackDays:28});enough=enough||result.confidence==='reviewable';rows.push(...result.suggestions);a=b}}
 catch{return {available:false,rows:[],reason:'Prediction unavailable'}}
 return {available:enough&&rows.length>0,rows,reason:enough?'No recurring patterns with sufficient evidence':'Insufficient history'};
}
function compareModel(workspace,from,days,now){
 const end=shift(from,days),ws=normalized(workspace),forecast=forecasts(workspace,from,end,now),idealRows=ideal(workspace,from,end),series=[];
 for(let a=from;a<end;a=shift(a,1)){const b=Math.min(shift(a,1),end),actual=a<now?sum(ws,a,b,now).uniqueRecordedMs:null,planned=sum(ws,a,b,now).uniquePlannedMs;
  const union=rows=>analytics().unionDuration(rows.map(x=>({start:Math.max(a,+x.startAt),end:Math.min(b,+x.endAt)})).filter(x=>x.end>x.start));
  series.push({start:a,end:b,reality:actual,planned,predicted:forecast.available?union(forecast.rows):null,ideal:idealRows.length?union(idealRows):null});
 }
 const total=type=>series.some(d=>d[type]!==null)?series.reduce((n,d)=>n+(d[type]||0),0):null;
 return {from,end,series,forecast,idealRows,totals:{reality:total('reality'),planned:total('planned'),predicted:total('predicted'),ideal:total('ideal')}};
}
let host,state={anchor:key(Date.now()),range:'week',compareDays:7,compareAnchor:week(Date.now()),taskAnchor:week(Date.now())};
function title(text,meta=''){return '<div class="pa-heading"><h3>'+text+'</h3>'+meta+'</div>'}
function card(content,extra=''){return '<section class="pa-card '+extra+'">'+content+'</section>'}
function empty(s){return '<p class="pa-empty">'+s+'</p>'}
function activeTab(){return host?.querySelector('.v136-screen:not([hidden])')?.dataset.v136Screen}
function calendar(){
 const target=$('paCalendar');if(!target)return;const w=read(),now=Date.now(),range=state.range,anchor=day(state.anchor);let from=range==='week'?week(anchor):range==='month'?new Date(new Date(anchor).getFullYear(),new Date(anchor).getMonth(),1).getTime():anchor;
 const end=range==='month'?new Date(new Date(from).getFullYear(),new Date(from).getMonth()+1,1).getTime():shift(from,range==='week'?7:range==='three'?3:1);
 const ws=normalized(w),metrics=sum(ws,from,end,now),period=range==='month'?new Date(from).toLocaleDateString(undefined,{month:'long',year:'numeric'}):range==='week'?'Week '+fmtWeek(from)+' · '+labelPeriod(from,end):range==='three'?labelPeriod(from,end):new Date(from).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short',year:'numeric'});
 const segments='<div class="pa-segments" role="group" aria-label="Calendar view">'+[['day','Day'],['three','3-day'],['week','Week'],['month','Month']].map(([v,l])=>'<button type="button" data-pa-range="'+v+'" aria-pressed="'+(range===v)+'">'+l+'</button>').join('')+'</div>';
 const controls='<div class="pa-period"><button type="button" data-pa-cal-move="-1" aria-label="Previous period">‹</button><strong>'+esc(period)+'</strong><button type="button" data-pa-cal-move="1" aria-label="Next period">›</button><button type="button" data-pa-today>Today</button></div>';
 const plans=ws.schedule.filter(p=>overlap(+p.startAt,+p.endAt,from,end)),conflicts=[];for(let i=0;i<plans.length;i++)for(let j=i+1;j<plans.length;j++)if(overlap(+plans[i].startAt,+plans[i].endAt,+plans[j].startAt,+plans[j].endAt))conflicts.push([plans[i],plans[j]]);
 const metricsHtml='<div class="pa-kpis"><div><b>'+hrs(metrics.uniquePlannedMs)+'</b><small>Planned</small></div><div><b>'+hrs(metrics.uniqueRecordedMs)+'</b><small>Recorded</small></div><div><b>'+plans.length+'</b><small>Commitments</small></div><div><b>'+conflicts.length+'</b><small>Conflicts</small></div></div>';
 let content='';
 if(range==='month'){
  const offset=(new Date(from).getDay()+6)%7,cells=[];for(let i=0;i<offset;i++)cells.push('<span class="pa-month-blank"></span>');
  for(let t=from;t<end;t=shift(t,1)){const rows=rowsForDay(w,t,shift(t,1),now);cells.push('<button type="button" data-pa-date="'+key(t)+'" class="pa-month-day'+(key(t)===key(now)?' is-today':'')+'"><b>'+new Date(t).getDate()+'</b><small>'+rows.length+' '+(rows.length===1?'item':'items')+'</small></button>')}
  content='<div class="pa-month-head">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>'<span>'+x+'</span>').join('')+'</div><div class="pa-month">'+cells.join('')+'</div>';
 }else{
  const days=[];for(let t=from;t<end;t=shift(t,1))days.push(t);const columns=days.map(t=>{const next=shift(t,1),length=next-t,events=lanes(rowsForDay(w,t,next,now));const blocks=events.map(r=>{const c=category(r.source),top=(r.start-t)/length*100,height=(r.end-r.start)/length*100,left=r.lane/r.lanes*100,width=100/r.lanes;return '<button type="button" class="pa-block pa-cat-'+c.css+' pa-kind-'+r.kind+'" style="top:'+top+'%;height:'+height+'%;left:'+left+'%;width:'+width+'%" data-v137-activity="'+r.kind+'" data-v137-id="'+esc(r.source.id)+'" aria-label="'+esc((r.source.name||'Activity')+' · '+(sample(r.source)?'example · ':'')+(r.kind==='plan'?'planned':'recorded')+' · '+clock(r.start)+' to '+clock(r.end))+'"><strong>'+esc(r.source.name||'Activity')+'</strong><small>'+(sample(r.source)?'Example · ':'')+clock(r.start)+'–'+clock(r.end)+'</small></button>'}).join('');return '<div class="pa-day-col"><button class="pa-day-head'+(key(t)===key(now)?' is-today':'')+'" type="button" data-pa-date="'+key(t)+'"><span>'+new Date(t).toLocaleDateString(undefined,{weekday:'short'})+'</span><b>'+new Date(t).getDate()+'</b></button><div class="pa-day-body" style="--pa-hours:'+(length/3600000)+'">'+blocks+(now>=t&&now<next?'<i class="pa-now" style="top:'+((now-t)/length*100)+'%"></i>':'')+'</div></div>'}).join('');
  const firstLength=shift(days[0],1)-days[0],ticks=[];for(let t=days[0];t<days[0]+firstLength;t+=3600000)ticks.push('<span style="top:'+((t-days[0])/firstLength*100)+'%">'+clock(t)+'</span>');ticks.push('<span style="top:100%">24:00</span>');const axis=ticks.join('');
  content=(days.length>3?'<p class="pa-calendar-hint">Swipe to view all days</p>':'')+(days.some(t=>shift(t,1)-t!==firstLength)?'<p class="pa-calendar-hint">Clock change this week: open an item for its exact local time.</p>':'')+'<div class="pa-grid-scroll" role="region" aria-label="Calendar timeline; scroll horizontally for more days" tabindex="0"><div class="pa-grid" style="--pa-days:'+days.length+'"><div class="pa-axis"><div></div><section>'+axis+'</section></div>'+columns+'</div></div><div class="pa-legend"><span><i class="pa-dot study"></i>Study</span><span><i class="pa-dot work"></i>Work</span><span><i class="pa-dot fitness"></i>Fitness</span><span><i class="pa-dot other"></i>Other</span><span>Outline: recorded</span></div>';
  const list=days.flatMap(t=>rowsForDay(w,t,shift(t,1),now).map(r=>({...r,day:t})));content+='<details class="pa-list"><summary>All timeline items ('+list.length+')</summary>'+(list.length?list.map(r=>'<button type="button" data-v137-activity="'+r.kind+'" data-v137-id="'+esc(r.source.id)+'"><span><strong>'+esc(r.source.name||'Activity')+'</strong><small>'+date(r.day)+' · '+clock(r.start)+'–'+clock(r.end)+' · '+(sample(r.source)?'Example · ':'')+(r.kind==='plan'?'Planned':'Recorded')+'</small></span><b>›</b></button>').join(''):empty('No activities in this period.'))+'</details>';
 }
 target.innerHTML=segments+controls+metricsHtml+card(content,'pa-calendar-card')+card(title('This period','<button type="button" data-v136-tab="improve">Review ›</button>')+'<p class="pa-sub">'+hrs(metrics.uniquePlannedMs)+' planned · '+hrs(metrics.uniqueRecordedMs)+' recorded'+(conflicts.length?' · '+conflicts.length+' conflict'+(conflicts.length===1?'':'s'):'')+'</p>','pa-period-summary');
}
function nativeTask(id,act){return [...(root.document?.querySelectorAll('#todoList [data-todo-act="'+act+'"]')||[])].find(x=>String(x.dataset.todoId)===String(id))}
function taskEditor(id){
 const original=id?(read().todos||[]).find(t=>String(t.id)===String(id)):null;if(id&&!original)return false;
 $('paTaskSheet')?.remove();const previousFocus=root.document.activeElement,dirty=new Set(),expected=original?JSON.stringify(original):null;
 const type=original?.timingType||(original?.startTime?'window':original?.dueTime?'deadline':original?.due?'day':'anytime');
 const priority=original?.priority||'normal';
 const shade=root.document.createElement('div');shade.id='paTaskSheet';shade.className='pa-task-shade';
 shade.innerHTML='<section class="pa-task-sheet" role="dialog" aria-modal="true" aria-labelledby="paTaskSheetTitle"><header><div><small>PLAN · TASKS</small><h2 id="paTaskSheetTitle" tabindex="-1">'+(original?'Edit task':'Create task')+'</h2></div><button type="button" class="pa-sheet-close" data-task-close aria-label="Close task editor">×</button></header><form id="paTaskSheetForm" novalidate><label>Task name<input name="name" maxlength="120" placeholder="e.g. Review lecture notes" required></label><div class="pa-sheet-pair"><label>Timing<select name="timingType"><option value="anytime">Anytime</option><option value="day">On a date</option><option value="deadline">Deadline</option><option value="window">Scheduled time</option></select></label><label>Priority<select name="priority"><option value="low">Low</option><option value="normal">Medium</option><option value="high">High</option></select></label></div><label data-task-date>Date<input type="date" name="due"></label><label data-task-deadline>Deadline time<input type="time" step="0.001" name="dueTime"></label><div class="pa-sheet-pair" data-task-window><label>Start time<input type="time" step="0.001" name="startTime"></label><label>Finish time<input type="time" step="0.001" name="endTime"></label></div><div class="pa-sheet-pair"><label><span>Life area <small>optional</small></span><input name="category" maxlength="40" placeholder="e.g. Study"></label><label><span>Estimate <small>minutes · optional</small></span><input name="estimatedMinutes" type="number" min="1" max="1440" step="1" placeholder="—"></label></div><label><span>Notes <small>optional</small></span><textarea name="notes" maxlength="1000" rows="2" placeholder="Add a note"></textarea></label><label class="pa-sheet-check"><input name="reminder" type="checkbox"> Remind me</label><p class="pa-sheet-status" role="status" aria-live="polite"></p><div class="pa-sheet-actions"><button class="pa-sheet-save" type="submit">'+(original?'Save changes':'Create task')+'</button>'+(original?'<button class="pa-sheet-delete" type="button" data-task-delete>Delete task</button>':'')+'</div></form></section>';
 root.document.body.append(shade);const form=shade.querySelector('form'),fields=form.elements,status=shade.querySelector('.pa-sheet-status');
 fields.name.value=original?.name||'';fields.timingType.value=['anytime','day','deadline','window'].includes(type)?type:'anytime';
 if(!['low','normal','high'].includes(priority)){const option=root.document.createElement('option');option.value=priority;option.textContent=priority+' (saved)';fields.priority.append(option)}fields.priority.value=priority;
 for(const k of ['due','dueTime','startTime','endTime','category','notes'])fields[k].value=original?.[k]??'';
 fields.reminder.checked=original?original.reminder!==false:true;
 if(Number.isInteger(original?.estimatedMinutes)&&original.estimatedMinutes>=1&&original.estimatedMinutes<=1440)fields.estimatedMinutes.value=original.estimatedMinutes;
 const visibility=()=>{const t=fields.timingType.value;shade.querySelector('[data-task-date]').hidden=t==='anytime';shade.querySelector('[data-task-deadline]').hidden=t!=='deadline';shade.querySelector('[data-task-window]').hidden=t!=='window'};visibility();
 const close=()=>{shade.remove();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true})};
 shade.querySelector('[data-task-close]').onclick=close;shade.addEventListener('click',e=>{if(e.target===shade)close()});
 shade.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();return}if(e.key!=='Tab')return;const nodes=[...shade.querySelectorAll('button,input,select,textarea')].filter(x=>!x.disabled&&x.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1],active=root.document.activeElement;if(!nodes.includes(active)){e.preventDefault();(e.shiftKey?last:first).focus()}else if(e.shiftKey&&active===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&active===last){e.preventDefault();first.focus()}});
 const mark=e=>{if(e.target.name)dirty.add(e.target.name);if(e.target.name==='timingType')visibility()};form.addEventListener('input',mark);form.addEventListener('change',mark);
 const finish=result=>{status.textContent=result?.message||'Task was not saved.';if(result?.ok){const notice=$('paTaskNotice');if(notice)notice.textContent=result.message;close()}else if(result?.committed){form.querySelectorAll('button,input,select,textarea').forEach(x=>x.disabled=true)}};
 form.addEventListener('submit',e=>{e.preventDefault();const patch={},isNew=!original;
  for(const k of ['name','priority','category','notes'])if(isNew||dirty.has(k))patch[k]=fields[k].value.trim()||(k==='category'?null:'');
  if(isNew||dirty.has('reminder'))patch.reminder=fields.reminder.checked;
  if(dirty.has('estimatedMinutes'))patch.estimatedMinutes=fields.estimatedMinutes.value===''?null:Number(fields.estimatedMinutes.value);
  if(isNew||['timingType','due','dueTime','startTime','endTime'].some(k=>dirty.has(k))){const t=fields.timingType.value;patch.timingType=t;patch.due=t==='anytime'?null:fields.due.value||null;patch.dueTime=t==='deadline'?fields.dueTime.value||null:null;patch.startTime=t==='window'?fields.startTime.value||null:null;patch.endTime=t==='window'?fields.endTime.value||null:null}
  finish(root.lifeosPlanTaskSave?.({id,expected,patch})||{message:'Task editor is unavailable. Try again.'});
 });
 const remove=shade.querySelector('[data-task-delete]');if(remove)remove.onclick=async()=>{remove.disabled=true;try{finish(await root.lifeosPlanTaskDelete(id,expected))}finally{if(remove.isConnected&&!form.querySelector('input:disabled'))remove.disabled=false}};
 shade.querySelector('#paTaskSheetTitle').focus({preventScroll:true});return true;
}
function tasks(){
 const target=$('paTasks');if(!target)return;const w=read(),now=Date.now(),groups=taskGroups(w.todos||[],now),start=state.taskAnchor,end=shift(start,7),inWeek=(w.todos||[]).filter(t=>{const d=String(t.due||'').slice(0,10),completed=t.completedAt?+t.completedAt:null;return !sample(t)&&((d>=key(start)&&d<key(end))||(completed!==null&&completed>=start&&completed<end))}),done=inWeek.filter(t=>t.done).length,pct=inWeek.length?Math.round(done/inWeek.length*100):null;
 const progress=card('<div class="pa-task-progress"><div class="pa-ring" style="--pa-pct:'+(pct||0)+'"><span>'+(pct===null?'—':pct+'%')+'</span></div><div><strong>'+(pct===null?'No tasks':done+' of '+inWeek.length+' done')+'</strong><small>Tasks due or completed this week</small></div><div class="pa-week-control"><button type="button" data-pa-task-move="-1" aria-label="Previous week">‹</button><span>Week '+fmtWeek(start)+'<small>'+labelPeriod(start,end)+'</small></span><button type="button" data-pa-task-move="1" aria-label="Next week">›</button></div></div>');
 const openStates=new Map([...target.querySelectorAll('[data-pa-task-group]')].map(x=>[x.dataset.paTaskGroup,x.open]));
 const specs=[['overdue','Overdue','!'],['today','Today','▣'],['upcoming','Upcoming','▣'],['anytime','Anytime','◷'],['completed','Completed','✓']];
 const sections=specs.map(([id,name,icon])=>{const rows=groups[id];if(id==='anytime'&&!rows.length)return '';const body=rows.length?rows.map(t=>'<div class="pa-task-row"><label><input type="checkbox" data-pa-task-toggle="'+esc(t.id)+'" '+(t.done?'checked':'')+' aria-label="'+(t.done?'Mark open: ':'Complete: ')+esc(t.name)+'"></label><button type="button" class="pa-task-main'+(t.done?' is-done':'')+'" data-pa-task-edit="'+esc(t.id)+'"><strong>'+esc(t.name||'Task')+'</strong><small>'+(sample(t)?'Example · ':'')+esc(taskDate(t))+(t.dueTime?' · '+esc(t.dueTime):t.startTime?' · '+esc(t.startTime)+(t.endTime?'–'+esc(t.endTime):''):'')+(Number.isInteger(t.estimatedMinutes)&&t.estimatedMinutes>0?' · '+t.estimatedMinutes+' min':'')+' · <em class="pa-priority '+esc(t.priority||'normal')+'">'+esc(t.priority||'normal')+'</em></small></button><button type="button" class="pa-chevron" data-pa-task-edit="'+esc(t.id)+'" aria-label="Edit '+esc(t.name)+'">›</button></div>').join(''):empty('No '+name.toLowerCase()+' tasks.');return '<details class="pa-task-group pa-'+id+'" data-pa-task-group="'+id+'" '+((openStates.has(id)?openStates.get(id):id!=='completed')?'open':'')+'><summary><span class="pa-group-icon">'+icon+'</span><strong>'+name+' ('+rows.length+')</strong><b>⌄</b></summary>'+body+'</details>'}).join('');
 target.innerHTML='<div class="pa-section-heading"><div><h3>Tasks</h3><p>Manage, prioritise and complete your to-dos.</p></div></div>'+progress+sections;
}
function compare(){
 const target=$('paCompare');if(!target)return;const m=compareModel(read(),state.compareAnchor,state.compareDays,Date.now()),colors={reality:'Reality',planned:'Planned',predicted:'Predicted',ideal:'Ideal'},max=Math.max(3600000,...m.series.flatMap(d=>Object.keys(colors).map(k=>d[k]||0)));
 const bars=m.series.map(d=>'<div class="pa-chart-day"><div class="pa-bar-group">'+Object.keys(colors).map(k=>'<i class="pa-'+k+'" style="height:'+((d[k]||0)/max*100)+'%" title="'+colors[k]+': '+(d[k]===null?'unavailable':hrs(d[k]))+'"></i>').join('')+'</div><small>'+new Date(d.start).toLocaleDateString(undefined,{weekday:state.compareDays===7?'short':'narrow',day:'numeric'})+'</small></div>').join('');
 const legend='<div class="pa-chart-legend">'+Object.keys(colors).map(k=>'<span><i class="pa-'+k+'"></i>'+colors[k]+'</span>').join('')+'</div>';
 const values='<details class="pa-data"><summary>Daily values</summary><div class="pa-data-scroll"><table><thead><tr><th>Day</th>'+Object.values(colors).map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+m.series.map(d=>'<tr><th>'+esc(date(d.start))+'</th>'+Object.keys(colors).map(k=>'<td>'+(d[k]===null?'—':hrs(d[k]))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></details>';
 const totals=Object.keys(colors).map(k=>'<div class="pa-total pa-border-'+k+'"><small>'+colors[k]+'</small><strong>'+(m.totals[k]===null?'—':hrs(m.totals[k]))+'</strong><span>'+(k==='predicted'&&!m.forecast.available?esc(m.forecast.reason):k==='ideal'&&m.totals[k]===null?'No ideal routines':k==='reality'?'Unique tracked time':k==='planned'?'Saved commitments':'Evidence-based pattern')+'</span></div>').join('');
 const ratio=m.end<=Date.now()&&m.totals.ideal>0&&m.totals.reality!==null?Math.round(m.totals.reality/m.totals.ideal*100):null;
 const comparison=card(title('Schedule comparison','<span class="pa-muted">daily hours</span>')+'<div class="pa-chart-scroll"><div class="pa-chart" aria-hidden="true" style="--pa-chart-days:'+m.series.length+'">'+bars+'</div></div>'+legend+'<div class="pa-totals">'+totals+'</div>'+values);
 const data=normalized(read()),start=m.from,end=m.end,items=new Map();
 const add=(item,type,a,b)=>{const amount=Math.max(0,Math.min(b,end,type==='reality'?Date.now():end)-Math.max(a,start));if(!amount)return;const c=category(item),row=items.get(c.name)||{reality:0,planned:0,ideal:0};row[type]+=amount;items.set(c.name,row)};
 for(const s of data.sessions)for(const x of analytics().sessionIntervals(s,Date.now()))add(s,'reality',x.start,x.end);
 for(const p of data.schedule)add(p,'planned',+p.startAt,+p.endAt);for(const r of m.idealRows)add(r,'ideal',+r.startAt,+r.endAt);
 const top=[...items].sort((a,b)=>Object.values(b[1]).reduce((x,y)=>x+y,0)-Object.values(a[1]).reduce((x,y)=>x+y,0)).slice(0,5),big=Math.max(1,...top.flatMap(x=>Object.values(x[1])));
 const cats=top.map(([name,v])=>'<div class="pa-category"><span>'+esc(name)+'</span><div class="pa-category-bars">'+['reality','planned','ideal'].map(k=>'<i><b class="pa-'+k+'" style="width:'+(v[k]/big*100)+'%"></b></i>').join('')+'</div><strong>'+hrs(v.reality)+' / '+hrs(v.planned)+' / '+hrs(v.ideal)+'</strong></div>').join('');
 const categoryCard=card(title('By category','<span class="pa-muted">R / P / I</span>')+(cats||empty('No activity in this period.'))+'<p class="pa-footnote">Summed durations can include overlaps.</p>');
 const overall=card(title('Overall progress')+'<div class="pa-ring pa-big-ring" style="--pa-pct:'+Math.min(100,ratio||0)+'"><span>'+(ratio===null?'—':ratio+'%')+'</span></div><p class="pa-sub">'+(ratio===null?'Available after the selected period ends and ideal routines exist.':'Unique recorded time / ideal time; not a completion rate.')+'</p>');
 target.innerHTML='<div class="pa-section-heading"><div><h3>Compare</h3><p>Reality, planned, predicted and ideal schedules.</p></div></div>'+card('<div class="pa-period"><button type="button" data-pa-compare-move="-1" aria-label="Previous period">‹</button><strong>'+labelPeriod(m.from,m.end)+'</strong><button type="button" data-pa-compare-move="1" aria-label="Next period">›</button></div><div class="pa-segments">'+[7,14,30].map(n=>'<button type="button" data-pa-days="'+n+'" aria-pressed="'+(state.compareDays===n)+'">'+n+' days</button>').join('')+'</div>')+comparison+'<div class="pa-pair">'+categoryCard+overall+'</div>'+card(title('Key insights')+'<p class="pa-sub">'+(m.forecast.available?'Predictions are observed patterns, not bookings or proof of future activity.':esc(m.forecast.reason)+'. Predictions need at least 14 tracked days and three matching weekday observations.')+'</p><button class="pa-link" type="button" data-v136-tab="improve">Review opportunities ›</button>');
}
function improve(){
 const target=$('paImprove');if(!target)return;const w=read(),now=Date.now(),ws=normalized(w),report=(()=>{try{return root.LifeOSDebtRecoveryV75?.outstanding?.({...w,...ws},now)||{open:[],unverified:[]}}catch{return {open:[],unverified:[]}}})(),unknown=report.unverified||[],open=report.open||[],recent=ws.sessions.filter(s=>s.status==='finished'&&+s.endAt>shift(now,-14)),flag=recent.filter(s=>{const duration=analytics().sessionIntervals(s,now).reduce((n,x)=>n+x.end-x.start,0);return duration>24*3600000||(duration>=3*3600000&&/prayer|fajr|dhuhr|asr|maghrib|isha/i.test(s.name||''))||(duration>=8*3600000&&/quran|memorization|arabic/i.test(s.name||''))});
 const future=ws.schedule.filter(p=>+p.endAt>now).sort((a,b)=>+a.startAt-+b.startAt),conflicts=[];for(let i=0;i<future.length;i++)for(let j=i+1;j<future.length;j++)if(overlap(+future[i].startAt,+future[i].endAt,+future[j].startAt,+future[j].endAt))conflicts.push([future[i],future[j]]);
 const ideas=[];if(conflicts.length)ideas.push({title:'Review schedule conflicts',detail:conflicts.length+' overlapping plan '+(conflicts.length===1?'pair':'pairs'),action:'calendar'});if(flag.length)ideas.push({title:'Check unusual durations',detail:flag.length+' recorded '+(flag.length===1?'activity':'activities')+' may need review',review:'durations'});if(open.length)ideas.push({title:'Review recovery options',detail:open.length+' confirmed '+(open.length===1?'shortfall':'shortfalls')+' to consider',review:'shortfalls'});
 const recommendations=ideas.length?ideas.map(x=>'<div class="pa-recommendation"><span class="pa-recommend-icon">✦</span><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.detail)+'</small></div><button type="button" '+(x.review?'data-pa-review="'+x.review+'"':'data-v136-tab="'+x.action+'"')+'>Review</button></div>').join(''):empty('No evidence-backed recommendations yet.');
 const unverified=unknown.slice(0,4).map(x=>'<button class="pa-compact-row" type="button" data-v137-activity="plan" data-v137-id="'+esc(x.id)+'"><span><strong>'+esc(x.name||x.planName||'Unverified plan')+'</strong><small>Attendance not confirmed</small></span><b>›</b></button>').join('');
 const unusual=flag.slice(0,4).map(x=>'<button class="pa-compact-row" type="button" data-v137-activity="record" data-v137-id="'+esc(x.id)+'"><span><strong>'+esc(x.name||'Activity')+'</strong><small>'+dur(analytics().sessionIntervals(x,now).reduce((n,z)=>n+z.end-z.start,0))+' recorded · review</small></span><b>›</b></button>').join('');
 target.innerHTML='<div class="pa-section-heading"><div><h3>Improve</h3><p>Review, recover and make your plan work better.</p></div><span class="pa-week-badge">Week '+fmtWeek(now)+'</span></div>'+
 '<div class="pa-kpis pa-three"><div><b>'+unknown.length+'</b><small>Unverified commitments</small></div><div><b>'+flag.length+'</b><small>Duration checks</small></div><div><b>'+conflicts.length+'</b><small>Plan conflicts</small></div></div>'+
 card(title('Scheduling recommendations')+recommendations,'pa-improve-lead')+'<div class="pa-pair">'+card(title('Unverified ('+unknown.length+')')+(unverified||empty('No unverified commitments.')))+' '+card(title('Duration checks ('+flag.length+')')+(unusual||empty('No unusual durations.')))+'</div>'+
 '<div class="pa-pair">'+card(title('Recovery options')+'<p class="pa-sub">Review confirmed shortfalls and choose a response.</p><button class="pa-outline" type="button" data-pa-review="shortfalls">Review recovery ›</button>')+card(title('Proposed improvements')+(ideas.length?'<p class="pa-sub">Review the evidence before choosing a change.</p>':empty('No proposed changes.'))+'<button class="pa-outline" type="button" data-v136-tab="more">Planning tools ›</button>')+'</div>'+
 card('<div class="pa-approval"><span>✓</span><div><strong>Changes need your approval</strong><small>Nothing is added or changed automatically.</small></div></div>','pa-improve-lead');
}
function render(tab){if(!host)init();if(!host)return;if(tab==='calendar')calendar();if(tab==='tasks')tasks();if(tab==='compare')compare();if(tab==='improve')improve()}
function init(){
 if(host)return true;host=$('v136Workspace');if(!host)return false;
 for(const [screen,id,oldSelector] of [['calendar','paCalendar','.v136-calendar'],['tasks','paTasks',null],['compare','paCompare','.v136-card'],['improve','paImprove','.v136-card']]){const section=host.querySelector('[data-v136-screen="'+screen+'"]');const node=root.document.createElement('div');node.id=id;node.className='pa-view';section.prepend(node);if(oldSelector){const old=section.querySelector(oldSelector);if(old)old.hidden=true}}
 const taskScreen=host.querySelector('[data-v136-screen="tasks"]'),manager=$('v136TaskManager');if(manager){const notice=root.document.createElement('p');notice.id='paTaskNotice';notice.setAttribute('role','status');manager.before(notice);const details=root.document.createElement('details');details.id='paTaskEditor';details.className='v136-drawer';details.innerHTML='<summary>Advanced task tools</summary>';manager.before(details);details.append(manager)}
 const seriesPanel=root.document.createElement('details');seriesPanel.id='paSeries';seriesPanel.className='v136-drawer';seriesPanel.innerHTML='<summary>Repeat an activity</summary><form id="paSeriesForm" class="pa-series-form"><label>Activity name<input name="name" maxlength="80" required></label><label>First start<input name="start" type="datetime-local" required></label><label>First finish<input name="end" type="datetime-local" required></label><label>Repeat<select name="frequency"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label>Repeat through<input name="until" type="date" required></label><label><input name="reminder" type="checkbox" checked> Remind me</label><div><button type="submit">Preview series</button><button type="button" data-pa-series-save disabled>Approve and save</button></div><p id="paSeriesStatus" role="status">Review each occurrence before saving. Conflicts are not added automatically.</p><details id="paSeriesPreview" hidden><summary>Review occurrences</summary><ol></ol></details></form>';host.querySelector('[data-v136-screen="calendar"]').append(seriesPanel);
 let proposedSeries=null;const seriesForm=$('paSeriesForm'),seriesStatus=$('paSeriesStatus'),seriesSave=seriesForm.querySelector('[data-pa-series-save]');
 const seriesPreview=$('paSeriesPreview');const invalidateSeries=()=>{proposedSeries=null;seriesSave.disabled=true;seriesPreview.hidden=true};
 seriesForm.addEventListener('input',invalidateSeries);seriesForm.addEventListener('change',invalidateSeries);
 seriesForm.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(seriesForm),id=root.crypto?.randomUUID?.()||('series-'+Date.now()+'-'+Math.random().toString(36).slice(2));const candidate={seriesId:id,name:f.get('name'),startAt:new Date(f.get('start')).getTime(),endAt:new Date(f.get('end')).getTime(),until:f.get('until'),frequency:f.get('frequency'),reminder:f.has('reminder')};try{const rows=series(candidate,read().schedule||[],Date.now());proposedSeries=candidate;seriesStatus.textContent=rows.length+' activities: '+labelPeriod(rows[0].startAt,rows[rows.length-1].endAt)+'. Approve to save these plans.';seriesPreview.querySelector('ol').innerHTML=rows.map(x=>'<li>'+esc(new Date(x.startAt).toLocaleString(undefined,{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))+' – '+esc(clock(x.endAt))+'</li>').join('');seriesPreview.hidden=false;seriesPreview.open=true;seriesSave.disabled=false}catch(err){invalidateSeries();seriesStatus.textContent=err.message}});
 seriesSave.addEventListener('click',()=>{if(!proposedSeries)return;const detail={...proposedSeries,result:{ok:false}};root.document.dispatchEvent(new CustomEvent('lifeos-plan-create-series',{detail}));seriesStatus.textContent=detail.result.message||'The series was not saved.';if(detail.result.ok){invalidateSeries();seriesForm.reset();render('calendar')}});
 host.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.paRange){state.range=b.dataset.paRange;calendar();return}
  if(b.dataset.paDate){state.anchor=b.dataset.paDate;state.range='day';calendar();return}
  if(b.dataset.paCalMove){const d=new Date(day(state.anchor)),n=+b.dataset.paCalMove;if(state.range==='month'){d.setDate(1);d.setMonth(d.getMonth()+n)}else d.setDate(d.getDate()+n*(state.range==='week'?7:state.range==='three'?3:1));state.anchor=key(d);calendar();return}
  if(b.hasAttribute('data-pa-today')){state.anchor=key(Date.now());calendar();return}
  if(b.dataset.paTaskMove){state.taskAnchor=shift(state.taskAnchor,+b.dataset.paTaskMove*7);tasks();return}
  if(b.hasAttribute('data-pa-task-add')){taskEditor();return}
  if(b.dataset.paTaskEdit){taskEditor(b.dataset.paTaskEdit);return}
  if(b.dataset.paDays){state.compareDays=+b.dataset.paDays;compare();return}
  if(b.dataset.paCompareMove){state.compareAnchor=shift(state.compareAnchor,+b.dataset.paCompareMove*state.compareDays);compare();return}
  if(b.dataset.paReview){host.querySelector('[data-v136-tab="review"]')?.click();host.querySelector('[data-v138-review="'+b.dataset.paReview+'"]')?.click();return}
 });
 host.addEventListener('change',e=>{const input=e.target.closest('[data-pa-task-toggle]');if(!input)return;const native=nativeTask(input.dataset.paTaskToggle,'toggle');if(native){native.checked=input.checked;native.dispatchEvent(new Event('change',{bubbles:true}))}tasks()});
 const refresh=()=>{const tab=activeTab();if(['calendar','tasks','compare','improve'].includes(tab))render(tab)};
 for(const id of ['todoList','scheduleList']){const node=$(id);if(node)new MutationObserver(refresh).observe(node,{childList:true,subtree:true})}
 for(const event of ['lifeos-v77-tracking-changed','lifeos-v74-records-changed','lifeos-v65-plan-committed','lifeos-v75-changed','lifeos-v76-activation-changed'])root.addEventListener(event,refresh);
 return true;
}
if(root.document){const boot=()=>{if(!init())root.setTimeout(boot,250)};if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()}
return {init,render,calendar,tasks,compare,improve,taskEditor,taskGroups,compareModel,rowsForDay,lanes,ideal,forecasts,series,day,shift,week};
});
