# Chart display keyboard controls: verification evidence

Issue: [oss-compass/compass-web#438](https://github.com/oss-compass/compass-web/issues/438).

Current signed implementation / [PR #439](https://github.com/oss-compass/compass-web/pull/439) head: **`23c027a85c5f331b587bebe9a84269bcf8176197`**.

Browser and targeted regression reruns used the earlier commit `626ef827df99f7450558efe6be3dd968fea156f2`. The later DCO sign-off changed commit metadata only: both commits have tree **`999c8b9db0383998dd1368340fd96fc51647309d`**. No tests were repeated solely for the sign-off; see [signed-head-equivalence.json](signed-head-equivalence.json).
Original upstream baseline: `d709b1898549c5ab4091302a4c26f45bbe198c66`.
Translation submodule: `dbf28145439d9b1f50bb974f8dbaff0ef9f4d702`.

The four chart-display options were clickable `div` elements. Tab skipped every option, while pointer activation updated the store normally. The implementation uses native buttons with visible focus and `aria-pressed`, including the inverted state for Percentage system (`!onePointSys`).

## Results

| Check                                               | Result                                                                                                                           | Evidence                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Original component, English and Chinese             | Tab skipped all four options; pointer activation and persistence worked                                                          | [baseline-browser.json](baseline-browser.json)   |
| Fixed component, English and Chinese                | Tab/Shift+Tab navigation, Enter and Space activation, accessible names, visible focus, pointer activation and persistence passed | [fixed-browser.json](fixed-browser.json)         |
| Six new regression cases against original component | All six failed because the chart options had no button role                                                                      | [red-tests.log](red-tests.log)                   |
| Six regression cases at tested implementation commit       | All six passed                                                                                                                   | [fixed-target-tests.log](fixed-target-tests.log) |
| Full Node 18 Jest gate                              | 28 suites / 119 tests passed                                                                                                     | [fixed-tests.log](fixed-tests.log)               |
| Full Node 18 production build                       | Passed including lint/type checking; 343.77 seconds                                                                              | [fixed-build.log](fixed-build.log)               |

The full Jest/build logs were captured before the commit was created, from the same implementation and test contents. Their recorded SHA256 values were checked against the tested implementation commit; see [fixed-metadata.json](fixed-metadata.json). The portable browser scripts and targeted regression suite were then rerun from `626ef827` in an independent worktree. Its source tree is identical to the signed PR head. The rerun used Playwright 1.62.1 and Chromium 151.0.7922.34; see [portable-rerun.json](portable-rerun.json).

### Screenshots

| Language | Original Tab result                | Fixed Tab result               | Original pointer state            | Fixed pointer state           |
| -------- | ---------------------------------- | ------------------------------ | --------------------------------- | ----------------------------- |
| English  | [before](baseline-en-keyboard.png) | [after](fixed-en-keyboard.png) | [before](baseline-en-pointer.png) | [after](fixed-en-pointer.png) |
| Chinese  | [before](baseline-zh-keyboard.png) | [after](fixed-zh-keyboard.png) | [before](baseline-zh-pointer.png) | [after](fixed-zh-pointer.png) |

## Reproduction

Use Node 18, initialize the pinned translation submodule and install the repository's locked dependencies. Run these commands from the repository root:

```sh
git submodule update --init --recursive
yarn install --frozen-lockfile
node contribution-evidence/chart-display-keyboard/component-harness.cjs
python3 -m http.server 35476 --bind 127.0.0.1 --directory contribution-evidence/chart-display-keyboard/harness-dist
```

In a second terminal, use an existing Playwright installation, or install it outside this repository:

```sh
npm install --prefix /tmp/compass-chart-browser playwright@1.62.1
/tmp/compass-chart-browser/node_modules/.bin/playwright install chromium
PLAYWRIGHT_MODULE=/tmp/compass-chart-browser/node_modules/playwright node contribution-evidence/chart-display-keyboard/browser-repro.cjs
```

The browser runner defaults to the fixed behavior and writes fresh results into the ignored `rerun/` directory. A failed assertion returns a nonzero exit code. It creates fresh browser contexts for each language and uses no real user or report data.

Optional environment variables:

| Variable                   | Default / purpose                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `COMPASS_REPO`             | Repository root inferred from the script location; override to test a separate checkout |
| `COMPASS_DEPS`             | `COMPASS_REPO/node_modules`; override to reuse an already installed dependency tree     |
| `COMPASS_HARNESS_DIR`      | This evidence directory's `harness-dist/`; builder output                               |
| `COMPASS_URL`              | `http://127.0.0.1:35476`; address of the local static server                            |
| `PLAYWRIGHT_MODULE`        | `playwright`; may be an absolute package path                                           |
| `CHROMIUM_EXECUTABLE_PATH` | Playwright's bundled browser; may point to an existing Chromium executable              |
| `EVIDENCE_OUTPUT_DIR`      | This evidence directory's `rerun/`; browser JSON and screenshots                        |
| `REPRO_LABEL`              | `fixed`; set to `baseline` when targeting the original upstream checkout                |

To reproduce the original behavior, create a separate checkout of the baseline commit, initialize its translation submodule, and set `COMPASS_REPO` to that checkout for both scripts. Build and serve its harness, then run the browser script with `REPRO_LABEL=baseline`. Baseline mode succeeds only when the original keyboard failure and working pointer behavior are observed.

The committed regression suite can also be run directly:

```sh
yarn test:ci --runInBand --runTestsByPath src/modules/analyze/components/NavBar/ChartDisplaySetting.test.tsx
```

## Test boundary and related work

The browser harness mounts the **real, unmodified-for-testing `ChartDisplaySetting` component** with its real React implementation, translated labels, SVGs, Valtio chart-setting store and browser localStorage. The `next-i18next` hook resolves to its real `react-i18next` re-export, and the store barrel resolves to the same underlying chart-setting module. The before/after buttons and explanatory text are harness scaffolding. Product-option focus styles come from the component's actual Tailwind classes; extra harness focus styling applies only to its surrounding buttons.

These checks do not exercise a complete Next.js report route, chart rendering, the settings popover, backend requests, a production service, or a screen reader. Browser role/name checks establish the emitted accessibility semantics, not a screen-reader acceptance result.

[#413](https://github.com/oss-compass/compass-web/pull/413) covers the parent settings trigger, popover Escape/focus restoration and badge dialog. It leaves `ChartDisplaySetting` unchanged and mocks that child in its tests. This implementation changes only the four chart-display options and their regression tests; it does not edit `NavbarSetting`, `Badge` or `RepoFilter`. On upstream main, the parent settings trigger's keyboard reachability remains separate work covered by #413, so this patch alone does not establish a fully keyboard-accessible menu-opening flow.

Generated bundles, node_modules and full historical GitHub API responses are excluded from this evidence directory.
