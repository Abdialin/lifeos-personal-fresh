/* LifeOS V74 — Distraction Intelligence + Debt Chamber.
 * Read-only analytics, with optional user-approved categorization via transactional bridge.
 * Never turns unlogged hours or unconfirmed plans into actual tracked records. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSAccountabilityV74=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const CATEGORIES=['Social media','Entertainment','Communication','Procrastination','Interruption','Environment','Other'];
const sample=s=>s?.source==='development-starter'||s?.source==='assumed-demo'||!!s?.seedBatch;
const distract=s=>{
 if(!s)return false;
 if(typeof root.lifeosActivityClassification==='function')return root.lifeosActivityClassification(s)?.group==='Distraction';
 const nested=typeof s.activityDetailsV252?.category==='string'?s.activityDetailsV252.category.trim():'';
 const reviewed=nested||(typeof s.category==='string'?s.category.trim():'');
 if(reviewed)return reviewed.toLowerCase()==='distraction';
 return s.activityType==='distraction'||s.name==='Distraction'||/^Distraction[: —-]/i.test(String(s.name||''));
};
function duration(s,now){return (s?.segments||[]).reduce((sum,x)=>{const a=Number(x?.start),b=x?.end==null?(s.status==='running'?now:NaN):Number(x.end);return sum+(Number.isFinite(a)&&Number.isFinite(b)?Math.max(0,Math.min(b,now)-a):0)},0)}
function distractionReport(workspace,at=Date.now(),days=28){
 const start=at-days*86400000,entries=[],groups=new Map(),hours=new Map();
 for(const s of workspace?.sessions||[]){
  if(!distract(s)||sample(s)||!Array.isArray(s.segments))continue;
  let ms=0;
  for(const segment of s.segments){
   const a=Number(segment?.start),b=segment?.end==null?(s.status==='running'?at:NaN):Number(segment.end);
   if(Number.isFinite(a)&&Number.isFinite(b))ms+=Math.max(0,Math.min(at,b)-Math.max(start,a));
  }
  if(ms<=0)continue;
  const name=String(s.distractionCategory||'Uncategorized').slice(0,60);
  const row={id:String(s.id),category:name,ms,trigger:s.distractionTrigger||null,affectedPlanId:s.affectedPlanId||null};
  entries.push(row);
  const g=groups.get(name)||{category:name,count:0,totalMs:0};
  g.count++;g.totalMs+=ms;groups.set(name,g);
  for(const seg of s.segments){const t=Number(seg?.start);if(Number.isFinite(t)&&t>=start&&t<=at){const h=new Date(t).getHours();hours.set(h,(hours.get(h)||0)+1)}}
 }
 const ranking=[...groups.values()].sort((a,b)=>b.count-a.count||b.totalMs-a.totalMs);
 const byDuration=[...groups.values()].sort((a,b)=>b.totalMs-a.totalMs||b.count-a.count);
 return {count:entries.length,totalMs:entries.reduce((a,b)=>a+b.ms,0),ranking,byDuration,mostFrequent:ranking[0]||null,mostTimeConsuming:byDuration[0]||null,peakHour:[...hours.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]??null,entries};
}
function debtReport(workspace,at=Date.now(),days=7){
 const start=at-days*86400000,records=[],pending=[];
 const sessionMap=new Map((workspace?.sessions||[]).filter(s=>!sample(s)).map(s=>[s.id,s]));
 for(const p of workspace?.schedule||[]){
  if(!p||!Number.isFinite(p.endAt)||!Number.isFinite(p.startAt)||p.endAt<=p.startAt||p.endAt>at||p.endAt<start||p.status==='cancelled'||p.source==='debt-recovery-v75')continue;
  const planned=p.endAt-p.startAt,linked=sessionMap.get(p.sessionId);
  const actual=linked?duration(linked,at):null;
  if(p.status==='skipped'){
   records.push({id:p.id,name:p.name||'Planned activity',outstandingMs:planned,reason:'explicitly-skipped',plannedMs:planned,actualMs:0});continue;
  }
  if(linked){
   if(linked.status==='finished'&&actual<planned)records.push({id:p.id,name:p.name||'Planned activity',outstandingMs:planned-actual,reason:'tracked-shortfall',plannedMs:planned,actualMs:actual});
   else if(linked.status!=='finished')pending.push({id:p.id,name:p.name||'Planned activity',reason:'still-tracking'});
  }else pending.push({id:p.id,name:p.name||'Planned activity',reason:'completion-unverified'});
 }
 return {confirmed:records,totalMs:records.reduce((a,b)=>a+b.outstandingMs,0),unverified:pending,confirmedCount:records.length,unverifiedCount:pending.length};
}
function fmt(ms){const m=Math.round(Math.max(0,ms)/60000);return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m'}
function mount(){
 const track=document.getElementById('trackDistractionPanel'),plan=document.getElementById('scheduleEditorPanel');
 if(!track||!plan||document.getElementById('lo74-distraction'))return;
 const analytics=document.createElement('section');analytics.id='lo74-distraction';analytics.className='lo74-box';
 analytics.innerHTML='<h3>Distraction Intelligence · last 28 days</h3><p class="sub">Only explicitly recorded distractions are counted. Unlogged time and planned leisure are not distractions.</p><div id="lo74-distraction-results" aria-live="polite"></div><details><summary>Classify an existing distraction</summary><label class="sub" for="lo74-session">Recorded distraction</label><select class="field" id="lo74-session"></select><label class="sub" for="lo74-category">Category</label><select class="field" id="lo74-category"></select><label class="sub" for="lo74-trigger">Possible trigger (optional)</label><input class="field" id="lo74-trigger" maxlength="100" placeholder="e.g. boredom or notification"><div class="row" style="display:flex;gap:9px;flex-wrap:wrap;margin-top:12px"><button type="button" class="btn outline" id="lo74-save">Save classification</button><button type="button" class="btn danger" id="lo270-delete-distraction" style="min-height:46px">Delete distraction</button></div><p id="lo74-save-status" role="status" class="sub"></p></details>';
 track.appendChild(analytics);
 const debt=document.createElement('section');debt.id='lo74-debt';debt.className='lo74-box';
 debt.innerHTML='<h3>Debt Chamber · last 28 days</h3><p class="sub">Only explicitly skipped plans or completed linked sessions with a measurable shortfall count as confirmed outstanding time. Unverified attendance is not automatically called debt.</p><div id="lo74-debt-results" aria-live="polite"></div><p class="sub">Recovery options (carry forward, reschedule, adjust goal or forgive) will require explicit user approval. No extra gym sessions are added automatically.</p>';
 plan.appendChild(debt);
 const select=analytics.querySelector('#lo74-session'),category=analytics.querySelector('#lo74-category'),trigger=analytics.querySelector('#lo74-trigger');
 for(const label of CATEGORIES)category.add(new Option(label,label));
 const workspace=()=>root.lifeosReadOnlyWorkspace?.()||null;
 function render(){
  const w=workspace();if(!w)return;
  const report=distractionReport(w),target=analytics.querySelector('#lo74-distraction-results');target.replaceChildren();
  const summary=document.createElement('p');summary.textContent=report.count+' recorded distraction sessions · '+fmt(report.totalMs)+' total. Most frequent: '+(report.mostFrequent?.category||'Not enough data')+'. Most time-consuming: '+(report.mostTimeConsuming?.category||'Not enough data')+'.';target.append(summary);
  const list=document.createElement('ol');for(const row of report.ranking.slice(0,8)){const item=document.createElement('li');item.textContent=row.category+': '+row.count+' occurrence(s), '+fmt(row.totalMs);list.append(item)}target.append(list);
  const prev=select.value;select.replaceChildren(new Option('Choose a distraction',''));
  for(const s of w.sessions||[])if(distract(s)&&!sample(s))select.add(new Option(String(s.name||'Distraction')+' · '+new Date(s.startAt).toLocaleString(),String(s.id)));
  select.value=[...select.options].some(x=>x.value===prev)?prev:'';
  const d=debtReport(w,Date.now(),28),extended=root.LifeOSDebtRecoveryV75?.outstanding?.(w,Date.now(),api),box=debt.querySelector('#lo74-debt-results');box.replaceChildren();
  const open=extended?.open||d.confirmed,openMs=extended?.openMs??d.totalMs,resolved=extended?.resolved?.length||0;
  const overview=document.createElement('p');overview.textContent='Outstanding after approved decisions: '+fmt(openMs)+' across '+open.length+' commitment(s). '+resolved+' resolved or scheduled for recovery. '+d.unverifiedCount+' past plan(s) need completion review.';box.append(overview);
  const confirmed=document.createElement('ul');for(const row of open.slice(0,12)){const li=document.createElement('li');li.textContent=row.name+': −'+fmt(row.outstandingMs)+' ('+row.reason.replaceAll('-',' ')+')';confirmed.append(li)}box.append(confirmed);
 }
 select.addEventListener('change',()=>{const item=workspace()?.sessions?.find(x=>x.id===select.value);if(item){category.value=CATEGORIES.includes(item.distractionCategory)?item.distractionCategory:'Other';trigger.value=String(item.distractionTrigger||'')}});
 analytics.querySelector('#lo74-save').addEventListener('click',()=>{
  const detail={id:select.value,category:category.value,trigger:trigger.value.trim(),result:{ok:false}};
  root.dispatchEvent(new CustomEvent('lifeos-v74-classify-distraction',{detail}));
  analytics.querySelector('#lo74-save-status').textContent=detail.result?.message||'Classification could not be saved.';
  render();
 });
 const remove=analytics.querySelector('#lo270-delete-distraction');
 remove.addEventListener('click',async()=>{
  const id=select.value,feedback=analytics.querySelector('#lo74-save-status');
  if(!id){feedback.textContent='Choose the recorded distraction you want to delete.';return}
  remove.disabled=true;feedback.textContent='Delete confirmation opened. No record has been changed yet.';
  try{
   const detail={id,promise:null};root.dispatchEvent(new CustomEvent('lifeos-v270-delete-reviewed-activity',{detail}));
   if(!detail.promise){feedback.textContent='Delete service unavailable. No record changed.';return}
   const result=await detail.promise;
   feedback.textContent=result?.message||'Deletion was not confirmed.';
   if(result?.ok)render();
  }catch(error){feedback.textContent='Deletion could not be confirmed: '+String(error?.message||error)}
  finally{remove.disabled=false}
 });
 root.addEventListener('lifeos-v74-records-changed',render);
 root.addEventListener('lifeos-v77-tracking-changed',render);
 root.addEventListener('lifeos-v75-changed',render);
 root.addEventListener('lifeos-v65-plan-committed',render);
 root.addEventListener('focus',render);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 render();
}
const api={distractionReport,debtReport,duration,fmt,CATEGORIES};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount()}
return api;
});
