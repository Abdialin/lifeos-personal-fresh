/* LifeOS V248 — read-only timeline for currently open timers.
 * Tracks segment boundaries and meaningful pauses without rewriting history.
 * The existing LifeOSReviewTimer opens the actual session controls. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSTimerHistoryV248=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const MIN=60000;
function analyze(session,at=Date.now(),pauseThresholdMinutes=5){
 if(!session||!['running','paused'].includes(session.status)||!Array.isArray(session.segments))
  return null;
 if(!Number.isFinite(at)||!Number.isFinite(pauseThresholdMinutes)||pauseThresholdMinutes<0)throw Error('Invalid review time');
 const segments=[],pauses=[],threshold=pauseThresholdMinutes*MIN;
 for(const seg of session.segments){
  if(!seg||!Number.isFinite(seg.start)||seg.start>at)continue;
  let end=seg.end==null?(session.status==='running'?at:null):Number(seg.end);
  if(end!==null&&(!Number.isFinite(end)||end<seg.start))continue;
  if(end!==null)end=Math.min(end,at);
  segments.push({start:seg.start,end,endOpen:seg.end===null});
 }
 segments.sort((a,b)=>a.start-b.start);
 let activeMs=0,previousEnd=null,firstStart=null;
 for(const seg of segments){
  if(firstStart===null)firstStart=seg.start;
  if(previousEnd!==null&&seg.start>previousEnd&&seg.start-previousEnd>=threshold)
   pauses.push({start:previousEnd,end:seg.start,ms:seg.start-previousEnd});
  if(seg.end!==null)activeMs+=seg.end-seg.start;
  if(seg.end!==null)previousEnd=seg.end;
  else previousEnd=null;
 }
 const last=segments[segments.length-1];
 const pauseNow=session.status==='paused'&&last?.end!==null&&last?.end<=at;
 return {id:String(session.id),name:String(session.name||'Activity'),status:session.status,
  firstStart,segments,pauses,activeMs,pauseNowSince:pauseNow?last.end:null,
  elapsedWallMs:firstStart===null?0:at-firstStart,
  interruptedCount:pauses.length,
  note:'Read-only review; elapsed time excludes paused intervals.'};
}
function fmt(ms){const seconds=Math.floor(Math.max(0,ms)/1000),hours=Math.floor(seconds/3600);return hours+'h '+String(Math.floor(seconds/60)%60).padStart(2,'0')+'m'}
function time(at){return new Date(at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function mount(){
 const panel=root.document?.getElementById('trackActivePanel');
 if(!panel||root.document.getElementById('lo248-timer-history'))return;
 const box=root.document.createElement('details');box.id='lo248-timer-history';
 box.style.cssText='margin-top:14px;padding:13px 15px;border:1px solid #4d6d86;border-radius:14px;background:#10283b;color:#e6f5ff';
 const summary=root.document.createElement('summary');summary.textContent='Timer timeline · pauses and resumptions';
 summary.style.cssText='min-height:42px;font-size:16px;font-weight:700;cursor:pointer';
 const body=root.document.createElement('div');body.id='lo248-content';body.style.cssText='display:grid;gap:12px;padding-top:12px';
 box.append(summary,body);
 panel.append(box);
 function refresh(){
  if(!box.open)return;
  const state=root.lifeosReadOnlyWorkspace?.();
  const sessions=Array.isArray(state?.sessions)?state.sessions:[];
  const open=sessions.filter(s=>s&&['running','paused'].includes(s.status));
  body.replaceChildren();
  if(!open.length){body.textContent='No open timers.';return}
  const at=Date.now();
  for(const session of open.slice(0,25)){
   const report=analyze(session,at);
   if(!report)continue;
   const item=root.document.createElement('article');item.style.cssText='border:1px solid #43607a;border-radius:12px;padding:12px;background:#172f45;min-width:0';
   const heading=root.document.createElement('strong');
   heading.textContent=report.name+' · '+(report.status==='running'?'Running':'Paused');
   item.append(heading);
   const caption=root.document.createElement('p');caption.style.cssText='font-size:13px;color:#c6d8e8';
   caption.textContent='Started '+(report.firstStart===null?'unknown':time(report.firstStart))+
    ' · active '+fmt(report.activeMs)+' · total clock span '+fmt(report.elapsedWallMs);
   item.append(caption);
   for(const segment of report.segments){
    const row=root.document.createElement('div');
    row.style.cssText='padding:5px 0;border-top:1px solid #324e68;font-size:13px';
    row.textContent='Tracked '+time(segment.start)+' → '+(segment.endOpen&&report.status==='running'?'running now':segment.end===null?'open':time(segment.end));
    item.append(row);
   }
   for(const pause of report.pauses){
    const row=root.document.createElement('div');
    row.style.cssText='padding:5px 0;color:#f0d1a4;font-size:13px';
    row.textContent='Pause '+time(pause.start)+' → '+time(pause.end)+' ('+fmt(pause.ms)+', excluded from tracked time)';
    item.append(row);
   }
   if(report.pauseNowSince!==null){
    const row=root.document.createElement('p');row.style.cssText='font-size:13px;color:#f0d1a4';
    row.textContent='Currently paused since '+time(report.pauseNowSince)+'; paused time does not count.';
    item.append(row);
   }
   const button=root.document.createElement('button');button.type='button';button.className='btn outline';
   button.style.cssText='min-height:44px;margin-top:10px';button.textContent='Review or correct this timer →';
   button.addEventListener('click',()=>{if(typeof root.LifeOSReviewTimer==='function')root.LifeOSReviewTimer(report.id)});
   item.append(button);body.append(item);
  }
  if(open.length>25){const p=root.document.createElement('p');p.textContent='Showing 25 of '+open.length+' open timers.';body.append(p)}
 }
 box.addEventListener('toggle',refresh);
 root.addEventListener?.('lifeos-v77-tracking-changed',refresh);
 root.document.addEventListener('visibilitychange',()=>{if(!root.document.hidden)refresh()});
 root.setInterval?.(()=>{if(box.open&&root.document.visibilityState!=='hidden')refresh()},60000);
}
if(root.document){
 const attach=()=>{mount();if(!root.document.getElementById('lo248-timer-history'))root.setTimeout?.(mount,800)};
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
}
return {analyze,fmt,mount};
});
