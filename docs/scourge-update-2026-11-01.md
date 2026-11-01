# Scourge update, November 1, 2026

Josh requested updating Droid Advisor, rebirth charts, fusion recipes and related references for Scourge. Desktop version: **1.4.0**. The existing public Vercel website and approved artwork/layout are retained.

## Behavior

- Scourge is recognized on focused cards/blueprints and in Sandcrawler spawn notifications. Settings accept Scourge as the minimum alert variant. Inventory can save, edit and reload Scourge units.
- Scourge covers any rebirth variant of the same droid, including Kyber. Rebirth coverage order is separate from raw earnings: a Scourge need not earn more than Stellar or activated Kyber.
- After a Scourge droid's final rebirth use, its banner asks the player to check Scourgedex/fusion before selling. An unreadable finish also gets collection-aware guidance rather than an unrestricted sell message. The generic Ctrl+Shift+Z list is labeled as a rebirth reference and includes that reminder.
- Existing independent title confirmation, two complete observations before inventory updates, current-frame visual checks and capture exclusion remain in place.
- Named fusion recipes use one Scourge ingredient in the left-most machine slot and two Stellar, Kyber or Scourge ingredients. Exact recipe names and quantities still matter. Three Kybers cannot generate Scourge; Upgrade Chips cannot reach it. The machine preview is the final check, especially for mixed inputs.
- All 90 non-Iconic droids have nine displayed income variants, Default through Scourge, including inactive Kyber. Activated Kyber colors remain available in desktop inventory. Refresh includes the current fusion-income increase and previously missing R9/EGL/JO9-4MN/PLNK rates.
- Raw Scourge income excludes Hive Mind. Income-impact comparisons explicitly exclude its base-wide effects and mixed-variant recipes. Inventory totals are labeled raw income, without Hive Mind.
- Scourge Prime is a separate Default-only Iconic Protocol entry. The complete catalog has 101 names: 73 standard, 17 fusion, 11 Iconic. Its Protocol/Hive Mind effect is listed separately; conflicting community income presentations are not treated as an ordinary fixed-rate comparison.
- Checked all 240 targets and 720 named requirements. Required names match the current source. Corrected B2-RP at RB14 in Paths 2 and 3 from Gold to Default, independently supported by Droidex. Path 6 retains its reviewed v1.35 revision.
- The desktop and website chip references share the current Epic/Legendary/Mythic matrix through Kyber, including documented lower-tier costs. No Scourge chip target is offered.

## Sources and provenance

These are community-maintained references, not official game guarantees.

- [Droid Archives catalog JSON](https://droidarchives.co.uk/data/droids.json), fetched November 1. SHA-256: `c2fb13fd22b3a146206a94cd9b19dd34cc8fd91f520d85f928f83b5eff95959a`. All 90 non-Iconic entries include Scourge. Numeric evidence is retained in `tests/fixtures/economy-v1.37.json`; original response remains private in the artifact directory.
- [Droid Archives](https://droidarchives.co.uk/) six files at `data/rebirth-cycles/cycle-{1..6}.json`, retained in `tests/fixtures/rebirth-v1.37.json`. Current chip costs checked against its public `app.js` matrix.
- [Droidex B2-RP requirements](https://droidex.dubtrackr.win/droids/b2-rp/) independently lists Default at RB14 for Paths 2 and 3.
- [Player fusion tests](https://www.reddit.com/r/StarWarsDroidTycoon/comments/1xfd0kr/psa_if_you_are_fusing_3_scourge_droids_youre/) and [the RIV-3T example](https://www.reddit.com/r/StarWarsDroidTycoon/comments/1xgtp8d/scourge_mythic_what_to_do_with_it_fusion/) support the left-most-slot and Stellar/Kyber mixed-input rule. Reports about other slot positions vary, so instructions use the consistently reported left-most position and require checking the preview.
- [Scourge rules and Hive Mind review](https://droidex.dubtrackr.win/guides/droid-tycoon-scourge/) supports rebirth substitution, no chip upgrade, and the distinction between raw income and placed-base income.

## Verification

- 874 regression tests pass, including independent current-source comparisons for every non-Iconic income/finish and all six rebirth paths.
- Three JavaScript syntax checks pass. Desktop and phone headless website checks pass: six paths, 240 cards, all chart/list downloads, 101 income rows, Protocol filtering, Scourge Prime search, nine income columns, 17 recipes, Scourge guidance, Kyber chip costs and the fusion zoom viewer. No page errors, failed resources or page overflow.
- Actual offline OCR reads generated R4/Scourge/Rare and Groundmech/Scourge/Epic cards, and keeps Scourge Prime separate as Default/Iconic. This is generated-image testing, not a live game capture.
- Final installer: 88,021,918 bytes, SHA-256 `e393de9c7eff28e5cd3346c7d4aa611a384f8743dbf0a8b780a4dffce3144ad4`. Packaged runtime health exit 0, PE version 1.4.0, bundled Scourge module present and requirement JSON matches source. A further 403 affected OCR/advice/website regressions pass after the final label review.
- Local installation and public deployment results are appended after verification.

Private build logs, source responses, generated chart originals and optimized web variants, browser screenshots and verification reports are in `artifacts/scourge-update-2026-11-01/`. No live computer control or live-screen capture was used. Live Scourge card behavior in Josh's game remains unconfirmed.
