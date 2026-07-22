# Droid Advisor (Python prototype)

An offline, passive Windows companion for **Droid Tycoon**. It watches the game window, reads an open droid panel, and overlays a sell/keep recommendation based on the selected rebirth cycle and completed rebirth level. It never clicks or sends input to the game.

## Install

From PowerShell in the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\droid_advisor\setup.ps1
```

The first setup downloads the offline OCR model dependencies into `droid_advisor/.venv`.

## Run

Double-click `droid_advisor\run.cmd`, or run:

```powershell
.\droid_advisor\run.cmd
```

Choose RBC1–RBC4 and enter the number of rebirths already completed. For example, completed `22` means you are working on RB23. The settings persist in `%APPDATA%\DroidAdvisor\config.json`. Ordinary droid screens never overwrite that level from a guessed on-screen number; only a unique View Rebirth match can update it automatically.

The app continuously watches a visible Fortnite/Droid Tycoon window. When a droid panel is open, it reads the droid name and completed rebirth indicator and shows one of:

- `SAFE TO SELL: LAST NEEDED AT RB##`
- `KEEP: NEEDED AT RB##`

When a held blueprint pickup screen displays `TOSS BLUEPRINT ON CRAFTING STATION`, the app separately reads the blueprint droid and any legible finish/rarity label. It shows the same future-rebirth decision only while that pickup screen is visible; ordinary world droid labels cannot trigger it.

Press **Ctrl+Shift+D** to pause or resume. Tray controls also expose pause, settings, and exit.

The draggable top-right **Rebirth Targets** overlay shows the exact three labeled droid cards for the rebirth currently being worked and the following rebirth. Press **Ctrl+Shift+R** or use the tray menu to show/hide it. Its screen position and visibility persist. At RB30, the second row previews RB1 of the next cycle. Galactic is the highest quality and satisfies requirements for Beskar and every lower quality.

The optional **High-value conveyor alerts** setting watches the left-side spawn notification only. A large flashing alert appears for Diamond, Rainbow, or Beskar droids when the notification rarity is Legendary or Mythic. Galactic alerts appear for Epic, Legendary, and Mythic only. Identical text is deduplicated until the original notification disappears.

## Automatic RBC detection

When the View Rebirth menu is visible, the watcher compares any three recognized required droids with all RBC1–RBC4 rows. It updates the cycle and completed level only when the match is unique. Shared/ambiguous triples are ignored, leaving the current manual setting unchanged.

OCR accuracy depends on resolution, UI scale, motion blur, and contrast. Keep the target menu unobstructed for a moment. The first iteration uses general screen regions based on the supplied 1920×1277 screenshot; calibration controls can be added after testing against live captures.

## Privacy and safety

- OCR runs locally; screenshots are not uploaded or retained.
- The app only captures a visible game window whose title contains `Fortnite` or `Droid Tycoon`.
- It provides advice only and never performs a sale or sends game input.

## Installable release

Build the Windows installer with:

```powershell
powershell -ExecutionPolicy Bypass -File .\droid_advisor\build_release.ps1
```

The output is `dist-installer\DroidAdvisor-Setup-<version>.exe` with a neighboring SHA-256 checksum file. The installer is per-user, supports uninstall from Windows Settings, and uses a stable application ID so a newer release upgrades the existing installation. User settings remain in `%APPDATA%\DroidAdvisor` across upgrades.

The build intentionally uses PyInstaller's inspectable `onedir` layout internally, disables UPX, and wraps it in a conventional Inno Setup installer. The release is currently unsigned, so Windows may display **Unknown publisher** and reputation-based SmartScreen or antivirus warnings remain possible. A reputable Authenticode code-signing certificate is required to materially improve publisher trust; `sign_release.ps1` signs and timestamps a release once such a certificate is installed.

For updates, distribute a newer installer and run it normally over the existing version. Do not ask users to replace individual files inside the installation directory. A future updater should consume a signed release manifest from a stable HTTPS location; executing mutable binaries directly from a shared Google Drive file would create an avoidable supply-chain risk.
