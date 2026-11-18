/* LifeOS V206 — read-only cross-section integrity checks.
   No automatic repairs, uploads, data migrations or record writes. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.LifeOSCrossSectionV206=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const sample=x=>!!(x?.seedBatch||x?.assumed||x?.isExample||x?.developmentExample||
 ['development-starter','development-seed','assumed-demo','imported-example'].includes(x?.source));
const validId=x=>x!=null&&String(x).trim()!=='';
function duration(session,at=Date.now()){
 let ms=0,malformed=false,open=0;
 const segments=Array.isArray(session?.segments)?session.segments:[];
 for(const part of segments){
  if(!part||!Number.isFinite(part.start)){malformed=true;continue}
  if(part.end==null)open++;
  const end=part.end==null&&session.status==='running'?at:part.end;
  if(end==null&&session.status==='paused')continue;
  if(!Number.isFinite(end)||end<part.start){malformed=true;continue}
  ms+=end-part.start;
 }
 if(session?.status==='running'&&open!==1)malformed=true;
 if(session?.status==='finished'&&open!==0)malformed=true;
 return {ms,malformed,open};
}
function inspect(workspace,at=Date.now()){
 const w=workspace&&typeof workspace==='object'?workspace:{};
 const types=['sessions','workouts','meals','schedule','habitChecks'];
 const counts={};const issues=[];const index={};
 for(const type of types){
  const rows=Array.isArray(w[type])?w[type]:[];
  const ids=new Set();let duplicates=0,missingIds=0;
  for(const row of rows){
   if(!validId(row?.id)){missingIds++;continue}
   const id=String(row.id);
   if(ids.has(id))duplicates++;
   ids.add(id);
  }
  index[type]=ids;
  counts[type]={total:rows.length,samples:rows.filter(sample).length,duplicates,missingIds};
  if(duplicates)issues.push({kind:'duplicate',section:type,number:duplicates,description:'Duplicate identifiers within '+type+'.'});
  if(missingIds)issues.push({kind:'invalid-id',section:type,number:missingIds,description:'Records without identifiers in '+type+'.'});
 }
 let invalidIntervals=0,longRunning=0,linkedWorkoutDuplicates=0,linkedMealDuplicates=0;
 for(const s of w.sessions||[]){
  const d=duration(s,at);
  if(d.malformed)invalidIntervals++;
  if(s.status==='running'&&d.ms>16*3600000)longRunning++;
 }
 if(invalidIntervals)issues.push({kind:'interval',section:'Track',number:invalidIntervals,description:'Timers with invalid or inconsistent intervals need review.'});
 if(longRunning)issues.push({kind:'stale',section:'Track',number:longRunning,description:'Running timers exceeding 16 hours should be reviewed; no automatic finish.'});
 for(const [key,label] of [['workouts','Fitness'],['meals','Nutrition']]){
  const seen=new Set();let orphan=0,duplicated=0;
  for(const row of w[key]||[]){
   if(!validId(row?.sessionId))continue;
   const id=String(row.sessionId);
   if(!index.sessions.has(id))orphan++;
   if(seen.has(id))duplicated++;
   seen.add(id);
  }
  counts[key].orphanLinks=orphan;counts[key].repeatedSessionLinks=duplicated;
  if(orphan)issues.push({kind:'orphan',section:label,number:orphan,description:label+' records linked to missing timers.'});
  if(duplicated)issues.push({kind:'linked-duplicate',section:label,number:duplicated,description:'Multiple '+label.toLowerCase()+' details linked to a single timer; review before counting.'});
  if(key==='workouts')linkedWorkoutDuplicates=duplicated;
  else linkedMealDuplicates=duplicated;
 }
 let missingHabitEvidence=0;
 for(const c of w.habitChecks||[]){
  if(c?.evidenceType==='session'&&validId(c.evidenceSourceId)&&!index.sessions.has(String(c.evidenceSourceId)))missingHabitEvidence++;
 }
 if(missingHabitEvidence)issues.push({kind:'orphan',section:'Habits',number:missingHabitEvidence,description:'Habit confirmations referencing missing tracked activities.'});
 return {counts,issues,summary:{
  issues:issues.reduce((n,x)=>n+x.number,0),invalidIntervals,longRunning,linkedWorkoutDuplicates,linkedMealDuplicates,
  missingHabitEvidence,activities:(w.sessions||[]).length,
  checkedAt:at
 }};
}
return Object.freeze({inspect,duration,sample});
});
