/* LifeOS V255 — actionable mobile review and distraction consolidation.
 * Presentation only. All writes continue through the verified V252/V74 handlers. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSMobileReviewV255=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const $=id=>root.document?.getElementById(id);
function node(tag,className,text){const el=root.document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el}
function category(s){return String(s?.activityDetailsV252?.category||root.LifeOSActivityIntelligenceV251?.match?.(s?.name)?.id||'').toLowerCase()}
function eligible(s){return !!s&&s.status==='finished'&&!s.seedBatch&&!['development-starter','assumed-demo','imported-example'].includes(s.source)}
function findReviewSession(workspace,requested,preferred){
 const sessions=(Array.isArray(workspace?.sessions)?workspace.sessions:[]).filter(eligible).sort((a,b)=>(b.endAt||b.startAt)-(a.endAt||a.startAt));
 if(preferred){const exact=sessions.find(s=>String(s.id)===String(preferred));if(exact)return exact}
 if(requested)return sessions.find(s=>category(s)===requested)||null;
 return sessions[0]||null;
}
function distractionSummary(workspace,days=7,now=Date.now()){
 const cutoff=now-days*86400000,rows=(Array.isArray(workspace?.sessions)?workspace.sessions:[]).filter(s=>eligible(s)&&category(s)==='distraction'&&Number(s.startAt)<now&&Number(s.endAt||s.startAt)>=cutoff);
 let ms=0,unknown=0;const labels=new Map();
 for(const s of rows){
  if(!Array.isArray(s.segments))continue;
  let dur=0;
  for(const seg of s.segments){
   const a=Number(seg.start),b=Number(seg.end);
   if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)continue;
   dur+=Math.max(0,Math.min(b,now)-Math.max(a,cutoff));
  }
  ms+=dur;
  const label=String(s.distractionCategory||s.activityDetailsV252?.distractionCategory||'').trim();
  if(!label){unknown++;continue}
  labels.set(label,(labels.get(label)||0)+dur);
 }
 const ranked=[...labels.entries()].sort((a,b)=>b[1]-a[1]);
 return {count:rows.length,totalMs:ms,unclassified:unknown,top:ranked[0]||null};
}
const fmt=ms=>{const minutes=Math.round(Math.max(0,ms)/60000);return Math.floor(minutes/60)+'h '+String(minutes%60).padStart(2,'0')+'m'};
function mountReview(){
 const source=$('lo252-review'),shell=$('lo254-review-shell'),doc=root.document;
 if(!source||!shell||$('lo255-review-drawer'))return;
 const drawer=node('div','lo255-review-drawer');drawer.id='lo255-review-drawer';drawer.hidden=true;
 drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-label','Review activity');
 const shade=node('div','lo255-backdrop'),panel=node('section','lo255-sheet');
 const heading=node('header','lo255-sheet-header');const title=node('h2','','Review activity');const close=node('button','btn outline','Close');close.type='button';close.setAttribute('aria-label','Close activity review');
 heading.append(title,close);panel.append(heading);
 const area=node('div','lo255-sheet-body');panel.append(area);drawer.append(shade,panel);doc.body.append(drawer);
 area.append(source);shell.hidden=true;
 let previous=null;
 function open({category:requested,sessionId}={}){
  const s=findReviewSession(root.lifeosReadOnlyWorkspace?.(),requested,sessionId);
  const pick=$('lo252-picker');if(!pick)return false;
  if(requested&&!s){root.alert?.('No completed '+requested+' activity is available to review. Finish a relevant activity first.');return false}
  if(s&&[...pick.options].some(o=>o.value===String(s.id))){pick.value=String(s.id);pick.dispatchEvent(new Event('change',{bubbles:true}))}
  previous=doc.activeElement;drawer.hidden=false;doc.body.classList.add('lo255-review-open');panel.scrollTop=0;close.focus({preventScroll:true});return true;
 }
 function hide(){drawer.hidden=true;doc.body.classList.remove('lo255-review-open');previous?.focus?.({preventScroll:true})}
 close.onclick=hide;shade.onclick=hide;
 drawer.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();hide();return}
  if(e.key!=='Tab')return;
  const elements=[...drawer.querySelectorAll('button,select,input,textarea')].filter(x=>!x.disabled&&x.getClientRects().length);
  if(!elements.length)return;const first=elements[0],last=elements[elements.length-1];
  if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first.focus()}
 });
 doc.addEventListener('click',e=>{
  const shortcut=e.target.closest?.('.lo254-open-review');
  if(!shortcut)return;
  e.preventDefault();e.stopImmediatePropagation();
  open({category:shortcut.closest('#trackDistractionPanel')?'distraction':null});
 },true);
 root.addEventListener?.('lifeos-v255-open-review',e=>open(e.detail||{}));
 root.LifeOSMobileReviewV255Open=open;
 return {open,hide};
}
function mountDistraction(){
 const host=$('trackDistractionPanel');if(!host||$('lo255-distraction-summary'))return;
 const card=node('section','lo255-distraction-summary');card.id='lo255-distraction-summary';
 const head=node('div','lo255-distraction-header'),title=node('h3','','Distraction review'),tag=node('span','lo255-tag','Last 7 days');head.append(title,tag);card.append(head);
 const indicators=node('div','lo255-mini-stats');card.append(indicators);
 const feedback=node('p','lo255-feedback');card.append(feedback);
 const actions=node('div','lo255-actions');const edit=node('button','btn outline','Classify or correct');edit.type='button';
 const report=node('button','btn outline','Detailed report');report.type='button';actions.append(edit,report);card.append(actions);
 host.append(card);
 const legacy=$('lo74-distraction');if(legacy){
  const details=node('details','lo255-legacy-report');details.id='lo255-legacy-distraction';
  const summary=node('summary','','Full distraction history · 28 days');details.append(summary);
  // V94 Insights is a separate report; move it to Insights before nesting V74.
  const suite=$('lo94-suite'),insights=$('analyticsPanel');
  if(suite&&insights){const extra=node('details','lo255-legacy-report');extra.id='lo255-extended-insights';extra.append(node('summary','','Detailed cross-category evidence'));extra.append(suite);insights.append(extra)}
  legacy.before(details);details.append(legacy);details.open=false;
  report.onclick=()=>{details.open=true;details.scrollIntoView({behavior:'smooth',block:'start'})};
 }else report.hidden=true;
 edit.onclick=()=>root.dispatchEvent(new CustomEvent('lifeos-v255-open-review',{detail:{category:'distraction'}}));
 function refresh(){
  const result=distractionSummary(root.lifeosReadOnlyWorkspace?.()||{});
  indicators.replaceChildren();
  for(const [value,label] of [[fmt(result.totalMs),'Recorded time'],[String(result.count),'Sessions'],[String(result.unclassified),'To classify']]){
   const cell=node('div','lo255-mini-stat');cell.append(node('strong','',value),node('span','',label));indicators.append(cell)
  }
  feedback.textContent=result.count?(result.unclassified?'Review '+result.unclassified+' unclassified sessions to see your most common distraction types.':result.top?'Most recorded: '+result.top[0]+'.':'All recorded sessions classified.'):'No finished distractions recorded in the last 7 days.';
 }
 root.addEventListener?.('lifeos-v77-tracking-changed',refresh);root.addEventListener?.('lifeos-v74-records-changed',refresh);
 refresh();
}
function mount(){
 if(!root.document)return;
 mountReview();mountDistraction();
 const extra=$('lo94-suite'),insights=$('analyticsPanel');
 // If older analytics mounted after distraction, still consolidate it here.
 if(extra&&insights&&!extra.closest('#lo255-extended-insights')){
  let details=$('lo255-extended-insights');
  if(!details){details=node('details','lo255-legacy-report');details.id='lo255-extended-insights';details.append(node('summary','','Detailed cross-category evidence'));insights.append(details)}
  details.append(extra);
 }
}
if(root.document&&!root.document.getElementById('lo256-script')){
 const load=()=>{
  if(root.document.getElementById('lo256-script'))return;
  if(!root.document.getElementById('lo256-style')){const css=root.document.createElement('link');css.id='lo256-style';css.rel='stylesheet';css.href='/personal_action_first_v256.css?v=261';root.document.head.appendChild(css)}
  const script=root.document.createElement('script');script.id='lo256-script';script.src='/personal_action_first_v256.js?v=261';script.defer=true;root.document.head.appendChild(script);
 };
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',load,{once:true});else load();
}
if(root.document){
 const start=()=>{mount();[500,1700].forEach(ms=>root.setTimeout?.(mount,ms))};
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
return {category,eligible,findReviewSession,distractionSummary,fmt,mount};
});