/* LifeOS Personal — integrated dashboard: read-only view over existing tracker UI.
   Never writes workspace data; tracking actions stay in the existing tracker. */
(function(root){'use strict';
 function text(doc,id,fallback='—'){const el=doc.getElementById(id);return el&&el.textContent.trim()||fallback;}
 function mount(doc){
  const nav=doc.getElementById('lifeosNavigation'),layout=doc.querySelector('main.wrap > .layout');
  if(!nav||!layout||doc.getElementById('lifeosLiveDashboard'))return;
  const section=doc.createElement('section');section.id='lifeosLiveDashboard';section.className='lifeos-dashboard-summary';section.setAttribute('aria-label','Live dashboard summary');
  section.innerHTML='<div class="lifeos-summary-head"><div><h2>Your day at a glance</h2><p>Live information from your activity tracker. Overlapping time is shown separately.</p></div><span id="lifeosSummaryDate"></span></div><div class="lifeos-summary-grid"><div class="lifeos-summary-stat"><span>Active timers</span><strong id="lifeosSummaryActive">0</strong></div><div class="lifeos-summary-stat"><span>Unique tracked time</span><strong id="lifeosSummaryUnique">00:00</strong></div><div class="lifeos-summary-stat"><span>Overlapping time</span><strong id="lifeosSummaryOverlap">00:00</strong></div><div class="lifeos-summary-stat"><span>Completed today</span><strong id="lifeosSummaryCompleted">0</strong></div></div><div class="lifeos-summary-actions"><button type="button" data-lifeos-go="tracking">Start or manage timers</button><button type="button" data-lifeos-go="schedule">Open schedule</button><button type="button" data-lifeos-go="goals">View goals</button></div><p class="lifeos-summary-note" id="lifeosSummaryNote" role="status"></p>';
  layout.parentNode.insertBefore(section,layout);
  const style=doc.createElement('style');style.textContent='.lifeos-dashboard-summary{border:1px solid #334767;border-radius:20px;background:linear-gradient(120deg,#182b45,#121c31);padding:20px;margin-bottom:18px;color:#eaf0ff}.lifeos-summary-head{display:flex;justify-content:space-between;gap:12px;align-items:start}.lifeos-summary-head h2{margin:0;font-size:20px}.lifeos-summary-head p,.lifeos-summary-note{color:#b3c2dd;font-size:12px;line-height:1.5}.lifeos-summary-head>span{font-size:12px;color:#b3c2dd}.lifeos-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.lifeos-summary-stat{background:#0e192c;border:1px solid #30435f;border-radius:12px;padding:14px}.lifeos-summary-stat span{display:block;color:#aebdd8;font-size:12px}.lifeos-summary-stat strong{display:block;font-size:25px;margin-top:7px;font-variant-numeric:tabular-nums}.lifeos-summary-actions{display:flex;flex-wrap:wrap;gap:8px}.lifeos-summary-actions button{border:1px solid #526580;background:#243754;color:#eef5ff;border-radius:10px;padding:11px 13px;min-height:44px;font-weight:650}.lifeos-summary-actions button:first-child{background:#7de2c9;color:#08261e;border-color:#7de2c9}.lifeos-summary-actions button:focus-visible{outline:3px solid #fff;outline-offset:2px}.lifeos-dashboard-summary[hidden]{display:none}@media(max-width:700px){.lifeos-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.lifeos-summary-head{display:block}.lifeos-summary-stat strong{font-size:22px}}';doc.head.appendChild(style);
  function update(){
   const count=text(doc,'activeCount','0');const match=count.match(/\d+/);
   doc.getElementById('lifeosSummaryActive').textContent=match?match[0]:'0';
   doc.getElementById('lifeosSummaryUnique').textContent=text(doc,'uniqueTime','00:00');
   doc.getElementById('lifeosSummaryOverlap').textContent=text(doc,'overlapTime','00:00');
   doc.getElementById('lifeosSummaryCompleted').textContent=text(doc,'completed','0');
   doc.getElementById('lifeosSummaryDate').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
   doc.getElementById('lifeosSummaryNote').textContent='These numbers reflect the tracker in this browser. Cross-device synchronization is not yet verified.';
  }
  function currentView(){return root.location.hash.replace('#','')||'dashboard';}
  function visibility(){section.hidden=currentView()!=='dashboard';if(!section.hidden)update();}
  section.addEventListener('click',function(event){const button=event.target.closest('[data-lifeos-go]');if(!button)return;const view=button.dataset.lifeosGo;const target=nav.querySelector('[data-view="'+view+'"]');if(target)target.click();else root.location.hash=view;});
  const watchIds=['activeCount','uniqueTime','overlapTime','completed'];
  const observer=new MutationObserver(update);
  watchIds.forEach(id=>{const el=doc.getElementById(id);if(el)observer.observe(el,{childList:true,characterData:true,subtree:true});});
  root.addEventListener('hashchange',visibility);
  nav.addEventListener('click',()=>root.setTimeout(visibility,0));
  root.addEventListener('pageshow',visibility);
  visibility();
  return {update,visibility,disconnect:()=>observer.disconnect()};
 }
 if(typeof module==='object'&&module.exports)module.exports={mount};
 if(root&&root.document)root.addEventListener('DOMContentLoaded',()=>mount(root.document));
})(typeof window!=='undefined'?window:null);
