/* Batch I: read-only, local-day analytics. No writes or inferred free time. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LifeOSQuality=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
function compute(workspace,start,end,at=Date.now(),gapThreshold=45*60000){
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw Error('Invalid analytics window');
 const parts=[],sources={measured:0,estimated:0,unknown:0};
 for(const s of workspace.sessions||[]){if(s.status==='deleted')continue;const precision=['measured','exact'].includes(s.precision)?'measured':['approximate','estimated'].includes(s.precision)?'estimated':'unknown';for(const g of s.segments||[]){const a=Math.max(start,Number(g.start)),b=Math.min(end,at,g.end==null?at:Number(g.end));if(Number.isFinite(a)&&Number.isFinite(b)&&b>a){parts.push({a,b,precision,name:s.name||'Activity'});sources[precision]+=b-a;}}}
 parts.sort((a,b)=>a.a-b.a||a.b-b.b);const merged=[];let total=0;for(const p of parts){total+=p.b-p.a;const last=merged[merged.length-1];if(last&&p.a<=last.b)last.b=Math.max(last.b,p.b);else merged.push({a:p.a,b:p.b});}
 const unique=merged.reduce((v,p)=>v+p.b-p.a,0);const gaps=[];let cursor=start;const limit=Math.min(end,at);for(const p of merged){if(p.a>cursor&&p.a-cursor>=gapThreshold)gaps.push({start:cursor,end:p.a,ms:p.a-cursor});cursor=Math.max(cursor,p.b);}if(limit>cursor&&limit-cursor>=gapThreshold)gaps.push({start:cursor,end:limit,ms:limit-cursor});
 const plans=(workspace.schedule||[]).filter(p=>{const a=Date.parse(p.startAt||p.start||'');const b=Date.parse(p.endAt||p.end||'');return Number.isFinite(a)&&Number.isFinite(b)&&b>start&&a<end;}).length;
 return {totalMs:total,uniqueMs:unique,overlapMs:total-unique,precisionMs:sources,unloggedGaps:gaps,unloggedMs:gaps.reduce((v,g)=>v+g.ms,0),plannedCount:plans,sessionSegments:parts.length,limitations:['Unlogged time is unknown, not free time','Precision totals count overlaps and must not be added to unique time','Planned activities are not proof of actual activity']};
}
function localDayBounds(day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Invalid date');const [y,m,d]=day.split('-').map(Number),a=new Date(y,m-1,d),b=new Date(y,m-1,d+1);if(a.getFullYear()!==y||a.getMonth()!==m-1||a.getDate()!==d)throw Error('Invalid date');return [a.getTime(),b.getTime()];}
return {compute,localDayBounds};
});
