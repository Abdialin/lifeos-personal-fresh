'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.cwd(),origin='https://lifeos-today-aplus-preview.onrender.com';
const serve=route=>{const request=route.request(),url=new URL(request.url()),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(url.origin===origin&&request.method()==='GET'&&file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});return route.fulfill({status:404,body:'isolated synthetic goal fixture'})};
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[];
 async function setup(spring){
  const context=await browser.newContext({viewport:{width:393,height:780},isMobile:true,hasTouch:true,timezoneId:'Europe/Stockholm'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',serve);
  const fixed=new Date(spring?'2026-03-29T22:00:00+02:00':'2026-11-26T16:00:00+01:00');await page.clock.install({time:fixed});await page.clock.setFixedTime(fixed);
  await page.addInitScript(spring=>{
   const make=(id,segments,extra={})=>({id,name:'Quran reading session',status:'finished',startAt:segments[0][0],endAt:segments.at(-1)[1],createdAt:segments[0][0],segments:segments.map(([start,end])=>({start,end})),precision:'measured',notes:'',...extra});
   const t=x=>Date.parse(x);
   const sessions=spring?[make('dst',[[t('2026-03-29T01:30:00+01:00'),t('2026-03-29T03:30:00+02:00')]])]:[
    make('overnight',[[t('2026-11-23T23:50:00+01:00'),t('2026-11-24T00:10:00+01:00')]]),
    make('reading',[[t('2026-11-24T10:00:00+01:00'),t('2026-11-24T10:30:00+01:00')]]),
    make('paused',[[t('2026-11-25T09:00:00+01:00'),t('2026-11-25T09:10:00+01:00')],[t('2026-11-25T09:30:00+01:00'),t('2026-11-25T09:50:00+01:00')]]),
    make('example',[[t('2026-11-25T10:00:00+01:00'),t('2026-11-25T11:00:00+01:00')]],{assumed:true}),
    make('future-today',[[t('2026-11-26T15:00:00+01:00'),t('2026-11-26T17:00:00+01:00')]]),
    make('future-day',[[t('2026-11-27T09:00:00+01:00'),t('2026-11-27T10:00:00+01:00')]])
   ];
   const goals=[{id:'reading-goal',name:'Quran reading',category:'sessions',match:'Quran reading',unit:'hours',target:3.5},{id:'reading-pages',name:'Quran reading pages',category:'personal',match:'Quran',unit:'quantity',quantityUnit:'pages',target:25},{id:'reading-habit',name:'Quran reading habit',category:'habit',match:'Quran',unit:'hours',target:4}];
   const personalLogs=[{id:'independent-log',category:'Quran',date:'2026-11-25',minutes:15},{id:'linked-log',category:'Quran',date:'2026-11-24',minutes:30,sessionId:'reading'},{id:'today-log',category:'Quran',date:'2026-11-26',minutes:10},{id:'future-log',category:'Quran',date:'2026-11-27',minutes:999}];
   localStorage.setItem('lifeos-live-v1',JSON.stringify({version:1,sessions,events:[],schedule:[],todos:[],goals,personalLogs}));
  },spring);
  await page.goto(origin+'/');await page.waitForFunction(()=>window.lifeosReadOnlyWorkspace&&document.querySelector('#lifeosNavigation [data-view="goals"]'));await page.locator('#lifeosNavigation [data-view="goals"]').click();await page.locator('#gv161-app .gv164-reading').first().waitFor({state:'visible'});return {context,page};
 }
 try{
  let {context,page}=await setup(false);const before=await page.evaluate(()=>window.lifeosReadOnlyWorkspace()),card=page.locator('#gv161-app .gv161-card').filter({has:page.getByRole('heading',{name:'Quran reading',exact:true})}),chart=card.locator('.gv164-reading'),cells=chart.locator('.gv164-day');
  assert.equal(await page.locator('#gv161-app .gv164-reading').count(),2,'A quantity goal must not be presented as a duration goal');assert((await chart.innerText()).includes('Recorded minutes by day'));assert(!(await chart.innerText()).includes('90 min goal'));assert(!(await chart.innerText()).includes('90 recorded minutes'));assert((await chart.innerText()).includes('3 days with records'));assert.deepEqual(await cells.locator('b').allInnerTexts(),['10','40','30','—','—','—','—']);
  const habitCard=page.locator('#gv161-app .gv161-card').filter({has:page.getByRole('heading',{name:'Quran reading habit',exact:true})});assert.deepEqual(await habitCard.locator('.gv164-day b').allInnerTexts(),['10','40','45','10','—','—','—'],'Use the same personal-log evidence and linked-session deduplication as the goal');
  const totals=await page.evaluate(()=>{const api=window.LifeOSGoalEvidenceV175,w=window.lifeosReadOnlyWorkspace(),a=api.monday(0),b=api.monday(1);return w.goals.map(goal=>api.measure(goal,w,a,b).value)});assert(Math.abs(totals[0]-80/60)<1e-9,'Future-dated and assumed sessions must not inflate the weekly goal');assert(Math.abs(totals[2]-105/60)<1e-9,'Future logs and linked timers must not inflate habit progress');
  const legacy=await page.evaluate(()=>{const api=window.LifeOSGoalEvidenceV175,a=api.monday(0),b=api.monday(1),start=Date.parse('2026-11-24T12:00:00+01:00');return api.measure({category:'sessions',name:'Quran reading',unit:'hours'},{sessions:[{name:'Quran reading',status:'finished',segments:[{start,end:start+1200000}]},{name:'Quran reading',status:'finished',segments:[{start,end:null}]}]},a,b).minutes});assert.equal(legacy,20,'Retain completed historical segments without an endAt; ignore an open segment');
  await page.clock.setFixedTime(new Date('2026-11-26T08:00:00+01:00'));const morning=await page.evaluate(()=>{const api=window.LifeOSGoalEvidenceV175,w=window.lifeosReadOnlyWorkspace(),a=Date.parse('2026-11-26T00:00:00+01:00'),b=Date.parse('2026-11-27T00:00:00+01:00');return api.measure(w.goals[2],w,a,b).minutes});assert.equal(morning,10,'A date-only log entered today must count before noon');await page.clock.setFixedTime(new Date('2026-11-26T16:00:00+01:00'));
  assert.equal(await cells.nth(0).locator('i').evaluate(el=>el.style.getPropertyValue('--fill')),'25%');assert.equal(await cells.nth(1).locator('i').evaluate(el=>el.style.getPropertyValue('--fill')),'100%');assert.equal(await cells.nth(2).locator('i').evaluate(el=>el.style.getPropertyValue('--fill')),'75%');assert((await cells.nth(3).getAttribute('title')).includes('No recorded time'));
  assert.deepEqual(await page.evaluate(()=>window.lifeosReadOnlyWorkspace()),before,'Viewing the chart must not change any records');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(process.env.GOALS_READING_CAPTURE==='1'){fs.mkdirSync('docs/design/goals/current',{recursive:true});await chart.scrollIntoViewIfNeeded();await page.screenshot({path:'docs/design/goals/current/release-reading.png'});}
  await page.locator('.lifeos-theme-toggle').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const contrasts=await page.evaluate(()=>{const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number),l=s=>{const c=rgb(s).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]},background=getComputedStyle(document.body).backgroundColor,base=background.startsWith('rgba')&&background.endsWith(', 0)')?'rgb(255, 255, 255)':background;return [...document.querySelectorAll('#gv161-app .gv165-heading h3,#gv161-app .gv165-heading button')].map(el=>{const a=l(getComputedStyle(el).color),b=l(base);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)})});assert(contrasts.length===2&&contrasts.every(value=>value>=4.5),'Goals light-mode heading contrast: '+contrasts);
  await chart.scrollIntoViewIfNeeded();if(process.env.GOALS_READING_CAPTURE==='1')await page.screenshot({path:'docs/design/goals/current/release-reading-light.png'});await context.close();
  ({context,page}=await setup(true));const springCard=page.locator('#gv161-app .gv161-card').filter({has:page.getByRole('heading',{name:'Quran reading',exact:true})});assert.deepEqual(await springCard.locator('.gv164-day b').allInnerTexts(),['—','—','—','—','—','—','60'],'Local spring clock change must preserve the actual recorded duration');await context.close();assert.deepEqual(errors,[]);console.log('PASS: Goal reading evidence, no invented daily target, pauses, overnight and DST');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
