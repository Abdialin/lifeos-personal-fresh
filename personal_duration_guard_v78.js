/* LifeOS V78 — configurable session duration guard. Never converts a scheduled
 * activity into tracked work. Auto-finish requires explicit per-session opt-in.
 * A late browser wake-up uses an inferred cutoff and labels it approximate. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSDurationGuardV78=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const MIN=60000;
function suggestion(name){
 const s=String(name||'').toLowerCase();
 if(/fajr|dhuhr|asr|maghrib|isha|prayer|salah|salat/.test(s))return 30;
 if(/quran|memor|hifdh|arabic|hadith|reading/.test(s))return 60;
 if(/gym|workout|football|boxing|running|training|fitness/.test(s))return 90;
 if(/stud|assignment|research|coding/.test(s))return 90;
 if(/work|shift/.test(s))return 480;
 return 60;
}
function valid(session){const g=session?.durationGuardV78;return g&&Number.isSafeInteger(g.targetMinutes)&&g.targetMinutes>=5&&g.targetMinutes<=1440&&['warn','auto'].includes(g.mode)?g:null}
function elapsed(session,at){
 if(!session||!Array.isArray(session.segments))return 0;
 return session.segments.reduce((sum,seg)=>{if(!seg||!Number.isFinite(seg.start))return sum;const end=seg.end===null?(session.status==='running'?at:seg.start):Number(seg.end);return sum+(Number.isFinite(end)?Math.max(0,Math.min(end,at)-seg.start):0)},0);
}
function boundary(session,targetMs,at){
 if(!Number.isFinite(targetMs)||targetMs<=0)return null;
 let remain=targetMs;
 for(const seg of session?.segments||[]){
  if(!seg||!Number.isFinite(seg.start))return null;
  const end=seg.end==null?(session.status==='running'?at:seg.start):Number(seg.end);
  if(!Number.isFinite(end)||end<seg.start)return null;
  const length=Math.max(0,end-seg.start);
  if(remain<=length)return seg.start+remain;
  remain-=length;
 }
 return null;
}
function inspect(session,at=Date.now()){
 if(!session||session.status!=='running')return null;
 const guard=valid(session);if(!guard)return {id:String(session.id),configured:false,suggestionMinutes:suggestion(session.name)};
 const current=elapsed(session,at),limit=guard.targetMinutes*MIN,left=limit-current;
 return {id:String(session.id),configured:true,targetMinutes:guard.targetMinutes,mode:guard.mode,elapsedMs:current,remainingMs:left,warning:guard.mode==='warn'&&left<=Math.min(5*MIN,limit/4),overdue:left<=0,dueAt:left<=0?boundary(session,limit,at):null};
}
function configure(session,minutes,mode,at=Date.now()){
 if(!session||session.status!=='running')return {ok:false,reason:'Choose an active running timer.'};
 const n=Number(minutes);
 if(!Number.isSafeInteger(n)||n<5||n>1440)return {ok:false,reason:'Choose 5–1440 minutes.'};
 if(!['warn','auto'].includes(mode))return {ok:false,reason:'Choose Remind or Auto-finish.'};
 if(mode==='auto'&&elapsed(session,at)>=n*MIN)return {ok:false,reason:'This timer already exceeds the proposed auto-finish limit. Choose a longer limit or finish it manually.'};
 return {ok:true,settings:{targetMinutes:n,mode,configuredAt:at}};
}
function extend(session,minutes,at=Date.now()){
 const guard=valid(session);
 if(!guard||session.status!=='running')return {ok:false,reason:'This timer has no active duration limit.'};
 const extra=Number(minutes);
 if(!Number.isSafeInteger(extra)||extra<5||extra>240)return {ok:false,reason:'Choose 5–240 additional minutes.'};
 const newTarget=guard.targetMinutes+extra;
 if(newTarget>1440)return {ok:false,reason:'Maximum duration limit is 24 hours.'};
 if(guard.mode==='auto'&&elapsed(session,at)>=newTarget*MIN)return {ok:false,reason:'Choose a longer extension for this overdue timer.'};
 return {ok:true,settings:{...guard,targetMinutes:newTarget,configuredAt:at}};
}
function shouldAutoFinish(session,at=Date.now()){
 const report=inspect(session,at),guard=valid(session);
 return Boolean(report?.overdue&&guard?.mode==='auto'&&Number.isFinite(report.dueAt));
}
function mount(){
 const panel=document.getElementById('trackActivePanel');if(!panel||document.getElementById('lo78-duration'))return;
 const box=document.createElement('section');box.id='lo78-duration';box.className='lo78-duration';
 box.innerHTML='<h3>Smart timer duration</h3><p class="sub">Some activities, such as prayers, should not accidentally run for hours. Set an expected ACTIVE duration. Remind is the default; automatic finishing is optional and must be approved for each timer.</p><label class="sub" for="lo78-session">Running activity</label><select class="field" id="lo78-session"></select><label class="sub" for="lo78-minutes">Expected duration (minutes)</label><input class="field" type="number" id="lo78-minutes" min="5" max="1440" step="5"><label class="sub" for="lo78-mode">When the limit is reached</label><select class="field" id="lo78-mode"><option value="warn">Remind me: Finish or Extend</option><option value="auto">Automatically finish at the limit (opt-in)</option></select><div class="lo78-actions"><button type="button" class="btn primary" id="lo78-save">Save duration</button><button type="button" class="btn outline" id="lo78-finish">Finish now</button><button type="button" class="btn outline" id="lo78-extend">Extend 15 min</button></div><div class="lo78-alert" id="lo78-alert" role="status"></div><small class="sub">Auto-finish is based on tracked active minutes, excluding pauses. If the browser was suspended, a later cutoff is marked as an estimated end—not confirmed actual activity. No old activity is automatically shortened.</small>';
 const sessions=panel.querySelector('#sessions');if(sessions)sessions.before(box);else panel.append(box);
 const $=id=>document.getElementById(id),sel=$('lo78-session'),alertBox=$('lo78-alert'),mins=$('lo78-minutes'),mode=$('lo78-mode');
 const state=()=>{try{return root.lifeosReadOnlyWorkspace?.()?.sessions||[]}catch{return []}};
 let prior='',lastWarning='',scanBusy=false;
 function selected(){return state().find(s=>String(s.id)===sel.value)}
 function showStatus(value){alertBox.textContent=value}
 function renderOptions(){
  const active=state().filter(s=>s?.status==='running');
  const current=sel.value;
  const fingerprint=active.map(s=>s.id+'|'+(valid(s)?.targetMinutes||'')+'|'+(valid(s)?.mode||'')).join(';');
  if(fingerprint!==prior){
   prior=fingerprint;sel.replaceChildren(new Option('Choose a running activity',''));
   for(const s of active)sel.add(new Option(String(s.name||'Activity')+' · '+Math.floor(elapsed(s,Date.now())/MIN)+' min elapsed',String(s.id)));
   sel.value=[...sel.options].some(o=>o.value===current)?current:active[0]?.id||'';
   updateInput();
  }
  const item=selected(),info=inspect(item,Date.now());
  if(item&&info?.configured){
   if(info.overdue){
    const key=item.id+'|'+info.targetMinutes+'|'+info.mode;
    if(lastWarning!==key){lastWarning=key;showStatus('⚠ '+item.name+' has reached its '+info.targetMinutes+' minute limit. Finish now or extend the timer.')}
   }else if(info.remainingMs<=5*MIN){
    const key=item.id+'|near|'+info.targetMinutes;
    if(lastWarning!==key){lastWarning=key;showStatus('Upcoming end: '+item.name+' · '+Math.ceil(info.remainingMs/MIN)+' minute(s) remaining.')}
   }
  }else if(item&&elapsed(item,Date.now())>=suggestion(item.name)*MIN){
   const key=item.id+'|unconfigured';
   if(lastWarning!==key){lastWarning=key;showStatus('Review suggested: '+item.name+' has run longer than '+suggestion(item.name)+' minutes. Set a duration or finish manually. No automatic changes will be made.')}
  }
  const can=Boolean(item);$('lo78-save').disabled=!can;$('lo78-finish').disabled=!can;$('lo78-extend').disabled=!valid(item);
 }
 function updateInput(){const s=selected();mins.value=valid(s)?.targetMinutes||suggestion(s?.name);mode.value=valid(s)?.mode||'warn'}
 sel.addEventListener('change',()=>{lastWarning='';updateInput()});
 function action(type,extra={}){
  const item=selected();if(!item)return showStatus('Choose a running timer.');
  const detail={type,id:String(item.id),...extra,result:{ok:false,message:'Timer action not saved.'}};
  root.dispatchEvent(new CustomEvent('lifeos-v78-duration-action',{detail}));
  showStatus(detail.result?.message||'Timer action failed.');prior='';renderOptions();
 }
 $('lo78-save').addEventListener('click',()=>{
  const item=selected();if(!item)return;
  if(mode.value==='auto'&&!root.confirm('Automatically FINISH '+item.name+' after '+mins.value+' active minutes? If your browser is suspended, the end time may be an estimate. You can extend or disable this later.'))return;
  action('configure',{minutes:Number(mins.value),mode:mode.value});
 });
 $('lo78-finish').addEventListener('click',()=>{const item=selected();if(item&&root.confirm('Finish '+item.name+' now?'))action('finish')});
 $('lo78-extend').addEventListener('click',()=>action('extend',{minutes:15}));
 function scan(){
  if(document.hidden||scanBusy)return;
  scanBusy=true;
  try{
   const now=Date.now(),due=state().filter(s=>shouldAutoFinish(s,now));
   if(due.length){
    const entry=due[0],report=inspect(entry,now);
    const detail={type:'auto-finish',id:String(entry.id),dueAt:report.dueAt,result:{ok:false}};
    root.dispatchEvent(new CustomEvent('lifeos-v78-duration-action',{detail}));
    if(!detail.result?.ok)showStatus(detail.result?.message||'Auto-finish failed. Please review the timer.');
   }
   renderOptions();
  }finally{scanBusy=false}
 }
 root.addEventListener('lifeos-v77-tracking-changed',scan);
 root.addEventListener('lifeos-v78-duration-changed',scan);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)scan()});
 root.addEventListener('focus',scan);root.addEventListener('pageshow',scan);
 root.setInterval(scan,10000);
 scan();
}
const api={suggestion,valid,elapsed,boundary,inspect,configure,extend,shouldAutoFinish};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return api;
});
