# UI/UX audit and checklist

_Updated 18 Oct 2026, commit following `3c8ca1e`._

| Area | Finding before | Status |
|---|---|---|
| Fonts | Loaded from Google Fonts at runtime | ✅ Self-hosted via `@fontsource` packages |
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
| Tooling | No lint or tests in `web` | ✅ ESLint, 12 Vitest unit tests, 18 Playwright browser tests, CI runs lint and unit tests |

## Known remaining items

- **Dark mode is not implemented.** Colour tokens are used for both text and backgrounds (for example `forest`), so a dark theme needs a token split first. Deferred to avoid regressions in the light theme.
- **Browser tests are not in CI**: they need a seeded local chain. Run them locally (`web/tests/e2e/README.md`).
- **The build shows one warning** from a third-party dependency (`ox`, used by viem). It does not affect TraceRoot.
- Tested in Chromium only (desktop 1440/1024/768 and mobile 390). Safari and Firefox were not tested here.
