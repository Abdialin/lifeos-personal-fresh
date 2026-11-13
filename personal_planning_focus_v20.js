/* LifeOS V20: planning suggestions and accessible review. Presentation-only. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const defaults=['Focused studying','Reading','Quran memorization','Prayer','Gym workout','Business · App Development','Meeting','Walking','Meal','Sleep'];
function setSuggestion(name){
 const input=$('scheduleName');if(!input)return;
 input.value=name;input.dispatchEvent(new Event('input',{bubbles:true}));
 input.focus({preventScroll:true});
}
function installSuggestions(){
 const input=$('scheduleName');if(!input||$('lo20Suggestions'))return;
 const box=document.createElement('div');box.id='lo20Suggestions';box.className='lo20-suggestions';
 const title=document.createElement('div');title.className='lo20-suggestion-title';title.textContent='Suggested activities · or enter your own';
 const buttons=document.createElement('div');buttons.className='lo20-suggestion-buttons';
 const dataList=document.createElement('datalist');dataList.id='lo20ActivityOptions';input.setAttribute('list',dataList.id);
 const historical=(()=>{try{const ws=window.lifeosReadOnlyWorkspace?.();const records=[...(ws?.schedule||[]),...(ws?.sessions||[])];return [...new Set(records.map(x=>x.name).filter(Boolean))].slice(-75)}catch{return []}})();
 const options=[...new Set([...defaults,...historical])];
 for(const name of options){const opt=document.createElement('option');opt.value=name;dataList.append(opt)}
 for(const name of defaults.slice(0,8)){const b=document.createElement('button');b.type='button';b.className='lo20-suggestion';b.textContent=name;b.addEventListener('click',()=>setSuggestion(name));buttons.append(b)}
 box.append(title,buttons,dataList);
 input.after(box);
}
function moveReviewIntoSchedule(){
 const editor=$('scheduleEditorPanel'),review=$('idealReview'),form=$('scheduleForm');
 if(!editor||!review||!form)return;
 const details=review.closest('details');
 if(!details||details.dataset.lo20Moved==='yes')return;
 details.dataset.lo20Moved='yes';details.classList.add('lo20-review');
 const title=details.querySelector('summary');if(title)title.textContent='Review and approve suggested weekly activities';
 const anchor=$('loUpcomingPlans');if(anchor)anchor.before(details);else form.after(details);
}
function openReview(){
 const editor=$('scheduleEditorPanel'),review=$('idealReview');if(!editor||!review)return;
 const nav=document.querySelector('#lifeosNavigation button[data-view="schedule"]');nav?.click();
 const container=review.closest('details');if(container)container.open=true;
 const day=$('scheduleDay');if(day&&!day.value){const today=new Date();day.value=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-')}
 review.click();
 const result=$('idealProposalList')||container;
 if(result){result.scrollIntoView({behavior:'smooth',block:'center'});result.setAttribute('tabindex','-1');result.focus({preventScroll:true})}
}
function init(){
 installSuggestions();moveReviewIntoSchedule();
 // Handle the exact review CTA without the old cross-section scrolling.
 document.addEventListener('click',e=>{
  if(!e.target.closest('[data-v4-review-ideal]'))return;
  e.preventDefault();e.stopImmediatePropagation();openReview();
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();