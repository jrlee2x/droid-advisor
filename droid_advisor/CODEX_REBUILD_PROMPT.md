# Prompt for rebuilding Droid Advisor with Codex

Copy the entire prompt below into Codex while working in a new repository. Attach the rebirth-cycle spreadsheet and representative screenshots of both the droid panel and View Rebirth menu.

---

Build a passive, offline Windows companion named **Droid Advisor** for Droid Tycoon. Use Python 3.12 and keep deterministic rebirth decisions separate from OCR/screen capture.

Requirements:

- Run continuously in the Windows system tray and capture only a visible window whose title contains `Fortnite` or `Droid Tycoon`.
- Never click, type, automate gameplay, inject into the game, read process memory, or send network requests.
- Perform OCR locally with RapidOCR/ONNX Runtime. Never save or upload screenshots; keep each captured frame only in memory for the current OCR pass.
- Detect an open droid card from menu cues such as Work, Swap, Lounge, Customize, and Sell. Recognize the selected droid name and show a topmost overlay immediately below the name.
- Let the user select RBC1–RBC4 and enter **Rebirths completed**. Show that completed 22 means working on RB23.
- On the View Rebirth menu, parse `Rebirth Rank ##` directly and store `rank - 1` as completed. Recognize the three needed droids and change the RBC only when their exact unordered combination uniquely matches one cycle/row. Ambiguous matches must leave the cycle unchanged.
- For the selected cycle, a droid is safe only when it has no appearance after the number of completed rebirths. Display either `SAFE TO SELL: LAST NEEDED AT RB##` or `KEEP: NEEDED AT RB##`.
- Normalize obvious spelling variants such as PROTOROLL/PROTO_ROLLER/PROTO-ROLLER and MONOWLKR/MONO-WLKR. Prefer exact droid matches and ensure BB9 is not shortened to BB.
- Persist settings in `%APPDATA%\DroidAdvisor\config.json`. Use `Ctrl+Shift+D` to pause/resume. Closing the settings window should hide it to the tray; tray Exit should terminate it.
- Enforce one running instance with a named Windows mutex.
- Include unit tests covering all four cycles, last-use decisions, spelling aliases, ambiguous cycle triples, BB versus BB9, and the PROTO-ROLLER completed-RB22 behavior.
- Package with PyInstaller in `onedir` mode, `console=False`, `upx=False`, and wrap it in a per-user Inno Setup installer with uninstall support, optional desktop/startup shortcuts, a stable AppId, version metadata, and SHA-256 output.
- Do not claim that an unsigned build can avoid every antivirus warning. Document Authenticode signing and timestamping, and never auto-execute binaries from Google Drive. Upgrades should run a newer installer over the existing installation while preserving AppData settings.

Transcribe the attached spreadsheet exactly into tested embedded cycle data. Render no unnecessary UI and keep the application understandable to a nontechnical user. Build the installer, smoke-test the packaged executable, report its size and SHA-256, and provide clear install/update/uninstall instructions.

---
