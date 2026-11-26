'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.cwd(),origin='https://lifeos-today-aplus-preview.onrender.com';
const serve=route=>{
 const request=route.request(),url=new URL(request.url());
 const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
 if(url.origin===origin&&request.method()==='GET'&&file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
 return route.fulfill({status:404,body:'isolated synthetic habit fixture'});
};
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:393,height:780},isMobile:true,hasTouch:true,timezoneId:'Europe/Stockholm'});
 const page=await context.newPage(),errors=[],dialogs=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{dialogs.push(d.message());d.dismiss()});await page.route('**/*',serve);
 const fixed=new Date('2026-11-24T16:00:00+01:00');await page.clock.install({time:fixed});await page.clock.setFixedTime(fixed);
 await page.addInitScript(()=>{
  if(localStorage.getItem('lifeos-live-v1'))return;
  const start=Date.parse('2026-11-24T08:00:00+01:00'),end=Date.parse('2026-11-24T09:00:00+01:00');
  localStorage.setItem('lifeos-live-v1',JSON.stringify({version:1,sessions:[{id:'study',name:'University',status:'finished',startAt:start,endAt:end,createdAt:start,segments:[{start,end}],notes:'',precision:'measured'}],events:[],schedule:[],todos:[],
   habitDefinitions:[{id:'read',title:'Read',startDate:'2026-11-24',everyDays:1,targetMode:'completion'},{id:'not-due',title:'Not due',startDate:'2026-11-23',everyDays:2}],
   habitChecks:[{id:'check-read',habitId:'read',date:'2026-11-24',done:true,createdAt:start,checkSource:'linked-evidence',evidenceType:'session',evidenceSourceId:'study',note:'preserve evidence'}]}));
 });
 const openAgenda=async()=>{await page.locator('#lifeosNavigation [data-view="dashboard"]').click();await page.locator('#apTab2').click()};
 const getCheck=()=>page.evaluate(()=>window.lifeosSocialHabitBridge.read().habitChecks.find(x=>x.id==='check-read'));
 const capture=async name=>{if(process.env.TODAY_AGENDA_CAPTURE==='1'){fs.mkdirSync('docs/design/today/current',{recursive:true});await page.screenshot({path:'docs/design/today/current/release-agenda-habits-'+name+'.png'})}};
 try{
  await page.goto(origin+'/');await page.waitForFunction(()=>window.lifeosHabitToggleToday&&document.body.classList.contains('ap-today'));await openAgenda();
  const input=page.locator('#apPage2 [data-ap-live-habit="read"]');assert(await input.isChecked());assert.equal(await page.locator('#apPage2 [data-ap-live-habit="not-due"]').count(),0);
  assert((await page.locator('#apPage2').innerText()).includes('1 / 1'));await input.scrollIntoViewIfNeeded();await capture('dark');
  await input.uncheck();let check=await getCheck();assert.equal(check.done,false);assert.equal(check.checkSource,'manual-dismissed');assert.equal(check.evidenceSourceId,'study');assert.equal(check.note,'preserve evidence');assert.equal(await page.evaluate(()=>window.lifeosSocialHabitBridge.read().habitChecks.length),1);
  await input.check();check=await getCheck();assert.equal(check.done,true);assert.equal(check.id,'check-read');assert.equal(check.checkSource,'manual');assert.equal(check.evidenceSourceId,'study');assert.equal(check.note,'preserve evidence');
  const before=JSON.stringify(check);
  await page.evaluate(()=>{window.__habitSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='lifeos-v4-stage21-atomic')throw Error('synthetic failure');return window.__habitSetItem.call(this,key,value)}});
  await input.click();assert((await page.locator('#apHabitMessage').innerText()).includes('could not be saved'));assert(await input.isChecked());assert.equal(JSON.stringify(await getCheck()),before);
  await page.evaluate(()=>{Storage.prototype.setItem=window.__habitSetItem;delete window.__habitSetItem});
  await page.evaluate(()=>{
   const b=window.lifeosSocialHabitBridge,c=b.read().habitChecks.find(x=>x.id==='check-read');b.mutate('habitChecks','upsert',{...c,note:'changed elsewhere'});
   const input=document.querySelector('#apPage2 [data-ap-live-habit="read"]');input.checked=false;input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  assert((await page.locator('#apHabitMessage').innerText()).includes('changed'));assert(await input.isChecked());assert.equal((await getCheck()).note,'changed elsewhere');
  await page.evaluate(()=>{const b=window.lifeosSocialHabitBridge,c=b.read().habitChecks.find(x=>x.id==='check-read');b.mutate('habitChecks','upsert',{...c,id:'duplicate'});const input=document.querySelector('#apPage2 [data-ap-live-habit="read"]');input.checked=false;input.dispatchEvent(new Event('change',{bubbles:true}));});
  const duplicateMessage=await page.locator('#apHabitMessage').innerText();assert(duplicateMessage.includes('Multiple checks'),'Duplicate-check feedback: '+duplicateMessage);assert(await input.isChecked());assert.equal(await page.evaluate(()=>window.lifeosSocialHabitBridge.read().habitChecks.length),2,'Ambiguous duplicate checks must not be edited');
  await page.evaluate(()=>{const b=window.lifeosSocialHabitBridge;b.mutate('habitChecks','remove',b.read().habitChecks.find(x=>x.id==='duplicate'))});
  const staleDay=await page.evaluate(()=>window.lifeosHabitToggleToday('read','2026-11-23','null'));assert.equal(staleDay.ok,false);
  const notDue=await page.evaluate(()=>window.lifeosHabitToggleToday('not-due','2026-11-24','null'));assert.equal(notDue.ok,false);
  await page.evaluate(()=>{
   const b=window.lifeosSocialHabitBridge,d=b.read().habitDefinitions.find(x=>x.id==='read'),c=b.read().habitChecks.find(x=>x.id==='check-read');
   b.mutate('habitDefinitions','upsert',{...d,autoComplete:true,autoSince:Date.parse('2026-11-23T00:00:00+01:00'),matchText:'University'});
   b.mutate('habitChecks','upsert',{...c,checkSource:'auto-linked-evidence',evidenceType:'session',evidenceSourceId:'study'});
  });
  await openAgenda();await input.uncheck();check=await getCheck();assert.equal(check.done,false);assert.equal(check.checkSource,'auto-dismissed');assert.equal(check.evidenceSourceId,'study');assert.equal(await page.evaluate(()=>window.lifeosSocialHabitBridge.read().habitChecks.length),1,'Automatic detection must not recreate an intentionally dismissed check');
  await page.reload();await page.waitForFunction(()=>window.lifeosHabitToggleToday&&document.body.classList.contains('ap-today'));await openAgenda();assert(!(await input.isChecked()));assert.equal((await getCheck()).checkSource,'auto-dismissed');
  await input.check();assert.equal((await getCheck()).checkSource,'manual');await page.locator('#apPage2 [data-ap-live-quick="habits"]').first().click();await page.waitForFunction(()=>document.body.dataset.lifeosView==='life'&&document.body.dataset.loLifeSection==='habits');await page.waitForSelector('#lo32HabitHub',{state:'visible'});assert((await page.locator('#lo32HabitHub [data-lo32-check="read"]').innerText()).includes('Completed'));await page.locator('#lo32HabitHub [data-lo32-check="read"]').click();assert.equal((await getCheck()).done,false);assert.equal((await getCheck()).evidenceSourceId,'study');
  await openAgenda();assert(!(await input.isChecked()));for(const size of [{width:360,height:650},{width:393,height:460},{width:412,height:780}]){await page.setViewportSize(size);await page.waitForFunction(h=>innerHeight===h,size.height);await input.scrollIntoViewIfNeeded();const box=await input.boundingBox(),nav=await page.locator('#lifeosNavigation').boundingBox();assert(box&&nav&&box.y>=0&&box.y+box.height<=nav.y+1,'Habit checkbox is above navigation at '+JSON.stringify(size));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await page.setViewportSize({width:393,height:780});await page.locator('#todayAPlus .ap-header button').click();await input.scrollIntoViewIfNeeded();assert.equal(await input.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','Unchecked controls remain legible in light mode');await capture('light');
  assert.deepEqual(dialogs,[]);assert.deepEqual(errors,[]);console.log('PASS: Today habit checklist, linked evidence, stale and failed saves, My Life and reload');
 }finally{await context.close();await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
