/* LifeOS V131 — device-check journey and cockpit placement. No timer or workspace writes. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSDeviceJourneyV131=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const $=id=>root.document.getElementById(id);
const make=(tag,cls,content)=>{const e=root.document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e};
const stateMessage=text=>{
 const s=String(text||'').toLowerCase();
 if(s.includes('no test baseline captured')||s.includes('snapshot cleared'))return 'idle';
 if(s.includes('✓ pass:'))return 'pass';
 if(s.includes('⚠ failed:')||s.includes('cannot capture')||s.includes('invalid')||s.includes('cannot save'))return 'fail';
 if(s.includes('baseline captured')||s.includes('previous test baseline'))return 'ready';
 if(s.includes('less than 30 seconds')||s.includes('review:'))return 'review';
 return 'idle';
};
function repairCockpit(){
 const host=$('trackActivePanel'),primary=$('lo77-timer-quick');
 if(!host||!primary)return false;
 const heading=host.querySelector(':scope > .head');
 if(!heading)return false;
 const hero=$('lo130LiveHeading'),other=$('lo130OtherSessions');
 // V126's legacy regrouping could leave the clock under diagnostics.
 // Reparent the same original nodes; all event listeners remain attached.
 let anchor=heading;
 for(const item of [hero,primary,other]){
  if(!item)continue;
  if(item.previousElementSibling!==anchor||item.parentElement!==host)anchor.after(item);
  anchor=item;
 }
 const settings=$('lo126TimerSettings');
 if(settings&&settings.parentElement!==host)host.append(settings);
 return true;
}
function compactDevice(){
 const panel=$('lo73-device-test'),section=$('lo72-background-status');
 if(!panel||!section)return false;
 if(panel.dataset.lo131Mounted)return true;
 panel.dataset.lo131Mounted='1';
 panel.classList.add('lo131-device');
 const title=panel.querySelector(':scope > h3');
 if(title)title.textContent='Timer recovery check';
 const intro=panel.querySelector(':scope > p.sub');
 if(intro)intro.textContent='Check whether a timer stays accurate after you lock your phone or switch apps. No activity records are changed.';
 const selector=$('lo73-choice'),capture=$('lo73-capture'),verify=$('lo73-verify'),clear=$('lo73-clear'),status=$('lo73-status'),note=panel.querySelector('.lo73-note'),actions=panel.querySelector('.lo73-actions');
 if(!selector||!capture||!verify||!clear||!status||!actions)return false;
 const above=make('div','lo131-steps');above.setAttribute('aria-label','Recovery check steps');
 for(const [i,label] of ['Choose timer','Lock your phone','Verify return'].entries()){
  const tile=make('div','lo131-step');tile.dataset.step=String(i+1);
  tile.append(make('span','lo131-step-index',String(i+1)),make('span','lo131-step-title',label));
  above.append(tile);
 }
 panel.insertBefore(above,selector.previousElementSibling||selector);
 const toolbar=make('div','lo131-test-toolbar');toolbar.id='lo131TestToolbar';
 toolbar.append(make('strong','','Test progress'),make('span','lo131-progress','Not started'));
 actions.before(toolbar);
 const guide=make('div','lo131-action-hint','1. Choose a running timer and capture a baseline.');
 actions.after(guide);
 // Keep the same original buttons; redesign into a guided two-action workflow.
 actions.classList.add('lo131-actions');
 capture.textContent='1 · Capture';
 verify.textContent='2 · Verify return';
 const aux=make('details','lo131-aux');aux.id='lo131Aux';
 aux.append(make('summary','','Reset check & technical notes'));
 aux.append(clear);
 if(note)aux.append(note);
 guide.after(aux);
 const update=()=>{
  const mode=stateMessage(status.textContent),line=toolbar.querySelector('.lo131-progress');
  const chosen=Boolean(selector.value);
  panel.dataset.lo131State=mode;
  line.textContent={pass:'Verified',fail:'Needs attention',ready:'Ready to verify',review:'Check again',idle:'Not started'}[mode];
  const next=mode==='pass'?3:mode==='ready'||mode==='review'?2:chosen?1:0;
  for(const item of above.children){
   const index=Number(item.dataset.step);
   item.dataset.status=index<=next?'complete':index===next+1?'current':'pending';
  }
  guide.textContent=mode==='pass'?'Check completed. Your timer matched its saved local checkpoint.'
   :mode==='fail'?'Verification needs attention. Review the message below; your activity has not been changed.'
   :mode==='ready'?'2. Lock your phone or switch apps for at least 30 seconds, then return and tap Verify.'
   :mode==='review'?'The check is not complete yet. Follow the message below, then verify again.'
   :chosen?'1. Capture the selected timer, then background the phone for at least 30 seconds.'
   :'Choose an existing running or paused timer to begin.';
  // Do not hide native button or override its validation; only improve hints.
 };
 const observer=new MutationObserver(update);observer.observe(status,{childList:true,characterData:true,subtree:true});
 selector.addEventListener('change',update);
 root.addEventListener('pageshow',update);
 update();return true;
}
function compactDiagnostics(){
 const host=$('lo126TimerSettings'),background=$('lo72-background-status');
 if(!host||!background||$('lo131TechnicalDiagnostics'))return;
 const shell=make('details','lo131-diagnostics');shell.id='lo131TechnicalDiagnostics';
 shell.append(make('summary','','Advanced recovery diagnostics'));
 // Keep any existing button and check behavior on the same DOM nodes.
 background.before(shell);
 shell.append(background);
 const title=background.querySelector('.lo72-header strong');if(title)title.textContent='Local checkpoint status';
 const explain=background.querySelector('.lo72-explain');
 if(explain)explain.textContent='Saved timestamps can recover the elapsed clock after reopening LifeOS. Use the checks below to review local persistence.';
 // Move the device check to the top of the diagnostics, with its own compact journey.
 const device=$('lo73-device-test');
 if(device){shell.before(device);compactDevice()}
}
function boot(){
 repairCockpit();compactDiagnostics();compactDevice();
}
function init(){
 root.setTimeout(boot,2800);
 root.setTimeout(boot,4700);
 root.addEventListener('focus',repairCockpit);
 root.addEventListener('lifeos-v77-tracking-changed',repairCockpit);
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()}
return {stateMessage};
});
