/* LifeOS V80: named duration profiles and overdue activity review.
   Profiles are local preferences. They never rewrite old sessions or automatically
   confirm attendance; new timers get reminder-only limits by default. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSDurationProfilesV80=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos.personal.duration-profiles.v80',MIN=60000;
const groups=[
 ['fajr',/\bfajr\b/i],['dhuhr',/\b(dhuhr|zuhr)\b/i],['asr',/\basr\b/i],
 ['maghrib',/\bmaghrib\b/i],['isha',/\bisha\b/i],
 ['prayer',/\b(prayer|salah|salat)\b/i],
 ['quran',/\b(quran|memorization|hifdh|hifz)\b/i],
 ['gym',/\b(gym|workout|fitness)\b/i],
 ['study',/\b(study|studying|assignment|coursework|research)\b/i],
 ['work',/\b(work|shift|security)\b/i],
 ['reading',/\b(reading|book)\b/i],
 ['other',/^.*$/]
];
const LABELS=Object.fromEntries(groups.map(([key])=>[key,key==='quran'?'Quran & memorization':key[0].toUpperCase()+key.slice(1)]));
function category(name){return groups.find(([,re])=>re.test(String(name||'')))?.[0]||'other'}
function validProfile(value){return value&&Number.isSafeInteger(value.minutes)&&value.minutes>=5&&value.minutes<=1440?{minutes:value.minutes}:null}
function clean(raw){const profiles={};if(!raw||typeof raw!=='object')return profiles;for(const key of Object.keys(LABELS)){const v=validProfile(raw[key]);if(v)profiles[key]=v}return profiles}
function effective(name,profiles={},guard=root.LifeOSDurationGuardV78){
 const key=category(name),specific=clean(profiles)[key];
 return {category:key,minutes:specific?.minutes??guard?.suggestion?.(name)??60,saved:Boolean(specific)};
}
function savedProfiles(store){
 try{return clean(JSON.parse(store?.getItem?.(KEY)||'{}'))}catch{return {}}
}
function settingsForNew(name,store,at=Date.now()){
 const profiles=savedProfiles(store),key=category(name),profile=profiles[key];
 if(!profile)return null;
 return {targetMinutes:profile.minutes,mode:'warn',configuredAt:at,source:'saved-duration-profile-v80'};
}
function forgotten(sessions,now=Date.now(),profiles={},guard=root.LifeOSDurationGuardV78){
 return (Array.isArray(sessions)?sessions:[]).filter(s=>s&&s.status==='running').map(s=>{
  const duration=guard?.elapsed?.(s,now)||0,expected=effective(s.name,profiles,guard),limit=expected.minutes*MIN;
  return {id:String(s.id),name:String(s.name||'Activity'),elapsedMs:duration,expectedMinutes:expected.minutes,overdueMs:Math.max(0,duration-limit),category:expected.category,configured:Boolean(guard?.valid?.(s))};
 }).filter(item=>item.overdueMs>0).sort((a,b)=>b.overdueMs-a.overdueMs);
}
function mount(){
 const host=document.getElementById('lo78-duration');if(!host||document.getElementById('lo80-profiles'))return;
 const box=document.createElement('details');box.id='lo80-profiles';box.className='lo80-profiles';
 box.innerHTML='<summary>Duration profiles & forgotten timers</summary><p class="sub">Save a suggested duration per activity type. New timers will use this as a reminder-only limit. Existing running timers are NOT shortened or stopped.</p><label class="sub" for="lo80-type">Activity type</label><select id="lo80-type" class="field"></select><label class="sub" for="lo80-minutes">Expected active minutes</label><input id="lo80-minutes" class="field" type="number" step="5" min="5" max="1440"><button type="button" class="btn outline" id="lo80-save">Save profile</button><p id="lo80-message" class="sub" role="status"></p><h4>Long-running activities needing review</h4><p class="sub">Flagged records are not automatically edited. Select Review to open the actual timer, or Finish when you confirm it has ended.</p><div id="lo80-overdue" class="lo80-list"></div>';
 host.append(box);
 const $=id=>document.getElementById(id),select=$('lo80-type'),minutes=$('lo80-minutes'),message=$('lo80-message'),list=$('lo80-overdue');
 for(const key of Object.keys(LABELS))select.add(new Option(LABELS[key],key));
 let profiles={};
 try{profiles=clean(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{}
 function redrawInput(){const saved=profiles[select.value];minutes.value=String(saved?.minutes??root.LifeOSDurationGuardV78?.suggestion?.(select.value)??60)}
 select.addEventListener('change',redrawInput);
 $('lo80-save').addEventListener('click',()=>{
  const value=Number(minutes.value);
  if(!Number.isSafeInteger(value)||value<5||value>1440){message.textContent='Choose a whole number of minutes between 5 and 1440.';return}
  const next=clean({...profiles,[select.value]:{minutes:value}});
  try{localStorage.setItem(KEY,JSON.stringify(next));profiles=next;message.textContent='Profile saved on this device. New sessions will use a reminder-only duration limit.';redraw()}catch{message.textContent='Profile could not be saved on this device. Your activity history was not changed.'}
 });
 const state=()=>{try{return root.lifeosReadOnlyWorkspace?.()?.sessions||[]}catch{return []}};
 function redraw(){
  const overdue=forgotten(state(),Date.now(),profiles);
  list.replaceChildren();
  if(!overdue.length){list.textContent='No running activities exceed their suggested durations.';return}
  for(const item of overdue.slice(0,16)){
   const row=document.createElement('div');row.className='lo80-overdue';
   const title=document.createElement('div');const strong=document.createElement('strong');strong.textContent=item.name;
   const note=document.createElement('small');note.textContent='Running '+Math.round(item.elapsedMs/MIN)+' min · expected '+item.expectedMinutes+' min. Verify actual time before editing.';
   title.append(strong,note);
   const button=document.createElement('button');button.className='btn outline';button.type='button';button.textContent='Review timer';
   button.addEventListener('click',()=>{root.LifeOSReviewTimer?.(item.id);});
   row.append(title,button);list.append(row);
  }
 }
 select.value='prayer';redrawInput();redraw();
 root.addEventListener('focus',redraw);
 root.addEventListener('lifeos-v77-tracking-changed',redraw);
 root.addEventListener('lifeos-v78-duration-changed',redraw);
 root.setInterval(()=>{if(!document.hidden&&box.open)redraw()},60000);
}
const api={category,effective,clean,forgotten,validProfile,savedProfiles,settingsForNew,KEY,LABELS};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return api;
});
