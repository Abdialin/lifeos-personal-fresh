const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 fs.mkdirSync('today-verification',{recursive:true});
 try{
 const html=fs.readFileSync('index.html','utf8');
 const css=[...html.matchAll(/<style[^>]*id="(?:today-a-plus-foundation|ap-verification-fixes)"[^>]*>[\s\S]*?<\/style>/g)].map(x=>x[0]);
 const scripts=['today-a-plus-foundation-script','today-a-plus-visual-components'].map(id=>{const start=html.indexOf('<script id="'+id+'">');assert(start>=0,id);return html.slice(start,html.indexOf('</script>',start)+9)});
 const visualStyle=html.slice(html.lastIndexOf('<style>',html.indexOf(scripts[1])),html.indexOf(scripts[1]));
 for(const width of [360,393,412]){
 const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:14px system-ui;background:#0b1220}.lifeos-nav{position:fixed;bottom:0;left:0;right:0;background:#142033;color:white;z-index:10;padding:12px}</style>'+css.join('')+visualStyle+'<main class="wrap"><nav id="lifeosNavigation" class="lifeos-nav"><button data-view="dashboard" aria-current="page">Today</button><button data-view="tracking">Track</button></nav><article id="todayOverview">Legacy Today</article><section id="loTrackConceptA">Track</section></main>'+scripts.join(''));
 await page.locator('#todayAPlus').waitFor({state:'visible'});
 for(let i=0;i<4;i++){
 await page.locator('#apTab'+i).click();
 assert.equal(await page.locator('.ap-page:visible').count(),1);
 assert(await page.locator('#apPage'+i).isVisible());
 assert(!(await page.locator('#loTrackConceptA').isVisible()));
 assert(!(await page.locator('#todayOverview').isVisible()));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width+' tab '+i);
 await page.screenshot({path:'today-verification/'+width+'-tab-'+i+'.png',fullPage:true});
 }
 await page.locator('#apTab1').click();
 await page.locator('[data-ap-period="0"]').click();
 await page.locator('[data-ap-cat="0"]').click();
 assert((await page.locator('#apDonut').textContent()).includes('7h 4m'));
 await page.locator('#apTab2').click();
 await page.locator('#apFree').uncheck();
 assert.equal(await page.locator('.ap-free:visible').count(),0);
 await page.locator('[data-ap-day="1"]').click();
 assert(await page.locator('#apAgendaTomorrow').isVisible());
 assert(!(await page.locator('#apAgendaToday').isVisible()));
 await page.getByRole('button',{name:'Light / dark'}).click();
 assert(await page.locator('#todayAPlus.ap-light').count());
 await page.screenshot({path:'today-verification/'+width+'-light.png',fullPage:true});
 await page.evaluate(()=>{document.querySelector('[data-view=dashboard]').removeAttribute('aria-current');document.querySelector('[data-view=tracking]').setAttribute('aria-current','page')});
 await page.locator('#todayAPlus').waitFor({state:'hidden'});
 assert(await page.locator('#loTrackConceptA').isVisible());
 assert.deepEqual(errors,[]);
 await page.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
