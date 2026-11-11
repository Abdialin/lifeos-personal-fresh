/* LifeOS Personal V5: presentation preferences only. Never writes activity or schedule data. */
(function(){
'use strict';
const KEY='lifeos.personal.theme.v5';
function storedTheme(){try{return localStorage.getItem(KEY)==='light'?'light':'dark'}catch(_){return 'dark'}}
function saveTheme(value){try{localStorage.setItem(KEY,value)}catch(_){}}
function init(){
 const root=document.documentElement,top=document.querySelector('.top'),status=document.getElementById('status');
 if(!top||top.querySelector('.lifeos-theme-toggle'))return;
 let current=storedTheme();
 const actions=document.createElement('div');actions.className='lifeos-header-actions';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='lifeos-theme-toggle';
 function apply(value){current=value;root.dataset.lifeosTheme=value;
  toggle.textContent=value==='dark'?'☀ Light mode':'☾ Dark mode';
  toggle.setAttribute('aria-label',value==='dark'?'Switch to light mode':'Switch to dark mode');
  toggle.setAttribute('aria-pressed',String(value==='light'));
  toggle.title='Change colour theme; your activity and plans are unaffected';
 }
 if(status)actions.appendChild(status);
 actions.appendChild(toggle);top.appendChild(actions);
 toggle.addEventListener('click',()=>{const next=current==='dark'?'light':'dark';saveTheme(next);apply(next)});
 apply(current);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
