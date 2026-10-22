# Rebirth detection repair and v1.35 Path 6

Checked October 21, 2026. Latest local repair: 1.3.10; versioned findings follow.

## Findings

Josh reported missing automatic rebirth progress and keep/sell guidance. The saved target overlay was hidden (`requirements_overlay_visible=false`). The previous process had been running since October 18; its diagnostic hotkey did not update the clipboard during investigation. That process was restarted, but the cause of its unresponsive hotkey was not established.

Path 3 / Rank 10 requires Senate Hovercam, Groundmech and Trak-R. Path 4 has the same triple at that rank. The old unique-triple detector returns no match, even when the game explicitly labels the menu PATH 3.

Progress OCR also used strict frame identity without the visual continuity check already used for droid advice. A newer capture during OCR invalidated otherwise correct menu reads.

The installed version's sixth path was from v1.34. Official October 17 patch notes confirm it was reworked in v1.35. All 40 triples and 120 per-slot finishes have been replaced.

## Sources

- Official v1.35 patch notes: https://www.reddit.com/r/StarWarsDroidTycoon/comments/1x82aev/patch_notes_v1350/
- Revised Path 6 chart, shared from Discord: https://www.reddit.com/r/StarWarsDroidTycoon/comments/1x8att8/new_rebirth_path_6/
- Original downloaded chart: `../artifacts/repair-2026-10-21/reddit-path-6.jpeg`.
- Independent 40-rank table: https://droidex.dubtrackr.win/updates/droid-tycoon-v1-35/
- Normalized reviewed reference: `../tests/fixtures/path6-v1.35.json`.

All 40 droid triples and finishes agree between the image and text table. Paths 1-5 and common credit/reward data retain the existing verified values. The chart displays RB36 as 1.19Qa while the text source and existing app round it to 1.2Qa; this repair retains 1.2Qa.

## Repair

The new path parser accepts only a confident PATH label and a supported path number. Explicit path, target rank and complete three-droid requirements must agree. Legacy menus without a readable path still require a globally unique triple matching the target rank.

Slow reads carry masks for the exact rank, path and requirement-name lettering. Changing background artwork or ping values does not authorize or invalidate progress. Changed labels, a closed menu, lost capture, paused monitoring, changed settings and expired evidence prevent updates. Existing droid-card and blueprint identity rules remain in force.

Josh requested permission before computer skill use or screen capture. After he declined further computer access, work continued with background source, synthetic regression and build checks. No further computer-skill calls or live screen captures are part of verification.

## Verification and local installation

- 584 relevant desktop regression tests pass, including all revised Path 6 rows/finishes and last-use boundaries, ambiguous paths, slow unchanged OCR, changed labels, closed menus, pause, changed settings, expired evidence and stalled capture.
- The real offline OCR engine read a generated text-only 2560x1440 fixture as Path 3 / Rank 10, with Senate Hovercam, Groundmech and Trak-R. Its visual evidence matched a fresh copy. This used no screen capture; it does not establish accuracy on every actual game frame.
- The installer compiled successfully. Packaged and installed runtime health checks returned 0. The installed executable matches the build by SHA-256, and all 240 installed target-card hashes match the package.
- Local installer SHA-256: `a8ba587a05f6c07218c212ed4a2b1425d2ff3d7cc390498796e1030eb55af077`.
- Inventory remained byte-for-byte unchanged. Cycle 3, completed rank 9, pause preference, notification settings and update settings were retained. Rebirth targets were enabled and their position reset to the primary display's default position.
- Installer, checksum, installation log, pre-repair profile copies, regenerated cards and synthetic OCR evidence: `../artifacts/repair-2026-10-21/`.
- Local installation only. No public release or hosted-site deployment. Josh still needs to confirm automatic progress and droid-card guidance in the live game.

## Follow-up: Rainbow R4 lounge card, 1.3.6

Josh confirmed 1.3.5 automatic rebirth detection works. He then reported no advice while viewing a Rainbow R4 in the lounge and supplied a diagnostic report himself, without granting desktop/screen access.

At 18:24:55 America/Chicago, the report showed active 2560x1440 capture, initialized OCR, successful capture exclusion, Path 3 / completed rank 9, both interaction color gates false, `interaction_regions_attempted=none`, and zero interaction tokens. The color gates could prevent the card's OCR scan altogether. Some recognition fields in that report were retained from another scan phase, so the report does not establish that R4's title had been successfully recognized.

Version 1.3.6 adds a periodic interaction OCR probe when both color gates miss. The existing aligned-button layout or held-blueprint prompt, focused name/badge checks, visual continuity, fresh capture and two-confirmation rules still apply. A recognized open panel receives consecutive scans in the same viewport; otherwise speculative probes run no more than once per 1.5 seconds. Recognized panels also suppress background spawn OCR for that scan. Additional diagnostics distinguish scan phase, fallback use, identity failure, stale evidence, pending confirmation and queued advice.

Regression checks reproduce the all-gates-false Rainbow R4 case and produce `R4: SAFE TO SELL: LAST NEEDED AT RB9` for Path 3 / completed rank 9. Empty world probes remain rate-limited and cannot authorize advice; scattered action words and a droid name without a real panel are rejected. These are synthetic checks, not a capture of Josh's live lounge card.

The final relevant suite passes 589 tests. Packaged and installed runtime health checks return 0; the per-user installer returns 0; the installed executable matches the build. Configuration and inventory remained byte-for-byte unchanged during installation. Installer SHA-256: `93bfc617e73df8677753a201b635b2a595a8dc803ab4776b207eab3ac223fe22`. Local installer, installation log and `verification-1.3.6.json` are in the same repair artifact directory. Desktop/screen access remains declined.

### Live follow-up remains unresolved

Josh confirmed that 1.3.6 still shows no R4 advice. His manually supplied 18:52:36 report shows Path 3 / completed rank 10, active capture and both interaction gates true, a recognized card panel, 31 interaction OCR tokens, 1109 ms interaction OCR time, and `advice_status=visual or capture evidence no longer current`. The report was copied during `monitor_phase=reading droid identity`, before that scan's identity fields were populated. It establishes that scanning now reaches the panel and that an earlier advice read failed freshness/visual validation; it does not identify the failing text patch or establish that the current identity read succeeded.

Requested a detailed two-minute diagnostic report from Josh to inspect the R4 OCR text without screen access. No further runtime changes are justified yet. Offline processing of the already-saved October 10 R6 and AMP Walker reference images still passes the current visual proof against all saved frames; results are in `saved-card-proof-check.json` in the repair artifact directory. No live screen was captured for these checks.

## Follow-up: focused repeat reads, 1.3.7

Josh's manually supplied detailed 18:55:00 report confirms `R4`, `RAINBOW`, `RARE` at 0.995 identity confidence, with `advice_status=visual or capture evidence no longer current`. The interaction OCR took 1407 ms, longer than the 1250 ms capture interval, before the separate focused identity read. At clipboard-copy time Fortnite was no longer foreground, so the report also correctly shows capture suspended; its retained identity sample is from the earlier game frame. It does not identify exactly which text patch failed while the game was foreground.

Version 1.3.7 removes the repeated broad OCR cost while an already located card remains open. Every new capture must match the cached action-button lettering, then the focused title/badge is read anew. The cache stores only viewport/rectangle, button tokens, their visual proof and a verification timestamp. It stores no droid identity, finish, confidence, or advice. A current verified identity read renews the geometry's 12-second validity; unreadable or stale reads do not. Changed controls, changed frame dimensions, capture loss, pause, exceptions and expired geometry return to full panel discovery. Original title/badge visual validation, current-capture checks and two distinct confirmed captures still control advice and inventory updates.

The new regression simulates a full scan repeatedly overlapping a new capture with changed nearby artwork. Initial stale advice is rejected; subsequent focused reads verify the same R4 from two fresh captures and produce the correct banner. Additional checks prove the cache re-reads a changed Groundmech rather than reusing R4, rejects weak/unknown/conflicting identities, clears closed/missing/paused contexts, and expires geometry. The relevant suite passes 602 tests.

Real offline OCR on the existing October 10 reference files measured 1781 ms (R6) / 1391 ms (AMP Walker) for broad reads, versus warm focused reads of 328-359 ms (initial focused reads 656-688 ms). `focused-card-speed.json` records these measurements. This used saved image files, not a live screen capture, and does not establish performance on every live R4 frame.

Diagnostics additionally expose focused OCR time, geometry-cache use, rejected evidence/capture age, frame gap, failed visual-patch indexes and actual overlay display state. These are bounded in-memory metadata; detailed OCR text remains opt-in. No new screenshot saving or automatic uploads were added.

Local 1.3.7 installer and installed runtime both return exit 0, and the installed executable matches the build hash. Settings and inventory were byte-for-byte unchanged during installation. Installer SHA-256: `70c788b11c90464e66c99bd213e710cd9591f28e33b36f5290d1acfac17cb052`. The installer, checksum, installation log and `verification-1.3.7.json` are saved in the repair artifact directory. Josh was asked to check the R4 banner after installation; live confirmation remains pending.

## Follow-up: badge validation and banner persistence, 1.3.9

Josh confirmed that the 1.3.7 R4 banner appears but disappears quickly. His new 19:05:24 report confirms Fortnite remains foreground with capture active, focused R4 OCR at 0.997 confidence in 250 ms, cached control geometry, and `advice_display_status=cleared by fresh-frame validation`. A rejected R4 observation reports five visual patches with only patch 1 failing. Given the separate R4 / Rainbow / Rare tokens and three recognized action controls, patch 1 is the rarity badge; the title and controls pass.

The badge used the same right-side context extension as the title: two token heights beyond its OCR bounds. That extension is necessary to guard against a longer droid name reusing a short prefix; it is unnecessary for the rarity word and includes adjacent artwork. Version 1.3.8 keeps full title context and narrows rarity validation to its own lettering plus the existing small margin.

A synthetic regression reproduces the old failure by animating a bright region next to RARE. The narrowed badge passes that animation while rejecting changed EPIC lettering and changed R2 title lettering. The same test invokes the actual banner-expiry check: the banner stays visible on a newly captured animated frame and clears on changed badge text.

Advice placement also avoids the evidence's title, badge and control rectangles, so it leaves the recognized text readable and reduces dependence on capture-exclusion behavior. The placement check covers ordinary and negative/offset monitor coordinates. This is additional protection, not proof that the banner itself caused the reported badge mismatch. Windows display affinity applies to supported capture paths; see https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity.

All 604 relevant regressions pass. No title, identity confidence, two-capture confirmation, expiry, focus, pause, capture or changed-progress requirement was relaxed. No live screen capture or desktop control was used.

The final 1.3.8 installer and installed runtime health check both return exit 0. The installed executable matches the final build, and configuration and inventory remained byte-for-byte unchanged during installation. Installer SHA-256: `68d1e8d154c1faa5b14d85b90f7b29fd08762d6aa74b2709dde35662e7f6474a`. The installer, checksum, log and `verification-1.3.8.json` are saved in the repair artifact directory. Version 1.3.8 was launched at 19:11:28 America/Chicago. Josh was asked to leave the R4 card open for 15 seconds to confirm that the banner persists; live confirmation remains pending.

## Follow-up: recurring badge/control failures, 1.3.9

Josh reports that 1.3.8 disappears and comes right back. His 19:16:55 report shows the banner visible at copy time with confident R4 recognition (0.997, 312 ms), active foreground capture and cached controls. Retained rejection data shows a 3750 ms old observation rejected on patches 1, 3 and 4: the rarity and two controls. This report does not prove the underlying pixel changes were brightness, animation, hover or capture artifacts, and its rejection data is distinct from the currently visible banner.

An offline regression reproduces a separate defect in those patches: a brightness change in unchanged dark control lettering crosses the old fixed threshold and fails validation. Badge and control patches now choose a current luminance threshold at the midpoint of their light/dark classes, then enforce the same strict pixel shape comparison (at most 1.5% of the patch and 6% of its ink). There is no grace period or extra mismatch allowance. Full white title context, rebirth validation, confidence, two-capture confirmation, expiry, capture and progress requirements are unchanged.

New checks cover both text polarities, changing fills, whole-control brightness, changed title/badge/button wording and disappearance. The actual banner lifetime check retains advice on changed fill and removes it on changed badge text. The adaptive matcher also rejects each catalog title against every other catalog title. Existing October 10 saved R6/AMP frames still match. These are saved-file and synthetic checks, not live screen inspection.

The report now records the time and exact numerical mismatch details for the actual displayed-advice clear, as well as separately timestamping rejected recognition. This distinguishes old rejected observations from the reason a currently displayed banner clears. Only patch coordinates, thresholds and counts are retained, with at most eight failed patch details; no screenshot or new OCR sample retention is added. Recognition-reset clears are now labeled separately from fresh-frame validation.

All 706 relevant regressions pass on the final 1.3.9 source. Packaged and installed runtime health checks and the installer return exit 0. The installed executable matches the build hash, and settings and inventory remained byte-for-byte unchanged during installation. Installer SHA-256: `c49c76349a52d337c04965cf23f6a292a712612df142b3144da31905ae2be904`. The installer, checksum, log, profile backups and `verification-1.3.9.json` are in the repair artifact directory. Josh was asked to leave the R4 card open for 20 seconds and report persistence or supply the new diagnostic. Live persistence confirmation remains pending. No desktop control or live screen access was used.

## Follow-up: confirmation reset with unchanged pixels, 1.3.10

Josh's 19:23:00 version 1.3.9 report records a displayed-advice clear at 19:22:56 with all six visual patches matching, evidence age 1907 ms and capture age 610 ms. The current R4 observation is confident (0.998, 328 ms), and the banner is visible again. This narrows the recorded event to the recognition-reset path; no pixel mismatch or age expiry explains that clear. The report does not capture the optional labels at the moment of the reset.

A new regression reproduces a reset on that path: the pending confirmation signature included optional finish/rarity. After two Rainbow R4 confirmations, a single confident R4 read missing Rainbow clears the banner even while the old title/badge/control proof still matches. This happens for owned cards and blueprints. The regression fails on 1.3.9 before the fix.

Version 1.3.10 confirms source, complete droid name and cycle/progress separately from optional finish/rarity. Every advice update still needs two distinct, consecutive or visually continuous identity captures, current confidence/visual evidence, active capture and unchanged progress. Conflicting/unreadable/weak identities, closed cards, capture loss, pause and expiry still clear advice immediately. Optional quality affects the explanatory upgrade message, while the keep/sell decision remains conservative for every finish by the existing engine rule.

Inventory has a separate confirmation counter for the complete name/finish/rarity tuple. Missing or changed optional labels reset that counter, and two matching fresh full observations remain required before inventory is written. Tests alternate missing/changed labels while exercising the real UI event handler: the current R4 banner stays visible; inventory receives no unconfirmed tuple; two matching owned observations update inventory; blueprints never do. A changed frame still clears the banner. Diagnostics also include observed finish/rarity, both confirmation counts and reset/clear reason labels.

All 708 relevant regressions pass. Packaged and installed runtime health checks and installer return exit 0. The installed executable matches the build; settings and inventory remained byte-for-byte unchanged during installation. Installer SHA-256: `5c895c0701c1dddc77eb4faec9a853ecb26db6a03ca29205ac45a897397452cc`. Installer, checksum, installation log, profile backups and `verification-1.3.10.json` are in the repair artifact directory. Josh was asked for another 20-second card check after installation; persistence confirmation remains pending. All work remained in the background, with no live screen access or desktop control.
