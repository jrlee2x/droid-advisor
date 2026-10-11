# Droid Tycoon v1.34 catalog and live recognition repair

Checked October 10, 2026 while Josh had a Galactic Epic AMP Walker open in Fortnite v1.34.0.

## Sources

- Reddit patch notes, October 9: https://www.reddit.com/r/StarWarsDroidTycoon/comments/1x1xi2n/star_wars_droid_tycoon_v1340_patch_notes/
- Event announcement: https://www.reddit.com/r/StarWarsDroidTycoon/comments/1x1t98a/iconic_gonk_event/
- Community data review and all 40 Cycle 6 triples/finishes: https://droidex.dubtrackr.win/updates/droid-tycoon-v1-34/
- Individual metadata and income tables: https://droidex.dubtrackr.win/droids/kt/ , https://droidex.dubtrackr.win/droids/eg-58/ , https://droidex.dubtrackr.win/droids/mph/ , https://droidex.dubtrackr.win/droids/ecg/
- Protocol catalog: https://droidex.dubtrackr.win/droids/sa-5/ , https://droidex.dubtrackr.win/droids/lom/ , https://droidex.dubtrackr.win/droids/pz/ , https://droidex.dubtrackr.win/droids/tda/

The seven new ordinary names are EG-58, EGL, KT, MPH, JO9-4MN, PLNK and ECG. WG-22 is Iconic Battle with a 2x Flawless Chance perk. Four Protocol names were missing from the older catalog, bringing the complete catalog to 100.

The Cycle 6 table is community-maintained game data, not a live verification of all 40 ranks. KT's ranks 14, 21, 29 and 34 and ECG's ranks 25, 27, 31, 37 and 40 were cross-checked with their individual profiles. Other cycles retain their previous data. Slot-specific finishes are necessary: this path uses Kyber before rank 36 and mixes finishes in a single rank.

The patch notes confirm R2 base income 360 -> 480 and B2 Heavy 480 -> 360. Ordinary finish rates use their existing tier multipliers. Existing Kyber values for those two remain historical and are not revised from an unverified assumption. EGL, JO9-4MN and PLNK have confirmed base incomes but unverified higher-finish rates remain None. Newly documented Kyber activation colors use the profile tables' 3x, 3.25x and 3.6x rates. Droidex labels these economy figures inferred.

## Live failure and fix

The real AMP Walker frame identified the correct name, Galactic finish and Epic rarity. A full scan initially took 3.4 seconds, exceeding both the 1.25-second capture cadence and the previous 2.5-second freshness limit. A separate live background run reproduced OpenCV conversion exceptions. Limiting its worker pool independently of ONNX eliminated those observed exceptions.

Slow reads now carry visual evidence for the complete recognized title, rarity and panel controls. Binary text masks are checked against each newer capture before publishing or retaining advice. Each patch has both area-relative and text-relative tolerances, preventing short names from disappearing inside a large blank region. A fresh capture is still required; OCR evidence expires after 12 seconds even if the visual match survives. Unverified evidence retains the original strict frame and 2.5-second rule. Two independently captured OCR confirmations are still required.

Finish graphics are animated and are not used as visual continuity evidence. A finish-only change cannot change a rebirth sell/keep decision, which conservatively retains any finish needed later; finish-specific upgrade wording refreshes on the next OCR confirmation. A changed name, rarity, panel control, capture visibility, pause state or progress invalidates old advice.

Local live captures and detailed diagnostics remain in ignored artifacts/live-debug-1.3.3 and are not published. Live diagnostics confirmed repeated AMP WALKER advice for saved Cycle 2, completed rank 35, and suppression on the sell confirmation screen. Automated tests additionally cover delayed results, changed title pixels, disappearing short names, capture stalls, and the new path.
