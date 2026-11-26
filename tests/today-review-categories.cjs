'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.cwd(),origin='https://lifeos-today-aplus-preview.onrender.com';
const serve=route=>{const request=route.request(),url=new URL(request.url()),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(url.origin===origin&&request.method()==='GET'&&file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});return route.fulfill({status:404,body:'isolated synthetic review fixture'})};
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[];
 async function setup(populated){
  const context=await browser.newContext({viewport:{width:360,height:650},isMobile:true,hasTouch:true,timezoneId:'Europe/Stockholm'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',serve);
  const fixed=new Date('2026-11-24T16:00:00+01:00');await page.clock.install({time:fixed});await page.clock.setFixedTime(fixed);
  await page.addInitScript(populated=>{
   const names=['Sleep','Work & business','University','Quran & Arabic','Prayer','Nutrition','Fitness','Distraction','Other / review','Study'],base=Date.parse('2026-11-24T06:00:00+01:00');let cursor=base;
   const sessions=populated?names.map((category,i)=>{const start=cursor,end=start+(i+1)*60000;cursor=end;return {id:'synthetic-'+i,name:'Synthetic activity '+i,status:'finished',startAt:start,endAt:end,createdAt:start,segments:[{start,end}],precision:'measured',notes:'Synthetic test fixture',activityDetailsV252:{category}}}):[];
   localStorage.setItem('lifeos-live-v1',JSON.stringify({version:1,sessions,events:[],schedule:[],todos:[]}));
  },populated);
  await page.goto(origin+'/');await page.waitForFunction(()=>window.lifeosTodayAPlusSnapshot&&document.body.classList.contains('ap-today'));await page.locator('#apTab3').click();return {context,page};
 }
 try{
  let {context,page}=await setup(true);const model=await page.evaluate(()=>window.lifeosTodayAPlusSnapshot()),rows=page.locator('#apPage3 [data-ap-live-reviewcat]');assert.equal(model.categories.length,10);assert.equal(await rows.count(),10);assert.equal(await rows.filter({visible:true}).count(),6);
  const summary=page.locator('#apPage3 details summary').filter({hasText:'more categories'});assert((await summary.innerText()).startsWith('Show 4'));await summary.click();await page.waitForFunction(()=>[...document.querySelectorAll('#apPage3 details summary')].some(x=>x.textContent.startsWith('Hide 4 more categories')));assert.equal(await rows.filter({visible:true}).count(),10);
  for(const category of model.categories){const row=page.locator('#apPage3 [data-ap-live-reviewcat]').filter({hasText:category.name}).first(),label=await row.getAttribute('aria-label'),width=await row.locator('.ap-v1-review-track i').evaluate(el=>parseFloat(el.style.width));assert(label.includes(category.name));assert(Math.abs(width-category.durationMs/model.metrics.total*100)<0.001)}
  const target=model.categories.at(-1).name;await page.locator('#apPage3 [data-ap-live-reviewcat]').filter({hasText:target}).last().click();assert.equal(await page.locator('#apTab1').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#apPage1 [data-ap-live-cat]').filter({hasText:target}).first().getAttribute('aria-pressed'),'true');await context.close();
  ({context,page}=await setup(false));assert((await page.locator('#apPage3').innerText()).includes('No recorded activities'));assert.equal(await page.locator('#apPage3 [data-ap-live-reviewcat]').count(),0);assert(!(await page.locator('#apPage3').innerText()).includes('NaN'));await context.close();assert.deepEqual(errors,[]);console.log('PASS: Review category overflow, raw-duration bars, accessible drill-down and empty state');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
