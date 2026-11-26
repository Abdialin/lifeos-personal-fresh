/* LifeOS V137 — actionable plan details and timer attention.
 * Uses existing transactional LifeOS events and original schedule actions.
 * No direct storage writes, deletes, synthetic sessions, or automatic finishes. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=()=>{try{return window.lifeosReadOnlyWorkspace?.()||{}}catch{return {}}};
const fmt=t=>new Date(+t).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const local=t=>{const d=new Date(+t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const mins=t=>{const n=Math.round((+t||0)/60000);return n>=60?Math.floor(n/60)+'h '+String(n%60).padStart(2,'0')+'m':n+'m'};
let activeId=null,activeKind=null,closeFocus=null,dismissedTimer='',lastCheck=0;
function modal(){
 if($('v137ActivityModal'))return;
 const node=document.createElement('section');node.id='v137ActivityModal';node.hidden=true;node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-labelledby','v137ActivityTitle');
 node.innerHTML='<div class="v137-backdrop" data-v137-close></div><div class="v137-modal-sheet"><div class="v137-modal-bar"></div><div class="v137-modal-heading"><div><span id="v137ActivityEyebrow">ACTIVITY DETAILS</span><h2 id="v137ActivityTitle"></h2></div><button class="v137-close" type="button" data-v137-close aria-label="Close activity details">✕</button></div><div id="v137ActivityBody"></div><p class="v137-status" id="v137ActionStatus" role="status"></p><div id="v137ActivityActions"></div></div>';
 document.body.append(node);
 node.addEventListener('click',event=>{
  if(event.target.closest('[data-v137-close]')){hide();return}
  const action=event.target.closest('[data-v137-action]')?.dataset.v137Action;
  if(!action)return;
  if(action==='start')startPlan();
  if(action==='skip')skipPlan();
  if(action==='track')goTrack();
  if(action==='schedule')alternatePlan();
  if(action==='details')showOriginal();
 });
}
function plan(){return (read().schedule||[]).find(p=>String(p.id)===String(activeId))}
function record(){return (read().sessions||[]).find(p=>String(p.id)===String(activeId))}
function show(kind,id,trigger){
 activeId=id;activeKind=kind;closeFocus=trigger||document.activeElement;
 const item=kind==='plan'?plan():record();if(!item)return;
 const start=+item.startAt,end=item.endAt==null?NaN:+item.endAt;
 const status=kind==='plan'?(item.status?String(item.status).charAt(0).toUpperCase()+String(item.status).slice(1):'Saved'):(item.status==='finished'?'Finished':item.status==='running'?'Running':item.status==='paused'?'Paused':'Recorded');
 $('v137ActivityTitle').textContent=item.name||'Activity';
 $('v137ActivityEyebrow').textContent=kind==='plan'?'SCHEDULED ACTIVITY':'TRACKED ACTIVITY';
 const length=kind==='record'?mins(elapsed(item,Date.now())):Number.isFinite(end)&&Number.isFinite(start)&&end>=start?mins(end-start):'Unknown';
 const source=kind==='plan'?'Planned time is not proof that the activity happened.':'This session is a recorded activity. Verify its duration if it appears unusually long.';
 $('v137ActivityBody').innerHTML='<div class="v137-datetime"><span>Starts<strong>'+esc(fmt(start))+'</strong></span><span>Ends<strong>'+esc(Number.isFinite(end)?fmt(end):item.status==='running'?'Running':'Not finished')+'</strong></span></div>'+
 '<div class="v137-detail-line"><span>Category</span><strong>'+esc(window.lifeosActivityClassification?.(item)?.group||'Other / review')+'</strong></div>'+
 '<div class="v137-detail-line"><span>Duration</span><strong>'+esc(length)+'</strong></div>'+
 '<div class="v137-detail-line"><span>Status</span><strong>'+esc(status)+'</strong></div>'+
 (item.notes?'<div class="v137-note">'+esc(item.notes)+'</div>':'')+
 '<p class="v137-muted">'+source+'</p>';
 const startable=kind==='plan'&&item.status==='planned'&&!item.sessionId;
 $('v137ActivityActions').innerHTML=(startable?'<button class="v137-primary" type="button" data-v137-action="start">▶ Start tracking</button><div class="v137-actions-secondary"><button type="button" data-v137-action="schedule">Plan alternative</button><button type="button" data-v137-action="skip">Skip plan</button></div>':
 kind==='record'?'<button class="v137-primary" type="button" data-v137-action="track">Review in Track →</button>':
 '<button class="v137-primary" type="button" data-v137-action="details">View original plan →</button>')+
 (kind==='plan'?'<button class="v137-link" type="button" data-v137-action="details">View full plan details</button>':'');
 $('v137ActionStatus').textContent='';
 const node=$('v137ActivityModal');node.hidden=false;document.body.classList.add('v137-modal-open');const nav=$('lifeosNavigation');if(nav){nav.style.setProperty('display','none','important');nav.setAttribute('inert','');nav.setAttribute('aria-hidden','true')}node.querySelector('[data-v137-close]:not(.v137-backdrop)')?.focus({preventScroll:true});
}
function hide(){const node=$('v137ActivityModal');if(node)node.hidden=true;document.body.classList.remove('v137-modal-open');const nav=$('lifeosNavigation');if(nav){nav.style.removeProperty('display');nav.removeAttribute('inert');nav.removeAttribute('aria-hidden')}activeId=null;activeKind=null;if(closeFocus?.isConnected)closeFocus.focus({preventScroll:true})}
function refreshPlan(){
 const p=plan();if(!p)return;
 const picker=$('scheduleDay');if(picker){picker.value=local(p.startAt);picker.dispatchEvent(new Event('change',{bubbles:true}))}
}
function status(s){const n=$('v137ActionStatus');if(n)n.textContent=s}
function startPlan(){
 const p=plan();if(!p||p.status!=='planned'||p.sessionId){status('This plan can no longer be started.');return}
 const detail={type:'start',id:String(p.id),result:{ok:false}};
 window.dispatchEvent(new CustomEvent('lifeos-v76-activation',{detail}));
 if(detail.result?.ok){hide();document.querySelector('#lifeosNavigation button[data-view="tracking"]')?.click()}
 else status(detail.result?.message||'Unable to start the timer. The existing plan was preserved.');
}
async function skipPlan(){
 const p=plan();if(!p||p.status!=='planned'||p.sessionId){status('This plan cannot be skipped from its current state.');return}
 const button=$('v137ActivityActions')?.querySelector('[data-v137-action="skip"]');if(button?.disabled)return;
 if(typeof window.lifeosPlanSkip!=='function'){status('Skip is unavailable. No change was made.');return}
 if(button)button.disabled=true;status('Confirmation opened. No change has been made.');
 try{const result=await window.lifeosPlanSkip(String(p.id),JSON.stringify(p));if(result?.ok){const trigger=closeFocus;show('plan',String(p.id),trigger);status(result.message);document.dispatchEvent(new Event('lifeos-v137-plan-updated'))}else{status(result?.message||'Skip was not saved.');if(button?.isConnected&&!result?.committed&&!result?.stale){button.disabled=false;button.focus({preventScroll:true})}}}
 catch(error){status('Skip could not be confirmed: '+String(error?.message||error));if(button?.isConnected){button.disabled=false;button.focus({preventScroll:true})}}
}
function showOriginal(){
 const p=plan();if(!p)return;
 refreshPlan();
 hide();
 const list=$('scheduleList');
 let n=list;while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentElement}
 const box=$('v136Old-calendar')?.closest('details');if(box)box.open=true;
 list?.scrollIntoView({behavior:'smooth',block:'start'});
}
function alternatePlan(){
 const p=plan();if(!p)return;
 const chosen={name:p.name,startAt:p.startAt,endAt:p.endAt};
 hide();
 const link=$('v136Workspace [data-v136-action="new"]');link?.click();
 const dateTime=t=>{const d=new Date(+t),pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())};
 const name=$('scheduleName'),start=$('scheduleStart'),end=$('scheduleEnd');
 if(name)name.value=chosen.name||'';if(start)start.value=dateTime(chosen.startAt);if(end)end.value=dateTime(chosen.endAt);
 // No silent rescheduling. The old plan remains until explicitly reviewed.
 const note=$('v137AlternativeNote')||document.createElement('p');note.id='v137AlternativeNote';note.className='v137-explainer';
 note.textContent='This creates a separate proposed plan. Your original activity remains unchanged. To reschedule the original, review it in the detailed calendar controls.';
 $('scheduleForm')?.prepend(note);name?.focus({preventScroll:true});
}
function goTrack(){hide();document.querySelector('#lifeosNavigation button[data-view="tracking"]')?.click()}
function elapsed(s,now){
 if(Array.isArray(s.segments)&&s.segments.length)return s.segments.reduce((total,r)=>{
  const a=+r.start,end=r.end==null?(s.status==='running'?now:a):+r.end;
  return total+Math.max(0,end-a)},0);
 return Number.isFinite(+s.startAt)?Math.max(0,(s.status==='running'?now:+s.endAt)-(+s.startAt)):0;
}
function timerAttention(){
 const parent=$('v136TodayOverview');if(!parent)return;
 const sessions=(read().sessions||[]).filter(s=>['running','paused'].includes(s.status));
 const now=Date.now();
 const issue=sessions.filter(s=>{
  const m=elapsed(s,now)/60000,n=String(s.name||'');
  return s.status==='running'&&((/distraction/i.test(n)&&m>90)||(/prayer|fajr|dhuhr|asr|maghrib|isha/i.test(n)&&m>90)||m>12*60)
 }).sort((a,b)=>elapsed(b,now)-elapsed(a,now))[0];
 const old=$('v137TimerNotice');
 if(!issue||String(issue.id)===dismissedTimer){old?.remove();return}
 if(!old){const n=document.createElement('aside');n.id='v137TimerNotice';n.className='v137-timer-notice';parent.append(n)}
 const notice=$('v137TimerNotice');notice.innerHTML='<span class="v137-notice-icon">!</span><div><strong>Is this timer still running?</strong><small>'+esc(issue.name||'Activity')+' · '+mins(elapsed(issue,now))+' elapsed. Check whether it should continue.</small></div><div class="v137-notice-actions"><button type="button" data-v137-timer="review">Review timer</button><button type="button" data-v137-timer="dismiss">Later</button></div>';
 notice.onclick=e=>{const a=e.target.closest('[data-v137-timer]')?.dataset.v137Timer;if(a==='dismiss'){dismissedTimer=String(issue.id);notice.remove()}if(a==='review')goTrack()};
}
function init(){
 const host=$('v136Workspace');if(!host||$('v137ActivityModal'))return;
 modal();
 host.addEventListener('click',event=>{
  const btn=event.target.closest('[data-v137-activity]');if(!btn)return;
  const kind=btn.dataset.v137Activity,id=btn.dataset.v137Id;if(id)show(kind,id,btn);
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('v137ActivityModal')?.hidden&&!document.querySelector('[role="dialog"][aria-label="Skip this plan?"]'))hide()});
 document.addEventListener('lifeos-v137-plan-updated',()=>{try{$('v136Workspace [data-v136-action="today"]')?.click()}catch{}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)timerAttention()});
 window.addEventListener('lifeos-v77-tracking-changed',timerAttention);
 window.addEventListener('lifeos-v76-activation-changed',timerAttention);
 window.setInterval(()=>{if(document.hidden)return;timerAttention()},30000);
 timerAttention();
}
function boot(){if($('v136Workspace'))init();else setTimeout(boot,100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,100),{once:true});else setTimeout(boot,100);
})();
