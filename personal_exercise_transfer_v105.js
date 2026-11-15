/* LifeOS V105 — reviewed exercise-progress transfer.
 * Imported details must match an existing logged workout by ID AND date.
 * Never creates workouts, tracked minutes, exercises or inferred completion.
 * No automatic cloud sync; transfers are manual, explicit and per-record approved. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSExerciseTransferV105=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const FORMAT='lifeos.exercise-progress.v105',VERSION=1,MAX=500,FILE_MAX=150000;
const KEY='lifeos.personal.exercise-progress.v100';
function eligible(workouts){
 const map=new Map();
 for(const w of Array.isArray(workouts)?workouts:[]){
  if(!w||!w.id||typeof w.date!=='string'||w.seedBatch||['assumed-demo','development-starter','imported-example'].includes(w.source))continue;
  map.set(String(w.id),w.date);
 }
 return map;
}
function validateEntry(row,progress=root.LifeOSExerciseProgressV100){
 if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!['id','workoutId','exercise','date','sets','reps','load'].includes(k)))return null;
 if(typeof row.id!=='string'||!row.id||row.id.length>100)return null;
 const valid=progress?.valid?.(row);return valid?{id:row.id,...valid}:null;
}
function inspect(raw,workouts,existing=[],progress=root.LifeOSExerciseProgressV100){
 if(typeof raw!=='string'||raw.length>FILE_MAX)return {ok:false,reason:'Transfer file is too large.'};
 let doc;try{doc=JSON.parse(raw)}catch{return {ok:false,reason:'Unreadable JSON.'}}
 if(!doc||doc.format!==FORMAT||doc.version!==VERSION||!Array.isArray(doc.entries)||doc.entries.length>MAX||!['exercise-progress-only'].includes(doc.scope))return {ok:false,reason:'Unsupported exercise progress transfer.'};
 const linked=eligible(workouts),ids=new Set(existing.map(x=>x.id)),incoming=new Set(),eligibleRows=[],unmatched=[],duplicates=[],invalid=[];
 for(const [index,row] of doc.entries.entries()){
  const validated=validateEntry(row,progress);
  if(!validated){invalid.push(index+1);continue}
  if(ids.has(validated.id)||incoming.has(validated.id)){duplicates.push(index+1);continue}
  incoming.add(validated.id);
  const localDate=linked.get(validated.workoutId);
  if(!localDate||localDate!==validated.date){unmatched.push({line:index+1,workoutId:validated.workoutId,date:validated.date,reason:localDate?'Workout date differs':'Workout ID not present'});continue}
  eligibleRows.push(validated);
 }
 return {ok:true,entries:eligibleRows,unmatched,duplicates,invalid,total:doc.entries.length,
  note:'Only explicitly selected exercise details can be restored; imported workouts are never created.'};
}
function exportData(records,now=new Date().toISOString()){
 const entries=(Array.isArray(records)?records:[]).map(validateEntry).filter(Boolean).slice(0,MAX);
 return {format:FORMAT,version:VERSION,scope:'exercise-progress-only',exportedAt:now,entries};
}
function applySelected(store,review,selected,workouts,progress=root.LifeOSExerciseProgressV100){
 if(!review?.ok||!Array.isArray(selected)||!selected.length||new Set(selected).size!==selected.length)return {ok:false,reason:'Choose valid unique exercise details.'};
 const chosen=review.entries.filter(x=>selected.includes(x.id));
 if(chosen.length!==selected.length)return {ok:false,reason:'One or more selected records are no longer eligible.'};
 let existing;try{existing=progress?.read?.(store)||[]}catch{return {ok:false,reason:'Existing exercise details cannot be read.'}}
 const links=eligible(workouts),ids=new Set(existing.map(x=>x.id));
 if(existing.length+chosen.length>MAX||chosen.some(x=>ids.has(x.id)||links.get(x.workoutId)!==x.date||!validateEntry(x,progress)))return {ok:false,reason:'Some workout links or existing entries changed. Review again.'};
 const prior=store.getItem(KEY);
 try{
  store.setItem(KEY,JSON.stringify([...existing,...chosen]));
  const verified=progress.read(store);
  if(verified.length!==existing.length+chosen.length||chosen.some(x=>!verified.some(v=>v.id===x.id)))throw Error('Readback failed');
 }catch(e){
  try{if(prior==null)store.removeItem(KEY);else store.setItem(KEY,prior)}catch(_){}
  return {ok:false,reason:'Transfer could not be verified; previous local data restored where possible.'};
 }
 return {ok:true,imported:chosen.length};
}
function mount(){
 const host=document.getElementById('lo100-progress');if(!host||document.getElementById('lo105-transfer'))return;
 const panel=document.createElement('details');panel.id='lo105-transfer';
 panel.innerHTML='<summary>Move exercise progress to another device</summary><p class="sub">Manual transfer only. Exercise details are matched against existing logged workouts on this device by workout ID and date. Missing or different workouts are excluded. No workouts or tracked time will be imported.</p><button type="button" class="btn outline" id="lo105-export">Export exercise details</button><label for="lo105-file">Select exercise progress JSON</label><input type="file" class="field" id="lo105-file" accept=".json,application/json"><div id="lo105-review" hidden></div><p class="sub" id="lo105-message" role="status"></p>';
 host.append(panel);
 const $=id=>panel.querySelector('#'+id),status=$('lo105-message'),reviewPanel=$('lo105-review'),store=root.localStorage,progress=root.LifeOSExerciseProgressV100;
 const workouts=()=>root.lifeosReadOnlyWorkspace?.()?.workouts||[];
 let proposal=null;
 $('lo105-export').onclick=()=>{
  const data=exportData(progress?.read?.(store)||[]);
  if(!data.entries.length){status.textContent='No confirmed exercise details to export.';return}
  if(!root.confirm('Export '+data.entries.length+' self-reported exercise details? The file may contain sensitive fitness information.'))return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download='lifeos-exercise-progress-v105.json';document.body.append(a);a.click();a.remove();root.setTimeout(()=>URL.revokeObjectURL(url),5000);
  status.textContent='Exercise progress file prepared. Keep it private. No data was uploaded.';
 };
 $('lo105-file').onchange=async e=>{
  proposal=null;reviewPanel.replaceChildren();reviewPanel.hidden=true;
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>FILE_MAX)return status.textContent='File exceeds 150 KB.';
  let text;try{text=await file.text()}catch{return status.textContent='File cannot be read.'}
  proposal=inspect(text,workouts(),progress?.read?.(store)||[],progress);
  if(!proposal.ok)return status.textContent=proposal.reason;
  const intro=document.createElement('p');intro.textContent=proposal.total+' supplied · '+proposal.entries.length+' eligible · '+proposal.unmatched.length+' without matching workouts · '+proposal.duplicates.length+' duplicates · '+proposal.invalid.length+' invalid. Nothing has been saved.';reviewPanel.append(intro);
  for(const row of proposal.entries){
   const label=document.createElement('label');label.style.display='block';
   const check=document.createElement('input');check.type='checkbox';check.value=row.id;
   label.append(check,document.createTextNode(' '+row.date+' · '+row.exercise+' · '+row.sets+' × '+row.reps+(row.load==null?'':' @ '+row.load+' kg')));reviewPanel.append(label);
  }
  const apply=document.createElement('button');apply.type='button';apply.className='btn primary';apply.textContent='Import selected matched details';reviewPanel.append(apply);
  apply.onclick=()=>{
   const ids=[...reviewPanel.querySelectorAll('input:checked')].map(x=>x.value);
   if(!ids.length)return status.textContent='Select matched records to import.';
   if(!root.confirm('Add '+ids.length+' selected exercise details linked to existing logged workouts on this device?'))return;
   const result=applySelected(store,proposal,ids,workouts(),progress);
   status.textContent=result.ok?result.imported+' exercise details saved locally. Reload to refresh the exercise history.':result.reason;
   if(result.ok){proposal=null;reviewPanel.hidden=true;reviewPanel.replaceChildren();$('lo105-file').value=''}
  };
  reviewPanel.hidden=false;status.textContent='Review matched details; select only those you intend to transfer.';
 };
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
return {FORMAT,VERSION,MAX,KEY,eligible,validateEntry,inspect,exportData,applySelected};
});