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
function collapse(){
 const fitness=section('fitness'),nutrition=section('nutrition');
 if(fitness){
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
  const list=$('mealList');const summary=$('nutritionSummary');
  if(list&&!$('lo190-meal-history'))wrap('lo190-meal-history',summary&&summary.parentElement===list.parentElement?[summary,list]:[list],'Meal records & history');
  const dashboard=$('lifeosNutritionDashboard'),title=nutrition.querySelector('h2');
  if(dashboard&&title&&!$('lo190-nutrition-intro')){
   const mount=document.createElement('div');mount.id='lo190-nutrition-intro';title.after(mount);mount.append(dashboard);
  }
 }
 const routineHistory=document.querySelector('.lo189-routine-history');if(routineHistory)routineHistory.id='lo189-routine-history';
 const editor=document.querySelector('.lo188-habit-editor');if(editor&&!editor.id)editor.id='lo188-habit-editor';
}
function openTarget(id){
 const node=$(id);if(!node)return false;
 if(node.tagName==='DETAILS')node.open=true;
 const parents=[];let a=node.parentElement;
 while(a){if(a.tagName==='DETAILS')parents.unshift(a);a=a.parentElement}
 parents.forEach(d=>d.open=true);
 if(node.tagName==='FORM'&&node.hidden){
  const toggle=document.querySelector('[data-lo-form-toggle="'+id+'"]');
  if(toggle)toggle.click();
  else node.hidden=false;
 }
 node.scrollIntoView({block:'start',behavior:'smooth'});
 return true;
}
function installNav(){
 const key=document.body.dataset.loLifeSection||'routines',panel=section(key);
 if(!panel||!config[key])return;
 const existing=panel.querySelector('.lo190-toolbar');
 if(existing){
  if(existing.dataset.section===key)return;
  existing.remove();
 }
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
  b.addEventListener('click',()=>openTarget(id));row.append(b);
 });
 toolbar.append(row);
 const heading=panel.querySelector('h2');if(heading&&heading.parentElement===panel){heading.after(toolbar);heading.classList.add('lo190-old-heading')}else panel.prepend(toolbar);
 // Earlier quick-link list duplicates the same routes.
 const old=panel.querySelector('.lo187-jump');if(old)old.hidden=true;
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
function run(){if(document.body.dataset.lifeosView!=='life')return;collapse();installNav();removeRepeatedOverview()}
function init(){
 run();
 $('loLifeSectionTabs')?.addEventListener('click',()=>setTimeout(run,40));
 $('lifeosNavigation')?.addEventListener('click',()=>setTimeout(run,60));
 root.addEventListener('hashchange',()=>setTimeout(run,60));
 root.addEventListener('lifeos-v76-route-check',()=>setTimeout(run,30));
 // Reconcile UI after optional modules mount without observing constantly regenerating chart markup.
 [120,700,1800].forEach(t=>setTimeout(run,t));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
root.LifeOSMyLifeV190={refresh:run,openTarget};
})(window);
