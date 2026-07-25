# Droid Advisor

Droid Advisor is a free, community-built Windows companion for Fortnite Droid Tycoon. It uses local screen capture and offline OCR to display Super Rebirth guidance while the game is running.

## Current status

This project is community software under active development. Version 1.0 includes:

- Automatic RBC and rebirth-rank detection from the View Rebirth menu.
- A draggable current and next rebirth overlay using complete high-resolution rank cards.
- Keep or sell guidance for opened droid cards.
- Held-blueprint recognition.
- Optional high-value Sandcrawler spawn alerts.
- A `Ctrl+Shift+Z` overlay listing previously required droids with no remaining use in the current cycle.
- A `Ctrl+Shift+C` reference for the Update 1.23 upgrade-chip costs.
- A redesigned Swag Studios interface with direct links to the Droid Tycoon community and the DepSwag profile.
- A tested inventory data layer. The inventory user interface and automatic build, sale, and reset reconciliation are still in progress.

## Diagnostics

The system-tray menu includes **Copy diagnostic report**. The same command is available with `Ctrl+Shift+L`. The report is generated from a bounded in-memory buffer and can be pasted into Discord or a GitHub issue. It includes runtime state, visual-gate results, OCR timing, and trapped exception details. It does not include screenshots and is not uploaded automatically.

For recognition problems, choose **Enable detailed diagnostics (2 minutes)**, reproduce the problem, then choose **Copy diagnostic report** before the two minutes expire. Detailed mode temporarily includes OCR text from the advisor's target regions. The samples are removed from memory when detailed mode expires. No diagnostic file is written to disk.

## Privacy and behavior

Starting with version 0.5.0, Droid Advisor checks published GitHub Releases at startup. It asks before updating, verifies GitHub's SHA-256 asset digest, installs the update silently, and restarts itself. Raw commits, drafts, and prereleases are not installed automatically.

Droid Advisor:

- Captures only a visible Fortnite or Droid Tycoon window.
- Processes screenshots locally in memory.
- Does not save or upload captured game frames.
- Does not inject into the game or read game-process memory.
- Does not send keyboard, mouse, or controller input.
- Does not require an account, API key, or network connection at runtime.

Press `Ctrl+Shift+C` to show or hide the Update 1.23 upgrade-chip cost reference.

Review the source and tests before running community software. Release installers are currently unsigned, so Windows may show an Unknown publisher warning.

## Development setup

Requirements:

- Windows 10 or Windows 11, 64-bit
- Python 3.12
- PowerShell
- Inno Setup 6 for installer builds

```powershell
powershell -ExecutionPolicy Bypass -File .\droid_advisor\setup.ps1
powershell -ExecutionPolicy Bypass -File .\droid_advisor\download_guide_assets.ps1
powershell -ExecutionPolicy Bypass -File .\droid_advisor\download_rebirth_tiles.ps1
.\droid_advisor\run.cmd
```

Run tests:

```powershell
python -m pytest tests\test_droid_advisor.py -q
```

Build the installer:

```powershell
powershell -ExecutionPolicy Bypass -File .\droid_advisor\build_release.ps1
```

## Guide artwork

Guide artwork is not stored in this source repository. `download_guide_assets.ps1` downloads the original thumbnail charts, and `download_rebirth_tiles.ps1` downloads the updated high-resolution charts and generates complete rank-card assets. See `droid_advisor/assets/ATTRIBUTION.txt`.

Before mirroring or redistributing the guide-derived thumbnails outside release binaries, obtain permission from the guide creator and follow the applicable platform and game-art terms.

## Contributing

Bug reports and focused pull requests are welcome. Please include the Windows version, game resolution, relevant advisor version, and a full-screen screenshot for OCR or layout problems. Never submit private account data or credentials.

## License

Copyright © 2026 Swag Studios.

The source code is licensed under the MIT License. Third-party guide and game artwork is not covered by the MIT License.
