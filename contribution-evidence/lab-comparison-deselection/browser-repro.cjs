const { chromium } = require('/home/dev/.local/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const output = process.env.REPRO_LABEL || 'baseline';
const base = process.env.COMPASS_URL || 'http://127.0.0.1:35470';
const model = {
  id: 1, reportId: 1, modelId: 7, modelName: 'Synthetic comparison regression',
  version: 'v1', versionId: 11, isPublic: false,
  triggerStatus: 'success', triggerUpdatedAt: null, parentLabModel: null,
  metrics: [{ ident: 'commit_count' }],
  datasetStatus: { items: ['alpha', 'beta', 'gamma'].map((shortCode) => ({
    label: `https://github.com/example/${shortCode}`,
    shortCode, secondIdent: 'test', logoUrl: '', triggerStatus: 'success', triggerUpdatedAt: null,
  })) },
};
(async () => {
 const browser = await chromium.launch({executablePath:'/home/dev/.local/bin/chromium',headless:true,args:['--no-sandbox']});
 const context = await browser.newContext({viewport:{width:1440,height:1000},locale:'en-US'});
 await context.addCookies([{name:'locale',value:'en',url:base}]);
 const page=await context.newPage(); const errors=[]; const queries=[];
 page.on('pageerror', e=>errors.push(e.message));
 await page.route('**/api/graphql', async route=> {
   const req=route.request().postDataJSON(); const q=req.query; queries.push(q.match(/query\s+(\w+)/)?.[1] || 'unknown');
   let data={};
   if(q.includes('query userinfo')) data={currentUser:{id:1,name:'Synthetic local user',roleLevel:1,dashboardRole:false,email:'synthetic@example.invalid',language:'en',emailVerified:true,loginBinds:[],contributingOrgs:[]}};
   else if(q.includes('query myModelReports')) data={myModelReports:{page:1,totalPage:1,count:1,items:[model]}};
   await route.fulfill({json:{data}});
 });
 await page.goto(`${base}/lab/report/my`,{waitUntil:'domcontentloaded',timeout:180000});
 await page.getByText('Pick for compare',{exact:true}).click({timeout:180000});
 const boxes=page.locator('input[type=checkbox]');
 await boxes.nth(0).click(); await boxes.nth(1).click(); await boxes.nth(2).click();
 const selected=()=>boxes.evaluateAll(elements=>elements.map((e,i)=>({repo:['alpha','beta','gamma'][i],checked:e.checked})));
 const before=await selected();
 await page.screenshot({path:path.join(root,`${output}-before.png`),fullPage:true});
 await boxes.nth(1).click();
 const after=await selected();
 await page.screenshot({path:path.join(root,`${output}-after.png`),fullPage:true});
 const urlBefore=page.url();
 await page.getByText('Compare',{exact:true}).click();
 if (output !== 'baseline') {
   await page.waitForURL('**/analyze/alpha..gamma?range=1Y', {timeout:180000});
 } else {
   await page.waitForTimeout(500);
 }
 const urlAfter=page.url();
 const result={baseline:'d709b1898549c5ab4091302a4c26f45bbe198c66',label:output,before,after,urlBefore,urlAfter,errors,queries,mockBoundary:'Only /api/graphql is intercepted with synthetic user and report data. Actual Next.js /lab/report/my, ReportItem, DataSetPanel, RepoCard and RepoCompareBar execute unchanged.'};
 fs.writeFileSync(path.join(root,`${output}-browser.json`),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
