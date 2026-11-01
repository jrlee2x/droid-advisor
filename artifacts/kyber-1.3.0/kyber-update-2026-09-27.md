# Kyber update sources and scope

Droid Advisor 1.3.0, researched 27 September 2026 for game v1.32.

## Sources

- [Reddit: Rebirth Cycles 1-5, Rebirths 0-40](https://www.reddit.com/r/StarWarsDroidTycoon/comments/1wr04fq/rebirth_cycles_15_rebirths_040/), posted 26 September by the community chart author. The author links Droid Archives. The Cycle 1 chart was also inspected directly.
- [Droid Archives](https://droidarchives.co.uk/): its public `data/rebirth-cycles/cycle-1.json` through `cycle-5.json` supply the 25 new requirements and costs; `data/nova-shop.json` supplies the new Super Rebirth rewards; `data/droids.json` supplies the four Kyber income forms for the 79 standard/fusion droids already supported by Advisor. `app.js` and `kyber-guide.js` supply upgrade-chip costs and activation details. Existing RB1-35 requirements were preserved.
- [Reddit: Kyber Droid Event](https://www.reddit.com/r/StarWarsDroidTycoon/comments/1wr077m/kyber_droid_event_is_now_live_24_hours/): Kyber activation at Huyang; green/blue/purple activation odds of 50/30/20 percent. Player reports corroborate 110,000 chips for Stellar to Kyber Mythic.

These are community-maintained references, not a claim of official verification. The archive labels activation details as awaiting in-game confirmation. Reddit reports conflict on whether inactive Kyber meets rebirth requirements. Advisor records Kyber as a single rebirth tier and retains inactive/green/blue/purple separately for inventory income. It does not claim that activation is mandatory or that colours form additional upgrade tiers. Check the in-game requirement checkmarks. Income excludes player, room and event bonuses.

## Included

- All five paths through RB40, with regenerated 200 target cards, next-use and keep/sell lists. New credit costs: 1.2Qa, 2.5Qa, 4.5Qa, 8Qa, 15Qa. The chart author's data was used over isolated, conflicting comments.
- Kyber OCR, Sandcrawler alert threshold, manual inventory forms, saved inventory recognition and base income.
- Current high-tier chip costs, including Stellar to Kyber: Epic 12,000; Legendary 30,000; Mythic 110,000. Earlier tiers corrected to the same current reference. The historical `CHIP_COSTS_126` matrix and historical income/fusion web charts remain identified with their original version; only the runtime chip reference is updated.
- Groundmech OCR accepts the truncated `GROUND MEC` / `GROUND MEK` readings, including a split title. Owned-card advice refreshes while the panel stays open instead of disappearing permanently after 4.5 seconds. Its signature includes finish and advice so changed requirements are shown.

Groundmech's last required rebirth is now RB37 on Cycle 1 and RB38 on Cycle 4. This resolves the old RB35 limit's premature sell recommendation. The reported live recognition failure still needs confirmation on the user's actual panel; regression tests exercise the focused and side-panel recognition paths.

## Validation

138 tests pass, including new Kyber inventory persistence, income, OCR, rank bounds, all five endgame paths and Groundmech title regression cases. All 200 rebirth cards are regenerated and covered by the existing supported-resolution layout checks. The Windows installer is built from the existing pinned dependencies. Source changes were made on top of pre-existing uncommitted work, with no commit or public release.

Installed locally over v1.2.6. Inno Setup and both packaged/installed runtime health checks returned exit 0. Installed file metadata reports v1.3.0. Settings and inventory were backed up locally before installation. Updated hosted-chart files are local only; no public release or site deployment was performed.
