/* LifeOS Personal V53 — unified activity day view. Read-only; no state writes. */
(function(root){
'use strict';
const KEY='lifeos-live-v1';
function validTime(value){return typeof value==='number'&&Number.isFinite(value);}
function dayBounds(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const d=new Date(date+'T00:00:00');
 if(Number.isNaN(d.getTime())||[d.getFullYear(),d.getMonth()+1,d.getDate()].join('-')!==date.split('-').map((v,i)=>i?String(Number(v)):v).join('-'))return null;
 const next=new Date(d);next.setDate(next.getDate()+1);return [d.getTime(),next.getTime()];
}
function overlap(a,b,left,right){return validTime(a)&&validTime(b)&&a<b&&a<right&&b>left;}
function sessionSpan(session,now){
 const spans=(session.segments||[]).filter(x=>x&&validTime(x.start)).map(x=>[x.start,validTime(x.end)?x.end:now]).filter(x=>x[1]>x[0]);
 return spans;
}
function provenance(session){
 if(session.source==='development-starter'||session.seedBatch)return {label:'Development example · unverified',kind:'sample'};
 if(session.precision==='retrospective-approximate')return {label:'Retrospective · approximate time',kind:'historical'};
 if(session.precision==='retrospective'||session.source==='historical-import'||session.source==='import'||session.importedAt)return {label:'Historical record',kind:'historical'};
 return {label:'Tracked record',kind:'tracked'};
}
function buildDay(workspace,date,now=Date.now()){
 const bounds=dayBounds(date);if(!bounds)return {rows:[],counts:{planned:0,running:0,paused:0,completed:0,historical:0,sample:0},error:'Invalid date'};
 const [left,right]=bounds;
 const sessions=Array.isArray(workspace?.sessions)?workspace.sessions:[];
 const plans=Array.isArray(workspace?.schedule)?workspace.schedule:[];
 const byId=new Map(sessions.filter(s=>s&&s.id!=null).map(s=>[String(s.id),s]));
 const rows=[];const included=new Set();
 for(const s of sessions){
  if(!s||s.id==null||included.has(String(s.id)))continue;
  const spans=sessionSpan(s,now).filter(([a,b])=>overlap(a,b,left,right));
  if(!spans.length)continue;
  included.add(String(s.id));
  const start=Math.min(...spans.map(x=>Math.max(left,x[0])));
  const end=Math.max(...spans.map(x=>Math.min(right,x[1])));
  const status=s.status==='running'?'running':s.status==='paused'?'paused':'completed';
  const origin=provenance(s);
  const linked=plans.find(p=>p&&String(p.sessionId||'')===String(s.id));
  rows.push({key:'session:'+s.id,name:String(s.name||'Untitled'),kind:'session',status,start,end,provenance:origin.label,provenanceKind:origin.kind,linkedPlan:linked?String(linked.name||'Planned activity'):null,spans:spans.map(([a,b])=>[Math.max(a,left),Math.min(b,right)])});
 }
 for(const p of plans){
  if(!p||!validTime(p.startAt)||!validTime(p.endAt)||!overlap(p.startAt,p.endAt,left,right))continue;
  if(p.sessionId&&byId.has(String(p.sessionId))){
   // A linked plan is metadata for a tracked session, not another activity.
   if(included.has(String(p.sessionId)))continue;
  }
  const status=p.status==='skipped'?'skipped':p.status==='started'?'needs-review':'planned';
  rows.push({key:'plan:'+String(p.id||p.startAt),name:String(p.name||'Untitled'),kind:'plan',status,start:Math.max(left,p.startAt),end:Math.min(right,p.endAt),provenance:'Scheduled · not evidence of completion',provenanceKind:'plan',linkedPlan:null});
 }
 rows.sort((a,b)=>a.start-b.start||a.name.localeCompare(b.name));
 const counts={planned:0,running:0,paused:0,completed:0,historical:0,sample:0};
 for(const r of rows){
  if(r.kind==='plan'){if(r.status==='planned'||r.status==='needs-review')counts.planned++;}
  else{if(r.status==='running')counts.running++;else if(r.status==='paused')counts.paused++;else counts.completed++;
   if(r.provenanceKind==='historical')counts.historical++;
   if(r.provenanceKind==='sample')counts.sample++;
  }
 }
 return {rows,counts,error:null};
}
function escapeHtml(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function clock(ms){return new Date(ms).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});}
function localDate(now){const d=new Date(now);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function render(host,workspace,date,now=Date.now()){
 const out=buildDay(workspace,date,now);
 const stats=host.querySelector('[data-v53-stats]'),list=host.querySelector('[data-v53-list]');
 if(!stats||!list)return;
 stats.textContent=out.error||('Planned '+out.counts.planned+' · Running '+out.counts.running+' · Paused '+out.counts.paused+' · Completed '+out.counts.completed+' · Historical '+out.counts.historical+(out.counts.sample?' · Unverified examples '+out.counts.sample:''));
 list.innerHTML=out.rows.length?out.rows.map(r=>'<article class="lo53-row"><div><strong>'+escapeHtml(r.name)+'</strong><span class="lo53-meta">'+escapeHtml(r.status==='needs-review'?'Planned · session link needs review':r.status==='skipped'?'Skipped plan':r.status.charAt(0).toUpperCase()+r.status.slice(1))+' · '+escapeHtml(r.provenance)+(r.linkedPlan?' · Linked plan: '+escapeHtml(r.linkedPlan):'')+'</span></div><time>'+escapeHtml(clock(r.start))+'–'+escapeHtml(clock(r.end))+'</time></article>').join(''):'<p class="sub">No planned or recorded activities for this date.</p>';
}
function mount(){
 if(typeof document==='undefined')return;
 const target=document.getElementById('todayActivityHistory');if(!target||document.getElementById('lo53-unified'))return;
 const host=document.createElement('section');host.className='panel lo53-panel';host.id='lo53-unified';host.setAttribute('aria-label','Unified activity overview');
 host.innerHTML='<div class="lo53-head"><div><h2>Unified activity overview</h2><p class="sub">Plans and real activity records for one day. A plan alone is never counted as completed. Linked plans are shown with their sessions.</p></div><label class="sub" for="lo53-date">Date<input id="lo53-date" type="date"></label></div><p class="lo53-stats" data-v53-stats role="status"></p><div data-v53-list></div>';
 target.closest('section')?.insertAdjacentElement('afterend',host);
 const picker=host.querySelector('#lo53-date');picker.value=localDate(Date.now());
 const update=()=>{try{const state=JSON.parse(localStorage.getItem(KEY)||'null');render(host,state,picker.value);}catch(e){host.querySelector('[data-v53-stats]').textContent='Unable to read activity records safely.';}};
 picker.addEventListener('change',update);window.addEventListener('storage',e=>{if(e.key===KEY)update()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
 update();setInterval(()=>{if(!document.hidden)update()},5000);
}
const api={buildDay,dayBounds,provenance,sessionSpan};
if(typeof module==='object'&&module.exports)module.exports=api;
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();}
})(typeof window!=='undefined'?window:globalThis);
