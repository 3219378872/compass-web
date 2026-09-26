const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs');const path=require('path');const assert=require('assert/strict');
const base=process.env.COMPASS_URL||'http://127.0.0.1:35496';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox']});
try{const results=[];
for(const lang of ['en','zh'])for(const method of ['enter','click']){
 const page=await browser.newPage({viewport:{width:1360,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?lang='+lang);await page.getByRole('link',{name:'repo-1',exact:true}).waitFor();
 const input=page.getByPlaceholder(lang==='en'?'Search repository':'搜索仓库');
 const submit=async keyword=>{await input.fill(keyword);if(method==='enter'&&keyword)await input.press('Enter');else await input.locator('..').locator('div').click();};
 await page.locator('.ant-dropdown-trigger').hover();await page.getByText(lang==='en'?'Ascending order of activity':'按活跃度升序',{exact:true}).click();
 await page.waitForFunction(()=>window.queries.at(-1)?.sortOpts.direction==='asc');
 await page.locator('.ant-pagination-item-2').click();await page.getByRole('link',{name:'repo-31',exact:true}).waitFor();
 await submit('needle');await page.getByRole('link',{name:'needle',exact:true}).waitFor();
 const narrow=await page.evaluate(()=>({queries:window.queries.filter(q=>q.keyword==='needle'),cards:document.querySelectorAll('a[href^="/analyze/"]').length,page:document.querySelector('.ant-pagination-item-active')?.textContent}));
 assert.deepEqual(narrow.queries.map(q=>q.page),[1]);assert.equal(narrow.cards,1);assert.equal(narrow.page,'1');assert.equal(narrow.queries[0].per,30);assert.deepEqual(narrow.queries[0].sortOpts,{type:'activity_score',direction:'asc'});
 await page.screenshot({path:path.join(__dirname,`fixed-${lang}-${method}-search.png`),fullPage:true});
 await submit('broad');await page.getByRole('link',{name:'broad-1',exact:true}).waitFor();await page.locator('.ant-pagination-item-2').click();await page.getByRole('link',{name:'broad-31',exact:true}).waitFor();
 const broad=await page.evaluate(()=>window.queries.filter(q=>q.keyword==='broad'));assert.deepEqual(broad.map(q=>q.page),[1,2]);
 await submit('');await page.getByRole('link',{name:'repo-1',exact:true}).waitFor();
 const cleared=await page.evaluate(()=>({query:window.queries.at(-1),page:document.querySelector('.ant-pagination-item-active')?.textContent,cards:document.querySelectorAll('a[href^="/analyze/"]').length}));
 assert.equal(cleared.query.keyword,'');assert.equal(cleared.query.page,1);assert.equal(cleared.page,'1');assert.equal(cleared.cards,30);assert.deepEqual(cleared.query.sortOpts,{type:'activity_score',direction:'asc'});assert.equal(errors.length,0);
 results.push({lang,method,narrow,broad,cleared,errors});await page.close();
}
const report={upstreamBase:'d709b1898549c5ab4091302a4c26f45bbe198c66',observedAt:new Date().toISOString(),browserVersion:browser.version(),boundary:'Actual collection components, Antd pagination/dropdown, RepoCard/ECharts, generated GraphQL hook and React Query. Synthetic GraphQL client transport and Next routing/link. No full-app/backend/provider claim.',results};fs.writeFileSync(path.join(__dirname,'fixed-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
