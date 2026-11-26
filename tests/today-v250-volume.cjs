const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.cwd(),origin='https://lifeos-today-aplus-preview.onrender.com';
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:393,height:780},isMobile:true,hasTouch:true,timezoneId:'Europe/Stockholm'}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const req=route.request(),u=new URL(req.url()),file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));
  if(u.origin===origin&&req.method()==='GET'&&file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
  return route.fulfill({status:404,body:'isolated high-volume fixture'});
 });
 const now=new Date('2026-11-24T16:00:00+01:00');await page.clock.install({time:now});await page.clock.setFixedTime(now);
 await page.addInitScript(()=>{
  const start=Date.parse('2026-11-24T06:00:00+01:00'),sessions=[];
  const add=(id,name,a,b)=>sessions.push({id,name,status:'finished',createdAt:a,startAt:a,endAt:b,segments:[{start:a,end:b}],precision:'measured',notes:'Synthetic high-volume test fixture'});
  for(let i=0;i<120;i++){
   const a=start+i*300000;add('volume-'+i,'University activity '+String(i).padStart(3,'0'),a,a+300000);
   if(i%10===0)add('short-'+i,'Brief review '+i,a+60000,a+90000);
  }
  localStorage.setItem('lifeos-live-v1',JSON.stringify({version:1,sessions,events:[],schedule:[],todos:[]}));
 });
 try{
  await page.goto(origin+'/');await page.waitForFunction(()=>document.body.classList.contains('lo-ca-ready')&&window.lifeosTodayAPlusSnapshot);
  const d=await page.evaluate(()=>window.lifeosTodayAPlusSnapshot());
  assert.equal(d.recorded.length,132);assert.equal(d.metrics.unique,600*60000);assert.equal(d.metrics.total,606*60000);assert.equal(d.metrics.overlap,6*60000);
  assert.equal(d.metrics.unique+d.metrics.unlogged+d.metrics.remaining,d.metrics.dayLength);
  await page.locator('#apTab1').click();await page.locator('[data-ap-live-period="1"]').click();
  const shortHeight=Number(await page.locator('svg [data-ap-detail="record"][data-ap-key="short-70"] > rect').getAttribute('height'));
  assert(Math.abs(shortHeight-30/21600*336)<1e-9,'Short blocks must remain proportional to their duration');
  await page.locator('[data-ap-live-period="1"]').scrollIntoViewIfNeeded();
  if(process.env.LIFEOS_CAPTURE_VOLUME==='1'){
   fs.mkdirSync('today-verification',{recursive:true});await page.screenshot({path:'today-verification/high-volume.png'});
  }
  await page.locator('.ap-v250-access summary').click();
  assert.equal(await page.locator('.ap-v250-access [data-ap-detail="record"]').count(),80);
  await page.locator('.ap-v250-access [data-ap-key="volume-71"]').click();
  assert((await page.locator('#caDialogBody').innerText()).includes('University activity 071'));
  await page.locator('#loCADialog [data-ca-close]').last().click();
  await page.locator('.ap-v250-access [data-ap-key="short-70"]').click();
  assert((await page.locator('#caDialogBody').innerText()).includes('30s'));await page.locator('#loCADialog [data-ca-close]').last().click();
  await page.locator('#todayAPlus .ap-header button').click();assert(await page.locator('#todayAPlus.ap-light').count());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  console.log('PASS: 132-record timeline accounting, accessible short intervals, details and light mode');
 }finally{await context.close();await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
