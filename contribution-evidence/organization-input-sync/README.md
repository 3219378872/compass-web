# Organization input/form synchronization evidence

Issue: https://github.com/oss-compass/compass-web/issues/442

The organization editor previously changed its visible input without notifying the form until an autocomplete search returned no matches or a suggestion was selected. Clearing the input could therefore submit the old organization instead of triggering required validation; typing a matching organization name could also submit the old one.

The fix notifies the form immediately for every typed value, including empty input, and removes autocomplete responses as a writer of form values. Suggestion selection remains available.

Upstream baseline: `d709b1898549c5ab4091302a4c26f45bbe198c66`. [Source hashes](source-hashes.json) bind these results to implementation commit `17692cff93a0f48ef8db0a31b6b37e65e81a2a92` (tree `92e3231d9d0635bfd6390249c21493290de07bc8`). The final committed files match both recorded SHA-256 values. The portable harness was rebuilt from this evidence branch at its final path and all six fixed browser flows were rerun successfully.

| Validation | Result |
| --- | --- |
| [Final regressions on original code](baseline-jest-strengthened.log) | 6 failures, 2 passing controls |
| [Focused fixed regressions](fixed-targeted-jest-strengthened.log) | 8 pass |
| [Full Jest](fixed-full-jest-final.log) | 28 suites / 121 tests pass |
| [Node18 full production build](fixed-build.log) | Exit 0, including lint/type checks, compilation, page data and traces |
| [Targeted lint](fixed-lint-final.log) | Exit 0; existing class-order warning on untouched spinner class remains |
| [New-test Prettier](fixed-format.log) | Pass; source diff whitespace also clean |
| [Baseline Chromium](baseline-browser.json) | English/Chinese: clearing and typing a matching name submit the old name; suggestion selection controls pass |
| [Fixed Chromium](fixed-browser.json) | All six flows pass; clearing blocks submission and marks the field invalid; typed/selected names submit correctly |

The async regression waits for the real React Query notification tick: the original source submits `Earlier Org` after the user has typed `Latest Org`; fixed code submits `Latest Org`. Other cases cover unchanged input/dates, explicit suggestions, immediate free-text propagation, pending autocomplete, and failed autocomplete.

Screenshots: baseline [English clear](baseline-en-clear.png), [English typed](baseline-en-typed-match.png), [Chinese clear](baseline-zh-clear.png), [Chinese typed](baseline-zh-typed-match.png); fixed [English clear](fixed-en-clear.png), [English typed](fixed-en-typed-match.png), [Chinese clear](fixed-zh-clear.png), [Chinese typed](fixed-zh-typed-match.png).

The browser harness mounts actual OrgEdit, OrgInput, DateRangePicker, Ant Design Form/Input/RangePicker, Compass Button, generated query/mutation hooks, React Query, and translations. Only GraphQL client transport is replaced with synthetic responses and a local mutation recorder. No real profile data, authentication, or live backend service is used. This is an isolated real-component validation, not a full-app deployment claim.

Existing repository-wide formatting/React Hooks and Tailwind warnings are preserved in the full build log. The focused lint warning is the unchanged spinner class ordering (`top-1.5 right-2`), outside the patch.

## Reproduce

Use Node 18, install the source repository's normal Yarn dependencies, and initialize the pinned translations with `git submodule update --init apps/web/i18n`. Install Playwright separately if needed; set `PLAYWRIGHT_MODULE` to that module path and `CHROMIUM_EXECUTABLE_PATH` to an installed Chromium, or let Playwright use its installed browser.

From repository root, assuming this package is at `contribution-evidence/organization-input-sync`:

```sh
node contribution-evidence/organization-input-sync/component-harness.cjs
python3 -m http.server 35506 --bind 127.0.0.1 --directory contribution-evidence/organization-input-sync/harness-dist
# Another terminal:
node contribution-evidence/organization-input-sync/fixed-browser.cjs
```

`COMPASS_REPO`, `COMPASS_DEPS`, `COMPASS_URL`, `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE_PATH` can select another checkout, dependency tree, server or browser. For the baseline, build with `COMPASS_REPO` pointing to the original upstream checkout and run `browser-repro.cjs`; it asserts the original faulty behavior.

From source root, `yarn test:ci --runInBand` runs the full suite. The focused regression file is `apps/web/src/common/components/OrgEdit/OrgInput.test.tsx`.
