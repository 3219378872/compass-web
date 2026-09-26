const fs=require('fs');const path=require('path');
const repo=path.resolve(process.env.COMPASS_REPO||path.join(__dirname,'../..'));
const deps=path.resolve(process.env.COMPASS_DEPS||path.join(repo,'node_modules'));const app=path.join(repo,'apps/web');const out=path.join(__dirname,'harness-dist');
const esbuild=require(path.join(deps,'esbuild'));const svgr=require(path.join(deps,'@svgr/core'));
const resolveFile=p=>['','.ts','.tsx','.js','/index.ts','/index.tsx'].map(s=>p+s).find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
fs.mkdirSync(out,{recursive:true});
(async()=>{
 await esbuild.build({stdin:{contents:`
 import React from 'react';import {createRoot} from 'react-dom/client';
 import i18n from 'i18next';import {I18nextProvider} from 'react-i18next';
 import MainContent from '${app}/src/modules/collection/MainContent';
 import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
 const queryClient=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}});
 import data from '${app}/public/data/collections.json';
 import en from '${app}/i18n/en/collection.json';import zh from '${app}/i18n/zh/collection.json';
 import commonEn from '${app}/i18n/en/common.json';import commonZh from '${app}/i18n/zh/common.json';
 const lang=new URLSearchParams(location.search).get('lang')||'en';
 i18n.init({lng:lang,resources:{en:{collection:en,common:commonEn},zh:{collection:zh,common:commonZh}},initImmediate:false,interpolation:{escapeValue:false}});
 window.queries=[];window.collectionFixture={total:61,matchCount:1};
 createRoot(document.getElementById('root')).render(<QueryClientProvider client={queryClient}><I18nextProvider i18n={i18n}><h1>Collection search pagination reproduction</h1><p>Actual collection components; deterministic query boundary fixture.</p><MainContent collectionArray={Object.values(data)}/></I18nextProvider></QueryClientProvider>);
 `,resolveDir:repo,loader:'tsx'},bundle:true,outfile:path.join(out,'bundle.js'),platform:'browser',format:'iife',nodePaths:[deps],define:{'process.env.NODE_ENV':'"development"','__dirname':'"/"'},tsconfigRaw:{compilerOptions:{jsx:'react'}},plugins:[{name:'harness',setup(build){
 build.onResolve({filter:/^querystring$/},()=>({path:path.join(deps,'next/dist/compiled/querystring-es3/index.js')}));
 build.onResolve({filter:/^next-i18next$/},()=>({path:path.join(deps,'react-i18next/dist/es/index.js')}));
 build.onResolve({filter:/^@oss-compass\/graphql$/},()=>({path:path.join(repo,'packages/graphql/src/index.ts')}));
 build.onResolve({filter:/^(next\/router|next\/link|@common\/gqlClient)$/},args=>({path:args.path,namespace:'stub'}));
 build.onLoad({filter:/.*/,namespace:'stub'},args=>{
 if(args.path==='next/router')return {contents:`const router={query:{slug:'sql-database'},push:async()=>{}};export const useRouter=()=>router;export default router;`,loader:'js'};
 if(args.path==='next/link')return {contents:`import React from 'react';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}`,loader:'jsx',resolveDir:repo};
  return {contents:`export default {request:async ({variables:params})=>{
 window.queries.push(JSON.parse(JSON.stringify(params)));
 const count=params.keyword==='needle'?window.collectionFixture.matchCount:window.collectionFixture.total;
 const start=(params.page-1)*params.per;const length=Math.max(0,Math.min(params.per,count-start));
 const items=Array.from({length},(_,i)=>({origin:'https://github.com/fixture/'+(params.keyword==='needle'?'needle':(params.keyword||'repo')+'-'+(start+i+1)),shortCode:'s'+(start+i+1),path:'',metricActivity:[{activityScore:1},{activityScore:2}]}));
 return {collectionList:{count,page:params.page,totalPage:Math.ceil(count/params.per),items}};}}`,loader:'jsx',resolveDir:repo};
 });
 for(const [prefix,dir] of [['@common/','src/common/'],['@modules/','src/modules/'],['@public/','public/']])build.onResolve({filter:new RegExp('^'+prefix)},args=>({path:resolveFile(path.join(app,dir,args.path.slice(prefix.length)))}));
 build.onLoad({filter:/\.svg$/},async args=>({contents:await svgr.transform(fs.readFileSync(args.path,'utf8'),{plugins:[require.resolve('@svgr/plugin-jsx',{paths:[deps]})]},{componentName:'SvgIcon'}),loader:'jsx'}));
 }}]});
 const postcss=require(path.join(deps,'postcss'));const tailwind=require(path.join(deps,'tailwindcss'));
 const css=await postcss([tailwind({content:[path.join(app,'src/modules/collection/*.tsx'),path.join(app,'src/modules/explore/RepoCard.tsx')],theme:{screens:{md:{max:'767px'},'>md':{min:'768px'}},extend:{colors:{primary:'#3A5BEF'}}},plugins:[]})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined});
 fs.writeFileSync(path.join(out,'styles.css'),css.css+'body{font-family:system-ui;padding:24px}h1{font-size:24px;margin-bottom:12px}p{margin-bottom:12px}');
 fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
 console.log(JSON.stringify({repo,deps,out,boundary:'Real MainContent, MainHeader, MainMobileHeader, Antd Pagination/Dropdown, RepoCard, ECharts, translations; real generated GraphQL hook and React Query; router, Next Link and GraphQL client transport use local deterministic fixtures.'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
