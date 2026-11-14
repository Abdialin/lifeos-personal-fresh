/* LifeOS V62: explicit review, preview and apply of one existing unlinked plan. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSWeeklyPlanReviewV62=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos-live-v1',MAX_SHIFT=14*86400000;
const valid=p=>p&&Number.isFinite(p.startAt)&&Number.isFinite(p.endAt)&&p.endAt>p.startAt;
function preview(workspace,planId,newStartAt,expectedStartAt,expectedEndAt,now=Date.now()){
 const list=Array.isArray(workspace?.schedule)?workspace.schedule:[];
 const plan=list.find(p=>String(p.id)===String(planId));
 if(!plan||!valid(plan))return {ok:false,reason:'The plan was removed or is invalid.'};
 if(plan.status!=='planned'||plan.sessionId)return {ok:false,reason:'Only unstarted, unlinked plans can be rescheduled.'};
 if(!Number.isFinite(newStartAt)||newStartAt<now||newStartAt>now+MAX_SHIFT)return {ok:false,reason:'Choose a future time within the next 14 days.'};
 if(plan.startAt!==expectedStartAt||plan.endAt!==expectedEndAt)return {ok:false,reason:'The original plan changed. Review it again.'};
 const duration=plan.endAt-plan.startAt,newEndAt=newStartAt+duration;
 if(newStartAt===plan.startAt)return {ok:false,reason:'Choose a different start time.'};
 if(duration<=0||duration>24*3600000)return {ok:false,reason:'Plan duration must be between 1 minute and 24 hours.'};
 const proposed={startAt:newStartAt,endAt:newEndAt};
 const blockers=list.filter(p=>p&&String(p.id)!==String(planId)&&!['skipped','cancelled'].includes(p.status)&&valid(p)&&proposed.startAt<p.endAt&&p.startAt<proposed.endAt);
 const occupiedSessions=(workspace?.sessions||[]).filter(s=>s&&s.status!=='discarded'&&Array.isArray(s.segments)).filter(s=>s.segments.some(seg=>Number.isFinite(seg?.start)&&(seg.end===null||Number.isFinite(seg.end))&&proposed.startAt<(seg.end===null?now:seg.end)&&seg.start<proposed.endAt));
 return {ok:!blockers.length&&!occupiedSessions.length,reason:blockers.length||occupiedSessions.length?'Conflicting plans or recorded activities detected. Choose another time.':'No known schedule conflict. Unlogged time remains unknown.',planId:String(plan.id),name:String(plan.name||'Planned activity'),from:plan.startAt,oldEnd:plan.endAt,startAt:newStartAt,endAt:newEndAt,durationMs:duration,blockedBy:escapeNames(blockers),recordedConflicts:escapeNames(occupiedSessions)};
}
function escapeNames(list){return list.map(x=>String(x.name||'Activity')).slice(0,5)}
function localInput(ms){const d=new Date(ms),pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function mount(){
 const parent=document.getElementById('lo61-weekly-recommendations');if(!parent||document.getElementById('lo62-plan-review'))return;
 const host=document.createElement('section');host.id='lo62-plan-review';host.className='lo62-plan-review';
 host.innerHTML='<h3>Review a weekly plan adjustment</h3><p class="sub">Choose an existing, unstarted plan, propose a new start time and preview conflicts before approval. Duration stays unchanged. Tracked activities and Google Calendar are never edited.</p><label class="sub" for="lo62-plan">Plan to adjust</label><select class="field" id="lo62-plan"></select><label class="sub" for="lo62-start">Proposed new start</label><input class="field" type="datetime-local" id="lo62-start"><div class="lo62-actions"><button class="btn outline" id="lo62-preview" type="button">Preview impact</button><button class="btn primary" id="lo62-apply" type="button" disabled>Confirm and save plan change</button></div><div id="lo62-result" class="lo62-result" role="status">No changes have been made.</div>';
 parent.appendChild(host);
 const picker=host.querySelector('#lo62-plan'),input=host.querySelector('#lo62-start'),previewButton=host.querySelector('#lo62-preview'),applyButton=host.querySelector('#lo62-apply'),notice=host.querySelector('#lo62-result');
 let snapshot=null,last=null;
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
 const reset=()=>{last=null;applyButton.disabled=true};
 const choices=()=>{
  reset();const data=read(),now=Date.now();const options=(data?.schedule||[]).filter(p=>p.status==='planned'&&!p.sessionId&&valid(p)&&p.endAt>now).sort((a,b)=>a.startAt-b.startAt);
  picker.replaceChildren(new Option('Select a planned activity',''));
  for(const p of options)picker.add(new Option(p.name+' · '+new Date(p.startAt).toLocaleString(),String(p.id)));
  notice.textContent=options.length?'Select a plan and a proposed start time.':'No eligible unstarted plans found.';
 };
 picker.addEventListener('change',()=>{reset();const p=(read()?.schedule||[]).find(x=>String(x.id)===picker.value);if(p&&valid(p))input.value=localInput(p.startAt);});
 input.addEventListener('input',reset);
 previewButton.addEventListener('click',()=>{
  const state=read(),plan=(state?.schedule||[]).find(p=>String(p.id)===picker.value);
  reset();if(!plan){notice.textContent='Select a plan first.';return}
  const start=new Date(input.value).getTime();
  snapshot={id:String(plan.id),originalStart:plan.startAt,originalEnd:plan.endAt};
  last=preview(state,snapshot.id,start,snapshot.originalStart,snapshot.originalEnd,Date.now());
  notice.textContent=(last.ok?'Review: ':'Cannot approve: ')+last.name+' · '+last.reason+(last.ok?' · '+new Date(last.from).toLocaleString()+' → '+new Date(last.startAt).toLocaleString():'')+(last.blockedBy?.length?' · Plans: '+last.blockedBy.join(', '):'')+(last.recordedConflicts?.length?' · Activities: '+last.recordedConflicts.join(', '):'');
  applyButton.disabled=!last.ok;
 });
 applyButton.addEventListener('click',()=>{
  if(!last?.ok||!snapshot){notice.textContent='Preview the change before approval.';return}
  const state=read(),fresh=preview(state,snapshot.id,last.startAt,snapshot.originalStart,snapshot.originalEnd,Date.now());
  if(!fresh.ok){notice.textContent='Approval blocked: '+fresh.reason;reset();return}
  if(!confirm('Move '+fresh.name+' from '+new Date(fresh.from).toLocaleString()+' to '+new Date(fresh.startAt).toLocaleString()+'? This only changes the LifeOS plan.'))return;
  const detail={id:snapshot.id,expectedStartAt:snapshot.originalStart,expectedEndAt:snapshot.originalEnd,newStartAt:last.startAt,result:null};
  document.dispatchEvent(new CustomEvent('lifeos-v62-move-plan',{detail}));
  notice.textContent=detail.result?.message||'No confirmation from the LifeOS save system. No success assumed.';
  reset();if(detail.result?.ok){const savedMessage=notice.textContent;choices();notice.textContent=savedMessage;}
 });
 document.addEventListener('lifeos-v63-review-suggestion',event=>{
  const request=event.detail;
  if(!request||typeof request!=='object')return;
  request.result={ok:false,message:'Suggestion was not transferred.'};
  const state=read(),plan=(state?.schedule||[]).find(p=>String(p.id)===String(request.planId));
  if(!plan||!valid(plan)||plan.status!=='planned'||plan.sessionId){request.result.message='The proposed plan is no longer eligible for rescheduling.';return;}
  if(!Number.isFinite(request.newStartAt)){request.result.message='The proposed time is invalid.';return;}
  const assessment=preview(state,String(plan.id),request.newStartAt,plan.startAt,plan.endAt,Date.now());
  if(!assessment.ok){request.result.message='Suggestion needs a new review: '+assessment.reason;return;}
  choices();
  picker.value=String(plan.id);
  input.value=localInput(request.newStartAt);
  previewButton.click();
  if(!applyButton.disabled){
   request.result={ok:true,message:'Proposal loaded into the review form. Check the impact and explicitly confirm to save.'};
   host.scrollIntoView({behavior:'smooth',block:'start'});
  }else request.result.message='The review form could not validate the proposed time.';
 });
 window.addEventListener('lifeos-v65-plan-committed',choices);
 window.addEventListener('storage',e=>{if(e.key===KEY)choices()});
 choices();
}
const api={preview,localInput};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount()}
return api;
});
