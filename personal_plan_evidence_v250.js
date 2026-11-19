/* LifeOS V250: Conservative plan-to-session evidence suggestions.
   No automatic completion or time rewriting. All links require review. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LifeOSPlanEvidenceV250=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const DAY=86400000,H=3600000;
 const normalize=v=>String(v||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
 function suggestions(workspace,at=Date.now(),days=14){
  const plans=Array.isArray(workspace?.schedule)?workspace.schedule:[],sessions=Array.isArray(workspace?.sessions)?workspace.sessions:[];
  const linked=new Set(plans.map(p=>p?.sessionId).filter(Boolean).map(String));
  const cutoff=at-days*DAY,proposals=[];
  for(const p of plans){
   if(!p||p.sessionId||p.status==='skipped'||p.status==='cancelled'||!Number.isFinite(p.startAt)||!Number.isFinite(p.endAt)||p.endAt<=p.startAt||p.startAt<cutoff||p.startAt>at)continue;
   const name=normalize(p.name);if(name.length<3)continue;
   const eligible=sessions.filter(s=>{
    if(!s||s.status!=='finished'||linked.has(String(s.id))||s.plannedId||!Number.isFinite(s.startAt)||!Number.isFinite(s.endAt)||s.endAt<s.startAt)return false;
    if(s.source==='development-starter'||s.seedBatch||s.source==='user-reviewed-gap')return false;
    if(normalize(s.name)!==name)return false;
    const intersects=s.startAt<p.endAt&&s.endAt>p.startAt;
    return intersects||Math.abs(s.startAt-p.startAt)<=30*60000;
   });
   if(eligible.length!==1)continue;
   const s=eligible[0];
   if(plans.some(other=>other!==p&&!other.sessionId&&other.status!=='skipped'&&other.status!=='cancelled'&&
    normalize(other.name)===name&&other.startAt<s.endAt&&other.endAt>s.startAt))continue;
   proposals.push({planId:String(p.id),sessionId:String(s.id),planName:String(p.name),sessionName:String(s.name),
    plannedStart:p.startAt,plannedEnd:p.endAt,trackedStart:s.startAt,trackedEnd:s.endAt});
  }
  const seen=new Map();
  for(const p of proposals)seen.set(p.sessionId,(seen.get(p.sessionId)||0)+1);
  return proposals.filter(p=>seen.get(p.sessionId)===1).sort((a,b)=>b.plannedStart-a.plannedStart);
 }
 function mount(){
  const doc=root.document,host=doc?.getElementById('scheduleList');
  if(!host||doc.getElementById('lo250-evidence'))return;
  const panel=doc.createElement('details');panel.id='lo250-evidence';
  panel.style.cssText='margin:14px 0;padding:14px;border:1px solid #578b99;border-radius:15px;background:#102b3e;color:#ecfbff';
  const title=doc.createElement('summary');title.textContent='Match finished tracking to plans · review suggestions';
  title.style.cssText='font-size:16px;font-weight:700;cursor:pointer;min-height:44px';
  const body=doc.createElement('div');body.id='lo250-evidence-list';body.style.cssText='display:grid;gap:10px;margin-top:12px';
  panel.append(title,body);host.before(panel);
  function render(){
   if(!panel.open)return;
   body.replaceChildren();
   const items=suggestions(root.lifeosReadOnlyWorkspace?.()||{},Date.now());
   if(!items.length){body.textContent='No unambiguous recent matches. Plans remain unconfirmed until explicitly linked to finished tracking.';return}
   const explanation=doc.createElement('p');explanation.textContent='Suggestions require matching names and nearby times. Review each before linking. A link does not change the original recording.';
   explanation.style.cssText='font-size:13px;color:#bbd8e3';body.append(explanation);
   for(const row of items.slice(0,12)){
    const card=doc.createElement('section');card.style.cssText='padding:12px;border-radius:12px;border:1px solid #4b677d';
    const heading=doc.createElement('strong');heading.textContent=row.planName;card.append(heading);
    const text=doc.createElement('p');text.style.cssText='font-size:13px';
    text.textContent='Planned '+new Date(row.plannedStart).toLocaleString()+' → '+new Date(row.plannedEnd).toLocaleTimeString()+
     ' · Tracked '+new Date(row.trackedStart).toLocaleString()+' → '+new Date(row.trackedEnd).toLocaleTimeString();
    card.append(text);
    const approve=doc.createElement('button');approve.type='button';approve.className='btn outline';
    approve.style.minHeight='44px';approve.textContent='Review & link completed session';
    approve.onclick=()=>{
     if(!root.confirm('Link finished session '+row.sessionName+' to plan '+row.planName+'? The original timestamps will remain unchanged.'))return;
     const detail={planId:row.planId,sessionId:row.sessionId,result:{ok:false,message:'Not saved.'}};
     root.dispatchEvent(new CustomEvent('lifeos-v250-link-evidence',{detail}));
     const notice=doc.createElement('p');notice.textContent=detail.result?.message||'Link not confirmed.';card.append(notice);
     if(detail.result?.ok)render();
    };
    card.append(approve);body.append(card);
   }
  }
  panel.addEventListener('toggle',render);
  root.addEventListener?.('lifeos-v77-tracking-changed',render);
  root.addEventListener?.('lifeos-v250-evidence-linked',render);
  doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)render()});
 }
 // Load V251 without modifying the large legacy HTML or existing timers.
 if(root.document && !root.document.getElementById('lo251-script')){
  const load=()=>{if(root.document.getElementById('lo251-script'))return;const el=root.document.createElement('script');el.id='lo251-script';el.src='/personal_activity_intelligence_v251.js?v=260';el.defer=true;root.document.head.appendChild(el);};
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',load,{once:true});else load();
 }
 if(root.document){
  const init=()=>{mount();if(!root.document.getElementById('lo250-evidence'))root.setTimeout?.(mount,800)};
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 }
 return {normalize,suggestions,mount};
});
