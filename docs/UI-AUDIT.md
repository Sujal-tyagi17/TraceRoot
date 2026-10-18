# UI/UX audit and checklist

_Updated 18 Oct 2026._

| Area | Finding before | Status |
|---|---|---|
| Fonts | Loaded from Google Fonts at runtime, later from `@fontsource` CSS | ✅ `next/font/local` with the woff2 files and OFL 1.1 licences in the repo; no external requests, metric-matched fallbacks |
| Intro | Timer chain; could get stuck in React Strict Mode; page could flash before the curtain; no skip control; played on any first page, including QR scans | ✅ Rebuilt as the Origin Sequence: CSS-timed, decided before first paint, landing page only, Skip button plus Escape/Enter/Space/click, fails safe after 5 s if JavaScript never runs |
| Hero diagram | Recall button only; no legend, details or parent/child distinction | ✅ Interactive: select a stage for details, hover/focus traces lineage, legend, parent vs child styling, recall demo with warning and reset, live text description |
| Search | Navigated without checking the batch existed | ✅ Validates input, checks the contract, explains missing batches, keyboard submit |
| Explorer | Status filter only | ✅ Product filter, sort, "show more" paging, retry on network error, result count |
| Batch page | No separate quality or price sections; recall banner invisible (animation conflict) | ✅ Quality records and declared prices sections; banner fixed and covered by a test |
| Forms | Errors only after submit | ✅ Live checks for split sums, merge compatibility, recipient roles and address format; submit disabled until valid |
| Transaction states | Rejected, reverted and network failures looked the same | ✅ Distinct titles; success only after the receipt confirms |
| Header | Overflowed horizontally at 768 px | ✅ Menu button below 1024 px |
| Explorer links | Dead links on a local chain (no explorer) | ✅ Plain text when no explorer exists |
| Dashboard count-up | Imported but never applied | ✅ Wired in (found by lint) |
| Dark mode | Not implemented; colour tokens doubled as text and background colours | ✅ Token split into theme-aware CSS variables; device / light / dark toggle, saved, applied before first paint; charts, forms, tables, nav, dialogs and status colours checked in both themes |
| QR scanning | Only by the phone's own camera app | ✅ In-site scanner: camera on demand, rear camera preferred, validated content, confirmation for other hosts, manual entry and a fallback when permission is denied, camera stopped on close or leaving the page |
| Intro details | Branch paths popped in instead of drawing; split badge overlapped the branches; pulse dots drew over node labels; mobile split was cramped | ✅ Paths normalised (`pathLength=1`) so they draw smoothly; 40 kg and 60 kg lots grow out of the trader node; badge sits in the fork; pulses travel behind nodes; about 4 s with skip |
| Missing batch | `/batch/999` showed a raw RPC error that overflowed on phones | ✅ "Batch #999 does not exist" with a link to browse; other errors are friendly with a retry button |
| Scanner on phones | (found in this pass) The dialog was trapped inside the animated hero, so the backdrop didn't cover the screen | ✅ Portalled to `<body>`; covered by a test |
| Mobile menu | Active page not marked | ✅ Highlighted with `aria-current` |
| Handoff offers | No way to decline; expired or recalled offers showed a button that would fail; confirmation vanished with the card | ✅ Decline / Withdraw, expiry from chain time, recall warning, page-level confirmation |
| Transaction states | A receipt lookup failing after broadcast looked like a network error | ✅ "Sent, but not confirmed yet" with the link, so it isn't sent twice |
| Totals | Lists read the newest 200 batches but called the count a total | ✅ Newest 500, with a note when there are more; dashboard total from the contract |
| Accessibility | Small light-mode text below 4.5:1; diagram names didn't match visible text; no skip link | ✅ axe-core clean (WCAG A/AA) on main pages in both themes; skip link |
| Tooling | No lint or tests in `web` | ✅ ESLint, 19 Vitest unit tests, 41 Playwright browser tests (including the full workflow), CI runs lint and unit tests |

## Known remaining items

- **Browser tests are not in CI**: they need a seeded local chain. Run them locally (`web/tests/e2e/README.md`).
- **The build shows one warning** from a third-party dependency (`ox`, used by viem). It does not affect TraceRoot.
- Automated checks run in Chromium (desktop 1440/1024/768 and mobile 390). The live site was also checked by hand on real phones and other desktop browsers.
- The camera scanner needs HTTPS (or localhost). On plain HTTP it says so and offers manual entry.
- Automated scanner tests use a simulated camera; real-phone scanning was checked by hand on the live HTTPS site.
