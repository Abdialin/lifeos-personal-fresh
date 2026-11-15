/* LifeOS V90 — consent-first, local progress-card exchange.
 * No networking, no inferred consent, no verified leaderboard claims.
 * Exported cards are deliberately aggregate-only and self-reported.
 * Revoking a card stops future exports; it cannot retract copies sent to others.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSFriendsV90=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const KEY='lifeos.personal.friends-consent.v90', PEERS='lifeos.personal.friend-cards.v90', TYPE='lifeos-friends-card-v90', DAY=86400000;
const METRICS=['workoutDays','habitDays'];
function dateKey(ms){const d=new Date(ms);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function parseDay(value){if(typeof value!=='string'||!/^\d{4}-\d\d-\d\d$/.test(value))return null;const date=new Date(value+'T12:00:00');return Number.isFinite(date.getTime())&&dateKey(date.getTime())===value?date:null}
function config(input){
 const n=input&&typeof input==='object'?input:{};
 return {enabled:n.enabled===true,alias:typeof n.alias==='string'?n.alias.trim().slice(0,40):'',metrics:Array.isArray(n.metrics)?METRICS.filter(x=>n.metrics.includes(x)):[],periodDays:[7,14,30].includes(n.periodDays)?n.periodDays:7};
}
function validateCard(raw,now=Date.now()){
 if(!raw||typeof raw!=='object'||raw.type!==TYPE||!parseDay(raw.periodStart)||!parseDay(raw.periodEnd)||!parseDay(raw.expiresOn))return {ok:false,reason:'Invalid or unsupported card.'};
 if(typeof raw.alias!=='string'||!raw.alias.trim()||raw.alias.length>40||typeof raw.nonce!=='string'||!/^[-a-zA-Z0-9]{8,90}$/.test(raw.nonce))return {ok:false,reason:'Invalid card label or identifier.'};
 const start=parseDay(raw.periodStart),end=parseDay(raw.periodEnd),expiry=parseDay(raw.expiresOn);
 const span=Math.round((end.getTime()-start.getTime())/DAY)+1;
 if(![7,14,30].includes(span)||raw.periodEnd>dateKey(now)||expiry.getTime()<start.getTime()||expiry.getTime()>end.getTime()+31*DAY)return {ok:false,reason:'Unsupported date range.'};
 if(dateKey(now)>raw.expiresOn)return {ok:false,reason:'This progress card has expired.'};
 if(!raw.metrics||typeof raw.metrics!=='object'||Array.isArray(raw.metrics))return {ok:false,reason:'No shared metrics.'};
 const keys=Object.keys(raw.metrics);
 if(!keys.length||keys.some(k=>!METRICS.includes(k)))return {ok:false,reason:'Unrecognized metric.'};
 for(const key of keys){if(!Number.isInteger(raw.metrics[key])||raw.metrics[key]<0||raw.metrics[key]>span)return {ok:false,reason:'Progress count exceeds period.'}}
 return {ok:true,card:{type:TYPE,alias:raw.alias,nonce:raw.nonce,periodStart:raw.periodStart,periodEnd:raw.periodEnd,expiresOn:raw.expiresOn,metrics:Object.fromEntries(keys.map(k=>[k,raw.metrics[k]])),basis:'self-reported; not independently verified'}};
}
function summary(workspace,habits,now,days){
 const today=dateKey(now),start=dateKey(new Date(today+'T12:00:00').getTime()-(days-1)*DAY);
 const workouts=new Set((workspace?.workouts||[]).filter(x=>x&&x.date>=start&&x.date<=today&&!x.seedBatch&&!['assumed-demo','development-starter','imported-example'].includes(x.source)).map(x=>x.date)).size;
 const checks=new Set((habits?.habitChecks||[]).filter(x=>x&&x.done&&x.date>=start&&x.date<=today&&!x.seedBatch&&!['assumed-demo','development-starter'].includes(x.source)).map(x=>x.date)).size;
 return {periodStart:start,periodEnd:today,workoutDays:Math.min(workouts,days),habitDays:Math.min(checks,days)};
}
function createCard(consent,progress,now=Date.now(),randomId){
 const c=config(consent);
 if(!c.enabled||!c.alias||!c.metrics.length)return {ok:false,reason:'Enable sharing, choose a nickname and at least one metric.'};
 const nonce=String(randomId||root.crypto?.randomUUID?.()||'');
 if(!/^[-a-zA-Z0-9]{8,90}$/.test(nonce))return {ok:false,reason:'Secure card identifier unavailable.'};
 const today=dateKey(now),end=new Date(today+'T12:00:00').getTime();
 const card={type:TYPE,alias:c.alias,nonce,periodStart:dateKey(end-(c.periodDays-1)*DAY),periodEnd:today,expiresOn:dateKey(end+7*DAY),metrics:Object.fromEntries(c.metrics.map(k=>[k,Math.max(0,Math.min(c.periodDays,Number(progress[k])||0))])),basis:'self-reported; not independently verified'};
 return validateCard(card,now);
}
function leaderboard(cards,periodDays,metric,now=Date.now()){
 const today=dateKey(now);
 return (Array.isArray(cards)?cards:[]).map(x=>({name:x.name,receivedAt:x.receivedAt,check:validateCard(x.card,now)}))
  .filter(x=>x.check.ok&&Object.prototype.hasOwnProperty.call(x.check.card.metrics,metric))
  .filter(x=>{const c=x.check.card;return Math.round((parseDay(c.periodEnd)-parseDay(c.periodStart))/DAY)+1===periodDays&&c.periodEnd===today})
  .sort((a,b)=>b.check.card.metrics[metric]-a.check.card.metrics[metric]).map(x=>({name:x.name,score:x.check.card.metrics[metric],selfReported:true}));
}
function read(store,key,fallback){try{const item=JSON.parse(store.getItem(key)||'null');return item??fallback}catch{return fallback}}
function mount(){
 const host=document.getElementById('lo32FriendHub');if(!host||document.getElementById('lo90-friends'))return;
 // Existing V32 manual card flow remains available in a collapsed legacy area.
 const older=document.createElement('details');older.id='lo90-legacy';
 const olderSummary=document.createElement('summary');olderSummary.textContent='Legacy manually shared cards (V32)';older.append(olderSummary);
 while(host.firstChild)older.append(host.firstChild);
 host.append(older);
 const section=document.createElement('section');section.id='lo90-friends';host.prepend(section);
 const style=document.getElementById('lo90-styles')||document.createElement('style');style.id='lo90-styles';style.textContent=`
 #lo90-friends{padding:15px;background:#17243b;border:1px solid #4a6587;border-radius:14px;color:#ebf2ff}
 #lo90-friends fieldset{border:1px solid #3f5e7b;border-radius:10px;margin:10px 0;padding:12px}
 #lo90-friends label{display:block;margin:10px 0}
 #lo90-friends input[type=text],#lo90-friends textarea,#lo90-friends select{width:100%;max-width:100%;background:#0d1930;color:#fff;border:1px solid #547293;border-radius:8px;padding:10px}
 #lo90-friends button{background:#2d4d73;border:1px solid #6384a4;color:#fff;border-radius:8px;padding:10px;margin:4px 6px 4px 0;min-height:42px}
 #lo90-friends button:focus-visible,#lo90-friends input:focus-visible{outline:3px solid #7de2cd}
 #lo90-friends .lo90-person{border-top:1px solid #3b526b;padding:10px 0}
 #lo90-friends .lo90-muted{color:#bfd0e4;font-size:13px}
 `;if(!style.isConnected)document.head.append(style);
 section.innerHTML='<h3>Friends · private progress sharing</h3><p class="lo90-muted">Nothing is shared automatically. These are local, manually exchanged progress cards—not connected friend accounts or independently verified performance.</p><fieldset><legend>My sharing consent</legend><label><input type="checkbox" id="lo90-enabled"> Enable manual sharing</label><label>Public nickname for cards<input type="text" maxlength="40" id="lo90-alias" placeholder="Nickname (not your real name)"></label><label><input type="checkbox" id="lo90-workouts"> Share workout days</label><label><input type="checkbox" id="lo90-habits"> Share habit completion days (may reveal sensitive interests indirectly)</label><label>Reporting period<select id="lo90-period"><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option></select></label><button id="lo90-save" type="button">Save sharing choices</button><button id="lo90-export" type="button">Create share card</button><button id="lo90-revoke" type="button">Stop sharing</button></fieldset><p class="lo90-muted">Card expires after 7 days. Stopping sharing prevents new cards; previously exported files cannot be remotely revoked. No prayers, notes, locations or individual activities are included, but even aggregate habit counts can be personal.</p><fieldset><legend>Add a card received from a friend</legend><label>Friend label<input id="lo90-friend-name" type="text" maxlength="40" placeholder="Friend nickname"></label><label>Paste their V90 card JSON<textarea id="lo90-card" maxlength="3000" rows="4"></textarea></label><button id="lo90-import" type="button">Review and add card</button></fieldset><fieldset><legend>Local leaderboard</legend><label>Metric<select id="lo90-metric"><option value="workoutDays">Workout days</option><option value="habitDays">Habit days</option></select></label><p class="lo90-muted">Only cards for the same complete period ending today and sharing this metric are comparable. Old, expired, or differently scoped cards are excluded.</p><div id="lo90-board"></div></fieldset><p id="lo90-message" role="status"></p>';
 const el=id=>section.querySelector('#'+id),store=root.localStorage,message=el('lo90-message');
 let saved=config(read(store,KEY,{})),peers=read(store,PEERS,[]);
 if(!Array.isArray(peers))peers=[];
 function loadFields(){el('lo90-enabled').checked=saved.enabled;el('lo90-alias').value=saved.alias;el('lo90-workouts').checked=saved.metrics.includes('workoutDays');el('lo90-habits').checked=saved.metrics.includes('habitDays');el('lo90-period').value=String(saved.periodDays)}
 function fields(){return config({enabled:el('lo90-enabled').checked,alias:el('lo90-alias').value,metrics:[el('lo90-workouts').checked?'workoutDays':null,el('lo90-habits').checked?'habitDays':null].filter(Boolean),periodDays:Number(el('lo90-period').value)})}
 function persist(key,value){try{store.setItem(key,JSON.stringify(value));return true}catch{return false}}
 function render(){const board=el('lo90-board');board.replaceChildren();
  const rows=leaderboard(peers,saved.periodDays,el('lo90-metric').value);
  const label=document.createElement('p');label.textContent=rows.length+' comparable self-reported card(s) · '+peers.length+' card(s) stored locally.';board.append(label);
  for(const r of rows){const item=document.createElement('p');item.textContent=r.name+' · '+r.score+' of '+saved.periodDays+' days (self-reported)';board.append(item)}
  const manage=document.createElement('div');manage.textContent='Stored cards:';
  for(const peer of peers){const row=document.createElement('div');row.className='lo90-person';const span=document.createElement('span');span.textContent=String(peer.name||'Friend')+' · '+String(peer.card?.periodEnd||'unknown date');const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.addEventListener('click',()=>{if(!root.confirm('Remove this locally stored card?'))return;peers=peers.filter(x=>x.id!==peer.id);if(persist(PEERS,peers))render();else message.textContent='Unable to remove card.'});row.append(span,remove);manage.append(row)}board.append(manage);
 }
 el('lo90-save').onclick=()=>{const next=fields();if(next.enabled&&(!next.alias||!next.metrics.length))return message.textContent='Choose a nickname and at least one metric.';if(!persist(KEY,next))return message.textContent='Could not save choices.';saved=next;message.textContent='Local sharing preferences saved. No data was sent.';render()};
 el('lo90-revoke').onclick=()=>{if(!root.confirm('Disable future sharing? Previously downloaded cards cannot be recalled.'))return;const next={...saved,enabled:false};if(!persist(KEY,next))return message.textContent='Could not save revocation.';saved=next;loadFields();message.textContent='Future sharing disabled on this device. Previously shared copies remain outside LifeOS.'};
 el('lo90-export').onclick=()=>{
  const unsaved=fields();if(JSON.stringify(unsaved)!==JSON.stringify(saved))return message.textContent='Save your sharing choices before generating a card.';
  const ws=root.lifeosReadOnlyWorkspace?.()||{},habits=root.lifeosSocialHabitBridge?.read?.()||{};
  const progress=summary(ws,habits,Date.now(),saved.periodDays),result=createCard(saved,progress);
  if(!result.ok)return message.textContent=result.reason;
  if(!root.confirm('Export only your selected aggregate metrics? Anyone with the file can read those counts.'))return;
  const blob=new Blob([JSON.stringify(result.card,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='lifeos-progress-card-v90.json';document.body.append(a);a.click();a.remove();root.setTimeout(()=>URL.revokeObjectURL(url),5000);
  message.textContent='Card exported locally. It has not been sent to anyone.';
 };
 el('lo90-import').onclick=()=>{
  const name=el('lo90-friend-name').value.trim();if(!name||name.length>40)return message.textContent='Enter a friend label.';
  let input;try{input=JSON.parse(el('lo90-card').value)}catch{return message.textContent='Card is not valid JSON.'}
  const checked=validateCard(input);if(!checked.ok)return message.textContent=checked.reason;
  if(!root.confirm('Save '+name+'\'s self-reported '+Object.keys(checked.card.metrics).join(' and ')+' card for '+checked.card.periodStart+' through '+checked.card.periodEnd+' on this device?'))return;
  const id=checked.card.nonce;
  peers=[...peers.filter(x=>x.id!==id),{id,name,card:checked.card,receivedAt:Date.now()}].slice(-100);
  if(!persist(PEERS,peers))return message.textContent='Could not store shared card.';
  message.textContent='Card saved on this device only. Progress is not verified.';render();
 };
 el('lo90-metric').onchange=render;
 el('lo90-period').addEventListener('change',()=>{message.textContent='Save reporting period to apply it to the leaderboard.'});
 loadFields();render();
}
if(typeof document!=='undefined'){
 const start=()=>{mount();const host=document.getElementById('lo32FriendHub');if(host&&!host.__lifeosV90Observed){host.__lifeosV90Observed=true;let queued=false;new MutationObserver(()=>{if(queued||document.getElementById('lo90-friends'))return;queued=true;setTimeout(()=>{queued=false;mount()},0)}).observe(host,{childList:true})}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
return {KEY,PEERS,TYPE,METRICS,config,parseDay,summary,createCard,validateCard,leaderboard};
});