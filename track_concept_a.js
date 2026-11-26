
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
const state={tab:'live',historyPeriod:'week',historyMonth:localMonthKey(new Date()),historyAnchor:localKey(new Date()),historyFrom:localKey(new Date()),historyTo:localKey(new Date()),historyDraftFrom:localKey(new Date()),historyDraftTo:localKey(new Date()),historyCategory:'',historyActivity:'',historyOrder:'newest',reviewPeriod:'week',reviewGrouping:'category',query:'',history:[],lastHistory:0,lastReview:0};
let shell,dialog,dialogBody,previousFocus,selectedGap=null;
const finishPending=new Map();
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
 const n=Math.max(0,Math.round(ms/1000));const hours=Math.floor(n/3600),minutes=Math.floor(n/60)%60,seconds=n%60;
 if(ms>0&&n===0)return '<1s';
 return [hours?hours+'h':'',minutes?minutes+'m':'',seconds||(!hours&&!minutes)?String(seconds)+'s':''].filter(Boolean).join(' ');
}
function gapInputTime(id){
 const input=$(id);if(!input?.value)return NaN;
 return !input.dataset.gapEdited&&input.value===input.dataset.gapInitial?Number(input.dataset.gapExact):new Date(input.value).getTime();
}
function updateGapSummary(){
 const summary=$('caGapSummary');if(!selectedGap||!summary)return;
 const a=gapInputTime('caPastStart'),b=gapInputTime('caPastEnd');
 if(!Number.isFinite(a)||!Number.isFinite(b)||a>=b||a<selectedGap.a||b>selectedGap.b){summary.textContent='Choose a start and end within the selected unlogged interval.';return}
 summary.textContent='Recording '+exactDuration(b-a)+' · Remaining unlogged '+exactDuration((selectedGap.b-selectedGap.a)-(b-a));
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
function pendingFinish(id){
 const expires=finishPending.get(String(id))||0;
 if(expires<=Date.now()){finishPending.delete(String(id));return false}
 return true;
}
function finishActivity(id){
 const control=Array.from(document.querySelectorAll('#sessions [data-act="finish"]')).find(b=>b.dataset.id===id);
 if(!control)return {ok:false,pending:false};
 control.click();
 const saved=window.lifeosReadOnlyWorkspace?.()?.sessions?.find(s=>String(s.id)===String(id));
 const finished=!!saved&&saved.status==='finished',pending=!finished&&/tap again to finish/i.test(control.textContent||'');
 if(pending)finishPending.set(String(id),Date.now()+15000);else finishPending.delete(String(id));
 return {ok:pending||finished,pending};
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
 // A paused session can contribute several saved segments to the same day.
 // Present one day portion per session, summing the unrounded segment values.
 // Entries without raw durations remain separate rather than inventing totals.
 const combined=[],bySessionDay=new Map();
 for(const record of result){
  const key=record.id&&record.dateKey&&Number.isFinite(record.rawDurationMs)?record.id+'\u0000'+record.dateKey:'';
  const existing=key?bySessionDay.get(key):null;
  if(!existing){record.parts=1;combined.push(record);if(key)bySessionDay.set(key,record);continue}
  existing.rawDurationMs+=record.rawDurationMs;existing.parts++;
  existing.duration=durationLabel(existing.rawDurationMs);
  const source=(existing.time.split(' · ').slice(1).join(' · ')||'Recorded');
  existing.time=existing.parts+' recorded intervals · '+source.replace(/^\d+ recorded intervals · /,'');
 }
 return combined;
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
 const now=new Date(),today=localKey(now);
 if(record.dateKey>today)return false;
 if(period==='today')return record.dateKey===today;
 if(period==='week'){
  const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
  return record.dateKey>=localKey(monday);
 }
 if(period==='month')return record.dateKey.slice(0,7)===today.slice(0,7);
 return true;
}
function build(){
 if($('loTrackConceptA'))return;
 const nav=$('lifeosNavigation');
 if(!nav||!nav.parentElement)return;
 shell=e('section');shell.id='loTrackConceptA';shell.setAttribute('aria-label','Track Concept A');
 shell.innerHTML=[
 '<div class="ca-workspaces">',
 '<div class="ca-brand"><div><span class="ca-logo">◈</span><b>'+(location.hostname==='lifeos-today-aplus-preview.onrender.com'?'LifeOS Preview':'LifeOS Beta')+'</b></div><span class="ca-brand-end">● Personal</span></div>',
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
  if(event.target.id==='caHistoryFrom'){state.historyDraftFrom=event.target.value;return}
  if(event.target.id==='caHistoryTo'){state.historyDraftTo=event.target.value;return}
  if(event.target.id==='caHistorySearch'){
   state.query=event.target.value;const caret=event.target.selectionStart;
   renderHistory();const replacement=$('caHistorySearch');
   if(replacement){replacement.focus();if(caret!==null)replacement.setSelectionRange(caret,caret)}
  }
 });
 shell.addEventListener('change',event=>{
  const key=event.target.dataset.caHistoryFilter;
  if(key==='category')state.historyCategory=event.target.value;
  else if(key==='activity')state.historyActivity=event.target.value;
  else if(key==='order')state.historyOrder=event.target.value;
  else return;
  renderHistory();
 });
 dialog.addEventListener('click',handleDialogClick);
 dialog.addEventListener('input',event=>{
  if(selectedGap&&['caPastStart','caPastEnd'].includes(event.target.id)){event.target.dataset.gapEdited='1';updateGapSummary()}
  if(event.target.id!=='caStartSearch')return;
  const value=event.target.value.trim().toLocaleLowerCase();
  for(const option of dialogBody.querySelectorAll('[data-ca-quick]')){
   option.hidden=!option.textContent.toLocaleLowerCase().includes(value);
  }
 });
 dialog.addEventListener('change',event=>{
  if(selectedGap&&['caPastStart','caPastEnd'].includes(event.target.id)){event.target.dataset.gapEdited='1';updateGapSummary();return}
  if(event.target.id==='caHistoryCategory'){
   const button=dialogBody.querySelector('[data-ca-history-category-save]'),message=$('caHistoryCategoryMessage');
   if(button)button.disabled=event.target.value===event.target.dataset.caSavedCategory;
   if(message)message.textContent='';return;
  }
  const key=event.target.dataset.caFocusAlert;if(!['sound','vibration'].includes(key))return;
  const source=$(key==='sound'?'lo221-sound':'lo221-vibrate'),engine=window.LifeOSAlertEngineV221,status=$('caFocusAlertStatus');
  if(!source||!engine?.load){if(status)status.textContent='Alert settings are unavailable.';return}
  source.checked=event.target.checked;source.dispatchEvent(new Event('change',{bubbles:true}));
  const saved=Boolean(engine.load()[key]);
  if(saved!==event.target.checked){source.checked=saved;event.target.checked=saved;if(status)status.textContent='Could not save alert settings; previous setting restored.'}
  else if(status)status.textContent='Alert settings saved.';
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
 state.tab=name;shell.dataset.caActiveTab=name;
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
function liveIcon(name){
 const paths={pause:'<path d="M7 5h3v14H7zm7 0h3v14h-3z" fill="currentColor" stroke="none"/>',play:'<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',finish:'<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none"/>',break:'<path d="M4 7h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V7Zm12 1h2a3 3 0 0 1 0 6h-2M4 21h13"/>',details:'<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>'};
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.details)+'</svg>';
}
function categoryGlyph(category){
 const source=({'University':'Studying','Study':'Studying','Work & business':'Work','Fitness':'Fitness','Nutrition':'Eating','Sleep':'Sleep','Prayer':'Prayer','Quran & Arabic':'Quran'})[category];
 return Array.from(document.querySelectorAll('#quick button[data-name]')).find(b=>b.dataset.name===source)?.querySelector('.lo-quick-glyph')?.innerHTML||'◷';
}
function activityCategories(current){
 const categories=['Other / review','Prayer','University','Study','Fitness','Nutrition','Sleep','Quran & Arabic','Work & business','Distraction'];
 const coreIds=new Set(['prayer','study','fitness','nutrition','sleep','quran','work','distraction']);
 for(const item of window.LifeOSActivityIntelligenceV251?.catalog||[])if(!coreIds.has(item.id)&&!categories.includes(item.title))categories.push(item.title);
 if(current&&!categories.includes(current))categories.push(current);
 return categories;
}
function liveMarkup(today){
 const rows=activeSessions(),first=rows[0],others=rows.slice(1);
 const metrics=today?.metrics||{},firstLive=today?.active?.find(x=>String(x.id)===String(first?.id));
 const time=firstLive&&Number.isFinite(firstLive.startAt)?new Date(firstLive.startAt).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}):'';
 const category=today?.recorded?.find(x=>String(x.id)===String(first?.id))?.category,activityIcon=categoryGlyph(category);
 let markup='<div class="ca-live-overview"><div class="ca-live-count" aria-label="'+rows.length+' active sessions"><strong>'+rows.length+'</strong><small>Active '+(rows.length===1?'session':'sessions')+'</small></div><div class="ca-live-overview-stats"><div><span>Unique tracked today</span><strong data-ca-live-unique>'+htmlEscape(durationLabel(metrics.unique||0))+'</strong></div><div><span>Total recorded today</span><strong data-ca-live-total>'+htmlEscape(durationLabel(metrics.total||0))+'</strong></div><small>Overlapping time is counted once in unique time.</small></div></div>';
 if(first){
  markup+='<div class="ca-panel ca-primary"><div class="ca-overline"><span>Current session</span><span class="ca-pill">'+htmlEscape(first.status==='running'?'● Running':'Ⅱ Paused')+'</span></div>';
  markup+='<div class="ca-live-primary-row"><div class="ca-live-activity-icon" aria-hidden="true">'+activityIcon+'</div><div class="ca-live-primary-copy"><div class="ca-activity-name">'+htmlEscape(first.name)+'</div><p class="ca-timer-meta">'+(time?'Started '+htmlEscape(time)+' · ':'')+'Total session time</p></div><div class="ca-clock" id="caMainClock">'+htmlEscape(first.clock)+'</div></div>';
  // No goal percentage is displayed unless a real goal source is available.
  markup+='<div class="ca-control-grid">';
  markup+='<button type="button" data-ca-act="'+(first.status==='running'?'pause':'resume')+'" data-ca-id="'+htmlEscape(first.id)+'" class="ca-emphasis">'+liveIcon(first.status==='running'?'pause':'play')+(first.status==='running'?'Pause':'Resume')+'</button>';
  markup+='<button type="button" data-ca-act="break" data-ca-id="'+htmlEscape(first.id)+'" '+(first.status==='paused'?'disabled aria-label="Resume this activity before starting a break"':'')+'>'+liveIcon('break')+'Break</button>';
  markup+='<button type="button" data-ca-act="finish" data-ca-id="'+htmlEscape(first.id)+'" aria-label="'+(pendingFinish(first.id)?'Confirm finish ':'Finish ')+htmlEscape(first.name)+'">'+liveIcon('finish')+(pendingFinish(first.id)?'Confirm finish':'Finish')+'</button>';
  markup+='<button type="button" data-ca-sheet="activity" data-ca-id="'+htmlEscape(first.id)+'">'+liveIcon('details')+'Details</button>';
  markup+='</div>'+(first.status==='paused'?'<p class="ca-break-unavailable">Resume this activity to start a break.</p>':'')+'</div>';
 }else{
  markup+='<div class="ca-panel ca-primary"><div class="ca-overline">◎ ACTIVE ACTIVITY</div><div class="ca-empty"><strong style="display:block;color:#f3fffa;font-size:20px;margin-bottom:8px">Ready for your next activity?</strong>No timer is running. Start a new activity to see its live clock here.</div></div>';
 }
 if(others.length){
  markup+='<div class="ca-panel ca-secondary"><h3>Other active ('+others.length+')</h3>';
  for(const row of others)markup+='<div class="ca-mini-item"><i class="ca-dot"></i><strong title="'+htmlEscape(row.name)+'">'+htmlEscape(row.name)+'</strong><time>'+htmlEscape(row.clock)+'</time><button type="button" class="ca-mini-action" data-ca-act="'+(row.status==='running'?'pause':'resume')+'" data-ca-id="'+htmlEscape(row.id)+'" aria-label="'+(row.status==='running'?'Pause ':'Resume ')+htmlEscape(row.name)+'">'+liveIcon(row.status==='running'?'pause':'play')+'</button><button type="button" class="ca-mini-action" data-ca-act="finish" data-ca-id="'+htmlEscape(row.id)+'" aria-label="'+(pendingFinish(row.id)?'Confirm finish ':'Finish ')+htmlEscape(row.name)+'">'+(pendingFinish(row.id)?'Confirm':liveIcon('finish'))+'</button><button type="button" class="ca-mini-action" data-ca-sheet="activity" data-ca-id="'+htmlEscape(row.id)+'" aria-label="Open '+htmlEscape(row.name)+'">›</button></div>';
  markup+='</div>';
 }
 const available=Array.from(document.querySelectorAll('#quick button[data-name]'));
 const options=[['Studying','Study'],['Work','Work'],['Fitness','Exercise'],['Reading','Reading'],['Eating','Eating'],['Sleep','Sleep'],['Prayer','Prayer']].map(([name,label])=>({name,label,source:available.find(b=>b.dataset.name===name)})).filter(x=>x.source);
 markup+='<section class="ca-live-quick"><div class="ca-live-quick-head"><h3>Quick start</h3><button type="button" data-ca-sheet="start">＋ Custom</button></div><div class="ca-live-quick-grid">';
 for(const option of options)markup+='<button type="button" data-ca-quick-start="'+htmlEscape(option.name)+'" aria-label="Start '+htmlEscape(option.name)+(rows.length?' alongside current sessions':'')+'"><span aria-hidden="true">'+(option.source.querySelector('.lo-quick-glyph')?.innerHTML||'▷')+'</span><strong>'+htmlEscape(option.label)+'</strong></button>';
 markup+='<button type="button" data-ca-sheet="start"><span aria-hidden="true">⋯</span><strong>More</strong></button></div></section>';
 markup+='<button type="button" class="ca-main-button" data-ca-sheet="start">＋ &nbsp; Start Activity</button>';
 const focus=readRealFocusState();
 markup+='<div class="ca-quiet-actions"><button type="button" class="ca-soft-button" data-ca-sheet="focus">'+(focus?'● Focus '+htmlEscape(focus.mode):'◎ Focus Mode')+'</button><button type="button" class="ca-soft-button" data-ca-sheet="timer">◷ Timer settings</button></div>';
 return markup;
}
function renderLive(){
 if(!shell)return;
 const target=$('caLive');if(!target)return;
 const previous=target.querySelector('#caMainClock')?.textContent;
 const today=window.lifeosTodayAPlusSnapshot?.(),next=liveMarkup(today);
 const focus=readRealFocusState();
 const categories=new Map((today?.recorded||[]).map(x=>[String(x.id),x.category]));
 const signature=activeSessions().map(x=>x.id+'|'+x.name+'|'+x.status+'|'+pendingFinish(x.id)+'|'+String(categories.get(String(x.id))||'')).join('|')+'|focus:'+String(focus?.mode||'none')+'|'+String(focus?.label||'');
 if(target.dataset.signature!==signature){
  target.innerHTML=next;target.dataset.signature=signature;
 }else{
  const sessions=activeSessions();
  if(sessions[0]&&$('caMainClock'))$('caMainClock').textContent=sessions[0].clock;
  const unique=target.querySelector('[data-ca-live-unique]'),total=target.querySelector('[data-ca-live-total]');
  if(unique)unique.textContent=durationLabel(today?.metrics?.unique||0);if(total)total.textContent=durationLabel(today?.metrics?.total||0);
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
function historyDate(key){
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(key||'');
 if(!match)return null;
 const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),12);
 return localKey(date)===key?date:null;
}
function historyWindow(period){
 const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
 let anchor=historyDate(state.historyAnchor)||today;
 if(period==='month')anchor=historyDate(state.historyMonth+'-01')||today;
 if(period==='custom')anchor=historyDate(state.historyFrom)||today;
 const start=new Date(anchor),end=new Date(anchor);
 if(period==='week'){
  start.setDate(start.getDate()-(start.getDay()+6)%7);end.setTime(start.getTime());end.setDate(end.getDate()+7);
 }else if(period==='month'){
  start.setDate(1);end.setTime(start.getTime());end.setMonth(end.getMonth()+1);
 }else if(period==='year'){
  start.setMonth(0,1);end.setFullYear(start.getFullYear()+1,0,1);
 }else if(period==='custom'){
  end.setTime((historyDate(state.historyTo)||today).getTime());end.setDate(end.getDate()+1);
 }else{end.setDate(end.getDate()+1)}
 const futureLimit=new Date(today);futureLimit.setDate(futureLimit.getDate()+1);
 return {start,end,limit:end<futureLimit?end:futureLimit,today};
}
function historyWindowLabel(period,window){
 const fmt=date=>date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
 if(period==='all')return 'All saved history';
 if(period==='today')return fmt(window.start);
 if(period==='month')return monthTitle(localMonthKey(window.start));
 if(period==='year')return String(window.start.getFullYear());
 const last=new Date(window.end);last.setDate(last.getDate()-1);
 const firstLabel=window.start.toLocaleDateString(undefined,{day:'numeric',month:'short',...(window.start.getFullYear()===last.getFullYear()?{}:{year:'numeric'})});
 return firstLabel+' – '+fmt(last);
}
function historyDuration(record){return Number.isFinite(record.rawDurationMs)?Math.max(0,record.rawDurationMs):durationMs(record.duration)}
function historyDaySpan(a,b){
 const day=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());
 return Math.max(0,Math.round((day(b)-day(a))/86400000));
}
function historyColor(name){
 const known={'University':'#65dfc0','Study':'#65dfc0','Work & business':'#65b8ee','Fitness':'#6bd7a0','Nutrition':'#e7bd54','Sleep':'#829ab5','Prayer':'#b89ae5','Quran & Arabic':'#a99aeb','Distraction':'#e38d8d','Other / review':'#a6bcd0'};
 return known[name]||'#a6bcd0';
}
function historyChart(records,period,window){
 const bins=new Map();
 function bin(key,label){if(!bins.has(key))bins.set(key,{key,label,groups:new Map(),total:0});return bins.get(key)}
 const span=historyDaySpan(window.start,window.end);
 const unit=period==='all'?'year':period==='year'?'month':period==='month'?'week':period==='custom'?(span<=7?'day':span<=77?'week':span<=365?'month':'year'):'day';
 function keyFor(date){
  if(unit==='year')return String(date.getFullYear());
  if(unit==='month')return localMonthKey(date);
  if(unit==='week'){const monday=new Date(date);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);return localKey(monday)}
  return localKey(date);
 }
 function labelFor(date){
  if(unit==='year')return String(date.getFullYear());
  if(unit==='month')return date.toLocaleDateString(undefined,{month:'short',...(period==='custom'?{year:'2-digit'}:{})});
  if(unit==='week'){const monday=new Date(date);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);return monday.toLocaleDateString(undefined,{day:'numeric',month:'short'})}
  return date.toLocaleDateString(undefined,{weekday:'short',...(['today','custom'].includes(period)?{day:'numeric'}:{})});
 }
 if(period==='all'){
  for(const record of records){const d=historyDate(record.dateKey);if(d)bin(String(d.getFullYear()),String(d.getFullYear()))}
 }else{
  const d=new Date(window.start);
  if(unit==='year')d.setMonth(0,1);
  else if(unit==='month')d.setDate(1);
  else if(unit==='week')d.setDate(d.getDate()-(d.getDay()+6)%7);
  for(;d<window.end;){
   bin(keyFor(d),labelFor(d));
   if(unit==='year')d.setFullYear(d.getFullYear()+1);
   else if(unit==='month')d.setMonth(d.getMonth()+1);
   else d.setDate(d.getDate()+(unit==='week'?7:1));
  }
 }
 for(const record of records){
  const d=historyDate(record.dateKey);if(!d)continue;
  const key=keyFor(d);
  const value=historyDuration(record),group=record.category||'Other / review',bucket=bins.get(key);
  if(!bucket)continue;
  bucket.total+=value;bucket.groups.set(group,(bucket.groups.get(group)||0)+value);
 }
 let displayed=Array.from(bins.values()).sort((a,b)=>a.key.localeCompare(b.key));
 const groupedEarlier=displayed.length>12;
 if(groupedEarlier){
  const old=displayed.slice(0,-11),earlier={key:'earlier',label:'Earlier',details:'Earlier '+old[0].label+' – '+old[old.length-1].label,groups:new Map(),total:0};
  for(const bucket of old){earlier.total+=bucket.total;for(const [name,ms] of bucket.groups)earlier.groups.set(name,(earlier.groups.get(name)||0)+ms)}
  displayed=[earlier,...displayed.slice(-11)];
 }
 const categories=new Map();for(const bucket of displayed)for(const [name,ms] of bucket.groups)categories.set(name,(categories.get(name)||0)+ms);
 const groups=Array.from(categories).sort((a,b)=>b[1]-a[1]).map(([name])=>name),max=Math.max(1,...displayed.map(b=>b.total));
 let html='<div class="ca-history-chart" aria-label="Recorded time by category">';
 if(!displayed.some(b=>b.total>0))html+='<p class="ca-history-chart-empty">No recorded time in this period.</p>';
 else{
  const axis=ms=>ms>0&&ms<60000?exactDuration(ms):durationLabel(ms);
  html+='<div class="ca-history-chart-plot"><div class="ca-history-axis" aria-hidden="true"><span>'+htmlEscape(axis(max))+'</span><span>'+htmlEscape(axis(max/2))+'</span><span>0m</span></div><div class="ca-history-bars">';
  for(const b of displayed){
   const description=(b.details||b.label)+' · '+durationLabel(b.total)+Array.from(b.groups).map(([name,ms])=>' · '+name+' '+durationLabel(ms)).join('');
   html+='<div class="ca-history-bar-column"><div class="ca-history-bar" role="img" aria-label="'+htmlEscape(description)+'">';
   for(const [name,ms] of b.groups)html+='<span title="'+htmlEscape(name+' · '+durationLabel(ms))+'" style="height:'+Math.max(0,ms/max*100)+'%;background:'+historyColor(name)+'"></span>';
   html+='</div><small>'+htmlEscape(b.label)+'</small></div>';
  }
  html+='</div></div><div class="ca-history-legend">';
  for(const name of groups)html+='<span><i style="background:'+historyColor(name)+'"></i>'+htmlEscape(name)+'</span>';
  html+='</div>';
 }
 const undated=records.filter(r=>!historyDate(r.dateKey)).length;
 return html+'<small class="ca-history-chart-note">'+(groupedEarlier?'Earlier '+unit+'s grouped · ':'')+'Recorded duration, including concurrent time.'+(undated?' '+undated+' undated '+(undated===1?'entry':'entries')+' excluded from chart.':'')+'</small></div>';
}
function renderHistory(){
 if(!shell)return;
 if(state.tab==='history')updateHistorySource();
 const target=$('caHistory');if(!target)return;
 state.history=readHistory();
 const range=historyWindow(state.historyPeriod),workspace=window.lifeosReadOnlyWorkspace?.();
 const originals=new Map((workspace?.sessions||[]).map(s=>[String(s.id),s]));
 for(const item of state.history)item.category=window.lifeosActivityClassification?.(originals.get(String(item.id))||{name:item.name})?.group||'Other / review';
 const periodItems=state.history.filter(x=>state.historyPeriod==='all'||(x.dateKey&&x.dateKey>=localKey(range.start)&&x.dateKey<localKey(range.limit)));
 const filtered=periodItems.filter(x=>(!state.historyCategory||x.category===state.historyCategory)&&(!state.historyActivity||x.name===state.historyActivity)
  &&(x.name+' '+x.time+' '+x.day).toLowerCase().includes(state.query.toLowerCase()));
 filtered.sort((a,b)=>{
  const direction=state.historyOrder==='oldest'?1:-1,day=(a.dateKey||'').localeCompare(b.dateKey||'');
  const first=Number(originals.get(String(a.id))?.startAt)||0,second=Number(originals.get(String(b.id))?.startAt)||0;
  return direction*(day||(first-second));
 });
 const signature=[state.historyPeriod,state.historyMonth,state.historyAnchor,state.historyFrom,state.historyTo,state.historyCategory,state.historyActivity,state.historyOrder,state.query,localKey(range.today),periodItems.map(x=>[x.id,x.dateKey,x.duration,x.rawDurationMs,x.time,x.name,x.category].join(':')).join('|')].join('|');
 if(target.dataset.caSignature===signature){state.lastHistory=Date.now();return}
 const openDays=new Set(Array.from(target.querySelectorAll('details.ca-day[open]')).map(el=>el.dataset.caDay));
 const openWeeks=new Set(Array.from(target.querySelectorAll('details.ca-history-week[open]')).map(el=>el.dataset.caWeek));
 const openMonths=new Set(Array.from(target.querySelectorAll('details.ca-history-month[open]')).map(el=>el.dataset.caMonth));
 // Opening the monthly or all-history view starts with its most recent month visible.
 const wasMonthView=['month','year','all','custom'].includes(target.dataset.caPeriod);
 const customPanel=target.querySelector('#caHistoryCustom'),customOpen=(!!customPanel&&!customPanel.hidden)||state.historyPeriod==='custom';
 const queryActive=Boolean(state.query.trim());
 let page='<div class="ca-section-head"><span class="ca-section-icon">▣</span><div><h2>Activity History</h2><p>Your recorded activities and sessions</p></div></div>';
 page+='<div class="ca-toolbar"><input id="caHistorySearch" class="ca-search" type="search" placeholder="⌕  Search activities..." aria-label="Search activity history" value="'+htmlEscape(state.query)+'"></div>';
 page+='<div class="ca-filter-row">';
 for(const [key,label] of [['today','Day'],['week','Week'],['month','Month'],['year','Year'],['all','All']])
  page+='<button type="button" class="ca-chip" data-ca-period="'+key+'" aria-pressed="'+(state.historyPeriod===key)+'" '+(key==='all'?'aria-label="All time"':'')+'>'+label+'</button>';
 page+='<button type="button" class="ca-chip" data-ca-history-custom-toggle aria-controls="caHistoryCustom" aria-expanded="'+customOpen+'" aria-pressed="'+(state.historyPeriod==='custom')+'">Custom</button>';
 page+='</div>';
 if(!['all','custom'].includes(state.historyPeriod)){
  const atCurrent=range.end>range.today;
  page+='<div class="ca-month-navigation"><button type="button" data-ca-history-move="-1" aria-label="Previous '+htmlEscape(state.historyPeriod==='today'?'day':state.historyPeriod)+'">‹</button>';
  page+='<strong>'+htmlEscape(historyWindowLabel(state.historyPeriod,range))+'</strong>';
  page+='<button type="button" data-ca-history-move="1" '+(atCurrent?'disabled':'')+' aria-label="Next '+htmlEscape(state.historyPeriod==='today'?'day':state.historyPeriod)+'">›</button></div>';
 }else page+='<p class="ca-history-range">'+htmlEscape(state.historyPeriod==='all'?'All saved history':historyWindowLabel('custom',range))+'</p>';
 page+='<div id="caHistoryCustom" class="ca-history-custom" '+(customOpen?'':'hidden')+'><div><label>From<input id="caHistoryFrom" type="date" max="'+htmlEscape(localKey(range.today))+'" value="'+htmlEscape(state.historyDraftFrom)+'"></label><label>To<input id="caHistoryTo" type="date" max="'+htmlEscape(localKey(range.today))+'" value="'+htmlEscape(state.historyDraftTo)+'"></label><button type="button" data-ca-history-apply>View</button></div><p role="status" id="caHistoryRangeError"></p></div>';
 const total=items=>items.reduce((acc,r)=>acc+historyDuration(r),0),sum=total(filtered),dates=new Set(filtered.map(r=>r.dateKey).filter(Boolean));
 const first=Array.from(dates).sort()[0],avgStart=state.historyPeriod==='all'?historyDate(first):range.start;
 const days=avgStart?historyDaySpan(avgStart,state.historyPeriod==='all'?new Date(range.today.getFullYear(),range.today.getMonth(),range.today.getDate()+1,12):range.limit):0;
 const avg=days&&!filtered.some(r=>!r.dateKey)?durationLabel(sum/days):'—';
 page+='<div class="ca-history-metrics"><div><strong data-ca-history-total>'+htmlEscape(durationLabel(sum))+'</strong><small>Recorded</small></div><div><strong data-ca-history-average>'+htmlEscape(avg)+'</strong><small>Daily average</small></div><div><strong data-ca-history-count>'+new Set(filtered.map(r=>r.id)).size+'</strong><small>Activities</small></div><div><strong data-ca-history-days>'+dates.size+'</strong><small>Active days</small></div></div>';
 page+=historyChart(filtered,state.historyPeriod,range);
 const names=Array.from(new Set(periodItems.map(x=>x.name))).sort((a,b)=>a.localeCompare(b));
 const categories=Array.from(new Set(periodItems.map(x=>x.category))).sort((a,b)=>a.localeCompare(b));
 const select=(key,label,values,value)=>'<label><span class="ca-visually-hidden">'+label+'</span><select data-ca-history-filter="'+key+'" aria-label="'+label+'"><option value="">All '+(key==='activity'?'activities':'categories')+'</option>'+values.map(v=>'<option value="'+htmlEscape(v)+'" '+(v===value?'selected':'')+'>'+htmlEscape(v)+'</option>').join('')+'</select></label>';
 page+='<div class="ca-history-filters">'+select('activity','Filter activities',names,state.historyActivity)+select('category','Filter categories',categories,state.historyCategory)+'<label><span class="ca-visually-hidden">Sort activities</span><select data-ca-history-filter="order" aria-label="Sort activities"><option value="newest" '+(state.historyOrder==='newest'?'selected':'')+'>Newest</option><option value="oldest" '+(state.historyOrder==='oldest'?'selected':'')+'>Oldest</option></select></label></div>';
 page+='<p class="ca-history-time-note">Summed activity time includes overlaps; it can exceed unique time.</p>';
 if(!filtered.length)page+='<div class="ca-panel ca-empty">No recorded sessions match these filters.</div>';
 // Each row is a recorded day portion. It belongs to exactly one day and week.
 const dayGroups=new Map();
 for(const rec of filtered){
  const dayKey=rec.dateKey||rec.day;
  if(!dayGroups.has(dayKey))dayGroups.set(dayKey,{key:dayKey,label:rec.day,items:[]});
  dayGroups.get(dayKey).items.push(rec);
 }
 const firstDay=dayGroups.keys().next().value,initialPeriod=!target.dataset.caSignature||target.dataset.caPeriod!==state.historyPeriod;
 const groupedHistory=['month','year','all'].includes(state.historyPeriod)||(state.historyPeriod==='custom'&&historyDaySpan(range.start,range.end)>31);
 const activityCount=items=>new Set(items.map((item,index)=>item.id?'id:'+item.id:'unknown:'+index)).size;
 function dayMarkup(group){
  const items=group.items,count=activityCount(items);
  const dayOpen=queryActive||openDays.has(group.key)||(initialPeriod&&!groupedHistory&&group.key===firstDay);
  let out='<details class="ca-day" data-ca-day="'+htmlEscape(group.key)+'" '+(dayOpen?'open':'')+'>';
  out+='<summary class="ca-day-summary"><span class="ca-day-main"><strong>'+htmlEscape(group.label)+'</strong><small>'+count+' '+(count===1?'activity':'activities')+' · '+' summed '+durationLabel(total(items))+'</small></span>';
  out+='<span class="ca-day-toggle"><span class="ca-day-show">Show activities</span><span class="ca-day-hide">Hide activities</span><span class="ca-day-arrow" aria-hidden="true">⌄</span></span></summary>';
  out+='<div class="ca-day-activities">';
  for(const record of items){
   out+='<button type="button" class="ca-history-item" data-ca-sheet="record" data-ca-id="'+htmlEscape(record.id)+'" data-ca-day-key="'+htmlEscape(record.dateKey||'')+'" aria-label="'+htmlEscape(record.name+' · '+record.category+' · '+record.time+' · '+record.duration)+'"><i class="ca-dot" style="background:'+historyColor(record.category)+'"></i><span class="ca-h-text"><strong title="'+htmlEscape(record.name)+'">'+htmlEscape(record.name)+'</strong><small>'+htmlEscape(record.time)+'</small></span><span class="ca-h-category" title="'+htmlEscape(record.category)+'">'+htmlEscape(record.category)+'</span><span class="ca-h-duration">'+htmlEscape(record.duration)+'</span><span aria-hidden="true">›</span></button>';
  }
  return out+'</div></details>';
 }
 if(groupedHistory){
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
   const monthOpen=queryActive||state.historyPeriod==='month'||openMonths.has(month.key)||(!wasMonthView&&monthIndex===0),monthCount=activityCount(month.items);
   page+='<details class="ca-history-month" data-ca-month="'+htmlEscape(month.key)+'" '+(monthOpen?'open':'')+'>';
   page+='<summary class="ca-history-month-summary"><span class="ca-history-group-main"><strong>'+htmlEscape(monthTitle(month.key))+'</strong><small>'+month.weeks.size+' '+(month.weeks.size===1?'week':'weeks')+' · '+monthCount+' '+(monthCount===1?'activity':'activities')+' · '+' summed '+durationLabel(total(month.items))+'</small></span><span class="ca-history-group-toggle"><span class="ca-history-group-show">Show weeks</span><span class="ca-history-group-hide">Hide weeks</span><span class="ca-history-group-arrow" aria-hidden="true">⌄</span></span></summary>';
   page+='<div class="ca-history-month-body">';
   for(const week of month.weeks.values()){
    const weekKey=month.key+'|'+week.key,weekCount=activityCount(week.items);
    page+='<details class="ca-history-week" data-ca-week="'+htmlEscape(weekKey)+'" '+(queryActive||openWeeks.has(weekKey)?'open':'')+'>';
    page+='<summary class="ca-history-week-summary"><span class="ca-history-group-main"><strong>'+htmlEscape(week.label)+'</strong><small>'+week.days.length+' '+(week.days.length===1?'day':'days')+' · '+weekCount+' '+(weekCount===1?'activity':'activities')+' · '+' summed '+durationLabel(total(week.items))+'</small></span>';
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
 const workspace=window.lifeosReadOnlyWorkspace?.(),originals=new Map((workspace?.sessions||[]).map(s=>[String(s.id),s]));
 for(const record of records)record.category=window.lifeosActivityClassification?.(originals.get(String(record.id))||{name:record.name})?.group||'Other / review';
 const signature=state.reviewPeriod+'|'+state.reviewGrouping+'|'+localKey(new Date())+'|'+records.map(x=>[x.id,x.dateKey,x.duration,x.rawDurationMs,x.name,x.category].join(':')).join('|')+'|'+stats.unique+'|'+stats.overlap+'|'+stats.distraction+'|'+Math.round((today?.total||0)/60000);
 if(target.dataset.caSignature===signature){state.lastReview=Date.now();return}
 const moreOpen=Boolean(target.querySelector('.ca-review-more')?.open);
 const groups=new Map(),activityGroups=new Map(),dates=new Map(),ids=new Set();
 let recordedMs=0;
 for(const x of records){
  const ms=(x.rawDurationMs??durationMs(x.duration));
  recordedMs+=ms;
  const group=state.reviewGrouping==='category'?x.category:x.name;
  groups.set(group,(groups.get(group)||0)+ms);activityGroups.set(x.name,(activityGroups.get(x.name)||0)+ms);
  const date=x.dateKey||(dayDate(x)?localKey(dayDate(x)):'');
  if(date)dates.set(date,(dates.get(date)||0)+ms);
  if(x.id)ids.add(x.id);
 }
 const sessionCount=ids.size||records.length;
 const sorted=[...groups].filter(([,ms])=>ms>0).sort((a,b)=>b[1]-a[1]),activities=[...activityGroups].filter(([,ms])=>ms>0).sort((a,b)=>b[1]-a[1]),top=sorted;
 const sum=top.reduce((n,x)=>n+x[1],0),palette=['#78efb9','#76bbff','#b790ff','#f2cd67','#e4a079','#b8c8d8'];
 const color=(name,index)=>state.reviewGrouping==='category'?historyColor(name):palette[index%palette.length];
 let angle=0;const parts=[];
 for(let i=0;i<top.length;i++){
  const next=angle+100*top[i][1]/(sum||1);
  parts.push(color(top[i][0],i)+' '+angle.toFixed(2)+'% '+next.toFixed(2)+'%');
  angle=next;
 }
 const scope={today:'Today',week:'This week',month:'This month',all:'All saved history'}[state.reviewPeriod]||'Recorded time';
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
  ['◇',activities.length?activities[0][0]:'—','Most tracked activity']
 ];
 page+='<div class="ca-metrics">';
 for(const [icon,value,title] of mainMetrics)
  page+='<div class="ca-metric"><div class="ca-micon">'+icon+'</div><b>'+htmlEscape(value)+'</b><span>'+title+'</span></div>';
 page+='</div>';
 if(state.reviewPeriod==='today')
  page+='<div class="ca-inline-note">Today, including ongoing activity: total recorded <b>'+htmlEscape(durationLabel(today?.total||0))+'</b>; unique tracked <b>'+htmlEscape(durationLabel(today?.unique||0))+'</b>; additional overlap <b>'+htmlEscape(durationLabel(today?.overlap||0))+'</b>. The finished activity total above excludes ongoing sessions.</div>';
 page+='<div class="ca-panel"><div class="ca-review-chart-head"><h3 class="ca-card-heading">Recorded time</h3><div class="ca-review-group" role="group" aria-label="Group recorded time"><button type="button" data-ca-review-group="category" aria-pressed="'+(state.reviewGrouping==='category')+'">Category</button><button type="button" data-ca-review-group="activity" aria-pressed="'+(state.reviewGrouping==='activity')+'">Activity</button></div></div>';
 if(!top.length)page+='<div class="ca-empty">No finished activity time in this period. Your historical data remains available under All.</div>';
 else {
  page+='<div class="ca-donut-area"><div class="ca-donut" role="img" aria-label="'+htmlEscape('Finished recorded time '+durationLabel(sum))+'" style="background:conic-gradient('+parts.join(',')+')"><div class="ca-donut-inner"><strong>'+durationLabel(sum)+'</strong><small>Finished</small></div></div><div class="ca-legend">';
  const legend=(item,i)=>'<button type="button" class="ca-legend-row" data-ca-review-drill="'+htmlEscape(item[0])+'" aria-label="Review '+htmlEscape(item[0]+', '+durationLabel(item[1])+', '+Math.round(item[1]*100/(sum||1))+' percent')+'"><span class="ca-legend-label"><i class="ca-dot" style="background:'+color(item[0],i)+'"></i><span>'+htmlEscape(item[0])+'</span></span><b>'+htmlEscape(durationLabel(item[1]))+' · '+Math.round(item[1]*100/(sum||1))+'%</b></button>';
  top.slice(0,5).forEach((item,i)=>{page+=legend(item,i)});
  if(top.length>5)page+='<details class="ca-review-more" '+(moreOpen?'open':'')+'><summary><span class="ca-review-show">Show</span><span class="ca-review-hide">Hide</span> '+(top.length-5)+' more</summary>'+top.slice(5).map((item,i)=>legend(item,i+5)).join('')+'</details>';
  page+='</div></div>';
 }
 page+='</div><div class="ca-panel"><h3 class="ca-card-heading">Recorded time by day</h3>';
 const current=new Date(),count=state.reviewPeriod==='today'?1:state.reviewPeriod==='week'?(current.getDay()+6)%7+1:state.reviewPeriod==='month'?Math.min(current.getDate(),14):14;
 let days=[];
 for(let i=count-1;i>=0;i--){
  const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);
  const key=localKey(d);
  days.push({key,label:d.toLocaleDateString(undefined,{weekday:'short'}),ms:dates.get(key)||0});
 }
 const max=Math.max(1,...days.map(x=>x.ms));
 if(days.some(x=>x.ms>0)){
  page+='<div class="ca-bars" aria-label="Time by day">';
  for(const item of days)page+='<div class="ca-bar '+(item.ms?'':'ca-zero')+'" style="height:'+(item.ms?Math.max(3,Math.round(item.ms/max*100)):0)+'%" title="'+htmlEscape(item.key)+' · '+durationLabel(item.ms)+'"><span>'+htmlEscape(item.label)+'</span></div>';
  const chartScope=state.reviewPeriod==='week'?'This week through today':state.reviewPeriod==='month'?'Latest '+count+' days of this month':state.reviewPeriod==='all'?'Latest '+count+' days':'Today';
  page+='</div><div class="ca-chart-caption">'+chartScope+' · total recorded time from saved finished activities; simultaneous activities may overlap.</div>';
 }else page+='<div class="ca-empty">No completed activity time found for the displayed days.</div>';
 page+='</div>';
 page+='<div class="ca-panel ca-distraction-band"><div><b>△ &nbsp; Distraction review</b><p>'+htmlEscape(stats.distraction)+'</p></div><button type="button" class="ca-soft-button" data-ca-sheet="distraction">Review ›</button></div>';
 if(activities.length){
  page+='<div class="ca-panel ca-insights-panel"><h3 class="ca-card-heading">Your activity insights</h3><div class="ca-insight-row"><span class="ca-insight-icon">✓</span><span><strong>'+htmlEscape(activities[0][0])+'</strong> is your most tracked finished activity in this period.</span></div>';
  page+='<div class="ca-insight-row"><span class="ca-insight-icon">✓</span><span>'+sessionCount+' finished session'+(sessionCount===1?'':'s')+' · '+durationLabel(recordedMs)+' recorded.</span></div></div>';
 }
 target.innerHTML=page;target.dataset.caSignature=signature;state.lastReview=Date.now();
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
function focusAlertControls(){
 const settings=window.LifeOSAlertEngineV221?.load?.(),available=Boolean(settings&&$('lo221-sound')&&$('lo221-vibrate'));
 return '<div class="ca-focus-alerts" aria-label="Focus alert settings">'
  +[['sound','Sound'],['vibration','Vibration']].map(([key,label])=>'<label><span>'+label+'</span><input type="checkbox" data-ca-focus-alert="'+key+'" '+(settings?.[key]?'checked ':'')+(available?'':'disabled')+'></label>').join('')
  +'</div><p class="ca-focus-alert-status" id="caFocusAlertStatus" role="status">'+(available?'':'Alert settings unavailable.')+'</p>';
}
function showRealFocus(){
 const session=readRealFocusState();
 if(!session)return;
 const remaining=focusRemainingMs(session),label=session.label||'Focus';
 const content='<div class="ca-focus-hero"><div class="ca-focus-icon">◎</div><h3>'+htmlEscape(label)+'</h3><p>Stay with one meaningful activity.</p></div>'
  +'<div class="ca-focus-ring ca-focus-real-ring" id="caFocusLiveRing"><div><strong id="caFocusLiveClock">'+focusClock(remaining)+'</strong><small id="caFocusLiveMode">Focus running</small></div></div>'
  +'<div class="ca-distraction-stats"><div><b id="caFocusProgress">'+(session.plannedMs?Math.round((1-remaining/session.plannedMs)*100):0)+'%</b><span>Focus progress</span></div>'
  +'<div><b id="caFocusLiveStatus">'+htmlEscape(session.mode)+'</b><span>Current status</span></div></div>'
  +'<div class="ca-preview-actions ca-focus-live-actions"><button type="button" class="ca-sheet-secondary" data-ca-focus-control="pause" id="caFocusPause">Pause</button>'
  +'<button type="button" class="ca-sheet-secondary" data-ca-focus-control="break" id="caFocusBreak">Break</button>'
  +'<button type="button" class="ca-sheet-primary" data-ca-close>Minimize</button>'
  +'<button type="button" class="ca-sheet-secondary ca-focus-end" data-ca-focus-control="end">End focus</button></div>'
  +focusAlertControls()+'<details class="ca-focus-options"><summary>Notifications and Do Not Disturb</summary>'+focusDeviceControls()+'</details>'
  +'<p class="ca-feature-footnote">Tracked activities run separately. Alerts depend on device permissions.</p>';
 openDialog('Focus session','Stay focused',content);
 dialog.dataset.caContext='focus-live';dialog.dataset.caFocusLive='1';
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
 const note=$('caFocusLiveMode');if(note)note.textContent=modes[session.mode]||session.mode;
 const progress=session.plannedMs?Math.max(0,Math.min(100,Math.round((1-remaining/session.plannedMs)*100))):0;
 const percent=$('caFocusProgress');if(percent)percent.textContent=progress+'%';
 const pause=$('caFocusPause');if(pause)pause.textContent=session.mode==='running'?'Pause':'Resume';
 const br=$('caFocusBreak');if(br)br.textContent=session.mode==='break'?'Resume focus':'Break';
 const ring=$('caFocusLiveRing');if(ring)ring.style.setProperty('--ca-focus-percent',progress+'%');
}
function refresh(){
 if(state.tab==='live')renderLive();
 if(state.tab==='history'&&Date.now()-state.lastHistory>8000)renderHistory();
 if(state.tab==='review'&&Date.now()-state.lastReview>8000)renderReview();
 updateRealFocusScreen();
}
function openDialog(title,subtitle,content){
 delete dialog.dataset.caFocusLive;
 delete dialog.dataset.caFocusStarting;
 delete dialog.dataset.caContext;
 delete dialog.dataset.caEditRecord;
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
 delete dialog.dataset.caContext;
 dialogBody.innerHTML='';
 if(previousFocus&&previousFocus.isConnected&&previousFocus.focus)previousFocus.focus();
}
function gapContext(gap,day){
 let before=day.recorded.filter(x=>x.b<=gap.a).sort((x,y)=>y.b-x.b)[0];
 let after=day.recorded.filter(x=>x.a>=gap.b).sort((x,y)=>x.a-y.a)[0];
 if(!before&&gap.a===day.start){
  const prior=new Date(day.start);prior.setDate(prior.getDate()-1);
  before=window.lifeosTodayAPlusSnapshot(Date.now(),prior.getTime()).recorded.filter(x=>x.b<=gap.a).sort((x,y)=>y.b-x.b)[0];
 }
 if(!after&&gap.b===day.end&&day.end<Date.now())
  after=window.lifeosTodayAPlusSnapshot(Date.now(),day.end).recorded.filter(x=>x.a>=gap.b).sort((x,y)=>x.a-y.a)[0];
 return {before,after};
}
window.lifeosTrackOpenGap=function(gap){
 if(!dialog)build();
 if(!dialog||!window.lifeosTodayAPlusGapValid?.(gap,gap.a,gap.b))return false;
 sheet('past');selectedGap={a:gap.a,b:gap.b};
 const d=window.lifeosTodayAPlusSnapshot(Date.now(),gap.a);
 const {before,after}=gapContext(gap,d);
 const context=e('p','ca-editor-footnote');context.id='caGapContext';
 const time=v=>new Date(v).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
 context.textContent='Unlogged '+time(gap.a)+'–'+time(gap.b)+' · Before: '+(before?.name||'Start of day')+' · After: '+(after?.name||(gap.b>=d.end?'End of day':'Now'));
 const guidance=dialogBody.querySelector('.ca-editor-footnote');
 if(guidance)guidance.textContent='Choose times within this unlogged interval. Existing activities cannot be overlapped.';
 dialogBody.prepend(context);dialog.dataset.caContext='gap';
 const precision=gap.b-gap.a<120000?19:16;
 for(const [id,value] of [['caPastStart',gap.a],['caPastEnd',gap.b]]){
  const input=$(id);input.step=precision===19?'1':'60';input.value=localInput(value).slice(0,precision);
  input.dataset.gapInitial=input.value;input.dataset.gapExact=String(value);
 }
 const summary=e('p','ca-gap-summary');summary.id='caGapSummary';summary.setAttribute('role','status');
 $('caPastEnd').after(summary);$('caPastNotes').rows=2;updateGapSummary();
 $('caDialogSubtitle').textContent='Record all or part of this unlogged interval.';
 return true;
};
// Today details use the same accessible Track sheet and existing history/review actions.
window.lifeosTrackOpenTodayItem=function(kind,key,at){
 if(!dialog)build();
 if(!dialog||typeof window.lifeosTodayAPlusSnapshot!=='function')return false;
 const selectionAt=kind==='gap'?Number(String(key).split(':')[0]):kind==='active'?Date.now():Number(at);
 const d=window.lifeosTodayAPlusSnapshot(Date.now(),Number.isFinite(selectionAt)?selectionAt:Date.now());
 const time=(v,seconds=false)=>new Date(v).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',...(seconds?{second:'2-digit'}:{})});
 const line=(label,value)=>'<div class="ca-record-detail"><span>'+htmlEscape(label)+'</span><strong>'+htmlEscape(value)+'</strong></div>';
 let content='';
 if(kind==='gap'){
  const [a,b]=String(key).split(':').map(Number);
  if(!window.lifeosTodayAPlusGapValid?.({a,b},a,b))return false;
  const {before,after}=gapContext({a,b},d);
  content=line('Activity','Unlogged interval')+line('Category','Unknown')+line('Start',time(a,b-a<60000))+line('End',time(b,b-a<60000))+line('Duration',exactDuration(b-a))+line('Status','Unlogged / unknown')+line('Before',before?.name||'Start of day')+line('After',after?.name||(b>=d.end?'End of day':'Now'))+line('Concurrent','None recorded');
  content+='<button type="button" class="ca-sheet-primary" data-ca-gap="'+a+':'+b+'">Log activity</button><button type="button" class="ca-sheet-secondary" data-ca-close>Leave unknown</button>';
  openDialog('Unlogged interval','Review this time without assigning a category.',content);dialog.dataset.caContext='details';return true;
 }
 if(kind==='active'){
  const active=d.active.find(z=>String(z.id)===String(key));
  const original=window.lifeosReadOnlyWorkspace?.().sessions.find(z=>String(z.id)===String(key));
  if(!active||!original)return false;
  const lastEnd=original.segments?.at(-1)?.end;
  const endLabel=active.status==='running'?'In progress':Number.isFinite(lastEnd)?time(lastEnd):'Paused';
  const category=window.lifeosActivityClassification?.(original)?.group||'Other / review';
  content=line('Activity',active.name)+line('Category',category)+line('Start',time(active.startAt))+line('End',endLabel)+line('Duration',exactDuration(active.elapsedMs))+line('Status',active.status==='paused'?'Paused':'Running');
  const own=d.recorded.filter(z=>String(z.id)===String(active.id));
  const overlaps=[];
  for(const x of own)for(const z of d.recorded){const ms=Math.min(x.b,z.b)-Math.max(x.a,z.a);if(String(z.id)!==String(x.id)&&ms>=60000)overlaps.push({z,ms})}
  content+='<h3 class="ca-detail-heading">Concurrent activities</h3>'+(overlaps.length?overlaps.map(({z,ms})=>'<button type="button" class="ca-sheet-secondary" data-ca-today-kind="record" data-ca-today-id="'+htmlEscape(z.id)+'" data-ca-today-at="'+z.a+'">'+htmlEscape(z.name)+' · '+htmlEscape(exactDuration(ms))+'</button>').join(''):'<p class="ca-editor-footnote">No concurrent activities of one minute or longer.</p>');
  content+='<button type="button" class="ca-sheet-primary" data-ca-today-record="'+htmlEscape(active.id)+'" data-ca-today-status="'+htmlEscape(active.status)+'">Open in Track</button><button type="button" class="ca-sheet-secondary" data-ca-close>Close</button>';
  openDialog('Activity in progress','Recorded activity details',content);dialog.dataset.caContext='details';return true;
 }
 const planned=kind==='plan';
 const x=planned?d.plans.find(z=>String(z.id)===String(key)):d.recorded.find(z=>String(z.id)===String(key)&&z.a===Number(at));
 if(!x)return false;
 const a=planned?x.startAt:x.a,b=planned?x.endAt:x.b;
 const status=String(planned?(x.status||'planned'):(x.status||'finished'));
 const statusLabel=status.charAt(0).toUpperCase()+status.slice(1);
 content=line('Activity',x.name)+line('Category',planned?'Not classified':x.category)+line('Start',time(a,b-a<60000))+line('End',time(b,b-a<60000))+line('Duration',exactDuration(b-a))+line('Status',statusLabel);
 const others=(planned?d.plans:d.recorded).filter(z=>String(z.id)!==String(x.id)).map(z=>({z,ms:Math.max(0,Math.min(b,planned?z.endAt:z.b)-Math.max(a,planned?z.startAt:z.a))})).filter(z=>z.ms>=60000);
 content+='<h3 class="ca-detail-heading">Concurrent '+(planned?'commitments':'activities')+'</h3>'+(others.length?others.map(({z,ms})=>'<button type="button" class="ca-sheet-secondary" data-ca-today-kind="'+(planned?'plan':'record')+'" data-ca-today-id="'+htmlEscape(z.id)+'" data-ca-today-at="'+(planned?z.startAt:z.a)+'">'+htmlEscape(z.name)+' · '+htmlEscape(exactDuration(ms))+'</button>').join(''):'<p class="ca-editor-footnote">No concurrent '+(planned?'commitments':'activities')+' of one minute or longer.</p>');
 if(planned){
  content+='<button type="button" class="ca-sheet-primary" data-ca-today-nav="schedule">Open planning</button>';
 }else{
  const original=window.lifeosReadOnlyWorkspace?.().sessions.find(z=>String(z.id)===String(x.id));
  const locked=original&&(original.seedBatch||['development-starter','assumed-demo'].includes(original.source));
  const categories=activityCategories(x.category);
  content+='<label class="ca-form-label" for="caTodayCategory">Review category</label><select id="caTodayCategory" class="ca-input" '+(locked?'disabled':'')+'>'+categories.map(c=>'<option '+(c===x.category?'selected':'')+'>'+htmlEscape(c)+'</option>').join('')+'</select>';
  content+=locked?'<p class="ca-editor-footnote">Example records cannot be edited here.</p>':'<button type="button" class="ca-sheet-secondary" data-ca-category-save="'+htmlEscape(x.id)+'">Save category</button><p id="caCategoryMessage" class="ca-editor-footnote" role="status"></p>';
  content+='<button type="button" class="ca-sheet-primary" data-ca-today-record="'+htmlEscape(x.id)+'" data-ca-today-status="'+htmlEscape(status)+'" data-ca-today-day="'+htmlEscape(localKey(new Date(x.a)))+'">'+(status==='finished'?'Open in History / edit':'Open in Track')+'</button>';
 }
 content+='<button type="button" class="ca-sheet-secondary" data-ca-close>Close</button>';
 openDialog(planned?'Planned commitment':'Activity details',planned?'Planning details':'Recorded interval details',content);dialog.dataset.caContext='details';return true;
};
function historyRecordFacts(id){
 const workspace=window.lifeosReadOnlyWorkspace?.(),sessions=Array.isArray(workspace?.sessions)?workspace.sessions:[],session=sessions.find(s=>String(s.id)===String(id)),engine=window.LifeOSUnifiedAnalytics;
 if(!session||!engine?.sessionIntervals||!engine?.unionDuration||!engine?.intersectionDuration)return {session:null,intervals:[],pauses:[],concurrent:[]};
 const timestamp=value=>value==null?NaN:(Number.isFinite(Number(value))?Number(value):Date.parse(value));
 const now=Date.now(),intervals=engine.sessionIntervals(session,now).slice().sort((a,b)=>a.start-b.start);
 const recorded=intervals.reduce((sum,x)=>sum+x.end-x.start,0),start=timestamp(session.startAt),end=timestamp(session.endAt);
 const merged=[];
 for(const item of intervals){const last=merged[merged.length-1];if(last&&item.start<=last.end)last.end=Math.max(last.end,item.end);else merged.push({start:item.start,end:item.end})}
 const events=(Array.isArray(workspace.events)?workspace.events:[]).filter(e=>String(e.sessionId)===String(id));
 const pauseLabel=at=>events.some(e=>['PAUSE','BREAK_START'].includes(e.type)&&Math.abs(timestamp(e.time)-at)<1000)?'Paused':'Unrecorded interval';
 const pauses=[];
 for(let i=1;i<merged.length;i++)if(merged[i].start-merged[i-1].end>=60000)pauses.push({start:merged[i-1].end,end:merged[i].start,label:pauseLabel(merged[i-1].end),resumed:true});
 if(Number.isFinite(end)&&merged.length&&end-merged[merged.length-1].end>=60000){const a=merged[merged.length-1].end;pauses.push({start:a,end,label:pauseLabel(a),resumed:false})}
 const validBounds=Number.isFinite(start)&&Number.isFinite(end)&&end>=start&&intervals.length>0;
 const clipped=validBounds?intervals.map(x=>({start:Math.max(start,x.start),end:Math.min(end,x.end)})).filter(x=>x.end>x.start):[];
 const unrecorded=validBounds?Math.max(0,end-start-engine.unionDuration(clipped)):null;
 const concurrent=[];
 for(const other of sessions){
  if(String(other.id)===String(id))continue;
  const overlap=engine.intersectionDuration(intervals,engine.sessionIntervals(other,now));
  if(overlap>=60000)concurrent.push({id:String(other.id),name:String(other.name||'Activity'),status:other.status,overlap});
 }
 concurrent.sort((a,b)=>b.overlap-a.overlap||a.name.localeCompare(b.name));
 return {session,intervals,recorded,start,end,unrecorded,pauses,concurrent};
}
function sheet(type,id,dayKey){
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
 const current=id?live.find(x=>x.id===id):live[0];
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
   +'<button class="ca-detail-action" data-ca-act="break" data-ca-id="'+htmlEscape(current.id)+'" '+(current.status==='paused'?'disabled aria-label="Resume this activity before starting a break"':'')+'><b>☕</b><span>Break</span></button>'
   +'<button class="ca-detail-action" data-ca-act="switch" data-ca-id="'+htmlEscape(current.id)+'"><b>⇄</b><span>Switch</span></button>'
   +'<button class="ca-detail-action" data-ca-act="edit" data-ca-id="'+htmlEscape(current.id)+'"><b>✎</b><span>Edit</span></button></div>';
  content+='<button class="ca-detail-finish" data-ca-act="finish" data-ca-id="'+htmlEscape(current.id)+'">■ &nbsp; '+(pendingFinish(current.id)?'Confirm finish':'Finish activity')+'</button>';
  openDialog('Activity in progress','Timer details and advanced controls',content);return;
 }
 if(type==='record'){
  const history=readHistory(),rec=history.find(x=>x.id===id&&(!dayKey||x.dateKey===dayKey))||history.find(x=>x.id===id);if(!rec)return;
  const facts=historyRecordFacts(id),source=facts.session,label=(rec.time||'').includes('Development example')?'Development example':(rec.time||'').includes('Estimated')?'Estimated':'Recorded';
  const category=source?(window.lifeosActivityClassification?.(source)?.group||'Other / review'):'Unavailable';
  const stamp=value=>Number.isFinite(value)?new Date(value).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'Unavailable';
  const line=(name,value,attribute='')=>'<div class="ca-record-detail"><span>'+htmlEscape(name)+'</span><strong '+attribute+'>'+htmlEscape(value)+'</strong></div>';
  const dayDuration=Number.isFinite(rec.rawDurationMs)?exactDuration(rec.rawDurationMs):rec.duration;
  let content='<div class="ca-record-hero"><div class="ca-record-icon" aria-hidden="true">'+categoryGlyph(category)+'</div><div><h3>'+htmlEscape(rec.name)+'</h3><p><span data-ca-record-hero-category>'+htmlEscape(category)+'</span> · '+htmlEscape(label)+'</p></div></div>';
  content+='<div class="ca-record-stats"><div><small>Selected day</small><strong data-ca-record-day>'+htmlEscape(dayDuration)+'</strong></div>'
   +'<div><small>Full recorded time</small><strong data-ca-record-full>'+htmlEscape(facts.intervals.length?exactDuration(facts.recorded):'Unavailable')+'</strong></div></div>';
  const status=source?.status==='finished'?'Finished':source?.status==='paused'?'Paused':source?.status==='running'?'Running':'Unavailable';
  content+=line('Category',category,'data-ca-record-category')+line('Status',status)+line('Start',stamp(facts.start),'data-ca-record-start')+line('Finish',stamp(facts.end),'data-ca-record-end')
   +line('Selected day',rec.day)+line('Time and source',rec.time)+line('Unrecorded within session',facts.unrecorded==null?'Unavailable':exactDuration(facts.unrecorded));
  content+='<h3 class="ca-history-detail-heading">Pause and resume</h3>';
  if(!source||!facts.intervals.length)content+='<p class="ca-history-detail-empty">Pause details are unavailable.</p>';
  else if(!facts.pauses.length)content+='<p class="ca-history-detail-empty">No intervals of one minute or longer.</p>';
  else for(const pause of facts.pauses)content+='<div class="ca-history-pause"><strong>'+htmlEscape(pause.label)+' · '+htmlEscape(exactDuration(pause.end-pause.start))+'</strong><small>'+htmlEscape(stamp(pause.start))+' – '+htmlEscape(stamp(pause.end))+(pause.resumed?' · Resumed':' · Ended')+'</small></div>';
  content+='<h3 class="ca-history-detail-heading">Concurrent activities</h3>';
  if(!source)content+='<p class="ca-history-detail-empty">Concurrent details are unavailable.</p>';
  else if(!facts.concurrent.length)content+='<p class="ca-history-detail-empty">No overlaps of one minute or longer.</p>';
  else for(const other of facts.concurrent){
   const active=other.status==='running'||other.status==='paused',available=active||history.some(item=>String(item.id)===other.id);
   content+=available?'<button type="button" class="ca-history-related" data-ca-sheet="'+(active?'activity':'record')+'" data-ca-id="'+htmlEscape(other.id)+'"><span>'+htmlEscape(other.name)+'</span><strong>'+htmlEscape(exactDuration(other.overlap))+' overlap ›</strong></button>':'<p class="ca-history-detail-empty">'+htmlEscape(other.name)+' · '+htmlEscape(exactDuration(other.overlap))+' overlap</p>';
  }
  if(source){
   const locked=source.seedBatch||['development-starter','assumed-demo'].includes(source.source);
   content+='<details class="ca-history-category"><summary>Correct category</summary><label class="ca-form-label" for="caHistoryCategory">Category</label><select id="caHistoryCategory" class="ca-input" data-ca-saved-category="'+htmlEscape(category)+'" '+(locked?'disabled':'')+'>'+activityCategories(category).map(c=>'<option '+(c===category?'selected':'')+'>'+htmlEscape(c)+'</option>').join('')+'</select>';
   content+=locked?'<p class="ca-editor-footnote">Example records cannot be edited here.</p>':'<button type="button" class="ca-sheet-secondary" data-ca-history-category-save="'+htmlEscape(rec.id)+'" disabled>Save category</button><p id="caHistoryCategoryMessage" class="ca-history-category-status" role="status"></p>';
   content+='</details>';
  }
  content+='<h3 class="ca-history-detail-heading">Notes</h3><p class="ca-history-notes">'+htmlEscape(source?.notes||'No notes')+'</p>';
  content+='<div class="ca-record-foot"><button type="button" class="ca-sheet-primary" data-ca-edit-record="'+htmlEscape(rec.id)+'">Edit</button>'
   +'<button type="button" class="ca-sheet-secondary ca-record-delete" data-ca-delete-record="'+htmlEscape(rec.id)+'">Delete</button>'
   +'<button type="button" class="ca-sheet-secondary" data-ca-close>Close</button></div>';
  openDialog('Activity details','Saved activity record',content);dialog.dataset.caContext='history-record';return;
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
  openDialog('Edit Activity','Update an existing activity',form);return;
 }
 if(type==='break'){
  const activity=live.find(x=>x.id===id)||current;
  const content='<div class="ca-focus-hero"><div class="ca-focus-icon">☕</div><h3>Time to recharge</h3><p>Pause briefly, then return to what matters.</p></div>'
   +'<div class="ca-focus-ring"><div><strong>10:00</strong><small>Suggested break · no timer set</small></div></div>'
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
  let content='<div class="ca-focus-hero"><div class="ca-focus-icon">◎</div><h3>Focus on what matters</h3><p>Choose an activity and duration.</p></div>';
  content+='<label class="ca-form-label" for="caFocusActivity">Focus activity</label><select class="ca-input" id="caFocusActivity">';
  for(const row of choices)content+='<option value="'+htmlEscape(row.id)+'">'+htmlEscape(row.name)+'</option>';
  content+='</select><label class="ca-form-label" for="caFocusDuration">Focus duration</label>';
  content+='<select id="caFocusDuration" class="ca-input"><option value="25">25 minutes</option><option value="45" selected>45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select>';
  content+=focusAlertControls();
  content+='<p id="caFocusError" role="alert" class="ca-inline-error"></p><button class="ca-sheet-primary" data-ca-focus-start>Start Focus</button>';
  content+='<details class="ca-focus-options"><summary>Notifications and Do Not Disturb</summary>'+focusDeviceControls()+'</details>';
  content+='<p class="ca-feature-footnote">Tracked activities run separately. Alerts depend on device permissions.</p>';
  openDialog('Focus Mode','Choose your session',content);dialog.dataset.caContext='focus-setup';return;
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
 const quick=event.target.closest('[data-ca-quick-start]');if(quick){const source=Array.from(document.querySelectorAll('#quick button[data-name]')).find(b=>b.dataset.name===quick.dataset.caQuickStart);if(source){source.click();setTimeout(refresh,60)}return}
 const customToggle=event.target.closest('[data-ca-history-custom-toggle]');
 if(customToggle){const panel=$('caHistoryCustom');if(panel){panel.hidden=!panel.hidden;customToggle.setAttribute('aria-expanded',String(!panel.hidden))}return}
 if(event.target.closest('[data-ca-history-apply]')){
  const from=$('caHistoryFrom')?.value||'',to=$('caHistoryTo')?.value||'',today=localKey(new Date());
  const error=$('caHistoryRangeError');
  if(!historyDate(from)||!historyDate(to)||from>to||to>today){if(error)error.textContent='Choose valid dates in order, ending no later than today.';return}
  state.historyFrom=state.historyDraftFrom=from;state.historyTo=state.historyDraftTo=to;
  state.historyAnchor=to;state.historyMonth=to.slice(0,7);state.historyPeriod='custom';state.historyCategory='';state.historyActivity='';renderHistory();return;
 }
 const period=event.target.closest('button[data-ca-period]');if(period){
  const previous=state.historyPeriod,next=period.dataset.caPeriod;
  if(previous==='month'&&next!=='month')state.historyAnchor=state.historyMonth+'-01';
  if(next==='month'&&previous!=='month')state.historyMonth=state.historyAnchor.slice(0,7);
  const custom=$('caHistoryCustom');if(custom)custom.hidden=true;
  state.historyPeriod=next;state.historyCategory='';state.historyActivity='';renderHistory();return
 }
 const move=event.target.closest('[data-ca-history-move]');
 if(move&&!move.disabled){
  const direction=Number(move.dataset.caHistoryMove),range=historyWindow(state.historyPeriod);
  const date=new Date(range.start);
  if(state.historyPeriod==='today')date.setDate(date.getDate()+direction);
  else if(state.historyPeriod==='week')date.setDate(date.getDate()+direction*7);
  else if(state.historyPeriod==='month')date.setMonth(date.getMonth()+direction);
  else if(state.historyPeriod==='year')date.setFullYear(date.getFullYear()+direction);
  if(date<=range.today){state.historyAnchor=localKey(date);state.historyMonth=localMonthKey(date);renderHistory()}
  return;
 }
 const monthMove=event.target.closest('[data-ca-month-move]');
 if(monthMove&&!monthMove.disabled){
  const parts=state.historyMonth.split('-').map(Number);
  const date=new Date(parts[0],parts[1]-1+Number(monthMove.dataset.caMonthMove),1,12);
  const next=localMonthKey(date);
  if(next<=localMonthKey(new Date())){state.historyMonth=next;renderHistory()}
  return
 }
 const grouping=event.target.closest('button[data-ca-review-group]');
 if(grouping){state.reviewGrouping=grouping.dataset.caReviewGroup;renderReview();return}
 const drill=event.target.closest('button[data-ca-review-drill]');
 if(drill){
  state.historyPeriod=state.reviewPeriod;state.historyAnchor=localKey(new Date());state.historyMonth=localMonthKey(new Date());
  state.historyCategory=state.reviewGrouping==='category'?drill.dataset.caReviewDrill:'';
  state.historyActivity=state.reviewGrouping==='activity'?drill.dataset.caReviewDrill:'';
  state.historyOrder='newest';state.query='';chooseTab('history');return;
 }
 const review=event.target.closest('[data-ca-review-period]');if(review){state.reviewPeriod=review.dataset.caReviewPeriod;renderReview();return}
 const act=event.target.closest('[data-ca-act]');if(act){
  if(act.dataset.caAct==='break'){sheet('break',act.dataset.caId);return}
  if(act.dataset.caAct==='finish'){
   const result=finishActivity(act.dataset.caId);
   if(!result.ok){act.textContent='Unable to finish; try again';return}
   renderLive();return;
  }
  originalAction(act.dataset.caId,act.dataset.caAct);setTimeout(refresh,60);return;
 }
 const open=event.target.closest('[data-ca-sheet]');if(open)sheet(open.dataset.caSheet,open.dataset.caId,open.dataset.caDayKey);
}
async function handleDialogClick(event){
 const todayItem=event.target.closest('[data-ca-today-kind]');
 if(todayItem){window.lifeosTrackOpenTodayItem(todayItem.dataset.caTodayKind,todayItem.dataset.caTodayId,Number(todayItem.dataset.caTodayAt));return}
 const category=event.target.closest('[data-ca-category-save]');
 if(category){
  const detail={id:category.dataset.caCategorySave,fields:{category:$('caTodayCategory')?.value}};
  window.dispatchEvent(new CustomEvent('lifeos-v252-save-review',{detail}));
  $('caCategoryMessage').textContent=detail.result?.message||'Category could not be saved.';
  return;
 }
 const historyCategory=event.target.closest('button[data-ca-history-category-save]');
 if(historyCategory){
  const detail={id:historyCategory.dataset.caHistoryCategorySave,fields:{category:$('caHistoryCategory')?.value}};
  window.dispatchEvent(new CustomEvent('lifeos-v252-save-review',{detail}));
  const message=$('caHistoryCategoryMessage');if(message){message.textContent=detail.result?.message||'Category could not be saved.';message.classList.toggle('ca-history-category-error',!detail.result?.ok)}
  if(detail.result?.ok){
   const value=$('caHistoryCategory')?.value||'Other / review';
   if($('caHistoryCategory'))$('caHistoryCategory').dataset.caSavedCategory=value;historyCategory.disabled=true;
   const categoryText=dialogBody.querySelector('[data-ca-record-category]'),hero=dialogBody.querySelector('[data-ca-record-hero-category]'),icon=dialogBody.querySelector('.ca-record-icon');
   if(categoryText)categoryText.textContent=value;if(hero)hero.textContent=value;if(icon)icon.innerHTML=categoryGlyph(value);
   const history=$('caHistory');if(history)delete history.dataset.caSignature;renderHistory();renderReview();
  }
  return;
 }
 const todayNav=event.target.closest('[data-ca-today-nav]');
 if(todayNav){const view=todayNav.dataset.caTodayNav;closeDialog();document.querySelector('#lifeosNavigation [data-view="'+view+'"]')?.click();return}
 const todayRecord=event.target.closest('[data-ca-today-record]');
 if(todayRecord){
  const id=todayRecord.dataset.caTodayRecord,status=todayRecord.dataset.caTodayStatus,dayKey=todayRecord.dataset.caTodayDay;
  closeDialog();document.querySelector('#lifeosNavigation [data-view="tracking"]')?.click();
  if(status==='finished'){updateHistorySource();chooseTab('history');renderHistory();sheet('record',id,dayKey)}
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
 if(act){
  if(act.dataset.caAct==='finish'){
   const result=finishActivity(act.dataset.caId);
   if(!result.ok){act.textContent='Unable to finish; try again';return}
   if(result.pending){
    act.textContent='Confirm finish';
    let note=dialogBody.querySelector('.ca-finish-confirmation');if(!note){note=e('p','ca-editor-footnote ca-finish-confirmation');note.setAttribute('role','status');act.before(note)}
    note.textContent='Tap Confirm finish within 15 seconds to save this activity.';
    setTimeout(()=>{if(act.isConnected&&!pendingFinish(act.dataset.caId)){act.textContent='Finish activity';note.textContent='Confirmation expired; tap Finish activity again.'}},15100);
   }else{closeDialog();setTimeout(refresh,100)}
   return;
  }
  const ok=originalAction(act.dataset.caId,act.dataset.caAct);if(ok){closeDialog();setTimeout(refresh,100)}return;
 }
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
 const editRecord=event.target.closest('button[data-ca-edit-record]');
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
  if(typeof window.lifeosSaveEditedActivity!=='function'){if(alert)alert.textContent='The activity editor is unavailable. No changes were saved.';return}
  const button=event.target.closest('[data-ca-save-edit]');if(button.disabled)return;button.disabled=true;
  try{
   const result=await window.lifeosSaveEditedActivity();
   if(result?.ok){if(button.isConnected)closeDialog();setTimeout(()=>{state.lastHistory=0;renderHistory();renderReview()},120)}
   else if(alert?.isConnected)alert.textContent=result?.message||'Changes were not saved. Your original activity is preserved.';
  }catch(error){if(alert?.isConnected)alert.textContent='Unable to confirm the edit: '+String(error?.message||error)}
  finally{if(button.isConnected)button.disabled=false}
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
  const start=selectedGap?gapInputTime('caPastStart'):new Date(startString).getTime(),end=selectedGap?gapInputTime('caPastEnd'):new Date(endString).getTime();
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
   for(const [id,value] of [['pastName',name],['pastStart',selectedGap?localInput(start):startString],['pastEnd',selectedGap?localInput(end):endString],['pastNotes',$('caPastNotes')?.value||'']]){
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
   const gapGuard=selectedGap?{...selectedGap,startAt:start,endAt:end}:null;
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
   const remaining=selectedGap?window.lifeosTodayAPlusSnapshot(Date.now(),selectedGap.a).gaps.map(g=>({a:Math.max(g.a,selectedGap.a),b:Math.min(g.b,selectedGap.b)})).filter(g=>g.b>g.a):[];
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
  const action=focusControl.dataset.caFocusControl,control=$(map[action]),before=readRealFocusState();
  if(!control)return;
  control.click();
  const after=readRealFocusState(),expected=action==='pause'?(before?.mode==='running'?'paused':'running'):action==='break'?(before?.mode==='break'?'running':'break'):null;
  if((action==='end'&&after)||(action!=='end'&&after?.mode!==expected)){
   let note=$('caFocusActionError');if(!note){note=e('p','ca-inline-error');note.id='caFocusActionError';note.setAttribute('role','alert');focusControl.closest('.ca-focus-live-actions')?.after(note)}
   note.textContent='Could not save this Focus change. The previous session remains active.';return;
  }
  if(action==='end'){closeDialog();return}
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
