"""GitHub Releases based, checksum-verified application updates."""

from __future__ import annotations

from dataclasses import dataclass
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import urllib.request


LATEST_RELEASE_URL = "https://api.github.com/repos/jrlee2x/droid-advisor/releases/latest"


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
    installer = next((a for a in assets if re.fullmatch(r"DroidAdvisor-Setup-[\d.]+\.exe", a.get("name", ""))), None)
    if not installer:
        raise ValueError("Release has no Droid Advisor installer")
    digest = str(installer.get("digest") or "")
    if not digest.lower().startswith("sha256:"):
        raise ValueError("Release installer has no GitHub SHA-256 digest")
    return UpdateInfo(
        version=version,
        installer_url=installer["browser_download_url"],
        sha256=digest.split(":", 1)[1].lower(),
        release_url=data.get("html_url", ""),
    )


def check_for_update(current_version: str) -> UpdateInfo | None:
    request = urllib.request.Request(
        LATEST_RELEASE_URL,
        headers={"Accept": "application/vnd.github+json", "User-Agent": "DroidAdvisor-Updater"},
    )
    with urllib.request.urlopen(request, timeout=12) as response:
        return parse_release(json.load(response), current_version)


def download_update(info: UpdateInfo) -> Path:
    target = Path(tempfile.gettempdir()) / f"DroidAdvisor-Setup-{info.version}.exe"
    request = urllib.request.Request(info.installer_url, headers={"User-Agent": "DroidAdvisor-Updater"})
    digest = hashlib.sha256()
    with urllib.request.urlopen(request, timeout=60) as response, target.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
            digest.update(chunk)
    if digest.hexdigest().lower() != info.sha256:
        target.unlink(missing_ok=True)
        raise ValueError("Downloaded update failed SHA-256 verification")
    return target


def launch_installer(installer: Path, app_executable: Path | None = None) -> None:
    executable = app_executable or Path(sys.executable)
    safe_installer = str(installer).replace("'", "''")
    safe_executable = str(executable).replace("'", "''")
    script = (
        f"Wait-Process -Id {os.getpid()} -ErrorAction SilentlyContinue; "
        f"Start-Process -FilePath '{safe_installer}' "
        "-ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/CLOSEAPPLICATIONS' -Wait; "
        f"Start-Process -FilePath '{safe_executable}'"
    )
    encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
    subprocess.Popen(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand", encoded],
        close_fds=True,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
