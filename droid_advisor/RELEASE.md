# Droid Advisor release and update guide

## Current distribution

- Installer: `DroidAdvisor-Setup-1.2.6.exe`
- Platform: 64-bit Windows 10/11
- Installation scope: current Windows user; no administrator rights requested
- Runtime: bundled Python and offline OCR; recipients do not install Python
- Settings: `%APPDATA%\DroidAdvisor\config.json`
- Network: optional startup check for published GitHub Releases; core OCR and advisor features work offline

Share the installer and its `.sha256` file together. Recipients can validate it in PowerShell:

```powershell
Get-FileHash .\DroidAdvisor-Setup-1.2.6.exe -Algorithm SHA256
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
