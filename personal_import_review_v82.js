/* LifeOS V82 — first-week calendar import handoff review.
 * Strictly read-only until the user explicitly uses the existing Plan approval control.
 * No imported event is classified as completed activity or tracked time. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSImportReviewV82=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos-stage27-plan-handoff-v1',SOURCES=new Set(['google','ics-import']);
function inspect(raw,workspace={},now=Date.now()){
 if(!raw)return {state:'empty',count:0,items:[],conflicts:0,duplicates:0};
 let x;
 try{x=JSON.parse(raw)}catch{return {state:'invalid',reason:'The pending calendar transfer cannot be read.'}}
 if(!x||x.format!==KEY||!Array.isArray(x.candidates)||x.candidates.length>100)return {state:'invalid',reason:'The calendar transfer has an unsupported structure.'};
 const existing=Array.isArray(workspace.schedule)?workspace.schedule:[],items=[];
 const used=new Set(existing.filter(p=>typeof p.calendarKey==='string').map(p=>p.calendarKey));
 for(const e of x.candidates){
  if(!e||typeof e.key!=='string'||!e.key||e.key.length>500||typeof e.name!=='string'||!e.name.trim()||e.name.length>80||!Number.isSafeInteger(e.startAt)||!Number.isSafeInteger(e.endAt)||e.endAt<=e.startAt||e.endAt-e.startAt>366*86400000||!SOURCES.has(e.source))return {state:'invalid',reason:'One or more pending calendar events are invalid.'};
  const duplicate=used.has(e.key);used.add(e.key);
  const conflict=!duplicate&&existing.some(p=>p&&p.status!=='cancelled'&&p.status!=='skipped'&&Number.isFinite(p.startAt)&&Number.isFinite(p.endAt)&&p.startAt<e.endAt&&e.startAt<p.endAt);
  items.push({key:e.key,name:e.name,startAt:e.startAt,endAt:e.endAt,source:e.source,duplicate,conflict,upcoming:e.endAt>=now});
 }
 return {state:'ready',count:items.length,items,duplicates:items.filter(x=>x.duplicate).length,conflicts:items.filter(x=>x.conflict).length,eligible:items.filter(x=>!x.duplicate).length};
}
function firstWeek(workspace,now=Date.now()){
 const start=new Date(now);start.setHours(0,0,0,0);
 const end=new Date(start);end.setDate(end.getDate()+7);
 const plans=(workspace?.schedule||[]).filter(p=>p&&p.status!=='cancelled'&&Number.isFinite(p.startAt)&&Number.isFinite(p.endAt)&&p.startAt<end.getTime()&&p.endAt>start.getTime()).sort((a,b)=>a.startAt-b.startAt);
 const imported=plans.filter(p=>p.calendarSource==='google'||p.calendarSource==='ics-import');
 const tracked=plans.filter(p=>p.sessionId);
 const active=plans.filter(p=>p.status==='planned'&&!p.sessionId);
 return {plans,imported:imported.length,tracked:tracked.length,planned:active.length,startAt:start.getTime(),endAt:end.getTime()};
}
function mount(){
 const panel=document.getElementById('calendarHandoffPanel');if(!panel||document.getElementById('lo82-import-summary'))return;
 const summary=document.createElement('section');summary.id='lo82-import-summary';summary.className='lo82-import';
 summary.innerHTML='<h3>First-week import review</h3><p class="sub">Importing creates planned activities only. Review calendar candidates before approving; existing tracked sessions remain unchanged.</p><p id="lo82-pending" role="status"></p><div id="lo82-preview"></div><a class="btn outline" href="/calendar.html">Open Google / ICS / document review</a><button class="btn outline" type="button" id="lo82-refresh">Refresh import preview</button><p class="sub" id="lo82-week"></p>';
 panel.append(summary);
 const $=id=>document.getElementById(id);
 const ws=()=>{try{return root.lifeosReadOnlyWorkspace?.()||{}}catch{return {}}};
 function render(){
  let raw=null;try{raw=localStorage.getItem(KEY)}catch{}
  const result=inspect(raw,ws()),week=firstWeek(ws());
  const status=$('lo82-pending'),preview=$('lo82-preview');preview.replaceChildren();
  if(result.state==='empty')status.textContent='No pending calendar transfer. Use Calendar Review to import an existing schedule.';
  else if(result.state==='invalid')status.textContent='⚠ '+result.reason+' Do not approve this transfer.';
  else{
   status.textContent=result.count+' candidates pending · '+result.eligible+' new · '+result.duplicates+' duplicates · '+result.conflicts+' overlapping existing plans. Review carefully before approving.';
   const list=document.createElement('ul');
   for(const e of result.items.slice(0,12)){
    const li=document.createElement('li');li.textContent=e.name+' · '+new Date(e.startAt).toLocaleString()+' – '+new Date(e.endAt).toLocaleString()+(e.duplicate?' · already imported':e.conflict?' · time conflict':'');list.append(li);
   }
   preview.append(list);
   if(result.items.length>12){const note=document.createElement('p');note.textContent='Showing 12 of '+result.items.length+' candidates.';preview.append(note)}
  }
  $('lo82-week').textContent='Next seven calendar days: '+week.plans.length+' existing plans ('+week.imported+' imported, '+week.tracked+' linked to tracking). These are not automatically completed activities.';
 }
 $('lo82-refresh').addEventListener('click',render);
 root.addEventListener('focus',render);root.addEventListener('pageshow',render);
 root.addEventListener('lifeos-v81-onboarded',render);
 root.addEventListener('lifeos-v65-plan-committed',render);
 root.addEventListener('storage',e=>{if(e.key===KEY||e.key===null)render()});
 render();
}
const api={inspect,firstWeek,KEY};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return api;
});
