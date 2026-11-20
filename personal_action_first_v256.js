/* LifeOS V256 — action-first Today and Track.
 * Existing V77 timer actions are authoritative; no direct data edits.
 * Views use saved timestamps rather than accumulating background counters. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSActionFirstV256=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const $=id=>root.document?.getElementById(id),MIN=60000;
const el=(tag,cls,txt)=>{const n=root.document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const sessions=()=>{try{return root.lifeosReadOnlyWorkspace?.()?.sessions||[]}catch{return []}};
const eligible=s=>s&&['running','paused'].includes(s.status)&&s.id!=null;
function activeTime(s,at=Date.now()){
 if(!s||!Array.isArray(s.segments))return 0;
 return s.segments.reduce((sum,g)=>{
  const a=Number(g.start),b=g.end==null&&s.status==='running'?at:Number(g.end);
  return sum+(Number.isFinite(a)&&Number.isFinite(b)&&b>=a?b-a:0);
 },0);
}
function fmt(ms){const total=Math.floor(Math.max(0,ms)/1000),h=Math.floor(total/3600),m=Math.floor(total/60)%60,s=total%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function perform(s,action){
 const detail={id:String(s.id),action,result:{ok:false,message:'Not confirmed'}};
 root.dispatchEvent(new CustomEvent('lifeos-v77-timer-action',{detail}));
 return detail.result;
}
function jump(view,id){
 const button=root.document.querySelector('#lifeosNavigation button[data-view="'+view+'"]');
 button?.click();
 root.setTimeout?.(()=>{const target=id?$(id):null;target?.scrollIntoView({behavior:'smooth',block:'start'})},90);
}
function mountToday(){
 const overview=$('todayOverview');if(!overview||$('lo256-live-today'))return;
 const host=el('section','lo256-live-today');host.id='lo256-live-today';
 const header=el('div','lo256-live-head');
 header.append(el('strong','','Your live activity'),el('span','lo256-live-label','Tracking'));
 host.append(header);
 const body=el('div','lo256-live-body');host.append(body);
 const actions=el('div','lo256-live-actions');host.append(actions);
 const live=overview.querySelector('.today-welcome');
 if(live)live.after(host);else overview.prepend(host);
 function button(label,callback,primary=false){
  const b=el('button',primary?'lo256-action primary':'lo256-action',label);b.type='button';b.addEventListener('click',callback);actions.append(b);return b;
 }
 function paint(){
  const now=Date.now(),open=sessions().filter(eligible),running=open.filter(x=>x.status==='running'),s=running[0]||open[0];
  body.replaceChildren();actions.replaceChildren();const tag=header.querySelector('.lo256-live-label');
  if(!s){
   tag.textContent='Ready';body.append(el('p','lo256-live-empty','Nothing running. Start an activity when you are ready.'));
   button('Start an activity',()=>jump('tracking','trackQuickPanel'),true);
   if(open.length!==0)button('Review timers',()=>jump('tracking','trackActivePanel'));
   return;
  }
  tag.textContent=s.status==='running'?'● Running':'Ⅱ Paused';
  const name=el('strong','lo256-live-name',String(s.name||'Activity'));const clock=el('strong','lo256-live-clock',fmt(activeTime(s,now)));
  clock.setAttribute('role','timer');clock.setAttribute('aria-label','Tracked active time');
  body.append(name,clock);
  if(open.length>1)body.append(el('small','lo256-live-more','+'+(open.length-1)+' other open '+(open.length===2?'timer':'timers')));
  button(s.status==='running'?'Pause':'Resume',()=>{
   const result=perform(s,s.status==='running'?'pause':'resume');
   if(!result?.ok)root.alert?.(result?.message||'Unable to update timer');paint();
  },true);
  button('Finish activity',()=>{
   if(!root.confirm?.('Finish '+String(s.name||'this activity')+' and save the recorded time?'))return;
   const result=perform(s,'finish');
   if(result?.ok){paint();return}
   root.alert?.(result?.message||'Unable to verify the saved activity. Check Track before trying again.');
   paint();
  });
  const kind=String(s.activityDetailsV252?.category||root.LifeOSActivityIntelligenceV251?.match?.(s.name)?.id||'');
  if(['study','fitness','work','quran','reading','hobbies'].includes(kind)&&s.status==='running'){
   button('Focus',()=>{
    const label=$('lo207-focus-label'),start=$('lo207-start-focus');
    if(!label||!start){jump('tracking','lo207-focus');return}
    label.value=String(s.name||'Focus');start.click();
    const focus=$('lo207-focus');if(focus)focus.open=true;
    jump('tracking','lo207-focus');
   });
  }
  button('All timers',()=>jump('tracking','trackActivePanel'));
 }
 root.addEventListener?.('lifeos-v77-tracking-changed',paint);
 root.document.addEventListener('visibilitychange',()=>{if(!root.document.hidden)paint()});
 root.setInterval?.(()=>{if(root.document.hidden||root.document.body?.dataset.lifeosView!=='dashboard')return;
  const clock=host.querySelector('.lo256-live-clock');
  if(!clock)return;
  const open=sessions().filter(eligible),s=open.find(x=>x.status==='running')||open[0];
  if(s)clock.textContent=fmt(activeTime(s,Date.now()));
 },1000);
 paint();
}
function mountTrack(){
 const active=$('trackActivePanel'),quick=$('trackQuickPanel'),distraction=$('trackDistractionPanel');
 if(!active||!quick||$('lo256-track-tabs'))return;
 const bar=el('div','lo256-track-tabs');bar.id='lo256-track-tabs';
 const tabs=[
  {id:'active',title:'Live timers',node:active},
  {id:'start',title:'Start activity',node:quick},
  {id:'distraction',title:'Distractions',node:distraction}
 ].filter(x=>x.node);
 for(const tab of tabs){
  const b=el('button','lo256-track-tab',tab.title);b.type='button';b.dataset.target=tab.id;
  b.setAttribute('aria-controls',tab.node.id);
  b.addEventListener('click',()=>{for(const t of tabs){
   const current=t.id===tab.id;t.node.classList.toggle('lo256-track-selected',current);
   bar.querySelector('[data-target="'+t.id+'"]').setAttribute('aria-pressed',String(current));
  }tab.node.scrollIntoView({behavior:'smooth',block:'start'})});
  bar.append(b);
 }
 active.before(bar);
 // Tabs navigate to existing panels; never hide timer controls or activity data.
 bar.querySelector('[data-target="active"]')?.setAttribute('aria-pressed','true');
 const subtitle=active.querySelector('.head .sub');if(subtitle)subtitle.textContent='Your running and paused activities. Review, switch or finish here.';
 const notice=el('p','lo256-track-hint','Activity details, recovery tools and technical reports remain available below.');
 bar.after(notice);
}
function mount(){
 mountToday();mountTrack();
}
if(root.document&&!root.document.getElementById('lo257-script')){
 const load=()=>{
  if(root.document.getElementById('lo257-script'))return;
  if(!root.document.getElementById('lo257-style')){const css=root.document.createElement('link');css.id='lo257-style';css.rel='stylesheet';css.href='/personal_insights_overview_v257.css?v=260';root.document.head.appendChild(css)}
  const js=root.document.createElement('script');js.id='lo257-script';js.src='/personal_insights_overview_v257.js?v=271';js.defer=true;root.document.head.appendChild(js);
 };
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',load,{once:true});else load();
}
if(root.document){
 const start=()=>{mount();[450,1400].forEach(ms=>root.setTimeout?.(mount,ms))};
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
return {activeTime,fmt,perform,mount};
});