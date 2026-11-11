/* LifeOS V6: read-only Goals and My Life visual summaries. Never updates workspace data. */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=value=>Number(value.toFixed(1)).toLocaleString(undefined,{maximumFractionDigits:1});
const todayKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
function read(){try{return typeof window.lifeosReadOnlyWorkspace==='function'?window.lifeosReadOnlyWorkspace():null}catch(_){return null}}
function ranges(){
 const now=new Date(),monday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
 const weekEnd=new Date(monday);weekEnd.setDate(weekEnd.getDate()+7);
 const sevenStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()-6);
 return {weekStart:monday.getTime(),weekEnd:weekEnd.getTime(),sevenStart:todayKey(sevenStart),sevenEnd:todayKey(now)};
}
function goalValue(goal,ws,from,to){
 const logs=ws.personalLogs||[],sessions=ws.sessions||[],workouts=ws.workouts||[];
 if(goal.category==='personal'){
  const matches=logs.filter(x=>x&&typeof x.date==='string'&&x.category?.toLowerCase()===String(goal.match||'').trim().toLowerCase()&&(()=>{
   const time=new Date(x.date+'T12:00:00').getTime();return time>=from&&time<to;
  })());
  if(goal.unit!=='quantity')return matches.length;
  return matches.filter(x=>!goal.quantityUnit||String(x.unit||'').trim().toLowerCase()===String(goal.quantityUnit).trim().toLowerCase())
   .reduce((sum,x)=>sum+(Number.isFinite(x.quantity)&&x.quantity>0?x.quantity:0),0);
 }
 if(goal.category==='fitness'){
  const linked=new Map(sessions.map(s=>[s.id,s]));
  return workouts.filter(x=>{
   const session=x.sessionId?linked.get(x.sessionId):null;
   if(x.sessionId&&!session)return false;
   const timestamp=session?session.endAt:new Date(x.date+'T12:00:00').getTime();
   return Number.isFinite(timestamp)&&timestamp>=from&&timestamp<to;
  }).length;
 }
 const filtered=sessions.filter(s=>s.status==='finished'&&String(s.name||'').toLowerCase().includes(String(goal.match||'').toLowerCase())&&s.endAt>=from&&s.endAt<to);
 if(goal.unit!=='hours')return filtered.length;
 return filtered.reduce((sum,s)=>sum+(Array.isArray(s.segments)?s.segments.reduce((total,seg)=>{
  const a=Number(seg.start),b=Number(seg.end);return total+(Number.isFinite(a)&&Number.isFinite(b)&&b>a?(b-a)/3600000:0);
 },0):0),0);
}
function renderGoals(ws){
 const target=byId('loGoalsVisual');if(!target)return;
 const {weekStart,weekEnd}=ranges(),goals=Array.isArray(ws.goals)?ws.goals:[];
 const todos=Array.isArray(ws.todos)?ws.todos:[],open=todos.filter(x=>!x.done),done=todos.filter(x=>x.done);
 const cards=goals.slice(0,8).map(g=>{
  const value=goalValue(g,ws,weekStart,weekEnd),targetValue=Number(g.target),valid=Number.isFinite(targetValue)&&targetValue>0&&Number.isFinite(value);
  const progress=valid?Math.min(100,Math.max(0,value/targetValue*100)):0;
  const unit=g.unit==='quantity'?(g.quantityUnit||'units'):(g.unit||'sessions');
  return '<div class="lo-goal-row"><div class="lo-goal-row-head"><strong>'+escapeHtml(g.name)+'</strong><span>'+ (valid?short(value)+' / '+short(targetValue)+' '+escapeHtml(unit):'Target unavailable')+'</span></div><div class="lo-goal-track" role="progressbar" aria-label="'+escapeHtml(g.name)+' weekly goal progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(progress)+'"><i style="width:'+progress.toFixed(1)+'%"></i></div></div>';
 }).join('');
 target.innerHTML='<div class="lo-visual-head"><div><span class="lo-eyebrow">Your direction</span><h2>Goals at a glance</h2><p>Current week · Recorded progress only</p></div><span class="lo-soft-chip">Review, not a score</span></div>'+
 '<div class="lo-kpi-row"><div><span>Goals defined</span><strong>'+goals.length+'</strong></div><div><span>Open tasks</span><strong>'+open.length+'</strong></div><div><span>Completed tasks</span><strong>'+done.length+'</strong></div></div>'+
 '<div class="lo-goal-card"><h3>Weekly goal progress</h3>'+(cards||'<p class="lo-no-data">No goals yet. Create a goal below to see its progress here.</p>')+
 (goals.length>8?'<p class="lo-small-note">Showing 8 of '+goals.length+' goals. All goals remain available below.</p>':'')+
 '<p class="lo-small-note">Only logged activity counts. Missing records are unknown, not zero effort.</p></div>';
}
function renderLife(ws){
 const target=byId('loLifeVisual');if(!target)return;
 const {sevenStart,sevenEnd}=ranges(),logs=(ws.personalLogs||[]).filter(x=>x&&typeof x.date==='string'&&x.date>=sevenStart&&x.date<=sevenEnd);
 const counts=new Map();for(const log of logs)counts.set(String(log.category||'Other'),(counts.get(String(log.category||'Other'))||0)+1);
 const top=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,7),max=Math.max(1,...top.map(x=>x[1]));
 const bar=top.map(([name,count])=>'<div class="lo-life-row"><span>'+escapeHtml(name)+'</span><div class="lo-life-track"><i style="width:'+(count/max*100).toFixed(1)+'%"></i></div><strong>'+count+'</strong></div>').join('');
 const measuredSleep=logs.filter(x=>x.category==='Sleep'&&x.precision==='measured'&&Number.isFinite(x.minutes)&&x.minutes>=0);
 const estimatedSleep=logs.filter(x=>x.category==='Sleep'&&x.precision==='estimated'&&Number.isFinite(x.minutes)&&x.minutes>=0);
 const avg=arr=>arr.length?short(arr.reduce((sum,x)=>sum+x.minutes,0)/arr.length/60)+' h':'—';
 const uniqueDays=new Set(logs.map(x=>x.date)).size;
 const sleepLabel=measuredSleep.length?'Measured sleep average':'Measured sleep average';
 target.innerHTML='<div class="lo-visual-head"><div><span class="lo-eyebrow">Your routines</span><h2>My Life overview</h2><p>Last seven calendar dates · Personal logs, separate from tracked sessions</p></div><span class="lo-soft-chip">Recorded evidence</span></div>'+
 '<div class="lo-kpi-row"><div><span>Personal logs</span><strong>'+logs.length+'</strong></div><div><span>Days with logs</span><strong>'+uniqueDays+' <small>/ 7</small></strong></div><div><span>'+sleepLabel+'</span><strong>'+avg(measuredSleep)+'</strong></div></div>'+
 '<div class="lo-goal-card"><h3>Recorded routines by category</h3>'+(bar||'<p class="lo-no-data">No personal routine logs in the last seven dates. Add an entry below to populate this view.</p>')+
 '<p class="lo-small-note">Bars count log entries, not minutes or consistency. '+(estimatedSleep.length?'Estimated sleep average: '+avg(estimatedSleep)+'. ':'')+'Missing logs are unknown; this is not a recovery score.</p></div>';
}
function init(){
 const nav=byId('lifeosNavigation'),main=document.querySelector('main.wrap'),anchor=byId('todayOverview');
 if(!nav||!main||!anchor||byId('loGoalsVisual'))return;
 for(const [id,view] of [['loGoalsVisual','goals'],['loLifeVisual','life']]){
  const section=document.createElement('section');section.id=id;section.className='lo-visual-dashboard';section.dataset.view=view;section.hidden=true;
  section.setAttribute('aria-label',view==='goals'?'Weekly goals visual summary':'Personal life visual summary');
  main.insertBefore(section,anchor);
 }
 function refresh(){
  const view=document.body.dataset.lifeosView;
  for(const id of ['loGoalsVisual','loLifeVisual'])byId(id).hidden=byId(id).dataset.view!==view;
  if(view!=='goals'&&view!=='life')return;
  const ws=read();if(!ws)return;
  if(view==='goals')renderGoals(ws);else renderLife(ws);
 }
 nav.addEventListener('click',()=>setTimeout(refresh,0));window.addEventListener('hashchange',()=>setTimeout(refresh,0));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 window.addEventListener('focus',refresh);
 document.addEventListener('click',event=>{if(event.target.closest('[data-todo-act],[data-delete],[data-personal-delete]'))setTimeout(refresh,70)});
 document.addEventListener('submit',event=>{if(event.target.closest('#goalForm,#personalLogForm,#todoForm,#fitnessForm'))setTimeout(refresh,70)});
 setInterval(()=>{if(!document.hidden)refresh()},30000);
 setTimeout(refresh,0);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
