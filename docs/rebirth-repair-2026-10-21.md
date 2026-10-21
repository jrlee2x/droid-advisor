# Rebirth detection repair and v1.35 Path 6

Checked October 21, 2026. Local release: 1.3.5.

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

The final relevant suite passes 589 tests. Packaged and installed runtime health checks return 0; the per-user installer returns 0; the installed executable matches the build. Configuration and inventory remained byte-for-byte unchanged during installation. Installer SHA-256: `93bfc617e73df8677753a201b635b2a595a8dc803ab4776b207eab3ac223fe22`. Local installer, installation log and `verification-1.3.6.json` are in the same repair artifact directory. Live R4 confirmation was requested from Josh after installation; desktop/screen access remains declined.
