# Security

## Reporting a vulnerability

Do not post sensitive vulnerability details in a public issue. Contact the repository owner privately with a minimal reproduction, affected version, and expected impact.

## Release trust

Release installers are currently unsigned. Verify the published SHA-256 checksum through a separate trusted channel and review the source when evaluating a release. A checksum confirms file identity, not the safety of the source itself. The automatic updater verifies GitHub's asset digest, but both the installer and digest currently share the same GitHub trust boundary.

The project does not collect telemetry, upload screenshots, inject game inputs, or read game-process memory. It keeps only the current foreground game frame in memory and clears that reference when the game is no longer available. Detailed OCR diagnostics are opt-in, memory-only, bounded, and purged after two minutes.

Droid Advisor checks the repository's latest published GitHub Release at startup when automatic updates are enabled. It asks for confirmation before downloading an installer, enforces download size and time limits, verifies the SHA-256 digest again immediately before launch, runs the per-user installer silently, and restarts only after a successful installation. Raw commits, draft releases, and prereleases are not executed.
