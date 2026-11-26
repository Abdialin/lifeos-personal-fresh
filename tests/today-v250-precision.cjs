const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.cwd(),origin='https://lifeos-today-aplus-preview.onrender.com';
(async()=>{
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:393,height:780},isMobile:true,hasTouch:true,timezoneId:'Europe/Stockholm'}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const req=route.request(),u=new URL(req.url()),file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(u.origin===origin&&req.method()==='GET'&&file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});return route.fulfill({status:404,body:'isolated fixture'})});
 const now=new Date('2026-11-24T16:00:00+01:00');await page.clock.install({time:now});await page.clock.setFixedTime(now);
 await page.addInitScript(()=>{
  if(localStorage.getItem('precision-seeded'))return;
  const t=x=>Date.parse('2026-11-24T'+x+'+01:00'),s=(id,a,b)=>({id,name:id,status:'finished',createdAt:t(a),startAt:t(a),endAt:t(b),segments:[{start:t(a),end:t(b)}],notes:'',precision:'measured'});
  const sessions=[s('Before','08:00:00.000','08:15:20.123'),s('After','09:05:45.987','09:15:00.000'),s('Short before','10:00:00.000','10:00:15.123'),s('Short after','10:00:45.987','10:02:00.000'),s('Edit before','11:00:00.000','11:00:00.123'),s('Edit after','11:30:45.987','11:31:00.000')];
  localStorage.setItem('lifeos-live-v1',JSON.stringify({version:1,sessions,events:[],schedule:[],todos:[]}));localStorage.setItem('precision-seeded','1');
 });
 try{
  await page.goto(origin+'/');await page.waitForFunction(()=>document.body.classList.contains('lo-ca-ready')&&window.lifeosTodayAPlusSnapshot);
  const a=Date.parse('2026-11-24T08:15:20.123+01:00'),b=Date.parse('2026-11-24T09:05:45.987+01:00'),mid=Date.parse('2026-11-24T08:45:00+01:00');
  assert(await page.evaluate(({a,b})=>window.lifeosTodayAPlusAction('gap',a+':'+b),{a,b}));
  assert.equal(await page.locator('#caPastStart').inputValue(),'2026-11-24T08:15');assert.equal(await page.locator('#caPastEnd').inputValue(),'2026-11-24T09:05');
  assert.equal(await page.locator('#caPastStart').getAttribute('step'),'60');
  await page.locator('#caPastName').fill('Partial fixture');await page.locator('#caPastEnd').fill('2026-11-24T08:45');
  assert((await page.locator('#caGapSummary').innerText()).includes('Recording 29m 40s · Remaining unlogged 20m 46s'));
  await page.locator('[data-ca-save-past]').click();await page.getByText('Activity saved',{exact:true}).waitFor({state:'visible'});
  let saved=await page.evaluate(()=>window.lifeosReadOnlyWorkspace().sessions.find(x=>x.name==='Partial fixture'));assert.equal(saved.startAt,a);assert.equal(saved.endAt,mid);
  await page.locator('#loCADialog [data-ca-gap]').click();assert.equal(await page.locator('#caPastEnd').inputValue(),'2026-11-24T09:05');await page.locator('#caPastName').fill('Remaining fixture');await page.locator('[data-ca-save-past]').click();await page.getByText('Activity saved',{exact:true}).waitFor({state:'visible'});
  saved=await page.evaluate(()=>window.lifeosReadOnlyWorkspace().sessions.find(x=>x.name==='Remaining fixture'));assert.equal(saved.startAt,mid);assert.equal(saved.endAt,b);await page.locator('#loCADialog [data-ca-close]').last().click();
  assert.equal(await page.evaluate(({a,b})=>window.lifeosTodayAPlusGapValid({a,b},a,b),{a,b}),false);
  const shortA=Date.parse('2026-11-24T10:00:15.123+01:00'),shortB=Date.parse('2026-11-24T10:00:45.987+01:00');
  assert(await page.evaluate(({a,b})=>window.lifeosTodayAPlusAction('gap',a+':'+b),{a:shortA,b:shortB}));assert.equal(await page.locator('#caPastStart').getAttribute('step'),'1');assert.equal((await page.locator('#caPastStart').inputValue()).length,19);
  await page.locator('#caPastName').fill('Short fixture');await page.locator('[data-ca-save-past]').click();await page.getByText('Activity saved',{exact:true}).waitFor({state:'visible'});await page.reload();await page.waitForFunction(()=>window.lifeosReadOnlyWorkspace&&window.lifeosReadOnlyWorkspace().sessions.some(x=>x.name==='Short fixture'));
  let rows=await page.evaluate(()=>window.lifeosReadOnlyWorkspace().sessions);const short=rows.find(x=>x.name==='Short fixture');assert.equal(short.startAt,shortA);assert.equal(short.endAt,shortB);
  const editA=Date.parse('2026-11-24T11:00:00.123+01:00'),editB=Date.parse('2026-11-24T11:30:45.987+01:00');assert(await page.evaluate(({a,b})=>window.lifeosTodayAPlusAction('gap',a+':'+b),{a:editA,b:editB}));
  await page.locator('#caPastEnd').fill('2026-11-24T11:15');await page.locator('#caPastEnd').fill('2026-11-24T11:30');
  await page.locator('#caPastName').fill('Reselected minute');await page.locator('[data-ca-save-past]').click();await page.getByText('Activity saved',{exact:true}).waitFor({state:'visible'});
  rows=await page.evaluate(()=>window.lifeosReadOnlyWorkspace().sessions);const edited=rows.find(x=>x.name==='Reselected minute');assert.equal(edited.startAt,editA);assert.equal(edited.endAt,Date.parse('2026-11-24T11:30:00+01:00'));assert.deepEqual(errors,[]);
  console.log('PASS: minute controls preserve exact untouched boundaries, partial fills, consecutive saves and short gaps');
 }finally{await context.close();await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
