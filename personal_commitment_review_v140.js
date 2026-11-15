/* LifeOS V140 — focused commitment decision review.
 * Presentation-only orchestration. The V75 preview, conflict checks, atomic save,
 * and decision audit remain the exclusive source of mutations. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const quote=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let openId=null,lastFocus=null;
const actions=[['recover','Recover time','Find an available slot'],['carry','Next week','Carry the remainder forward'],['adjust','Adjust target','Change what remains outstanding'],['forgive','Close commitment','No recovery needed']];
function source(){try{return window.lifeosReadOnlyWorkspace?.()||{}}catch{return {}}}
function chosen(){try{return window.LifeOSDebtRecoveryV75?.outstanding(source())?.open?.find(x=>String(x.id)===String(openId))}catch{return null}}
function sync(){
 const item=chosen(),name=$('v140Name'),time=$('v140Time');
 if(!name)return;
 name.textContent=item?.name||'Commitment review';
 const amount=Math.max(0,item?.outstandingMs||0),mins=Math.round(amount/60000);
 time.textContent=item?((mins>=60?Math.floor(mins/60)+'h ':'')+(mins%60)+'m calculated difference'):'Current record needs refreshing';
 const sel=$('lo75-item');if(sel&&item&&String(sel.value)!==String(item.id)){sel.value=String(item.id);sel.dispatchEvent(new Event('change',{bubbles:true}))}
 renderModes();
}
function renderModes(){
 const current=$('lo75-action')?.value||'recover';
 document.querySelectorAll('#v140Dialog [data-v140-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v140Mode===current)));
 const status=$('v140Explanation');
 if(status)status.textContent={
  recover:'Propose a new future plan for part of this shortfall. The original activity remains unchanged.',
  carry:'Propose recovery next week or later. The original record is preserved.',
  adjust:'Set a smaller outstanding target, including zero, with explicit approval.',
  forgive:'Close the calculated remainder without creating any tracked time.'
 }[current];
}
function open(id,trigger){
 const sheet=$('v140Dialog');if(!sheet)return false;
 lastFocus=trigger||document.activeElement;openId=String(id);
 const core=$('lo75-debt-tools'),picker=$('lo75-item');
 if(!core||!picker){return false}
 if(![...picker.options].some(o=>o.value===openId))return false;
 core.open=true;picker.value=openId;picker.dispatchEvent(new Event('change',{bubbles:true}));
 sheet.hidden=false;document.body.classList.add('v140-open');
 const review=$('v136RecoveryDrawer');if(review)review.open=false;
 sync();
 sheet.querySelector('[data-v140-close]')?.focus({preventScroll:true});
 return true;
}
function close(){
 const sheet=$('v140Dialog');if(!sheet||sheet.hidden)return;
 sheet.hidden=true;document.body.classList.remove('v140-open');openId=null;
 if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
}
function setup(){
 const root=$('v136Workspace'),form=$('lo75-debt-tools'),old=$('lo74-debt');
 if(!root||!form||$('v140Dialog'))return false;
 const sheet=document.createElement('section');
 sheet.id='v140Dialog';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','v140Name');
 sheet.innerHTML='<div class="v140-screen-dim" data-v140-dismiss></div><div class="v140-panel"><div class="v140-grip"></div><header class="v140-header"><div><span>COMMITMENT REVIEW</span><h2 id="v140Name">Review commitment</h2><p id="v140Time"></p></div><button type="button" data-v140-close aria-label="Close review">✕</button></header>'+
 '<div class="v140-guide"><strong>What happened?</strong><p>A shorter linked timer does not necessarily mean the commitment was missed. Choose what should happen next.</p></div>'+
 '<div class="v140-modes" role="group" aria-label="Choose decision">'+actions.map(([k,n,d])=>'<button type="button" data-v140-mode="'+k+'" aria-pressed="'+(k==='recover')+'"><strong>'+n+'</strong><small>'+d+'</small></button>').join('')+'</div>'+
 '<p class="v140-explanation" id="v140Explanation"></p><div id="v140NativeForm"></div><footer class="v140-footnote">Nothing changes until you preview and explicitly approve. A recovery is a plan, not recorded activity.</footer></div>';
 document.body.append(sheet);
 const container=$('v140NativeForm');container.append(form);form.open=true;
 const summary=form.querySelector(':scope > summary');if(summary)summary.hidden=true;
 // Keep the detailed original report available, but not inside the everyday decision flow.
 if(old&&old.closest('#v136Old-review')&&!$('v140AuditDetails')){
  const wrapper=document.createElement('details');wrapper.id='v140AuditDetails';wrapper.className='v140-audit';
  wrapper.innerHTML='<summary>Original calculation report & detailed audit</summary>';
  old.parentElement.insertBefore(wrapper,old);wrapper.append(old);wrapper.open=false;
 }
 sheet.addEventListener('click',event=>{
  if(event.target.closest('[data-v140-dismiss],[data-v140-close]')){close();return}
  const m=event.target.closest('[data-v140-mode]');
  if(!m)return;
  const control=$('lo75-action');if(!control)return;
  control.value=m.dataset.v140Mode;control.dispatchEvent(new Event('change',{bubbles:true}));renderModes();
 });
 document.addEventListener('keydown',e=>{if(sheet.hidden)return;if(e.key==='Escape'){e.preventDefault();close()}});
 root.addEventListener('click',event=>{
  const btn=event.target.closest('button[data-v136-recovery]');if(!btn)return;
  if(open(btn.dataset.v136Recovery,btn)){event.preventDefault();event.stopImmediatePropagation()}
 },true);
 window.addEventListener('lifeos-v75-changed',()=>{if(!sheet.hidden){const item=chosen();if(item)sync();else{$('v140Time').textContent='Saved. This commitment no longer appears in the open list.'}}});
 return true;
}
function boot(times=0){if(setup())return;if(times<16)setTimeout(()=>boot(times+1),400)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot(),{once:true});else boot();
})();