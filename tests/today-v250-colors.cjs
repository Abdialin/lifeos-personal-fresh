const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const root=process.cwd(),origin='https://lifeos-today-aplus-preview.onrender.com';
const serve=route=>{
 const req=route.request(),u=new URL(req.url()),file=root+'/'+(u.pathname==='/'?'index.html':u.pathname.slice(1));
 if(u.origin===origin&&req.method()==='GET'&&!u.pathname.includes('..')&&/\.(html|js|css|png|svg|json|webmanifest|ico)$/.test(file)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
 return route.fulfill({status:404,body:'offline isolated fixture'});
};
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:393,height:780},isMobile:true,hasTouch:true,timezoneId:'Europe/Stockholm'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',serve);
  await page.clock.install({time:new Date('2026-11-24T17:00:00+01:00')});await page.clock.setFixedTime(new Date('2026-11-24T17:00:00+01:00'));
  await page.addInitScript(()=>{
   if(localStorage.getItem('v250-color-fixture'))return;
   const mid=new Date(2026,10,24).getTime(),elapsed=10970007,f=x=>Math.round(mid+elapsed*x);
   const rows=[['Sleep',0,.4],['Prayer',.45,.52],['University',.57,.76],['App development',.65,.82],['Eating',.85,.91]];
   const sessions=rows.map(([name,a,b],i)=>({id:'legacy-'+i,name,status:'finished',createdAt:f(a),startAt:f(a),endAt:f(b),segments:[{start:f(a),end:f(b)}],notes:'Synthetic Preview test record',precision:'measured'}));
   const add=(id,name,start,end,extra={})=>sessions.push({id,name,status:'finished',createdAt:start,startAt:start,endAt:end,segments:[{start,end}],notes:'',precision:'measured',...extra});
   add('untrusted','Sleep',mid+5*3600000,mid+5*3600000+60000,{source:'assumed-demo',notes:'Synthetic Preview test record'});
   add('explicit','Not a category name',mid+6*3600000,mid+6*3600000+60000,{activityDetailsV252:{category:'sleep'}});
   add('review','Sleep',mid+7*3600000,mid+7*3600000+60000,{activityDetailsV252:{category:'Other / review'}});
   add('unknown-value','Sleep',mid+8*3600000,mid+8*3600000+60000,{activityDetailsV252:{category:'constructor'}});
   localStorage.setItem('lifeos-live-v1',JSON.stringify({version:1,sessions,events:[],schedule:[],todos:[]}));localStorage.setItem('v250-color-fixture','1');
  });
  await page.goto(origin+'/');await page.waitForFunction(()=>document.body.classList.contains('lo-ca-ready')&&window.lifeosTodayAPlusSnapshot);
  const saved=await page.evaluate(()=>window.lifeosReadOnlyWorkspace().sessions);
  let snap=await page.evaluate(()=>window.lifeosTodayAPlusSnapshot());
  assert.deepEqual(snap.recorded.filter(x=>x.id.startsWith('legacy-')).map(x=>x.category),['Sleep','Prayer','University','Work & business','Nutrition']);
  assert.equal(snap.recorded.find(x=>x.id==='untrusted').category,'Other / review');
  assert.equal(snap.recorded.find(x=>x.id==='explicit').category,'Sleep');
  assert.equal(snap.recorded.find(x=>x.id==='review').category,'Other / review');
  assert.equal(snap.recorded.find(x=>x.id==='unknown-value').category,'Other / review');
  await page.waitForFunction(()=>window.LifeOSActivityAnalyticsV253&&window.LifeOSGoalEvidenceV175&&window.lifeosActivityClassification);
  const consistency=await page.evaluate(()=>{
   const examples=[['Sleep','Sleep','sleep'],['Sleeping','Sleep','sleep'],['Studying for an exam','University','study'],['Lecture','University','study'],['Assignment','University','study'],['Kurs','University','study'],['Praying','Prayer','prayer'],['Prayed','Prayer','prayer'],['Fajr','Prayer','prayer'],['Breakfast','Nutrition','nutrition'],['Lunch','Nutrition','nutrition'],['Dinner','Nutrition','nutrition'],['Gym','Fitness','fitness'],['Workout','Fitness','fitness'],['Training','Fitness','fitness'],['Yoga','Fitness','fitness'],['Cycling','Fitness','fitness'],['Working','Work & business','work'],['App development','Work & business','work'],['Project test','Other / review','other'],['Gym work','Other / review','other']];
   const rows=examples.map(([name,group,id])=>({name,group,id,today:window.lifeosActivityClassification({name}).group,insights:window.LifeOSActivityAnalyticsV253.category({name})}));
   const cases=[{name:'Sleep',activityDetailsV252:{category:''}},{name:'Sleep',activityDetailsV252:{category:'  '}},{name:'Sleep',activityDetailsV252:{category:'Other / review'}},{name:'Gym',activityDetailsV252:{category:'Prayer'}},{name:'Unspecified',activityDetailsV252:{category:' sleep '}},{name:'Sleep',category:'Work'},{name:'Sleep',activityType:'distraction'},{name:'Sleep',activityType:'distraction',activityDetailsV252:{category:'Other / review'}},{name:'Sleep',activityDetailsV252:{category:'family'}},{name:'Sleep',activityDetailsV252:{category:'Family time'}},{name:'Gym',activityDetailsV252:{category:'Sleep and rest'}}];
   const overrides=cases.map(s=>({today:window.lifeosActivityClassification(s).group,insights:window.LifeOSActivityAnalyticsV253.category(s)}));
   const now=Date.now(),session=(id,name,category,notes='')=>({id,name,status:'finished',startAt:now-120000,endAt:now-60000,segments:[{start:now-120000,end:now-60000}],notes,activityDetailsV252:{category}});
   const workspace={sessions:[session('a','Unspecified','Fitness'),session('b','Gym','Other / review'),session('c','Gym','Fitness','Synthetic Preview test record')],workouts:[]};
   const goal=window.LifeOSGoalEvidenceV175.measure({category:'fitness',unit:'sessions'},workspace,now-3600000,now);
   return {rows,overrides,goal};
  });
  for(const row of consistency.rows){assert.equal(row.today,row.group,row.name);assert.equal(row.insights,row.id,row.name)}
  assert.deepEqual(consistency.overrides,[{today:'Sleep',insights:'sleep'},{today:'Sleep',insights:'sleep'},{today:'Other / review',insights:'other'},{today:'Prayer',insights:'prayer'},{today:'Sleep',insights:'sleep'},{today:'Work & business',insights:'work'},{today:'Distraction',insights:'distraction'},{today:'Other / review',insights:'other'},{today:'Family time',insights:'family'},{today:'Family time',insights:'family'},{today:'Sleep',insights:'sleep'}]);
  assert.equal(consistency.goal.value,1,'Goals should respect explicit classification and exclude Preview samples');
  await page.locator('#apTab1').click();await page.locator('[data-ap-live-period="0"]').click();
  const fill=id=>page.locator('svg [data-ap-detail="record"][data-ap-key="'+id+'"] > rect').getAttribute('fill');
  assert.equal(await fill('legacy-0'),'#829ab5');assert.equal(await fill('legacy-2'),'#65dfc0');assert.equal(await fill('legacy-3'),'#65b8ee');assert.equal(await fill('untrusted'),'#a6bcd0');
  assert((await page.locator('#apPage1').innerText()).includes('Sleep'));assert((await page.locator('#apPage1').innerText()).includes('University'));
  await page.locator('svg [data-ap-detail="record"][data-ap-key="legacy-0"]').click();assert((await page.locator('#caDialogBody').innerText()).includes('Sleep'));assert.equal(await page.locator('#caTodayCategory').inputValue(),'Sleep');await page.locator('#loCADialog [data-ca-close]').last().click();
  assert.deepEqual(await page.evaluate(()=>window.lifeosReadOnlyWorkspace().sessions),saved,'Classification display must not rewrite activity history');
  await page.reload();await page.waitForFunction(()=>window.lifeosTodayAPlusSnapshot&&window.lifeosTodayAPlusSnapshot().recorded.length===9);
  snap=await page.evaluate(()=>window.lifeosTodayAPlusSnapshot());assert.equal(snap.recorded.find(x=>x.id==='legacy-0').category,'Sleep');assert.equal(snap.recorded.find(x=>x.id==='untrusted').category,'Other / review');
  // The older Track review form must understand V250 display labels, including explicit Other.
  await page.waitForFunction(()=>document.getElementById('lo252-picker')&&document.querySelector('#lo252-fields [data-key="category"]'));
  await page.evaluate(()=>{const p=document.getElementById('lo252-picker');p.value='review';p.dispatchEvent(new Event('change',{bubbles:true}))});
  assert.equal(await page.locator('#lo252-fields [data-key="category"]').inputValue(),'other');
  await page.evaluate(()=>{const p=document.getElementById('lo252-picker');p.value='legacy-2';p.dispatchEvent(new Event('change',{bubbles:true}))});
  // Built-in examples have no stored review label; select a real V250 label separately.
  const legacyReview=await page.evaluate(()=>{const d={id:'explicit',fields:{category:'University'}};window.dispatchEvent(new CustomEvent('lifeos-v252-save-review',{detail:d}));return d.result});
  assert(legacyReview.ok,legacyReview.message);
  await page.evaluate(()=>{const p=document.getElementById('lo252-picker');p.value='explicit';p.dispatchEvent(new Event('change',{bubbles:true}))});
  assert.equal(await page.locator('#lo252-fields [data-key="category"]').inputValue(),'study');
  const familyReview=await page.evaluate(()=>{const d={id:'explicit',fields:{category:'family'}};window.dispatchEvent(new CustomEvent('lifeos-v252-save-review',{detail:d}));return d.result});assert(familyReview.ok);
  await page.locator('#apTab1').click();await page.locator('[data-ap-live-period="1"]').click();await page.locator('svg [data-ap-detail="record"][data-ap-key="explicit"]').click();
  assert.equal(await page.locator('#caTodayCategory').inputValue(),'Family time');await page.locator('[data-ca-category-save]').click();assert((await page.locator('#caCategoryMessage').innerText()).includes('saved'));await page.locator('#loCADialog [data-ca-close]').last().click();
  await page.evaluate(()=>{const p=document.getElementById('lo252-picker');p.value='explicit';p.dispatchEvent(new Event('change',{bubbles:true}))});assert.equal(await page.locator('#lo252-fields [data-key="category"]').inputValue(),'family');
  assert.equal(await page.evaluate(()=>window.LifeOSActivityAnalyticsV253.category(window.lifeosReadOnlyWorkspace().sessions.find(s=>s.id==='explicit'))),'family');
  assert.deepEqual(errors,[]);await context.close();
  // A matching name alone, without the complete fixture, must not be guessed.
  const isolated=await browser.newContext({viewport:{width:360,height:700},timezoneId:'Europe/Stockholm'});const blank=await isolated.newPage();await blank.route('**/*',serve);
  await blank.clock.install({time:new Date('2026-11-24T17:00:00+01:00')});await blank.clock.setFixedTime(new Date('2026-11-24T17:00:00+01:00'));
  await blank.addInitScript(()=>{const start=new Date(2026,10,24).getTime(),end=start+3600000;localStorage.setItem('lifeos-live-v1',JSON.stringify({version:1,sessions:[{id:'lone',name:'Sleep',status:'finished',createdAt:start,startAt:start,endAt:end,segments:[{start,end}],notes:'Synthetic Preview test record',precision:'measured'}],events:[],schedule:[],todos:[]}))});
  await blank.goto(origin+'/');await blank.waitForFunction(()=>window.lifeosTodayAPlusSnapshot);assert.equal((await blank.evaluate(()=>window.lifeosTodayAPlusSnapshot())).recorded[0].category,'Other / review');await isolated.close();
  // Newly generated fixture records carry explicitly defined categories.
  const fresh=await browser.newContext({viewport:{width:360,height:700},timezoneId:'Europe/Stockholm'});const p=await fresh.newPage();await p.route('**/*',serve);
  await p.clock.install({time:new Date('2026-11-24T17:00:00+01:00')});await p.clock.setFixedTime(new Date('2026-11-24T17:00:00+01:00'));
  await p.goto(origin+'/');await p.waitForFunction(()=>window.lifeosSeedTodayPreview&&window.lifeosTodayAPlusSnapshot);assert(await p.evaluate(()=>window.lifeosSeedTodayPreview()));
  const generated=await p.evaluate(()=>({snapshot:window.lifeosTodayAPlusSnapshot(),sessions:window.lifeosReadOnlyWorkspace().sessions}));
  assert.deepEqual(generated.snapshot.recorded.map(x=>x.category),['Sleep','Prayer','University','Work & business','Nutrition']);assert(generated.sessions.every(s=>s.notes==='Synthetic Preview test record'&&s.activityDetailsV252.category));await fresh.close();
  console.log('PASS: Preview sample colors, explicit categories, unknown safeguards, Track compatibility and unchanged history');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
