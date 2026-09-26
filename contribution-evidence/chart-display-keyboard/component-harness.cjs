const fs = require('fs');
const path = require('path');
const repo = path.resolve(
  process.env.COMPASS_REPO || path.join(__dirname, '../..')
);
const deps = path.resolve(
  process.env.COMPASS_DEPS || path.join(repo, 'node_modules')
);
const esbuild = require(path.join(deps, 'esbuild'));
const svgr = require(path.join(deps, '@svgr/core'));
const out = path.resolve(
  process.env.COMPASS_HARNESS_DIR || path.join(__dirname, 'harness-dist')
);
const app = path.join(repo, 'apps/web');
fs.mkdirSync(out, { recursive: true });
(async () => {
  await esbuild.build({
    stdin: {
      contents: `
    import React from 'react';
    import {createRoot} from 'react-dom/client';
    import i18n from 'i18next';
    import {I18nextProvider} from 'react-i18next';
    import {snapshot} from 'valtio';
    import ChartDisplaySetting from ${JSON.stringify(
      path.join(
        app,
        'src/modules/analyze/components/NavBar/ChartDisplaySetting'
      )
    )};
    import {chartUserSettingState} from ${JSON.stringify(
      path.join(app, 'src/modules/analyze/store/chartUserSetting')
    )};
    import en from ${JSON.stringify(path.join(app, 'i18n/en/analyze.json'))};
    import zh from ${JSON.stringify(path.join(app, 'i18n/zh/analyze.json'))};
    const lang=new URLSearchParams(location.search).get('lang') || 'en';
    i18n.init({lng:lang,resources:{en:{analyze:en},zh:{analyze:zh}},defaultNS:'analyze',initImmediate:false,interpolation:{escapeValue:false}});
    window.readChartSettings=()=>snapshot(chartUserSettingState);
    window.chartSettingsReady=false;
    function Harness(){React.useEffect(()=>{window.chartSettingsReady=true},[]);return <I18nextProvider i18n={i18n}><h1>Chart display keyboard reproduction</h1><p>Actual upstream component and persisted Valtio store, isolated from report routing.</p><button id="before">Before chart options</button><section id="chart-options" aria-label="Chart options"><ChartDisplaySetting/></section><button id="after">After chart options</button><pre id="note">Tab should visit all four options between these buttons.</pre></I18nextProvider>}
    createRoot(document.getElementById('root')).render(<Harness/>);
  `,
      resolveDir: repo,
      loader: 'tsx',
    },
    bundle: true,
    outfile: path.join(out, 'bundle.js'),
    platform: 'browser',
    format: 'iife',
    nodePaths: [deps],
    define: { 'process.env.NODE_ENV': '"development"' },
    tsconfigRaw: { compilerOptions: { jsx: 'react' } },
    plugins: [
      {
        name: 'upstream-component-resolution',
        setup(build) {
          build.onResolve({ filter: /^next-i18next$/ }, () => ({
            path: path.join(deps, 'react-i18next/dist/es/index.js'),
          }));
          build.onResolve({ filter: /^@modules\/analyze\/store$/ }, () => ({
            path: path.join(
              app,
              'src/modules/analyze/store/chartUserSetting.ts'
            ),
          }));
          build.onResolve({ filter: /^@common\// }, (args) => ({
            path: path.join(
              app,
              'src/common',
              args.path.slice('@common/'.length) + '.ts'
            ),
          }));
          build.onResolve({ filter: /^public\// }, (args) => ({
            path: path.join(app, args.path),
          }));
          build.onLoad({ filter: /\.svg$/ }, async (args) => ({
            contents: await svgr.transform(
              fs.readFileSync(args.path, 'utf8'),
              {
                plugins: [
                  require.resolve('@svgr/plugin-jsx', { paths: [deps] }),
                ],
              },
              { componentName: 'SvgIcon' }
            ),
            loader: 'jsx',
          }));
        },
      },
    ],
  });
  const postcss = require(path.join(deps, 'postcss'));
  const tailwind = require(path.join(deps, 'tailwindcss'));
  const css = await postcss([
    tailwind({
      content: [
        path.join(
          app,
          'src/modules/analyze/components/NavBar/ChartDisplaySetting.tsx'
        ),
      ],
      theme: { extend: { colors: { primary: '#3A5BEF' } } },
      plugins: [],
    }),
  ]).process('@tailwind base;@tailwind components;@tailwind utilities;', {
    from: undefined,
  });
  fs.writeFileSync(
    path.join(out, 'styles.css'),
    css.css +
      '\nbody{font-family:system-ui;padding:32px;color:#222}h1{font-size:22px;font-weight:600;margin-bottom:12px}p{margin-bottom:20px}#chart-options{width:200px;background:#fff;border:1px solid #ddd;margin:16px 0;padding:8px 0;border-radius:4px;box-shadow:0 3px 12px #ddd;font-size:12px}#chart-options svg{width:16px;height:16px}#before,#after{border:1px solid #888;padding:6px 12px;border-radius:4px}#before:focus-visible,#after:focus-visible{outline:3px solid #3455f0;outline-offset:3px}#note{margin-top:24px;font-size:13px}'
  );
  fs.writeFileSync(
    path.join(out, 'index.html'),
    '<!doctype html><html><head><meta charset="UTF-8"><title>Chart settings reproduction</title><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>'
  );
  console.log(
    JSON.stringify(
      {
        repo,
        deps,
        component: 'ChartDisplaySetting.tsx',
        out,
        boundary:
          'Actual React component, SVGs, translations and chartUserSetting store; next-i18next useTranslation resolved to its real react-i18next re-export; report page and NavbarSetting omitted.',
      },
      null,
      2
    )
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
