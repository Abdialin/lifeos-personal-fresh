/* LifeOS V4 Visual Intelligence: read-only charts and calendar. No workspace writes. */
(function(){
'use strict';
const $=id=>document.getElementById(id),fmt=ms=>(ms/3600000).toFixed(1)+'h';
const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let month=new Date(),selected=dateKey(new Date()),insightSelected=dateKey(new Date()),planSelected=dateKey(new Date());
 let planViewMode='reality';
month.setDate(1);
const workspace=()=>typeof window.lifeosReadOnlyWorkspace==='function'?window.lifeosReadOnlyWorkspace():{sessions:[],schedule:[]};
const engine=()=>window.LifeOSUnifiedAnalytics;
function day(ws,d,now){const start=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime(),end=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime();return engine().summarize(ws,{start,end,now});}
function chartCard(title,body){return '<div class="v4-card"><h3>'+title+'</h3>'+body+'</div>';}
function renderToday(ws,now){
 const target=$('v4Today');if(!target)return;
 const d=new Date(now),m=day(ws,d,now);
 const rows=m.recorded.slice().sort((a,b)=>a.start-b.start).slice(0,16);
 const timeline='<div class="v4-timeline" role="img" aria-label="Recorded activity timeline for today">'+rows.map((r,i)=>{const st=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime(),en=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime(),span=en-st,left=Math.max(0,Math.min(100,(r.start-st)/span*100)),width=Math.max(0,Math.min(100-left,(r.end-Math.max(r.start,st))/span*100));return '<div class="v4-lane"><span>'+esc(r.name)+'</span><div class="v4-track"><i style="left:'+left+'%;width:'+Math.max(.4,width)+'%"></i></div></div>'}).join('')+'</div><div class="v4-axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>';
 const empty='<p class="v4-muted">No recorded activity yet. Start a timer in Track to populate this view.</p>';
 target.innerHTML=chartCard('Your 24-hour reality',rows.length?timeline:empty)+chartCard('Recorded vs unique time','<div class="v4-metrics"><div><strong>'+fmt(m.summedRecordedMs)+'</strong><span>Recorded</span></div><div><strong>'+fmt(m.uniqueRecordedMs)+'</strong><span>Unique</span></div><div><strong>'+fmt(m.overlapRecordedMs)+'</strong><span>Overlap</span></div></div>');
}
function renderInsights(ws,now){
 const target=$('v4Insights');if(!target)return;
 const d=new Date(now),days=[];
 for(let i=6;i>=0;i--){const t=new Date(d.getFullYear(),d.getMonth(),d.getDate()-i);days.push({key:dateKey(t),label:t.toLocaleDateString(undefined,{weekday:'short'}),...day(ws,t,now)});}
 const max=Math.max(3600000,...days.map(x=>x.summedRecordedMs));
 const bars='<div class="v4-bars v4-interactive-bars" role="group" aria-label="Choose one of the last seven days to inspect recorded and unique hours">'+days.map(x=>'<button type="button" class="v4-bar-col v4-chart-day" data-v4-insight-day="'+x.key+'" aria-pressed="'+(insightSelected===x.key?'true':'false')+'" aria-label="'+esc(x.label)+': '+fmt(x.summedRecordedMs)+' recorded, '+fmt(x.uniqueRecordedMs)+' unique"><div class="v4-bar-stack"><i class="v4-recorded" style="height:'+(x.summedRecordedMs/max*100)+'%"></i><i class="v4-unique" style="height:'+(x.uniqueRecordedMs/max*100)+'%"></i></div><b>'+fmt(x.summedRecordedMs)+'</b><span>'+esc(x.label)+'</span></button>').join('')+'</div><p class="v4-muted">Select a day to inspect it. Blue = total recorded hours; mint = unique time (overlaps counted once). Missing logs are unknown.</p>';
 const picked=days.find(x=>x.key===insightSelected)||days[days.length-1];
 const pickedRows=picked.recorded.slice().sort((a,b)=>a.start-b.start).slice(0,6);
 const sessionById=new Map((ws.sessions||[]).map(x=>[x.id,x]));
 const pickedEnd=new Date(picked.key+'T12:00:00'),pickedStart=new Date(pickedEnd.getFullYear(),pickedEnd.getMonth(),pickedEnd.getDate()),dayEnd=new Date(pickedEnd.getFullYear(),pickedEnd.getMonth(),pickedEnd.getDate()+1);
 const coverageMs=Math.min(picked.uniqueRecordedMs,dayEnd.getTime()-pickedStart.getTime());
 const spanFmt=ms=>ms>0&&ms<60000?'<1m':fmt(ms);
 const qualityTags=x=>{
  const source=sessionById.get(x.id)||{};
  const tags=[];
  if(source.precision==='measured')tags.push('Measured');
  else if(source.precision)tags.push(source.precision==='estimated'?'Estimated':'Manually corrected');
  const end=source.endAt??now;
  if(Number.isFinite(source.startAt)&&Number.isFinite(end)&&end-source.startAt>=12*3600000)tags.push('Long session · review optional');
  return tags.length?'<small class="v7-insight-tags">'+tags.map(label=>'<span>'+esc(label)+'</span>').join('')+'</small>':'';
 };
 const evidenceSummary='<div class="v7-insight-evidence"><div><strong>'+spanFmt(coverageMs)+'</strong><span>Unique time covered on this date</span></div><p>Recorded hours are activity durations. Daily coverage counts overlapping activities once and cannot exceed the length of this local calendar day. Missing time remains unknown.</p></div>';
 const detail='<div class="v4-insight-detail" aria-live="polite"><div class="v4-insight-detail-head"><strong>'+esc(new Date(picked.key+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'}))+'</strong><span>Recorded evidence</span></div><div class="v4-metrics"><div><strong>'+fmt(picked.summedRecordedMs)+'</strong><span>Recorded</span></div><div><strong>'+fmt(picked.uniqueRecordedMs)+'</strong><span>Unique</span></div><div><strong>'+fmt(picked.overlapRecordedMs)+'</strong><span>Overlap</span></div></div>'+evidenceSummary+(pickedRows.length?pickedRows.map(x=>'<div class="v4-insight-entry"><span>'+esc(x.name)+qualityTags(x)+'</span><strong>'+spanFmt(Math.max(0,x.end-x.start))+'</strong></div>').join(''):'<p class="v4-muted">No recorded intervals for this date.</p>')+'<button type="button" class="v4-track-history-link" data-v4-track-history>View Track history ↗</button></div>';
 const counts=new Map();
 for(const x of days.flatMap(x=>x.recorded))counts.set(x.name,(counts.get(x.name)||0)+x.end-x.start);
 const ranked=[...counts].filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]),palette=['#69dec8','#79a7f7','#efb86e','#b69afd','#f28ca4'];
 const shown=ranked.slice(0,4);if(ranked.length>4)shown.push(['Other',ranked.slice(4).reduce((n,x)=>n+x[1],0)]);
 const total=shown.reduce((n,x)=>n+x[1],0);let previous=0;
 const stops=shown.map((x,i)=>{const end=i===shown.length-1?100:previous+x[1]/total*100;const stop=palette[i]+' '+previous.toFixed(2)+'% '+end.toFixed(2)+'%';previous=end;return stop;});
 const legend=shown.map(([name,ms],i)=>'<div class="v5-legend-item"><i class="v5-legend-dot" style="background:'+palette[i]+'"></i><span>'+esc(name)+'</span><strong>'+fmt(ms)+'</strong></div>').join('');
 const mix=total?'<div class="v5-mix"><div class="v5-donut" role="img" aria-label="Recorded activity time mix, including overlapping sessions" style="background:conic-gradient('+stops.join(',')+')"><div class="v5-donut-label"><strong>'+fmt(total)+'</strong><span>recorded</span></div></div><div class="v5-legend">'+legend+'</div></div><p class="v4-muted">Recorded-time totals include simultaneous activities; this is not a 24-hour occupancy breakdown.</p>':'<p class="v4-muted">No recorded activity yet. Start a timer in Track to populate your time mix.</p>';
 target.innerHTML=chartCard('Last seven days',bars+detail)+chartCard('Recorded time mix',mix);
}

function planningComparison(ws,now){
 const today=new Date(now),monday=new Date(today.getFullYear(),today.getMonth(),today.getDate());
 monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
 const weekStart=monday.getTime(),weekEnd=new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+7).getTime();
 const report=engine().summarize(ws,{start:weekStart,end:weekEnd,now});
 const evidenceDays=new Set(report.recorded.map(x=>dateKey(new Date(x.start)))).size;
 const recorded=report.uniqueRecordedMs,planned=report.uniquePlannedMs,matched=report.recordedDuringPlannedMs,planOverlap=report.plannedOverlapMs;
 const planner=window.LifeOSPersonalPlanner;
 let predicted='<p class="v4-muted">Historical patterns are unavailable. Missing logs are unknown time, not free time.</p>';
 if(planner&&typeof planner.dayTypePatterns==='function'){
  const patterns=planner.dayTypePatterns(ws.sessions||[],now);
  const rows=patterns.dayTypes.filter(x=>x.observedDays>0).map(x=>'<div class="v4-category"><span>'+esc(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][x.dayOfWeek])+'</span><div><i style="width:'+Math.min(100,x.observedDays/4*100)+'%"></i></div><b>'+x.observedDays+'d</b></div>').join('');
  predicted='<p class="v4-muted">'+patterns.observedTrackedDays+' tracked day(s) in the last '+patterns.lookbackDays+'. '+(patterns.confidence==='reviewable'?'Historical evidence is reviewable.':'At least 14 distinct tracked days are needed for reviewable evidence.')+'</p>'+(rows||'<p class="v4-muted">No completed activity history yet.</p>')+'<p class="v4-muted">Observed weekday frequency, not a forecast. Missing logs are unknown time, not free time. No schedule changes are made.</p>';
  if(typeof planner.historicalSuggestions==='function'){
   const future=new Date(today.getFullYear(),today.getMonth(),today.getDate()+1);
   const end=new Date(future);end.setDate(end.getDate()+7);
   const suggestions=planner.historicalSuggestions({sessions:ws.sessions||[],schedule:ws.schedule||[],from:future.getTime(),to:end.getTime()});
   const list=suggestions.suggestions.slice(0,6).map(p=>'<div class="v4-event"><span>'+new Date(p.startAt).toLocaleDateString(undefined,{weekday:'short'})+' '+new Date(p.startAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</span><strong>'+esc(p.name)+'</strong><em>'+(p.conflicts.length||p.actualConflicts.length?'Conflict':p.recoveryConflicts.length?'Recovery buffer':p.patternConsistency==='consistent'?'Consistent · review':'Variable · review')+'</em></div>').join('');
   predicted+='<p class="v4-muted">'+suggestions.suggestions.length+' historical-pattern suggestion(s) for the next seven days. A 30-minute recovery buffer is checked around existing plans. Pattern consistency describes recorded start times, not forecast accuracy. They are not automatically applied.</p>'+list;
  }
 }
 const scheduled=report.planned.slice().sort((a,b)=>a.start-b.start);
 const conflicts=[];
 for(let i=0;i<scheduled.length;i++)for(let j=i+1;j<scheduled.length&&scheduled[j].start<scheduled[i].end;j++){
  const a=scheduled[i],b=scheduled[j],minutes=Math.round((Math.min(a.end,b.end)-b.start)/60000);
  if(minutes>0)conflicts.push({a:a.name,b:b.name,minutes});
 }
 const conflictView=conflicts.length?'<p class="v4-muted">'+conflicts.length+' overlapping plan pair(s) this week. Review them in Plan:</p>'+conflicts.slice(0,5).map(x=>'<p class="v4-muted">'+esc(x.a)+' / '+esc(x.b)+' · '+x.minutes+' min overlap</p>').join(''):'<p class="v4-muted">No overlapping planned intervals detected this week.</p>';
 let ideal='<p class="v4-muted">No ideal routines defined. Add routines in Plan to see review-only proposals.</p>';
 if(planner&&typeof planner.build==='function'){
  const nextMonday=new Date(monday);nextMonday.setDate(nextMonday.getDate()+7);
  const result=planner.build({routines:ws.idealRoutines||[],schedule:ws.schedule||[],sessions:ws.sessions||[],from:weekStart,to:nextMonday.getTime()});
  const proposals=result.proposals;
  ideal=proposals.length?'<p class="v4-muted">'+proposals.length+' routine proposal(s) for this week. All require your approval in Plan.</p>'+proposals.slice(0,8).map(p=>'<div class="v4-event"><span>'+new Date(p.startAt).toLocaleDateString(undefined,{weekday:'short'})+' '+new Date(p.startAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</span><strong>'+esc(p.name)+'</strong><em>'+(p.conflicts.length||p.actualConflicts.length?'Conflict · review':'Review required')+'</em></div>').join(''):'<p class="v4-muted">No routine proposals for this week. Manage your ideal routines in Plan.</p>';
  ideal+='<p class="v4-muted">Routine-based suggestions only, not learned forecasts. Nothing is automatically scheduled.</p><button type="button" class="v4-review-button" data-v4-review-ideal>Review and approve in Plan</button>';
 }
 const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return {key:dateKey(d),label:d.toLocaleDateString(undefined,{weekday:'short'}),...day(ws,d,now)};});
 const maxDay=Math.max(3600000,...weekDays.map(x=>x.uniqueRecordedMs),...weekDays.map(x=>x.uniquePlannedMs));
 const focus=weekDays.find(x=>x.key===planSelected)||weekDays.find(x=>x.key===dateKey(today))||weekDays[0];
 const focusDate=new Date(focus.key+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});
 const focusMatched=Number.isFinite(focus.recordedDuringPlannedMs)?focus.recordedDuringPlannedMs:0;
 const balance='<div class="v5-week-chart v6-plan-week" role="group" aria-label="Select a day to compare recorded and planned hours">'+weekDays.map(x=>'<button type="button" class="v5-week-col v6-plan-day" data-v6-plan-day="'+x.key+'" aria-pressed="'+(x.key===focus.key?'true':'false')+'" aria-label="'+esc(x.label)+': '+fmt(x.uniqueRecordedMs)+' recorded, '+fmt(x.uniquePlannedMs)+' planned"><div class="v5-week-track"><i class="v5-recorded" style="height:'+(x.uniqueRecordedMs/maxDay*100)+'%"></i><i class="v5-planned" style="height:'+(x.uniquePlannedMs/maxDay*100)+'%"></i></div><span>'+esc(x.label)+'</span></button>').join('')+'</div><div class="v5-chart-key"><b>Recorded</b><b>Planned</b></div>'+
 '<div class="v6-plan-details" aria-live="polite"><div class="v6-plan-detail-head"><strong>'+esc(focusDate)+'</strong><span>Actual vs planned · selected day</span></div><div class="v4-metrics"><div><strong>'+fmt(focus.uniqueRecordedMs)+'</strong><span>Unique recorded</span></div><div><strong>'+fmt(focus.uniquePlannedMs)+'</strong><span>Unique planned</span></div><div><strong>'+fmt(focusMatched)+'</strong><span>Recorded within plans</span></div></div><p class="v4-muted">Recorded within plans means the intervals overlap in time; it does not prove that the planned task was completed. Unlogged time is unknown.</p></div>'+
 '<p class="v4-muted">Choose a weekday to inspect it. Future plans are intentions, not recorded activity.</p>';
 return chartCard("This week's time balance",balance)+chartCard('My Reality · this week','<div class="v4-metrics"><div><strong>'+fmt(recorded)+'</strong><span>Unique recorded</span></div><div><strong>'+fmt(report.overlapRecordedMs)+'</strong><span>Overlapping records</span></div></div><p class="v4-muted">Only recorded time through now is counted.</p>')+
 chartCard('My Predicted Week · review only','<div class="v4-metrics"><div><strong>'+fmt(planned)+'</strong><span>Currently planned</span></div><div><strong>'+fmt(matched)+'</strong><span>Recorded during planned time</span></div><div><strong>'+fmt(planOverlap)+'</strong><span>Overlapping planned hours</span></div></div>'+predicted+conflictView)+
 chartCard('My Ideal Schedule',ideal);
}
function renderCalendar(ws,now){
 const target=$('v4Plan');if(!target)return;
 const y=month.getFullYear(),m=month.getMonth(),first=new Date(y,m,1),offset=(first.getDay()+6)%7,last=new Date(y,m+1,0).getDate(),total=Math.ceil((offset+last)/7)*7;
 const cells=[];
 for(let i=0;i<total;i++){const n=i-offset+1;if(n<1||n>last){cells.push('<span class="v4-blank"></span>');continue}
 const d=new Date(y,m,n),key=dateKey(d),report=day(ws,d,now),hasPlan=report.planned.length>0,hasRecord=report.recorded.length>0;
 cells.push('<button type="button" data-v4-day="'+key+'" class="'+(key===selected?'v4-selected ':'')+(key===dateKey(new Date(now))?'v4-today':'')+'" aria-pressed="'+(key===selected?'true':'false')+'" aria-label="'+d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})+'; '+report.planned.length+' planned intervals; '+report.recorded.length+' recorded intervals"><strong>'+n+'</strong><span>'+(hasRecord?'●':'')+(hasPlan?' ◇':'')+'</span></button>');
 }
 const picked=new Date(selected+'T12:00:00'),r=day(ws,picked,now);
 const selectedPlans=(ws.schedule||[]).filter(p=>p.startAt<new Date(selected+'T00:00:00').getTime()+86400000&&p.endAt>new Date(selected+'T00:00:00').getTime());
 const selectedSessions=(ws.sessions||[]).filter(s=>Array.isArray(s.segments)&&s.segments.some(g=>Number(g.start)<new Date(selected+'T00:00:00').getTime()+86400000&&(g.end===null?now:Number(g.end))>new Date(selected+'T00:00:00').getTime()));
 const linkedPlans=selectedPlans.filter(p=>p.sessionId&&selectedSessions.some(s=>s.id===p.sessionId));
 const skippedPlans=selectedPlans.filter(p=>p.status==='skipped');
 const pendingPlans=selectedPlans.filter(p=>!p.sessionId&&p.status!=='skipped'&&p.endAt<=now);
 const distractionMs=r.recorded.filter(x=>/distraction/i.test(x.name)).reduce((sum,x)=>sum+(x.end-x.start),0);
 const unplannedIds=new Set(r.recorded.filter(x=>!selectedPlans.some(p=>p.sessionId===x.id)).map(x=>x.id));
 const dayReview='<div class="v8-day-review" aria-label="Selected day performance"><div><b>'+new Set(r.recorded.map(x=>x.id)).size+'</b><span>Recorded sessions</span></div><div><b>'+fmt(r.uniqueRecordedMs)+'</b><span>Unique tracked time</span></div><div><b>'+linkedPlans.length+' / '+selectedPlans.length+'</b><span>Plans linked</span></div><div><b>'+fmt(distractionMs)+'</b><span>Distraction</span></div><div><b>'+unplannedIds.size+'</b><span>Unplanned sessions</span></div><div><b>'+(skippedPlans.length+pendingPlans.length)+'</b><span>Plans to review</span></div></div><p class="v4-muted">Unconfirmed plans require review; they are not automatically counted as missed.</p>';
 const entries=[...r.planned.map(x=>({...x,kind:'Planned'})),...r.recorded.map(x=>({...x,kind:'Recorded'}))].sort((a,b)=>a.start-b.start);
 const list=entries.length?entries.slice(0,20).map(x=>'<div class="v4-event"><span>'+new Date(x.start).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'–'+new Date(x.end).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</span><strong>'+esc(x.name)+'</strong><em>'+x.kind+'</em></div>').join(''):'<p class="v4-muted">No recorded or planned intervals for this date.</p>';
 target.innerHTML=planningComparison(ws,now)+chartCard('Calendar · recorded ● / planned ◇','<div class="v4-calendar-head"><div class="v4-calendar-navigation"><button type="button" data-v4-month="-1" aria-label="Previous month">‹</button><strong aria-live="polite">'+first.toLocaleDateString(undefined,{month:'long',year:'numeric'})+'</strong><button type="button" data-v4-month="1" aria-label="Next month">›</button></div><button type="button" class="v4-calendar-today" data-v4-today>Today</button></div><div class="v4-calendar-grid">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>'<b>'+x+'</b>').join('')+cells.join('')+'</div>')+chartCard('Selected day · '+esc(selected),dayReview+list+'<p class="v4-muted">Calendar is read-only. Use Plan to create or change scheduled activities.</p>');
 const cards=[...target.querySelectorAll(':scope > .v4-card')];
 if(cards.length===6){
  const [week,reality,predicted,ideal,calendar,chosen]=cards;
  const labels=[['reality','My Reality',reality],['predicted','My Predicted Week',predicted],['ideal','My Ideal Schedule',ideal]];
  const tabs=document.createElement('div');tabs.className='v7-plan-view-tabs';
  tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Planning comparison view');
  tabs.innerHTML=labels.map(([key,label])=>'<button type="button" role="tab" id="v7-plan-tab-'+key+'" data-v7-plan-view="'+key+'" aria-controls="v7-plan-panel-'+key+'" aria-selected="'+(planViewMode===key)+'" tabindex="'+(planViewMode===key?'0':'-1')+'">'+label+'</button>').join('');
  target.prepend(tabs);
  const toolbar=document.createElement('div');toolbar.className='v7-plan-toolbar';
  toolbar.innerHTML='<div><strong>Your schedule</strong><span>Select a date, compare activity, or add a plan.</span></div><button type="button" data-v7-add-plan>+ Add activity</button>';
  target.prepend(toolbar);
  target.append(calendar,week,chosen,reality,predicted,ideal);
  labels.forEach(([key,,card])=>{
   card.id='v7-plan-panel-'+key;card.classList.add('v7-plan-mode-card');
   card.setAttribute('role','tabpanel');card.setAttribute('aria-labelledby','v7-plan-tab-'+key);
   card.hidden=planViewMode!==key;
  });
  calendar.classList.add('v7-plan-calendar');
  chosen.classList.add('v7-plan-selected-day');
  week.classList.add('v7-plan-week-balance');
  // Show real prediction/ideal calendar directly under the main month view,
  // instead of burying it below long text lists and duplicated controls.
  if(planViewMode==='predicted'||planViewMode==='ideal'){
   const visual=document.createElement('div');visual.id='v7IntegratedWeekPreview';visual.className='v4-card lo-integrated-preview';
   visual.setAttribute('aria-label',planViewMode==='ideal'?'Ideal week timeline':'Predicted week timeline');
   calendar.insertAdjacentElement('afterend',visual);
   try{
    const start=now,end=new Date(start);end.setDate(end.getDate()+7);
    let suggestions=[],confirmed=[];
    if(planViewMode==='predicted'){
     const out=window.LifeOSPersonalPlanner.historicalSuggestions({sessions:ws.sessions||[],schedule:ws.schedule||[],from:start,to:end.getTime(),minimumDays:14,lookbackDays:28,recoveryBufferMinutes:30});
     suggestions=out.suggestions||[];
     confirmed=(ws.schedule||[]).filter(p=>p.status!=='skipped'&&p.startAt>=start&&p.startAt<end.getTime());
    }else{
     suggestions=window.LifeOSIdealPlanning.project(ws.idealRoutines||[],start,end.getTime());
    }
    window.LifeOSPredictionVisuals.render(visual,{
     sessions:ws.sessions||[],suggestions,confirmed,from:start,observedDays:0,mode:planViewMode
    });
   }catch(e){visual.textContent='The weekly preview is unavailable. Existing tracking and plans are unchanged.'}
  }
 }

}
function update(){if(!engine()||typeof window.lifeosReadOnlyWorkspace!=='function')return;try{const ws=workspace(),now=Date.now(),view=document.body.dataset.lifeosView;if(view==='dashboard')renderToday(ws,now);if(view==='analytics')renderInsights(ws,now);if(view==='schedule')renderCalendar(ws,now)}catch(err){for(const id of ['v4Today','v4Insights','v4Plan']){const el=$(id);if(el&&document.body.dataset.lifeosView===el.dataset.v4View)el.textContent='Visual summary unavailable. Existing tracking and planning remain accessible.'}console.warn('LifeOS V4 visual read-only error',err)}}
function init(){const today=$('todayOverview'),nav=$('lifeosNavigation');if(!today||!nav)return;
 const style=document.createElement('style');style.textContent=`
.v4-section{max-width:1100px;margin:12px auto 22px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:14px}
.v4-section[hidden]{display:none!important}.v4-card{min-width:0;background:#131e33;border:1px solid #30415f;border-radius:16px;padding:16px;color:#eaf0ff}
.v4-card h3{margin:0 0 14px;font-size:16px}.v4-muted{font-size:12px;color:#aabbd4;line-height:1.5}
.v4-metrics{display:flex;gap:14px;flex-wrap:wrap}.v4-metrics div{display:grid;gap:3px}.v4-metrics strong{font-size:22px}.v4-metrics span{font-size:12px;color:#aabbd4}
.v4-lane{display:grid;grid-template-columns:105px 1fr;gap:8px;align-items:center;margin:6px 0;font-size:11px}.v4-lane>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v4-track{height:12px;border-radius:6px;background:#263752;position:relative;overflow:hidden}.v4-track i{position:absolute;top:0;bottom:0;background:#6ddac4;border-radius:5px}
.v4-axis{display:flex;justify-content:space-between;color:#9aacc8;font-size:10px;padding-left:112px}
.v4-bars{height:180px;display:flex;gap:9px;align-items:end;justify-content:space-around}.v4-bar-col{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px}
.v4-bar-stack{height:135px;width:100%;max-width:34px;position:relative;background:#24334b;border-radius:6px 6px 0 0;overflow:hidden}
.v4-bar-stack i{position:absolute;bottom:0;width:100%;left:0}.v4-recorded{background:#71a5e6}.v4-unique{background:#4bd7bd;opacity:.88}
.v4-bar-col b{font-size:10px}.v4-category{display:grid;grid-template-columns:minmax(70px,1fr) 2fr 42px;gap:8px;align-items:center;margin:9px 0;font-size:12px}.v4-category>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.v4-category>div{height:10px;background:#263752;border-radius:8px;overflow:hidden}.v4-category i{display:block;height:100%;background:#66cdbd}
.v4-review-button{background:#244c57;color:#f0fffb;border:1px solid #69d9c6;padding:10px 14px;border-radius:9px;cursor:pointer;font-weight:600}.v4-review-button:focus-visible{outline:3px solid #fff;outline-offset:2px}
.v4-calendar-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.v4-calendar-head button{background:#233956;color:#fff;border:1px solid #4b6689;border-radius:8px;padding:5px 13px}
.v4-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.v4-calendar-grid>b{text-align:center;font-size:11px;color:#aabbd4}
.v4-calendar-grid button{min-height:43px;background:#202f47;color:#fff;border:1px solid #324967;border-radius:7px;display:grid;place-items:center;padding:4px 0}
.v4-calendar-grid button span{font-size:10px;color:#69d9c6}.v4-calendar-grid .v4-selected{outline:2px solid #79e3cd}.v4-calendar-grid .v4-today{background:#315077}
.v4-event{display:grid;grid-template-columns:90px 1fr auto;gap:8px;padding:8px 0;border-bottom:1px solid #34425b;font-size:12px}.v4-event em{color:#9fd9cd;font-style:normal}
@media(max-width:650px){.v4-section{grid-template-columns:minmax(0,1fr)}.v4-event{grid-template-columns:75px 1fr auto;font-size:11px}.v4-lane{grid-template-columns:85px 1fr}.v4-axis{padding-left:92px}}
`;document.head.appendChild(style);
 for(const [id,view] of [['v4Today','dashboard'],['v4Insights','analytics'],['v4Plan','schedule']]){const section=document.createElement('section');section.id=id;section.className='v4-section';section.dataset.v4View=view;section.setAttribute('aria-label',view+' visual overview');section.hidden=true;today.insertAdjacentElement('afterend',section)}
 function sync(){for(const id of ['v4Today','v4Insights','v4Plan'])$(id).hidden=document.body.dataset.lifeosView!==$(id).dataset.v4View;update()}
 nav.addEventListener('click',()=>setTimeout(sync,0));window.addEventListener('hashchange',()=>setTimeout(sync,0));
 document.addEventListener('click',e=>{const history=e.target.closest('[data-v4-track-history]');if(history){$('lifeosNavigation')?.querySelector('button[data-view="tracking"]')?.click();window.setTimeout(()=>$('trackHistoryPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),60);return;}const add=e.target.closest('[data-v7-add-plan]');if(add){const button=$('v7TogglePlanForm');if(button&&button.getAttribute('aria-expanded')==='false')button.click();$('scheduleEditorPanel')?.scrollIntoView({behavior:'smooth',block:'start'});return;}const mode=e.target.closest('[data-v7-plan-view]');if(mode){
  planViewMode=mode.dataset.v7PlanView;
  update();
  // Keep the supporting historical-evidence view aligned with primary tabs.
  // These hidden controls change only view state; they never save records.
  const secondary={reality:'smartReality',predicted:'smartPredicted',ideal:'smartIdeal'}[planViewMode];
  if(secondary)document.getElementById(secondary)?.click();
  $('v7-plan-tab-'+planViewMode)?.focus();return;
 }const plan=e.target.closest('[data-v6-plan-day]');if(plan){
  const picked=plan.dataset.v6PlanDay;
  planSelected=picked;selected=picked;
  const d=new Date(picked+'T12:00:00');month=new Date(d.getFullYear(),d.getMonth(),1);
  const field=$('scheduleDay');
  if(field){field.value=picked;field.dispatchEvent(new Event('change',{bubbles:true}));}
  update();
  const card=$('lifeosSelectedDaySummary')||$('v4Plan')?.querySelector('.v7-plan-selected-day');
  if(card){card.tabIndex=-1;card.scrollIntoView({behavior:'smooth',block:'start'});card.focus({preventScroll:true});}
 }const insight=e.target.closest('[data-v4-insight-day]');if(insight){insightSelected=insight.dataset.v4InsightDay;update();$('v4Insights')?.querySelector('[data-v4-insight-day="'+insightSelected+'"]')?.focus();}const m=e.target.closest('[data-v4-month]');if(m){const step=Number(m.dataset.v4Month);if(step===1||step===-1){month.setDate(1);month.setMonth(month.getMonth()+step);selected=dateKey(new Date(month.getFullYear(),month.getMonth(),1));update()}}const todayButton=e.target.closest('[data-v4-today]');if(todayButton){const d=new Date();month=new Date(d.getFullYear(),d.getMonth(),1);selected=dateKey(d);const dateField=$('scheduleDay');if(dateField){dateField.value=selected;dateField.dispatchEvent(new Event('change',{bubbles:true}));}update();$('v4Plan')?.querySelector('[data-v4-today]')?.focus();}const review=e.target.closest('[data-v4-review-ideal]');if(review){const input=$('scheduleDay'),button=$('idealReview');if(input&&button){const panel=button.closest('section.panel');if(panel?.classList.contains('lo-advanced-collapsed'))panel.querySelector('.lo-advanced-toggle')?.click();const d=new Date();d.setDate(d.getDate()-(d.getDay()+6)%7);input.value=dateKey(d);const details=button.closest('details');if(details)details.open=true;button.click();$('idealProposalList')?.scrollIntoView({behavior:'smooth',block:'start'});}else console.warn('Ideal review controls unavailable');}const d=e.target.closest('[data-v4-day]');if(d){
  selected=d.dataset.v4Day;planSelected=selected;
  const dateField=$('scheduleDay');
  if(dateField){
   dateField.value=selected;
   dateField.dispatchEvent(new Event('change',{bubbles:true}));
  }
  update();
  const dayCard=$('lifeosSelectedDaySummary')||$('v4Plan')?.querySelector('.v7-plan-selected-day');
  if(dayCard){dayCard.tabIndex=-1;dayCard.setAttribute('aria-label','Day details for '+selected);dayCard.scrollIntoView({behavior:'smooth',block:'start'});dayCard.focus({preventScroll:true});}
 }
});
 setTimeout(sync,0);setInterval(()=>{if(!document.hidden)update()},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});window.addEventListener('focus',update);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();