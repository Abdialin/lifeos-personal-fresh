/* LifeOS Unified Analytics v0.2: pure, read-only interval calculations. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSUnifiedAnalytics=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ms=x=>typeof x==='number'&&Number.isFinite(x)?x:(typeof x==='string'&&x.trim()?(Number.isFinite(Number(x))?Number(x):Date.parse(x)):NaN);
const good=x=>Number.isFinite(x);
function intervals(session,now){
 if(!session||typeof session!=='object')return [];
 const name=String(session.name||session.activity||session.label||'Activity'),id=session.id||null;
 if(Array.isArray(session.segments))return session.segments.flatMap(s=>{
  if(!s||typeof s!=='object')return [];
  const a=ms(s.start??s.startAt),b=s.end==null&&s.endAt==null&&session.status==='running'?now:ms(s.end??s.endAt);
  return good(a)&&good(b)&&b>a?[{start:a,end:b,name,id}]:[];
 });
 const a=ms(session.startAt??session.start??session.startedAt),b=ms(session.endAt??session.end??session.endedAt);
 return good(a)&&good(b)&&b>a?[{start:a,end:b,name,id}]:[];
}
function planIntervals(p){
 if(!p||p.status==='skipped')return [];
 const a=ms(p.startAt??p.start),b=ms(p.endAt??p.end);
 return good(a)&&good(b)&&b>a?[{start:a,end:b,name:String(p.name||'Plan'),id:p.id||null}]:[];
}
function unionDuration(xs){
 const sorted=xs.filter(x=>good(x.start)&&good(x.end)&&x.end>x.start).slice().sort((a,b)=>a.start-b.start);
 let total=0,last=-Infinity;
 for(const x of sorted){if(x.end>last){total+=x.end-Math.max(x.start,last);last=x.end;}}
 return total;
}
function summarize(workspace,{start,end,now=Date.now()}={}){
 if(!good(start)||!good(end)||end<=start||!good(now))throw new RangeError('Invalid analytics time window');
 const clip=x=>{const a=Math.max(x.start,start),b=Math.min(x.end,end);return b>a?{...x,start:a,end:b}:null;};
 const recorded=(Array.isArray(workspace?.sessions)?workspace.sessions:[]).flatMap(s=>intervals(s,now)).map(clip).filter(Boolean);
 const planned=(Array.isArray(workspace?.schedule)?workspace.schedule:[]).flatMap(planIntervals).map(clip).filter(Boolean);
 const summedRecordedMs=recorded.reduce((n,x)=>n+x.end-x.start,0),uniqueRecordedMs=unionDuration(recorded);
 const summedPlannedMs=planned.reduce((n,x)=>n+x.end-x.start,0);
 return {start,end,now,recorded,planned,summedRecordedMs,uniqueRecordedMs,overlapRecordedMs:summedRecordedMs-uniqueRecordedMs,summedPlannedMs,uniquePlannedMs:unionDuration(planned)};
}
function localDayBounds(year,month,day){return {start:new Date(year,month-1,day).getTime(),end:new Date(year,month-1,day+1).getTime()};}
function daily(workspace,{year,month,day,now=Date.now()}){return summarize(workspace,{...localDayBounds(year,month,day),now});}
return Object.freeze({summarize,daily,localDayBounds,unionDuration,sessionIntervals:intervals});
});
