/* LifeOS V21: task timing choice. Only affects the existing To-do form. */
(()=>{'use strict';const $=id=>document.getElementById(id);
function update(){
 const type=$('todoTimingType')?.value||'anytime';
 const date=$('todoDateWrap'),deadline=$('todoDeadlineWrap'),window=$('todoWindowWrap');
 if(date)date.hidden=type==='anytime';
 if(deadline)deadline.hidden=type!=='deadline';
 if(window)window.hidden=type!=='window';
 if($('todoDue'))$('todoDue').required=type!=='anytime';
 if($('todoTime'))$('todoTime').required=type==='deadline';
 if($('todoStartTime'))$('todoStartTime').required=type==='window';
 if($('todoEndTime'))$('todoEndTime').required=type==='window';
 const hints={anytime:'No date or time required. Complete whenever convenient.',day:'Choose a day. No particular hour is required.',deadline:'Must be completed by the chosen date and time.',window:'Reserved time period, such as a meeting or appointment.'};
 if($('todoTimingHint'))$('todoTimingHint').textContent=hints[type]||hints.anytime;
 const form=$('todoForm');if(form)form.dataset.timingType=type;
}
function init(){
 const select=$('todoTimingType');if(!select)return;
 select.addEventListener('change',update);update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();