# Droid Advisor website update, October 22, 2026

Josh requested updating the existing public website after publishing desktop 1.3.10. The existing Vercel project and URL are retained: https://droid-advisor-rebirth-chart.vercel.app/ . The site keeps its existing logo, colors, typography, chart format and reference pages.

## Changes

- Six rebirth paths, RB1-40 and 240 target cards, generated from the released desktop data. Path 6 uses the reviewed v1.35 reference in `tests/fixtures/path6-v1.35.json`, including all 40 triples and 120 finishes.
- Cycle 6 controls for the chart and keep/sell quick list, all six downloadable chart/list pairs, and an updated full chart and six-column social preview.
- A Windows 1.3.10 download and release-notes link, plus instructions for existing users to restart or choose Check Now.
- Income reference regenerated for all 100 catalog entries: 73 standard, 17 fusion and 10 Iconic. Protocol filtering added. Undocumented income remains N/A. This uses the already reviewed desktop catalog, not a new claim that all income was independently checked today.
- Fusion, income-impact and chip assets regenerated from their existing source data. The existing full-size fusion viewer remains.
- Updated resource version URLs bypass the previous immutable asset caches. Original full-resolution PNGs and optimized web variants are retained.

The Nova section retains its explicit September 30 verification date and existing separate regular/Super Rebirth figures.

## Validation

120 relevant tests pass, including independent Path 6 fixture checks against the generated keep/sell JSON and the complete catalog against website income data. All three JavaScript files pass syntax checks.

Background headless browser checks at 1440x1000 and 390x844 cover all six cycle switches, 12 chart/list download targets, all 40 Path 6 quick-list records, 100 income rows, Protocol filtering, KT search, missing EGL income, the fusion lightbox/zoom controls and page overflow. No page errors or failed resource responses remain. These are isolated website tests, not a capture or control of Josh's live desktop.

Before-update files, generated charts, optimized variants, preview screenshots and machine-readable checks are saved locally under `artifacts/site-update-2026-10-22/`.

## Production

Published to the existing Vercel project with source commit `b0d374e`. Production deployment `dpl_5xHdUt8hdShYTwVA2P4i6DnkvwED` returned READY and serves https://droid-advisor-rebirth-chart.vercel.app/ . All 46 public HTML/JS/CSS/image/data files returned HTTP 200 with hashes matching the verified local files.

The same desktop/mobile browser checks passed again against the public URL, including all six paths, current download links, 100 income rows and the preserved fusion viewer, with no page errors, failed resource responses or page overflow. Local reports: `production-asset-verification.json` and `production-browser-verification.json` in the artifact directory. Website-only update; the already published desktop 1.3.10 release is unchanged.
