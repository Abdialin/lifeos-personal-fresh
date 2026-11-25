
/* LifeOS Track Concept A: one isolated presentation, no duplicate data store. */
(function(){
'use strict';
if(window.__lifeosConceptAIndependent)return;
window.__lifeosConceptAIndependent=true;
const $=id=>document.getElementById(id);
const e=(tag,cls,textValue)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(textValue!==undefined)node.textContent=textValue;
 return node;
};
const state={tab:'live',historyPeriod:'week',historyMonth:localMonthKey(new Date()),reviewPeriod:'week',query:'',history:[],lastHistory:0};
let shell,dialog,dialogBody,previousFocus,selectedGap=null;
const localInput=ms=>{const d=new Date(ms);return new Date(ms-d.getTimezoneOffset()*60000).toISOString().slice(0,23)};
function htmlEscape(value){return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function durationMs(text){
 const t=String(text||'').trim().toLowerCase();let minutes=0;
 const h=t.match(/(\d+(?:\.\d+)?)\s*h/),m=t.match(/(\d+(?:\.\d+)?)\s*m(?!s)/);
 if(h||m)minutes=(h?Number(h[1])*60:0)+(m?Number(m[1]):0);
 else if(/^\d+:\d+(?::\d+)?$/.test(t)){const units=t.split(':').map(Number);minutes=(units.length===3?units[0]*60+units[1]+units[2]/60:units[0]*60+units[1]);}
 return Math.max(0,minutes*60000);
}
function durationLabel(ms){
 if(!Number.isFinite(ms)||ms<=0)return '0m';
 const mins=Math.round(ms/60000);
 return (mins>=60?Math.floor(mins/60)+'h ':'')+(mins%60?mins%60+'m':mins<60?'0m':'').trim();
}
function exactDuration(ms){
 const n=Math.max(0,Math.round(ms));const hours=Math.floor(n/3600000),minutes=Math.floor(n/60000)%60,seconds=(n%60000)/1000;
 return [hours?hours+'h':'',minutes?minutes+'m':'',seconds||(!hours&&!minutes)?String(seconds)+'s':''].filter(Boolean).join(' ');
}
function activeSessions(){
 const rows=Array.from(document.querySelectorAll('#sessions details.lo17-session')).map(node=>{
  const meta=node.querySelector('.lo17-meta')?.textContent.trim()||'';
  return {id:node.dataset.sessionId||'',name:node.querySelector('.session-title')?.textContent.trim()||'Activity',
    clock:(node.querySelector('.lo17-clock')?.title.match(/Full activity:\s+([0-9]+:[0-9]{2}:[0-9]{2})/i)?.[1]||meta.match(/Total\s+([0-9]+:[0-9]{2}:[0-9]{2})/i)?.[1]||node.querySelector('.lo17-clock')?.textContent.trim()||'00:00:00'),
    meta,status:/paused/i.test(meta)?'paused':'running'};
 });
 // Honor the existing primary timer choice if the original Live activity panel identifies it.
 const heading=Array.from(document.querySelectorAll('h1,h2,h3')).find(node=>node.textContent.trim().toLowerCase()==='your live activity');
 const container=heading?.closest('section,.panel,article');
 if(container){
  const content=container.textContent||'';
  const matches=rows.filter(row=>content.includes(row.name));
  if(matches.length===1){const pos=rows.indexOf(matches[0]);if(pos>0)rows.unshift(rows.splice(pos,1)[0])}
 }
 return rows;
}
function originalAction(id,action){
 const control=Array.from(document.querySelectorAll('#sessions [data-act]')).find(b=>b.dataset.id===id&&b.dataset.act===action);
 if(control){control.click();return true}return false;
}
function originalHistory(id,action){
 const control=Array.from(document.querySelectorAll('#history [data-act]')).find(b=>b.dataset.id===id&&b.dataset.act===action);
 if(control){control.click();return true}return false;
}
function readHistory(){
 const result=[];
 // LifeOS V11 groups recorded day-portions inside month/week/day details.
 // Older builds use lo-history-day. Support both without modifying stored records.
 for(const group of document.querySelectorAll('#history .lo11-history-day, #history .lo-history-day')){
  const day=group.querySelector(':scope > summary strong, :scope > summary span')?.textContent.trim()||'Recorded day';
  const monthText=group.closest('.lo11-history-month')?.querySelector(':scope > summary strong')?.textContent||'';
  // The V11 day heading contains weekday + day number, while month/year
  // lives on an ancestor (e.g. "Monday 23" inside "November 2026").
  // Parsing the day heading alone silently included old records in This Week
  // while producing no matching daily bars. Reconstruct the true local date.
  const year=Number(monthText.match(/\b(20\d{2})\b/)?.[1]);
  const dayNumber=Number(day.match(/\b(\d{1,2})\b/)?.[1]);
  let parsed=null;
  if(Number.isInteger(year)&&Number.isInteger(dayNumber)&&dayNumber>=1&&dayNumber<=31){
   const monthLabel=monthText.replace(/\b20\d{2}\b/,'').trim().toLocaleLowerCase();
   const names=new Intl.DateTimeFormat(undefined,{month:'long'});
   let monthIndex=Array.from({length:12},(_,i)=>i).find(i=>names.format(new Date(year,i,1)).toLocaleLowerCase()===monthLabel);
   if(monthIndex===undefined){
    const englishNames=new Intl.DateTimeFormat('en',{month:'long'});
    monthIndex=Array.from({length:12},(_,i)=>i).find(i=>englishNames.format(new Date(year,i,1)).toLocaleLowerCase()===monthLabel);
   }
   if(monthIndex!==undefined){
    const date=new Date(year,monthIndex,dayNumber,12);
    if(date.getMonth()===monthIndex&&date.getDate()===dayNumber)parsed=date;
   }
  }
  // The older History format contains its own month and day.
  if(!parsed&&!monthText){
   const oldDate=new Date(day+' '+new Date().getFullYear());
   if(Number.isFinite(oldDate.getTime())){
    if(oldDate.getTime()>Date.now()+86400000)oldDate.setFullYear(oldDate.getFullYear()-1);
    parsed=oldDate;
   }
  }
  const dateKey=parsed?localKey(parsed):'';
  for(const item of group.querySelectorAll('.lo-history-item')){
   const id=item.querySelector('[data-id]')?.dataset.id||'';
   result.push({id,day,dateKey,name:item.querySelector('.lo-history-entry strong')?.textContent.trim()||'Activity',
    rawDurationMs:item.hasAttribute('data-duration-ms')?Number(item.dataset.durationMs):null,
    duration:item.querySelector('.lo-history-entry span')?.textContent.trim()||'—',
    time:item.querySelector('.lo-history-foot small')?.textContent.trim()||''});
  }
 }
 return result;
}
function dayDate(record){
 if(record.dateKey){
  const d=new Date(record.dateKey+'T12:00:00');
  if(Number.isFinite(d.getTime()))return d;
 }
 const current=new Date();let d=new Date(record.day+' '+current.getFullYear());
 if(!Number.isFinite(d.getTime()))return null;
 if(d.getTime()>current.getTime()+86400000)d.setFullYear(d.getFullYear()-1);
 return d;
}
function matchesPeriod(record,period){
 if(period==='all')return true;
 // Unknown dates are excluded from date-scoped summaries rather than
 // silently counted in the wrong week or month.
 if(!record.dateKey)return false;
 const d=dayDate(record);if(!d)return false;
 const now=new Date();now.setHours(0,0,0,0);d.setHours(0,0,0,0);
 const delta=Math.round((now-d)/86400000);
 if(period==='today')return delta===0;
 if(period==='week')return delta>=0&&delta<7;
 if(period==='month')return delta>=0&&delta<31;
 return true;
}
function build(){
 if($('loTrackConceptA'))return;
 const nav=$('lifeosNavigation');
 if(!nav||!nav.parentElement)return;
 shell=e('section');shell.id='loTrackConceptA';shell.setAttribute('aria-label','Track Concept A');
 shell.innerHTML=[
 '<div class="ca-workspaces">',
 '<div class="ca-brand"><div><span class="ca-logo">◈</span><b>LifeOS Beta</b></div><span class="ca-brand-end">● Personal</span></div>',
 '<h1 class="ca-heading">Track</h1><p class="ca-subtitle">Track time, focus and activities</p>',
 '<div class="ca-tabs" role="tablist" aria-label="Track workspaces">',
 '<button class="ca-tab" type="button" data-ca-tab="live" role="tab" aria-selected="true">▷ &nbsp;Live</button>',
 '<button class="ca-tab" type="button" data-ca-tab="history" role="tab" aria-selected="false">▣ &nbsp;History</button>',
 '<button class="ca-tab" type="button" data-ca-tab="review" role="tab" aria-selected="false">▥ &nbsp;Review</button>',
 '</div>',
 '<div id="caLive" role="tabpanel"></div><div id="caHistory" role="tabpanel" hidden></div><div id="caReview" role="tabpanel" hidden></div>',
 '</div>'
 ].join('');
 nav.insertAdjacentElement('afterend',shell);
 dialog=e('div');dialog.id='loCADialog';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','caDialogTitle');
 dialog.innerHTML='<div class="ca-sheet" role="document"><div class="ca-sheet-head"><div><h2 id="caDialogTitle">Details</h2><p id="caDialogSubtitle"></p></div><button type="button" class="ca-x" data-ca-close aria-label="Close">×</button></div><div id="caDialogBody"></div></div>';
 document.body.append(dialog);dialogBody=$('caDialogBody');
 shell.addEventListener('click',handleClick);
 // Handle manual entry before legacy document-level bubbling handlers.
 shell.addEventListener('click',event=>{const button=event.target.closest('[data-ca-sheet="past"]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();sheet('past');},true);
 shell.addEventListener('input',event=>{
  if(event.target.id==='caHistorySearch'){
   state.query=event.target.value;const caret=event.target.selectionStart;
   renderHistory();const replacement=$('caHistorySearch');
   if(replacement){replacement.focus();if(caret!==null)replacement.setSelectionRange(caret,caret)}
  }
 });
 dialog.addEventListener('click',handleDialogClick);
 dialog.addEventListener('input',event=>{
  if(event.target.id!=='caStartSearch')return;
  const value=event.target.value.trim().toLocaleLowerCase();
  for(const option of dialogBody.querySelectorAll('[data-ca-quick]')){
   option.hidden=!option.textContent.toLocaleLowerCase().includes(value);
  }
 });

 dialog.addEventListener('click',event=>{if(event.target===dialog)closeDialog()});
 dialog.addEventListener('keydown',event=>{
  if(event.key==='Escape'){closeDialog();return}
  if(event.key==='Tab'){const focusable=Array.from(dialog.querySelectorAll('button,input,select,textarea')).filter(x=>!x.disabled&&x.getClientRects().length);if(focusable.length){if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable[focusable.length-1].focus()}else if(!event.shiftKey&&document.activeElement===focusable[focusable.length-1]){event.preventDefault();focusable[0].focus()}}}
 });
 updateHistorySource();chooseTab('live');renderLive();renderHistory();renderReview();
 const historyEl=$('history');
 if(historyEl)new MutationObserver(()=>{state.lastHistory=0;if(state.tab==='history')renderHistory();if(state.tab==='review')renderReview()}).observe(historyEl,{childList:true,subtree:true});
 let previousView=document.body.dataset.lifeosView;
 const viewObserver=new MutationObserver(()=>{
  const nextView=document.body.dataset.lifeosView;
  if(nextView===previousView)return;
  previousView=nextView;
  if(nextView==='tracking')refresh();
  else if(!dialog.hidden)closeDialog();
 });
 viewObserver.observe(document.body,{attributes:true,attributeFilter:['data-lifeos-view']});
 document.body.classList.add('lo-ca-ready');
 window.addEventListener('lifeos-v221-focus-changed',()=>{
  if(dialog?.dataset.caFocusStarting==='1'){
   const session=readRealFocusState();
   if(session&&session.kind==='focus'){
    // Native focus layer is displayed after the save event. Hide that
    // duplicate surface after it finishes and keep the real engine running.
    window.requestAnimationFrame(()=>{
     const native=$('lo207-focus-layer');
     if(native){native.hidden=true;native.style.display='none'}
     showRealFocus();
    });
   }
  }else if(dialog?.dataset.caFocusLive==='1')window.setTimeout(updateRealFocusScreen,0);
  if(state.tab==='live')renderLive();
 });
 window.setInterval(()=>{if(document.body.dataset.lifeosView==='tracking')refresh()},1000);
}
function chooseTab(name){
 if(!['live','history','review'].includes(name))return;
 state.tab=name;
 for(const view of ['live','history','review']){
  const tab=shell.querySelector('[data-ca-tab="'+view+'"]');
  tab.setAttribute('aria-selected',String(view===name));tab.tabIndex=view===name?0:-1;
  $('ca'+view[0].toUpperCase()+view.slice(1)).hidden=view!==name;
 }
 if(name==='history')renderHistory();
 if(name==='review')renderReview();
 if(name==='live')renderLive();
 shell.scrollIntoView({block:'start',behavior:'auto'});
}
function liveMarkup(){
 const rows=activeSessions(),first=rows[0],others=rows.slice(1);
 let markup='';
 if(first){
  markup+='<div class="ca-panel ca-primary"><div class="ca-overline"><span>◎ Active activity</span><span class="ca-pill">'+htmlEscape(first.status==='running'?'● Running':'Ⅱ Paused')+'</span></div>';
  markup+='<div class="ca-activity-name">'+htmlEscape(first.name)+'</div>';
  markup+='<div class="ca-clock" id="caMainClock">'+htmlEscape(first.clock)+'</div><p class="ca-timer-meta">Total recorded session time · '+htmlEscape(first.status)+'</p>';
  // No goal percentage is displayed unless a real goal source is available.
  markup+='<div class="ca-control-grid">';
  markup+='<button type="button" data-ca-act="'+(first.status==='running'?'pause':'resume')+'" data-ca-id="'+htmlEscape(first.id)+'" class="ca-emphasis"><span>'+(first.status==='running'?'Ⅱ':'▷')+'</span>'+(first.status==='running'?'Pause':'Resume')+'</button>';
  markup+='<button type="button" data-ca-act="break" data-ca-id="'+htmlEscape(first.id)+'"><span>☕</span>Break</button>';
  markup+='<button type="button" data-ca-act="finish" data-ca-id="'+htmlEscape(first.id)+'"><span>■</span>Finish</button>';
  markup+='<button type="button" data-ca-sheet="activity" data-ca-id="'+htmlEscape(first.id)+'"><span>⋯</span>Details</button>';
  markup+='</div></div>';
 }else{
  markup+='<div class="ca-panel ca-primary"><div class="ca-overline">◎ ACTIVE ACTIVITY</div><div class="ca-empty"><strong style="display:block;color:#f3fffa;font-size:20px;margin-bottom:8px">Ready for your next activity?</strong>No timer is running. Start a new activity to see its live clock here.</div></div>';
 }
 if(others.length){
  markup+='<div class="ca-panel ca-secondary"><h3>▱ &nbsp; Other active ('+others.length+')</h3>';
  for(const row of others)markup+='<div class="ca-mini-item"><i class="ca-dot"></i><strong>'+htmlEscape(row.name)+'</strong><time>'+htmlEscape(row.clock)+'</time><button type="button" class="ca-soft-button" style="min-height:32px;padding:0 10px" data-ca-sheet="activity" data-ca-id="'+htmlEscape(row.id)+'" aria-label="Open '+htmlEscape(row.name)+'">›</button></div>';
  markup+='</div>';
 }
 markup+='<button type="button" class="ca-main-button" data-ca-sheet="start">＋ &nbsp; Start Activity</button>';
 const focus=readRealFocusState();
 markup+='<div class="ca-quiet-actions"><button type="button" class="ca-soft-button" data-ca-sheet="focus">'+(focus?'● Focus '+htmlEscape(focus.mode):'◎ Focus Mode')+'</button><button type="button" class="ca-soft-button" data-ca-sheet="timer">◷ Timer settings</button></div>';
 return markup;
}
function renderLive(){
 if(!shell)return;
 const target=$('caLive');if(!target)return;
 const previous=target.querySelector('#caMainClock')?.textContent;
 const next=liveMarkup();
 const focus=readRealFocusState();
 const signature=activeSessions().map(x=>x.id+'|'+x.name+'|'+x.status).join('|')+'|focus:'+String(focus?.mode||'none')+'|'+String(focus?.label||'');
 if(target.dataset.signature!==signature){
  target.innerHTML=next;target.dataset.signature=signature;
 }else{
  const sessions=activeSessions();
  if(sessions[0]&&$('caMainClock'))$('caMainClock').textContent=sessions[0].clock;
  const timers=target.querySelectorAll('.ca-mini-item time');
  sessions.slice(1).forEach((s,i)=>{if(timers[i])timers[i].textContent=s.clock});
 }
}
function updateHistorySource(){
 const select=$('loHistoryPeriod');
 if(select&&select.value!=='all'){select.value='all';select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}))}
}
// Calendar months contain ISO weeks (Monday–Sunday), then individual days.
// A day portion is assigned to the week of its own date; historical data is never altered.
function localMonthKey(date){
 return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
}
function monthTitle(monthKey){
 const parts=/^(\d{4})-(\d{2})$/.exec(monthKey||'');
 if(!parts)return 'Unknown month';
 const date=new Date(Number(parts[1]),Number(parts[2])-1,1,12);
 return date.toLocaleDateString(undefined,{month:'long',year:'numeric'});
}
function isoWeekInfo(dateKey){
 const parts=/^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey||'');
 if(!parts)return {key:'undated',label:'Date needs review'};
 const current=new Date(Date.UTC(Number(parts[1]),Number(parts[2])-1,Number(parts[3])));
 if(current.getUTCFullYear()!==Number(parts[1])||current.getUTCMonth()!==Number(parts[2])-1||current.getUTCDate()!==Number(parts[3]))return {key:'undated',label:'Date needs review'};
 const monday=new Date(current);
 monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
 const thursday=new Date(monday);thursday.setUTCDate(thursday.getUTCDate()+3);
 const year=thursday.getUTCFullYear();
 const first=new Date(Date.UTC(year,0,4));
 first.setUTCDate(first.getUTCDate()-(first.getUTCDay()+6)%7);
 const week=1+Math.round((monday-first)/604800000);
 const sunday=new Date(monday);sunday.setUTCDate(sunday.getUTCDate()+6);
 const fmt=date=>date.toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'});
 const key=year+'-W'+String(week).padStart(2,'0');
 return {key,label:'Week '+week+' · '+fmt(monday)+' – '+fmt(sunday)};
}
function renderHistory(){
 if(!shell)return;
 if(state.tab==='history')updateHistorySource();
 const target=$('caHistory');if(!target)return;
 state.history=readHistory();
 const filtered=state.history.filter(x=>
  (state.historyPeriod==='month'?x.dateKey?.slice(0,7)===state.historyMonth:matchesPeriod(x,state.historyPeriod))
  &&(x.name+' '+x.time+' '+x.day).toLowerCase().includes(state.query.toLowerCase()));
 filtered.sort((a,b)=>(b.dateKey||'').localeCompare(a.dateKey||''));
 const signature=state.historyPeriod+'|'+state.historyMonth+'|'+state.query+'|'+filtered.map(x=>[x.id,x.dateKey,x.duration,x.time,x.name].join(':')).join('|');
 if(target.dataset.caSignature===signature){state.lastHistory=Date.now();return}
 const openDays=new Set(Array.from(target.querySelectorAll('details.ca-day[open]')).map(el=>el.dataset.caDay));
 const openWeeks=new Set(Array.from(target.querySelectorAll('details.ca-history-week[open]')).map(el=>el.dataset.caWeek));
 const openMonths=new Set(Array.from(target.querySelectorAll('details.ca-history-month[open]')).map(el=>el.dataset.caMonth));
 // Opening the monthly or all-history view starts with its most recent month visible.
 const wasMonthView=target.dataset.caPeriod==='month'||target.dataset.caPeriod==='all';
 const queryActive=Boolean(state.query.trim());
 let page='<div class="ca-section-head"><span class="ca-section-icon">▣</span><div><h2>Activity History</h2><p>Your recorded activities and sessions</p></div></div>';
 page+='<div class="ca-toolbar"><input id="caHistorySearch" class="ca-search" type="search" placeholder="⌕  Search activities..." aria-label="Search activity history" value="'+htmlEscape(state.query)+'"></div>';
 page+='<div class="ca-filter-row">';
 for(const [key,label] of [['today','Today'],['week','This Week'],['month','Month'],['all','All']])
  page+='<button type="button" class="ca-chip" data-ca-period="'+key+'" aria-pressed="'+(state.historyPeriod===key)+'">'+label+'</button>';
 page+='</div>';
 if(state.historyPeriod==='month'){
  const parts=state.historyMonth.split('-').map(Number);
  const current=localMonthKey(new Date());
  page+='<div class="ca-month-navigation"><button type="button" data-ca-month-move="-1" aria-label="Previous month">‹</button>';
  page+='<strong>'+htmlEscape(monthTitle(state.historyMonth))+'</strong>';
  page+='<button type="button" data-ca-month-move="1" '+(state.historyMonth>=current?'disabled':'')+' aria-label="Next month">›</button></div>';
 }
 page+='<p class="ca-history-time-note">Time totals are summed activity time. Simultaneous activities can overlap, so these totals may exceed the hours on a clock.</p>';
 if(!filtered.length)page+='<div class="ca-panel ca-empty">No recorded sessions match these filters.</div>';
 // Each row is a recorded day portion. It belongs to exactly one day and week.
 const dayGroups=new Map();
 for(const rec of filtered){
  const dayKey=rec.dateKey||rec.day;
  if(!dayGroups.has(dayKey))dayGroups.set(dayKey,{key:dayKey,label:rec.day,items:[]});
  dayGroups.get(dayKey).items.push(rec);
 }
 function total(items){return items.reduce((acc,r)=>acc+(r.rawDurationMs??durationMs(r.duration)),0)}
 function dayMarkup(group){
  const items=group.items;
  const dayOpen=queryActive||openDays.has(group.key);
  let out='<details class="ca-day" data-ca-day="'+htmlEscape(group.key)+'" '+(dayOpen?'open':'')+'>';
  out+='<summary class="ca-day-summary"><span class="ca-day-main"><strong>'+htmlEscape(group.label)+'</strong><small>'+items.length+' '+(items.length===1?'activity':'activities')+' · '+' summed '+durationLabel(total(items))+'</small></span>';
  out+='<span class="ca-day-toggle"><span class="ca-day-show">Show activities</span><span class="ca-day-hide">Hide activities</span><span class="ca-day-arrow" aria-hidden="true">⌄</span></span></summary>';
  out+='<div class="ca-day-activities">';
  for(const record of items){
   out+='<button type="button" class="ca-history-item" data-ca-sheet="record" data-ca-id="'+htmlEscape(record.id)+'"><i class="ca-dot"></i><span class="ca-h-text"><strong>'+htmlEscape(record.name)+'</strong><small>'+htmlEscape(record.time)+'</small></span><span class="ca-h-duration">'+htmlEscape(record.duration)+'</span><span aria-hidden="true">⋮</span></button>';
  }
  return out+'</div></details>';
 }
 if(state.historyPeriod==='month'||state.historyPeriod==='all'){
  const months=new Map();
  for(const day of dayGroups.values()){
   const monthKey=/^\d{4}-\d{2}-\d{2}$/.test(day.key)?day.key.slice(0,7):'undated';
   const week=isoWeekInfo(day.key);
   if(!months.has(monthKey))months.set(monthKey,{key:monthKey,weeks:new Map(),items:[]});
   const month=months.get(monthKey);month.items.push(...day.items);
   if(!month.weeks.has(week.key))month.weeks.set(week.key,{...week,days:[],items:[]});
   const weekGroup=month.weeks.get(week.key);
   weekGroup.days.push(day);weekGroup.items.push(...day.items);
  }
  let monthIndex=0;
  for(const month of months.values()){
   const monthOpen=queryActive||state.historyPeriod==='month'||openMonths.has(month.key)||(!wasMonthView&&monthIndex===0);
   page+='<details class="ca-history-month" data-ca-month="'+htmlEscape(month.key)+'" '+(monthOpen?'open':'')+'>';
   page+='<summary class="ca-history-month-summary"><span class="ca-history-group-main"><strong>'+htmlEscape(monthTitle(month.key))+'</strong><small>'+month.weeks.size+' '+(month.weeks.size===1?'week':'weeks')+' · '+month.items.length+' activities · '+' summed '+durationLabel(total(month.items))+'</small></span><span class="ca-history-group-toggle"><span class="ca-history-group-show">Show weeks</span><span class="ca-history-group-hide">Hide weeks</span><span class="ca-history-group-arrow" aria-hidden="true">⌄</span></span></summary>';
   page+='<div class="ca-history-month-body">';
   for(const week of month.weeks.values()){
    const weekKey=month.key+'|'+week.key;
    page+='<details class="ca-history-week" data-ca-week="'+htmlEscape(weekKey)+'" '+(queryActive||openWeeks.has(weekKey)?'open':'')+'>';
    page+='<summary class="ca-history-week-summary"><span class="ca-history-group-main"><strong>'+htmlEscape(week.label)+'</strong><small>'+week.days.length+' '+(week.days.length===1?'day':'days')+' · '+week.items.length+' activities · '+' summed '+durationLabel(total(week.items))+'</small></span>';
    page+='<span class="ca-history-group-toggle"><span class="ca-history-group-show">Show days</span><span class="ca-history-group-hide">Hide days</span><span class="ca-history-group-arrow" aria-hidden="true">⌄</span></span></summary>';
    page+='<div class="ca-history-week-body">';
    for(const day of week.days)page+=dayMarkup(day);
    page+='</div></details>';
   }
   page+='</div></details>';
   monthIndex++;
  }
 }else{
  for(const day of dayGroups.values())page+=dayMarkup(day);
 }
 page+='<button type="button" class="ca-compact-link" data-ca-sheet="past">＋ Log a past activity</button>';
 target.innerHTML=page;target.dataset.caSignature=signature;target.dataset.caPeriod=state.historyPeriod;state.lastHistory=Date.now();
}
function readOverview(){
 return {total:$('tracked')?.textContent.trim()||'—',unique:$('uniqueTime')?.textContent.trim()||'—',
   overlap:$('overlapTime')?.textContent.trim()||'—',completed:$('completed')?.textContent.trim()||'0',
   distraction:$('distractionHint')?.textContent.trim()||'No distraction currently running'};
}
function renderReview(){
 if(!shell)return;
 const target=$('caReview');if(!target)return;
 const stats=readOverview();
 const today=window.lifeosTodayAPlusSnapshot?.().metrics;
 const records=readHistory().filter(x=>matchesPeriod(x,state.reviewPeriod));
 const signature=state.reviewPeriod+'|'+records.map(x=>[x.id,x.dateKey,x.duration,x.name].join(':')).join('|')+'|'+stats.unique+'|'+stats.overlap+'|'+stats.distraction+'|'+Math.round((today?.total||0)/60000);
 if(target.dataset.caSignature===signature)return;
 const groups=new Map(),dates=new Map(),ids=new Set();
 let recordedMs=0;
 for(const x of records){
  const ms=(x.rawDurationMs??durationMs(x.duration));
  recordedMs+=ms;
  groups.set(x.name,(groups.get(x.name)||0)+ms);
  const date=x.dateKey||(dayDate(x)?localKey(dayDate(x)):'');
  if(date)dates.set(date,(dates.get(date)||0)+ms);
  if(x.id)ids.add(x.id);
 }
 const sessionCount=ids.size||records.length;
 const sorted=[...groups].sort((a,b)=>b[1]-a[1]);
 const top=sorted.slice(0,3);
 if(sorted.length>3)top.push(['Other activities',sorted.slice(3).reduce((n,x)=>n+x[1],0)]);
 const sum=top.reduce((n,x)=>n+x[1],0),colors=['#78efb9','#76bbff','#b790ff','#b8c8d8'];
 let angle=0;const parts=[];
 for(let i=0;i<top.length;i++){
  const next=angle+100*top[i][1]/(sum||1);
  parts.push(colors[i]+' '+angle.toFixed(2)+'% '+next.toFixed(2)+'%');
  angle=next;
 }
 const scope={today:'Today',week:'Last 7 days',month:'Last 30 days',all:'All saved history'}[state.reviewPeriod]||'Recorded time';
 let page='<div class="ca-section-head"><span class="ca-section-icon">▥</span><div><h2>Review & Insights</h2><p>Understand your time, focus and distractions</p></div></div>';
 page+='<div class="ca-filter-row">';
 for(const [key,label] of [['today','Today'],['week','This Week'],['month','This Month'],['all','All']])
  page+='<button type="button" class="ca-chip" data-ca-review-period="'+key+'" aria-pressed="'+(state.reviewPeriod===key)+'">'+label+'</button>';
 page+='</div><p class="ca-review-scope">'+scope+' · confirmed finished activity portions</p>';
 const average=sessionCount?durationLabel(recordedMs/sessionCount):'—';
 const mainMetrics=[
  ['◎',sessionCount?durationLabel(recordedMs):'0m','Finished activity time'],
  ['▱',String(sessionCount),'Finished sessions'],
  ['◷',average,'Average per session'],
  ['◇',sorted.length?sorted[0][0]:'—','Most tracked activity']
 ];
 page+='<div class="ca-metrics">';
 for(const [icon,value,title] of mainMetrics)
  page+='<div class="ca-metric"><div class="ca-micon">'+icon+'</div><b>'+htmlEscape(value)+'</b><span>'+title+'</span></div>';
 page+='</div>';
 if(state.reviewPeriod==='today')
  page+='<div class="ca-inline-note">Today, including ongoing activity: total recorded <b>'+htmlEscape(durationLabel(today?.total||0))+'</b>; unique tracked <b>'+htmlEscape(durationLabel(today?.unique||0))+'</b>; additional overlap <b>'+htmlEscape(durationLabel(today?.overlap||0))+'</b>. The finished activity total above excludes ongoing sessions.</div>';
 page+='<div class="ca-panel"><h3 class="ca-card-heading">Time by Activity</h3>';
 if(!top.length)page+='<div class="ca-empty">No finished activities in this period. Your historical data remains available under All.</div>';
 else {
  page+='<div class="ca-donut-area"><div class="ca-donut" style="background:conic-gradient('+parts.join(',')+')"><div class="ca-donut-inner"><strong>'+durationLabel(sum)+'</strong><small>Finished</small></div></div><div class="ca-legend">';
  top.forEach((item,i)=>{
   page+='<div class="ca-legend-row"><span class="ca-legend-label"><i class="ca-dot" style="background:'+colors[i]+'"></i><span>'+htmlEscape(item[0])+'</span></span><b>'+Math.round(item[1]*100/(sum||1))+'%</b></div>';
  });
  page+='</div></div>';
 }
 page+='</div><div class="ca-panel"><h3 class="ca-card-heading">Recorded time by day</h3>';
 const count=state.reviewPeriod==='today'?1:state.reviewPeriod==='month'?14:state.reviewPeriod==='all'?14:7;
 let days=[];
 for(let i=count-1;i>=0;i--){
  const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);
  const key=localKey(d);
  days.push({key,label:d.toLocaleDateString(undefined,{weekday:'short'}),ms:dates.get(key)||0});
 }
 const max=Math.max(1,...days.map(x=>x.ms));
 if(days.some(x=>x.ms>0)){
  page+='<div class="ca-bars" aria-label="Time by day">';
  for(const item of days)page+='<div class="ca-bar" style="height:'+Math.max(3,Math.round(item.ms/max*100))+'%" title="'+htmlEscape(item.key)+' · '+durationLabel(item.ms)+'"><span>'+htmlEscape(item.label)+'</span></div>';
  page+='</div><div class="ca-chart-caption">Total recorded time from saved finished activities · simultaneous activities may overlap.</div>';
 }else page+='<div class="ca-empty">No completed activity time found for the displayed days.</div>';
 page+='</div>';
 page+='<div class="ca-panel ca-distraction-band"><div><b>△ &nbsp; Distraction review</b><p>'+htmlEscape(stats.distraction)+'</p></div><button type="button" class="ca-soft-button" data-ca-sheet="distraction">Review ›</button></div>';
 if(sorted.length){
  page+='<div class="ca-panel ca-insights-panel"><h3 class="ca-card-heading">Your activity insights</h3><div class="ca-insight-row"><span class="ca-insight-icon">✓</span><span><strong>'+htmlEscape(sorted[0][0])+'</strong> is your most tracked finished activity in this period.</span></div>';
  page+='<div class="ca-insight-row"><span class="ca-insight-icon">✓</span><span>'+sessionCount+' finished session'+(sessionCount===1?'':'s')+' · '+durationLabel(recordedMs)+' recorded.</span></div></div>';
 }
 target.innerHTML=page;target.dataset.caSignature=signature;
}
function localKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function readRealFocusState(){
 try{
  const raw=window.localStorage.getItem('lifeos.personal.focus.v207');
  const value=raw?JSON.parse(raw):null;
  return value&&value.kind==='focus'&&['running','paused','break','ringing'].includes(value.mode)?value:null;
 }catch{return null}
}
function focusRemainingMs(value){
 return Math.max(0,value?.mode==='running'?Number(value.end)-Date.now():Number(value?.remainingMs)||0);
}
function focusClock(ms){
 const sec=Math.floor(Math.max(0,ms)/1000);
 return String(Math.floor(sec/3600)).padStart(2,'0')+':'+String(Math.floor(sec/60)%60).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
}
function focusDeviceControls(){
 const status=typeof window.Notification==='function'&&window.Notification.permission==='granted'?'Permission granted':'Manage notification permission';
 const native=Boolean(window.LifeOSNative&&typeof window.LifeOSNative.postMessage==='function');
 return '<section class="ca-focus-device-panel" aria-label="Focus notifications and Do Not Disturb">'
  +'<div class="ca-focus-device-row"><span class="ca-focus-device-icon" aria-hidden="true">♧</span>'
  +'<div class="ca-focus-device-copy"><strong>Notifications</strong><small>'+status+' · Android may restrict background delivery</small></div>'
  +'<div class="ca-focus-device-buttons"><button type="button" data-ca-focus-notifications>Allow</button><button type="button" data-ca-focus-notification-settings>'+ (native?'Settings':'Help')+'</button></div></div>'
  +'<details class="ca-focus-dnd"><summary><span class="ca-focus-device-icon" aria-hidden="true">☾</span><span class="ca-focus-device-copy"><strong>Do Not Disturb</strong><small>Controlled by Android, not by LifeOS</small></span><span class="ca-focus-device-link">How to enable ⌄</span></summary>'
  +'<p>On Android, swipe down twice from the top to open Quick Settings. Tap <strong>Do Not Disturb</strong> to turn it on or off. Touch and hold the tile to choose which calls and notifications may interrupt you. LifeOS does not change this setting automatically.</p></details>'
  +'</section>';
}
function showRealFocus(){
 const session=readRealFocusState();
 if(!session)return;
 const remaining=focusRemainingMs(session),label=session.label||'Focus';
 const content='<div class="ca-focus-hero"><div class="ca-focus-icon">◎</div><h3>'+htmlEscape(label)+'</h3><p>Stay with one meaningful activity.</p></div>'
  +'<div class="ca-focus-ring ca-focus-real-ring" id="caFocusLiveRing"><div><strong id="caFocusLiveClock">'+focusClock(remaining)+'</strong><small id="caFocusLiveMode">Focus running · saved session</small></div></div>'
  +'<div class="ca-distraction-stats"><div><b id="caFocusProgress">'+(session.plannedMs?Math.round((1-remaining/session.plannedMs)*100):0)+'%</b><span>Focus progress</span></div>'
  +'<div><b id="caFocusLiveStatus">'+htmlEscape(session.mode)+'</b><span>Current status</span></div></div>'
  +'<div class="ca-preview-actions ca-focus-live-actions"><button type="button" class="ca-sheet-secondary" data-ca-focus-control="pause" id="caFocusPause">Ⅱ Pause</button>'
  +'<button type="button" class="ca-sheet-secondary" data-ca-focus-control="break" id="caFocusBreak">☕ Break</button></div>'
  +focusDeviceControls()
  +'<button type="button" class="ca-sheet-primary" data-ca-close>Minimize focus</button>'
  +'<button type="button" class="ca-sheet-secondary ca-focus-end" data-ca-focus-control="end">■ End focus session</button>'
  +'<p class="ca-feature-footnote">This is your real LifeOS Focus session. Your tracked activity timers run independently. Alerts depend on Android permissions.</p>';
 openDialog('Focus session','Real Focus Mode · LifeOS',content);
 dialog.dataset.caFocusLive='1';
 delete dialog.dataset.caFocusStarting;
 updateRealFocusScreen();
}
function updateRealFocusScreen(){
 if(!dialog||dialog.hidden||dialog.dataset.caFocusLive!=='1')return;
 const session=readRealFocusState();
 if(!session){closeDialog();return}
 const remaining=focusRemainingMs(session);
 const clock=$('caFocusLiveClock');if(clock)clock.textContent=focusClock(remaining);
 const modes={running:'Focus running',paused:'Focus paused',break:'Break in progress',ringing:'Focus complete'};
 const status=$('caFocusLiveStatus');if(status)status.textContent=modes[session.mode]||session.mode;
 const note=$('caFocusLiveMode');if(note)note.textContent=(modes[session.mode]||session.mode)+' · saved session';
 const progress=session.plannedMs?Math.max(0,Math.min(100,Math.round((1-remaining/session.plannedMs)*100))):0;
 const percent=$('caFocusProgress');if(percent)percent.textContent=progress+'%';
 const pause=$('caFocusPause');if(pause)pause.textContent=session.mode==='running'?'Ⅱ Pause':'▷ Resume';
 const br=$('caFocusBreak');if(br)br.textContent=session.mode==='break'?'▷ Resume focus':'☕ Break';
 const ring=$('caFocusLiveRing');if(ring)ring.style.setProperty('--ca-focus-percent',progress+'%');
}
function refresh(){
 renderLive();
 if(state.tab==='history'&&Date.now()-state.lastHistory>8000)renderHistory();
 if(state.tab==='review')renderReview();
 updateRealFocusScreen();
}
function openDialog(title,subtitle,content){
 delete dialog.dataset.caFocusLive;
 delete dialog.dataset.caFocusStarting;
 previousFocus=document.activeElement;
 $('caDialogTitle').textContent=title;
 $('caDialogSubtitle').textContent=subtitle||'';
 dialogBody.innerHTML=content;
 dialog.hidden=false;document.body.classList.add('lo-ca-modal-open');
 dialog.querySelector('.ca-x').focus();
}
function closeDialog(){
 selectedGap=null;
 if(!dialog)return;dialog.hidden=true;document.body.classList.remove('lo-ca-modal-open');
 delete dialog.dataset.caFocusLive;
 delete dialog.dataset.caFocusStarting;
 dialogBody.innerHTML='';
 if(previousFocus&&previousFocus.isConnected&&previousFocus.focus)previousFocus.focus();
}
window.lifeosTrackOpenGap=function(gap){
 if(!dialog)build();
 if(!dialog||!window.lifeosTodayAPlusGapValid?.(gap,gap.a,gap.b))return false;
 sheet('past');selectedGap={a:gap.a,b:gap.b};
 const d=window.lifeosTodayAPlusSnapshot();
 const before=d.recorded.filter(x=>x.b<=gap.a).sort((x,y)=>y.b-x.b)[0];
 const after=d.recorded.filter(x=>x.a>=gap.b).sort((x,y)=>x.a-y.a)[0];
 const context=e('p','ca-editor-footnote');context.id='caGapContext';
 const time=v=>new Date(v).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
 context.textContent='Unlogged '+time(gap.a)+'–'+time(gap.b)+' · Before: '+(before?.name||'Start of day')+' · After: '+(after?.name||'Now');
 dialogBody.prepend(context);$('caPastStart').value=localInput(gap.a);$('caPastEnd').value=localInput(gap.b);
 $('caDialogSubtitle').textContent='Record all or part of this unlogged interval.';
 return true;
};
// Today details use the same accessible Track sheet and existing history/review actions.
window.lifeosTrackOpenTodayItem=function(kind,key,at){
 if(!dialog)build();
 if(!dialog||typeof window.lifeosTodayAPlusSnapshot!=='function')return false;
 const d=window.lifeosTodayAPlusSnapshot();
 const time=v=>new Date(v).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});
 const line=(label,value)=>'<div class="ca-record-detail"><span>'+htmlEscape(label)+'</span><strong>'+htmlEscape(value)+'</strong></div>';
 let content='';
 if(kind==='gap'){
  const [a,b]=String(key).split(':').map(Number);
  if(!window.lifeosTodayAPlusGapValid?.({a,b},a,b))return false;
  const before=d.recorded.filter(x=>x.b<=a).sort((x,y)=>y.b-x.b)[0];
  const after=d.recorded.filter(x=>x.a>=b).sort((x,y)=>x.a-y.a)[0];
  content=line('Activity','Unlogged interval')+line('Category','Unknown')+line('Start',time(a))+line('End',time(b))+line('Duration',exactDuration(b-a))+line('Status','Unlogged / unknown')+line('Before',before?.name||'Start of day')+line('After',after?.name||'Now')+line('Concurrent','None recorded');
  content+='<button type="button" class="ca-sheet-primary" data-ca-gap="'+a+':'+b+'">Log activity</button><button type="button" class="ca-sheet-secondary" data-ca-close>Leave unknown</button>';
  openDialog('Unlogged interval','Review this time without assigning a category.',content);return true;
 }
 const planned=kind==='plan';
 const x=planned?d.plans.find(z=>String(z.id)===String(key)):d.recorded.find(z=>String(z.id)===String(key)&&z.a===Number(at));
 if(!x)return false;
 const a=planned?x.startAt:x.a,b=planned?x.endAt:x.b;
 const status=planned?(x.status||'planned'):(x.status||'finished');
 content=line('Activity',x.name)+line('Category',planned?'Not classified':x.category)+line('Start',time(a))+line('End',time(b))+line('Duration',exactDuration(b-a))+line('Status',status);
 const others=(planned?d.plans:d.recorded).filter(z=>String(z.id)!==String(x.id)).map(z=>({z,ms:Math.max(0,Math.min(b,planned?z.endAt:z.b)-Math.max(a,planned?z.startAt:z.a))})).filter(z=>z.ms>=60000);
 content+='<h3 class="ca-detail-heading">Concurrent '+(planned?'commitments':'activities')+'</h3>'+(others.length?others.map(({z,ms})=>'<button type="button" class="ca-sheet-secondary" data-ca-today-kind="'+(planned?'plan':'record')+'" data-ca-today-id="'+htmlEscape(z.id)+'" data-ca-today-at="'+(planned?z.startAt:z.a)+'">'+htmlEscape(z.name)+' · '+htmlEscape(exactDuration(ms))+'</button>').join(''):'<p class="ca-editor-footnote">No concurrent '+(planned?'commitments':'activities')+' of one minute or longer.</p>');
 if(planned){
  content+='<button type="button" class="ca-sheet-primary" data-ca-today-nav="schedule">Open planning</button>';
 }else{
  const original=window.lifeosReadOnlyWorkspace?.().sessions.find(z=>String(z.id)===String(x.id));
  const locked=original&&(original.seedBatch||['development-starter','assumed-demo'].includes(original.source));
  const categories=['Other / review','Prayer','University','Fitness','Nutrition','Sleep','Quran & Arabic','Work & business','Distraction'];
  content+='<label class="ca-form-label" for="caTodayCategory">Review category</label><select id="caTodayCategory" class="ca-input" '+(locked?'disabled':'')+'>'+categories.map(c=>'<option '+(c===x.category?'selected':'')+'>'+htmlEscape(c)+'</option>').join('')+'</select>';
  content+=locked?'<p class="ca-editor-footnote">Example records cannot be edited here.</p>':'<button type="button" class="ca-sheet-secondary" data-ca-category-save="'+htmlEscape(x.id)+'">Save category</button><p id="caCategoryMessage" class="ca-editor-footnote" role="status"></p>';
  content+='<button type="button" class="ca-sheet-primary" data-ca-today-record="'+htmlEscape(x.id)+'" data-ca-today-status="'+htmlEscape(status)+'">'+(status==='finished'?'Open in History / edit':'Open in Track')+'</button>';
 }
 content+='<button type="button" class="ca-sheet-secondary" data-ca-close>Close</button>';
 openDialog(planned?'Planned commitment':'Activity details',planned?'Planning details':'Recorded interval details',content);return true;
};
function sheet(type,id){
 if(type==='past'){
  selectedGap=null;
  openDialog('Log a past activity','Record an activity that already happened.',
   '<label class="ca-form-label" for="caPastName">Activity name</label><input id="caPastName" maxlength="80" class="ca-input" placeholder="e.g. Studying, travelling, prayer" required>'
   +'<label class="ca-form-label" for="caPastStart">Started</label><input id="caPastStart" type="datetime-local" step="0.001" class="ca-input" required>'
   +'<label class="ca-form-label" for="caPastEnd">Finished</label><input id="caPastEnd" type="datetime-local" step="0.001" class="ca-input" required>'
   +'<label class="ca-form-label" for="caPastNotes">Notes (optional)</label><textarea id="caPastNotes" rows="3" class="ca-input ca-edit-textarea" placeholder="Any relevant details"></textarea>'
   +'<p class="ca-editor-footnote">Only past times can be saved. Activities may overlap; overlapping time is not unique time.</p>'
   +'<p id="caPastError" class="ca-inline-error" role="alert" aria-live="polite"></p>'
   +'<button type="button" class="ca-sheet-primary" data-ca-save-past>Save past activity</button>');
  return;
 }
 
 const live=activeSessions();
 const current=live.find(x=>x.id===id)||live[0];
 if(type==='start'){
  let choices=Array.from(document.querySelectorAll('#quick button')).filter(x=>!/(show all|hide|more)/i.test(x.textContent||'')).slice(0,10);
  let content='<div class="ca-toolbar"><input id="caStartSearch" class="ca-input" placeholder="Search or choose an activity..." aria-label="Search activities"></div><div class="ca-sheet-grid" id="caQuickChoices">';
  for(let i=0;i<choices.length;i++)content+='<button type="button" class="ca-choice" data-ca-quick="'+i+'">▷ &nbsp;'+htmlEscape(choices[i].textContent.trim())+'</button>';
  content+='</div><label class="ca-form-label" for="caCustomName">Custom activity</label><input class="ca-input" id="caCustomName" placeholder="e.g. Studying, LifeOS planning"><button class="ca-sheet-primary" data-ca-custom-start>＋ Start activity</button>';
  openDialog('Start Activity','Choose a recent activity or create a new one.',content);
  dialog.dataset.choices=choices.length;dialog._choices=choices;
  return;
 }
 if(type==='activity'&&current){
  let content='<div class="ca-detail-hero"><span class="ca-detail-kicker">◎ &nbsp; ACTIVE ACTIVITY</span>'
   +'<div class="ca-detail-title">'+htmlEscape(current.name)+'</div>'
   +'<div class="ca-detail-big-clock">'+htmlEscape(current.clock)+'</div>'
   +'<div class="ca-detail-status"><i></i>'+htmlEscape(current.status==='running'?'Currently running':'Currently paused')+'</div></div>';
  content+='<div class="ca-detail-metrics"><div><span>Current status</span><strong>'+htmlEscape(current.status)+'</strong></div>'
   +'<div><span>Recorded time</span><strong>'+htmlEscape(current.clock)+'</strong></div></div>';
  content+='<div class="ca-detail-information"><div class="ca-detail-line"><span>Session information</span><strong>'+htmlEscape(current.meta)+'</strong></div></div>';
  content+='<h3 class="ca-detail-heading">Activity controls</h3><div class="ca-detail-actions">'
   +'<button class="ca-detail-action ca-detail-action-mint" data-ca-act="'+(current.status==='running'?'pause':'resume')+'" data-ca-id="'+htmlEscape(current.id)+'"><b>'+(current.status==='running'?'Ⅱ':'▷')+'</b><span>'+(current.status==='running'?'Pause':'Resume')+'</span></button>'
   +'<button class="ca-detail-action" data-ca-act="break" data-ca-id="'+htmlEscape(current.id)+'"><b>☕</b><span>Break</span></button>'
   +'<button class="ca-detail-action" data-ca-act="switch" data-ca-id="'+htmlEscape(current.id)+'"><b>⇄</b><span>Switch</span></button>'
   +'<button class="ca-detail-action" data-ca-act="edit" data-ca-id="'+htmlEscape(current.id)+'"><b>✎</b><span>Edit</span></button></div>';
  content+='<button class="ca-detail-finish" data-ca-act="finish" data-ca-id="'+htmlEscape(current.id)+'">■ &nbsp; Finish activity</button>';
  openDialog('Activity in progress','Timer details and advanced controls',content);return;
 }
 if(type==='record'){
  const rec=readHistory().find(x=>x.id===id);if(!rec)return;
  const label=(rec.time||'').includes('Development example')?'Development example':(rec.time||'').includes('Estimated')?'Estimated':'Recorded';
  let content='<div class="ca-record-hero"><div class="ca-record-icon">▣</div><div><h3>'+htmlEscape(rec.name)+'</h3><p>'+htmlEscape(rec.day)+' · '+htmlEscape(label)+'</p></div></div>';
  content+='<div class="ca-record-stats"><div><small>Duration</small><strong>'+htmlEscape(rec.duration)+'</strong></div>'
   +'<div><small>Record type</small><strong>'+htmlEscape(label)+'</strong></div></div>';
  content+='<div class="ca-record-detail"><span>Activity</span><strong>'+htmlEscape(rec.name)+'</strong></div>'
   +'<div class="ca-record-detail"><span>Date</span><strong>'+htmlEscape(rec.day)+'</strong></div>'
   +'<div class="ca-record-detail"><span>Time and source</span><strong>'+htmlEscape(rec.time)+'</strong></div>';
  content+='<div class="ca-record-foot"><button type="button" class="ca-sheet-primary" data-ca-edit-record="'+htmlEscape(rec.id)+'">✎ &nbsp; Edit activity</button>'
   +'<button type="button" class="ca-sheet-secondary ca-record-delete" data-ca-delete-record="'+htmlEscape(rec.id)+'">Delete activity</button>'
   +'<button type="button" class="ca-sheet-secondary" data-ca-close>Close details</button></div>';
  openDialog('Activity Details','Your saved activity record',content);return;
 }
 if(type==='editRecord'){
  // The original Edit dialog is the existing source of truth for stored records.
  // Capture those populated values, keeping the new visual editor separate.
  const form='<label for="caEditName" class="ca-form-label">Activity name</label>'
   +'<input id="caEditName" class="ca-input" maxlength="80" value="'+htmlEscape($('editName')?.value||'')+'">'
   +'<label for="caEditStart" class="ca-form-label">Start time</label>'
   +'<input id="caEditStart" type="datetime-local" class="ca-input" value="'+htmlEscape($('editStart')?.value||'')+'">'
   +'<label for="caEditEnd" class="ca-form-label">End time</label>'
   +'<input id="caEditEnd" type="datetime-local" class="ca-input" value="'+htmlEscape($('editEnd')?.value||'')+'" '+($('editEnd')?.disabled?'disabled':'')+'>'
   +'<label for="caEditNote" class="ca-form-label">Notes</label>'
   +'<textarea id="caEditNote" class="ca-input ca-edit-textarea" rows="4" placeholder="What did you work on?">'+htmlEscape($('editNote')?.value||'')+'</textarea>'
   +'<div class="ca-editor-footnote">Your saved activity times and any pause/resume segments are preserved unless you explicitly save changes.</div>'
   +'<p class="ca-inline-error" id="caEditError" role="alert"></p>'
   +'<div class="ca-record-foot"><button class="ca-sheet-primary" type="button" data-ca-save-edit>Save changes</button>'
   +'<button class="ca-sheet-secondary" type="button" data-ca-close>Cancel</button></div>';
  dialog.dataset.caEditRecord=id;
  openDialog('Edit Activity','Update an existing activity',form);return;
 }
 if(type==='break'){
  const activity=live.find(x=>x.id===id)||current;
  const content='<div class="ca-focus-hero"><div class="ca-focus-icon">☕</div><h3>Time to recharge</h3><p>Pause briefly, then return to what matters.</p></div>'
   +'<div class="ca-focus-ring"><div><strong>10:00</strong><small>Suggested break · design preview</small></div></div>'
   +'<div class="ca-sheet-metric"><span>Activity</span><strong>'+htmlEscape(activity?.name||'No active activity')+'</strong></div>'
   +'<div class="ca-break-tips"><strong>Break suggestions</strong><span>Get some fresh air</span><span>Stretch and move your body</span><span>Hydrate and rest your eyes</span></div>'
   +(activity?'<button class="ca-sheet-primary" data-ca-act="break" data-ca-id="'+htmlEscape(activity.id)+'">☕ Start break</button>':'');
  openDialog('Break Mode','Take a short break and recharge.',content);return;
 }
 if(type==='focus'){
  const running=readRealFocusState();
  if(running&&running.kind==='focus'&&running.mode!=='ringing'){
   showRealFocus();
   return;
  }
  const choices=live.length?live:[{id:'',name:'Studying'}];
  let content='<div class="ca-focus-hero"><div class="ca-focus-icon">◎</div><h3>Focus on what matters</h3><p>A calmer screen for deliberate work, study, and reading.</p></div>';
  content+='<div class="ca-focus-feature"><div class="ca-focus-feature-copy"><b>◷ &nbsp; Focus session</b><small>Uses your saved LifeOS focus timer</small></div><span class="ca-feature-tag">Ready</span></div>';
  content+='<label class="ca-form-label" for="caFocusActivity">Focus activity</label><select class="ca-input" id="caFocusActivity">';
  for(const row of choices)content+='<option value="'+htmlEscape(row.id)+'">'+htmlEscape(row.name)+'</option>';
  content+='</select><label class="ca-form-label" for="caFocusDuration">Focus duration</label>';
  content+='<select id="caFocusDuration" class="ca-input"><option value="25">25 minutes</option><option value="45" selected>45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select>';
  content+='<div class="ca-focus-settings"><div class="ca-focus-setting"><span>♫</span><div><b>Sound and vibration</b><small>Uses existing LifeOS alert settings and Android permissions</small></div></div></div>';
  content+=focusDeviceControls();
  content+='<p id="caFocusError" role="alert" class="ca-inline-error"></p><button class="ca-sheet-primary" data-ca-focus-start>▷ &nbsp; Start Focus</button>';
  content+='<p class="ca-feature-footnote">Runs the real LifeOS focus timer. Your activity timers continue separately. Sound, vibration and background notifications depend on device support.</p>';
  openDialog('Focus Mode','Minimize distractions and stay on track.',content);return;
 }
 if(type==='timer'){
  const choices=live.length?live:[{id:'',name:'No active timer'}];
  let content='<div class="ca-focus-hero"><div class="ca-focus-icon">◷</div><h3>Keep your time intentional</h3><p>Set a reminder when an activity reaches its expected duration.</p></div>';
  content+='<label class="ca-form-label" for="caLimitActivity">Running activity</label><select class="ca-input" id="caLimitActivity">';
  for(const row of choices)content+='<option value="'+htmlEscape(row.id)+'">'+htmlEscape(row.name)+'</option>';
  content+='</select><label class="ca-form-label" for="caExpectedMinutes">Expected duration</label>';
  content+='<input type="number" id="caExpectedMinutes" class="ca-input" min="1" max="1440" value="60" inputmode="numeric">';
  content+='<div class="ca-preset-grid">';
  for(const val of [15,30,45,60])content+='<button type="button" class="ca-preset" data-ca-limit="'+val+'" aria-pressed="'+(val===60)+'">'+val+' min</button>';
  content+='</div><label class="ca-form-label" for="caLimitAction">When the limit is reached</label>';
  content+='<select class="ca-input" id="caLimitAction"><option>Remind me: Finish or Extend</option><option>Ask me to review the timer</option></select>';
  content+='<button class="ca-sheet-primary" data-ca-timer-preview>◷ &nbsp; Preview duration reminder</button>';
  content+='<p class="ca-feature-footnote">Visual preview; no duration setting is saved yet.</p>';
  content+='<details class="ca-more-settings"><summary>More timer preferences</summary>';
  content+='<div class="ca-sheet-metric"><span>Duration profiles</span><strong>Saved in original LifeOS</strong></div>';
  content+='<div class="ca-sheet-metric"><span>Forgotten timer reviews</span><strong>Existing data retained</strong></div>';
  content+='<div class="ca-sheet-metric"><span>Pause and resume timeline</span><strong>Available in session details</strong></div></details>';
  openDialog('Timer preferences','Duration limits, reminders and recovery.',content);return;
 }
 if(type==='distraction'){
  const status=readOverview().distraction;
  const records=readHistory().filter(x=>/distraction/i.test(x.name)&&matchesPeriod(x,state.reviewPeriod));
  const unique=new Set(records.filter(x=>x.id).map(x=>x.id));
  const sessions=unique.size||records.length,total=records.reduce((n,x)=>n+(x.rawDurationMs??durationMs(x.duration)),0);
  let content='<div class="ca-focus-hero"><div class="ca-focus-icon">△</div><h3>Understand your distractions</h3><p>Review confirmed interruptions without treating unlogged time as distraction.</p></div>';
  content+='<div class="ca-distraction-stats"><div><b>'+sessions+'</b><span>Recorded sessions</span></div><div><b>'+durationLabel(total)+'</b><span>Recorded time</span></div></div>';
  content+='<div class="ca-focus-feature"><div class="ca-focus-feature-copy"><b>Current tracker</b><small>'+htmlEscape(status)+'</small></div><span class="ca-feature-tag">'+(status.toLowerCase().includes('no distraction')?'Inactive':'Active')+'</span></div>';
  if(records.length){
   content+='<h3 class="ca-distraction-title">Recent interruptions</h3><div class="ca-distraction-list">';
   for(const x of records.slice(0,6)){
    content+='<div class="ca-distraction-row"><span><b>'+htmlEscape(x.name)+'</b><small>'+htmlEscape(x.day)+'</small></span><strong>'+htmlEscape(x.duration)+'</strong></div>';
   }
   content+='</div>';
  }else{
   content+='<div class="ca-empty">No finished distraction sessions found in the selected Review period.</div>';
  }
  content+='<button class="ca-sheet-primary" data-ca-distraction>'+($('distractionToggle')?.textContent?.includes('Finish')?'■ Finish distraction':'▷ Start distraction')+'</button>';
  content+='<p class="ca-feature-footnote">Details are based on saved activity records. Unlogged time is not classified automatically.</p>';
  openDialog('Distraction Review','Recorded interruptions and their duration.',content);return;
 }

}
function handleClick(event){
 const tab=event.target.closest('[data-ca-tab]');if(tab){chooseTab(tab.dataset.caTab);return}
 const period=event.target.closest('[data-ca-period]');if(period){
  state.historyPeriod=period.dataset.caPeriod;renderHistory();return
 }
 const monthMove=event.target.closest('[data-ca-month-move]');
 if(monthMove&&!monthMove.disabled){
  const parts=state.historyMonth.split('-').map(Number);
  const date=new Date(parts[0],parts[1]-1+Number(monthMove.dataset.caMonthMove),1,12);
  const next=localMonthKey(date);
  if(next<=localMonthKey(new Date())){state.historyMonth=next;renderHistory()}
  return
 }
 const review=event.target.closest('[data-ca-review-period]');if(review){state.reviewPeriod=review.dataset.caReviewPeriod;renderReview();return}
 const act=event.target.closest('[data-ca-act]');if(act){
  if(act.dataset.caAct==='break'){sheet('break',act.dataset.caId);return}
  originalAction(act.dataset.caId,act.dataset.caAct);setTimeout(refresh,60);return;
 }
 const open=event.target.closest('[data-ca-sheet]');if(open)sheet(open.dataset.caSheet,open.dataset.caId);
}
function handleDialogClick(event){
 const todayItem=event.target.closest('[data-ca-today-kind]');
 if(todayItem){window.lifeosTrackOpenTodayItem(todayItem.dataset.caTodayKind,todayItem.dataset.caTodayId,Number(todayItem.dataset.caTodayAt));return}
 const category=event.target.closest('[data-ca-category-save]');
 if(category){
  const detail={id:category.dataset.caCategorySave,fields:{category:$('caTodayCategory')?.value}};
  window.dispatchEvent(new CustomEvent('lifeos-v252-save-review',{detail}));
  $('caCategoryMessage').textContent=detail.result?.message||'Category could not be saved.';
  return;
 }
 const todayNav=event.target.closest('[data-ca-today-nav]');
 if(todayNav){const view=todayNav.dataset.caTodayNav;closeDialog();document.querySelector('#lifeosNavigation [data-view="'+view+'"]')?.click();return}
 const todayRecord=event.target.closest('[data-ca-today-record]');
 if(todayRecord){
  const id=todayRecord.dataset.caTodayRecord,status=todayRecord.dataset.caTodayStatus;
  closeDialog();document.querySelector('#lifeosNavigation [data-view="tracking"]')?.click();
  if(status==='finished'){updateHistorySource();chooseTab('history');renderHistory();sheet('record',id)}
  else{chooseTab('live');sheet('activity',id)}
  return;
 }
 const gapButton=event.target.closest('[data-ca-gap]');
 if(gapButton){const [a,b]=gapButton.dataset.caGap.split(':').map(Number);if(!window.lifeosTrackOpenGap({a,b}))dialogBody.insertAdjacentHTML('beforeend','<p class="ca-inline-error">This interval changed. Select a remaining gap again.</p>');return}
 if(event.target.closest('[data-ca-close]')){closeDialog();return}
 const sheetBack=event.target.closest('[data-ca-sheet]');
 if(sheetBack){sheet(sheetBack.dataset.caSheet,sheetBack.dataset.caId);return}
 const quick=event.target.closest('[data-ca-quick]');
 if(quick){const original=dialog._choices?.[Number(quick.dataset.caQuick)];if(original){original.click();closeDialog();setTimeout(refresh,100)}return}
 if(event.target.closest('[data-ca-custom-start]')){
  const text=$('caCustomName')?.value.trim();
  if(!text)return;
  const input=$('customName'),button=$('startCustom');
  if(input&&button){input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));button.click();closeDialog();setTimeout(refresh,100)}
  return;
 }
 const act=event.target.closest('[data-ca-act]');
 if(act){const ok=originalAction(act.dataset.caId,act.dataset.caAct);if(ok){closeDialog();setTimeout(refresh,100)}return}
 const edit=event.target.closest('[data-ca-history-act]');
 if(edit){const ok=originalHistory(edit.dataset.caId,edit.dataset.caHistoryAct);if(ok)closeDialog();return}
 const deleteRecord=event.target.closest('[data-ca-delete-record]');
 if(deleteRecord){
  const rec=readHistory().find(x=>x.id===deleteRecord.dataset.caDeleteRecord);
  if(!rec)return;
  const prompt='<div class="ca-record-hero"><div class="ca-record-icon">!</div><div><h3>Delete this activity?</h3><p>'+htmlEscape(rec.name)+' · '+htmlEscape(rec.day)+'</p></div></div>'
   +'<div class="ca-editor-footnote">Deleting this saved record affects its history and analytics. You will be asked to confirm before any deletion.</div>'
   +'<button class="ca-sheet-secondary ca-record-delete" data-ca-confirm-delete="'+htmlEscape(rec.id)+'">Continue to deletion confirmation</button>'
   +'<button class="ca-sheet-primary" data-ca-sheet="record" data-ca-id="'+htmlEscape(rec.id)+'">Keep activity</button>';
  openDialog('Delete Activity','Review before making permanent changes',prompt);return;
 }
 const confirmedDelete=event.target.closest('[data-ca-confirm-delete]');
 if(confirmedDelete){
  const id=confirmedDelete.dataset.caConfirmDelete;
  if(originalHistory(id,'edit')){
   const native=$('editModal');if(native)native.hidden=true;
   closeDialog();
   // Original LifeOS deletion continues to require its existing explicit consent.
   $('deleteEdit')?.click();
  }
  return;
 }
 const editRecord=event.target.closest('[data-ca-edit-record]');
 if(editRecord){
  const id=editRecord.dataset.caEditRecord;
  if(originalHistory(id,'edit')){
   const originalModal=$('editModal');
   if(originalModal)originalModal.hidden=true;
   sheet('editRecord',id);
  }
  return;
 }
 if(event.target.closest('[data-ca-save-edit]')){
  const name=$('caEditName')?.value.trim()||'';
  const start=$('caEditStart')?.value||'';
  const end=$('caEditEnd')?.value||'';
  const endLocked=$('caEditEnd')?.disabled;
  const alert=$('caEditError');
  if(!name||name.length>80||!start||(!endLocked&&(!end||new Date(end)<=new Date(start)))){
   if(alert)alert.textContent='Enter a name and valid start/end times.';return;
  }
  for(const [source,target] of [['caEditName','editName'],['caEditStart','editStart'],['caEditNote','editNote'],['caEditEnd','editEnd']]){
   if($(source)&&$(target))$(target).value=$(source).value;
  }
  const save=$('saveEdit');
  if(save){save.click();closeDialog();setTimeout(()=>{state.lastHistory=0;renderHistory();renderReview()},120)}
  return;
 }
 if(event.target.closest('[data-ca-distraction]')){$('distractionToggle')?.click();closeDialog();return}
 const viewPast=event.target.closest('[data-ca-view-past]');
 if(viewPast){
  const dayKey=viewPast.dataset.caViewPast;
  const date=new Date(dayKey+'T12:00:00');
  state.historyPeriod='month';state.historyMonth=localMonthKey(date);
  closeDialog();
  if(document.body.dataset.lifeosView!=='tracking')document.querySelector('#lifeosNavigation [data-view="tracking"]')?.click();
  const history=$('caHistory');if(history)delete history.dataset.caSignature;
  chooseTab('history');
  const day=Array.from($('caHistory')?.querySelectorAll('details.ca-day')||[]).find(x=>x.dataset.caDay===dayKey);
  if(day){for(let p=day;p;p=p.parentElement?.closest('details'))p.open=true;day.scrollIntoView({block:'center',behavior:'smooth'})}
  return;
 }
 if(event.target.closest('[data-ca-save-past]')){
  const error=$('caPastError');
  const original=$('pastForm'),name=$('caPastName')?.value.trim()||'';
  const startString=$('caPastStart')?.value||'',endString=$('caPastEnd')?.value||'';
  const start=new Date(startString).getTime(),end=new Date(endString).getTime();
  if(!name||name.length>80||!Number.isFinite(start)||!Number.isFinite(end)||start>=end||end>Date.now()){
   if(error)error.textContent='Enter an activity name and valid past start/end times. The end must not be in the future.';
   return;
  }
  if(selectedGap&&!window.lifeosTodayAPlusGapValid?.(selectedGap,start,end)){
   if(error)error.textContent='The unlogged interval changed or your times are outside it. Close this form and select a remaining gap.';
   return;
  }
  if(!original||typeof window.lifeosReadOnlyWorkspace!=='function'){
   if(error)error.textContent='The original LifeOS save system is unavailable. No record was added.';
   return;
  }
  try{
   const prior=window.lifeosReadOnlyWorkspace();
   const oldIds=new Set((prior.sessions||[]).map(x=>String(x.id)));
   for(const [id,value] of [['pastName',name],['pastStart',startString],['pastEnd',endString],['pastNotes',$('caPastNotes')?.value||'']]){
    const input=$(id);
    if(!input)throw Error('Missing save field: '+id);
    input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));
   }
   if(!original.checkValidity()){
    if(error)error.textContent='Some activity fields are invalid. Please review the dates and name.';
    return;
   }
   // The native submit handler persists the session and rolls back on failure.
   // Dispatching a validated submit event avoids focus errors in the hidden original form.
   const gapGuard=selectedGap?{...selectedGap}:null;
   original.lifeosGapGuard=gapGuard;
   try{original.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))}finally{delete original.lifeosGapGuard}
   const after=window.lifeosReadOnlyWorkspace();
   const newRecord=(after.sessions||[]).find(x=>!oldIds.has(String(x.id))&&x.source==='manual-past-entry'&&x.name===name&&x.startAt===start&&x.endAt===end);
   if(!newRecord){
    if(error)error.textContent=gapGuard?.error||'The activity could not be confirmed as saved. Your entries remain here for correction or retry.';
    return;
   }
   state.lastHistory=0;
   const hist=$('caHistory');if(hist)delete hist.dataset.caSignature;
   renderHistory();renderReview();
   const dateKey=localKey(new Date(start));
   const remaining=selectedGap?window.lifeosTodayAPlusSnapshot().gaps.map(g=>({a:Math.max(g.a,selectedGap.a),b:Math.min(g.b,selectedGap.b)})).filter(g=>g.b>g.a):[];
   dialogBody.innerHTML='<div class="ca-past-success"><span aria-hidden="true">✓</span><strong>Activity saved</strong><p>'+htmlEscape(name)+' · '+htmlEscape(durationLabel(end-start))+'</p></div>'
     +'<button type="button" class="ca-sheet-primary" data-ca-view-past="'+htmlEscape(dateKey)+'">View in History</button>'
     +(remaining.length?'<p class="ca-editor-footnote">Remaining unlogged in the selected interval: '+htmlEscape(durationLabel(remaining.reduce((n,g)=>n+g.b-g.a,0)))+'</p>'+remaining.map(g=>'<button type="button" class="ca-sheet-secondary" data-ca-gap="'+g.a+':'+g.b+'">Log remaining '+htmlEscape(new Date(g.a).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}))+'–'+htmlEscape(new Date(g.b).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}))+'</button>').join(''):'')
     +'<button type="button" class="ca-sheet-secondary" data-ca-close>Close</button>';
  }catch(ex){
   if(error)error.textContent='Unable to confirm this activity was saved. '+String(ex?.message||ex);
  }
  return;
 }
 if(event.target.closest('[data-ca-focus-notifications]')){
  const native=$('lo207-notify-permission');
  if(native){native.click();return}
  const msg=$('caFocusError');
  if(msg)msg.textContent='Notification permission controls are unavailable on this device.';
  return;
 }
 if(event.target.closest('[data-ca-focus-notification-settings]')){
  const native=$('lo224-native-notifications');
  if(native&&window.LifeOSNative&&typeof window.LifeOSNative.postMessage==='function'){
   native.click();
  }else{
   const info=document.createElement('p');
   info.className='ca-focus-settings-help';
   info.textContent='Open Android Settings → Apps → LifeOS Beta → Notifications to review notification permissions. Browser notification permissions are managed in your browser settings.';
   const panel=dialogBody.querySelector('.ca-focus-device-panel');
   if(panel&&!panel.querySelector('.ca-focus-settings-help'))panel.append(info);
  }
  return;
 }
 if(event.target.closest('[data-ca-focus-start]')){
  const label=$('caFocusActivity')?.selectedOptions?.[0]?.textContent?.trim()||'Focus';
  const minutes=Number($('caFocusDuration')?.value||45);
  const nativeLabel=$('lo207-focus-label'),nativeMinutes=$('lo207-focus-minutes'),nativeStart=$('lo207-start-focus');
  const err=$('caFocusError');
  if(!nativeLabel||!nativeMinutes||!nativeStart){
   if(err)err.textContent='The LifeOS focus engine is unavailable. No session was started.';
   return;
  }
  if(!Number.isSafeInteger(minutes)||minutes<1||minutes>240){
   if(err)err.textContent='Choose a valid focus duration (1–240 minutes).';
   return;
  }
  nativeLabel.value=label;nativeMinutes.value=String(minutes);
  nativeLabel.dispatchEvent(new Event('input',{bubbles:true}));
  nativeMinutes.dispatchEvent(new Event('input',{bubbles:true}));
  dialog.dataset.caFocusStarting='1';
  nativeStart.click();
  const button=event.target.closest('button');
  if(button){button.textContent='Starting focus…';button.disabled=true}
  return;
 }
 const focusControl=event.target.closest('[data-ca-focus-control]');
 if(focusControl){
  const map={pause:'lo221-layer-pause',break:'lo221-layer-break',end:'lo207-cancel-focus'};
  const control=$(map[focusControl.dataset.caFocusControl]);
  if(!control)return;
  control.click();
  if(focusControl.dataset.caFocusControl==='end'){closeDialog();return}
  window.setTimeout(updateRealFocusScreen,50);
  return;
 }
 const limit=event.target.closest('[data-ca-limit]');
 if(limit){
  const input=$('caExpectedMinutes');if(input)input.value=limit.dataset.caLimit;
  for(const preset of dialogBody.querySelectorAll('[data-ca-limit]'))
   preset.setAttribute('aria-pressed',String(preset===limit));
  return;
 }
 if(event.target.closest('[data-ca-timer-preview]')){
  const minutes=Math.max(1,Math.min(1440,Number($('caExpectedMinutes')?.value||60)));
  const timer=$('caLimitActivity')?.selectedOptions?.[0]?.textContent||'Activity';
  dialog.dataset.caPreview='timer';
  const content='<div class="ca-focus-hero"><div class="ca-focus-icon">◷</div><h3>Duration reached</h3><p>'+htmlEscape(timer)+' · '+minutes+' min target</p></div>'
   +'<div class="ca-timer-reminder"><strong>Time to check in</strong><p>Would you like to finish, extend, or review this activity?</p></div>'
   +'<div class="ca-preview-actions"><button class="ca-sheet-secondary" data-ca-preview-back="timer">‹ &nbsp; Settings</button><button class="ca-sheet-primary" data-ca-close>Close preview</button></div>';
  openDialog('Timer check-in','Reminder appearance · preview only',content);return;
 }
 const back=event.target.closest('[data-ca-preview-back]');
 if(back){sheet(back.dataset.caPreviewBack);return;}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
window.addEventListener('load',build,{once:true});
})();