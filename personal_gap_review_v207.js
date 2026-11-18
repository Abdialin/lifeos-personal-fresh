/* LifeOS V207 — user-confirmed backfill of unlogged intervals; never infer travel. */
(function(root){'use strict';
 const $=id=>document.getElementById(id);
 const names=['Travel / Commuting','Getting Ready','Shopping','Other (reviewed)'];
 const key=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const clock=x=>new Date(x).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
 const read=()=>{try{return root.lifeosReadOnlyWorkspace?.()||null}catch{return null}};
 function init(){
  const panel=$('trackHistoryPanel')||$('trackPastPanel')||$('trackQuickPanel');
  if(!panel||$('lo207-gap-review'))return;
  const section=document.createElement('details');section.id='lo207-gap-review';section.className='lo207-gap-review';
  const title=document.createElement('summary');title.textContent='Explain unlogged time · reviewed history';section.append(title);
  const intro=document.createElement('p');intro.textContent='Check periods without a recorded activity. Travel, getting ready and shopping are suggestions only; nothing is assigned unless you confirm it. This does not change any existing timer.';section.append(intro);
  const input=document.createElement('input');input.type='date';input.className='field';input.id='lo207-gap-day';input.value=key(new Date());input.max=key(new Date());input.setAttribute('aria-label','Date to review');section.append(input);
  const list=document.createElement('div');list.id='lo207-gap-list';section.append(list);
  const note=document.createElement('p');note.id='lo207-gap-note';note.setAttribute('role','status');section.append(note);
  panel.append(section);
  function refresh(){
   if(!section.open)return;
   const ws=read(),timeline=root.LifeOSActivityTimelineV54;
   if(!ws||!timeline?.build){note.textContent='Activity history is unavailable.';return}
   const result=timeline.build(ws,input.value,Date.now()),gaps=(result.gaps||[]).filter(g=>g.durationMs>=45*60000);
   list.replaceChildren();note.textContent=gaps.length?gaps.length+' unlogged interval(s) of 45 minutes or more.':'No unlogged interval of 45 minutes or more is available for this day.';
   for(const g of gaps.slice(0,12)){
    const row=document.createElement('div');row.className='lo207-gap-row';row.style.cssText='padding:12px;border:1px solid #51637a;border-radius:12px;margin:9px 0';
    const label=document.createElement('p');label.textContent=clock(g.start)+'–'+clock(g.end)+' · '+Math.round(g.durationMs/60000)+' minutes unlogged';row.append(label);
    const select=document.createElement('select');select.className='field';select.setAttribute('aria-label','What happened during '+clock(g.start)+' to '+clock(g.end));
    for(const x of names){const option=new Option(x,x);select.add(option)}
    const btn=document.createElement('button');btn.type='button';btn.className='btn outline';btn.textContent='Confirm and log this interval';
    btn.addEventListener('click',()=>{
      const name=select.value;
      if(!root.confirm('Record '+name+' from '+new Date(g.start).toLocaleString()+' to '+new Date(g.end).toLocaleString()+'? This is retrospective and approximate.'))return;
      const detail={name,startAt:g.start,endAt:g.end};
      document.dispatchEvent(new CustomEvent('lifeos-v207-backfill-gap',{detail}));
      note.textContent=detail.result?.message||'Could not confirm this interval.';
      if(detail.result?.ok)refresh();
    });
    row.append(select,btn);list.append(row);
   }
  }
  section.addEventListener('toggle',refresh);input.addEventListener('change',refresh);
  root.addEventListener('lifeos-v207-gap-committed',refresh);
  root.addEventListener('lifeos-v77-tracking-changed',()=>{if(section.open)refresh()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 }
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()}
})(typeof window!=='undefined'?window:globalThis);
