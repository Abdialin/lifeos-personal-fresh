/* LifeOS Personal Batch H: local, user-confirmed planning reminders. */
(function(root){'use strict';
const MIN=60000;
function evaluate(plans,t=Date.now(),lead=10*MIN){
 if(!Array.isArray(plans)||!Number.isFinite(t))throw Error('Invalid reminder input');
 return plans.filter(p=>p&&p.status==='planned'&&!p.sessionId&&p.reminder===true&&Number.isFinite(p.startAt)&&Number.isFinite(p.endAt)&&p.endAt>p.startAt).map(p=>{
  const r=p.reminderReview||{};
  if(r.state==='dismissed'||r.state==='confirmed-not-started')return null;
  if(Number.isFinite(r.snoozedUntil)&&r.snoozedUntil>t)return null;
  const phase=t<p.startAt?'upcoming':t<p.endAt?'due':'missed';
  if(t<p.startAt-lead)return null;
  return {id:p.id,name:p.name,startAt:p.startAt,endAt:p.endAt,phase,needsConfirmation:phase==='missed',snoozedUntil:r.snoozedUntil||null};
 }).filter(Boolean).sort((a,b)=>a.startAt-b.startAt);
}
function review(plan,action,t=Date.now()){
 if(!plan||plan.status!=='planned'||plan.sessionId)throw Error('Only unstarted plans may be reviewed');
 if(!Number.isFinite(t))throw Error('Invalid review timestamp');
 if(!['snooze','dismiss','confirm-not-started','reset'].includes(action))throw Error('Invalid review action');
 const updated={...plan};
 if(action==='reset')delete updated.reminderReview;
 else updated.reminderReview={state:action==='dismiss'?'dismissed':action==='confirm-not-started'?'confirmed-not-started':'snoozed',snoozedUntil:action==='snooze'?t+10*MIN:null,reviewedAt:t};
 return updated;
}
const api={evaluate,review};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.LifeOSPersonalReminders=api;
})(typeof window!=='undefined'?window:null);
