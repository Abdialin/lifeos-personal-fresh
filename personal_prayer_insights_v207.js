/* LifeOS V207 — privacy-respecting, self-reported prayer activity insights. */
(function(root){'use strict';const $=id=>document.getElementById(id);
 const prayers=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
 const key=t=>{const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 function mount(){
  const host=$('personalActivityPanel');if(!host||$('lo207-prayer-insights'))return;
  const sec=document.createElement('details');sec.id='lo207-prayer-insights';
  const title=document.createElement('summary');title.textContent='Prayer activity review · 7 days';sec.append(title);
  const box=document.createElement('div');sec.append(box);host.append(sec);
  function render(){
   if(!sec.open)return;
   let w;try{w=root.lifeosReadOnlyWorkspace?.()}catch{}
   const rows=(w?.sessions||[]).filter(s=>s.status==='finished'&&!s.seedBatch&&!s.assumed&&!s.isExample&&
     !['assumed-demo','development-starter'].includes(s.source)&&s.activityDetails&&
     prayers.includes(s.activityDetails.prayer)&&Number.isFinite(s.endAt)&&s.endAt>=Date.now()-7*86400000);
   const days=new Map(),positions=new Map();let sunnah=0,missed=0,hasSunnah=false;
   for(const s of rows){
    const d=key(s.endAt),group=days.get(d)||new Set();group.add(s.activityDetails.prayer);days.set(d,group);
    const n=s.activityDetails.sunnahPrayed,m=s.activityDetails.sunnahMissed;
    if(n!==undefined&&n!==''&&Number.isFinite(Number(n))&&Number(n)>=0){sunnah+=Number(n);hasSunnah=true}
    if(m!==undefined&&m!==''&&Number.isFinite(Number(m))&&Number(m)>=0){missed+=Number(m);hasSunnah=true}
    const pos=s.activityDetails.rowPosition;if(pos&&pos!=='Not specified'&&pos!=='Not applicable')positions.set(pos,(positions.get(pos)||0)+1);
   }
   box.replaceChildren();
   const head=document.createElement('p');head.textContent=rows.length+' documented prayers in the last seven days · '+days.size+' day(s) with specified prayer records.';box.append(head);
   for(const [date,items] of [...days].sort((a,b)=>b[0].localeCompare(a[0]))){
    const p=document.createElement('p');p.textContent=date+' · '+items.size+'/5 specifically identified daily prayers: '+[...items].join(', ');box.append(p);
   }
   const sunnahs=document.createElement('p');sunnahs.textContent=hasSunnah?'Self-reported sunnah: '+sunnah+' units prayed · '+missed+' units marked missed.':'Sunnah units have not been reported.';box.append(sunnahs);
   if(positions.size){const p=document.createElement('p');p.textContent='Self-reported mosque rows: '+[...positions].map(([name,n])=>name+' '+n).join(' · ');box.append(p)}
   const caution=document.createElement('small');caution.textContent='Missing records are unknown, not proof that a prayer was missed. Only details you enter are counted. No prayer data is shared with friends automatically.';box.append(caution);
  }
  sec.addEventListener('toggle',render);root.addEventListener('focus',render);
  root.addEventListener('lifeos-v77-tracking-changed',render);
  document.addEventListener('submit',e=>{if(e.target.id==='loActivityDetailsForm')setTimeout(render,120)});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(window);
