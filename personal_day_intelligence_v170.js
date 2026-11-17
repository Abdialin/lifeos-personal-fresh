(()=>{'use strict';
const $=id=>document.getElementById(id),M=60000,D=86400000,PROF='lifeos.personal.duration-profiles.v80',NOTE='lifeos.personal.notes.v170',REV='lifeos.personal.overtime-reviews.v170',GROUP='lifeos.personal.challenge-drafts.v170';
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const load=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const store=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const fmt=m=>{m=Math.max(0,Math.round(m));return m>=60?Math.floor(m/60)+'h '+m%60+'m':m+'m'};
const exact=ms=>{const n=Math.max(0,Math.round(ms/1000)),h=Math.floor(n/3600),m=Math.floor(n/60)%60,sec=n%60;return (h?h+'h ':'')+(h?String(m).padStart(2,'0'):m)+'m '+String(sec).padStart(2,'0')+'s'};
const clock=t=>new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
const start=t=>new Date(new Date(t).setHours(0,0,0,0)).getTime();
const next=t=>new Date(new Date(t).setHours(24,0,0,0)).getTime();
const read=()=>{try{return window.lifeosReadOnlyWorkspace?.()||{}}catch{return {}}};
const real=s=>s&&!s.assumed&&!s.isExample&&!s.developmentExample&&!s.seedBatch&&!['development-starter','development-seed','assumed-demo'].includes(s.source);
function spans(s,now=Date.now()){
 const raw=Array.isArray(s.segments)?s.segments:[];
 if(raw.length)return raw.map(z=>[Number(z.start),z.end==null?(s.status==='running'?now:NaN):Number(z.end)]).filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b)&&b>a);
 let a=Number(s.startAt),b=s.status==='running'?now:Number(s.endAt);
 return Number.isFinite(a)&&Number.isFinite(b)&&b>a?[[a,b]]:[];
}
function merge(xs){const out=[];for(const [a,b] of xs.slice().sort((x,y)=>x[0]-y[0])){const last=out[out.length-1];if(last&&a<=last[1])last[1]=Math.max(b,last[1]);else out.push([a,b])}return out}
const mins=xs=>xs.reduce((n,[a,b])=>n+(b-a)/M,0);
function daySegments(s,from,to,now=Date.now()){
 return spans(s,now).map(([a,b])=>[Math.max(from,a),Math.min(to,b)]).filter(([a,b])=>b>a);
}
function snapshot(at=Date.now(),workspace=read()){
 const a=start(at),b=next(at),cutoff=Math.min(at,b),ss=(workspace.sessions||[]).filter(real),today=[];
 for(const s of ss){const segments=daySegments(s,a,cutoff,at);if(segments.length)today.push({s,segments})}
 const occupied=merge(today.flatMap(x=>x.segments)),gaps=[];let point=a;
 for(const [x,y] of occupied){if(x>point)gaps.push([point,x]);point=y}
 if(cutoff>point)gaps.push([point,cutoff]);
 const named=today.flatMap(({s,segments})=>segments.map(([x,y])=>({name:String(s.name||'Activity'),id:s.id,start:x,end:y})));
 const details=gaps.map(([x,y])=>{
  const before=named.filter(z=>z.end<=x).sort((p,q)=>q.end-p.end)[0];
  const after=named.filter(z=>z.start>=y).sort((p,q)=>p.start-q.start)[0];
  return {start:x,end:y,durationMs:y-x,before:before||null,after:after||null};
 });
 return {now:at,a,b,ss,today,used:occupied,gaps,details,unique:mins(occupied)};
}
function tick(){if(!$('lo170-rem'))return;let now=Date.now();$('lo170-rem').textContent=fmt((next(now)-now)/M)+' left today';$('lo170-elapsed').style.width=((now-start(now))/(next(now)-start(now))*100)+'%'}
function day(){let host=$('lo170-day');if(!host)return;let v=snapshot(),c=load(PROF,{}),view=host.dataset.view||'timeline',list=v.today.sort((p,q)=>p.segments[0][0]-q.segments[0][0]);host.innerHTML='<div class="l170-top"><div><small>YOUR 24-HOUR DAY</small><h2 id="lo170-rem"></h2><p>'+fmt(v.unique)+' tracked · '+(v.unique/60).toFixed(1)+'/24 hours</p></div><div class="l170-ring">'+Math.round(v.unique/1440*100)+'%<small>tracked</small></div></div><div class="l170-bar"><i id="lo170-elapsed"></i></div><div class="l170-track">'+v.used.map(([a,b])=>'<i style="left:'+((a-v.a)/(v.b-v.a)*100)+'%;width:'+((b-a)/(v.b-v.a)*100)+'%"></i>').join('')+'</div><div class="l170-labels"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div><div class="l170-tabs"><button data-l170-tab="timeline">Timeline</button><button data-l170-tab="averages">Averages</button><button data-l170-tab="limits">Duration limits</button></div><div id="l170-body"></div>';tick();
const render=()=>{let box=$('l170-body');host.querySelectorAll('[data-l170-tab]').forEach(b=>b.classList.toggle('sel',b.dataset.l170Tab===view));
if(view==='timeline'){
 const rows=list.flatMap(({s,segments})=>segments.map(([a,b])=>({s,a,b}))).sort((x,y)=>x.a-y.a);
 const gapCard=x=>'<article class="l180-gap-card"><div class="l180-gap-top"><strong>'+clock(x.start)+' – '+clock(x.end)+'</strong><b>'+exact(x.durationMs)+'</b></div><div class="l180-flow"><span>'+esc(x.before?.name||'Day begins')+'</span><i aria-hidden="true">→</i><span class="l180-unknown">Unlogged</span><i aria-hidden="true">→</i><span>'+esc(x.after?.name||'No later record yet')+'</span></div></article>';
 const major=v.details.filter(x=>x.durationMs>=15*M),minor=v.details.filter(x=>x.durationMs<15*M);
 const total=v.details.reduce((n,x)=>n+x.durationMs,0),sum=rows.reduce((n,x)=>n+x.b-x.a,0)*1,parallel=Math.max(0,sum-v.unique*M);
 box.innerHTML='<div class="l180-overview" aria-label="Today time summary"><div><span>Recorded</span><strong>'+exact(v.unique*M)+'</strong></div><div><span>Unlogged so far</span><strong>'+exact(total)+'</strong></div><div><span>Overlapping</span><strong>'+exact(parallel)+'</strong></div></div>'+
 '<details class="l180-section"><summary><span><b>Recorded activity periods</b><small>'+rows.length+' periods · tap to inspect</small></span><span class="l180-chevron" aria-hidden="true">⌄</span></summary><div class="l180-section-content">'+
 (rows.slice(0,80).map(({s,a,b})=>'<div class="l180-activity"><div><strong>'+esc(s.name)+'</strong><small>'+clock(a)+' – '+clock(b)+'</small></div><b>'+exact(b-a)+'</b><button data-l170-edit="'+esc(s.id)+'" aria-label="Edit '+esc(s.name)+'">Edit</button></div>').join('')||'<p class="l170-hint">No recorded periods today.</p>')+'</div></details>'+
 '<details class="l180-section" open><summary><span><b>Unlogged intervals</b><small>'+v.details.length+' gaps · '+exact(total)+'</small></span><span class="l180-chevron" aria-hidden="true">⌄</span></summary><div class="l180-section-content">'+
 (major.map(gapCard).join('')||'<p class="l170-hint">No gaps of 15 minutes or longer.</p>')+
 (minor.length?'<details class="l180-short"><summary>'+minor.length+' shorter gaps · under 15 minutes</summary>'+minor.map(gapCard).join('')+'</details>':'')+
 '<p class="l170-hint">Unlogged is unknown; it is not automatically free time or distraction. Pauses are excluded from recorded time.</p></div></details>';
}
else if(view==='averages'){let avg={};for(let s of v.ss){let t=Number(s.endAt);if(s.status!=='finished'||t<v.now-7*D||t>v.now)continue;let m=mins(spans(s));if(!m||m>1440)continue;let name=window.LifeOSDurationProfilesV80?.category?.(s.name)||s.name||'Other';let x=avg[name]||(avg[name]={n:0,sum:0});x.n++;x.sum+=m}box.innerHTML='<h3>Average per recorded session · 7 days</h3>'+Object.entries(avg).sort((a,b)=>b[1].sum-a[1].sum).slice(0,12).map(([name,x])=>'<div class="l170-row"><strong>'+esc(name)+'</strong><b>'+fmt(x.sum/x.n)+'</b><span>'+x.n+' sessions</span></div>').join('')+'<p class="l170-hint">Only completed records count. Averages are per session, not per night.</p>'}
else{let presets=[['Gym','gym',60],['Work','work',720],['Prayer','prayer',30],['Quran','quran',90],['Sleep','sleep',360],['Laundry','laundry',120],['Groceries','groceries',60],['Reading','reading',30]];box.innerHTML='<h3>Expected activity durations</h3>'+presets.map(([name,key,def])=>'<label class="l170-lim"><span>'+name+'</span><input type="number" min="5" max="1440" step="5" data-l170-limit="'+key+'" value="'+(c[key]?.minutes||def)+'"><small>min</small></label>').join('')+'<button id="l170-save">Save limits</button><p id="l170-lim-msg" class="l170-hint"></p>';$('l170-save').onclick=()=>{let val={...load(PROF,{})};for(let e of box.querySelectorAll('[data-l170-limit]')){let n=Number(e.value);if(!Number.isInteger(n)||n<5||n>1440){$('l170-lim-msg').textContent='Use 5–1440 whole minutes.';return}val[e.dataset.l170Limit]={minutes:n}}try{store(PROF,val);$('l170-lim-msg').textContent='Saved on this device. Existing sessions unchanged.'}catch{$('l170-lim-msg').textContent='Unable to save.'}}}
box.querySelectorAll('[data-l170-edit]').forEach(b=>b.onclick=()=>window.openEdit?.(b.dataset.l170Edit))};
host.querySelectorAll('[data-l170-tab]').forEach(b=>b.onclick=()=>{view=b.dataset.l170Tab;host.dataset.view=view;render()});render()}
function review(){let host=$('lo170-review');if(!host)return;let p=load(PROF,{}),r=load(REV,{}),pending=[];for(let s of snapshot().ss.filter(s=>s.status==='finished').slice(-150).reverse()){if(r[s.id]||!Number(s.endAt)||s.endAt<Date.now()-14*D)continue;let key=window.LifeOSDurationProfilesV80?.category?.(s.name)||'',expected=p[key]?.minutes,duration=mins(spans(s));if(expected&&duration>expected+10)pending.push({s,expected,duration});if(pending.length>=4)break}host.innerHTML='<h3>Exceeding planned durations</h3>'+(pending.map(({s,expected,duration})=>'<div class="l170-review"><b>'+esc(s.name)+' · '+fmt(duration)+' / '+fmt(expected)+'</b><p>Exceeds by '+fmt(duration-expected)+'. Confirm, or correct the actual session.</p><textarea data-l170-reason="'+esc(s.id)+'" placeholder="Optional: overtime, travel time, left running…" rows="2"></textarea><button data-l170-confirm="'+esc(s.id)+'">Confirm & explain</button><button data-l170-edit="'+esc(s.id)+'">Edit recorded times</button></div>').join('')||'<p class="l170-hint">No unreviewed sessions exceed saved limits.</p>')+'<p class="l170-hint">Confirming stores the explanation locally, without changing session times.</p>';host.querySelectorAll('[data-l170-confirm]').forEach(b=>b.onclick=()=>{let key=b.dataset.l170Confirm,msg=host.querySelector('[data-l170-reason="'+key+'"]')?.value.trim()||'';store(REV,{...load(REV,{}),[key]:{reason:msg,at:Date.now()}});review()});host.querySelectorAll('[data-l170-edit]').forEach(b=>b.onclick=()=>window.openEdit?.(b.dataset.l170Edit))}
function notes(){let host=$('lo170-notes');if(!host)return;let entries=load(NOTE,[]);host.innerHTML='<h3>Private notes</h3><p class="l170-hint">Offline notes stay on this browser/device. Export for backup.</p><textarea id="l170-note" rows="3" maxlength="10000" placeholder="Your thoughts, reflections, reminders…"></textarea><button id="l170-note-add">Save note</button><button id="l170-note-export">Export JSON</button>'+entries.slice(-12).reverse().map(x=>'<div class="l170-note"><small>'+new Date(x.at).toLocaleString()+'</small><p>'+esc(x.text)+'</p><button data-l170-delete="'+x.id+'">Delete</button></div>').join('');$('l170-note-add').onclick=()=>{let t=$('l170-note').value.trim();if(t){store(NOTE,[...entries,{id:'n'+Date.now(),text:t,at:Date.now()}]);notes()}};$('l170-note-export').onclick=()=>{let url=URL.createObjectURL(new Blob([JSON.stringify({notes:entries},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='lifeos-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};host.querySelectorAll('[data-l170-delete]').forEach(b=>b.onclick=()=>{if(confirm('Delete this note?')){store(NOTE,entries.filter(x=>x.id!==b.dataset.l170Delete));notes()}})}
function groups(){let host=$('lo170-groups');if(!host)return;let drafts=load(GROUP,[]);host.innerHTML='<h3>Community challenges</h3><p class="l170-hint">Draft an invitation. Real group joining, automatic friend updates and notifications need server-side sharing permissions and are not enabled in this version.</p><div class="l170-groupform"><input id="l170-group-name" placeholder="Quran, gym, book reading…" maxlength="70"><input id="l170-group-target" type="number" min="1" value="2"><select id="l170-group-unit"><option>pages/day</option><option>sessions/week</option><option>minutes/day</option></select><button id="l170-group-create">Create draft</button></div><p id="l170-group-msg" class="l170-hint"></p>'+drafts.slice(-8).reverse().map(x=>'<div class="l170-row"><strong>'+esc(x.name)+'</strong><span>'+x.target+' '+esc(x.unit)+'</span><button data-l170-share="'+x.id+'">Share text</button></div>').join('');$('l170-group-create').onclick=()=>{let name=$('l170-group-name').value.trim(),target=Number($('l170-group-target').value);if(!name||!Number.isInteger(target)||target<=0){$('l170-group-msg').textContent='Enter valid name and target.';return}store(GROUP,[...drafts,{id:'c'+Date.now(),name,target,unit:$('l170-group-unit').value}]);groups()};host.querySelectorAll('[data-l170-share]').forEach(b=>b.onclick=async()=>{let x=drafts.find(x=>x.id===b.dataset.l170Share);let t='LifeOS challenge idea: '+x.name+' · '+x.target+' '+x.unit+' (invitation draft; joining not yet enabled).';try{if(navigator.share)await navigator.share({text:t});else{await navigator.clipboard.writeText(t);$('l170-group-msg').textContent='Copied invitation draft.'}}catch{$('l170-group-msg').textContent=t}})}

function dailyReport(day,at=Date.now(),workspace=read()){
 const a=start(day),b=next(day),end=Math.min(b,at),sessions=(workspace.sessions||[]).filter(real);
 if(end<=a)return {a,b,end,records:[],occupied:[],gaps:[],gapDetails:[],planned:[],summedMs:0,uniqueMs:0,overlapMs:0,unloggedMs:0,plannedMs:0};
 const records=sessions.flatMap(s=>daySegments(s,a,end,at).map(([from,to])=>({id:s.id,name:String(s.name||'Activity'),start:from,end:to,ms:to-from}))).sort((x,y)=>x.start-y.start);
 const summedMs=records.reduce((n,x)=>n+x.ms,0),occupied=merge(records.map(x=>[x.start,x.end])),uniqueMs=occupied.reduce((n,[x,y])=>n+y-x,0);
 const gaps=[];let cursor=a;for(const [x,y] of occupied){if(cursor<x)gaps.push([cursor,x]);cursor=y}if(cursor<end)gaps.push([cursor,end]);
 const gapDetails=gaps.map(([x,y])=>({start:x,end:y,ms:y-x,before:records.filter(r=>r.end<=x).sort((a,b)=>b.end-a.end)[0]||null,after:records.filter(r=>r.start>=y).sort((a,b)=>a.start-b.start)[0]||null}));
 const planned=(workspace.schedule||[]).filter(p=>p?.status!=='cancelled'&&p?.status!=='skipped').flatMap(p=>{
  const x=Math.max(a,Number(p.startAt)),y=Math.min(end,Number(p.endAt));
  return Number.isFinite(x)&&Number.isFinite(y)&&y>x?[{name:String(p.name||'Plan'),start:x,end:y}]:[];
 });
 const planUnion=merge(planned.map(p=>[p.start,p.end])),plannedMs=planUnion.reduce((n,[x,y])=>n+y-x,0);
 let recordedAgainstPlanMs=0;for(const [x,y] of occupied)for(const [p,q] of planUnion)recordedAgainstPlanMs+=Math.max(0,Math.min(y,q)-Math.max(x,p));
 return {a,b,end,records,occupied,gaps,gapDetails,planned,summedMs,uniqueMs,overlapMs:Math.max(0,summedMs-uniqueMs),unloggedMs:end-a-uniqueMs,plannedMs,recordedAgainstPlanMs};
}
function planComparison(report,workspace){
 const plans=(workspace.schedule||[]).filter(p=>p&&p.status!=='cancelled'&&p.status!=='skipped').flatMap(p=>{
  const from=Math.max(report.a,Number(p.startAt)),to=Math.min(report.end,Number(p.endAt));
  return Number.isFinite(from)&&Number.isFinite(to)&&to>from?[{id:String(p.id||''),name:String(p.name||'Planned activity'),linkedId:String(p.sessionId||''),start:from,end:to}]:[];
 });
 const intersect=(left,right)=>{let total=0;for(const [a,b] of left)for(const [x,y] of right)total+=Math.max(0,Math.min(b,y)-Math.max(a,x));return total};
 const rows=plans.map(p=>{
  const normalize=t=>String(t||'').toLowerCase().replace(/[^a-z0-9\p{L}]+/gu,' ').trim();
  const target=normalize(p.name);
  const matches=report.records.filter(r=>(p.linkedId&&String(r.id)===p.linkedId)||(target.length>=3&&normalize(r.name)===target));
  const match=merge(matches.map(r=>[Math.max(p.start,r.start),Math.min(p.end,r.end)]).filter(([a,b])=>b>a));
  const all=merge(report.records.map(r=>[Math.max(p.start,r.start),Math.min(p.end,r.end)]).filter(([a,b])=>b>a));
  const scheduled=p.end-p.start,matchedMs=intersect(match,[[p.start,p.end]]),occupiedMs=intersect(all,[[p.start,p.end]]);
  return {...p,scheduledMs:scheduled,matchedMs,otherRecordedMs:Math.max(0,occupiedMs-matchedMs),noRecordMs:Math.max(0,scheduled-occupiedMs),confidence:p.linkedId?'linked session':target.length>=3?'exact activity name':'unmatched'};
 });
 return {rows,scheduledMs:rows.reduce((n,x)=>n+x.scheduledMs,0),matchedMs:rows.reduce((n,x)=>n+x.matchedMs,0),otherRecordedMs:rows.reduce((n,x)=>n+x.otherRecordedMs,0),noRecordMs:rows.reduce((n,x)=>n+x.noRecordMs,0)};
}
function mountReports(){
 const panel=$('analyticsPanel');if(!panel||$('lo180-report'))return;
 const section=document.createElement('section');section.id='lo180-report';section.className='l180-report';
 section.innerHTML='<div class="l180-report-header"><div><small>TIME INTELLIGENCE</small><h2>Where your time went</h2><p>Daily and weekly reality, without double-counting overlapping activity.</p></div></div><div class="l180-report-filters"><label>Review date<input id="lo180-report-date" type="date"></label><label>Period<select id="lo180-report-period"><option value="1">Selected day</option><option value="7">Seven days</option></select></label><button type="button" id="lo180-refresh">Refresh</button></div><div id="lo180-report-result" role="status"></div>';
 panel.prepend(section);
 const date=$('lo180-report-date'),period=$('lo180-report-period'),result=$('lo180-report-result');date.value=new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0')+'-'+String(new Date().getDate()).padStart(2,'0');
 const card=(title,value,note)=>'<article class="l180-stat"><small>'+title+'</small><strong>'+exact(value)+'</strong><span>'+note+'</span></article>';
 const render=()=>{
  const selected=new Date(date.value+'T12:00:00');if(!Number.isFinite(selected.getTime())){result.textContent='Select a valid date.';return}
  const n=Number(period.value),days=[],workspace=read(),now=Date.now();
  for(let i=n-1;i>=0;i--){const d=new Date(selected);d.setDate(d.getDate()-i);if(start(d.getTime())>now)continue;days.push(dailyReport(d.getTime(),now,workspace))}
  const sum=field=>days.reduce((x,d)=>x+d[field],0);
  const unique=sum('uniqueMs'),summed=sum('summedMs'),overlap=sum('overlapMs'),unlogged=sum('unloggedMs'),planned=sum('plannedMs'),against=sum('recordedAgainstPlanMs');
  const comparisons=days.map(d=>planComparison(d,workspace));const matchedPlans=comparisons.reduce((n,x)=>n+x.matchedMs,0);
  const dayRow=d=>{
   const label=new Date(d.a).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
   const gaps=d.gapDetails.filter(g=>g.ms>=15*M);
   const comparisons=planComparison(d,workspace);
   return '<details class="l180-report-day"><summary><span><b>'+esc(label)+'</b><small>'+d.records.length+' active periods · '+d.gapDetails.length+' gaps</small></span><strong>'+exact(d.uniqueMs)+' recorded</strong></summary><div class="l180-report-day-body"><div class="l180-reality"><span>Recorded '+exact(d.uniqueMs)+'</span><span>Unlogged '+exact(d.unloggedMs)+'</span><span>Overlap '+exact(d.overlapMs)+'</span></div><h4>Planned vs recorded</h4>'+
   (comparisons.rows.map(p=>'<article class="l181-plan"><div class="l181-plan-head"><strong>'+esc(p.name)+'</strong><small>'+clock(p.start)+'–'+clock(p.end)+'</small></div><div class="l181-plan-bars"><span style="--share:'+Math.round(p.scheduledMs?100*p.matchedMs/p.scheduledMs:0)+'%"></span></div><div class="l181-plan-metrics"><span>Matching activity: '+exact(p.matchedMs)+'</span><span>Other recorded: '+exact(p.otherRecordedMs)+'</span><span>No record: '+exact(p.noRecordMs)+'</span></div><small>Matched by '+esc(p.confidence)+'. No record does not prove the activity was missed.</small></article>').join('')||'<p class="l170-hint">No plans in this observed period.</p>')+
   '<h4>Recorded periods</h4>'+
   (d.records.map(r=>'<div class="l180-report-line"><span>'+esc(r.name)+'<small>'+clock(r.start)+'–'+clock(r.end)+'</small></span><b>'+exact(r.ms)+'</b></div>').join('')||'<p class="l170-hint">No recorded activity for this date.</p>')+
   '<h4>Unlogged between activities</h4>'+
   (gaps.map(g=>'<div class="l180-report-gap"><b>'+clock(g.start)+'–'+clock(g.end)+' · '+exact(g.ms)+'</b><small>'+esc(g.before?.name||'Start of day')+' → Unlogged → '+esc(g.after?.name||'No later recorded activity')+'</small></div>').join('')||'<p class="l170-hint">No unlogged gaps of 15 minutes or longer.</p>')+
   (d.gapDetails.length>gaps.length?'<details class="l180-short"><summary>Show '+(d.gapDetails.length-gaps.length)+' shorter gaps</summary>'+d.gapDetails.filter(x=>x.ms<15*M).map(g=>'<div class="l180-report-gap"><b>'+clock(g.start)+'–'+clock(g.end)+' · '+exact(g.ms)+'</b><small>'+esc(g.before?.name||'Start of day')+' → '+esc(g.after?.name||'No later activity')+'</small></div>').join('')+'</details>':'')+
   '</div></details>';
  };
  result.innerHTML='<div class="l180-stat-grid">'+card('Unique recorded',unique,'Time occupied by at least one activity')+card('Unlogged',unlogged,'Unknown time up to the observed cutoff')+card('Overlapping',overlap,'Extra summed time from parallel activity')+card('Planned',planned,'Scheduled time in the observed period')+'</div>'+
   '<div class="l181-plan-summary"><strong>Plan alignment</strong><p>'+exact(matchedPlans)+' recorded during the matching planned activity, out of '+exact(comparisons.reduce((n,x)=>n+x.scheduledMs,0))+' scheduled across individual plan intervals. Overlapping plans may count twice here.</p><small>Matching uses a linked session or exact activity name. This is evidence of matching tracked time, not a confirmed task completion.</small></div>'+ 
   '<div class="l180-report-note"><strong>Time accounting</strong><p>'+exact(summed)+' summed activity − '+exact(overlap)+' overlapping = '+exact(unique)+' uniquely recorded.</p><p>'+exact(against)+' of uniquely recorded time overlaps planned intervals. This is not proof that a specific plan was completed.</p><p>Days are divided at local midnight. Pauses are excluded. Today is measured only up to the current time; future hours are not counted as unlogged.</p></div>'+
   '<div class="l180-report-days"><h3>Breakdown by day</h3>'+days.map(dayRow).join('')+'</div>';
 };
 date.onchange=render;period.onchange=render;$('lo180-refresh').onclick=render;
 window.addEventListener('lifeos-v77-tracking-changed',()=>{if(document.body.dataset.lifeosView==='analytics')render()});
 $('lifeosNavigation')?.addEventListener('click',()=>setTimeout(()=>{if(document.body.dataset.lifeosView==='analytics')render()},100));
 render();
}
function init(){mountReports();if($('lo170-day'))return;let today=$('todayOverview');if(today){let el=document.createElement('section');el.id='lo170-day';el.className='l170-panel';today.prepend(el);day()}let tracking=$('trackPastPanel');if(tracking){let el=document.createElement('section');el.id='lo170-review';el.className='l170-panel';(document.getElementById('trackActivePanel')||tracking).prepend(el);review()}let life=$('personalActivityPanel');if(life){let el=document.createElement('section');el.id='lo170-notes';el.className='l170-panel';life.prepend(el);notes();let group=document.createElement('section');group.id='lo170-groups';group.className='l170-panel';el.after(group);groups()}document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();if(document.body.dataset.lifeosView==='dashboard')day()}});window.addEventListener('lifeos-v77-tracking-changed',()=>{if(document.body.dataset.lifeosView==='dashboard')day();review()});setInterval(tick,30000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1800),{once:true});else setTimeout(init,1800);
window.LifeOSDayIntelligenceV170={snapshot,spans,merge,mins,daySegments,dailyReport,planComparison};
})();