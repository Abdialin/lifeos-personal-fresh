/* LifeOS V32: Habit records, opt-in share-card friends and visible active timer.
   No peer network access, no external data exposure, no fictional competition entries. */
(()=>{'use strict';
const $=id=>document.getElementById(id),bridge=()=>window.lifeosSocialHabitBridge;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const local=t=>{const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const dateTime=s=>new Date(s+'T12:00:00').getTime();
const id=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'habit-'+Date.now()+'-'+Math.random().toString(36).slice(2);
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
 const sessions=bridge()?.activeTimers?.()||(read().sessions||[]).filter(s=>s.status!=='finished');
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
function scheduledDates(def,days=28){
 const start=new Date();start.setHours(12,0,0,0);start.setDate(start.getDate()-days+1);
 const created=def.startDate||local(def.createdAt||Date.now()),every=Number(def.everyDays)||1;
 const list=[];
 for(let offset=0;offset<days;offset++){
  const date=new Date(start);date.setDate(start.getDate()+offset);const key=local(date.getTime());
  if(key<created)continue;
  const diff=Math.round((dateTime(key)-dateTime(created))/86400000);
  if(diff>=0&&diff%every===0)list.push(key);
 }
 return list;
}
function habitProgress(def,checks,days=28){
 const dueDates=scheduledDates(def,days),now=local(Date.now());
 const done=new Set(checks.filter(c=>c.habitId===def.id&&c.done).map(c=>c.date));
 const completed=dueDates.filter(d=>done.has(d)).length;
 const past=dueDates.filter(d=>d<now),pastCompleted=past.filter(d=>done.has(d)).length;
 let streak=0;
 for(let i=dueDates.length-1;i>=0;i--){
  if(dueDates[i]===now&&!done.has(now))continue;
  if(!done.has(dueDates[i]))break;
  streak++;
 }
 return {due:dueDates.length,completed,streak,pastDue:past.length,pastCompleted,
  rate:past.length?Math.round(pastCompleted/past.length*100):null};
}
function evidenceSources(def,day){
 const term=normal(def.matchText).toLowerCase();
 if(!term)return[];
 const w=read(),found=[];
 const hasTerm=value=>String(value||'').toLowerCase().includes(term);
 // Only finished timer sessions, with their own ID; do not create or extend session time.
 for(const s of w.sessions||[]){
  if(s.status!=='finished'||!Number.isFinite(s.endAt)||local(s.endAt)!==day)continue;
  if(!hasTerm(s.name))continue;
  const minutes=Math.round(timespan(s,s.endAt)/60000);
  found.push({sourceType:'session',sourceId:s.id,title:s.name||'Finished activity',minutes,quantity:null,unit:'',origin:'Tracked timer',simulated:Boolean(s.seedBatch||s.source==='development-starter')});
 }
 for(const l of w.personalLogs||[]){
  if(l.date!==day||!hasTerm(l.category+' '+(l.notes||'')))continue;
  found.push({sourceType:'personalLog',sourceId:l.id,title:l.category||'Routine log',minutes:l.minutes===null?null:Number(l.minutes),quantity:l.quantity==null?null:Number(l.quantity),unit:l.unit||'',origin:'Routine record',simulated:Boolean(l.seedBatch)});
 }
 for(const x of w.workouts||[]){
  if(x.date!==day||!hasTerm(x.type+' '+(x.details||'')))continue;
  found.push({sourceType:'workout',sourceId:x.id,title:x.type||'Workout',minutes:x.minutes==null?null:Number(x.minutes),quantity:null,unit:'',origin:'Fitness record',simulated:Boolean(x.seedBatch||x.source==='assumed-demo')});
 }
 return found.slice(0,12);
}
function targetStatus(def,candidate){
 const amount=Number(def.targetAmount);
 if(!Number.isFinite(amount)||amount<=0)return 'Optional evidence; review before confirming';
 if(def.targetMode==='minutes')
  return candidate.minutes===null||!Number.isFinite(candidate.minutes)?'Duration missing; review manually':
   candidate.minutes>=amount?'Duration meets your '+amount+' minute target':'Recorded '+candidate.minutes+'/'+amount+' minutes; below your target';
 if(def.targetMode==='quantity'){
  return candidate.quantity===null||!Number.isFinite(candidate.quantity)||String(candidate.unit||'').toLowerCase()!==String(def.targetUnit||'').toLowerCase()
   ?'Matching quantity not recorded; review manually':candidate.quantity>=amount?
   'Quantity meets your '+amount+' '+def.targetUnit+' target':'Recorded '+candidate.quantity+'/'+amount+' '+def.targetUnit+'; below target';
 }
 return 'Review this activity';
}
function habitDue(def,day){
 const begin=def.startDate||local(def.createdAt||Date.now());
 const diff=Math.round((dateTime(day)-dateTime(begin))/86400000);
 return day<=local(Date.now())&&diff>=0&&diff%(Number(def.everyDays)||1)===0;
}
function evidenceMarkup(def,check,day){
 if(!habitDue(def,day))return '<p class="lo32-muted">Not a scheduled habit day. Choose another date.</p>';
 const found=evidenceSources(def,day);
 if(!def.matchText)return '<p class="lo32-muted">To discover existing activities for this habit, set a matching word or phrase in the habit editor.</p>';
 if(check?.evidenceSourceId)
  return '<p class="lo32-muted">Confirmed using a linked '+esc(check.evidenceType||'activity')+' record. No timer time was added.</p>';
 return '<div class="lo33-evidence-list">'+(found.length?found.map(x=>
  '<div class="lo33-evidence"><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.origin)+(x.simulated?' · Assumed example':'')+' · '+esc(targetStatus(def,x))+'</small></div>'+
  '<button type="button" data-lo33-confirm="'+esc(def.id)+'" data-lo33-source-type="'+esc(x.sourceType)+'" data-lo33-source="'+esc(x.sourceId)+'">Confirm link</button></div>'
 ).join(''):'<p class="lo32-muted">No matching records for this date. You can still confirm a completed habit manually.</p>')+'</div>';
}
function habitUI(){
 const host=$('lo32HabitHub');if(!host)return;
 const b=bridge()?.read()||{},defs=b.habitDefinitions||[],checks=b.habitChecks||[];
 const options=defs.slice().sort((a,b)=>Number(a.createdAt)-Number(b.createdAt));
 const cards=options.map(def=>{
  const progress=habitProgress(def,checks,28),existing=checks.find(c=>c.habitId===def.id&&c.date===habitSelectedDate);
  const delta=Math.round((dateTime(habitSelectedDate)-dateTime(def.startDate||local(def.createdAt)))/86400000);
  const due=delta>=0&&delta%(Number(def.everyDays)||1)===0&&habitSelectedDate<=local(Date.now());
  const action=existing?.done?'✓ Completed · Undo':due?'Mark completed':'Not scheduled';
  const goal=Number(def.targetAmount)>0?' · Target '+esc(def.targetAmount)+' '+esc(def.targetMode==='minutes'?'minutes':def.targetUnit||'units'):'';
  return '<article class="lo32-habit"><div class="lo33-habit-copy"><strong>'+esc(def.title)+'</strong>'+
   '<small>'+esc(def.category)+' · Every '+esc(def.everyDays)+' day(s)'+goal+'</small>'+
   '<p>'+progress.completed+'/'+progress.due+' scheduled opportunities in 28 days · '+progress.streak+' consecutive completions'+
    (progress.rate===null?' · Insufficient past evidence':' · '+progress.rate+'% of past opportunities completed')+'</p>'+
   '<div class="lo33-meter"><i style="width:'+((progress.due?progress.completed/progress.due:0)*100).toFixed(1)+'%"></i></div>'+
   '<details class="lo33-evidence-panel"><summary>Review matching tracked activities'+(def.matchText?' · '+esc(def.matchText):'')+'</summary>'+
   evidenceMarkup(def,existing,habitSelectedDate)+'</details></div>'+
   '<div class="lo32-habit-actions"><button type="button" data-lo32-check="'+esc(def.id)+'" '+(!due&&!existing?'disabled':'')+'>'+action+'</button>'+
   '<button type="button" data-lo32-remove="'+esc(def.id)+'">Delete</button></div></article>';
 }).join('');
 host.innerHTML='<div class="lo32-heading"><h3>Habits & personal development</h3>'+
 '<p>A tracked session is evidence of time spent, but a habit is a commitment. You review matching activities before linking them to habit completion. No automatic checkmarks or duplicate timer entries.</p></div>'+
 '<form id="lo32HabitForm" class="lo32-habit-form"><label>Habit name<input name="title" required maxlength="80" placeholder="Read a book, Quran revision, memorize a page"></label>'+
 '<label>Type<select name="category"><option>Reading</option><option>Quran & memorization</option><option>Prayer</option><option>Learning</option><option>Wellbeing</option><option>Quit or avoid a habit</option><option>Other</option></select></label>'+
 '<label>Repeat every (days)<input name="everyDays" type="number" min="1" max="30" value="1" required></label>'+
 '<label>Habit start date<input name="startDate" type="date" required value="'+esc(local(Date.now()))+'"></label>'+
 '<label>Match tracked activity containing (optional)<input name="matchText" maxlength="80" placeholder="e.g. reading, Quran, gym"></label>'+
 '<label>Progress target (optional)<select name="targetMode"><option value="completion">Completion only</option><option value="minutes">Minutes per scheduled day</option><option value="quantity">Quantity per scheduled day</option></select></label>'+
 '<label>Target amount (optional)<input name="targetAmount" type="number" min="0" max="10000" step="0.1" placeholder="e.g. 30"></label>'+
 '<label>Quantity unit (if needed)<input name="targetUnit" maxlength="30" placeholder="pages, repetitions"></label>'+
 '<button class="btn primary" type="submit">+ Add habit</button></form>'+
 '<label class="lo32-habit-date">Review habit day<input type="date" id="lo32HabitDate" value="'+esc(habitSelectedDate)+'"></label>'+
 (options.length?'<div class="lo32-habit-list">'+cards+'</div>':'<p class="lo32-muted">No habits created yet. Examples: read 10 pages daily, Quran revision every 3 days, or a personal wellbeing habit.</p>')+
 '<p class="lo32-muted">Habit checks can be manual or explicitly linked to a completed activity. Linked activity evidence never changes recorded session time. For habits about avoiding behavior, a completion check reflects your own report, not automatic detection.</p>';
}
function saveHabit(form){
 const title=normal(form.elements.namedItem('title').value),category=normal(form.elements.namedItem('category').value);
 const everyDays=Number(form.elements.namedItem('everyDays').value);
 const matchText=normal(form.elements.namedItem('matchText').value).slice(0,80);
 const startDate=form.elements.namedItem('startDate').value;
 const targetMode=normal(form.elements.namedItem('targetMode').value);
 const rawAmount=form.elements.namedItem('targetAmount').value;
 const targetAmount=rawAmount===''?null:Number(rawAmount);
 const targetUnit=normal(form.elements.namedItem('targetUnit').value).slice(0,30);
 if(!title||title.length>80||!Number.isInteger(everyDays)||everyDays<1||everyDays>30||!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||startDate>local(Date.now())||
  !['completion','minutes','quantity'].includes(targetMode)||targetAmount!==null&&(!Number.isFinite(targetAmount)||targetAmount<=0||targetAmount>10000)||
  targetMode!=='completion'&&targetAmount===null||targetMode==='quantity'&&!targetUnit)
  return alert('Check the habit name, interval and optional progress target.');
 const item={id:id(),title,category,everyDays,matchText,
  targetMode,targetAmount,targetUnit,startDate,createdAt:Date.now()};
 if(!bridge()?.mutate('habitDefinitions','upsert',item))return alert('Habit could not be saved.');
 habitUI();
}
function toggleHabit(idValue,evidence){
 const b=bridge()?.read()||{},def=b.habitDefinitions?.find(x=>x.id===idValue);if(!def)return;
 const current=b.habitChecks.find(c=>c.habitId===idValue&&c.date===habitSelectedDate);
 if(current){
  if(!bridge()?.mutate('habitChecks','remove',current))return alert('Could not undo habit check.');
 }else{
  const next={id:id(),habitId:idValue,date:habitSelectedDate,done:true,createdAt:Date.now(),checkSource:evidence?'linked-evidence':'manual',
   evidenceType:evidence?.sourceType||null,evidenceSourceId:evidence?.sourceId||null};
  if(!bridge()?.mutate('habitChecks','upsert',next))return alert('Check could not be saved.');
 }
 habitUI();
}
function ownShare(){
 const w=read(),b=bridge()?.read()||{};
 const since=local(Date.now()-6*86400000),today=local(Date.now());
 const workoutDays=new Set((w.workouts||[]).filter(x=>x.date>=since&&x.date<=today&&!x.seedBatch&&x.source!=='assumed-demo').map(x=>x.date)).size;
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
  const panel=document.createElement('section');panel.id='lo32HabitHub';panel.className='lo32-hub';panel.dataset.view='life';routines.after(panel);
  const tabGroup=$('loLifeSectionTabs');
  if(tabGroup&&!tabGroup.querySelector('[data-lo-life-section="habits"]')){
   const btn=document.createElement('button');btn.type='button';btn.dataset.loLifeSection='habits';btn.textContent='Habits';
   btn.setAttribute('aria-pressed','false');tabGroup.append(btn);
   btn.addEventListener('click',()=>{
    document.body.dataset.loLifeSection='habits';
    for(const target of ['personalActivityPanel','fitnessForm','mealForm']){
     const el=target==='personalActivityPanel'?$(target):$(target)?.closest('section.panel');
     el?.classList.add('lo-life-inactive');
    }
    for(const other of tabGroup.querySelectorAll('button'))other.setAttribute('aria-pressed',String(other===btn));
    $('loLifeVisual')?.setAttribute('hidden','');
    habitUI();panel.scrollIntoView({block:'start',behavior:'smooth'});
   });
   tabGroup.addEventListener('click',e=>{
    const selected=e.target.closest('[data-lo-life-section]');if(!selected||selected===btn)return;
    if(document.body.dataset.loLifeSection!=='habits')return;
   });
  }
  habitUI();
  panel.addEventListener('submit',e=>{if(e.target.id==='lo32HabitForm'){e.preventDefault();saveHabit(e.target)}});
  panel.addEventListener('change',e=>{if(e.target.id==='lo32HabitDate'){habitSelectedDate=e.target.value;habitUI()}});
  panel.addEventListener('click',e=>{
   const button=e.target.closest('button');if(!button)return;
   if(button.dataset.lo32Check)toggleHabit(button.dataset.lo32Check);
   if(button.dataset.lo33Confirm){
    const b=bridge()?.read()||{},def=b.habitDefinitions?.find(x=>x.id===button.dataset.lo33Confirm);
    if(!def)return;
    const evidence=evidenceSources(def,habitSelectedDate).find(x=>x.sourceId===button.dataset.lo33Source&&x.sourceType===button.dataset.lo33SourceType);
    if(!evidence||!habitDue(def,habitSelectedDate))return alert('No matching source or habit is not scheduled for this day.');
    if(evidence.simulated&&!confirm('This evidence is an assumed example, not a real tracked result. Link it to the habit anyway?'))return;
    const targetMessage=targetStatus(def,evidence);
    if(!confirm('Confirm this habit completed using '+evidence.origin+': '+evidence.title+'? '+targetMessage+'. This will not create new tracked time.'))return;
    const existing=b.habitChecks.find(c=>c.habitId===def.id&&c.date===habitSelectedDate);
    const newCheck={id:existing?.id||id(),habitId:def.id,date:habitSelectedDate,done:true,createdAt:existing?.createdAt||Date.now(),
      checkSource:'linked-evidence',evidenceType:evidence.sourceType,evidenceSourceId:evidence.sourceId,evidenceSimulated:evidence.simulated};
    if(!bridge()?.mutate('habitChecks','upsert',newCheck))return alert('Evidence link was not saved.');
    habitUI();friendsUI();
   }
   if(button.dataset.lo32Remove){
    const def=bridge()?.read().habitDefinitions.find(x=>x.id===button.dataset.lo32Remove);if(!def||!confirm('Delete this habit definition? Existing completion records remain private and stored.'))return;
    if(bridge()?.mutate('habitDefinitions','remove',def))habitUI();
   }
  });
 }
 const friendsParent=$('lo32HabitHub')||$('personalActivityPanel');
 if(friendsParent&&!$('lo32FriendHub')){
  const box=document.createElement('section');box.id='lo32FriendHub';box.className='lo32-hub';
  box.dataset.view='life';friendsParent.after(box);
  const tabGroup=$('loLifeSectionTabs');
  if(tabGroup&&!tabGroup.querySelector('[data-lo-life-section="friends"]')){
   const friendTab=document.createElement('button');friendTab.type='button';
   friendTab.dataset.loLifeSection='friends';friendTab.textContent='Friends';
   friendTab.setAttribute('aria-pressed','false');tabGroup.append(friendTab);
   friendTab.addEventListener('click',()=>{
    document.body.dataset.loLifeSection='friends';
    for(const target of ['personalActivityPanel','fitnessForm','mealForm']){
     const el=target==='personalActivityPanel'?$(target):$(target)?.closest('section.panel');
     el?.classList.add('lo-life-inactive');
    }
    for(const other of tabGroup.querySelectorAll('button'))other.setAttribute('aria-pressed',String(other===friendTab));
    $('loLifeVisual')?.setAttribute('hidden','');
    friendsUI();box.scrollIntoView({block:'start',behavior:'smooth'});
   });
  }
  friendsUI();
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
  const sectionTab=e.target.closest('#loLifeSectionTabs [data-lo-life-section]');
  if(sectionTab&&sectionTab.dataset.loLifeSection!=='habits'){
   $('lo32HabitHub')?.classList.remove('lo32-habits-active');
  }else if(sectionTab&&sectionTab.dataset.loLifeSection==='habits'){
   $('lo32HabitHub')?.classList.add('lo32-habits-active');
  }
  if(e.target.closest('.lo32-open-tracker'))document.querySelector('#lifeosNavigation [data-view="tracking"]')?.click();
  if(e.target.closest('#lifeosNavigation'))setTimeout(()=>{timer();habitUI();friendsUI()},100);
 });
 document.addEventListener('visibilitychange',()=>{timer();if(!document.hidden){habitUI();friendsUI()}});
 window.setInterval(timer,1000);
 window.setInterval(()=>{
  if(document.hidden)return;
  // Preserve unfinished form text and the currently focused input.
  const habitPanel=$('lo32HabitHub'),friendPanel=$('lo32FriendHub');
  if(document.body.dataset.loLifeSection==='habits'&&habitPanel&&!habitPanel.contains(document.activeElement))habitUI();
  if(document.body.dataset.loLifeSection==='friends'&&friendPanel&&!friendPanel.contains(document.activeElement))friendsUI();
 },60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();