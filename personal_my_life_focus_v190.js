/* LifeOS V190 — My Life focused mobile experience. UI-only, no record mutations. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const section=key=>({routines:$('personalActivityPanel'),fitness:$('fitnessForm')?.closest('section.panel'),nutrition:$('mealForm')?.closest('section.panel'),habits:$('lo32HabitHub'),friends:$('lo32FriendHub')}[key]);
const config={
 routines:{title:'Routines',subtitle:'Your recorded routines, separate from tracked time.',actions:[['Log routine','personalLogForm'],['History','lo189-routine-history']]},
 fitness:{title:'Fitness',subtitle:'Your training, strength and body progress.',actions:[['Log workout','fitnessForm'],['Body progress','lo190-body'],['History','lo190-fitness-history']]},
 nutrition:{title:'Nutrition',subtitle:'Meals and hydration, without extra tracking screens.',actions:[['Log meal','mealForm'],['Log water','lo25WaterForm'],['Goals','lo25GoalDetails'],['Trends','lo28TrendDetails'],['History','lo190-meal-history']]},
 habits:{title:'Habits',subtitle:'Your commitments and completion progress.',actions:[['Create habit','lo188-habit-editor']]},
 friends:{title:'Friends',subtitle:'Your friends, challenges and optional private sharing.',actions:[['Sharing settings','lo90-friends'],['Legacy cards','lo90-legacy']]}
};
function wrap(id,items,label,open=false){
 if($(id)||!items.length||!items.every(Boolean))return $(id);
 const first=items[0],parent=first.parentElement;
 if(!parent||items.some(x=>x.parentElement!==parent))return null;
 const box=document.createElement('details');box.id=id;box.className='lo190-group';box.open=open;
 const summary=document.createElement('summary');summary.textContent=label;first.before(box);box.append(summary,...items);
 return box;
}
function foldForm(id,groupId,label){
 const form=$(id);if(!form||$(groupId))return;
 // Preserve the existing form, its input state and submit handlers.
 const panel=form.closest('section.panel');if(!panel)return;
 const box=document.createElement('details');box.className='lo190-group lo192-editor';box.id=groupId;
 const heading=document.createElement('summary');heading.textContent=label;box.append(heading);
 form.before(box);box.append(form);
 // Let the original form keep its submission listeners and values.
 const footer=document.createElement('div');footer.className='lo193-editor-footer';
 const close=document.createElement('button');close.type='button';close.className='lo193-editor-close';
 close.textContent='Close editor';close.setAttribute('aria-label','Close '+label.split(' · ')[0].toLowerCase());
 close.addEventListener('click',()=>{box.open=false;heading.focus({preventScroll:true});box.scrollIntoView({block:'nearest',behavior:'smooth'})});
 footer.append(close);box.append(footer);
 heading.tabIndex=0;
 box.addEventListener('keydown',event=>{if(event.key==='Escape'&&box.open){box.open=false;heading.focus({preventScroll:true});}});
}
function collapse(){
 const fitness=section('fitness'),nutrition=section('nutrition');
 if(fitness){
  foldForm('fitnessForm','lo192-workout-editor','Record a workout · tap to open');
  const body=$('loBodyProgress');
  if(body&&!$('lo190-body'))wrap('lo190-body',[body],'Body measurements & progress');
  const list=$('fitnessList');if(list&&!$('lo190-fitness-history'))wrap('lo190-fitness-history',[list],'Workout records & history');
  // Keep workouts and their summary at the top, not below a lengthy editing form.
  const dashboard=$('lifeosFitnessDashboard');const title=fitness.querySelector('h2');
  if(dashboard&&title&&!fitness.contains($('lo190-fitness-intro'))){
   const mount=document.createElement('div');mount.id='lo190-fitness-intro';title.after(mount);mount.append(dashboard);
  }
 }
 if(nutrition){
  foldForm('mealForm','lo192-meal-editor','Record a meal · tap to open');
  const list=$('mealList');const summary=$('nutritionSummary');
  if(list&&!$('lo190-meal-history'))wrap('lo190-meal-history',summary&&summary.parentElement===list.parentElement?[summary,list]:[list],'Meal records & history');
  const dashboard=$('lifeosNutritionDashboard'),title=nutrition.querySelector('h2');
  if(dashboard&&title&&!$('lo190-nutrition-intro')){
   const mount=document.createElement('div');mount.id='lo190-nutrition-intro';title.after(mount);mount.append(dashboard);
  }
 }
 foldForm('personalLogForm','lo192-routine-editor','Record a personal routine · tap to open');
 const routineHistory=document.querySelector('.lo189-routine-history');if(routineHistory)routineHistory.id='lo189-routine-history';
 const editor=document.querySelector('.lo188-habit-editor');if(editor&&!editor.id)editor.id='lo188-habit-editor';
}
function openTarget(id){
 let node=$(id);
 if(!node){
  // Other modules may mount after the navigation bar was created.
  collapse();node=$(id);
 }
 if(!node){console.warn('LifeOS My Life: unavailable destination',id);return false}
 if(node.matches('button[data-lo-form-toggle]')){node.click();return true}
 const ancestors=[];for(let a=node;a;a=a.parentElement)if(a.tagName==='DETAILS')ancestors.unshift(a);
 for(const disclosure of ancestors)disclosure.open=true;
 if(node.matches('form')&&node.hidden)node.hidden=false;
 if(node.matches('details'))node.open=true;
 if(node.matches('input,textarea,select'))node.focus({preventScroll:true});
 node.scrollIntoView({block:'center',behavior:'smooth'});
 // Explicit focus/active state makes shortcut navigation visible on a small phone.
 node.classList.add('lo194-highlight');
 setTimeout(()=>node.classList.remove('lo194-highlight'),1800);
 return true;
}

function installNav(){
 const key=document.body.dataset.loLifeSection||'routines',panel=section(key);
 if(!panel||!config[key])return;
 const existing=panel.querySelector('.lo190-toolbar');
 if(existing)existing.remove();
 const cfg=config[key],toolbar=document.createElement('div');
 toolbar.className='lo190-toolbar';toolbar.dataset.section=key;
 const title=document.createElement('div');title.className='lo190-heading';
 const name=document.createElement('strong');name.textContent=cfg.title;
 const subtitle=document.createElement('span');subtitle.textContent=cfg.subtitle;
 title.append(name,subtitle);toolbar.append(title);
 const row=document.createElement('div');row.className='lo190-actions';
 cfg.actions.forEach(([label,id],index)=>{
  if(!$(id))return;
  const b=document.createElement('button');b.type='button';b.textContent=label;
  if(index===0)b.className='lo190-primary';
  b.addEventListener('click',()=>{if(!openTarget(id)){const note=toolbar.querySelector('.lo194-nav-note')||document.createElement('p');note.className='lo194-nav-note';note.textContent='This feature is not available on this screen yet.';toolbar.append(note)}});row.append(b);
 });
 toolbar.append(row);
 const heading=panel.querySelector('h2');if(heading&&heading.parentElement===panel){heading.after(toolbar);heading.classList.add('lo190-old-heading')}else panel.prepend(toolbar);
 // Earlier quick-link list duplicates the same routes.
 const old=panel.querySelector('.lo187-jump');if(old)old.hidden=true;
 if(row.childElementCount===0)toolbar.classList.add('lo190-actions-empty');
}
/* V194: read-only evidence connection, never invent meals or workout sets. */
const dateKey=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const clock=t=>new Date(t).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
const sample=s=>!!(s.seedBatch||s.assumed||s.isExample||s.developmentExample||['development-starter','development-seed','assumed-demo'].includes(s.source));
const kindOf=name=>{
 const n=String(name||'').toLowerCase();
 if(/\b(cooking|cook|meal prep|food prep|matlagning|laga mat)\b/.test(n))return 'preparing';
 if(/\b(eating|meal|breakfast|lunch|dinner|snack|eat|äta|måltid|frukost|middag|lunch)\b/.test(n))return 'eating';
 if(/\b(gym|workout|training|strength|fitness|exercise|running|run|jogging|walking|walk|boxing|boxning|cycling|swimming|yoga|träning|träna|promenad|löpning|styrketräning)\b/.test(n))return 'fitness';
 return null;
};
function evidenceParts(s,now=Date.now()){
 const segments=Array.isArray(s.segments)&&s.segments.length?s.segments:[{start:s.startAt,end:s.endAt}];
 const result=[];
 for(const z of segments){
  const a=Number(z.start),b=z.end==null?(s.status==='running'?now:NaN):Number(z.end);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)continue;
  let p=a,limit=0;while(p<b&&limit++<90){
   const d=new Date(p),next=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime(),end=Math.min(next,b);
   result.push({day:dateKey(p),start:p,end,ms:end-p});p=end;
  }
 }
 return result;
}
function linkedEvidence(workspace,days=7,now=Date.now()){
 const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-days+1);const cutoff=start.getTime();
 const groups={fitness:[],eating:[],preparing:[]};
 for(const s of workspace.sessions||[]){
  if(!s||sample(s)||!['finished','running','paused'].includes(s.status))continue;
  const kind=kindOf(s.name);if(!kind)continue;
  for(const part of evidenceParts(s,now)){
   if(part.end<=cutoff)continue;
   if(part.start<cutoff){part.ms=part.end-cutoff;part.start=cutoff}
   groups[kind].push({...part,id:String(s.id),name:String(s.name||'Activity'),status:s.status,source:'timer'});
  }
 }
 for(const items of Object.values(groups))items.sort((a,b)=>b.start-a.start);
 return groups;
}
function evidencePanel(kind){
 const anchor=kind==='fitness'?$('lo190-fitness-intro')||$('lifeosFitnessDashboard'):$('lo190-nutrition-intro')||$('lifeosNutritionDashboard');
 if(!anchor)return null;
 const id=kind==='fitness'?'lo194-fitness-evidence':'lo194-nutrition-evidence';
 let element=$(id);if(!element){
  element=document.createElement('section');element.id=id;element.className='lo194-evidence';
  anchor.after(element);
 }
 return element;
}
function textNode(tag,value,cls=''){const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el}
function renderEvidence(){
 if(document.body.dataset.lifeosView!=='life')return;
 const w=root.lifeosReadOnlyWorkspace?.();if(!w)return;
 const parts=linkedEvidence(w),linked=new Set((w.workouts||[]).map(x=>String(x.sessionId||'')).filter(Boolean));
 const create=(kind,list)=>{
  const panel=evidencePanel(kind);if(!panel)return;
  const wasOpen=panel.querySelector('.lo194-periods')?.open??false;
  panel.replaceChildren();
  panel.append(textNode('h3',kind==='fitness'?'Training from Track':'Eating & preparation from Track'));
  const minutes=list.reduce((a,x)=>a+x.ms,0)/60000,sessionCount=new Set(list.map(x=>x.id)).size;
  panel.append(textNode('p',sessionCount+' tracked sessions · '+Math.round(minutes)+' active minutes over the past 7 calendar days','lo194-evidence-summary'));
  if(kind==='nutrition')panel.append(textNode('p','These records show eating or food-preparation time, not calories or nutrients. Add meal details only when known.','lo194-evidence-note'));
  else panel.append(textNode('p','Tracked exercise contributes duration evidence. Sets, repetitions and weights require a workout record.','lo194-evidence-note'));
  const summaries=Array.from({length:7},(_,i)=>{
    const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-6+i);
    const day=dateKey(d.getTime()),onDay=list.filter(p=>p.day===day);
    const eat=onDay.filter(p=>kind==='fitness'||kindOf(p.name)==='eating').reduce((sum,p)=>sum+p.ms,0)/60000;
    const prep=kind==='nutrition'?onDay.filter(p=>kindOf(p.name)==='preparing').reduce((sum,p)=>sum+p.ms,0)/60000:0;
    return {day,label:d.toLocaleDateString(undefined,{weekday:'short'}),eat,prep};
  });
  const max=Math.max(1,...summaries.map(x=>x.eat+x.prep));
  const chart=document.createElement('div');chart.className='lo195-mini-chart';
  chart.setAttribute('role','img');
  chart.setAttribute('aria-label',kind==='fitness'?'Tracked training duration by day':'Eating and food preparation time by day');
  for(const item of summaries){
    const column=document.createElement('div');column.className='lo195-mini-day';
    const total=item.eat+item.prep;
    column.append(textNode('b',total?Math.round(total)+'m':'—'));
    const track=document.createElement('div');track.className='lo195-mini-track';
    const primary=document.createElement('span');primary.className='lo195-mini-primary';primary.style.height=(item.eat/max*100).toFixed(1)+'%';
    const secondary=document.createElement('span');secondary.className='lo195-mini-secondary';secondary.style.height=(item.prep/max*100).toFixed(1)+'%';
    track.append(primary,secondary);column.append(track,textNode('small',item.label));
    chart.append(column);
  }
  panel.append(chart);
  if(kind==='nutrition')panel.append(textNode('p','Green = eating time · Blue = preparing food. This chart is not a count of meals.','lo194-evidence-note'));
  const details=document.createElement('details');details.className='lo194-periods';details.open=wasOpen;
  const title=textNode('summary','View tracked periods ('+list.length+')');details.append(title);
  if(!list.length)details.append(textNode('p','No matching tracked activity in the last seven days.'));
  for(const p of list.slice(0,28)){
   const row=document.createElement('article');row.className='lo194-period';
   const info=document.createElement('div');info.append(textNode('strong',p.name));
   info.append(textNode('small',p.day+' · '+clock(p.start)+'–'+clock(p.end)+' · '+Math.round(p.ms/60000)+' min'));
   row.append(info);
   const action=document.createElement('button');action.type='button';
   action.textContent=kind==='fitness'?(linked.has(p.id)?'Linked':'Add details'):'Add meal details';
   action.disabled=kind==='fitness'&&linked.has(p.id);
   action.addEventListener('click',()=>{
    if(kind==='fitness'){
     if(!openTarget('fitnessForm'))return;
     const select=$('fitnessSession');
     if(select&&!Array.from(select.options).some(x=>x.value===p.id))select.add(new Option(p.name+' · linked timer',p.id));
     if(select)select.value=p.id;
     const type=$('fitnessType');if(type){const n=p.name.toLowerCase();const found=[...type.options].find(x=>n.includes(x.value.toLowerCase()));if(found)type.value=found.value}
     if($('fitnessDate'))$('fitnessDate').value=p.day;
     if($('fitnessMinutes'))$('fitnessMinutes').value=Math.round(parts.fitness.filter(x=>x.id===p.id).reduce((a,x)=>a+x.ms,0)/60000);
    }else{
     if(!openTarget('mealForm'))return;
     if($('mealDate'))$('mealDate').value=p.day;
     if($('mealTime'))$('mealTime').value=clock(p.start);
     // Do not prefill foods, quantity, calories or create a meal automatically.
    }
   });
   row.append(action);details.append(row);
  }
  panel.append(details);
 };
 create('fitness',parts.fitness);create('nutrition',[...parts.eating,...parts.preparing].sort((a,b)=>b.start-a.start));
}
function removeRepeatedOverview(){
 // The universal progress card repeated on every My Life tab. Local dashboards are more useful.
 const titles=[...document.querySelectorAll('h1,h2,h3')].filter(x=>x.textContent.trim()==='Progress across your life');
 for(const title of titles){
  let a=title.parentElement;
  for(let i=0;a&&i<5;i++,a=a.parentElement){
   if(a.matches('section,article')&&a.id!=='personalActivityPanel'&&!a.querySelector('form')&&!a.contains($('loLifeSectionTabs'))){a.classList.add('lo190-repeated-card');break}
  }
 }
}
function run(){if(document.body.dataset.lifeosView!=='life')return;collapse();installNav();removeRepeatedOverview();renderEvidence()}
function init(){
 run();
 $('loLifeSectionTabs')?.addEventListener('click',()=>setTimeout(run,40));
 $('lifeosNavigation')?.addEventListener('click',()=>setTimeout(run,60));
 root.addEventListener('hashchange',()=>setTimeout(run,60));
 root.addEventListener('lifeos-v76-route-check',()=>setTimeout(run,30));
 root.addEventListener('lifeos-v77-tracking-changed',()=>setTimeout(renderEvidence,80));
 root.addEventListener('focus',()=>{if(document.body.dataset.lifeosView==='life')renderEvidence()});
 // Reconcile UI after optional modules mount without observing constantly regenerating chart markup.
 [120,700,1800].forEach(t=>setTimeout(run,t));
 document.addEventListener('submit',event=>{
  if(event.target.matches('#fitnessForm,#mealForm,#personalLogForm'))setTimeout(run,200);
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
root.LifeOSMyLifeV190={refresh:run,openTarget,linkedEvidence,evidenceParts,kindOf};
})(window);
