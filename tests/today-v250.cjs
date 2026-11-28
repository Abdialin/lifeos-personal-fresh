const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const root=process.cwd();
const origin='https://lifeos-today-aplus-preview.onrender.com';
const local=ms=>{const d=new Date(ms);return new Date(ms-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:393,height:780},isMobile:true,hasTouch:true,timezoneId:'Europe/Stockholm'});
 const page=await context.newPage();const errors=[],dialogs=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>{dialogs.push(d.type());d.dismiss()});
 const serve=route=>{
  const req=route.request(),u=new URL(req.url());
  const file=root+'/'+(u.pathname==='/'?'index.html':u.pathname.slice(1));
  if(u.origin===origin&&req.method()==='GET'&&!u.pathname.includes('..')&&/\.(html|js|css|png|svg|json|webmanifest|ico)$/.test(file)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
  return route.fulfill({status:404,body:'isolated test fixture'});
 };
 await page.route('**/*',serve);
 const fixed='2026-11-24T16:00:00+01:00';
 await page.clock.install({time:new Date(fixed)});await page.clock.setFixedTime(new Date(fixed));
 await page.addInitScript(()=>{
  if(localStorage.getItem('v250-fixture'))return;
  const t=s=>Date.parse(s+'+01:00');
  const session=(id,name,segments,extra={})=>({id,name,status:'finished',createdAt:segments[0][0],startAt:segments[0][0],endAt:segments.at(-1)[1],segments:segments.map(([start,end])=>({start,end})),precision:'measured',notes:'',...extra});
  const sessions=[
   session('night','Overnight sleep',[[t('2026-11-23T23:40:00'),t('2026-11-24T00:20:00')]]),
   session('paused','Study with pause',[[t('2026-11-24T08:00:00'),t('2026-11-24T08:30:00')],[t('2026-11-24T08:45:00'),t('2026-11-24T09:00:00')]]),
   session('concurrent','Reading together',[[t('2026-11-24T08:15:00'),t('2026-11-24T08:25:00')]]),
   session('short','Brief interval',[[t('2026-11-24T08:29:20'),t('2026-11-24T08:29:50')]]),
   session('unknown','finish a task',[[t('2026-11-24T10:00:00'),t('2026-11-24T11:00:00')]]),
   session('later','Eating at work',[[t('2026-11-24T11:10:00'),t('2026-11-24T11:11:00')]]),
   session('sample','Work example',[[t('2026-11-24T12:00:00'),t('2026-11-24T12:01:00')]],{source:'assumed-demo'}),
   session('live','Ongoing work',[[t('2026-11-24T15:00:00'),null]],{status:'running',endAt:null}),
   session('paused-yesterday','Paused yesterday',[[t('2026-11-23T20:00:00'),t('2026-11-23T21:00:00')]],{status:'paused',endAt:null})
  ];
  const schedule=[{id:'plan',name:'Evening commitment',startAt:t('2026-11-24T17:00:00'),endAt:t('2026-11-24T18:00:00'),createdAt:t('2026-11-24T00:00:00'),status:'planned',sessionId:null,reminder:false,notes:''},{id:'plan-overlap',name:'Concurrent commitment',startAt:t('2026-11-24T17:30:00'),endAt:t('2026-11-24T18:30:00'),createdAt:t('2026-11-24T00:00:00'),status:'planned',sessionId:null,reminder:false,notes:''}];
  localStorage.setItem('lifeos-live-v1',JSON.stringify({version:1,sessions,events:[],schedule,todos:[]}));localStorage.setItem('v250-fixture','1');
 });
 const snap=()=>page.evaluate(()=>window.lifeosTodayAPlusSnapshot());
 const nav=v=>page.locator('#lifeosNavigation [data-view="'+v+'"]').click();
 const close=()=>page.locator('#loCADialog [data-ca-close]').last().click();
 const confirmSave=async name=>{await page.locator('#caPastName').fill(name);await page.locator('[data-ca-save-past]').click();await page.getByText('Activity saved',{exact:true}).waitFor({state:'visible'});};
 try{
  await page.goto(origin+'/');await page.waitForFunction(()=>document.body.classList.contains('lo-ca-ready')&&window.lifeosTodayAPlusSnapshot);
  let d=await snap();
  assert.equal(d.metrics.total,197.5*60000);assert.equal(d.metrics.unique,187*60000);assert.equal(d.metrics.overlap,10.5*60000);
  assert.equal(d.metrics.unique+d.metrics.unlogged+d.metrics.remaining,d.metrics.dayLength);
  assert.equal(d.recorded.find(x=>x.id==='sample').category,'Other / review');
  assert.equal(d.recorded.find(x=>x.id==='unknown').category,'Other / review');
  assert.equal(d.recorded.find(x=>x.id==='later').category,'Other / review');
  assert.equal(d.recorded.find(x=>x.id==='night').b-d.recorded.find(x=>x.id==='night').a,20*60000);
  assert.equal(d.recorded.filter(x=>x.id==='paused').reduce((n,x)=>n+x.b-x.a,0),45*60000);
  await page.locator('#apTab1').click();await page.locator('[data-ap-live-period="1"]').click();
  await page.locator('#apTimelineLiveDetails > summary').click();await page.locator('#apPage1 [data-ap-detail="active"][data-ap-key="paused-yesterday"]').click();assert((await page.locator('#caDialogBody').innerText()).includes('Paused'));await close();
  await page.locator('svg [data-ap-detail="record"][data-ap-key="paused"]').first().click();
  assert((await page.locator('#caDialogBody').innerText()).includes('Study with pause'));
  assert((await page.locator('#caDialogBody').innerText()).includes('Reading together'));
  assert(!(await page.locator('#caDialogBody').innerText()).includes('Brief interval'));
  await page.locator('[data-ca-today-id="concurrent"]').click();assert((await page.locator('#caDialogBody').innerText()).includes('Reading together'));await close();
  await page.locator('.ap-v250-access summary').click();
  await page.locator('.ap-v250-access [data-ap-key="short"]').click();assert((await page.locator('#caDialogBody').innerText()).includes('Brief interval'));assert((await page.locator('#caDialogBody').innerText()).includes('30s'));await close();
  const gap=d.gaps.find(g=>g.a===Date.parse('2026-11-24T09:00:00+01:00')&&g.b===Date.parse('2026-11-24T10:00:00+01:00'));assert(gap);
  await page.locator('.ap-v250-access [data-ap-detail="gap"][data-ap-key="'+gap.a+':'+gap.b+'"]').click();
  assert((await page.locator('#caDialogBody').innerText()).includes('Unlogged / unknown'));await page.locator('#loCADialog [data-ca-gap]').click();
  assert.equal(await page.locator('#caPastStart').evaluate(e=>new Date(e.value).getTime()),gap.a);
  assert((await page.locator('#caGapContext').innerText()).includes('Study with pause'));
  await page.locator('#caPastName').fill('Invalid gap entry');await page.locator('#caPastStart').fill(await page.evaluate(local,gap.a-60000));
  await page.locator('[data-ca-save-past]').click();assert((await page.locator('#caPastError').innerText()).includes('outside'));
  await page.locator('#caPastStart').fill(await page.evaluate(local,gap.a));
  await page.locator('#caPastEnd').fill(await page.evaluate(local,gap.a+1800000));
  assert((await page.locator('#caGapSummary').innerText()).includes('Recording 30m · Remaining unlogged 30m'));
  assert((await page.locator('#caDialogBody').innerText()).includes('cannot be overlapped'));
  await confirmSave('First partial');assert((await page.locator('#caDialogBody').innerText()).includes('Remaining unlogged'));
  await page.locator('#loCADialog [data-ca-gap]').click();await confirmSave('Second partial');await page.locator('[data-ca-view-past]').click();
  await page.waitForFunction(()=>document.body.dataset.lifeosView==='tracking');assert(await page.locator('#caHistory').isVisible());await nav('dashboard');await page.locator('#apTab1').click();
  d=await snap();assert(!d.gaps.some(g=>g.a<gap.b&&g.b>gap.a));assert.equal(d.metrics.unique,217*60000+30*60000);
  await page.locator('[data-ap-live-period="2"]').click();
  await page.locator('svg [data-ap-detail="record"][data-ap-key="live"]').click();assert((await page.locator('#caDialogBody').innerText()).includes('Running'));await close();
  const plan1=page.locator('svg [data-ap-detail="plan"][data-ap-key="plan"]'),plan2=page.locator('svg [data-ap-detail="plan"][data-ap-key="plan-overlap"]');
  assert.notEqual(await plan1.locator(':scope > rect').getAttribute('x'),await plan2.locator(':scope > rect').getAttribute('x'));
  await plan1.click();assert((await page.locator('#caDialogBody').innerText()).includes('Evening commitment'));await close();await plan2.click();assert((await page.locator('#caDialogBody').innerText()).includes('Concurrent commitment'));await close();
  await page.locator('#apTab0').click();await page.getByRole('button',{name:'Log longest interval'}).click();assert(await page.locator('#caGapContext').isVisible());await close();
  await page.locator('#apTab3').click();
  const review=await page.locator('#apPage3').innerText();assert(review.includes('Reading together'));assert(!review.includes('Brief interval'));
  const shorter=page.locator('#apPage3 details').filter({hasText:'shorter intervals'});await shorter.locator('summary').click();await page.waitForFunction(el=>el.textContent.startsWith('Hide '),await shorter.locator('summary').elementHandle());await shorter.locator('summary').click();await page.waitForFunction(el=>el.textContent.startsWith('Show '),await shorter.locator('summary').elementHandle());
  const selected=(await snap()).gaps.find(g=>g.a===Date.parse('2026-11-24T11:11:00+01:00')&&g.b===Date.parse('2026-11-24T12:00:00+01:00'));assert(selected);
  assert(await page.evaluate(g=>window.lifeosTodayAPlusAction('gap',g.a+':'+g.b),selected));
  // Another manual entry consumes part of the selected interval while the form remains open.
  await page.evaluate(({a})=>{const f=document.getElementById('pastForm');const local=ms=>{const d=new Date(ms);return new Date(ms-d.getTimezoneOffset()*60000).toISOString().slice(0,23)};document.getElementById('pastName').value='Concurrent edit';document.getElementById('pastStart').value=local(a);document.getElementById('pastEnd').value=local(a+60000);f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));},selected);
  await page.locator('#caPastName').fill('Stale attempt');await page.locator('[data-ca-save-past]').click();assert((await page.locator('#caPastError').innerText()).includes('changed'));await close();
  d=await snap();const full=d.gaps.find(g=>g.a===Date.parse('2026-11-24T12:01:00+01:00')&&g.b===Date.parse('2026-11-24T15:00:00+01:00'));assert(full);
  assert(await page.evaluate(g=>window.lifeosTodayAPlusAction('gap',g.a+':'+g.b),full));await confirmSave('Full interval');await close();
  await page.locator('#apTab1').click();await page.locator('[data-ap-live-period="1"]').click();
  await page.locator('svg [data-ap-detail="record"][data-ap-key="unknown"]').click();await page.locator('#caTodayCategory').selectOption({label:'University'});await page.locator('[data-ca-category-save]').click();
  assert((await page.locator('#caCategoryMessage').innerText()).includes('saved'));await close();
  await page.reload();await page.waitForFunction(()=>window.lifeosTodayAPlusSnapshot&&window.lifeosTodayAPlusSnapshot().recorded.some(x=>x.name==='Second partial'));
  d=await snap();for(const name of ['First partial','Second partial','Concurrent edit','Full interval'])assert(d.recorded.some(x=>x.name===name));
  assert(!d.recorded.some(x=>x.name==='Stale attempt'||x.name==='Invalid gap entry'));assert.equal(d.recorded.find(x=>x.id==='unknown').category,'University');
  assert.equal(d.metrics.unique+d.metrics.unlogged+d.metrics.remaining,d.metrics.dayLength);assert.equal(d.metrics.total-d.metrics.unique,d.metrics.overlap);
  await nav('tracking');await page.locator('[data-ca-tab="review"]').click();await page.locator('[data-ca-review-period="today"]').click();
  const trackText=await page.locator('#caReview').innerText();assert(trackText.includes('including ongoing activity'));assert(trackText.includes('additional overlap'));assert(trackText.includes('finished activity total'));
  const format=ms=>{const mins=Math.round(ms/60000);return (mins>=60?Math.floor(mins/60)+'h ':'')+(mins%60?mins%60+'m':mins<60?'0m':'').trim()};
  assert(trackText.includes('total recorded '+format(d.metrics.total)));assert(trackText.includes('unique tracked '+format(d.metrics.unique)));assert(trackText.includes('additional overlap '+format(d.metrics.overlap)));
  await page.locator('[data-ca-tab="history"]').click();await page.locator('[data-ca-sheet="past"]').click();await page.setViewportSize({width:393,height:460});
  await page.waitForFunction(()=>{const sheet=document.querySelector('#loCADialog .ca-sheet');return sheet&&sheet.getBoundingClientRect().bottom<=(window.visualViewport?.height||innerHeight)+2});
  const box=await page.locator('#loCADialog .ca-sheet').boundingBox();assert(box.y+box.height<=462);await page.locator('#caPastName').fill('Manual past check');
  const first=d.gaps.find(g=>g.b-g.a>120000);await page.locator('#caPastStart').fill(await page.evaluate(local,first.a));await page.locator('#caPastEnd').fill(await page.evaluate(local,first.a+60000));await page.locator('[data-ca-save-past]').click();await page.getByText('Activity saved',{exact:true}).waitFor({state:'visible'});await close();
  for(const height of [460,780]){
   await page.setViewportSize({width:393,height});
   for(const view of ['dashboard','tracking','schedule','goals','analytics','life']){
    await nav(view);await page.waitForFunction(v=>document.body.dataset.lifeosView===v,view);
    await page.waitForFunction(()=>{const n=document.getElementById('lifeosNavigation'),v=window.visualViewport;return n&&Math.abs(n.getBoundingClientRect().bottom-((v?.offsetTop||0)+(v?.height||innerHeight)))<3});
    assert.equal(await page.locator('#loTrackWorkspaces:visible').count(),0,'Superseded Track workspace leaked into '+view);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),view+' horizontal overflow at '+height);
   }
  }
  await nav('dashboard');await page.locator('#todayAPlus .ap-header button').click();assert(await page.locator('#todayAPlus.ap-light').count());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(dialogs,[]);assert.deepEqual(errors,[]);
  // A separate, empty Preview storage area also exercises a 23-hour local day.
  const empty=await browser.newContext({viewport:{width:360,height:500},isMobile:true,hasTouch:true,timezoneId:'Europe/Stockholm'});
  const blank=await empty.newPage(),blankErrors=[];blank.on('pageerror',e=>blankErrors.push(e.message));await blank.route('**/*',serve);
  await blank.clock.install({time:new Date('2026-03-29T12:00:00.789+02:00')});await blank.clock.setFixedTime(new Date('2026-03-29T12:00:00.789+02:00'));
  await blank.goto(origin+'/');await blank.waitForFunction(()=>document.body.classList.contains('lo-ca-ready')&&window.lifeosTodayAPlusSnapshot);
  const emptyDay=await blank.evaluate(()=>window.lifeosTodayAPlusSnapshot());assert.equal(emptyDay.metrics.dayLength,23*3600000);assert.equal(emptyDay.metrics.total,0);
  assert.equal(emptyDay.metrics.unique+emptyDay.metrics.unlogged+emptyDay.metrics.remaining,emptyDay.metrics.dayLength);
  await blank.locator('#apTab1').click();await blank.locator('.ap-v250-access summary').click();await blank.locator('.ap-v250-access [data-ap-detail="gap"]').first().click();assert((await blank.locator('#caDialogBody').innerText()).includes('Unknown'));await blank.locator('#loCADialog [data-ca-gap]').click();
  assert.equal((await blank.locator('#caPastEnd').inputValue()).length,16);assert((await blank.locator('#caGapSummary').innerText()).includes('Remaining unlogged 0s'));
  await blank.locator('#caPastName').fill('Exact full interval');await blank.locator('[data-ca-save-past]').click();await blank.getByText('Activity saved',{exact:true}).waitFor({state:'visible'});assert.equal((await blank.evaluate(()=>window.lifeosTodayAPlusSnapshot())).recorded[0].b,emptyDay.at);await blank.locator('#loCADialog [data-ca-close]').last().click();
  await blank.locator('#todayAPlus .ap-header button').click();assert(await blank.locator('#todayAPlus.ap-light').count());assert(await blank.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  // Six-hour map windows follow local clock time on both daylight-saving transitions.
  await blank.clock.setFixedTime(new Date('2026-03-29T06:30:00+02:00'));await blank.goto(origin+'/');await blank.waitForFunction(()=>window.lifeosTodayAPlusSnapshot);await blank.locator('#apTab1').click();
  assert((await blank.locator('[data-ap-live-period="1"]').getAttribute('class')).includes('ap-selected'));
  const springBlock=blank.locator('#apPage1 svg [data-ap-detail="record"]').first();assert(Math.abs(Number(await springBlock.locator('rect').first().getAttribute('height'))-28)<0.1);
  await blank.clock.setFixedTime(new Date('2026-10-25T05:30:00+01:00'));await blank.goto(origin+'/');await blank.waitForFunction(()=>window.lifeosTodayAPlusSnapshot);await blank.locator('#apTab1').click();
  assert.equal((await blank.evaluate(()=>window.lifeosTodayAPlusSnapshot())).metrics.dayLength,25*3600000);assert((await blank.locator('[data-ap-live-period="0"]').getAttribute('class')).includes('ap-selected'));
  assert.equal((await blank.locator('#apPage1 svg').nth(1).locator('text').allTextContents()).filter(x=>x==='02:00').length,2);
  await blank.goto(origin+'/?todayDemo=1');await blank.locator('#apTab2').click();assert(!(await blank.locator('#apPage2').innerText()).includes('available window'));assert((await blank.locator('#apPage2').innerText()).includes('unscheduled time'));
  await blank.locator('#apTab3').click();const demoSummary=blank.locator('#apPage3 details').filter({hasText:'shorter intervals'}).locator('summary');await demoSummary.click();await blank.waitForFunction(el=>el.textContent.startsWith('Hide '),await demoSummary.elementHandle());await demoSummary.click();await blank.waitForFunction(el=>el.textContent.startsWith('Show '),await demoSummary.elementHandle());
  assert.deepEqual(blankErrors,[]);await empty.close();
  console.log('PASS V250: interactive map, gaps, concurrent sessions, durations, categories, persistence, navigation and mobile viewports');
 }finally{await context.close();await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
