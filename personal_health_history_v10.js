/* LifeOS Personal V10: complete workout/meal history + body goal and measurements.
   Read-only rendering; mutations use the existing app's save functions and offline journal. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
let selectedMonth=null;
function localDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(String(s||''))?s:null}
function human(s,weekday=false){
 if(!localDate(s))return 'Unknown date';
 return new Date(s+'T12:00:00').toLocaleDateString(undefined,weekday?{weekday:'long',month:'short',day:'numeric'}:{month:'short',day:'numeric'});
}
function isoWeek(s){
 const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+3-(d.getDay()+6)%7);
 const year=d.getFullYear(),anchor=new Date(year,0,4,12);
 return {year,number:1+Math.round(((d-anchor)/86400000-3+(anchor.getDay()+6)%7)/7)};
}
function duration(v){const n=Number(v);return Number.isFinite(n)&&n>=0?Math.round(n)+' min':'Duration unknown'}
function history(rows,id,kind){
 const root=$(id);if(!root)return;
 const buckets=new Map(),ordered=rows.filter(x=>localDate(x.date)).slice().sort((a,b)=>b.date.localeCompare(a.date)||(Number(b.createdAt)||0)-(Number(a.createdAt)||0));
 for(const entry of ordered){
  const d=isoWeek(entry.date),key=d.year+'-'+String(d.number).padStart(2,'0');
  if(!buckets.has(key))buckets.set(key,{week:d,days:new Map()});
  const bucket=buckets.get(key);
  if(!bucket.days.has(entry.date))bucket.days.set(entry.date,[]);
  bucket.days.get(entry.date).push(entry);
 }
 const content=[...buckets].map(([key,week],index)=>{
  const count=[...week.days.values()].reduce((n,x)=>n+x.length,0);
  const days=[...week.days].map(([date,entries],j)=>{
   const detail=entries.map(item=>{
    const workout=kind==='workout',sample=!!item.seedBatch||item.source==='development-starter'||/development starter|sample data|\(sample\)/i.test((item.details||'')+' '+(item.name||''));
    const title=workout?(item.type||'Workout'):(item.name||'Meal');
    const info=workout?[
     item.minutes!=null?duration(item.minutes):null,
     item.sessionId?'Linked timer':null,
     item.intensity||null,
     item.distanceKm!=null?item.distanceKm+' km':null
    ]:[item.calories!=null?item.calories+' kcal':'Calories unknown',item.proteinGrams!=null?item.proteinGrams+' g protein':null];
    const notes=workout?(item.details||''):(item.description||'');
    return '<article class="lo10-entry"><div class="lo10-entry-content"><strong>'+esc(title)+'</strong><div class="lo10-entry-meta">'+esc(info.filter(Boolean).join(' · '))+'</div>'+(notes?'<div class="lo10-note">'+esc(notes)+'</div>':'')+(sample?'<span class="lo10-sample">Development example</span>':'')+'</div><button type="button" class="btn outline tiny lo10-delete" data-delete="'+esc(item.id)+'" aria-label="Delete '+esc(title)+'">Delete</button></article>';
   }).join('');
   return '<details class="lo10-day" '+(index===0&&j===0?'open':'')+'><summary><span>'+esc(human(date,true))+'</span><small>'+entries.length+' '+(entries.length===1?'entry':'entries')+'</small></summary>'+detail+'</details>';
  }).join('');
  return '<details class="lo10-week" '+(index===0?'open':'')+'><summary><strong>Week '+week.week.number+' · '+week.week.year+'</strong><small>'+count+' '+(kind==='workout'?'workouts':'meals')+' · '+week.days.size+' days</small></summary>'+days+'</details>';
 }).join('');
 root.innerHTML=ordered.length?'<div class="lo10-history-header"><strong>'+ordered.length+' saved '+(kind==='workout'?'workouts':'meals')+'</strong><span>Grouped by week and day</span></div>'+content:'<div class="empty">No '+(kind==='workout'?'workouts':'meals')+' logged yet.</div>';
}
function number(v){return v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null}
function format(v,suffix=''){return v===null?'Not recorded':(Math.round(v*10)/10).toFixed(1)+suffix}
function dateDays(a,b){if(!localDate(a)||!localDate(b))return null;return Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000)}
function svgTrend(rows){
 const data=rows.filter(x=>number(x.weightKg)!==null);
 if(!data.length)return '<p class="lo10-muted">Add a weight measurement to see a trend.</p>';
 const width=600,height=210,left=42,right=16,top=20,bottom=33;
 const values=data.map(x=>number(x.weightKg)),lo=Math.min(...values),hi=Math.max(...values);
 const lower=lo-(lo===hi?1:Math.max(.5,(hi-lo)*.17)),upper=hi+(lo===hi?1:Math.max(.5,(hi-lo)*.17));
 const xx=i=>left+(data.length===1?(width-left-right)/2:i*(width-left-right)/(data.length-1));
 const yy=v=>top+(upper-v)/(upper-lower)*(height-top-bottom);
 const p=data.map((x,i)=>xx(i).toFixed(1)+','+yy(number(x.weightKg)).toFixed(1)).join(' ');
 const h='<svg role="img" aria-label="Weight measurements over time, '+data.length+' entries, ranging from '+format(lo,' kg')+' to '+format(hi,' kg')+'" viewBox="0 0 '+width+' '+height+'" class="lo10-chart"><title>Recorded body-weight trend</title>'+
 [0,.5,1].map(fr=>{const y=top+(height-top-bottom)*fr,weight=upper-fr*(upper-lower);return '<line x1="'+left+'" x2="'+(width-right)+'" y1="'+y+'" y2="'+y+'" class="lo10-grid"/><text x="'+(left-7)+'" y="'+(y+4)+'" text-anchor="end" class="lo10-axis">'+esc(weight.toFixed(1))+'</text>'}).join('')+
 (data.length>1?'<polyline points="'+p+'" class="lo10-line"/>':'')+
 data.map((x,i)=>'<circle cx="'+xx(i)+'" cy="'+yy(number(x.weightKg))+'" r="4.5" class="lo10-dot"><title>'+esc(human(x.date))+' · '+esc(format(number(x.weightKg),' kg'))+'</title></circle>').join('')+
 '<text x="'+left+'" y="'+(height-8)+'" class="lo10-axis">'+esc(human(data[0].date))+'</text>'+
 '<text x="'+(width-right)+'" y="'+(height-8)+'" text-anchor="end" class="lo10-axis">'+esc(human(data[data.length-1].date))+'</text></svg>';
 return h;
}
function goalBox(goal,all){
 if(!goal)return '<div class="lo10-goal-empty">No weight goal set. You can create one with your own starting weight, target and deadline.</div>';
 const start=number(goal.startWeightKg),target=number(goal.targetWeightKg);
 const latest=all.filter(x=>number(x.weightKg)!==null&&x.date>=goal.startDate).at(-1),current=latest?number(latest.weightKg):null;
 const needed=target-start,change=current===null?null:current-start;
 const pct=current===null?null:Math.max(0,Math.min(100,100*change/needed));
 const daysTotal=dateDays(goal.startDate,goal.targetDate),daysLeft=dateDays(new Date().toLocaleDateString('sv-SE'),goal.targetDate);
 const remaining=current===null?null:Math.abs(target-current);
 return '<div class="lo10-goal"><div class="lo10-goal-line"><span><b>'+esc(format(start,' kg'))+'</b><small>Starting</small></span><span aria-hidden="true">→</span><span><b>'+esc(format(target,' kg'))+'</b><small>Target</small></span></div>'+
 '<div class="lo10-goal-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+(pct===null?0:Math.round(pct))+'" aria-label="Weight goal progress"><i style="width:'+(pct===null?0:pct).toFixed(1)+'%"></i></div>'+
 '<div class="lo10-goal-stats"><div><b>'+(pct===null?'Unknown':Math.round(pct)+'%')+'</b><small>Progress</small></div><div><b>'+esc(remaining===null?'No update':format(remaining,' kg'))+'</b><small>Distance to target</small></div><div><b>'+esc(daysLeft===null?'—':daysLeft>=0?daysLeft+' days':Math.abs(daysLeft)+' days past')+'</b><small>Until deadline</small></div></div>'+
 '<p class="lo10-muted">Goal period: '+esc(human(goal.startDate))+' – '+esc(human(goal.targetDate))+' ('+daysTotal+' days). '+(latest?'Latest progress reading: '+esc(human(latest.date)):'Add a new weight measurement to calculate progress.')+' This chart describes recorded measurements, not a recommended rate of change.</p></div>';
}
function renderGoalConnection(goal,rows){
 const goals=$('goalList');if(!goals)return;
 let card=$('loBodyGoalInGoals');
 if(!card){card=document.createElement('section');card.id='loBodyGoalInGoals';card.className='lo10-goal-connection';goals.before(card)}
 if(!goal){card.hidden=true;card.replaceChildren();return}
 card.hidden=false;
 const current=rows.filter(x=>number(x.weightKg)!==null&&x.date>=goal.startDate).slice().sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
 const pct=current?Math.max(0,Math.min(100,100*(number(current.weightKg)-goal.startWeightKg)/(goal.targetWeightKg-goal.startWeightKg))):null;
 card.innerHTML='<div class="lo10-history-header"><strong>Body-weight goal</strong><span>Linked to Fitness progress</span></div><p class="lo10-muted">From '+esc(format(number(goal.startWeightKg),' kg'))+' to '+esc(format(number(goal.targetWeightKg),' kg'))+' by '+esc(human(goal.targetDate))+'. Current progress: '+(pct===null?'awaiting a measurement':Math.round(pct)+'%')+'.</p>'+
 '<div class="lo10-goal-track"><i style="width:'+(pct===null?0:pct).toFixed(1)+'%"></i></div><p class="lo10-muted">This is a personal measurement goal; workout sessions are counted separately, not as weight loss.</p>';
}
function renderBody(rows,goal){
 const root=$('loBodyProgress');if(!root)return;
 const ordered=rows.filter(x=>localDate(x.date)).slice().sort((a,b)=>a.date.localeCompare(b.date)||(a.createdAt||0)-(b.createdAt||0));
 renderGoalConnection(goal,ordered);
 const months=[...new Set(ordered.map(x=>x.date.slice(0,7)))].sort().reverse();
 if(!selectedMonth||!months.includes(selectedMonth))selectedMonth=months[0]||new Date().toLocaleDateString('sv-SE').slice(0,7);
 const monthly=ordered.filter(x=>x.date.startsWith(selectedMonth));
 const options=months.length?months.map(m=>'<option value="'+esc(m)+'" '+(m===selectedMonth?'selected':'')+'>'+esc(new Date(m+'-01T12:00:00').toLocaleDateString(undefined,{month:'long',year:'numeric'}))+'</option>').join(''):'<option value="'+esc(selectedMonth)+'">'+esc(selectedMonth)+'</option>';
 const rowsHTML=monthly.slice().reverse().map(x=>'<tr><td>'+esc(human(x.date))+'</td><td>'+esc(format(number(x.weightKg)))+'</td><td>'+esc(format(number(x.bodyFatPct)))+'</td><td>'+esc(format(number(x.waistCm)))+'</td></tr>').join('');
 const weighted=ordered.filter(x=>number(x.weightKg)!==null),latest=weighted.at(-1);
 root.innerHTML='<div class="lo10-body-header"><div><h3>Body measurements & progress</h3><p class="lo10-muted">'+ordered.length+' recorded measurements · optional and private</p></div><span class="lo10-body-last">'+(latest?'Latest: '+esc(format(number(latest.weightKg),' kg')):'No weight recorded')+'</span></div>'+
 goalBox(goal,ordered)+
 '<label class="sub" for="loBodyMonth">View month</label><select id="loBodyMonth" class="field">'+options+'</select>'+
 '<div class="lo10-chart-wrap"><h4>Weight trend · '+esc(selectedMonth)+'</h4>'+svgTrend(monthly)+'</div>'+
 '<div class="lo10-table-wrap"><table class="lo10-table"><caption>All '+monthly.length+' measurements in selected month</caption><thead><tr><th>Date</th><th>Weight (kg)</th><th>Body fat (%)</th><th>Waist (cm)</th></tr></thead><tbody>'+(rowsHTML||'<tr><td colspan="4">No measurements for this month.</td></tr>')+'</tbody></table></div>';
 const picker=$('loBodyMonth');if(picker)picker.addEventListener('change',()=>{selectedMonth=picker.value;renderBody(rows,goal)});
 const gd=$('loGoalStartDate'),gw=$('loGoalStartWeight'),td=$('loGoalTargetWeight'),ed=$('loGoalEndDate');
 if(gd&&goal&&!gd.value){gd.value=goal.startDate;gw.value=goal.startWeightKg;td.value=goal.targetWeightKg;ed.value=goal.targetDate}
}
function render(workouts,meals){history(workouts,'fitnessList','workout');history(meals,'mealList','meal');const snap=window.lifeosReadOnlyWorkspace?.();renderBody(snap?.bodyMetrics||[],snap?.bodyGoal||null)}
window.lifeosHealthHistoryV10={render,renderBody};
function init(){const snap=window.lifeosReadOnlyWorkspace?.();if(snap)render(snap.workouts||[],snap.meals||[])}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();