/* LifeOS Personal V54 — 24-hour reality vs plan timeline, read-only. */
(function(root){
'use strict';
const KEY='lifeos-live-v1',GAP_MS=45*60000;
const safeNum=x=>typeof x==='number'&&Number.isFinite(x);
function bounds(day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return null;const start=new Date(day+'T00:00:00');if(!Number.isFinite(start.getTime())||start.getFullYear()!==Number(day.slice(0,4))||start.getMonth()+1!==Number(day.slice(5,7))||start.getDate()!==Number(day.slice(8,10)))return null;const end=new Date(start);end.setDate(end.getDate()+1);return [start.getTime(),end.getTime()]}
function clip(a,b,l,r){return safeNum(a)&&safeNum(b)&&b>a&&b>l&&a<r?[Math.max(a,l),Math.min(b,r)]:null}
function merge(intervals){const sorted=intervals.filter(x=>Array.isArray(x)&&x[1]>x[0]).sort((a,b)=>a[0]-b[0]);const out=[];for(const [a,b] of sorted){const last=out[out.length-1];if(last&&a<=last[1])last[1]=Math.max(last[1],b);else out.push([a,b])}return out}
function length(intervals){return merge(intervals).reduce((sum,[a,b])=>sum+(b-a),0)}
function gaps(occupied,start,end,min=GAP_MS){if(end<=start)return [];let cursor=start,out=[];for(const [a,b] of merge(occupied)){if(a>cursor&&a-cursor>=min)out.push([cursor,a]);cursor=Math.max(cursor,b)}if(end>cursor&&end-cursor>=min)out.push([cursor,end]);return out}
function classify(s){if(s?.source==='development-starter'||s?.source==='assumed-demo'||s?.seedBatch)return 'sample';if(s?.source==='historical-import'||s?.source==='import'||s?.importedAt||String(s?.precision||'').startsWith('retrospective'))return 'historical';return 'tracked'}
function build(workspace,day,now=Date.now()){
 const b=bounds(day);if(!b)return {error:'Invalid date',records:[],plans:[],gaps:[],stats:{}};
 const [start,end]=b,cutoff=Math.max(start,Math.min(end,now));
 const records=[],plans=[];
 const sessions=Array.isArray(workspace?.sessions)?workspace.sessions:[];
 for(const s of sessions){if(!s||!Array.isArray(s.segments))continue;const origin=classify(s);for(let i=0;i<s.segments.length;i++){const seg=s.segments[i];if(!seg||!safeNum(seg.start))continue;const interval=clip(seg.start,safeNum(seg.end)?seg.end:Math.max(seg.start,now),start,end);if(!interval)continue;records.push({key:String(s.id||'activity')+':'+i,name:String(s.name||'Activity'),start:interval[0],end:interval[1],origin,status:String(s.status||'finished')});}}
 for(const p of Array.isArray(workspace?.schedule)?workspace.schedule:[]){if(!p||p.status==='skipped')continue;const interval=clip(p.startAt,p.endAt,start,end);if(!interval)continue;plans.push({key:String(p.id||'plan'),name:String(p.name||'Planned activity'),start:interval[0],end:interval[1],linkedSessionId:p.sessionId||null});}
 const verified=records.filter(r=>r.origin!=='sample'&&r.start<cutoff).map(r=>[r.start,Math.min(r.end,cutoff)]).filter(x=>x[1]>x[0]);
 const occupied=merge(verified);
 const gapsFound=gaps(occupied,start,cutoff);
 const overlaps=[];for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){const a=records[i],c=records[j];if(a.origin==='sample'||c.origin==='sample')continue;const o=clip(a.start,a.end,c.start,c.end);if(o)overlaps.push({left:a.key,right:c.key,minutes:Math.ceil((o[1]-o[0])/60000)});}
 return {error:null,start,end,cutoff,records,plans,gaps:gapsFound,overlaps,stats:{observedMs:length(occupied),plannedMs:length(plans.map(p=>[p.start,p.end])),unloggedMs:length(gapsFound),dayMs:end-start,recordCount:new Set(records.filter(r=>r.origin!=='sample').map(r=>r.key.split(':')[0])).size,exampleCount:records.filter(r=>r.origin==='sample').length}};
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmt(ms){const n=Math.floor(ms/60000);return Math.floor(n/60)+'h '+String(n%60).padStart(2,'0')+'m'}
function render(host,workspace,day,now){
 const x=build(workspace,day,now),stats=host.querySelector('[data-v54-stats]'),tracks=host.querySelector('[data-v54-tracks]'),message=host.querySelector('[data-v54-note]');if(!stats||!tracks||!message)return;
 if(x.error){stats.textContent=x.error;tracks.replaceChildren();return;}
 stats.textContent='Recorded '+fmt(x.stats.observedMs)+' · Planned '+fmt(x.stats.plannedMs)+' · Unlogged gaps ≥45m '+fmt(x.stats.unloggedMs)+' · Parallel overlaps '+x.overlaps.length;
 const horizon=x.end-x.start;
 const row=(title,entries,kind)=>'<div class="lo54-track"><strong>'+title+'</strong><div class="lo54-lane" role="list" aria-label="'+title+'">'+entries.map(e=>{const left=(e.start-x.start)/horizon*100,width=(e.end-e.start)/horizon*100;return '<span class="lo54-block lo54-'+kind+(e.origin==='historical'?' lo54-historical':e.origin==='sample'?' lo54-sample':'')+'" style="left:'+left.toFixed(4)+'%;width:'+width.toFixed(4)+'%" role="listitem" title="'+esc(e.name||'Unlogged · unknown')+'"></span>'}).join('')+'</div></div>';
 const parts=[row('Actual records',x.records.filter(e=>e.origin!=='sample'),'actual'),row('Plans',x.plans,'plan'),row('Unlogged ≥45m',x.gaps.map(([a,b])=>({start:a,end:b,name:'No activity recorded (unknown)'})),'gap')];
 tracks.innerHTML='<div class="lo54-clock"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00*</span></div>'+parts.join('')+'<p class="lo54-legend"><span>■ Actual</span><span>▧ Historical</span><span>■ Planned</span><span>░ Unlogged</span></p>';
 message.textContent='Unlogged means no verified activity record; it does not mean free time or inactivity. Development examples are excluded. Overlapping activities count once in recorded totals. For the current day, gaps are measured only up to the present time. *On daylight-saving transition dates, the day may contain 23 or 25 hours; the axis represents the full local calendar day.';
}
function mount(){
 const host=document.getElementById('lo53-unified');if(!host||document.getElementById('lo54-timeline'))return;
 const section=document.createElement('section');section.id='lo54-timeline';section.className='lo54-timeline';section.innerHTML='<h3>24-hour timeline · Reality / Plan</h3><p class="sub">Read-only view of recorded intervals, calendar plans and gaps in the record.</p><p data-v54-stats class="lo54-stats" role="status"></p><div data-v54-tracks></div><p data-v54-note class="sub"></p>';host.appendChild(section);
 const picker=host.querySelector('#lo53-date');
 const update=()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||'null');render(section,d,picker?.value||'',Date.now())}catch{section.querySelector('[data-v54-stats]').textContent='Unable to read activity records safely.'}};
 picker?.addEventListener('change',update);window.addEventListener('lifeos-v65-plan-committed',update);window.addEventListener('storage',e=>{if(e.key===KEY)update()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});update();setInterval(()=>{if(!document.hidden)update()},15000);
}
const api={bounds,clip,merge,length,gaps,classify,build};
if(typeof window!=='undefined')window.LifeOSActivityTimelineV54=api;
if(typeof module==='object'&&module.exports)module.exports=api;
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();}
})(typeof window!=='undefined'?window:globalThis);
