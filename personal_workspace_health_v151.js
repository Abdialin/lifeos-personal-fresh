/* LifeOS V151 — read-only local workspace health */
(function(root){
'use strict';
const $=id=>root.document.getElementById(id);
const isSample=x=>Boolean(x?.seedBatch||x?.developmentExample||x?.assumed||['assumed-demo','development-starter','imported-example'].includes(x?.source));
function audit(w,at=Date.now()){
 const keys=['sessions','events','schedule','todos','workouts','meals','goals','habitDefinitions','idealRoutines'];
 const counts=Object.fromEntries(keys.map(k=>[k,Array.isArray(w?.[k])?w[k].length:0]));
 const s=Array.isArray(w?.sessions)?w.sessions:[],examples=s.filter(isSample),other=s.filter(x=>!isSample(x));
 const overdue=other.filter(x=>x.status==='running'&&(x.segments||[]).some(seg=>seg?.end==null&&Number.isFinite(seg.start)&&at-seg.start>21600000));
 return {counts,assumed:examples.length,other:other.length,finished:other.filter(x=>x.status==='finished').length,
 ongoing:other.filter(x=>['running','paused'].includes(x.status)).length,overdue:overdue.length};
}
function mount(){
 const parent=$('recoveryTools');if(!parent||$('lo151Health'))return;
 const el=root.document.createElement('details');el.id='lo151Health';
 el.innerHTML='<summary>Workspace health · local records</summary><p>Read-only overview; no records are changed.</p><div class="lo151-grid" id="lo151HealthMetrics"></div><p id="lo151HealthCaution"></p><button type="button" id="lo151Refresh" class="btn outline">Refresh local checks</button><p>Cloud record equality requires a separate server comparison.</p>';
 const style=root.document.createElement('style');style.textContent='#lo151Health{border:1px solid #3a666d;border-radius:14px;margin:12px 0 14px;background:#0b2434;padding:10px 14px;color:#eaf8f9}#lo151Health>summary{font-weight:800;font-size:15px;cursor:pointer;padding:8px 0}#lo151Health p{font-size:12px;color:#bed0dc;line-height:1.5}#lo151Health .lo151-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}#lo151Health .lo151-metric{background:#071a2c;border:1px solid #345b6b;border-radius:11px;padding:13px 10px;display:grid;gap:4px}#lo151Health .lo151-metric strong{font-size:22px;color:#f1fbff}#lo151Health .lo151-metric span{font-size:11px;color:#b8cad9}#lo151Health #lo151HealthCaution{color:#eac28d}#lo151Health button{min-height:46px;width:100%}';
 root.document.head.append(style);
 const anchor=$('lifeosV150Restore')||$('lifeosV150Mount');if(anchor)anchor.after(el);else parent.insertBefore(el,parent.children[1]||null);
 function metric(label,n){const e=root.document.createElement('div');e.className='lo151-metric';const a=root.document.createElement('strong'),b=root.document.createElement('span');a.textContent=String(n);b.textContent=label;e.append(a,b);return e}
 function refresh(){
  const target=$('lo151HealthMetrics'),note=$('lo151HealthCaution');if(!target||!note)return;
  try{const r=audit(root.lifeosReadOnlyWorkspace?.()||{});
   target.replaceChildren(metric('All saved sessions',r.counts.sessions),metric('Assumed / development sessions',r.assumed),
   metric('Other recorded sessions',r.other),metric('Finished other sessions',r.finished),
   metric('Saved plans',r.counts.schedule),metric('Tasks',r.counts.todos),metric('Workouts',r.counts.workouts),
   metric('Meals',r.counts.meals),metric('Open timers',r.ongoing),metric('Over 6-hour running timers',r.overdue));
   note.textContent=(r.overdue?'Review '+r.overdue+' unusually long-running timer(s). ':'')+'Counts are local records, not proof of completed activities or cloud equality.';
  }catch(e){note.textContent='Cannot inspect workspace: '+String(e.message||e)}
 }
 el.addEventListener('toggle',()=>{if(el.open)refresh()});$('lo151Refresh').addEventListener('click',refresh);
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,100),{once:true});else setTimeout(mount,100)}
root.LifeOSWorkspaceAuditV151={audit};
})(typeof globalThis!=='undefined'?globalThis:this);