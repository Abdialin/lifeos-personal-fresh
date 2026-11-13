/* LifeOS V33: evidence-based habit progress in Insights; read-only analysis. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const local=t=>{const d=new Date(t);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const dateTime=s=>new Date(s+'T12:00:00').getTime();
function dates(def,lookback=28){
 const begin=def.startDate||local(def.createdAt||Date.now()),today=local(Date.now());
 const every=Number(def.everyDays)||1,first=new Date();first.setHours(12,0,0,0);first.setDate(first.getDate()-lookback+1);
 const out=[];
 for(let i=0;i<lookback;i++){
  const d=new Date(first);d.setDate(d.getDate()+i);const day=local(d.getTime());
  if(day<begin||day>today)continue;
  const diff=Math.round((dateTime(day)-dateTime(begin))/86400000);
  if(diff>=0&&diff%every===0)out.push(day);
 }
 return out;
}
function analyze(def,checks,w){
 const days=dates(def),today=local(Date.now());
 const done=checks.filter(c=>c.habitId===def.id&&c.done);
 const byDay=new Map(done.map(c=>[c.date,c]));
 const finished=days.filter(x=>byDay.has(x)),past=days.filter(x=>x<today);
 const pastCount=past.filter(x=>byDay.has(x)).length;
 const linked=finished.filter(d=>byDay.get(d).checkSource==='linked-evidence');
 const assumed=linked.filter(d=>byDay.get(d).evidenceSimulated);
 let missingEvidence=0;
 for(const d of linked){
  const c=byDay.get(d);
  const list=c.evidenceType==='session'?w.sessions:c.evidenceType==='personalLog'?w.personalLogs:c.evidenceType==='workout'?w.workouts:[];
  if(!(list||[]).some(x=>x.id===c.evidenceSourceId))missingEvidence++;
 }
 return {days,finished,byDay,past,pastCount,linked:linked.length,assumed:assumed.length,missingEvidence,
   rate:past.length?Math.round(100*pastCount/past.length):null};
}
function render(){
 const root=$('lo33HabitInsights'),b=window.lifeosSocialHabitBridge?.read(),w=window.lifeosReadOnlyWorkspace?.();
 if(!root||!b||!w)return;
 const defs=(b.habitDefinitions||[]),checks=b.habitChecks||[],stats=defs.map(d=>({def:d,...analyze(d,checks,w)}));
 const due=stats.reduce((sum,x)=>sum+x.past.length,0),done=stats.reduce((sum,x)=>sum+x.pastCount,0);
 const unlinked=stats.reduce((sum,x)=>sum+x.missingEvidence,0),verified=stats.reduce((sum,x)=>sum+x.linked-x.assumed-x.missingEvidence,0);
 root.innerHTML='<div class="lo33-heading"><h3>Habit consistency & evidence</h3><p>Analyze commitments without duplicating tracked time. Any link to an activity is explicitly approved.</p></div>'+
 '<div class="lo33-insight-stats">'+
 '<div><small>Habits</small><strong>'+defs.length+'</strong></div>'+
 '<div><small>Past opportunities</small><strong>'+due+'</strong></div>'+
 '<div><small>Past completions</small><strong>'+done+'</strong></div>'+
 '<div><small>Consistency</small><strong>'+(due?Math.round(done/due*100)+'%':'Not enough data')+'</strong></div></div>'+
 (stats.length?stats.map(x=>{
  const pct=x.rate;
  const title=esc(x.def.title);
  const note=x.linked+' linked checks'+(x.assumed?' · '+x.assumed+' assumed examples':'')+(x.missingEvidence?' · '+x.missingEvidence+' missing linked sources':'');
  return '<div class="lo33-insight-habit"><div><strong>'+title+'</strong><span>'+x.pastCount+'/'+x.past.length+' past scheduled days</span></div>'+
   '<div class="lo33-insight-track"><i style="width:'+(pct??0)+'%"></i></div>'+
   '<small>'+(pct===null?'Not enough past opportunities':pct+'% past consistency')+' · '+note+'</small></div>';
 }).join(''):'<p class="lo33-insight-muted">No habits recorded. Create a habit under My Life → Habits to see its progress here.</p>')+
 '<p class="lo33-insight-muted">Evidence links without assumed or missing sources: '+Math.max(0,verified)+'.'+
 (unlinked?' '+unlinked+' linked source record(s) no longer exist.':'')+
 ' Past-day consistency excludes today until the day is complete. Results are descriptive, not a prediction or personal evaluation.</p>'+
 '<button class="btn outline" type="button" id="lo33GoHabits">Open Habits →</button>';
}
function init(){
 const panel=$('analyticsPanel');if(!panel||$('lo33HabitInsights'))return;
 const el=document.createElement('section');el.id='lo33HabitInsights';el.className='lo33-insights';
 panel.append(el);
 el.addEventListener('click',e=>{
  if(e.target.closest('#lo33GoHabits')){
   document.querySelector('#lifeosNavigation button[data-view="life"]')?.click();
   setTimeout(()=>document.querySelector('#loLifeSectionTabs button[data-lo-life-section="habits"]')?.click(),70);
  }
 });
 render();
 document.addEventListener('click',e=>{if(e.target.closest('#lifeosNavigation,#lo32HabitHub'))setTimeout(render,100)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 setInterval(()=>{if(!document.hidden&&document.body.dataset.lifeosView==='analytics')render()},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();