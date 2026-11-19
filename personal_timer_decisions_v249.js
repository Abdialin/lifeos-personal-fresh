/* V249: actionable duration review for all open LifeOS Beta timers.
   Advisory only. No record writes and no automatic finishing. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSTimerDecisionsV249=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const MIN=60000;
function assess(sessions,at=Date.now(),guard=root.LifeOSDurationGuardV78){
 if(!Number.isFinite(at))throw Error('Invalid timestamp');
 return (Array.isArray(sessions)?sessions:[]).filter(s=>s&&['running','paused'].includes(s.status)).map(s=>{
  const configured=guard?.valid?.(s)||null;
  const expected=configured?.targetMinutes??guard?.suggestion?.(s.name)??60;
  const elapsed=Math.max(0,Number(guard?.elapsed?.(s,at)||0));
  const overdue=Math.max(0,elapsed-expected*MIN);
  const remaining=Math.max(0,expected*MIN-elapsed);
  const overdueLimit=Math.max(30,expected)*MIN;
  const category=s.status==='paused'?'paused':overdue>=overdueLimit?'needs-review':overdue>0?'overdue':remaining<=10*MIN?'ending-soon':'on-track';
  return {id:String(s.id),name:String(s.name||'Activity'),status:s.status,category,
   expectedMinutes:expected,configured:!!configured,mode:configured?.mode||'suggested',
   elapsedMs:elapsed,remainingMs:remaining,overdueMs:overdue};
 }).sort((a,b)=>{
  const order={'needs-review':0,'overdue':1,'ending-soon':2,'on-track':3,'paused':4};
  return order[a.category]-order[b.category]||b.overdueMs-a.overdueMs;
 });
}
const fmt=ms=>{
 const m=Math.floor(Math.max(0,ms)/MIN);return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m';
};
function mount(){
 const doc=root.document,host=doc?.getElementById('trackActivePanel');
 if(!host||doc.getElementById('lo249-decisions'))return;
 const box=doc.createElement('details');box.id='lo249-decisions';
 box.style.cssText='padding:13px 15px;margin:14px 0;border:1px solid #6a9d9c;border-radius:16px;background:#102e40;color:#ecffff';
 const summary=doc.createElement('summary');summary.textContent='Timer check-in · review, finish or extend';
 summary.style.cssText='cursor:pointer;min-height:46px;font-size:16px;font-weight:700';
 const body=doc.createElement('div');body.id='lo249-body';body.style.cssText='display:grid;gap:10px;padding-top:12px';
 box.append(summary,body);
 const anchor=doc.getElementById('lo78-duration')||doc.getElementById('lo248-timer-history');
 if(anchor)anchor.before(box);else host.append(box);
 function render(){
  if(!box.open)return;
  const rows=assess(root.lifeosReadOnlyWorkspace?.()?.sessions||[],Date.now());
  body.replaceChildren();
  if(!rows.length){body.textContent='No running or paused timers. Start tracking in Track.';return}
  const note=doc.createElement('p');note.textContent='Suggestions are based on active tracked time, excluding pauses. An exceeded duration is a prompt to review, not proof an activity ended. Nothing is finished automatically here.';
  note.style.cssText='font-size:13px;color:#c2dce7;margin:0 0 6px';body.append(note);
  for(const row of rows.slice(0,20)){
   const item=doc.createElement('article');item.style.cssText='padding:12px;border-radius:12px;border:1px solid #456b7c;background:#1b364c';
   const label=doc.createElement('strong');label.textContent=row.name+' · '+(row.status==='paused'?'Paused':row.category==='needs-review'?'Review duration':row.category==='overdue'?'Expected duration exceeded':row.category==='ending-soon'?'Ending soon':'Running');
   item.append(label);
   const info=doc.createElement('p');info.style.cssText='font-size:13px;margin:8px 0';
   info.textContent='Tracked '+fmt(row.elapsedMs)+' · '+(row.configured?'Set limit':'Suggested duration')+' '+row.expectedMinutes+'m'+
    (row.overdueMs>0?' · exceeded by '+fmt(row.overdueMs):'')+
    (row.status==='paused'?' · paused time is excluded':'');
   item.append(info);
   const actions=doc.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:9px';
   const button=(text,handler)=>{
    const b=doc.createElement('button');b.type='button';b.className='btn outline';
    b.style.cssText='min-height:44px;flex:1 1 110px';b.textContent=text;b.addEventListener('click',handler);actions.append(b);
   };
   button('Review timer',()=>{if(root.LifeOSReviewTimer)root.LifeOSReviewTimer(row.id)});
   if(row.status==='running'){
    button('Duration options',()=>{
     const guard=doc.getElementById('lo78-duration'),select=doc.getElementById('lo78-session');
     if(!guard||!select){if(root.LifeOSReviewTimer)root.LifeOSReviewTimer(row.id);return}
     select.value=row.id;select.dispatchEvent(new Event('change',{bubbles:true}));
     guard.scrollIntoView({behavior:'smooth',block:'center'});
    });
    button('Pause',()=>handle('pause',row));
   }else{
    button('Resume',()=>handle('resume',row));
   }
   button('Finish…',()=>handle('finish',row));
   item.append(actions);body.append(item);
  }
  if(rows.length>20){const more=doc.createElement('p');more.textContent='Showing 20 of '+rows.length+' open timers';body.append(more)}
 }
 function handle(action,row){
  const current=root.lifeosReadOnlyWorkspace?.()?.sessions?.find(s=>String(s.id)===row.id);
  if(!current||!['running','paused'].includes(current.status))return render();
  if((action==='pause'&&current.status!=='running')||(action==='resume'&&current.status!=='paused'))return render();
  if(action==='finish'&&!root.confirm('Finish '+current.name+' NOW? If the activity ended earlier, choose Review timer instead and correct the end time.'))return;
  const request={id:row.id,action,result:{ok:false,message:'Timer action unavailable.'}};
  root.dispatchEvent(new CustomEvent('lifeos-v77-timer-action',{detail:request}));
  const msg=doc.createElement('p');msg.style.cssText='font-size:13px';msg.textContent=request.result?.message||'Timer action was not confirmed.';
  render();body.prepend(msg);
 }
 box.addEventListener('toggle',render);
 root.addEventListener?.('lifeos-v77-tracking-changed',render);
 root.addEventListener?.('lifeos-v78-duration-changed',render);
 doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)render()});
 root.setInterval?.(()=>{if(box.open&&!doc.hidden)render()},30000);
}
if(root.document){
 const go=()=>{mount();if(!root.document.getElementById('lo249-decisions'))root.setTimeout?.(mount,800)};
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',go,{once:true});else go();
}
return {assess,fmt,mount};
});
