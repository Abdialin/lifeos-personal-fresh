// Reproducible synthetic screenshots. Every request is intercepted; no live account or API is used.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd(),origin='https://lifeos-today-aplus-preview.onrender.com';
const output='docs/design';
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:393,height:780},isMobile:true,hasTouch:true,timezoneId:'Europe/Stockholm',deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const req=route.request(),u=new URL(req.url()),file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));
  if(u.origin===origin&&req.method()==='GET'&&file.startsWith(root+path.sep)&&/\.(html|js|css|png|svg|json|webmanifest|ico)$/.test(file)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
  return route.fulfill({status:404,body:'offline synthetic visual fixture'});
 });
 const fixed=new Date('2026-11-24T16:00:00+01:00');await page.clock.install({time:fixed});await page.clock.setFixedTime(fixed);
 await page.addInitScript(()=>{
  const t=(h,m=0)=>new Date(2026,10,24,h,m).getTime();
  const record=(id,name,a,b,category)=>({id,name,status:'finished',createdAt:t(a),startAt:t(a),endAt:t(b),segments:[{start:t(a),end:t(b)}],precision:'measured',source:'visual-fixture',notes:'Synthetic visual fixture',activityDetailsV252:{category}});
  const sessions=[record('visual-sleep','Sleep',0,7,'Sleep'),record('visual-study','University study',8,10,'University'),record('visual-work','App development',9,11,'Work & business'),record('visual-meal','Lunch',12,13,'Nutrition'),record('visual-gym','Gym',13,14,'Fitness'),{id:'visual-live',name:'Reading',status:'running',createdAt:t(15,30),startAt:t(15,30),endAt:null,segments:[{start:t(15,30),end:null}],precision:'measured',source:'visual-fixture',notes:'Synthetic visual fixture'}];
  const schedule=[{id:'visual-plan-1',name:'Evening commitment',startAt:t(17),endAt:t(18),status:'planned',createdAt:t(0),sessionId:null,reminder:false,notes:'Synthetic visual fixture'},{id:'visual-plan-2',name:'Gym tomorrow',startAt:new Date(2026,10,25,9).getTime(),endAt:new Date(2026,10,25,10).getTime(),status:'planned',createdAt:t(0),sessionId:null,reminder:false,notes:'Synthetic visual fixture'}];
  const todos=[{id:'visual-task',name:'Prepare weekly work',due:'2026-11-24',dueTime:'15:00',timingType:'deadline',priority:'high',done:false,createdAt:t(0)}];
  const goals=[{id:'visual-goal-1',name:'Gym three times weekly',category:'fitness',target:3,unit:'sessions',createdAt:t(0)},{id:'visual-goal-2',name:'Study eight hours',category:'sessions',match:'study',target:8,unit:'hours',createdAt:t(0)}];
  localStorage.setItem('lifeos-live-v1',JSON.stringify({version:1,sessions,events:[],schedule,todos,goals,workouts:[],meals:[],personalLogs:[]}));
 });
 const shot=async(section,name)=>{const dir=path.join(output,section,'current');fs.mkdirSync(dir,{recursive:true});await page.screenshot({path:path.join(dir,name+'.png')})};
 const tab=async i=>{await page.locator('#apTab'+i).click();await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(250)};
 const nav=async v=>{await page.locator('#lifeosNavigation [data-view="'+v+'"]').click();await page.waitForFunction(x=>document.body.dataset.lifeosView===x,v);await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(350)};
 try{
  await page.goto(origin+'/');await page.waitForFunction(()=>document.body.classList.contains('lo-ca-ready')&&window.lifeosTodayAPlusSnapshot);
  await shot('global','navigation-dark');
  for(const [i,name] of ['overview','timeline','agenda','review'].entries()){
   await tab(i);await shot('today',name+'-top');await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(120);await shot('today',name+'-bottom');
  }
  await tab(0);await page.locator('#todayAPlus .ap-header button').click();await shot('today','overview-light');await page.locator('#todayAPlus .ap-header button').click();
  await tab(1);await page.locator('[data-ap-live-period="0"]').click();await page.locator('svg [data-ap-detail="record"][data-ap-key="visual-sleep"]').click();await shot('today','activity-details');await page.locator('#loCADialog [data-ca-close]').last().click();
  const gap=await page.evaluate(()=>window.lifeosTodayAPlusSnapshot().gaps.find(g=>g.b-g.a>=1800000));
  if(!gap||!await page.evaluate(g=>window.lifeosTodayAPlusAction('gap',g.a+':'+g.b),gap))throw Error('Synthetic gap not available');
  await page.waitForFunction(()=>{const sheet=document.querySelector('#loCADialog .ca-sheet'),save=document.querySelector('[data-ca-save-past]');return sheet&&save&&save.getBoundingClientRect().bottom<=sheet.getBoundingClientRect().bottom});
  await page.waitForTimeout(150);await shot('today','gap-entry');await page.locator('#loCADialog [data-ca-close]').last().click();
  await nav('tracking');for(const name of ['live','history','review']){await page.locator('[data-ca-tab="'+name+'"]').click();await page.waitForTimeout(250);await page.evaluate(()=>window.scrollTo(0,0));await shot('track',name)}
  await nav('schedule');await shot('plan','overview');
  for(const name of ['calendar','tasks','compare','improve','review','more']){await page.locator('.v136-nav [data-v136-tab="'+name+'"]').click();await page.waitForTimeout(200);await page.evaluate(()=>window.scrollTo(0,0));await shot('plan',name)}
  await nav('goals');for(const name of ['overview','improve','history']){await page.locator('#gv161-app [role="tab"][data-v161-tab="'+name+'"]').click();await page.waitForTimeout(200);await page.evaluate(()=>window.scrollTo(0,0));await shot('goals',name)}
  await nav('analytics');await shot('insights','overview');
  await nav('life');for(const name of ['Overview','Routines','Fitness','Nutrition','Friends']){await page.locator('#loLifeSectionTabs').getByRole('button',{name,exact:true}).click();await page.waitForTimeout(200);await page.evaluate(()=>window.scrollTo(0,0));await shot('my-life',name.toLowerCase())}
  if(errors.length)throw Error('Page errors: '+errors.join('; '));
  console.log('Captured synthetic 393×780 design snapshots for six sections; all requests intercepted.');
 }finally{await context.close();await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
