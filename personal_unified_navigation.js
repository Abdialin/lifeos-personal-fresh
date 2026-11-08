/* LifeOS Personal unified navigation. View-only: never mutates workspace data. */
(function(root){'use strict';
 const VIEWS=[['dashboard','Dashboard'],['tracking','Tracking'],['schedule','Schedule'],['goals','Goals'],['analytics','Analytics'],['life','My Life']];
 // Indexes reflect the existing 26 panels in the unified app; unmatched panels remain accessible in Tracking.
 const PANEL_VIEWS={
  0:['dashboard','tracking'],1:['tracking'],2:['tracking'],3:['dashboard','tracking'],4:['goals'],5:['tracking'],
  6:['schedule'],7:['schedule'],8:['schedule'],9:['schedule'],10:['dashboard','analytics'],11:['dashboard','goals'],
  12:['analytics'],13:['analytics'],14:['tracking'],15:['analytics'],16:['tracking'],17:['dashboard','tracking'],
  18:['tracking'],19:['tracking'],20:['tracking'],21:['life'],22:['life'],23:['life'],24:['goals'],25:['schedule']};
 function resolveView(value){return VIEWS.some(v=>v[0]===value)?value:'dashboard'}
 function getVisibleIndices(view,count){return Array.from({length:count},(_,i)=>i).filter(i=>(PANEL_VIEWS[i]||['tracking']).includes(resolveView(view)))}
 function init(doc,win){
  const nav=doc.getElementById('lifeosNavigation'),heading=doc.getElementById('lifeosViewTitle');
  if(!nav||!heading)return null;
  const panels=Array.from(doc.querySelectorAll('section.panel'));
  const buttons=VIEWS.map(([id,label])=>{const b=doc.createElement('button');b.type='button';b.textContent=label;b.dataset.view=id;nav.appendChild(b);return b});
  function setView(requested){const view=resolveView(requested);const visible=new Set(getVisibleIndices(view,panels.length));
   panels.forEach((p,i)=>{p.classList.toggle('lifeos-hidden-panel',!visible.has(i));p.setAttribute('aria-hidden',visible.has(i)?'false':'true')});
   buttons.forEach(b=>{if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
   heading.textContent=VIEWS.find(v=>v[0]===view)[1];
   // Preserve state in the URL only. No workspace writes or cloud synchronization.
   if(win.history&&win.history.replaceState)win.history.replaceState(null,'',win.location.pathname+win.location.search+'#'+view);
   return view;
  }
  buttons.forEach(b=>b.addEventListener('click',()=>{setView(b.dataset.view);win.scrollTo?.({top:0,behavior:'auto'})}));
  win.addEventListener?.('hashchange',()=>setView(win.location.hash.slice(1)));
  setView(win.location.hash.slice(1));return {setView,panels,buttons};
 }
 const api={VIEWS,PANEL_VIEWS,resolveView,getVisibleIndices,init};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root&&root.document)root.addEventListener('DOMContentLoaded',()=>init(root.document,root));
})(typeof window!=='undefined'?window:null);
