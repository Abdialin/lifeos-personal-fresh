/* LifeOS Personal — visual, read-only prediction review. No storage or network side effects. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LifeOSPredictionVisuals=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MIN=60000;
function dayStart(t){const d=new Date(t);d.setHours(0,0,0,0);return d}
function safeText(el,text){el.textContent=String(text)}
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)safeText(node,text);return node}
function time(t){return new Date(t).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}
function dayLabel(t){return new Date(t).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'})}
function duration(ms){return (ms/3600000).toFixed(1)+' h'}
function rowsByDay(entries,from,days=7){
 const rows=[];
 for(let i=0;i<days;i++){const start=dayStart(from);start.setDate(start.getDate()+i);const end=new Date(start);end.setDate(end.getDate()+1);rows.push({start:start.getTime(),end:end.getTime(),entries:[]})}
 for(const entry of entries||[]){
  if(!Number.isFinite(entry.startAt)||!Number.isFinite(entry.endAt)||entry.endAt<=entry.startAt)continue;
  const row=rows.find(r=>entry.startAt>=r.start&&entry.startAt<r.end);if(row)row.entries.push(entry)
 }
 for(const row of rows)row.entries.sort((a,b)=>a.startAt-b.startAt);
 return rows;
}
function historicalTotals(sessions,anchor,days=14){
 const rows=[];const d=dayStart(anchor);
 for(let back=days;back>=1;back--){const a=new Date(d);a.setDate(a.getDate()-back);const b=new Date(a);b.setDate(b.getDate()+1);let ms=0;
  for(const s of sessions||[])for(const g of s.segments||[]){
   const start=Math.max(a.getTime(),Number(g.start));
   const stop=Math.min(b.getTime(),g.end==null?anchor:Number(g.end));
   if(Number.isFinite(start)&&Number.isFinite(stop)&&stop>start)ms+=stop-start;
  }
  rows.push({date:a.getTime(),ms});
 }
 return rows;
}
function render(target,{sessions=[],suggestions=[],confirmed=[],from=Date.now(),demo=false,observedDays=0,mode='predicted'}={}){
 if(!target)throw Error('Missing prediction visualization target');
 target.replaceChildren();
 const heading=el('div','lo-predviz-heading');
 heading.append(el('h3','',mode==='ideal'?'My Ideal Week':'My Predicted Week'));
 heading.append(el('span','lo-predviz-badge','UNCONFIRMED SUGGESTIONS'));
 target.append(heading);
 target.append(el('p','lo-predviz-help',mode==='ideal'?'Your preferred routines are aspirations, not confirmed appointments. No schedule changes are made.':'Pattern-based routine suggestions are not booked activities. Missing logs never imply availability. No schedule changes are made.'));
 const calendar=el('div','lo-predviz-week');calendar.setAttribute('aria-label','Seven-day prediction calendar');
 const suggestionEntries=suggestions.map(p=>({...p,kind:'suggestion'}));
 const confirmedEntries=confirmed.map(p=>({...p,kind:'confirmed'}));
 const rows=rowsByDay([...suggestionEntries,...confirmedEntries],from);
 for(const day of rows){
  const column=el('div','lo-predviz-day');
  column.append(el('div','lo-predviz-day-head',dayLabel(day.start)));
  if(!day.entries.length)column.append(el('div','lo-predviz-empty','No suggested routine'));
  for(const entry of day.entries){
   const card=el('div','lo-predviz-event '+(entry.kind==='confirmed'?'is-confirmed':'is-proposed'));
   card.append(el('span','lo-predviz-time',time(entry.startAt)+'–'+time(entry.endAt)));
   card.append(el('strong','',entry.name||'Activity'));
   card.append(el('small','',entry.kind==='confirmed'?'Confirmed plan':(entry.conflicts?.length?'Review conflicts · ':'')+(mode==='ideal'?'Ideal preference':'Suggested · '+(entry.observations||0)+' repeats')));
   column.append(card);
  }
  calendar.append(column);
 }
 target.append(calendar);
 const split=el('div','lo-predviz-charts');
 const totals=historicalTotals(sessions,from,14);
 const max=Math.max(1,...totals.map(r=>r.ms));
 const chart=el('section','lo-predviz-chart');chart.append(el('h4','','History · last 14 days'));
 chart.append(el('p','lo-predviz-help','Activity hours in this workspace (may include imported development samples)'));
 const bars=el('div','lo-predviz-bars');bars.setAttribute('role','img');bars.setAttribute('aria-label','Daily hours recorded over the previous 14 days');
 for(const item of totals){const col=el('div','lo-predviz-bar-col');const track=el('div','lo-predviz-track');const bar=el('div','lo-predviz-bar');bar.style.height=Math.max(1,Math.round(item.ms/max*100))+'%';bar.title=dayLabel(item.date)+': '+duration(item.ms);track.append(bar);col.append(track,el('span','',new Date(item.date).getDate()));bars.append(col)}
 chart.append(bars);
 const distribution=el('section','lo-predviz-chart');distribution.append(el('h4','','Most common activities'));
 const names=new Map();for(const s of sessions)for(const g of s.segments||[]){if(!Number.isFinite(Number(g.start))||!Number.isFinite(Number(g.end))||g.end<=g.start)continue;names.set(s.name,(names.get(s.name)||0)+(g.end-g.start))}
 const ranked=[...names].sort((a,b)=>b[1]-a[1]).slice(0,5),largest=Math.max(1,...ranked.map(r=>r[1]));
 if(!ranked.length)distribution.append(el('p','lo-predviz-help','No historical activity records available.'));
 for(const [name,ms] of ranked){const line=el('div','lo-predviz-mix-row');line.append(el('span','',name));const track=el('div','lo-predviz-mix-track');const fill=el('div','lo-predviz-mix-fill');fill.style.width=Math.round(ms/largest*100)+'%';track.append(fill);line.append(track,el('b','',duration(ms)));distribution.append(line)}
 split.append(chart,distribution);target.append(split);
 const foot=el('p','lo-predviz-summary',(mode==='ideal'?suggestions.length+' ideal routine blocks · preferences, not confirmed plans.':observedDays+' observed days · '+suggestions.length+' unconfirmed suggestions · '+confirmed.length+' existing plans. Development records are labeled internally.'));
 target.append(foot);
 return {days:rows.length,suggestions:suggestions.length,confirmed:confirmed.length,historicalDays:totals.length};
}
return {render,rowsByDay,historicalTotals};
});