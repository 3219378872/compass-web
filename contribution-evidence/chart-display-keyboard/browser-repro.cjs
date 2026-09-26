const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const repo = path.resolve(
  process.env.COMPASS_REPO || path.join(__dirname, '../..')
);
const output = path.resolve(
  process.env.EVIDENCE_OUTPUT_DIR || path.join(__dirname, 'rerun')
);
fs.mkdirSync(output, { recursive: true });
const base = process.env.COMPASS_URL || 'http://127.0.0.1:35476';
const label = process.env.REPRO_LABEL || 'fixed';
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ['--no-sandbox'],
  });
  const results = [];
  for (const lang of ['en', 'zh']) {
    const context = await browser.newContext({
      viewport: { width: 960, height: 740 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/?lang=${lang}`);
    await page.waitForFunction(() => window.chartSettingsReady);
    const state = () => page.evaluate(() => window.readChartSettings());
    const initial = await state();
    const controls = page.locator('#chart-options > :not(:first-child)');
    assert.equal(await controls.count(), 4);
    const domBefore = await controls.evaluateAll((els) =>
      els.map((e) => ({
        tag: e.tagName,
        text: e.textContent,
        tabIndex: e.tabIndex,
        role: e.getAttribute('role'),
        pressed: e.getAttribute('aria-pressed'),
      }))
    );
    assert.equal(
      domBefore.some((c) => c.text.includes('analyze:')),
      false,
      'Real translated labels must render'
    );
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    const firstTab = await page.evaluate(() => ({
      id: document.activeElement.id,
      tag: document.activeElement.tagName,
      text: document.activeElement.textContent,
    }));
    const ariaBefore = await page.locator('#chart-options').ariaSnapshot();
    const keyboardSteps = [];
    await page.screenshot({
      path: path.join(output, `${label}-${lang}-keyboard.png`),
      fullPage: true,
    });
    if (label === 'baseline') {
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
    } else {
      const keys = ['showAvg', 'showMedian', 'onePointSys', 'yAxisScale'];
      const messages = JSON.parse(
        fs.readFileSync(
          path.join(repo, `apps/web/i18n/${lang}/analyze.json`),
          'utf8'
        )
      );
      const names = [
        messages.avg_line.show,
        messages.median_line.show,
        messages.mark.percentage,
        messages.y_axis_scale,
      ];
      for (let i = 0; i < 4; i++)
        assert.equal(
          await page
            .locator('#chart-options')
            .getByRole('button', { name: names[i], exact: true })
            .count(),
          1,
          'Each real SVG-decorated button retains its translated accessible name'
        );
      for (let i = 0; i < 4; i++) {
        assert.equal(
          await controls.nth(i).evaluate((e) => e === document.activeElement),
          true,
          `Tab visits option ${i}`
        );
        const focus = await controls
          .nth(i)
          .evaluate((e) => ({
            outlineStyle: getComputedStyle(e).outlineStyle,
            outlineWidth: getComputedStyle(e).outlineWidth,
          }));
        assert.equal(focus.outlineStyle, 'solid');
        assert.ok(parseFloat(focus.outlineWidth) >= 2);
        await page.keyboard.press('Enter');
        const afterEnter = await state();
        const expected = { ...initial, [keys[i]]: !initial[keys[i]] };
        assert.deepEqual(
          afterEnter,
          expected,
          `Enter toggles only ${keys[i]} once`
        );
        assert.equal(
          await controls.nth(i).getAttribute('aria-pressed'),
          String(i === 2 ? !afterEnter.onePointSys : afterEnter[keys[i]])
        );
        await page.keyboard.press('Space');
        const afterSpace = await state();
        assert.deepEqual(
          afterSpace,
          initial,
          `Space toggles only ${keys[i]} once`
        );
        assert.equal(
          await controls.nth(i).getAttribute('aria-pressed'),
          String(i === 2 ? !afterSpace.onePointSys : afterSpace[keys[i]])
        );
        keyboardSteps.push({
          index: i,
          setting: keys[i],
          focus,
          afterEnter,
          afterSpace,
        });
        await page.keyboard.press('Tab');
      }
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        'after'
      );
      await page.keyboard.press('Shift+Tab');
      assert.equal(
        await controls.nth(3).evaluate((e) => e === document.activeElement),
        true
      );
    }
    const keyboardState = await state();
    const clicks = [];
    for (let i = 0; i < 4; i++) {
      await controls.nth(i).click();
      clicks.push(await state());
    }
    const pointerState = await state();
    await page.screenshot({
      path: path.join(output, `${label}-${lang}-pointer.png`),
      fullPage: true,
    });
    const persisted = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('analyze.setting.chart'))
    );
    await page.reload();
    await page.waitForFunction(() => window.chartSettingsReady);
    const afterReload = await state();
    const domAfterReload = await controls.evaluateAll((els) =>
      els.map((e) => ({
        tag: e.tagName,
        text: e.textContent,
        tabIndex: e.tabIndex,
        pressed: e.getAttribute('aria-pressed'),
      }))
    );
    if (label !== 'baseline') {
      assert.deepEqual(
        domBefore.map((c) => c.tag),
        ['BUTTON', 'BUTTON', 'BUTTON', 'BUTTON']
      );
      assert.deepEqual(
        domBefore.map((c) => c.pressed),
        ['false', 'false', 'true', 'true']
      );
      assert.deepEqual(
        domAfterReload.map((c) => c.pressed),
        ['true', 'true', 'false', 'false']
      );
    }
    assert.deepEqual(persisted, pointerState);
    assert.deepEqual(afterReload, pointerState);
    assert.equal(errors.length, 0);
    if (label === 'baseline') {
      assert.equal(firstTab.id, 'after');
      assert.deepEqual(keyboardState, initial);
      assert.deepEqual(
        domBefore.map((c) => c.tag),
        ['DIV', 'DIV', 'DIV', 'DIV']
      );
      assert.deepEqual(pointerState, {
        showAvg: true,
        showMedian: true,
        onePointSys: true,
        repoType: 'software-artifact',
        yAxisScale: false,
      });
    }
    results.push({
      lang,
      initial,
      domBefore,
      ariaBefore,
      firstTab,
      keyboardState,
      keyboardSteps,
      clicks,
      pointerState,
      persisted,
      afterReload,
      domAfterReload,
      errors,
    });
    await context.close();
  }
  const sourceCommit = require('child_process')
    .execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    })
    .trim();
  const report = {
    label,
    sourceCommit,
    upstreamBase: 'd709b1898549c5ab4091302a4c26f45bbe198c66',
    browserVersion: browser.version(),
    observedAt: new Date().toISOString(),
    boundary:
      'Isolated real ChartDisplaySetting component with real React, Valtio chartUserSetting store, localStorage, translations and SVGs. Native before/after buttons are harness scaffolding. No report route, chart rendering, NavbarSetting popover, API, or backend is exercised.',
    results,
  };
  fs.writeFileSync(
    path.join(output, `${label}-browser.json`),
    JSON.stringify(report, null, 2) + '\n'
  );
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
