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
/* Today averages: read-only classification from explicit session details first, then name. */
function averageIdentity(s){
 const detail=s?.activityDetails||{},raw=String(s?.name||'').trim(),name=raw.toLowerCase();
 const prayer=String(detail.prayer||detail.prayerName||detail.prayerType||s?.prayerType||s?.prayerName||s?.prayer||'').toLowerCase();
 const canonical=t=>{const m=String(t||'').match(/\b(fajr|fajer|dhuhr|duhr|dhur|zuhr|zuhur|asr|maghrib|isha)\b/i);return m?(/^(zuhr|zuhur|duhr|dhur|dhuhr)$/i.test(m[1])?'Dhuhr':/^fajer$/i.test(m[1])?'Fajr':m[1][0].toUpperCase()+m[1].slice(1).toLowerCase()):null};
 const prayerType=canonical(prayer)||canonical(name);
 if(prayerType)return {group:'Prayer',name:prayerType};
 if(/\b(prayer|salah|salat|salaah|bön)\b/i.test(name)||prayer&&prayer!=='not specified')return {group:'Prayer',name:'Unspecified prayer'};
 const combined=[name,String(detail.activityType||''),String(detail.exercise||''),String(detail.subject||''),String(detail.role||'')].join(' ');
 if(/\b(quran|qur.an|koran|hifdh|hifz|surah|memorization)\b/i.test(combined)||detail.surah)return {group:'Quran',name:'Quran'};
 if(/\b(gym|workout|fitness|training|running|walking|cycling|boxing|swim|yoga|strength|träning|promenad)\b/i.test(combined))return {group:'Fitness',name:'Fitness'};
 if(/\b(study|studying|studies|university|universitet|högskola|kurs|course|lecture|föreläsning|seminar|seminarium|coursework|assignment|inlämning|submit|exam|tentamen|research|homework|projektarbete|project work|studier|plugg|arabic|language practice|language learning)\b/i.test(combined)||/\bkurs[. :_-]*grp\b/i.test(combined)||detail.subject)return {group:'University / Studies',name:raw||'University activity'};
 if(/\b(work|shift|business|development|security|arbete|jobba|jobb)\b/i.test(combined)||detail.role)return {group:'Work',name:'Work'};
 if(/\b(sleep|sleeping|nap)\b/i.test(combined))return {group:'Sleep',name:'Sleep'};
 if(/\b(eating|meal|breakfast|lunch|dinner|food|nutrition)\b/i.test(combined))return {group:'Nutrition',name:'Eating'};
 if(/\b(commut|travel|transport|driving)\b/i.test(combined))return {group:'Travel',name:'Travel'};
 if(/\b(distraction|distracted|scrolling|social media)\b/i.test(combined))return {group:'Distractions',name:'Distractions'};
 if(/\b(grocery|groceries|shopping|car wash|errand)\b/i.test(combined))return {group:'Errands',name:'Errands'};
 const category=String(s?.category||detail.category||'').trim();
 if(/^(study|studies|studying|university|education|coursework)$/i.test(category))return {group:'University / Studies',name:raw||category};
 if(category&&category.toLowerCase()!=='other')return {group:category,name:raw||category};
 return {group:'Unclassified',name:raw&&raw.toLowerCase()!=='other'?raw:'Needs classification'};
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
else if(view==='averages'){
 const avg=new Map(),children=new Map();
 for(const s of v.ss){
  const t=Number(s.endAt);if(s.status!=='finished'||!Number.isFinite(t)||t<v.now-7*D||t>v.now)continue;
  const windowStart=v.now-7*D;
  const clipped=spans(s).map(([a,b])=>[Math.max(a,windowStart),Math.min(b,v.now)]).filter(([a,b])=>b>a);
  const m=mins(clipped);if(!m||m>1440)continue;
  const id=averageIdentity(s),group=id.group;
  const total=avg.get(group)||{n:0,sum:0};total.n++;total.sum+=m;avg.set(group,total);
  let names=children.get(group);if(!names){names=new Map();children.set(group,names)}
  const label=group==='Prayer'?id.name:String(s.name||id.name||group).trim()||group;
  const item=names.get(label)||{n:0,sum:0};item.n++;item.sum+=m;names.set(label,item);
 }
 const rows=[...avg.entries()].sort((a,b)=>b[1].sum-a[1].sum);
 const row=(name,x)=>'<div class="l170-row"><strong>'+esc(name)+'</strong><b>'+fmt(x.sum/x.n)+'</b><span>'+x.n+' sessions · '+fmt(x.sum)+' total</span></div>';
 const openGroups=new Set([...box.querySelectorAll('details.l170-avg-group[open]')].map(d=>d.dataset.group));
 box.innerHTML='<h3>Activity averages · last 7 days</h3>'+rows.map(([group,x])=>{
  const items=[...(children.get(group)||new Map()).entries()].sort((a,b)=>b[1].sum-a[1].sum);
  const body=items.map(([name,v])=>row(name,v)).join('');
  return '<details class="l170-avg-group" data-group="'+esc(group)+'"'+(openGroups.has(group)?' open':'')+'><summary><strong>'+esc(group)+'</strong><span>'+fmt(x.sum)+' total · '+x.n+' sessions</span><small>'+fmt(x.sum/x.n)+' avg</small></summary><div class="l170-avg-children">'+body+'</div></details>';
 }).join('')+'<p class="l170-hint">Tap a category to see its activities. Averages count completed sessions only. Unidentified sessions are not guessed or renamed.</p>';
}

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

function mountLifeHub(){
 const personal=$('personalActivityPanel'),fitness=$('lifeosFitnessDashboard'),nutrition=$('lifeosNutritionDashboard');
 if(!personal||!fitness||!nutrition||$('lo182-life-hub'))return;
 const fitnessPanel=fitness.closest('section.panel'),nutritionPanel=nutrition.closest('section.panel');
 if(!fitnessPanel||!nutritionPanel)return;
 const hub=document.createElement('section');hub.id='lo182-life-hub';hub.className='l182-hub';
 hub.innerHTML='<div class="l182-heading"><div><small>MY LIFE · PERSONAL WELLBEING</small><h2>Progress across your life</h2><p>Your existing fitness, nutrition and personal routine records in one place.</p></div></div><div class="l182-cards" id="lo182-cards"></div><div class="l182-actions"><button data-l182-target="fitness">Fitness & body</button><button data-l182-target="nutrition">Nutrition & meals</button><button data-l182-target="routines">Personal routines</button></div><div class="l182-recents"><h3>Recent activity</h3><div id="lo182-recent"></div></div><p class="l182-note">Completed records are not created by this overview. Time recorded in a timer and the same activity logged elsewhere are not added together.</p>';
 fitnessPanel.before(hub);
 const targets={fitness:fitnessPanel,nutrition:nutritionPanel,routines:personal};
 hub.querySelectorAll('[data-l182-target]').forEach(b=>b.addEventListener('click',()=>{const el=targets[b.dataset.l182Target];el?.scrollIntoView({behavior:'smooth',block:'start'})}));
 const sample=x=>!!(x?.assumed||x?.isExample||x?.developmentExample||x?.seedBatch||['development-starter','development-seed','assumed-demo'].includes(x?.source));
 const dateOf=x=>{
  if(typeof x?.date==='string'&&/^\d{4}-\d{2}-\d{2}/.test(x.date))return x.date.slice(0,10);
  const raw=x?.completedAt??x?.endAt??x?.createdAt;
  const d=typeof raw==='number'?new Date(raw):new Date(raw||'');
  return Number.isFinite(d.getTime())?d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'):'';
 };
 const render=()=>{
  const w=read(),today=new Date(),first=new Date(today);first.setHours(0,0,0,0);first.setDate(first.getDate()-6);
  const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const since=ymd(first);
  const workouts=(w.workouts||[]).filter(x=>!sample(x)&&dateOf(x)>=since);
  const meals=(w.meals||[]).filter(x=>!sample(x)&&dateOf(x)>=since);
  const logs=(w.personalLogs||[]).filter(x=>!sample(x)&&dateOf(x)>=since);
  const measures=(w.bodyMetrics||[]).filter(x=>!sample(x)).sort((a,b)=>dateOf(b).localeCompare(dateOf(a)));
  const weight=measures.find(x=>Number.isFinite(Number(x.weightKg))&&x.weightKg!=null);
  const categories=new Set(logs.map(x=>String(x.category||'Other').trim()).filter(Boolean));
  const card=(label,value,detail)=>'<article class="l182-card"><span>'+label+'</span><strong>'+value+'</strong><small>'+detail+'</small></article>';
  $('lo182-cards').innerHTML=card('Workout logs',workouts.length,'Past seven calendar days')+
   card('Meal entries',meals.length,'Past seven calendar days')+
   card('Personal routine logs',logs.length,categories.size+' categories this week')+
   card('Latest weight',weight?esc(Number(weight.weightKg).toLocaleString(undefined,{maximumFractionDigits:1})+' kg'):'—',weight?esc(dateOf(weight)):'No measurements recorded');
  const recent=[
   ...workouts.map(x=>({label:'Fitness',title:String(x.type||x.activity||'Workout'),date:dateOf(x)})),
   ...meals.map(x=>({label:'Nutrition',title:String(x.name||'Meal'),date:dateOf(x)})),
   ...logs.map(x=>({label:'Routine',title:String(x.category||'Personal log')+(Number(x.quantity)>0&&x.unit?' · '+x.quantity+' '+x.unit:''),date:dateOf(x)}))
  ].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  $('lo182-recent').innerHTML=recent.length?recent.map(x=>'<div class="l182-recent"><span>'+esc(x.label)+'</span><strong>'+esc(x.title)+'</strong><time>'+esc(x.date)+'</time></div>').join(''):'<p class="l182-empty">No qualifying records in the past seven days. Add a workout, meal or personal routine below.</p>';
 };
 render();
 $('lifeosNavigation')?.addEventListener('click',e=>{if(e.target.closest('[data-view="life"]'))setTimeout(render,100)});
 window.addEventListener('lifeos-v77-tracking-changed',()=>{if(document.body.dataset.lifeosView==='life')render()});
 window.addEventListener('focus',()=>{if(document.body.dataset.lifeosView==='life')render()});
 hub.addEventListener('click',e=>{if(e.target.closest('[data-l182-target]'))render()});
 window.LifeOSLifeHubV182={refresh:render};
}

function insightsDigestData(workspace,now=Date.now()){
 const today=start(now),days=[];
 for(let i=14;i>=1;i--){const date=new Date(today);date.setDate(date.getDate()-i);days.push(dailyReport(date.getTime(),now,workspace))}
 const older=days.slice(0,7),recent=days.slice(7);
 const total=(items,key)=>items.reduce((n,x)=>n+x[key],0);
 const unique=total(recent,'uniqueMs'),olderUnique=total(older,'uniqueMs');
 const loggedDays=recent.filter(x=>x.uniqueMs>0).length,previousDays=older.filter(x=>x.uniqueMs>0).length;
 const byActivity=new Map();
 for(const d of recent)for(const r of d.records)byActivity.set(r.name,(byActivity.get(r.name)||0)+r.ms);
 const activities=[...byActivity].sort((a,b)=>b[1]-a[1]);
 return {unique,olderUnique,loggedDays,previousDays,overlaps:total(recent,'overlapMs'),missing:total(recent,'unloggedMs'),activities,days:recent};
}
function insightRecommendations(workspace,now=Date.now()){
 const d=insightsDigestData(workspace,now),confidence=d.loggedDays>=6&&d.previousDays>=6?'High':d.loggedDays>=4&&d.previousDays>=4?'Moderate':'Limited';
 const evidence=[];
 // Compare like with like: only days with recorded activity, never interpret empty days as failure.
 const sufficientlyLogged=d.loggedDays>=4&&d.previousDays>=4;
 if(sufficientlyLogged){
  const recentAverage=d.unique/d.loggedDays,previousAverage=d.olderUnique/d.previousDays;
  const difference=recentAverage-previousAverage;
  if(Math.abs(difference)>=45*60000){
   evidence.push({title:'Recorded time changed',confidence,kind:'trend',detail:'Average recorded coverage on days with logs '+(difference>0?'increased':'decreased')+' by '+(Math.abs(difference)/3600000).toFixed(1)+' hours per recorded day.',basis:d.loggedDays+' recent and '+d.previousDays+' earlier days with activity records.',suggestion:'Review whether tracking habits or your routine changed before adjusting plans.'});
  }
 }
 // Frequent parallel records are a signal for review, never proof of multitasking or error.
 const activeDays=d.days.filter(x=>x.uniqueMs>0);
 const overlapDays=activeDays.filter(x=>x.overlapMs>=30*60000);
 if(overlapDays.length>=3){
  evidence.push({title:'Parallel tracking is frequent',confidence:activeDays.length>=6?'Moderate':'Limited',kind:'overlap',detail:'Overlaps of at least 30 minutes occurred on '+overlapDays.length+' of '+activeDays.length+' recorded days.',basis:'Active segments are compared in local calendar time, with parallel durations counted separately.',suggestion:'Review these overlapping sessions in Track; some may be legitimate simultaneous activities.'});
 }
 // Recurring time gaps only where records exist on both sides.
 const gaps=d.days.flatMap(day=>day.gapDetails.filter(g=>g.ms>=45*60000&&g.before&&g.after).map(g=>({day:day.a,hour:new Date(g.start).getHours(),ms:g.ms})));
 const byPeriod=new Map();for(const gap of gaps){const period=Math.floor(gap.hour/3)*3;const key=String(period);if(!byPeriod.has(key))byPeriod.set(key,new Set());byPeriod.get(key).add(start(gap.day))}
 const frequent=[...byPeriod].map(([h,dates])=>({hour:Number(h),count:dates.size})).sort((a,b)=>b.count-a.count)[0];
 if(frequent?.count>=3){
  const from=String(frequent.hour).padStart(2,'0'),to=String((frequent.hour+3)%24).padStart(2,'0');
  evidence.push({title:'Recurring unlogged window',confidence:frequent.count>=5?'Moderate':'Limited',kind:'gap',detail:'A gap of 45 minutes or more started between '+from+':00 and '+to+':00 on '+frequent.count+' separate days.',basis:'Only gaps bounded by two recorded activities qualify; the gap itself remains unknown.',suggestion:'Consider whether a reminder to log this period would be useful. Do not assume it is free time.'});
 }
 if(!evidence.length)evidence.push({title:'Build a stronger evidence baseline',confidence:'Limited',kind:'baseline',detail:'There is not yet a repeated pattern strong enough to justify a schedule suggestion.',basis:d.loggedDays+' of the last seven complete days have recorded activity.',suggestion:'Continue tracking normally; LifeOS will compare completed days without treating missing records as missed commitments.'});
 return {confidence,evidence:evidence.slice(0,3),sampleDays:d.loggedDays,previousDays:d.previousDays};
}

const FB186='lifeos.personal.insight-feedback.v186';
function median186(xs){const a=xs.slice().sort((a,b)=>a-b),k=Math.floor(a.length/2);return a.length?(a.length%2?a[k]:(a[k-1]+a[k])/2):NaN}
function dayType186(day,workspace){
 const work=/\b(work|shift|security|job|väktare|arbete)\b/i;
 const intervals=(workspace.schedule||[]).filter(x=>work.test(String(x.name||''))&&x.status!=='cancelled').map(x=>[Math.max(day.a,Number(x.startAt)),Math.min(day.b,Number(x.endAt))]).filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b)&&b>a);
 const planned=merge(intervals).reduce((n,[a,b])=>n+b-a,0);
 const recorded=merge(day.records.filter(r=>work.test(r.name)).map(r=>[r.start,r.end])).reduce((n,[a,b])=>n+b-a,0);
 if(Math.max(recorded,planned)>=4*3600000)return 'Workday evidence';
 const dow=new Date(day.a).getDay();return dow===0||dow===6?'Weekend, no shift evidence':'Weekday, no shift evidence';
}
function newInsights186(workspace,now=Date.now()){
 const d=insightsDigestData(workspace,now),complete=d.days,types=new Map();
 for(const day of complete){if(!day.uniqueMs)continue;const name=dayType186(day,workspace);if(!types.has(name))types.set(name,[]);types.get(name).push(day.uniqueMs)}
 const dayTypes=[...types].map(([name,ms])=>({name,count:ms.length,medianMs:median186(ms)}));
 const predictionRows=[];
 const candidates=(workspace.sessions||[]).filter(s=>real(s)&&s.status==='finished');
 const byName=new Map();
 for(const item of candidates){
  const name=String(item.name||'').trim(),duration=spans(item,now).reduce((n,[a,b])=>n+b-a,0);
  if(!name||duration<5*60000||duration>12*3600000||!Number.isFinite(duration))continue;
  if(!byName.has(name.toLowerCase()))byName.set(name.toLowerCase(),[]);
  byName.get(name.toLowerCase()).push({name,duration,end:Number(item.endAt)||Math.max(...spans(item,now).map(x=>x[1]))});
 }
 for(const group of byName.values()){
  const selected=group.sort((a,b)=>b.end-a.end).slice(0,14);
  if(selected.length<4)continue;
  const values=selected.map(x=>x.duration),med=median186(values),p25=median186(values.filter(x=>x<=med)),p75=median186(values.filter(x=>x>=med));
  if(!Number.isFinite(med)||med<5*60000)continue;
  const spread=(p75-p25)/med;
  const confidence=selected.length>=8&&spread<=0.35?'Moderate':'Limited';
  predictionRows.push({name:selected[0].name,medianMs:med,lowMs:p25,highMs:p75,count:selected.length,confidence,spread});
 }
 predictionRows.sort((a,b)=>b.count-a.count);
 const typeSummaries=dayTypes.filter(x=>x.count>=3);
 const suggestions=[];
 if(predictionRows.length){
  const x=predictionRows[0];
  suggestions.push({id:'duration:'+x.name.toLowerCase(),kind:'duration',confidence:x.confidence,title:'Typical activity duration: '+x.name,detail:'The median of '+x.count+' completed sessions is '+fmt(x.medianMs/M)+'. Observed central range: '+fmt(x.lowMs/M)+'–'+fmt(x.highMs/M)+'.',why:'Calculated from completed, non-example active timer segments (last 14 sessions). Paused periods do not count. Wide variation lowers confidence.',action:'Compare this range with your next planned duration; only change your plan if it fits your circumstances.'});
 }
 if(typeSummaries.length>=2){
  typeSummaries.sort((a,b)=>b.count-a.count);
  const a=typeSummaries[0],b=typeSummaries[1];
  suggestions.push({id:'daytypes:'+a.name+':'+b.name,kind:'daytype',confidence:a.count>=4&&b.count>=4?'Moderate':'Limited',title:'Different day types show different tracking patterns',detail:a.name+': '+fmt(a.medianMs/M)+' typical unique time ('+a.count+' days). '+b.name+': '+fmt(b.medianMs/M)+' ('+b.count+' days).',why:'Day types are inferred from work plans/recorded shifts (four hours or more) or calendar weekdays. They are not verified roster labels; only days with records are compared.',action:'Review workdays separately from other days before adjusting goals or schedules.'});
 }
 if(!suggestions.length)suggestions.push({id:'baseline',kind:'baseline',confidence:'Limited',title:'More evidence is needed for personalized predictions',detail:'No activity yet has four qualifying completed sessions, or day types lack three recorded days each.',why:'Predictions require repeated comparable records; estimated or unlogged time cannot substitute for completed sessions.',action:'Continue tracking normally. Your schedule will not change automatically.'});
 return {suggestions:suggestions.slice(0,2),dayTypes,predictions:predictionRows};
}
function feedback186(){const data=load(FB186,{});return data&&typeof data==='object'&&!Array.isArray(data)?data:{}}
function updateFeedback186(id,status){
 const valid=['useful','not-relevant','later'];if(!valid.includes(status)||typeof id!=='string'||id.length>180)return false;
 try{const current=feedback186();current[id]={status,updatedAt:Date.now()};store(FB186,current);return true}catch{return false}
}
function mountInsightsDigest(){
 if($('lo184-insights-digest')||!$('lifeosViewTitle'))return;
 const hub=document.createElement('section');hub.id='lo184-insights-digest';hub.className='l184-digest';
 hub.innerHTML='<div class="l184-kicker">YOUR WEEK · INTERPRETED</div><h2>What your tracking reveals</h2><p class="l184-lead">Patterns and changes from completed days—not another activity history.</p><div class="l184-grid" id="lo184-metrics"></div><div class="l184-findings" id="lo184-findings"></div><div class="l185-recommendations" id="lo185-recommendations"></div><div class="l186-recommendations" id="lo186-recommendations"></div><div class="l184-actions"><button type="button" id="lo184-detail-toggle" aria-expanded="false">Explore advanced reports ↓</button><button type="button" id="lo184-track-link">Open activity history ↗</button></div><p class="l184-disclaimer">Based on recorded evidence. Missing time remains unknown; no schedule changes are made automatically.</p>';
 $('lifeosViewTitle').after(hub);
 const advanced=$('lo184-detail-toggle');
 const showAdvanced=value=>{document.body.dataset.lo184Advanced=value?'yes':'no';advanced.setAttribute('aria-expanded',String(value));advanced.textContent=value?'Hide advanced reports ↑':'Explore advanced reports ↓'};
 const metric=(label,value,sub)=>'<article class="l184-metric"><span>'+label+'</span><strong>'+value+'</strong><small>'+sub+'</small></article>';
 const finding=(label,body)=>'<article class="l184-finding"><b>'+label+'</b><p>'+body+'</p></article>';
 const hrs=ms=>(ms/3600000).toFixed(1)+'h';
 const render=()=>{
  const d=insightsDigestData(read());
  const delta=d.unique-d.olderUnique;
  const meaningful=d.loggedDays>=4&&d.previousDays>=4;
  const trend=meaningful?(Math.abs(delta)<900000?'About the same':delta>0?'More tracked':'Less tracked'):'Not enough consistent days';
  $('lo184-metrics').innerHTML=metric('Weekly tracking change',meaningful?(delta>0?'+':'')+hrs(delta):'—',meaningful?trend:'Requires 4 recorded days in each week')+
  metric('Days with records',d.loggedDays+' / 7','Previous seven days: '+d.previousDays+' / 7')+
  metric('Overlapping activity',hrs(d.overlaps),'Additional summed time, not extra hours in a day');
  const findings=[];
  if(d.activities.length) {
   const [name,ms]=d.activities[0];
   findings.push(finding('Largest recorded commitment',esc(name)+' accounts for '+hrs(ms)+' of summed activity during the last seven complete days. Parallel activities may also be recorded.'));
  } else findings.push(finding('No recent tracking evidence','No qualifying finished or active periods were recorded during the last seven complete days.'));
  if(meaningful)findings.push(finding('Change from the previous week',
   (delta>=0?'Your uniquely recorded time increased by ':'Your uniquely recorded time decreased by ')+hrs(Math.abs(delta))+'. This measures tracking coverage, not productivity or wellbeing.'));
  else findings.push(finding('Trend confidence is limited','A weekly comparison needs at least four days with records in each week. Missing days are unknown, not unsuccessful.'));
  if(d.loggedDays>=4) {
   const most=d.days.slice().sort((a,b)=>b.uniqueMs-a.uniqueMs)[0];
   findings.push(finding('Day with most recorded coverage',esc(new Date(most.a).toLocaleDateString(undefined,{weekday:'long'}))+' had '+hrs(most.uniqueMs)+' of uniquely recorded activity. Check whether long sessions or overlaps need review.'));
  }
  $('lo184-findings').innerHTML=findings.slice(0,2).join('');
  const suggestions=insightRecommendations(read());
  $('lo185-recommendations').innerHTML='<div class="l185-title"><h3>Patterns worth reviewing</h3><span>'+esc(suggestions.confidence)+' evidence</span></div>'+
   suggestions.evidence.map((x,i)=>'<article class="l185-suggestion"><div class="l185-suggestion-head"><strong>'+esc(x.title)+'</strong><small>'+esc(x.confidence)+' confidence</small></div><p>'+esc(x.detail)+'</p><details><summary>Why this finding?</summary><p>'+esc(x.basis)+'</p><p><b>Suggested next step:</b> '+esc(x.suggestion)+'</p></details><button type="button" data-l185-review="'+i+'">Review in '+(x.kind==='overlap'?'Track':'Plan')+' ↗</button></article>').join('')+
   '<p class="l185-note">Suggestions are explanatory only. No timers, goals or schedule items are changed.</p>';
  const tailored=newInsights186(read()),responses=feedback186();
  $('lo186-recommendations').innerHTML='<div class="l185-title"><h3>Personalized patterns</h3><span>Based on completed records</span></div>'+
   tailored.suggestions.filter(x=>responses[x.id]?.status!=='not-relevant'&&!(responses[x.id]?.status==='later'&&Date.now()-Number(responses[x.id].updatedAt)<24*3600000)).sort((a,b)=>Number(responses[b.id]?.status==='useful')-Number(responses[a.id]?.status==='useful')).map(x=>{
    const state=responses[x.id]?.status;
    return '<article class="l185-suggestion l186-card"><div class="l185-suggestion-head"><strong>'+esc(x.title)+'</strong><small>'+esc(x.confidence)+' confidence</small></div><p>'+esc(x.detail)+'</p><details><summary>Evidence & suggested next step</summary><p>'+esc(x.why)+'</p><p>'+esc(x.action)+'</p></details><div class="l186-feedback"><button data-l186-feedback="useful" data-l186-id="'+esc(x.id)+'">Useful</button><button data-l186-feedback="not-relevant" data-l186-id="'+esc(x.id)+'">Not relevant</button><button data-l186-feedback="later" data-l186-id="'+esc(x.id)+'">Later</button></div>'+(state?'<small class="l186-saved">Your feedback: '+esc(state)+'</small>':'')+'</article>';
   }).join('')+'<p class="l185-note">Feedback is stored on this device only. Not relevant hides that suggestion; Later hides it for 24 hours. Useful prioritizes it. No goals, activity records, or plans are changed.</p>';

 };
 hub.addEventListener('click',e=>{const button=e.target.closest('[data-l186-feedback]');if(!button)return;const id=button.dataset.l186Id,status=button.dataset.l186Feedback;if(updateFeedback186(id,status))render()});
 advanced.addEventListener('click',()=>{showAdvanced(document.body.dataset.lo184Advanced!=='yes');if(document.body.dataset.lo184Advanced==='yes')setTimeout(()=>$('analyticsPanel')?.scrollIntoView({block:'start',behavior:'smooth'}),50)});
 hub.addEventListener('click',e=>{const b=e.target.closest('[data-l185-review]');if(!b)return;const index=Number(b.dataset.l185Review),item=insightRecommendations(read()).evidence[index];const destination=item?.kind==='overlap'?'tracking':'schedule';$('lifeosNavigation')?.querySelector('[data-view="'+destination+'"]')?.click();});
 $('lo184-track-link').addEventListener('click',()=>$('lifeosNavigation')?.querySelector('[data-view="tracking"]')?.click());
 $('lifeosNavigation')?.addEventListener('click',e=>{if(e.target.closest('[data-view="analytics"]')){showAdvanced(false);setTimeout(render,120)}});
 window.addEventListener('focus',()=>{if(document.body.dataset.lifeosView==='analytics')render()});
 window.addEventListener('lifeos-v77-tracking-changed',()=>{if(document.body.dataset.lifeosView==='analytics')render()});
 showAdvanced(false);render();
 window.LifeOSInsightsDigestV184={getData:insightsDigestData,getRecommendations:insightRecommendations,getPersonalized:newInsights186,getFeedback:feedback186,refresh:render};
}
function init(){mountReports();mountLifeHub();mountInsightsDigest();if($('lo170-day'))return;let today=$('todayOverview');if(today){let el=document.createElement('section');el.id='lo170-day';el.className='l170-panel';today.prepend(el);day()}let tracking=$('trackPastPanel');if(tracking){let el=document.createElement('section');el.id='lo170-review';el.className='l170-panel';(document.getElementById('trackActivePanel')||tracking).prepend(el);review()}let life=$('personalActivityPanel');if(life){let el=document.createElement('section');el.id='lo170-notes';el.className='l170-panel';life.prepend(el);notes();let group=document.createElement('section');group.id='lo170-groups';group.className='l170-panel';el.after(group);groups()}document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();if(document.body.dataset.lifeosView==='dashboard')day()}});window.addEventListener('lifeos-v77-tracking-changed',()=>{if(document.body.dataset.lifeosView==='dashboard')day();review()});setInterval(tick,30000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1800),{once:true});else setTimeout(init,1800);
window.LifeOSDayIntelligenceV170={snapshot,spans,merge,mins,daySegments,dailyReport,planComparison};
})();