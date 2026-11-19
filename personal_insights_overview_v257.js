/* LifeOS V257: concise cross-category Insights overview.
 * Read-only: canonical tracked sessions, explicit goal evidence and plan links.
 * No inferred goal completion or unlogged-time classification. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSInsightsV257=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const DAY=86400000, MIN=60000;
const sample=x=>!!x?.seedBatch||['development-starter','assumed-demo','imported-example'].includes(x?.source);
const money=x=>Math.round(x*10)/10;
const fmt=ms=>{const m=Math.round(Math.max(0,ms)/MIN);return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m'};
function rangeSummary(workspace,days=7,at=Date.now(),engine=root.LifeOSActivityAnalyticsV253){
 if(![7,14,30].includes(days))throw Error('Select 7, 14 or 30 days.');
 const catalog=root.LifeOSActivityIntelligenceV251?.catalog||[];
 const out=[];
 for(const c of catalog){const result=engine?.calculate?.(workspace,c.id,days,at);if(result&&result.sessions)out.push({id:c.id,title:c.title,count:result.sessions,ms:result.trackedMs,activeDays:result.activeDays,detailsCoverage:result.detailsCoverage})}
 out.sort((a,b)=>b.ms-a.ms);
 const totalMs=out.reduce((sum,v)=>sum+v.ms,0);
 return {days,all:out,totalMs,top:out.slice(0,5),categories:out.length};
}
function goalsSummary(workspace,engine=root.LifeOSGoalEvidenceV175){
 const rows=engine?.rows?.(workspace);
 if(!Array.isArray(rows))return {available:false,rows:[],reason:'Goal comparisons will appear when goal evidence is available.'};
 const output=[];
 for(const r of rows){
  const title=String(r?.g?.name||'Goal');
  const target=Number(r?.t),actual=Number(r?.cur?.value);
  if(!Number.isFinite(target)||target<=0||!Number.isFinite(actual)||actual<0)continue;
  output.push({title,target,actual,ratio:Math.max(0,actual/target),unit:String(engine?.unit?.(r.g)||'').slice(0,40),records:Number(r.cur?.records)||0,excluded:Number(r.cur?.excluded)||0});
 }
 return {available:true,rows:output};
}
function planSummary(workspace,days=7,at=Date.now()){
 const from=at-days*DAY,to=at+days*DAY;
 const plans=(workspace?.schedule||[]).filter(p=>p&&!sample(p)&&p.status!=='cancelled'&&Number.isFinite(p.startAt)&&Number.isFinite(p.endAt)&&p.endAt>p.startAt&&p.startAt>=from&&p.startAt<=to);
 const past=plans.filter(p=>p.startAt<=at);
 const confirmed=past.filter(p=>p.sessionId&&(workspace?.sessions||[]).some(s=>s&&!sample(s)&&String(s.id)===String(p.sessionId)&&s.status==='finished'));
 const future=plans.filter(p=>p.startAt>at);
 const affected=new Set();
 for(let i=0;i<future.length;i++)for(let j=i+1;j<future.length;j++)if(future[i].startAt<future[j].endAt&&future[j].startAt<future[i].endAt){affected.add(String(future[i].id));affected.add(String(future[j].id))}
 return {past:past.length,confirmed:confirmed.length,unverified:past.length-confirmed.length,upcoming:future.length,conflicts:affected.size};
}
function recommendation(report,goals,plan){
 const result=[];
 if(plan.conflicts)result.push({tone:'warning',title:'Plan overlap needs review',body:plan.conflicts+' upcoming plans are involved in a time conflict. Review before changing any plans.'});
 if(plan.unverified)result.push({tone:'neutral',title:'Confirm planned activities',body:plan.unverified+' past plans have no verified linked completion. They are not assumed missed.'});
 const incomplete=report.all.filter(v=>v.count>=2&&v.detailsCoverage<50).sort((a,b)=>b.count-a.count)[0];
 if(incomplete)result.push({tone:'neutral',title:'Improve '+incomplete.title+' insights',body:'Only '+incomplete.detailsCoverage+'% of its recorded sessions have details. Review a session for richer analytics.',category:incomplete.id});
 const shortfall=goals.rows.filter(v=>v.ratio<1).sort((a,b)=>a.ratio-b.ratio)[0];
 if(shortfall)result.push({tone:'neutral',title:'Goal progress: '+shortfall.title,body:money(shortfall.actual)+' / '+money(shortfall.target)+' '+shortfall.unit+' recorded against your existing target.'});
 return result.slice(0,3);
}
function mount(){
 const doc=root.document,host=doc?.getElementById('analyticsPanel');
 if(!host||doc.getElementById('lo257-insights'))return;
 const panel=doc.createElement('section');panel.id='lo257-insights';panel.className='lo257-panel';
 const header=doc.createElement('div');header.className='lo257-title';
 const h=doc.createElement('h2');h.textContent='Your life, in perspective';const period=doc.createElement('select');period.className='field';period.setAttribute('aria-label','Insights time period');
 for(const n of [7,14,30]){const opt=doc.createElement('option');opt.value=n;opt.textContent=n+' days';period.append(opt)}period.value='7';
 header.append(h,period);panel.append(header);
 const note=doc.createElement('p');note.className='lo257-sub';note.textContent='Recorded activities, verified plans and your existing goals—kept separate.';panel.append(note);
 const stats=doc.createElement('div');stats.className='lo257-stats';panel.append(stats);
 const mix=doc.createElement('section');mix.className='lo257-section';mix.append(document.createElement('h3'));mix.querySelector('h3').textContent='Where your tracked time went';panel.append(mix);
 const goal=doc.createElement('section');goal.className='lo257-section';goal.append(doc.createElement('h3'));goal.querySelector('h3').textContent='Goals · progress against targets';
 const goalNote=doc.createElement('p');goalNote.className='lo257-sub';goalNote.textContent='Each goal uses its existing configured measurement period, independently of the activity filter above.';goal.append(goalNote);panel.append(goal);
 const advice=doc.createElement('section');advice.className='lo257-section';advice.append(doc.createElement('h3'));advice.querySelector('h3').textContent='Worth reviewing';panel.append(advice);
 const foot=doc.createElement('p');foot.className='lo257-foot';foot.textContent='Category time is summed across activities and may overlap. Unknown time is never classified as distraction. Goal comparisons use the existing goal-evidence rules.';panel.append(foot);
 const create=(tag,cls,content)=>{const el=doc.createElement(tag);el.className=cls;if(content!==undefined)el.textContent=content;return el};
 function statistic(label,value){const box=create('div','lo257-stat');box.append(create('strong','',value),create('span','',label));stats.append(box)}
 function paint(){
  const w=root.lifeosReadOnlyWorkspace?.();if(!w)return;
  const days=Number(period.value),data=rangeSummary(w,days),goals=goalsSummary(w),plans=planSummary(w,days);
  stats.replaceChildren();statistic('Tracked category time',fmt(data.totalMs));statistic('Active categories',String(data.categories));statistic('Verified past plans',plans.confirmed+' / '+plans.past);
  [...mix.children].slice(1).forEach(e=>e.remove());[...goal.children].slice(2).forEach(e=>e.remove());[...advice.children].slice(1).forEach(e=>e.remove());
  if(!data.top.length)mix.append(create('p','lo257-empty','No finished tracked sessions in this period.'));
  for(const row of data.top){
   const b=create('button','lo257-mix-row');b.type='button';
   b.append(create('span','lo257-label',row.title));
   const rail=create('span','lo257-rail'),fill=create('span','lo257-fill');fill.style.width=(data.top[0].ms?Math.round(row.ms/data.top[0].ms*100):0)+'%';rail.append(fill);b.append(rail,create('strong','lo257-value',fmt(row.ms)));
   b.onclick=()=>root.dispatchEvent(new CustomEvent('lifeos-v257-open-category',{detail:{id:row.id}}));mix.append(b);
  }
  if(!goals.available)goal.append(create('p','lo257-empty',goals.reason));
  else if(!goals.rows.length)goal.append(create('p','lo257-empty','No measurable goals configured yet.'));
  for(const row of goals.rows.slice(0,5)){
   const item=create('div','lo257-goal');
   const top=create('div','lo257-goal-head');top.append(create('strong','',row.title),create('span','',money(row.actual)+' / '+money(row.target)+' '+row.unit));item.append(top);
   const rail=create('div','lo257-goal-rail'),fill=create('div','lo257-goal-fill');fill.style.width=Math.min(100,row.ratio*100)+'%';rail.append(fill);item.append(rail);
   const meta=create('small','',row.records+' qualifying records'+(row.excluded?' · '+row.excluded+' excluded examples':''));item.append(meta);goal.append(item);
  }
  const next=recommendation(data,goals,plans);
  if(!next.length)advice.append(create('p','lo257-empty','Nothing needs immediate review based on the available records.'));
  for(const item of next){
   const card=create('div','lo257-recommendation');card.append(create('strong','',item.title),create('p','',item.body));
   if(item.category){const button=create('button','lo257-inline-link','Review '+item.title.replace('Improve ','').replace(' insights',''));button.type='button';button.onclick=()=>root.dispatchEvent(new CustomEvent('lifeos-v257-open-category',{detail:{id:item.category}}));card.append(button)}
   advice.append(card);
  }
 }
 period.onchange=paint;root.addEventListener?.('lifeos-v77-tracking-changed',paint);
 doc.addEventListener('submit',e=>{if(e.target?.id==='goalForm')root.setTimeout?.(paint,80)});
 doc.addEventListener('click',e=>{if(e.target?.closest?.('#goalList [data-delete]'))root.setTimeout?.(paint,80)});
 root.addEventListener?.('lifeos-v65-plan-committed',paint);
 doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)paint()});
 host.prepend(panel);
 if(!doc.getElementById('lo257-other-reports')){
  const extras=doc.createElement('details');extras.id='lo257-other-reports';extras.className='lo255-legacy-report';
  const summary=doc.createElement('summary');summary.textContent='Open detailed analytics and supporting reports';extras.append(summary);
  for(const child of [...host.children])if(child!==panel&&child!==extras)extras.append(child);
  host.append(extras);
 }
 paint();
}
if(root.document&&!root.document.getElementById('lo259-script')){
 const load=()=>{
  if(root.document.getElementById('lo259-script'))return;
  if(!root.document.getElementById('lo259-style')){
   const css=root.document.createElement('link');css.id='lo259-style';css.rel='stylesheet';css.href='/personal_goal_setup_v259.css?v=260';root.document.head.appendChild(css);
  }
  const js=root.document.createElement('script');js.id='lo259-script';js.src='/personal_goal_setup_v259.js?v=260';js.defer=true;root.document.head.appendChild(js);
 };
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',load,{once:true});else load();
}
if(root.document){const start=()=>{mount();root.setTimeout?.(mount,900)};if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start()}
return {rangeSummary,goalsSummary,planSummary,recommendation,mount};
});