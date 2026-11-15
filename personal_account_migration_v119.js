/* V119 — selected-file-only, consent-driven migration.
 * Does not read or alter legacy live sessions or any localStorage.
 * Verification of LifeOS SHA-256 backup is authoritative on the server.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSMigrationV119=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const MAX=2000000,FORMAT='lifeos-v3.1-backup';
function inspect(raw){
 if(typeof raw!=='string'||raw.length>MAX)return {ok:false,reason:'Backup file too large (2 MB limit).'};
 let backup;try{backup=JSON.parse(raw)}catch{return {ok:false,reason:'Unreadable backup JSON.'}}
 if(!backup||typeof backup!=='object'||Array.isArray(backup)||backup.format!==FORMAT||
    !Number.isSafeInteger(backup.revision)||backup.revision<0||
    typeof backup.sha256!=='string'||!/^[a-f0-9]{64}$/.test(backup.sha256)||
    !backup.data||typeof backup.data!=='object'||Array.isArray(backup.data)||backup.data.version!==1)
    return {ok:false,reason:'Not a supported original LifeOS server backup.'};
 const data=backup.data, keys=['sessions','schedule','workouts','meals','habitChecks'];
 if(keys.some(k=>data[k]!==undefined&&!Array.isArray(data[k])))return {ok:false,reason:'Invalid backup collection.'};
 const counts=Object.fromEntries(keys.map(k=>[k,Array.isArray(data[k])?data[k].length:0]));
 return {ok:true,backup,counts,revision:backup.revision,
  warning:'Preview based on the selected backup file. The server verifies its checksum and protects against overwriting an existing account.'};
}
let current=null;
function clear(){current?.remove();current=null}
function mount({host,accountName,request}){
 clear();
 if(!host||typeof accountName!=='string'||typeof request!=='function')return;
 const section=document.createElement('details');current=section;section.id='lo119-migration';
 section.innerHTML='<summary>Transfer an existing LifeOS backup to this account · one time</summary><p class="sub">This does not move your current activity history automatically. Choose an original LifeOS server backup file that belongs to you, inspect it, save a safety copy, and explicitly approve copying it into an EMPTY individual account. Legacy data stays unchanged.</p><label>Original LifeOS backup JSON<input id="lo119-file" type="file" accept=".json,application/json"></label><div id="lo119-review" hidden></div><p id="lo119-status" role="status" class="sub"></p>';
 host.append(section);
 const el=id=>section.querySelector('#'+id),review=el('lo119-review'),status=el('lo119-status');
 let chosen=null,rawOriginal=null,downloaded=false;
 function reset(){chosen=null;rawOriginal=null;downloaded=false;review.hidden=true;review.replaceChildren()}
 el('lo119-file').onchange=async e=>{
  reset();const file=e.target.files?.[0];if(!file)return;
  if(file.size>MAX)return status.textContent='File is larger than 2 MB. Nothing was sent.';
  try{rawOriginal=await file.text()}catch{return status.textContent='Unable to read file.'}
  chosen=inspect(rawOriginal);
  if(!chosen.ok)return status.textContent=chosen.reason;
  const summary=document.createElement('p');
  summary.textContent='Selected backup: '+chosen.counts.sessions+' sessions, '+chosen.counts.schedule+' plans, '+chosen.counts.workouts+' workouts, '+chosen.counts.meals+' meals, '+chosen.counts.habitChecks+' habit checks. Original backup revision '+chosen.revision+'.';
  review.append(summary);
  const warning=document.createElement('p');warning.textContent=chosen.warning+' This file may include sensitive personal activity history. Do not share it with others.';review.append(warning);
  const download=document.createElement('button');download.type='button';download.className='btn outline';download.textContent='Download my safety copy of this selected backup';review.append(download);
  const checklist=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.id='lo119-consent';checklist.append(check,document.createTextNode(' I own these records and approve copying them to my empty account. I understand this does not update or remove my existing LifeOS data.'));review.append(checklist);
  const target=document.createElement('label');target.textContent='Type your signed-in username to confirm: '+accountName;
  const name=document.createElement('input');name.id='lo119-confirm-user';name.type='text';name.autocomplete='off';target.append(name);review.append(target);
  const approve=document.createElement('button');approve.type='button';approve.className='btn primary';approve.textContent='Copy verified backup into empty account';approve.disabled=true;review.append(approve);
  function eligible(){approve.disabled=!downloaded||!check.checked||name.value.trim()!==accountName}
  check.onchange=eligible;name.oninput=eligible;
  download.onclick=()=>{
   if(!chosen?.ok||rawOriginal===null)return;
   const url=URL.createObjectURL(new Blob([rawOriginal],{type:'application/json'})),link=document.createElement('a');
   link.href=url;link.download='lifeos-safety-copy-before-account-migration.json';document.body.append(link);link.click();link.remove();
   root.setTimeout(()=>URL.revokeObjectURL(url),5000);downloaded=true;eligible();
   status.textContent='Safety-copy download initiated. Check that the file is saved before transferring.';
  };
  approve.onclick=async()=>{
   if(!eligibleMigration(chosen,downloaded,check.checked,name.value.trim(),accountName))return status.textContent='Review and confirm again.';
   if(!root.confirm('Copy the selected backup into account '+accountName+'? This may include private activities and is allowed only when that account has no existing workspace.'))return;
   approve.disabled=true;status.textContent='Checking empty account and verifying backup checksum…';
   try{
    const existing=await request('/workspace','GET');
    if(existing.revision!==0||existing.data!==null)throw Error('Account already contains data. No overwrite is permitted.');
    const result=await request('/workspace/migrate','POST',{backup:chosen.backup,confirmedUsername:accountName,approved:true,expectedRevision:0});
    if(!result.ok||!result.copied)throw Error('Migration was not confirmed.');
    status.textContent='Account copy saved at revision '+result.revision+'. Existing LifeOS records remain unchanged. Download and keep your safety copy.';
    reset();el('lo119-file').value='';
   }catch(error){status.textContent=String(error?.message||error)+' Original data was not modified.';eligible()}
  };
  review.hidden=false;status.textContent='Preview only. Nothing has been uploaded or copied.';
 };
}
function eligibleMigration(proposal,safety,approved,typed,username){return proposal?.ok===true&&safety===true&&approved===true&&typed===username&&Boolean(username)}
if(typeof document!=='undefined')root.addEventListener('pagehide',clear);
return {MAX,FORMAT,inspect,eligibleMigration,mount,clear};
});