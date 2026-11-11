// V5 design contract + render smoke without a browser dependency.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('personal_design_v5.css','utf8');
const theme=fs.readFileSync('personal_visual_experience_v5.js','utf8');
const visuals=fs.readFileSync('personal_visual_intelligence_v4.js','utf8');
const analytics=require('./lifeos_unified_analytics.js');
const planner=require('./personal_predictive_planner.js');
assert.match(html,/<link rel="stylesheet" href="personal_design_v5\.css">/);
assert.match(html,/<script src="personal_visual_experience_v5\.js" defer><\/script>/);
assert.match(css,/data-lifeos-theme="light"/,'Light mode must have defined colours');
assert.match(css,/\.v5-donut/,'Donut chart styles must be loaded');
assert.match(css,/\.v5-week-chart/,'Weekly comparison chart styles must be loaded');
assert.doesNotThrow(()=>new Function(theme));
assert.doesNotThrow(()=>new Function(visuals));

// Exercise the actual theme toggle with a minimal DOM.
const storage=new Map(),top={children:[],querySelector(){return null},appendChild(x){this.children.push(x)}};
const status={id:'status'},doc={
 readyState:'complete',documentElement:{dataset:{}},
 querySelector(x){return x==='.top'?top:null},
 getElementById(x){return x==='status'?status:null},
 createElement(){return {dataset:{},children:[],attributes:{},appendChild(x){this.children.push(x)},setAttribute(k,v){this.attributes[k]=v},addEventListener(k,fn){this['on'+k]=fn}}}
};
new Function('document','localStorage',theme)(doc,{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)});
assert.equal(top.children.length,1);
const toggle=top.children[0].children[1];
assert.equal(doc.documentElement.dataset.lifeosTheme,'dark');
toggle.onclick();
assert.equal(doc.documentElement.dataset.lifeosTheme,'light');
assert.equal(storage.get('lifeos.personal.theme.v5'),'light');
assert.equal(toggle.attributes['aria-pressed'],'true');
toggle.onclick();assert.equal(doc.documentElement.dataset.lifeosTheme,'dark');

// Exercise V4 actual render functions using the same analytics/planner engines as index.html.
const nodes={},handlers={},today={insertAdjacentElement(_,section){nodes[section.id]=section}};
const nav={addEventListener(name,fn){handlers[name]=fn}};
nodes.todayOverview=today;nodes.lifeosNavigation=nav;
const model={sessions:[{id:'a',name:'Study & review',status:'finished',startAt:Date.now()-7200000,endAt:Date.now()-3600000}],schedule:[],idealRoutines:[]};
const viewDoc={
 readyState:'complete',hidden:false,body:{dataset:{lifeosView:'dashboard'}},
 head:{appendChild(){}},
 createElement(type){return {dataset:{},hidden:false,setAttribute(){},innerHTML:''}},
 getElementById(id){return nodes[id]||null},
 addEventListener(){}
};
const win={LifeOSUnifiedAnalytics:analytics,LifeOSPersonalPlanner:planner,
 lifeosReadOnlyWorkspace:()=>JSON.parse(JSON.stringify(model)),
 addEventListener(){}};
new Function('window','document','setTimeout','setInterval','console',visuals)(
 win,viewDoc,fn=>{fn();return 0},()=>0,{warn(){}});
assert.match(nodes.v4Today.innerHTML,/Your 24-hour reality/);
viewDoc.body.dataset.lifeosView='analytics';handlers.click();
assert.match(nodes.v4Insights.innerHTML,/Last seven days/);
assert.match(nodes.v4Insights.innerHTML,/Recorded time mix/);
assert.match(nodes.v4Insights.innerHTML,/v5-donut/);
assert.match(nodes.v4Insights.innerHTML,/Study &amp; review/,'HTML must escape activity labels');
viewDoc.body.dataset.lifeosView='schedule';handlers.click();
assert.match(nodes.v4Plan.innerHTML,/This week's time balance/);
assert.match(nodes.v4Plan.innerHTML,/v5-week-chart/);
assert.match(nodes.v4Plan.innerHTML,/My Predicted Week/);
assert.match(nodes.v4Plan.innerHTML,/data-v4-review-ideal/);
assert.equal(nodes.v4Plan.hidden,false);
console.log('Personal V5 design and render checks PASS');
