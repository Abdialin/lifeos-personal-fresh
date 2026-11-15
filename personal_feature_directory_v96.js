/* LifeOS V96 — one feature directory and deterministic route shortcuts.
 * Navigation only; never writes schedules, tracked time or preferences. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSFeatureDirectoryV96=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const ROUTES=[
 {name:'Today',view:'dashboard',id:'todayOverview'},
 {name:'Active timers',view:'tracking',id:'trackActivePanel'},
 {name:'Distraction Intelligence',view:'tracking',id:'lo94-suite'},
 {name:'Plan & To-dos',view:'schedule',id:'scheduleEditorPanel'},
 {name:'Debt Chamber',view:'schedule',id:'lo74-debt'},
 {name:'Prediction & planning',view:'schedule',id:'lo57-three-view'},
 {name:'Activity insights',view:'insights',id:'lo55-intelligence'},
 {name:'Routines',view:'life',section:'routines',id:'personalActivityPanel'},
 {name:'Fitness & exercise plans',view:'life',section:'fitness',id:'fitnessForm'},
 {name:'Nutrition',view:'life',section:'nutrition',id:'mealForm'},
 {name:'Habits',view:'life',section:'habits',id:'lo32HabitHub'},
 {name:'Friends',view:'life',section:'friends',id:'lo32FriendHub'},
 {name:'Personal settings',view:'settings',id:'lo88-preferences'}
];
function navigate(route){
 if(!route)return false;
 const button=document.querySelector('#lifeosNavigation button[data-view="'+route.view+'"]');
 if(button)button.click();else if(route.view==='settings')root.location.hash='settings';
 if(route.section)root.LifeOSLifeNavigationV76?.choose?.(route.section);
 root.setTimeout(()=>{
  if(route.section)root.LifeOSLifeNavigationV76?.choose?.(route.section);
  const node=document.getElementById(route.id);if(node){node.scrollIntoView({block:'start',behavior:'smooth'});if(node.tagName==='DETAILS')node.open=true}
 },150);
 return true;
}
function mount(){
 const host=document.getElementById('lo14SettingsHub');if(!host||document.getElementById('lo96-directory'))return;
 const panel=document.createElement('details');panel.id='lo96-directory';panel.innerHTML='<summary>LifeOS feature directory · find a section</summary><p class="sub">Open a LifeOS area directly without duplicating its controls or creating any new records.</p><div id="lo96-links"></div>';
 host.prepend(panel);
 const style=document.createElement('style');style.textContent=`
 #lo96-directory{margin:14px 0;padding:16px;border:1px solid #526988;border-radius:12px;background:#19263b;color:#e8f2ff}
 #lo96-directory summary{font-size:17px;font-weight:700;cursor:pointer}
 #lo96-links{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:8px;margin-top:14px}
 #lo96-links button{padding:12px 8px;text-align:left;background:#293d5c;color:white;border:1px solid #587699;border-radius:10px;min-height:44px}
 #lo96-links button:focus-visible{outline:3px solid #7cddcf}
 `;document.head.append(style);
 const area=panel.querySelector('#lo96-links');
 for(const route of ROUTES){
  const button=document.createElement('button');button.type='button';button.textContent=route.name;
  button.addEventListener('click',()=>navigate(route));area.append(button);
 }
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {ROUTES};
});