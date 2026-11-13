/* LifeOS V34: cautious, opt-in habit improvement suggestions from recorded evidence. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const local=t=>{const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const ms=s=>new Date(s+'T12:00:00').getTime();
const score=(x,y)=>y?Math.round(100*x/y):null;
const w=()=>window.lifeosReadOnlyWorkspace?.()||{},habits=()=>window.lifeosSocialHabitBridge?.read()||{};
const now=()=>new Date();
function days(def,lookback=28){
 const today=new Date();today.setHours(12,0,0,0);
 const created=String(def.startDate||local(def.createdAt||Date.now()));
 const every=Number(def.everyDays)||1,out=[];
 for(let ago=lookback;ago>=1;ago--){
  const date=new Date(today);date.setDate(date.getDate()-ago);
  const key=local(date.getTime());
  if(key<created)continue;
  const delta=Math.round((ms(key)-ms(created))/86400000);
  if(delta>=0&&delta%every===0)out.push(key);
 }
 return out;
}
function evaluate(def,checks,records){
 const scheduled=days(def,28),all=new Map(checks.filter(c=>c.habitId===def.id&&c.done).map(c=>[c.date,c]));
 const startRecent=local(Date.now()-14*86400000);
 const older=scheduled.filter(d=>d<startRecent),recent=scheduled.filter(d=>d>=startRecent);
 const completed=arr=>arr.filter(x=>all.has(x)).length;
 const completedRecent=completed(recent),completedOlder=completed(older);
 const linked=scheduled.map(d=>all.get(d)).filter(c=>c?.checkSource==='linked-evidence');
 let unresolved=0,assumed=0;
 for(const c of linked){
  const source=c.evidenceType==='session'?records.sessions:c.evidenceType==='workout'?records.workouts:c.evidenceType==='personalLog'?records.personalLogs:[];
  if(!(source||[]).some(x=>x.id===c.evidenceSourceId))unresolved++;
  if(c.evidenceSimulated)assumed++;
 }
 const rateRecent=score(completedRecent,recent.length),rateOlder=score(completedOlder,older.length);
 const due=scheduled.length,done=completed(scheduled);
 const missing=due-done;
 const realLinked=Math.max(0,linked.length-assumed-unresolved);
 const sufficient=due>=6&&recent.length>=3;
 const suggestions=[];
 if(!sufficient) suggestions.push({kind:'evidence',title:'Build more evidence',text:'Only '+due+' scheduled opportunities have passed in the last 28 complete days. Keep logging before changing this goal based on a trend.'});
 if(sufficient&&rateRecent!==null&&rateOlder!==null&&older.length>=3){
  const delta=rateRecent-rateOlder;
  if(delta>=20)suggestions.push({kind:'positive',title:'Consistency is improving',text:'Completion increased from '+rateOlder+'% to '+rateRecent+'% across the two 14-day periods. Consider keeping the current habit schedule and reviewing again after another two weeks.'});
  if(delta<=-20)suggestions.push({kind:'review',title:'Review your schedule',text:'Completion changed from '+rateOlder+'% to '+rateRecent+'% across the two 14-day periods. Consider whether the chosen repeat interval fits your routine. No automatic schedule change will be made.'});
 }
 if(sufficient&&rateRecent!==null&&rateRecent<50){
  if(done===0)suggestions.push({kind:'evidence',title:'Check whether progress was logged',text:'No completed opportunities are recorded in the past 28 days. Before adjusting this habit, confirm whether activity happened without being logged.'});
  else suggestions.push({kind:'review',title:'Review the commitment size',text:'Your recent recorded completion rate is '+rateRecent+'% ('+completedRecent+'/'+recent.length+' scheduled opportunities). You can review the frequency or goal size if the records reflect your actual routine.'});
 }
 if(sufficient&&rateRecent!==null&&rateRecent>=80)suggestions.push({kind:'positive',title:'Current routine looks sustainable',text:'Your recent completion rate is '+rateRecent+'% ('+completedRecent+'/'+recent.length+' opportunities). Keeping the existing commitment may be more useful than increasing it.'});
 if(!def.matchText)suggestions.push({kind:'action',title:'Connect an activity for better evidence',text:'Add an optional matching phrase in the habit editor to find related finished timers, workouts or routine logs. You still decide whether each match counts.'});
 if((assumed||unresolved)&&linked.length)suggestions.push({kind:'evidence',title:'Check linked evidence quality',text:assumed+' linked check(s) use assumed examples and '+unresolved+' reference missing source records. Treat these as uncertain until reviewed.'});
 if(suggestions.length===0)suggestions.push({kind:'neutral',title:'Continue observing',text:'There is no clear improvement signal from the currently recorded opportunities. Keep your current settings unless you want to change them.'});
 return {def,due,done,missing,rateRecent,rateOlder,completedRecent,recentDue:recent.length,olderDue:older.length,realLinked,assumed,unresolved,suggestions};
}
function render(){
 const root=$('lo34Recommendations');if(!root)return;
 const b=habits(),records=w(),defs=b.habitDefinitions||[],checks=b.habitChecks||[];
 const results=defs.map(d=>evaluate(d,checks,records));
 const totalDue=results.reduce((x,r)=>x+r.due,0),totalDone=results.reduce((x,r)=>x+r.done,0);
 root.innerHTML='<details class="lo34-drawer"><summary>Evidence-based habit recommendations <span>· '+results.length+' habits</span></summary>'+
 '<p class="lo34-note">Suggestions use completed scheduled opportunities from the last 28 complete local days, comparing recent and earlier periods where enough evidence exists. They do not edit routines, increase goals or create calendar events.</p>'+
 '<div class="lo34-evidence-summary"><strong>'+totalDone+' / '+totalDue+'</strong><span>past scheduled opportunities completed across habits</span></div>'+
 (results.length?results.map(r=>{
  const label=esc(r.def.title),status=r.due<6?'Limited evidence':r.rateRecent===null?'No recent opportunities':r.rateRecent+'% recently';
  return '<article class="lo34-habit"><div class="lo34-top"><strong>'+label+'</strong><span>'+status+'</span></div>'+
   '<div class="lo34-stats"><span>Past 28 days: '+r.done+'/'+r.due+'</span><span>Recent: '+r.completedRecent+'/'+r.recentDue+'</span><span>Activity-backed checks: '+r.realLinked+'</span></div>'+
   r.suggestions.map(s=>'<div class="lo34-suggestion '+esc(s.kind)+'"><strong>'+esc(s.title)+'</strong><p>'+esc(s.text)+'</p></div>').join('')+
   '<button type="button" class="btn outline" data-lo34-review="'+esc(r.def.id)+'">Review this habit →</button></article>'
 }).join(''):'<p class="lo34-note">No habit definitions yet. Create one under My Life → Habits; recommendations will become more useful once you have enough recorded opportunities.</p>')+
 '<p class="lo34-note">Habit checks can be self-reported. Missing records are not proof of inactivity. These suggestions are descriptive and must be reviewed by you before taking action.</p></details>';
}
function init(){
 const base=$('lo33HabitInsights');if(!base||$('lo34Recommendations'))return;
 const panel=document.createElement('section');panel.id='lo34Recommendations';panel.className='lo34-panel';base.after(panel);
 panel.addEventListener('click',e=>{
  const el=e.target.closest('[data-lo34-review]');if(!el)return;
  document.querySelector('#lifeosNavigation button[data-view="life"]')?.click();
  setTimeout(()=>document.querySelector('#loLifeSectionTabs [data-lo-life-section="habits"]')?.click(),80);
 });
 render();
 document.addEventListener('click',e=>{if(e.target.closest('#lo32HabitHub,#lifeosNavigation'))setTimeout(render,100)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 setInterval(()=>{if(!document.hidden&&document.body.dataset.lifeosView==='analytics')render()},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.lifeosHabitRecommendationsV34={evaluate,render};
})();