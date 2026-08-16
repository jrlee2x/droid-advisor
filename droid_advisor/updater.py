"""GitHub Releases based, checksum-verified application updates."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import shutil
import ssl

# The updater launches one fixed Windows system executable without a shell.
import subprocess  # nosec B404
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import certifi

LATEST_RELEASE_URL = "https://api.github.com/repos/jrlee2x/droid-advisor/releases/latest"
MAX_INSTALLER_BYTES = 256 * 1024 * 1024
MAX_DOWNLOAD_SECONDS = 180
RELEASE_DOWNLOAD_PREFIX = "/jrlee2x/droid-advisor/releases/download/"


def trusted_installer_url(value: str, expected_name: str) -> str:
    """Accept only this repository's HTTPS GitHub release assets."""
    url = str(value)
    parsed = urllib.parse.urlparse(url)
    if (
        parsed.scheme != "https"
        or parsed.hostname != "github.com"
        or not parsed.path.lower().startswith(RELEASE_DOWNLOAD_PREFIX)
        or Path(parsed.path).name != expected_name
    ):
        raise ValueError("Release installer URL is not a trusted GitHub asset")
    return url


def trusted_ssl_context() -> ssl.SSLContext:
    """Use the packaged Mozilla CA bundle for GitHub HTTPS verification."""
    return ssl.create_default_context(cafile=certifi.where())


def version_tuple(value: str) -> tuple[int, ...]:
    numbers = re.fullmatch(r"v?(\d+(?:\.\d+)*)", value.strip())
    if not numbers:
        raise ValueError(f"Unsupported version: {value}")
    return tuple(int(part) for part in numbers.group(1).split("."))


@dataclass(frozen=True)
class UpdateInfo:
    version: str
    installer_url: str
    sha256: str
    release_url: str


def parse_release(data: dict, current_version: str) -> UpdateInfo | None:
    version = str(data.get("tag_name", "")).lstrip("v")
    if version_tuple(version) <= version_tuple(current_version):
        return None
    assets = data.get("assets") or []
    expected_name = f"DroidAdvisor-Setup-{version}.exe"
    installer = next((a for a in assets if a.get("name") == expected_name), None)
    if not installer:
        raise ValueError(f"Release has no matching {expected_name} installer")
    digest = str(installer.get("digest") or "")
    if not re.fullmatch(r"sha256:[0-9a-fA-F]{64}", digest):
        raise ValueError("Release installer has no GitHub SHA-256 digest")
    return UpdateInfo(
        version=version,
        installer_url=trusted_installer_url(installer.get("browser_download_url", ""), expected_name),
        sha256=digest.split(":", 1)[1].lower(),
        release_url=data.get("html_url", ""),
    )


def check_for_update(current_version: str) -> UpdateInfo | None:
    request = urllib.request.Request(
        LATEST_RELEASE_URL,
        headers={"Accept": "application/vnd.github+json", "User-Agent": "DroidAdvisor-Updater"},
    )
    # The URL is a fixed HTTPS GitHub API endpoint.
    with urllib.request.urlopen(  # nosec B310
        request, timeout=12, context=trusted_ssl_context()
    ) as response:
        return parse_release(json.load(response), current_version)


def download_update(info: UpdateInfo) -> Path:
    update_root = Path(os.environ.get("LOCALAPPDATA", tempfile.gettempdir())) / "DroidAdvisor" / "updates"
    update_root.mkdir(parents=True, exist_ok=True)
    work_dir = Path(tempfile.mkdtemp(prefix="download-", dir=update_root))
    target = work_dir / f"DroidAdvisor-Setup-{info.version}.exe"
    expected_name = f"DroidAdvisor-Setup-{info.version}.exe"
    installer_url = trusted_installer_url(info.installer_url, expected_name)
    request = urllib.request.Request(installer_url, headers={"User-Agent": "DroidAdvisor-Updater"})
    digest = hashlib.sha256()
    downloaded = 0
    started = time.monotonic()
    try:
        # trusted_installer_url restricts the scheme, host, path, and filename.
        with urllib.request.urlopen(  # nosec B310
            request, timeout=60, context=trusted_ssl_context()
        ) as response, target.open("xb") as output:
            content_length = response.headers.get("Content-Length")
            if content_length and int(content_length) > MAX_INSTALLER_BYTES:
                raise ValueError("Release installer exceeds the allowed download size")
            while chunk := response.read(1024 * 1024):
                downloaded += len(chunk)
                if downloaded > MAX_INSTALLER_BYTES:
                    raise ValueError("Release installer exceeds the allowed download size")
                if time.monotonic() - started > MAX_DOWNLOAD_SECONDS:
                    raise TimeoutError("Release installer download exceeded the time limit")
                output.write(chunk)
                digest.update(chunk)
        if digest.hexdigest().lower() != info.sha256:
            raise ValueError("Downloaded update failed SHA-256 verification")
        return target
    except Exception:
        shutil.rmtree(work_dir, ignore_errors=True)
        raise


def launch_installer(
    installer: Path,
    expected_sha256: str,
    app_executable: Path | None = None,
) -> None:
    executable = app_executable or Path(sys.executable)
    if not re.fullmatch(r"[0-9a-fA-F]{64}", expected_sha256):
        raise ValueError("Expected installer SHA-256 is invalid")
    safe_installer = str(installer).replace("'", "''")
    safe_executable = str(executable).replace("'", "''")
    safe_parent = str(installer.parent).replace("'", "''")
    script = (
        f"Wait-Process -Id {os.getpid()} -ErrorAction SilentlyContinue; "
        f"$installer='{safe_installer}'; $expected='{expected_sha256.lower()}'; "
        "try { "
        "$actual=(Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant(); "
        "if ($actual -ne $expected) { exit 3 }; "
        "$process=Start-Process -FilePath $installer "
        "-ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/CLOSEAPPLICATIONS' -PassThru -Wait; "
        f"if ($process.ExitCode -eq 0) {{ Start-Process -FilePath '{safe_executable}' }}; "
        "exit $process.ExitCode "
        "} finally { "
        "Remove-Item -LiteralPath $installer -Force -ErrorAction SilentlyContinue; "
        f"Remove-Item -LiteralPath '{safe_parent}' -Force -ErrorAction SilentlyContinue "
        "}"
    )
    encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
    powershell = (
        Path(os.environ.get("SystemRoot", r"C:\Windows"))
        / "System32"
        / "WindowsPowerShell"
        / "v1.0"
        / "powershell.exe"
    )
    if not powershell.is_file():
        raise FileNotFoundError("Windows PowerShell is unavailable")
    subprocess.Popen(  # nosec B603
        [str(powershell), "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand", encoded],
        close_fds=True,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
