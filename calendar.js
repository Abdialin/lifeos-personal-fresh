(()=>{'use strict';
const STORE='lifeos-stage23-calendar-v1', LIFE='lifeos-live-v1', HANDOFF='lifeos-stage27-plan-handoff-v1';
const el=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function decode(s){return String(s||'').replace(/\\n/gi,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\')}
function timeValue(value,params=''){
 if(/TZID=/i.test(params))throw Error('TZID requires timezone-aware expansion');
 if(/^\d{8}$/.test(value)){const y=+value.slice(0,4),m=+value.slice(4,6),d=+value.slice(6,8);const ms=new Date(y,m-1,d).getTime();if(new Date(ms).getFullYear()!==y||new Date(ms).getMonth()!==m-1||new Date(ms).getDate()!==d)throw Error('Invalid date');return ms;}
 const match=/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(value);
 if(!match)throw Error('Unsupported date format');const [,y,m,d,h,min,sec,z]=match;const args=[+y,+m-1,+d,+h,+min,+(sec||0)];const ms=z?Date.UTC(...args):new Date(...args).getTime();const dt=new Date(ms);const check=z?[dt.getUTCFullYear(),dt.getUTCMonth(),dt.getUTCDate(),dt.getUTCHours(),dt.getUTCMinutes()]:[dt.getFullYear(),dt.getMonth(),dt.getDate(),dt.getHours(),dt.getMinutes()];if(check.some((v,i)=>v!==args[i]))throw Error('Invalid date');return ms;
}
function parseICS(raw){if(typeof raw!=='string'||raw.length>2000000)throw Error('File too large');const lines=raw.replace(/\r\n?/g,'\n').split('\n');const unfolded=[];for(const line of lines){if(/^[ \t]/.test(line)&&unfolded.length)unfolded[unfolded.length-1]+=line.slice(1);else unfolded.push(line)}let active=null,events=[],skipped=0;for(const line of unfolded){if(line==='BEGIN:VEVENT'){active={};continue}if(line==='END:VEVENT'){if(!active)continue;try{if(active.RRULE||active['RECURRENCE-ID']||active.EXDATE)throw Error('Recurrence unsupported');if(!active.UID||!active.DTSTART||!active.DTEND)throw Error('Missing required fields');const start=timeValue(active.DTSTART.value,active.DTSTART.params),end=timeValue(active.DTEND.value,active.DTEND.params);if(end<=start)throw Error('Invalid interval');events.push({uid:active.UID.value,title:decode(active.SUMMARY?.value||'Untitled'),start,end,source:'ics-import'});}catch(e){skipped++}active=null;continue}if(!active)continue;const colon=line.indexOf(':');if(colon<0)continue;const head=line.slice(0,colon),key=head.split(';')[0].toUpperCase();active[key]={value:line.slice(colon+1),params:head.slice(key.length)};}
 const unique=new Map();for(const e of events)unique.set(e.uid+'|'+e.start,e);return{events:[...unique.values()],skipped,duplicates:events.length-unique.size};}
function overlap(a,b){return a.start<b.end&&b.start<a.end}
function conflicts(events,workspace){const plans=(workspace?.schedule||[]).filter(p=>p.status!=='skipped').map(p=>({title:p.name||'Planned activity',start:p.startAt,end:p.endAt}));const sessions=(workspace?.sessions||[]).filter(s=>s.status!=='paused').flatMap(s=>(s.segments||[]).filter(seg=>Number.isFinite(seg.start)).map(seg=>({title:s.name||'Tracked activity',start:seg.start,end:seg.end??Date.now()})));return events.map(e=>({...e,conflicts:[...plans,...sessions].filter(p=>Number.isFinite(p.start)&&Number.isFinite(p.end)&&overlap(e,p)).map(p=>p.title)}));}
function read(){try{const d=JSON.parse(localStorage.getItem(STORE)||'null');return d&&Array.isArray(d.events)&&Array.isArray(d.approved)?d:{events:[],approved:[],skipped:0}}catch{return{events:[],approved:[],skipped:0}}}
function workspace(){try{return JSON.parse(localStorage.getItem(LIFE)||'null')}catch{return null}}
let state=read();let lastSync={source:'None',at:null,count:0};function save(){localStorage.setItem(STORE,JSON.stringify(state))}
function eventKey(e){return e.uid+'|'+e.start}
function planningKey(e){return e.source+'|'+e.uid+'|'+e.start}
function prepareHandoff(events,approved,workspace){const selected=events.filter(e=>approved.includes(eventKey(e)));const existing=new Set((workspace?.schedule||[]).filter(p=>p.calendarKey).map(p=>p.calendarKey));return selected.filter(e=>!existing.has(planningKey(e))&&Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.end>e.start&&e.title.trim().length>0).map(e=>({key:planningKey(e),name:e.title.slice(0,80),startAt:e.start,endAt:e.end,source:e.source,uid:e.uid,conflicts:e.conflicts}));}
function reviewSummary(events,approved){return {total:events.length,conflicts:events.filter(e=>e.conflicts.length>0).length,approved:events.filter(e=>approved.includes(eventKey(e))).length,pending:events.filter(e=>!approved.includes(eventKey(e))).length}}
function filteredEvents(items,filters){const q=(filters.search||'').trim().toLowerCase();return items.filter(e=>(!q||e.title.toLowerCase().includes(q))&&(filters.source==='all'||e.source===filters.source)&&(filters.conflict==='all'||(e.conflicts.length>0)===(filters.conflict==='conflicts'))&&(filters.approval==='all'||(filters.approval==='approved')===filters.approved.includes(eventKey(e))))}
// Stage 28: compare a complete authoritative Google snapshot with previously imported plans.
// No schedule mutations are performed by reconciliation.
function reconcileCalendar(snapshot,workspace,source='google',complete=true,windowStart=-Infinity,windowEnd=Infinity){
 const plans=(workspace?.schedule||[]).filter(p=>typeof p.calendarKey==='string'&&p.calendarKey.startsWith(source+'|'));
 const current=new Map();
 for(const e of snapshot){if(e.source!==source||typeof e.uid!=='string')continue;
   const identity=source+'|'+e.uid;
   if(!current.has(identity))current.set(identity,[]);
   current.get(identity).push(e);
 }
 const proposals=[];
 for(const p of plans){const parts=p.calendarKey.split('|');if(parts.length<3)continue;
   const uid=parts.slice(1,-1).join('|'),matches=current.get(source+'|'+uid)||[];
   const same=matches.find(e=>planningKey(e)===p.calendarKey);
   if(same){if(same.title!==p.name||same.end!==p.endAt)proposals.push({type:'changed',planId:p.id,calendarKey:p.calendarKey,oldName:p.name,newName:same.title,oldStart:p.startAt,newStart:same.start,oldEnd:p.endAt,newEnd:same.end,reason:'Calendar title or end changed'});continue}
   if(matches.length===1){const e=matches[0];proposals.push({type:'changed',planId:p.id,calendarKey:p.calendarKey,oldName:p.name,newName:e.title,oldStart:p.startAt,newStart:e.start,oldEnd:p.endAt,newEnd:e.end,reason:'Calendar time or title changed'});}
   else if(matches.length===0&&complete&&p.startAt>=windowStart&&p.startAt<windowEnd)proposals.push({type:'missing',planId:p.id,calendarKey:p.calendarKey,oldName:p.name,oldStart:p.startAt,oldEnd:p.endAt,reason:'Not found in complete calendar snapshot; may be cancelled'});
   else if(matches.length>1)proposals.push({type:'ambiguous',planId:p.id,calendarKey:p.calendarKey,oldName:p.name,reason:'Multiple matching occurrences; manual review required'});
 }
 return proposals;
}
// Stage 29: proposals are immutable review requests, never direct calendar writes.
const CHANGE_HANDOFF='lifeos-stage29-change-handoff-v1';
function proposalFingerprint(p){return JSON.stringify([p.id,p.calendarKey,p.name,p.startAt,p.endAt,p.status]);}
function prepareChangeHandoff(proposals,workspace){
 const byId=new Map((workspace?.schedule||[]).map(p=>[p.id,p]));
 return proposals.filter(p=>p.type==='changed'||p.type==='missing').map(p=>{
   const plan=byId.get(p.planId);
   if(!plan||plan.calendarKey!==p.calendarKey||plan.status==='skipped')return null;
   if(p.type==='changed'&&(!Number.isSafeInteger(p.newStart)||!Number.isSafeInteger(p.newEnd)||p.newEnd<=p.newStart||p.newEnd-p.newStart>366*86400000||typeof p.newName!=='string'||!p.newName.trim()||p.newName.length>200))return null;
   return {...p,baseline:proposalFingerprint(plan)};
 }).filter(Boolean);
}
function safeReconcile(snapshot,workspace,meta){if(!meta||meta.complete!==true||meta.source!=='google'||meta.truncated===true)return {proposals:[],warning:'Incomplete or unverified snapshot: cancellation checks disabled'};return {proposals:reconcileCalendar(snapshot,workspace,'google',true,meta.windowStart??-Infinity,meta.windowEnd??Infinity),warning:null};}
let reconciliation={proposals:[],warning:'Import a complete Google snapshot to review schedule changes'};
function showReconciliation(){const target=el('reconciliation');if(!target)return;el('send-changes').disabled=!!reconciliation.warning||!reconciliation.proposals.some(p=>p.type==='changed'||p.type==='missing');target.innerHTML='<p class="muted">'+esc(reconciliation.warning||'Review only. No changes applied to your schedule.')+'</p>'+reconciliation.proposals.map(p=>'<article><strong>'+esc(p.type==='missing'?'Possibly cancelled':p.type==='ambiguous'?'Ambiguous match':'Changed calendar event')+'</strong><small>'+esc(p.oldName||'')+'</small><small>'+esc(p.reason)+'</small>'+ (p.type==='changed'?'<small>'+esc(new Date(p.oldStart).toLocaleString())+' → '+esc(new Date(p.newStart).toLocaleString())+'</small>':'')+'</article>').join('');}
function render(){const items=conflicts(state.events,workspace()),summary=reviewSummary(items,state.approved);const filters={search:el('search').value,source:el('source-filter').value,conflict:el('conflict-filter').value,approval:el('approval-filter').value,approved:state.approved};const visible=filteredEvents(items,filters);
 el('metrics').innerHTML=[['Imported',summary.total],['Conflicts',summary.conflicts],['Approved',summary.approved],['Pending',summary.pending]].map(([k,v])=>`<div class="metric"><span>${k}</span><strong>${v}</strong></div>`).join('');
 el('source-status').textContent=`Last preview: ${lastSync.source}${lastSync.at?' · '+lastSync.at:''} · ${lastSync.count} events received. Calendar changes are disabled.`;
 el('summary').textContent=`Showing ${visible.length} of ${items.length} unique events · ${state.skipped} unsupported ICS events skipped · ${summary.conflicts} events with LifeOS overlaps`;
 el('events').innerHTML=visible.map(e=>`<article><strong>${esc(e.title)}</strong><small>${esc(new Date(e.start).toLocaleString())} – ${esc(new Date(e.end).toLocaleString())}</small><small class="muted">Source: ${esc(e.source)}</small><small class="${e.conflicts.length?'warn':'ok'}">${e.conflicts.length?'Overlap: '+esc(e.conflicts.join(', ')):'No overlap detected'}</small><button data-id="${esc(eventKey(e))}" data-act="edit" class="secondary">Edit details</button><button data-id="${esc(eventKey(e))}" data-act="approve" ${state.approved.includes(eventKey(e))?'disabled':''}>${state.approved.includes(eventKey(e))?'Approved as candidate':'Approve as candidate'}</button></article>`).join('')||'<p class="muted">No events match these filters.</p>';
 el('approvals').innerHTML=items.filter(e=>state.approved.includes(eventKey(e))).map(e=>`<article>${esc(e.title)} <small>Candidate only · no calendar write</small><button class="secondary" data-act="revoke" data-id="${esc(eventKey(e))}">Revoke approval</button></article>`).join('')||'<p class="muted">No approved candidates.</p>'}
for(const id of ['search','source-filter','conflict-filter','approval-filter'])el(id).addEventListener('input',render);
el('send-plans').onclick=()=>{const candidates=prepareHandoff(conflicts(state.events,workspace()),state.approved,workspace());if(!candidates.length){el('message').textContent='No new approved candidates to send.';return}if(candidates.length>100){el('message').textContent='Limit selection to 100 candidates per transfer.';return}try{const previous=localStorage.getItem(HANDOFF);if(previous&&!confirm('Replace the existing unprocessed planning handoff?'))return;localStorage.setItem(HANDOFF,JSON.stringify({format:'lifeos-stage27-plan-handoff-v1',createdAt:Date.now(),candidates}));el('message').textContent=`Prepared ${candidates.length} candidate(s). Open LifeOS and review the transfer before any schedule entry is created.`;}catch(e){el('message').textContent='Could not stage transfer: '+e.message}};
el('send-changes').onclick=()=>{const candidates=prepareChangeHandoff(reconciliation.proposals,workspace());if(!candidates.length){el('message').textContent='No actionable proposals. Ambiguous matches require manual review.';return;}if(candidates.length>100){el('message').textContent='Review at most 100 changes at once.';return;}try{if(localStorage.getItem(CHANGE_HANDOFF)&&!confirm('Replace the previous pending change review?'))return;localStorage.setItem(CHANGE_HANDOFF,JSON.stringify({format:CHANGE_HANDOFF,createdAt:Date.now(),candidates}));el('message').textContent=`Prepared ${candidates.length} schedule change proposals. Open LifeOS to review each action. No changes applied.`;}catch(e){el('message').textContent='Unable to stage review: '+e.message;}};
el('export-review').onclick=()=>{const items=conflicts(state.events,workspace());const report={format:'lifeos-stage26-calendar-review',exportedAt:new Date().toISOString(),readOnly:true,summary:reviewSummary(items,state.approved),events:items.map(e=>({uid:e.uid,title:e.title,start:new Date(e.start).toISOString(),end:new Date(e.end).toISOString(),source:e.source,conflicts:e.conflicts,approvedAsCandidate:state.approved.includes(eventKey(e))}))};const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='lifeos-calendar-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
async function googleStatus(){try{const r=await fetch('/api/calendar/status',{cache:'no-store'});const x=await r.json();const link=el('google-connect');if(!r.ok)throw Error(x.error||'Status unavailable');
 el('google-status').textContent=x.connected?'Google Calendar connected · read-only':x.configured?'Google Calendar is ready to connect':'Google Calendar cannot connect yet. The server administrator must configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI and LIFEOS_CALENDAR_ENCRYPTION_KEY.';
 if(link){link.hidden=!x.configured;link.setAttribute('aria-disabled',String(!x.configured))}
 }catch(err){el('google-status').textContent='Google Calendar connection status unavailable: '+err.message;const link=el('google-connect');if(link)link.hidden=true}}
el('google-import').onclick=async()=>{try{const now=new Date(),end=new Date(now.getTime()+30*86400000);const r=await fetch('/api/calendar/events?'+new URLSearchParams({start:now.toISOString(),end:end.toISOString()}),{cache:'no-store'});const x=await r.json();if(!r.ok)throw Error(x.error||'Calendar fetch failed');const incoming=x.events.map(e=>({...e,start:Date.parse(e.start),end:Date.parse(e.end)})).filter(e=>Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.end>e.start);reconciliation=safeReconcile(incoming,workspace(),{complete:!x.truncated,source:'google',truncated:!!x.truncated,windowStart:now.getTime(),windowEnd:end.getTime()});showReconciliation();const merged=new Map(state.events.map(e=>[e.source+'|'+e.uid+'|'+e.start,e]));for(const e of incoming)merged.set(e.source+'|'+e.uid+'|'+e.start,e);state.events=[...merged.values()];lastSync={source:'Google Calendar',at:new Date().toLocaleString(),count:incoming.length};save();render();el('message').textContent=`Previewed ${incoming.length} Google events. ${x.truncated?'More events exist; narrow the window to review all.':''} No LifeOS activities changed.`;}catch(e){el('message').textContent=e.message;}};
googleStatus();showReconciliation();const oauthError=new URLSearchParams(location.search).get('error');
if(oauthError==='oauth-configuration')el('google-status').textContent='Google Calendar connection cannot start: OAuth client ID, client secret, redirect URL or encryption key is missing on the LifeOS server.';
else if(oauthError==='oauth-storage')el('google-status').textContent='Google Calendar could not initialize secure OAuth storage. Existing LifeOS data is safe; the server connection needs attention.';

el('import').onclick=async()=>{const file=el('file').files[0];if(!file){el('message').textContent='Select an .ics file.';return}if(file.size>2000000){el('message').textContent='File exceeds 2 MB.';return}try{const parsed=parseICS(await file.text());const old=state;state={events:parsed.events,skipped:parsed.skipped,approved:old.approved.filter(id=>parsed.events.some(e=>id===e.uid+'|'+e.start))};lastSync={source:'ICS file',at:new Date().toLocaleString(),count:parsed.events.length};save();render();el('message').textContent=`Imported ${state.events.length} unique events; ${parsed.skipped} skipped; ${parsed.duplicates} duplicates removed.`}catch(e){el('message').textContent='Import failed: '+e.message}};
async function previewDocument(){
 const file=el('document-file')?.files?.[0],status=el('document-status');if(!file){status.textContent='Choose a PDF, TXT or CSV file.';return}
 if(file.size>2_000_000){status.textContent='File exceeds 2 MB.';return}
 if(!confirm('Preview this schedule document? Its contents will be sent to your private LifeOS server for text extraction only. No records will be saved automatically.'))return;
 status.textContent='Extracting dated entries for review…';
 try{
  const bytes=new Uint8Array(await file.arrayBuffer());let binary='';const block=8192;
  for(let i=0;i<bytes.length;i+=block)binary+=String.fromCharCode(...bytes.subarray(i,i+block));
  const response=await fetch('/api/calendar/document-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:file.name,content:btoa(binary)})});
  const body=await response.json();if(!response.ok)throw Error(body.error||'Preview unavailable');
  const events=(body.candidates||[]).map((x,i)=>{const start=new Date(x.date+'T'+x.start+':00').getTime(),end=new Date(x.date+'T'+x.end+':00').getTime();if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!x.name)return null;
    return {uid:'document-'+file.name+'-'+x.line+'-'+i,title:String(x.name).slice(0,80),start,end,source:'document-import'};
  }).filter(Boolean);
  if(!events.length){status.textContent='No unambiguous dated events found. Try a text-based PDF with one event per line, or enter plans manually.';return}
  const merged=new Map(state.events.map(e=>[e.source+'|'+e.uid+'|'+e.start,e]));
  for(const item of events)merged.set(item.source+'|'+item.uid+'|'+item.start,item);
  state.events=[...merged.values()];state.skipped=Number(body.unparsedLines)||0;save();lastSync={source:'Document preview',at:new Date().toLocaleString(),count:events.length};render();
  status.textContent='Found '+events.length+' candidate(s). '+state.skipped+' lines not recognized. Check conflicts, edit details, and approve candidates below. No LifeOS plan has been added.';
 }catch(err){status.textContent='Document preview failed: '+err.message}
}
el('preview-document')?.addEventListener('click',previewDocument);
el('clear').onclick=()=>{if(!confirm('Clear Stage 23 imported events and approvals? LifeOS activities are unaffected.'))return;state={events:[],approved:[],skipped:0};save();render();el('message').textContent='Imported calendar data cleared.'};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const id=b.dataset.id;if(!state.events.some(x=>x.uid+'|'+x.start===id))return;if(b.dataset.act==='edit'){
 const row=state.events.find(x=>eventKey(x)===id);if(!row)return;
 const title=prompt('Activity name (max 80 characters)',row.title);if(title===null)return;
 const iso=ms=>{const d=new Date(ms);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')+'T'+[String(d.getHours()).padStart(2,'0'),String(d.getMinutes()).padStart(2,'0')].join(':')};
 const startText=prompt('Start time (YYYY-MM-DDTHH:MM)',iso(row.start));if(startText===null)return;
 const endText=prompt('Finish time (YYYY-MM-DDTHH:MM)',iso(row.end));if(endText===null)return;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startText)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(endText)){alert('Enter valid local dates and times.');return}
 const start=new Date(startText).getTime(),end=new Date(endText).getTime(),name=title.trim();
 if(!name||name.length>80||!Number.isFinite(start)||!Number.isFinite(end)||end<=start){alert('Name, start or finish is invalid.');return}
 state.approved=state.approved.filter(x=>x!==id);row.title=name;row.start=start;row.end=end;save();render();return
 }if(b.dataset.act==='approve'&&!state.approved.includes(id))state.approved.push(id);if(b.dataset.act==='revoke')state.approved=state.approved.filter(x=>x!==id);save();render()});render();
if(typeof module!=='undefined')module.exports={parseICS,conflicts,timeValue,reviewSummary,filteredEvents,eventKey,planningKey,prepareHandoff,reconcileCalendar,safeReconcile,prepareChangeHandoff,proposalFingerprint};
})();