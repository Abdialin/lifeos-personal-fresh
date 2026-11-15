/* LifeOS V118 — opt-in account and Friends staging interface.
 * No token/local credential persistence. No legacy-workspace migration,
 * automatic activity sharing, or verified score claims.
 * UI is entirely hidden unless account endpoint reports enabled=true. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSAccountFriendsV118=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const BASE='/api/account/v117',STATUS=BASE+'/status',METRICS=['workoutDays','habitDays'];
function validateScore(metric,days,score,periodEnd){
 if(!METRICS.includes(metric)||![7,14,30].includes(Number(days))||String(days).trim()==='')return null;
 const d=Number(days),n=Number(score);
 if(!Number.isSafeInteger(n)||n<0||n>d||String(score).trim()==='')return null;
 if(typeof periodEnd!=='string'||!/^\d{4}-\d\d-\d\d$/.test(periodEnd))return null;
 const date=new Date(periodEnd+'T12:00:00');
 const str=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
 if(!Number.isFinite(date.getTime())||str!==periodEnd||date.getTime()>Date.now()+86400000)return null;
 return {metric,days:d,periodEnd,score:n};
}
function leaderboardQuery(metric,days,periodEnd){
 const valid=validateScore(metric,days,0,periodEnd);
 if(!valid)return null;
 return new URLSearchParams({metric:valid.metric,days:String(valid.days),periodEnd:valid.periodEnd}).toString();
}
function mount(){
 const settings=document.getElementById('lo14SettingsHub'),friends=document.getElementById('lo32FriendHub');
 if(!settings||!friends||document.getElementById('lo118-account'))return;
 let token=null,username='',expiryAt=0,active=false,epoch=0;
 const pane=document.createElement('details');pane.id='lo118-account';pane.hidden=true;
 pane.innerHTML='<summary>Private account & Friends · staging</summary><p class="sub">Account login is separate from your existing LifeOS data. No old activities are transferred. Personal activity tracking continues in the original workspace until an explicitly reviewed migration exists.</p><div id="lo118-auth"><label>Username<input id="lo118-name" class="field" autocomplete="username" maxlength="30" placeholder="lowercase username"></label><label>Password<input id="lo118-pass" class="field" type="password" autocomplete="current-password" minlength="12" maxlength="128"></label><button type="button" class="btn primary" id="lo118-login">Sign in to isolated account</button><button type="button" class="btn outline" id="lo118-register">Create staging account</button></div><div id="lo118-logged" hidden><p id="lo118-identity"></p><button type="button" class="btn outline" id="lo118-logout">Sign out of isolated account</button></div><p class="sub" id="lo118-status" role="status"></p>';
 settings.prepend(pane);
 const social=document.createElement('details');social.id='lo118-social';social.hidden=true;
 social.innerHTML='<summary>Account Friends · invitations & sharing</summary><p class="sub">Only accepted friends can receive metrics you explicitly authorize. Scores are self-reported, not independently verified. This is isolated from your historical LifeOS data.</p><label>Friend username<input id="lo118-friend" class="field" maxlength="30" autocomplete="off" placeholder="friend_username"></label><button type="button" id="lo118-invite" class="btn outline">Send invitation</button><button type="button" id="lo118-remove" class="btn outline">Remove friendship</button><div><button type="button" class="btn outline" id="lo118-inbox">Refresh invitations</button><div id="lo118-invites"></div></div><h4>Sharing permissions</h4><label>Metric<select id="lo118-grant-metric" class="field"><option value="workoutDays">Workout days</option><option value="habitDays">Habit completion days</option></select></label><button type="button" class="btn primary" id="lo118-grant">Allow selected friend to see metric</button><button type="button" class="btn outline" id="lo118-revoke">Revoke selected metric</button><h4>Share my selected score</h4><p class="sub">Enter only a self-reported aggregate. No activities, prayer history, notes, workout logs or personal records are read or sent automatically.</p><label>Metric<select id="lo118-share-metric" class="field"><option value="workoutDays">Workout days</option><option value="habitDays">Habit completion days</option></select></label><label>Period<select id="lo118-share-days" class="field"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label><label>Period ending<input id="lo118-share-date" type="date" class="field"></label><label>Confirmed score<input id="lo118-share-score" type="number" class="field" min="0" max="30" step="1"></label><button type="button" class="btn primary" id="lo118-share">Review and publish self-reported score</button><h4>Shared leaderboard</h4><button type="button" class="btn outline" id="lo118-board">Refresh selected metric leaderboard</button><div id="lo118-rows"></div><p id="lo118-social-status" role="status" class="sub"></p>';
 friends.prepend(social);
 const $=id=>document.getElementById(id),status=$('lo118-status'),feedback=$('lo118-social-status');
 const input=id=>$(id).value.trim();
 function session(){return active&&token&&Date.now()<expiryAt}
 function reset(message){
  root.LifeOSMigrationV119?.clear?.();
  epoch++;token=null;username='';expiryAt=0;active=false;$('lo118-pass').value='';
  $('lo118-logged').hidden=true;$('lo118-auth').hidden=false;social.hidden=true;$('lo118-invites').replaceChildren();$('lo118-rows').replaceChildren();
  status.textContent=message||'Not signed in. Legacy LifeOS records are unaffected.';
 }
 async function request(path,method='GET',data=null,withToken=true){
  if(withToken&&!session())throw Error('Account session expired. Sign in again.');
  const headers={'Accept':'application/json'};
  if(data!==null)headers['Content-Type']='application/json';
  if(withToken)headers.Authorization='Bearer '+token;
  // Browser adds Origin for writes; GET is validated by HTTPS Referer.
  const response=await root.fetch(BASE+path,{method,headers,body:data===null?undefined:JSON.stringify(data),cache:'no-store',credentials:'same-origin',referrerPolicy:'strict-origin-when-cross-origin'});
  let result={};try{result=await response.json()}catch{}
  if(!response.ok)throw Error(response.status===429?'Too many attempts. Try later.':String(result.error||'Account request failed')+' (HTTP '+response.status+')');
  return result;
 }
 async function action(task,el=feedback){
  if(!active)return el.textContent='Sign in to your private account first.';
  const version=epoch;
  try{const result=await task();if(version!==epoch)return;el.textContent=result||'Action completed.'}
  catch(e){if(version!==epoch)return;el.textContent=String(e.message||e)}
 }
 function friend(){const value=input('lo118-friend');if(!/^[a-z][a-z0-9_]{2,29}$/.test(value))throw Error('Enter an existing 3–30 character lowercase username.');return value}
 function localDay(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
 $('lo118-share-date').value=localDay();
 $('lo118-login').onclick=async()=>{
  const name=input('lo118-name'),password=$('lo118-pass').value;
  status.textContent='Signing in to isolated account…';
  try{
   const response=await request('/login','POST',{username:name,password},false);
   if(typeof response.token!=='string'||!Number.isSafeInteger(response.expiresIn)||response.expiresIn<60)throw Error('Invalid session response');
   token=response.token;username=name;expiryAt=Date.now()+response.expiresIn*1000;active=true;epoch++;
   $('lo118-pass').value='';$('lo118-auth').hidden=true;$('lo118-logged').hidden=false;social.hidden=false;
   $('lo118-identity').textContent='Signed in as '+username+' (isolated staging account)';
   status.textContent='Account session active in this tab only. Existing LifeOS data is not migrated.';
   root.LifeOSMigrationV119?.mount?.({host:$('lo118-logged'),accountName:name,request:(path,method='GET',data=null)=>request(path,method,data)});
  }catch(e){reset(String(e.message||e))}
 };
 $('lo118-register').onclick=async()=>{
  const name=input('lo118-name'),password=$('lo118-pass').value;
  if(!root.confirm('Create a NEW staging social account? This does not move existing LifeOS data.'))return;
  try{await request('/register','POST',{username:name,password},false);status.textContent='Staging account created. Sign in with your credentials.'}
  catch(e){status.textContent=String(e.message||e)}
 };
 $('lo118-logout').onclick=async()=>{
  const old=token;reset('Signed out locally. Existing LifeOS activities are unchanged.');
  if(old)try{await root.fetch(BASE+'/logout',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json','Authorization':'Bearer '+old},body:'{}',credentials:'same-origin',cache:'no-store'})}catch{}
 };
 $('lo118-invite').onclick=()=>action(async()=>{const target=friend();if(!root.confirm('Send an invitation to '+target+'?'))return 'Invitation cancelled.';await request('/friends/invite','POST',{username:target});return 'Invitation sent. The recipient must accept.'});
 $('lo118-remove').onclick=()=>action(async()=>{const target=friend();if(!root.confirm('Remove friendship with '+target+' and revoke shared permissions?'))return 'Removal cancelled.';await request('/friends/remove','POST',{username:target});return 'Friend removed; future access revoked.'});
 $('lo118-inbox').onclick=()=>action(async()=>{
  const data=await request('/friends/inbox');const holder=$('lo118-invites');holder.replaceChildren();
  for(const inv of data.invitations||[]){
   if(typeof inv.id!=='string'||typeof inv.username!=='string')continue;
   const row=document.createElement('p'),name=document.createElement('span');name.textContent=inv.username+' invited you. ';row.append(name);
   for(const accepted of [true,false]){
    const button=document.createElement('button');button.type='button';button.className='btn outline';button.textContent=accepted?'Accept':'Decline';
    button.onclick=()=>action(async()=>{
     if(!root.confirm((accepted?'Accept':'Decline')+' invitation from '+inv.username+'?'))return 'No change.';
     await request('/friends/respond','POST',{invitationId:inv.id,accept:accepted});row.remove();return 'Invitation '+(accepted?'accepted.':'declined.');
    });
    row.append(button);
   }holder.append(row);
  }
  return (data.invitations||[]).length+' pending invitation(s).';
 });
 async function consent(enabled){
  const target=friend(),metric=input('lo118-grant-metric');
  if(!root.confirm((enabled?'Allow':'Revoke')+' '+target+' access to '+metric+'?'))return 'Permission unchanged.';
  await request('/friends/grant','POST',{username:target,metric,enabled});
  return 'Permission '+(enabled?'enabled':'revoked')+' for '+target+'.';
 }
 $('lo118-grant').onclick=()=>action(()=>consent(true));$('lo118-revoke').onclick=()=>action(()=>consent(false));
 function shareSettings(){
  const result=validateScore(input('lo118-share-metric'),input('lo118-share-days'),input('lo118-share-score'),input('lo118-share-date'));
  if(!result)throw Error('Select a valid date, metric and score within the period.');
  return result;
 }
 $('lo118-share').onclick=()=>action(async()=>{
  const data=shareSettings();
  if(!root.confirm('Publish '+data.score+' '+data.metric+' for '+data.days+' days ending '+data.periodEnd+'? This is self-reported and visible only to friends whom you explicitly authorized.'))return 'Publishing cancelled.';
  await request('/friends/share','POST',data);return 'Aggregate score published for permitted friends. No LifeOS activity records were sent.';
 });
 $('lo118-board').onclick=()=>action(async()=>{
  const query=leaderboardQuery(input('lo118-share-metric'),input('lo118-share-days'),input('lo118-share-date'));
  if(!query)throw Error('Select a valid leaderboard period.');
  const results=await request('/friends/leaderboard?'+query);
  const holder=$('lo118-rows');holder.replaceChildren();
  (results.results||[]).forEach((row,index)=>{
   const p=document.createElement('p');p.textContent=(index+1)+'. '+String(row.username||'Friend')+': '+Number(row.score||0)+' day(s) · self-reported';holder.append(p);
  });
  return (results.results||[]).length+' consented friend score(s) shown.';
 });
 root.addEventListener('pagehide',()=>reset('Account session cleared on navigation.'));
 root.fetch(STATUS,{cache:'no-store',credentials:'same-origin'}).then(async response=>{
  if(!response.ok)return null;
  return await response.json();
 }).then(result=>{
  if(!result||result.enabled!==true||root.location?.protocol!=='https:')return;
  pane.hidden=false;
  status.textContent='Account staging enabled. Login and Friends are isolated from legacy LifeOS records.';
  // Friends interface remains hidden until account login, legacy V90 stays available.
 }).catch(()=>{});
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {BASE,STATUS,METRICS,validateScore,leaderboardQuery};
});