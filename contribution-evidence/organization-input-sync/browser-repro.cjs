const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('fs');const path=require('path');const assert=require('assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox']});try{const results=[];
for(const lang of ['en','zh'])for(const mode of ['clear','typed-match','selected-match']){
 const page=await browser.newPage({viewport:{width:1000,height:650}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.COMPASS_URL||'http://127.0.0.1:35506')+'/?lang='+lang);await page.waitForFunction(()=>window.orgHarnessReady);const input=page.locator('input').first();await input.waitFor();await page.waitForFunction(()=>window.requests.some(r=>r.variables.keyword==='Original Org'));
 await input.fill(mode==='clear'?'':'New Org');
 if(mode!=='clear')await page.locator('#option-list').getByText('New Org',{exact:true}).waitFor();
 if(mode==='selected-match')await page.locator('#option-list').getByText('New Org',{exact:true}).click();
 const visible=await input.inputValue();await page.screenshot({path:path.join(__dirname,`baseline-${lang}-${mode}.png`),fullPage:true});
 await page.getByRole('button',{name:lang==='en'?'Confirm':'确认',exact:true}).click();await page.waitForFunction(()=>window.mutations.length>0);
 const observed=await page.evaluate(()=>({mutations:window.mutations,queryKeywords:window.requests.filter(r=>r.variables.keyword!==undefined).map(r=>r.variables.keyword),formError:!!document.querySelector('.ant-form-item-has-error')}));
 assert.equal(observed.mutations.length,1);assert.equal(observed.mutations[0].organizations[0].orgName,mode==='selected-match'?'New Org':'Original Org');assert.equal(observed.formError,false);assert.deepEqual(errors,[]);results.push({lang,mode,visible,...observed,errors});await page.close();
}
const report={base:'d709b1898549c5ab4091302a4c26f45bbe198c66',observedAt:new Date().toISOString(),browserVersion:browser.version(),boundary:'Actual OrgEdit/OrgInput/DateRangePicker and Antd form, generated query+mutation hooks and React Query. Synthetic GraphQL client transport captures mutation but never sends it to a server. No auth/profile/backend service exercised.',results};fs.writeFileSync(path.join(__dirname,'baseline-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
