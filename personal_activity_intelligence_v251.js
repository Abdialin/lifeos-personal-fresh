/* LifeOS V251 — activity vocabulary, discoverability and verified prayer overview.
   Non-destructive: classification is advisory and never rewrites existing sessions. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.LifeOSActivityIntelligenceV251=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const catalog=[
 {id:'prayer',title:'Prayer',aliases:['pray','prayed','praying','prayers','prayer','salah','salat','namaz','fajr','fajr prayer','dhuhr','zuhr','asr','maghrib','isha','mosque','masjid','sunnah','tahajjud','witr','bön'],fields:['Prayer (Fajr / Dhuhr / Asr / Maghrib / Isha)','On time?','Congregation?','Mosque?','Row (first / other / unknown)','Sunnah units completed','Preparation and travel minutes']},
 {id:'study',title:'Studying',aliases:['study','studying','studied','schoolwork','homework','revision','revising','reading course','exam prep','plugg','plugga','studera','studier'],fields:['Course or subject','Goal or task','Concentration','Pages or questions completed','Break minutes','Preparation minutes']},
 {id:'family',title:'Family time',aliases:['family','family time','with family','kids','children','parents','siblings','familj','familjetid'],fields:['Who with (optional)','Type of time together','Quality rating','Travel or preparation minutes']},
 {id:'friends',title:'Friends and social',aliases:['friends','friend','socializing','hangout','hanging out','meet friends','social','vänner','umgås'],fields:['Activity','In person or call','Quality rating','Travel minutes']},
 {id:'fitness',title:'Fitness and exercise',aliases:['gym','workout','training','exercise','fitness','running','run','walking','walk','boxing','cycling','swimming','träna','träning','promenad'],fields:['Workout type','Sets / distance / intensity','Warm-up minutes','Cooldown minutes','Travel minutes']},
 {id:'nutrition',title:'Meals and nutrition',aliases:['eat','eating','meal','breakfast','lunch','dinner','snack','food','frukost','middag','måltid','äta'],fields:['Meal type','Food or ingredients','Water intake','Preparation / cooking minutes']},
 {id:'work',title:'Work',aliases:['work','working','job','shift','office','arbete','jobba','möte'],fields:['Project or shift','Location','Planned duration','Breaks','Commute minutes']},
 {id:'sleep',title:'Sleep and rest',aliases:['sleep','sleeping','nap','rest','bedtime','sömn','sova','vila'],fields:['Sleep quality','Waking interruptions','Wind-down minutes']},
 {id:'quran',title:'Quran and reading',aliases:['quran','koran','hifdh','memorization','memorisation','recitation','tilawah','reading quran'],fields:['Surah or pages','New memorisation','Revision','Concentration']},
 {id:'reading',title:'Books and reading',aliases:['book','reading','read book','novel','läsning','läsa'],fields:['Book or topic','Pages completed','Notes']},
 {id:'chores',title:'Home and chores',aliases:['cleaning','laundry','dishes','cooking','housework','städning','tvätt'],fields:['Task','Location','Outcome']},
 {id:'errands',title:'Errands and shopping',aliases:['groceries','shopping','errands','appointments','handla','ärenden'],fields:['Errand','Travel minutes','Waiting minutes']},
 {id:'travel',title:'Travel and commuting',aliases:['travel','commute','driving','bus','train','transport','resa','pendla'],fields:['Transport mode','Purpose','Travel duration']},
 {id:'health',title:'Health and self-care',aliases:['doctor','dentist','therapy','self care','health','hygiene','shower','vård'],fields:['Type','Preparation or travel minutes']},
 {id:'hobbies',title:'Hobbies and creativity',aliases:['hobby','gaming','music','art','drawing','writing','photography','creative'],fields:['Activity','Project or result']},
 {id:'outdoors',title:'Outdoors and nature',aliases:['outdoors','nature','hiking','park','garden','gardening','natur','vandring'],fields:['Place','Distance','Who with']},
 {id:'volunteer',title:'Community and volunteering',aliases:['volunteer','volunteering','community','charity','helping others','ideellt'],fields:['Organization or cause','Contribution']},
 {id:'distraction',title:'Distractions',aliases:['distraction','distracted','scrolling','doomscrolling','social media','procrastinating','distraktion'],fields:['Cause','Classification','Trigger','What you intended to do','Recovery action']}
];
const norm=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
function match(value){const n=norm(value);if(!n)return null;let best=null,score=0;for(const item of catalog)for(const alias of item.aliases){const a=norm(alias);let s=0;if(n===a)s=100+a.length;else if(n.startsWith(a+' ')||n.endsWith(' '+a)||n.includes(' '+a+' '))s=60+a.length;else if(a.length>4&&n.split(' ').includes(a))s=35+a.length;if(s>score){score=s;best=item;}}return score>=35?{id:best.id,title:best.title,fields:best.fields,matched:true}:null;}
function prayerName(value){const n=norm(value);for(const p of ['fajr','dhuhr','zuhr','asr','maghrib','isha'])if(n.split(' ').includes(p))return p==='zuhr'?'dhuhr':p;return null;}
function prayerOverview(workspace,days=7,now=Date.now()){
 const sessions=(workspace?.sessions||[]).filter(s=>s&&s.status==='finished'&&Number.isFinite(+s.startAt)&&+s.startAt>=now-days*86400000&&+s.startAt<=now&&match(s.name)?.id==='prayer');
 const observedDays=new Set(sessions.map(s=>new Date(s.startAt).toLocaleDateString('en-CA')));
 const named=new Set(sessions.map(s=>new Date(s.startAt).toLocaleDateString('en-CA')+':'+prayerName(s.name)).filter(x=>!x.endsWith(':null')));
 const duration=sessions.reduce((sum,s)=>sum+(Number.isFinite(+s.activeMs)?+s.activeMs:Math.max(0,(+s.endAt||+s.startAt)-+s.startAt)),0);
 // Session titles alone cannot verify worship compliance, congregation, row, or sunnah.
 return {sessions:sessions.length,observedDays:observedDays.size,identifiablePrayerSlots:named.size,recordedHours:Math.round(duration/360000)/10,verifiedCongregation:null,verifiedFirstRow:null,verifiedSunnahs:null};
}
function mount(){
 const d=root.document;if(!d||d.getElementById('lo251-activity'))return;
 const input=d.getElementById('customName'),quick=d.getElementById('trackQuickPanel');if(!input||!quick)return;
 const section=d.createElement('section');section.id='lo251-activity';section.className='panel';section.style.cssText='border:1px solid #446b83;background:#10253a';
 const h=d.createElement('h2');h.textContent='Activity library & smart recognition';section.append(h);
 const p=d.createElement('p');p.className='sub';p.textContent='Discover activities and their details. Your typed activity name is preserved; matching suggests the correct category.';section.append(p);
 const info=d.createElement('div');info.id='lo251-match';info.setAttribute('role','status');info.className='sub';info.style.margin='12px 0';section.append(info);
 const cards=d.createElement('div');cards.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:8px';section.append(cards);
 const detail=d.createElement('div');detail.style.cssText='margin-top:12px;padding:12px;background:#172e45;border-radius:12px';section.append(detail);
 const fmt=item=>{detail.replaceChildren();const title=d.createElement('strong');title.textContent=item.title+' · recordable details';detail.append(title);const line=d.createElement('p');line.className='sub';line.textContent=item.fields.join(' · ');detail.append(line);const button=d.createElement('button');button.className='btn outline';button.type='button';button.textContent='Use '+item.title;button.onclick=()=>{input.value=item.title;input.dispatchEvent(new Event('input',{bubbles:true}));input.scrollIntoView({behavior:'smooth',block:'center'});input.focus()};detail.append(button);};
 for(const item of catalog){const b=d.createElement('button');b.type='button';b.className='btn outline';b.style.cssText='min-height:44px;text-align:left';b.textContent=item.title;b.onclick=()=>fmt(item);cards.append(b);}
 const update=()=>{const m=match(input.value);info.textContent=m?'Recognized: '+m.title+'. Details available: '+m.fields.join(', ')+'.':'Type an activity such as “Fajr prayer”, “studying” or “family time” to recognize its category.';if(m)fmt(catalog.find(x=>x.id===m.id));};
 input.addEventListener('input',update);update();quick.after(section);
 const life=d.getElementById('lifeosMyLifeDashboard')||d.getElementById('lifeosPrayerDashboard');
 const host=life||d.getElementById('trackActivePanel');if(host&&!d.getElementById('lo251-prayer-insights')){
  const box=d.createElement('section');box.id='lo251-prayer-insights';box.className='panel';const title=d.createElement('h2');title.textContent='Prayer insights · verified tracking';box.append(title);const stats=d.createElement('p');stats.className='sub';box.append(stats);
  const refresh=()=>{const w=typeof root.lifeosReadOnlyWorkspace==='function'?root.lifeosReadOnlyWorkspace():{};const r=prayerOverview(w);stats.textContent=r.sessions+' finished prayer sessions in the last 7 days · '+r.identifiablePrayerSlots+' identifiable daily prayer slots · '+r.recordedHours+' recorded hours. Congregation, mosque, first row and sunnahs require separately confirmed details; no percentages are assumed.';};
  const b=d.createElement('button');b.type='button';b.className='btn outline';b.textContent='Refresh prayer insights';b.onclick=refresh;box.append(b);host.after(box);refresh();root.addEventListener?.('lifeos-v77-tracking-changed',refresh);
 }
}
if(root.document){const init=()=>{mount();root.setTimeout?.(mount,700)};if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',init,{once:true});else init();}
return {catalog,normalize:norm,match,prayerName,prayerOverview,mount};
});