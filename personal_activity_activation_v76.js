/* LifeOS Personal V76 — consent-based scheduled activity activation.
 * Manual / Assisted / Automatic-provisional (never records actual time automatically).
 * Browser-tab prompts only; native persistent notification support is a future step. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSActivityActivationV76=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const MIN=60000,MODES=['manual','assisted','automatic'];
function mode(p){return MODES.includes(p?.activationMode)?p.activationMode:'assisted'}
function evaluate(plans,time=Date.now(),lead=5*MIN){
 return (Array.isArray(plans)?plans:[]).filter(p=>p&&p.status==='planned'&&!p.sessionId&&p.endAt>time&&Number.isFinite(p.startAt)&&Number.isFinite(p.endAt)&&p.endAt>p.startAt&&mode(p)!=='manual')
 .filter(p=>time>=p.startAt-lead)
 .filter(p=>!(p.activationDismissedAtV76&&p.activationDismissedAtV76>=p.startAt))
 .filter(p=>!(p.activationSnoozedUntilV76&&p.activationSnoozedUntilV76>time))
 .map(p=>({id:String(p.id),name:String(p.name||'Scheduled activity'),startAt:p.startAt,endAt:p.endAt,mode:mode(p),phase:time>=p.startAt?'due':'upcoming',provisional:Boolean(p.provisionalActivationV76),overdueMs:Math.max(0,time-p.startAt)}))
 .sort((a,b)=>a.startAt-b.startAt);
}
function actionReview(plan,action,time=Date.now()){
 if(!plan||plan.status!=='planned'||plan.sessionId)throw Error('Only unstarted plans can be reviewed.');
 if(!['snooze','dismiss','provisional','mode'].includes(action.type))throw Error('Unknown activation action.');
 const p={...plan};
 if(action.type==='mode'){
  if(!MODES.includes(action.value))throw Error('Invalid activation mode.');
  p.activationMode=action.value;return p;
 }
 if(action.type==='snooze')p.activationSnoozedUntilV76=time+10*MIN;
 if(action.type==='dismiss')p.activationDismissedAtV76=time;
 if(action.type==='provisional'){
  if(mode(p)!=='automatic'||time<p.startAt||time>=p.endAt)throw Error('Automatic provisional activation requires an approved automatic plan during its scheduled window.');
  p.provisionalActivationV76={observedAt:time,scheduledAt:p.startAt,verified:false};
  // Keep the confirmation visible; provisional activation is NOT actual tracking.
 }
 return p;
}
function mount(){
 const plan=document.getElementById('scheduleEditorPanel'),tabs=document.getElementById('lifeosNavigation');
 if(!plan||document.getElementById('lo76-activation'))return;
 const panel=document.createElement('section');panel.id='lo76-activation';panel.className='lo76-activation';
 panel.innerHTML='<h3>Scheduled activity activation</h3><p class="sub">Assisted is the default. Only pressing Start records real tracked time. Automatic mode creates a provisional prompt that you must confirm; it does not assume you performed an activity.</p><label for="lo76-plan">Choose a future plan</label><select class="field" id="lo76-plan"></select><label for="lo76-mode">Activation mode</label><select class="field" id="lo76-mode"><option value="assisted">Assisted (recommended)</option><option value="manual">Manual</option><option value="automatic">Automatic — provisional only</option></select><button class="btn outline" id="lo76-save-mode" type="button">Save mode for this plan</button><p class="sub" role="status" id="lo76-mode-status"></p>';
 plan.prepend(panel);
 const dock=document.createElement('aside');dock.id='lo76-activation-dock';dock.hidden=true;dock.className='lo76-dock';dock.innerHTML='<div class="lo76-dock-head"><strong id="lo76-dock-name"></strong><span id="lo76-dock-time"></span></div><div class="lo76-dock-actions"><button type="button" class="btn primary" data-v76="start">Start now</button><button type="button" class="btn outline" data-v76="snooze">Snooze 10 min</button><button type="button" class="btn outline" data-v76="dismiss">Dismiss</button></div><p id="lo76-dock-feedback" role="status" aria-live="assertive" style="margin:8px 0;color:#eaffd4;font-size:13px"></p><small>Starting records actual time from now. Planned reminders may also appear as Android notifications.</small>';
 document.body.append(dock);
 const get=()=>root.lifeosReadOnlyWorkspace?.(),picker=panel.querySelector('#lo76-plan'),select=panel.querySelector('#lo76-mode');
 let active=null,previousKey='';
 function choosePlans(){
  const current=picker.value,plans=(get()?.schedule||[]).filter(p=>p&&p.status==='planned'&&!p.sessionId&&p.endAt>Date.now()-86400000).sort((a,b)=>a.startAt-b.startAt);
  picker.replaceChildren(new Option('Select a plan',''));
  for(const p of plans)picker.add(new Option(String(p.name)+' · '+new Date(p.startAt).toLocaleString(),String(p.id)));
  picker.value=[...picker.options].some(o=>o.value===current)?current:'';
  const chosen=plans.find(p=>String(p.id)===picker.value);
  select.value=mode(chosen);
 }
 function scan(){
  const now=Date.now(),pending=evaluate(get()?.schedule,now);
  // Automatic mode is provisional only and never starts tracked time without consent.
  // When the browser is suspended this is noticed on return, not backdated as actual activity.
  for(const item of pending){
   if(item.mode==='automatic'&&item.phase==='due'&&!item.provisional){
    const detail={type:'provisional',id:item.id,result:{ok:false}};
    root.dispatchEvent(new CustomEvent('lifeos-v76-activation',{detail}));
    break;
   }
  }
  active=evaluate(get()?.schedule,Date.now())[0]||null;
  if(!active){dock.hidden=true;previousKey='';return}
  dock.hidden=false;
  dock.querySelector('#lo76-dock-name').textContent=active.name+(active.provisional?' · provisional start proposed':'');
  dock.querySelector('#lo76-dock-time').textContent=active.phase==='upcoming'?'Starting '+new Date(active.startAt).toLocaleTimeString():'Scheduled '+new Date(active.startAt).toLocaleTimeString();
  const key=active.id+'|'+active.phase;
  if(key!==previousKey){previousKey=key;dock.setAttribute('aria-live','polite')}
 }
 picker.addEventListener('change',()=>{const p=(get()?.schedule||[]).find(x=>String(x.id)===picker.value);select.value=mode(p)});
 panel.querySelector('#lo76-save-mode').addEventListener('click',()=>{
  const detail={type:'mode',id:picker.value,value:select.value,result:{ok:false}};
  root.dispatchEvent(new CustomEvent('lifeos-v76-activation',{detail}));
  panel.querySelector('#lo76-mode-status').textContent=detail.result?.message||'No change saved.';
  choosePlans();scan();
 });
 dock.addEventListener('click',e=>{
  const button=e.target.closest('[data-v76]');if(!button||!active)return;
  e.preventDefault();e.stopPropagation();
  const action=button.dataset.v76,planId=active.id;
  const feedback=dock.querySelector('#lo76-dock-feedback');
  button.disabled=true;
  const detail={type:action,id:planId,result:{ok:false,message:'The action was not confirmed.'}};
  try{root.dispatchEvent(new CustomEvent('lifeos-v76-activation',{detail}))}
  catch(error){detail.result={ok:false,message:'Action failed: '+String(error?.message||error)}}
  button.disabled=false;
  const message=detail.result?.message||'No change saved.';
  feedback.textContent=message;
  panel.querySelector('#lo76-mode-status').textContent=message;
  choosePlans();scan();
  if(action==='start'&&detail.result?.ok===true){
   dock.hidden=true;
   document.querySelector('#lifeosNavigation [data-view="tracking"]')?.click();
  }else if(detail.result?.ok!==true){
   dock.hidden=false;
   feedback.textContent=message+' Check whether the app is blocking storage or confirmation dialogs.';
  }
 });
 const refresh=()=>{if(document.hidden)return;scan()};
 root.addEventListener('lifeos-v76-activation-changed',()=>{choosePlans();scan()});
 root.addEventListener('lifeos-v65-plan-committed',()=>{choosePlans();scan()});
 document.addEventListener('visibilitychange',refresh);
 root.addEventListener('focus',refresh);
 root.setInterval(scan,15000);
 choosePlans();scan();
}
const api={mode,evaluate,actionReview,MODES};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return api;
});
