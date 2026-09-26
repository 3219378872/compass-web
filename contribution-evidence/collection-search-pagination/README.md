# Collection search pagination: reproduction evidence

Issue: https://github.com/oss-compass/compass-web/issues/440

The collection page kept its previous page number when a new repository search was submitted. A one-match search from page 2 displayed a positive count but no card; Ant Design visually clamped its paginator to 1, whose click could not recover the results. The fix resets page 1 in the same callback as the submitted keyword.

The upstream baseline is `d709b1898549c5ab4091302a4c26f45bbe198c66`. [source-hashes.json](source-hashes.json) binds the tested source before the final commit. The implementation commit is `d8ee27ced113e782987d3f78bee5a490064f2c4e`, tree `cad556b6fa1a9b115ade737284f38dfc8540e1ed`; its file hashes match the tested sources.

| Check | Baseline | Fixed |
| --- | --- | --- |
| Six focused regressions | [5 failed, 1 passed](baseline-jest.log) | [6 passed](fixed-targeted-jest.log) |
| Full Jest suite | Not rerun separately | [28 suites, 119 tests passed](fixed-full-jest.log) |
| Targeted ESLint | Not run separately | [Passed](fixed-lint.log) |
| Node 18 production build | Not rerun separately | [Passed, exit 0](fixed-build.log) |
| Prettier / diff whitespace | Not run separately | [Passed](fixed-format.log) |
| Real Chromium components | [English/Chinese failure](baseline-browser.json) | [English/Chinese × Enter/click passed](fixed-browser.json) |

Baseline screenshot: [English](baseline-en-search.png), [Chinese](baseline-zh-search.png). Fixed screenshot: [English](fixed-en-enter-search.png), [Chinese](fixed-zh-enter-search.png).

The production build includes lint/type checks, compilation, page data and build traces. Existing repository-wide formatting/React Hooks and Tailwind warnings remain in the raw log; the targeted changed-file lint is clean.

The browser harness renders the actual collection components, Ant Design pagination and sort menu, repository cards with ECharts, real generated GraphQL hook, React Query, and translations. Only Next routing/link and GraphQL client transport use local synthetic fixtures. The fixture has 61 unfiltered repositories and one `needle` match; out-of-range paging follows the backend's statically inspected `BaseCollection.list` / `CollectionListQuery` contract. This does not prove a live backend or full application deployment. No real user data was used.

The fixed flow verifies that a new keyword makes only a page-1 request, displays its match, preserves ascending activity sort and page size, supports subsequent page 2 for broader results, and returns to the first unfiltered page when the search is cleared with the existing search control.

## Reproduce

Use Node 18 and install the source repository's normal Yarn dependencies. Initialize the pinned translation submodule with `git submodule update --init apps/web/i18n`. Install Playwright separately if it is not present in your environment and provide `PLAYWRIGHT_MODULE` as its module path. Provide `CHROMIUM_EXECUTABLE_PATH` to use an installed Chromium, or let Playwright use its installed browser.

From the repository root (assuming this evidence is under `contribution-evidence/collection-search-pagination`):

```sh
node contribution-evidence/collection-search-pagination/component-harness.cjs
python3 -m http.server 35496 --bind 127.0.0.1 --directory contribution-evidence/collection-search-pagination/harness-dist
# In another terminal:
node contribution-evidence/collection-search-pagination/fixed-browser.cjs
```

`COMPASS_REPO`, `COMPASS_DEPS`, `COMPASS_URL`, `PLAYWRIGHT_MODULE`, and `CHROMIUM_EXECUTABLE_PATH` allow other checkouts, dependency locations, and browser installations. To reproduce the failure, build with `COMPASS_REPO` pointing at the original upstream checkout and run `browser-repro.cjs` instead; it asserts the original incorrect behavior.

For source tests, run `yarn test:ci --runInBand` from the source repository. The focused suite is `apps/web/src/modules/collection/MainContent.test.tsx`.
