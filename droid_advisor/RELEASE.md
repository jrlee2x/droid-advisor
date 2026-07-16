# Droid Advisor release and update guide

## Current distribution

- Installer: `DroidAdvisor-Setup-0.4.0.exe`
- Platform: 64-bit Windows 10/11
- Installation scope: current Windows user; no administrator rights requested
- Runtime: bundled Python and offline OCR; recipients do not install Python
- Settings: `%APPDATA%\DroidAdvisor\config.json`
- Network: none required

Share the installer and its `.sha256` file together. Recipients can validate it in PowerShell:

```powershell
Get-FileHash .\DroidAdvisor-Setup-0.4.0.exe -Algorithm SHA256
```

The output must exactly match the checksum distributed through a separate trusted channel.

## Antivirus expectations

The build uses ordinary, inspectable files and no UPX packing, obfuscation, persistence tricks, privilege elevation, network download, or automatic execution of remote code. Those choices reduce avoidable heuristic flags, but an unsigned new application cannot guarantee a clean result with every antivirus vendor or Windows SmartScreen.

Before broad distribution:

1. Purchase an Authenticode certificate from a trusted certificate authority.
2. Install it in the Windows certificate store or connect the supported hardware/cloud signer.
3. Run `sign_release.ps1` against the installer.
4. Verify `Get-AuthenticodeSignature` reports `Valid`.
5. Recompute and publish the SHA-256 checksum after signing.
6. Optionally submit the signed installer to Microsoft and any vendor reporting a false positive.

## Updating friends

Increment the version in `__init__.py` and `installer.iss`, rebuild, and share the new installer. Users run it over the old version. The stable Inno Setup AppId upgrades the installed application while preserving AppData settings.

Do not distribute loose replacement DLLs or tell users to copy files into the installation directory. Do not implement a Google Drive binary updater without cryptographic signature verification. If automatic updates become worthwhile, publish signed installers and a signed JSON manifest from a stable HTTPS endpoint such as GitHub Releases.
