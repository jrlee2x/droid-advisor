# Droid Advisor

Droid Advisor is a free, community-built Windows companion for Fortnite Droid Tycoon. It uses local screen capture and offline OCR to display Super Rebirth guidance while the game is running.

## Current status

This project is alpha software under active development. The current public feature set includes:

- Automatic RBC and rebirth-rank detection from the View Rebirth menu.
- A draggable current and next rebirth target overlay.
- Keep or sell guidance for opened droid cards.
- Held-blueprint recognition.
- Optional high-value Sandcrawler spawn alerts.
- A `Ctrl+Shift+Z` overlay listing previously required droids with no remaining use in the current cycle.
- A tested inventory data layer. The inventory user interface and automatic build, sale, and reset reconciliation are still in progress.

## Privacy and behavior

Starting with version 0.5.0, Droid Advisor checks published GitHub Releases at startup. It asks before updating, verifies GitHub's SHA-256 asset digest, installs the update silently, and restarts itself. Raw commits, drafts, and prereleases are not installed automatically.

Droid Advisor:

- Captures only a visible Fortnite or Droid Tycoon window.
- Processes screenshots locally in memory.
- Does not save or upload captured game frames.
- Does not inject into the game or read game-process memory.
- Does not send keyboard, mouse, or controller input.
- Does not require an account, API key, or network connection at runtime.

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

Guide artwork is not stored in this source repository. `download_guide_assets.ps1` downloads the original high-resolution charts from the creator's published Imgur album and generates local thumbnail assets. See `droid_advisor/assets/ATTRIBUTION.txt`.

Before mirroring or redistributing the guide-derived thumbnails outside release binaries, obtain permission from the guide creator and follow the applicable platform and game-art terms.

## Contributing

Bug reports and focused pull requests are welcome. Please include the Windows version, game resolution, relevant advisor version, and a full-screen screenshot for OCR or layout problems. Never submit private account data or credentials.

## License

The source code is licensed under the MIT License. Third-party guide and game artwork is not covered by the MIT License.
