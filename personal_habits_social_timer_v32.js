/* LifeOS V32: Habit records, opt-in share-card friends and visible active timer.
   No peer network access, no external data exposure, no fictional competition entries. */
(()=>{'use strict';
const $=id=>document.getElementById(id),bridge=()=>window.lifeosSocialHabitBridge;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const local=t=>{const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const dateTime=s=>new Date(s+'T12:00:00').getTime();
const id=()=>crypto?.randomUUID?.()||'habit-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const read=()=>{try{return window.lifeosReadOnlyWorkspace?.()||{}}catch{return {}}};
const normal=v=>String(v||'').trim();
let habitSelectedDate=local(Date.now()),period=7,habitsInstalled=false;
const fmtMs=v=>{const seconds=Math.max(0,Math.floor(v/1000));return String(Math.floor(seconds/3600)).padStart(2,'0')+':'+String(Math.floor(seconds/60)%60).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')};
function timespan(s,now){
 const intervals=s.segments||[];return intervals.reduce((total,seg)=>{
  const end=seg.end??(s.status==='running'?now:seg.start);
  return total+Math.max(0,end-seg.start);
 },0)
}
function timer(){
 const w=read(),sessions=(w.sessions||[]).filter(s=>s.status!=='finished');
 let bar=$('lo32ActiveTimer');
 if(!bar){bar=document.createElement('aside');bar.id='lo32ActiveTimer';bar.setAttribute('role','status');bar.setAttribute('aria-label','Background activity timer');document.body.append(bar)}
 const current=sessions.find(s=>s.status==='running')||sessions[0];
 if(!current){bar.hidden=true;document.title='LifeOS Personal — Your day, intelligently designed';return}
 bar.hidden=false;const now=Date.now(),elapsed=fmtMs(timespan(current,now));
 const suffix=sessions.length>1?' · +'+(sessions.length-1)+' other active':'';
 const label=current.status==='paused'?'Paused':'Running';
 const title=normal(current.name)||'Activity';
 const identity=String(current.id);
 if(bar.dataset.currentId!==identity||bar.dataset.currentState!==current.status){
  bar.innerHTML='<div class="lo32-timer-dot" aria-hidden="true">●</div><div class="lo32-timer-info"><strong></strong><small></small></div><span class="lo32-timer-count"></span><button type="button" class="lo32-open-tracker">Open Track ↗</button>';
  bar.dataset.currentId=identity;bar.dataset.currentState=current.status;
 }
 bar.querySelector('strong').textContent=title;
 bar.querySelector('small').textContent=label+suffix;
 bar.querySelector('.lo32-timer-count').textContent=elapsed;
 document.title=elapsed+' · '+label+' '+title+' — LifeOS';
}
function habitProgress(def,checks,days=28){
 const start=new Date();start.setHours(12,0,0,0);start.setDate(start.getDate()-days+1);
 const dueDates=[];const created=def.startDate||local(def.createdAt||Date.now()),every=Number(def.everyDays)||1;
 for(let offset=0;offset<days;offset++){
  const day=new Date(start);day.setDate(start.getDate()+offset);
  const key=local(day.getTime());if(key<created)continue;
  const diff=Math.round((dateTime(key)-dateTime(created))/86400000);
  if(diff>=0&&diff%every===0)dueDates.push(key);
 }
 const done=new Set(checks.filter(c=>c.habitId===def.id&&c.done).map(c=>c.date));
 const completed=dueDates.filter(d=>done.has(d)).length;
 let streak=0;for(let i=dueDates.length-1;i>=0;i--){
  // An outstanding future/today item does not reset a previous streak.
  if(dueDates[i]===local(Date.now())&&!done.has(dueDates[i]))continue;
  if(!done.has(dueDates[i]))break;streak++;
 }
 return {due:dueDates.length,completed,streak};
}
function habitUI(){
 const host=$('lo32HabitHub');if(!host)return;const b=bridge()?.read()||{},defs=b.habitDefinitions||[],checks=b.habitChecks||[];
 const options=defs.slice().sort((a,b)=>Number(a.createdAt)-Number(b.createdAt));
 const cards=options.map(def=>{
  const history=habitProgress(def,checks,28),existing=checks.find(c=>c.habitId===def.id&&c.date===habitSelectedDate);
  const delta=Math.round((dateTime(habitSelectedDate)-dateTime(def.startDate||local(def.createdAt)))/86400000),due=delta>=0&&delta%(Number(def.everyDays)||1)===0;
  const mark=existing?.done?'✓ Completed':due?'Mark completed':'Not scheduled';
  return '<article class="lo32-habit"><div><strong>'+esc(def.title)+'</strong><small>'+esc(def.category)+' · Every '+esc(def.everyDays)+' day(s)</small><p>'+history.completed+'/'+history.due+' scheduled completions in 28 days · '+history.streak+' consecutive completed opportunities</p></div>'+
  '<div class="lo32-habit-actions"><button type="button" data-lo32-check="'+esc(def.id)+'" '+(!due?'disabled':'')+'>'+mark+'</button><button type="button" data-lo32-remove="'+esc(def.id)+'">Delete</button></div></article>';
 }).join('');
 host.innerHTML='<div class="lo32-heading"><h3>Habits & personal development</h3><p>Tracking time tells you how long. Habits tell you whether you followed through. Schedule daily or every few days and review consistency.</p></div>'+
 '<form id="lo32HabitForm" class="lo32-habit-form"><label>Habit name<input name="title" required maxlength="80" placeholder="Read a book, Quran revision, memorize a page"></label>'+
 '<label>Type<select name="category"><option>Reading</option><option>Quran & memorization</option><option>Prayer</option><option>Learning</option><option>Wellbeing</option><option>Quit or avoid a habit</option><option>Other</option></select></label>'+
 '<label>Repeat every (days)<input name="everyDays" type="number" min="1" max="30" value="1" required></label>'+
 '<button class="btn primary" type="submit">+ Add habit</button></form>'+
 '<label class="lo32-habit-date">Review habit day<input type="date" id="lo32HabitDate" value="'+esc(habitSelectedDate)+'"></label>'+
 (options.length?'<div class="lo32-habit-list">'+cards+'</div>':'<p class="lo32-muted">No habits created yet. Try “Read 10 pages” or “Quran revision” as a private habit.</p>')+
 '<p class="lo32-muted">A habit check is a separate record from a tracked timer. This prevents counting the same activity time twice. Habit details remain private unless explicitly shared.</p>';
}
function saveHabit(form){
 const title=normal(form.elements.namedItem('title').value),category=normal(form.elements.namedItem('category').value);
 const everyDays=Number(form.elements.namedItem('everyDays').value);
 if(!title||title.length>80||!Number.isInteger(everyDays)||everyDays<1||everyDays>30)return alert('Enter a name and repeat interval between 1 and 30 days.');
 const item={id:id(),title,category,everyDays,startDate:local(Date.now()),createdAt:Date.now()};
 if(!bridge()?.mutate('habitDefinitions','upsert',item))return alert('Habit could not be saved.');
 habitUI();
}
function toggleHabit(idValue){
 const b=bridge()?.read()||{},def=b.habitDefinitions?.find(x=>x.id===idValue);if(!def)return;
 const current=b.habitChecks.find(c=>c.habitId===idValue&&c.date===habitSelectedDate);
 if(current){if(!bridge()?.mutate('habitChecks','remove',current))return alert('Could not undo habit check.')}
 else{const next={id:id(),habitId:idValue,date:habitSelectedDate,done:true,createdAt:Date.now()};
  if(!bridge()?.mutate('habitChecks','upsert',next))return alert('Check could not be saved.');
 }
 habitUI();
}
function ownShare(){
 const w=read(),b=bridge()?.read()||{};
 const since=local(Date.now()-6*86400000),today=local(Date.now());
 const workoutDays=new Set((w.workouts||[]).filter(x=>x.date>=since&&x.date<=today).map(x=>x.date)).size;
 const checkDays=new Set((b.habitChecks||[]).filter(x=>x.done&&x.date>=since&&x.date<=today).map(x=>x.date)).size;
 return {type:'lifeos-progress-card-v1',periodStart:since,periodEnd:today,workoutDays,habitDays:checkDays};
}
function safeShare(input){
 if(!input||typeof input!=='object'||input.type!=='lifeos-progress-card-v1')return null;
 const fields=['periodStart','periodEnd'];for(const k of fields)if(!/^\d{4}-\d{2}-\d{2}$/.test(String(input[k]||'')))return null;
 const now=local(Date.now());if(input.periodEnd>now||input.periodStart>input.periodEnd)return null;
 const nums=['workoutDays','habitDays'];for(const k of nums)if(!Number.isInteger(input[k])||input[k]<0||input[k]>7)return null;
 return {type:'lifeos-progress-card-v1',periodStart:input.periodStart,periodEnd:input.periodEnd,workoutDays:input.workoutDays,habitDays:input.habitDays};
}
function friendsUI(){
 const host=$('lo32FriendHub');if(!host)return;const b=bridge()?.read()||{},people=b.friendShares||[];
 const yours=ownShare(),sorted=people.map(p=>({name:p.name,card:p.card,id:p.id})).concat([{name:'You',card:yours,id:'you'}]).sort((a,b)=>(b.card.workoutDays+b.card.habitDays)-(a.card.workoutDays+a.card.habitDays));
 host.innerHTML='<h3>Friends & progress sharing</h3><p class="lo32-muted">Private by default. Export only a weekly count summary, then import a card your friend chooses to share. No names, prayer records, notes, locations, or individual activities are sent automatically.</p>'+
 '<div class="lo32-own-share"><strong>My optional weekly progress card</strong><p>'+yours.workoutDays+' workout days · '+yours.habitDays+' habit-completion days (last 7 days)</p><button type="button" class="btn outline" id="lo32ExportShare">Download progress card</button></div>'+
 '<form id="lo32FriendImport"><label>Friend display name<input name="name" maxlength="60" required placeholder="Friend nickname"></label><label>Paste their shared progress-card JSON<textarea name="card" rows="3" maxlength="2000" required placeholder="Progress card shared by your friend"></textarea></label><button type="submit" class="btn primary">Add / update shared card</button></form>'+
 '<h4>Local leaderboard · self-reported shares</h4>'+
 '<div class="lo32-board">'+sorted.map((p,i)=>'<div class="lo32-board-row"><span>'+esc(String(i+1))+'. '+esc(p.name)+'</span><small>'+p.card.workoutDays+' workout days · '+p.card.habitDays+' habit days</small>'+(p.id==='you'?'':'<button type="button" data-lo32-friend-remove="'+esc(p.id)+'">Remove</button>')+'</div>').join('')+'</div>'+
 '<p class="lo32-muted">These cards are not verified and are not live synchronized. A real friends network with invitations, consent, account separation and revocation needs dedicated authentication and backend permissions.</p>';
}
function exportShare(){
 const payload=JSON.stringify(ownShare(),null,2),blob=new Blob([payload],{type:'application/json'});
 const a=document.createElement('a'),u=URL.createObjectURL(blob);
 a.href=u;a.download='lifeos-weekly-progress-card.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
function importShare(form){
 const name=normal(form.elements.namedItem('name').value).slice(0,60);
 let card;try{card=safeShare(JSON.parse(form.elements.namedItem('card').value))}catch{}
 if(!name||!card)return alert('Use a valid progress card JSON and a display name.');
 const friends=bridge()?.read().friendShares||[],same=friends.find(x=>x.name.toLowerCase()===name.toLowerCase());
 const item={id:same?.id||id(),name,card,updatedAt:Date.now()};
 if(!bridge()?.mutate('friendShares','upsert',item))return alert('Friend card could not be saved.');
 friendsUI();
}
function setup(){
 const routines=$('personalActivityPanel');
 if(routines&&!habitsInstalled){
  habitsInstalled=true;
  const panel=document.createElement('section');panel.id='lo32HabitHub';panel.className='lo32-hub';routines.append(panel);habitUI();
  panel.addEventListener('submit',e=>{if(e.target.id==='lo32HabitForm'){e.preventDefault();saveHabit(e.target)}});
  panel.addEventListener('change',e=>{if(e.target.id==='lo32HabitDate'){habitSelectedDate=e.target.value;habitUI()}});
  panel.addEventListener('click',e=>{
   const button=e.target.closest('button');if(!button)return;
   if(button.dataset.lo32Check)toggleHabit(button.dataset.lo32Check);
   if(button.dataset.lo32Remove){
    const def=bridge()?.read().habitDefinitions.find(x=>x.id===button.dataset.lo32Remove);if(!def||!confirm('Delete this habit definition? Existing completion records remain private and stored.'))return;
    if(bridge()?.mutate('habitDefinitions','remove',def))habitUI();
   }
  });
 }
 const insights=$('analyticsPanel');
 if(insights&&!$('lo32FriendHub')){
  const box=document.createElement('section');box.id='lo32FriendHub';box.className='lo32-hub';
  insights.append(box);friendsUI();
  box.addEventListener('click',e=>{
   if(e.target.id==='lo32ExportShare')exportShare();
   const button=e.target.closest('[data-lo32-friend-remove]');if(button){
    const entry=bridge()?.read().friendShares.find(p=>p.id===button.dataset.lo32FriendRemove);
    if(entry&&confirm('Remove this shared progress card?')&&bridge()?.mutate('friendShares','remove',entry))friendsUI();
   }
  });
  box.addEventListener('submit',e=>{if(e.target.id==='lo32FriendImport'){e.preventDefault();importShare(e.target)}});
 }
 timer();
 document.addEventListener('click',e=>{
  if(e.target.closest('.lo32-open-tracker'))document.querySelector('#lifeosNavigation [data-view="tracking"]')?.click();
  if(e.target.closest('#lifeosNavigation'))setTimeout(()=>{timer();habitUI();friendsUI()},100);
 });
 document.addEventListener('visibilitychange',()=>{timer();if(!document.hidden){habitUI();friendsUI()}});
 window.setInterval(timer,1000);
 window.setInterval(()=>{if(!document.hidden){habitUI();friendsUI()}},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();