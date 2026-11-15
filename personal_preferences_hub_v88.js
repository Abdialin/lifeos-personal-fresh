/* LifeOS V88 — unified local preferences overview and safe, reviewed transfer.
 * This is NOT account or cloud synchronization. Never exports/imports activities,
 * history, credentials, health records, calendar events or friend data. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSPreferencesV88=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const VERSION=1, FORMAT='lifeos.personal.preferences.v88';
const DEFINITIONS=[
 {name:'notifications',key:'lifeos.personal.notification-preferences.v87',label:'Notification choices'},
 {name:'durations',key:'lifeos.personal.duration-profiles.v80',label:'Expected activity durations'},
 {name:'workouts',key:'lifeos.personal.fitness-presets.v83',label:'Favorite workout presets'}
];
function sanitize(name,value){
 if(name==='notifications')return root.LifeOSNotificationControlsV87?.normalize?.(value)||{enabled:false,timerShortcut:false};
 if(name==='durations')return root.LifeOSDurationProfilesV80?.clean?.(value)||{};
 if(name==='workouts')return root.LifeOSProgressivePersonalizationV83?.cleanPresets?.(value)||[];
 return null;
}
function snapshot(store){
 const out={};
 for(const def of DEFINITIONS){
  let raw;try{raw=store.getItem(def.key)}catch{raw=null}
  if(raw===null)continue;
  try{out[def.name]=sanitize(def.name,JSON.parse(raw))}catch{out[def.name]=sanitize(def.name,null)}
 }
 return out;
}
function packageExport(store,at=new Date().toISOString()){
 return {format:FORMAT,version:VERSION,createdAt:at,scope:'local-preferences-only',preferences:snapshot(store)};
}
function parseImport(raw){
 if(typeof raw!=='string'||raw.length>150000)return {ok:false,reason:'File exceeds the preferences-only size limit.'};
 let doc;try{doc=JSON.parse(raw)}catch{return {ok:false,reason:'This is not readable JSON.'}}
 if(!doc||doc.format!==FORMAT||doc.version!==VERSION||doc.scope!=='local-preferences-only'||!doc.preferences||typeof doc.preferences!=='object'||Array.isArray(doc.preferences))return {ok:false,reason:'Unsupported LifeOS preferences backup.'};
 const keys=Object.keys(doc.preferences);
 if(!keys.length||keys.some(k=>!DEFINITIONS.some(d=>d.name===k)))return {ok:false,reason:'Backup contains unsupported settings.'};
 const clean={};
 for(const key of keys){
  const value=doc.preferences[key];
  if(value===null||typeof value!=='object'||(key==='workouts')!==Array.isArray(value))return {ok:false,reason:'Invalid settings structure.'};
  const sanitized=sanitize(key,value);
  // Reject malformed data rather than silently converting it into valid but different preferences.
  if(JSON.stringify(sanitized)!==JSON.stringify(value))return {ok:false,reason:'Some settings are invalid or from an incompatible version.'};
  clean[key]=sanitized;
 }
 return {ok:true,preferences:clean,createdAt:doc.createdAt||null};
}
function diff(current,imported){
 return DEFINITIONS.filter(d=>Object.prototype.hasOwnProperty.call(imported,d.name)).map(d=>{
  const before=Object.prototype.hasOwnProperty.call(current,d.name)?current[d.name]:null;
  const after=imported[d.name];
  return {name:d.name,label:d.label,existing:before!==null,changed:JSON.stringify(before)!==JSON.stringify(after)};
 });
}
function applySelected(store,proposal,names){
 if(!proposal?.ok||!Array.isArray(names)||!names.length)return {ok:false,reason:'No approved preference groups were selected.'};
 const items=DEFINITIONS.filter(d=>names.includes(d.name)&&Object.prototype.hasOwnProperty.call(proposal.preferences,d.name));
 if(items.length!==names.length)return {ok:false,reason:'Unknown settings group.'};
 // Prepare and record originals before writing; rollback on any storage failure.
 const originals=new Map(),writes=[];
 try{
  for(const d of items){originals.set(d.key,store.getItem(d.key));writes.push([d.key,JSON.stringify(proposal.preferences[d.name])])}
  for(const [key,value] of writes)store.setItem(key,value);
 }catch(_){
  for(const [key,prior] of originals){try{if(prior===null)store.removeItem(key);else store.setItem(key,prior)}catch(_){}}
  return {ok:false,reason:'Import could not be saved. Previous settings were restored where possible.'};
 }
 return {ok:true,groups:items.map(x=>x.name)};
}
function mount(){
 if(document.getElementById('lo88-preferences'))return;
 const host=document.getElementById('lo14SettingsHub');
 if(!host)return;
 const style=document.createElement('style');style.textContent=`
 #lo88-preferences{background:#17253c;border:1px solid #4b6386;border-radius:14px;padding:17px;margin:15px 0;color:#edf4ff}
 #lo88-preferences button,#lo88-preferences input[type=file]{margin:5px;padding:9px;border-radius:8px}
 #lo88-preferences button{background:#2d4c71;color:white;border:1px solid #6585a6}
 #lo88-preferences button:focus-visible,#lo88-preferences input:focus-visible{outline:3px solid #82e0cf}
 #lo88-preferences .lo88-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:9px}
 #lo88-preferences .lo88-card{background:#233652;border-radius:10px;padding:13px}
 #lo88-preferences .lo88-card strong,#lo88-preferences .lo88-card small{display:block}
 #lo88-preferences .lo88-card small{color:#c2cfe0;margin-top:6px}
 #lo88-preferences .lo88-review label{display:block;margin:9px 0}
 #lo88-preferences p{line-height:1.5}
 `;document.head.append(style);
 const section=document.createElement('section');section.id='lo88-preferences';
 section.innerHTML='<h3>Personal preferences</h3><p>Review timer durations, notifications and favorite workouts from one place. These settings are currently saved on this browser. They are not automatically synced to your LifeOS account.</p><div class="lo88-grid" id="lo88-summary"></div><div><button type="button" id="lo88-jump-notifications">Notifications</button><button type="button" id="lo88-jump-duration">Timer durations</button><button type="button" id="lo88-jump-fitness">Fitness favorites</button><button type="button" id="lo88-jump-nutrition">Nutrition favorites</button><button type="button" id="lo88-jump-habits">Habits</button></div><h4>Move preferences to another device (manual)</h4><p>Export only these three preference groups. Never includes workouts logged, meals, plans, sessions, personal history, passwords, or calendar events. Review each imported group and choose whether it should replace settings on this device.</p><button type="button" id="lo88-export">Export preferences JSON</button><label for="lo88-file">Select a LifeOS preferences backup</label><input id="lo88-file" type="file" accept=".json,application/json"><div id="lo88-review" class="lo88-review" hidden></div><p id="lo88-message" role="status"></p>';
 host.prepend(section);
 const el=id=>section.querySelector('#'+id),message=el('lo88-message'),review=el('lo88-review');
 function render(){
  const values=snapshot(root.localStorage),items=[
   ['Notifications',values.notifications?.enabled?'Enabled in LifeOS':'Disabled in LifeOS'],
   ['Timer durations',Object.keys(values.durations||{}).length+' saved activity types'],
   ['Workout favorites',(values.workouts||[]).length+' presets'],
   ['Nutrition favorites','Stored with LifeOS meal templates'],
   ['Habits & routines','Configured in My Life']
  ];
  const grid=el('lo88-summary');grid.replaceChildren();
  for(const [title,subtitle] of items){const card=document.createElement('div');card.className='lo88-card';const strong=document.createElement('strong');strong.textContent=title;const small=document.createElement('small');small.textContent=subtitle;card.append(strong,small);grid.append(card)}
 }
 function jump(target,view,sectionName){
  if(view)document.querySelector('#lifeosNavigation button[data-view="'+view+'"]')?.click();
  if(sectionName)root.LifeOSLifeNavigationV76?.choose?.(sectionName);
  root.setTimeout(()=>{const node=document.getElementById(target);if(node){if(node.tagName==='DETAILS')node.open=true;node.scrollIntoView({block:'start',behavior:'smooth'})}else message.textContent='Open the corresponding LifeOS section to edit these preferences.'},110);
 }
 el('lo88-jump-notifications').onclick=()=>jump('lo87-notifications','settings');
 el('lo88-jump-duration').onclick=()=>jump('lo80-profiles','tracking');
 el('lo88-jump-fitness').onclick=()=>jump('lo83-fitness','life','fitness');
 el('lo88-jump-nutrition').onclick=()=>jump('lo83-nutrition','life','nutrition');
 el('lo88-jump-habits').onclick=()=>jump('lo32HabitHub','life','habits');
 el('lo88-export').onclick=()=>{
  const data=JSON.stringify(packageExport(root.localStorage),null,2);
  const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='lifeos-personal-preferences-v88.json';document.body.append(link);link.click();link.remove();root.setTimeout(()=>URL.revokeObjectURL(url),5000);
  message.textContent='Preferences backup prepared. Keep it private; it contains workout favorites and notification choices, but no activity history.';
 };
 let pending=null;
 el('lo88-file').addEventListener('change',async e=>{
  pending=null;review.hidden=true;review.replaceChildren();
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>150000)return message.textContent='File is too large for a preferences backup.';
  let raw;try{raw=await file.text()}catch{return message.textContent='Cannot read the selected file.'}
  pending=parseImport(raw);if(!pending.ok)return message.textContent=pending.reason;
  const proposed=diff(snapshot(root.localStorage),pending.preferences);
  const intro=document.createElement('p');intro.textContent='Review groups below. Checked groups will overwrite only their corresponding preferences on this browser; no historical records will be changed.';review.append(intro);
  for(const row of proposed){
   const line=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.value=row.name;check.checked=false;
   line.append(check,document.createTextNode(' '+row.label+' · '+(row.changed?(row.existing?'will replace existing settings':'new settings'):'identical to current settings')));review.append(line);
  }
  const apply=document.createElement('button');apply.type='button';apply.textContent='Apply selected groups';review.append(apply);
  apply.addEventListener('click',()=>{
   const selected=[...review.querySelectorAll('input:checked')].map(x=>x.value);
   if(!selected.length)return message.textContent='Select at least one group.';
   if(!root.confirm('Replace selected preferences on this browser? Your tracked activity history will not be imported or changed.'))return;
   const result=applySelected(root.localStorage,pending,selected);
   message.textContent=result.ok?'Selected preferences saved. Reload LifeOS to make every existing module use the imported preferences.':result.reason;
   if(result.ok){pending=null;review.hidden=true;review.replaceChildren();el('lo88-file').value='';render()}
  });
  review.hidden=false;message.textContent='Nothing has been imported. Review and explicitly select groups to apply.';
 });
 root.addEventListener('focus',render);
 root.addEventListener('storage',render);render();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {FORMAT,VERSION,DEFINITIONS,sanitize,snapshot,packageExport,parseImport,diff,applySelected};
});