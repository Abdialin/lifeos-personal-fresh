/* LifeOS V132 — final Track visual pass. Read-only presentation of original records.
   Never edits timestamps, duration, history, timer state or classifications. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSTrackFinishV132=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const doc=()=>root.document,$=id=>doc().getElementById(id);
function el(tag,cls,text){const x=doc().createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x}
function parseDuration(text){
 const s=String(text||'').trim().toLowerCase();
 const h=s.match(/(\d+)\s*(?:h|hour)/),m=s.match(/(\d+)\s*(?:m|min)/),sec=s.match(/(\d+)\s*s(?:ec)?/);
 if(h||m||sec)return Number(h?.[1]||0)*60+Number(m?.[1]||0)+Number(sec?.[1]||0)/60;
 const clock=s.match(/^(\d{1,3}):(\d{2})(?::(\d{2}))?$/);
 return clock?Number(clock[1])*60+Number(clock[2])+Number(clock[3]||0)/60:NaN;
}
function suspicious(name,minutes){
 const n=String(name||'').toLowerCase();
 // Conservative display-only review thresholds, not constraints or automatic corrections.
 if(!Number.isFinite(minutes)||minutes<=0)return false;
 if(/prayer|\bfajr\b|\bdhuhr\b|\basr\b|\bmaghrib\b|\bisha\b/.test(n))return minutes>120;
 if(/\b(?:quran|memorization|meditation)\b/.test(n))return minutes>360;
 return minutes>1440;
}
function polishHistory(){
 const rootNode=$('history');if(!rootNode)return;
 for(const article of rootNode.querySelectorAll('.lo-history-item')){
  if(article.dataset.lo132Ready)returnNext(article);
  article.dataset.lo132Ready='1';
  const head=article.querySelector('.lo-history-entry'),foot=article.querySelector('.lo-history-foot'),actions=article.querySelector('.lo-history-actions');
  if(!head||!foot||!actions)continue;
  const title=head.querySelector('strong')?.textContent||'',duration=head.querySelector('span')?.textContent||'';
  const m=parseDuration(duration),warning=suspicious(title,m);
  const badge=el('span','lo132-type',/example|development/i.test(foot.querySelector('small')?.textContent||'')?'Example':/estimated/i.test(foot.querySelector('small')?.textContent||'')?'Estimated':'Recorded');
  head.append(badge);
  const toggle=el('button','lo132-more','Details  +');toggle.type='button';toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-label','Show actions for '+title);
  toggle.addEventListener('click',()=>{const open=article.classList.toggle('lo132-expanded');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'Close  −':'Details  +'});
  foot.append(toggle);
  if(warning){
   article.classList.add('lo132-review');
   const flag=el('button','lo132-flag','⚑ Review duration');flag.type='button';flag.title='Unusually long recorded session. No correction has been made.';
   flag.addEventListener('click',()=>{article.classList.add('lo132-expanded');toggle.setAttribute('aria-expanded','true');toggle.textContent='Close  −';actions.querySelector('[data-act="details"]')?.click()});
   head.append(flag);
  }
 }
 function returnNext(node){return node}
 for(const day of rootNode.querySelectorAll('.lo-history-day')){
  if(day.dataset.lo132Ready)continue;day.dataset.lo132Ready='1';
  const label=day.querySelector(':scope > summary > small');
  if(label&&/sessions.*\d+h|sessions.*\d+m/i.test(label.textContent||''))label.title='Added session durations can exceed 24 hours when recorded activities overlap. This is not unique time.';
 }
}
function refreshRing(){
 const host=$('todayLegacyOverviewPanel'),visual=host?.querySelector('.lo128-time-visual');
 if(!host||!visual)return;
 const ring=host.querySelector('.lo128-time-ring'),value=host.querySelector('.lo128-ring-number');
 if(!ring||!value)return;
 const total=parseDuration($('tracked')?.textContent),unique=parseDuration($('uniqueTime')?.textContent),overlap=parseDuration($('overlapTime')?.textContent);
 if(!Number.isFinite(total)||!Number.isFinite(unique)||!Number.isFinite(overlap)){value.textContent='—';return}
 const denom=Math.max(total,unique+overlap,0),pct=denom?Math.max(0,Math.min(100,unique/denom*100)):0;
 ring.style.setProperty('--lo128-ratio',pct.toFixed(2)+'%');
 value.textContent=$('uniqueTime')?.textContent?.trim()||'0m';
 ring.setAttribute('role','img');ring.setAttribute('aria-label','Unique recorded clock time '+value.textContent+'; additional overlapping duration '+($('overlapTime')?.textContent||'0m'));
 visual.dataset.lo132Ready='1';
 let expl=$('lo132TimeExplainer');
 if(!expl){expl=el('p','lo132-note');expl.id='lo132TimeExplainer';visual.after(expl)}
 expl.textContent='Green: '+Math.round(pct)+'% of added activity duration covers unique clock time. Blue: '+Math.round(100-pct)+'% is additional overlapping duration.';
 const note=host.querySelector(':scope > p.note');if(note)note.classList.add('lo132-footnote');
}
function polishDistraction(){
 const parent=$('trackDistractionPanel'),dash=$('lo129DistractionDashboard'),deep=$('lo129DistractionDeep');
 if(!parent||!dash||!deep)return;
 const reports=[...deep.querySelectorAll(':scope > p, :scope > ul, :scope > ol')];
 for(const r of reports){r.classList.add('lo132-original-report')}
 const lead=parent.querySelector(':scope > .note');if(lead)lead.classList.add('lo132-distraction-note');
 // Keep classification form within original report; avoid duplicate metrics on opening.
 deep.querySelector(':scope > summary').textContent='Classification & full evidence report';
 const label=dash.querySelector('.lo129-evidence-note');if(label)label.textContent='Only manually recorded distractions count. Missing time is unknown. Open the report for classification and supporting details.';
}
function polishArchiveIntro(){
 const history=$('trackHistoryPanel');if(!history)return;
 history.classList.add('lo132-archive');
 const notice=$('lo132HistoryNote');if(notice)return;
 const note=el('p','lo132-history-note','Daily totals add activity durations, including parallel activities. Open a day to review entries; flagged durations may need correction.');
 note.id='lo132HistoryNote';
 const list=$('history');if(list)list.before(note);
}
function render(){
 if(doc().body.dataset.lifeosView!=='tracking')return;
 polishHistory();refreshRing();polishDistraction();polishArchiveIntro();
}
function init(){root.setTimeout(render,2900);root.setInterval(render,3200);root.addEventListener('focus',render);root.addEventListener('lifeos-v77-tracking-changed',()=>root.setTimeout(render,100));}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()}
return {parseDuration,suspicious};
});
