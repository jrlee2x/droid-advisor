# Droid Advisor release and update guide

## 1.3.5 rebirth detection and v1.35 Path 6 repair

- Read the explicit PATH label in View Rebirth. Shared triples such as Paths 3 and 4 at Rank 10 can now be distinguished; path, rank and all three droid names must agree.
- Validate slow rebirth OCR against the rank, path and requirement-name text in newer captures. Animation and changing ping text do not invalidate an unchanged menu. Closed or changed menus, expired evidence, stalled capture, pause and changed progress still reject the update.
- Replace all 40 Path 6 triples and 120 finishes with the October 17 v1.35 revision, cross-checked against the Reddit/Discord chart and Droidex. Regenerate the desktop target cards.
- Preserve saved inventory and progress during installation.

## 1.3.4 short-title and animated-card recognition fix

- Fixed missing R6 advice reproduced on a live Stellar Epic card. Tall short titles could be grouped with an unrelated small event label above them; text grouping now requires vertical overlap.
- White title validation now separates lettering from animated droid artwork. Moving models no longer invalidate an unchanged title, while changed names and closed cards still clear advice.
- Verified repeated R6 advice with the saved Cycle 2 / completed RB35 settings. Two independent OCR confirmations and existing freshness, rarity, progress and capture checks remain required.
- Settings and inventory are preserved when updating.

## 1.3.3 live recognition and v1.34 catalog update

- Fixed a live AMP Walker failure: correct OCR could take longer than the capture interval and was discarded. Title, rarity and panel text now validate the result against newer captures. Changed titles, closed panels, paused monitoring, missing captures and changed progress still invalidate advice.
- Limited OpenCV workers as well as ONNX workers. Verified live at 2560x1440 with Fortnite running; the previous OpenCV conversion exceptions stopped, and AMP Walker advice was repeatedly displayed.
- Added EG-58, EGL, KT, MPH, JO9-4MN, PLNK and ECG, plus Iconic WG-22 and the previously missing SA-5, LOM, PZ and TDA Protocol entries. Catalog total: 100.
- Added Cycle 6 with all 40 ranks and per-slot finishes, including early Kyber requirements. Cycle 5 now advances to 6; Cycle 6 wraps to 1. Rebirth cards regenerate for all 240 targets.
- Updated R2 and B2 Heavy income rates. Undocumented EGL, JO9-4MN and PLNK finish incomes remain blank rather than estimated.
- Saved settings and inventory are preserved. Protocol, Iconic and fusion names remain excluded from automatic rebirth sell recommendations.

## 1.3.2 advice identity and freshness fixes

- Owned cards and blueprints share complete-title recognition and two-frame confirmation. No broad-screen or fuzzy-name fallback is used for advice.
- All 88 catalog names are recognized distinctly. Only the 62 rebirth-supported names receive advice; iconic and fusion names cannot fall back to a shorter supported name.
- Conflicting badges, uncertain titles and ambiguous truncations suppress advice. A short RIC reading is withheld because RIC and RIC-1200 share the same rarity. A Mythic MOUSE reading is no longer silently renamed to Snow Mouse.
- Results carry their capture number, timestamp and progress settings. Replaced, expired, paused and out-of-focus results cannot display or confirm inventory. Each new capture invalidates the old banner while the next frame is read, so advice can briefly disappear during verification.
- Every persistent advisor window is excluded from Windows capture, including after Tk remaps its native window. Compatible screenshots and recordings also omit those windows. If capture exclusion fails, inspection advice is suppressed and diagnostics record the failure.
- Rebirth progress changes require a fresh, unique three-droid match agreeing with the header rank. Open sell-list references refresh when progress changes.

Automated recognition tests use synthetic OCR tokens, with native Windows startup/capture checks separately exercised; the reporter's live game session has not been reproduced.

Audit verification: 377 desktop tests pass, plus one separate hosted-chart check. Coverage includes 88 catalog identities, 15,128 card/blueprint transitions, 15,312 ambiguous name pairs and 12,710 cycle/rank/droid decisions. The real offline OCR engine correctly identified 86 of 88 generated title cards and withheld the two ambiguous short names (RIC and RO-TOR), with zero wrong identities. All seven persistent Windows surfaces successfully reapplied capture exclusion after being hidden and shown.

## 1.3.1 card recognition fix

Card button matching now excludes the Worker role label while accepting OCR-joined capacity counters such as WORK16/16. This prevents Senate Hovercam and other worker cards from using the wrong name crop. Verified against a live Update 1.33 card capture and covered by geometry and label regression tests.

## Current distribution

- Local repair installer: `DroidAdvisor-Setup-1.3.5.exe` (not published)
- Platform: 64-bit Windows 10/11
- Installation scope: current Windows user; no administrator rights requested
- Runtime: bundled Python and offline OCR; recipients do not install Python
- Settings: `%APPDATA%\DroidAdvisor\config.json`
- Network: optional startup check for published GitHub Releases; core OCR and advisor features work offline

Share the installer and its `.sha256` file together. Recipients can validate it in PowerShell:

```powershell
Get-FileHash .\DroidAdvisor-Setup-1.3.2.exe -Algorithm SHA256
```

The output must exactly match the checksum distributed through a separate trusted channel.

## Antivirus expectations

The build uses ordinary, inspectable files and no UPX packing, obfuscation, privilege elevation, or hidden persistence. The installed app can download a published GitHub Release only after the user accepts an update prompt. It verifies GitHub's SHA-256 asset digest after download and again immediately before launch. These choices reduce avoidable heuristic flags, but an unsigned new application cannot guarantee a clean result with every antivirus vendor or Windows SmartScreen.

Before broad distribution:

1. Purchase an Authenticode certificate from a trusted certificate authority.
2. Install it in the Windows certificate store or connect the supported hardware/cloud signer.
3. Run `sign_release.ps1` against the installer.
4. Verify `Get-AuthenticodeSignature` reports `Valid`.
5. Recompute and publish the SHA-256 checksum after signing.
6. Optionally submit the signed installer to Microsoft and any vendor reporting a false positive.

## Updating friends

Increment the version in `__init__.py` and `installer.iss`, rebuild, and publish the installer as an asset on a non-draft, non-prerelease GitHub Release whose tag and installer filename use the same version. GitHub must report a SHA-256 digest for the asset. Users can run the installer over the old version, or accept the in-app update prompt. The stable Inno Setup AppId upgrades the installed application while preserving AppData settings.

Each upgrade removes the prior private PyInstaller `_internal` runtime before copying the new one, preventing native modules from an older dependency set from surviving an in-place update. Automatic upgrades write `%APPDATA%\DroidAdvisor\update-install.log`, return a distinct restart-required result, and exercise Pillow's Python and native imaging layers before relaunching the application.

Do not distribute loose replacement DLLs or tell users to copy files into the installation directory. Do not publish update installers from Google Drive or another unverified source. Before broad distribution, Authenticode-sign installers and add publisher verification or a separately signed release manifest so release authenticity does not depend only on the GitHub repository.
