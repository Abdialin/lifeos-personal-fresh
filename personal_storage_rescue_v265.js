/* LifeOS V265 — storage-quota rescue entrypoint.
 * Offers read-only diagnostics and existing backup-first recovery. No automatic
 * deletion, journal reduction, server adoption, or activity mutation. */
(function(root){
 'use strict';
 const doc=root.document;if(!doc)return;
 const $=id=>doc.getElementById(id);
 function make(tag,text,cls){const n=doc.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n}
 function mounted(){const track=$('trackActivePanel');if(!track||$('lo265-storage-rescue'))return;
  const panel=make('aside',null,'lo265-storage-rescue');panel.id='lo265-storage-rescue';
  panel.style.cssText='border:1px solid #b88463;border-radius:13px;background:#263342;color:#f4e8db;padding:14px;margin:12px 0;display:none';
  panel.setAttribute('role','region');panel.setAttribute('aria-label','Storage recovery');
  const title=make('strong','LifeOS storage needs attention');panel.append(title);
  const info=make('p','Your saved activities are preserved in the current local recovery checkpoint. Storage has reached its limit, so timer changes cannot be confirmed. Export a recovery file before repairing.','');
  info.style.cssText='font-size:13px;line-height:1.5;margin:8px 0';panel.append(info);
  const state=make('p','','');state.id='lo265-rescue-status';state.setAttribute('role','status');
  state.style.cssText='font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere';panel.append(state);
  const buttons=make('div',null,'');buttons.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
  const open=make('button','Open backup & repair','btn primary');open.type='button';open.style.minHeight='46px';
  open.onclick=()=>{
   const sync=$('cloudSyncPanel'),recovery=$('recoveryTools');
   if(!sync||!recovery){state.textContent='Recovery controls unavailable in this app version. Do not clear app storage.';return}
   // The page navigation has no visible Settings tab, but supports this hash.
   root.location.hash='settings';recovery.open=true;
   root.setTimeout?.(()=>{sync.scrollIntoView({behavior:'smooth',block:'start'});$('exportRecovery')?.focus({preventScroll:true})},150);
   state.textContent='In Settings → Cloud sync → Offline recovery & diagnostics: export the recovery bundle first, verify the downloaded file, then choose Repair full storage.';
  };
  buttons.append(open);
  const check=make('button','Check storage usage','btn outline');check.type='button';check.style.minHeight='46px';
  check.onclick=()=>{
   let total=0,atomic=0,queue=0,mirror=0;
   try{for(let i=0;i<root.localStorage.length;i++){
    const key=root.localStorage.key(i),value=root.localStorage.getItem(key)||'';
    const units=(key.length+value.length)*2;total+=units;
    if(key==='lifeos-v4-stage21-atomic')atomic=units;
    else if(key==='lifeos-live-v1')mirror=units;
    else if(/outbox|journal/i.test(key))queue+=units;
   }
    const f=n=>(n/1048576).toFixed(2)+' MiB';
    state.textContent='Approximate local storage: '+f(total)+'; recovery checkpoint: '+f(atomic)+'; activity mirror: '+f(mirror)+'; journal-related keys: '+f(queue)+'. These are estimates; no records were changed.';
   }catch(e){state.textContent='Storage usage could not be read. Existing data was not changed.'}
  };
  buttons.append(check);panel.append(buttons);const head=track.querySelector('.head');if(head)head.after(panel);else track.prepend(panel);
  const detect=()=>{const source=($('lifeosTimerActionFeedback')?.textContent||'')+' '+($('syncStatus')?.textContent||'')+' '+($('status')?.textContent||'');
   const full=/Browser storage capacity exceeded|QuotaExceededError|storage (quota|capacity).*exceed/i.test(source);
   if(full)panel.style.display='block';
  };
  root.addEventListener('lifeos-v77-tracking-changed',detect);
  doc.addEventListener('click',e=>{
    if(!e.target?.closest?.('#sessions button[data-act],#lo256-live-today button'))return;
    root.setTimeout?.(detect,100);
  },true);
  root.setInterval?.(detect,1500);detect();
 }
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',mounted,{once:true});else mounted();
 root.setTimeout?.(mounted,1200);
})(typeof window!=='undefined'?window:globalThis);
