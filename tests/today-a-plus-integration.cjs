const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const http=require('node:http');
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Offline test: no live data connection'}))}
 const file=path.resolve(process.cwd(),'.'+(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
 res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 fs.mkdirSync('today-verification/integration',{recursive:true});
 try{
 for(const width of [360,393,412]){
 const page=await browser.newPage({viewport:{width,height:800},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
 await page.goto(origin+'/#dashboard',{waitUntil:'domcontentloaded'});
 const nav=page.locator('#lifeosNavigation');
 assert.equal(await nav.locator('button[data-view]').count(),6);
 await page.locator('#todayAPlus').waitFor({state:'visible'});
 for(let i=0;i<4;i++){
 await page.locator('#apTab'+i).click();
 assert.equal(await page.locator('.ap-page:visible').count(),1);
 assert(!(await page.locator('#todayOverview').isVisible()));
 assert.equal(await page.locator('#loTrackConceptA:visible,#loTrackWorkspaces:visible').count(),0);
 await page.screenshot({path:'today-verification/integration/'+width+'-tab-'+i+'-top.png'});
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 await page.screenshot({path:'today-verification/integration/'+width+'-tab-'+i+'-bottom.png'});
 const last=page.locator('#apPage'+i+' > :last-child');
 const box=await last.boundingBox(), n=await nav.boundingBox();
 assert(box&&n&&box.y+box.height<=n.y+2,'Last card obstructed: '+width+' tab '+i);
 await page.evaluate(()=>window.scrollTo(0,0));
 }
 for(const view of ['tracking','schedule','goals','analytics','life','dashboard']){
 await nav.locator('[data-view="'+view+'"]').click();
 await page.waitForFunction(v=>document.body.dataset.lifeosView===v,view);
 assert.equal(await page.locator('#todayAPlus').isVisible(),view==='dashboard');
 if(view==='tracking'){
 await page.screenshot({path:'today-verification/integration/'+width+'-track.png'});
 assert(await page.locator('#loTrackConceptA:visible,#loTrackWorkspaces:visible,#trackActivePanel:visible').count(),'No Track content visible');
 }
 }
 fs.writeFileSync('today-verification/integration/'+width+'-errors.json',JSON.stringify(errors,null,2));
 await page.close();
 }
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
