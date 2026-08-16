"""Non-blocking selectable notification sounds for Droid Advisor alerts."""

from __future__ import annotations

import os
import tempfile
import wave
from array import array
from pathlib import Path

try:
    import winsound
except ImportError:  # pragma: no cover - Windows release builds always provide it.
    winsound = None


SOUND_CHOICES = (
    ("Droid Chime", "droid_chime"),
    ("Scanner Ping", "scanner_ping"),
    ("Urgent Pulse", "urgent_pulse"),
    ("Custom WAV", "custom_wav"),
    ("Windows Tone", "windows_tone"),
)
SOUND_FILES = {
    "droid_chime": "droid-chime.wav",
    "scanner_ping": "scanner-ping.wav",
    "urgent_pulse": "urgent-pulse.wav",
}
SOUND_LABELS = {sound_id: label for label, sound_id in SOUND_CHOICES}
SOUND_IDS = {label: sound_id for label, sound_id in SOUND_CHOICES}
CUSTOM_SOUND_FILENAME = "custom-alert.wav"
MAX_CUSTOM_SOUND_BYTES = 10 * 1024 * 1024
MAX_CUSTOM_SOUND_SECONDS = 30


def validate_custom_sound(source: Path) -> None:
    """Validate a user-provided WAV before it enters managed app storage."""
    try:
        size = source.stat().st_size
    except OSError as exc:
        raise ValueError("The selected sound could not be read.") from exc
    if size <= 0 or size > MAX_CUSTOM_SOUND_BYTES:
        raise ValueError("Choose a WAV file no larger than 10 MB.")
    try:
        with wave.open(str(source), "rb") as input_wav:
            channels = input_wav.getnchannels()
            sample_width = input_wav.getsampwidth()
            frame_rate = input_wav.getframerate()
            frame_count = input_wav.getnframes()
            compression = input_wav.getcomptype()
    except (EOFError, OSError, wave.Error) as exc:
        raise ValueError("Choose a valid PCM WAV file.") from exc
    if compression != "NONE" or sample_width != 2 or channels not in (1, 2):
        raise ValueError("Choose a 16-bit mono or stereo PCM WAV file.")
    if frame_rate <= 0 or frame_count <= 0:
        raise ValueError("The selected WAV file contains no playable audio.")
    if frame_count / frame_rate > MAX_CUSTOM_SOUND_SECONDS:
        raise ValueError("Choose a WAV file that is 30 seconds or shorter.")


def install_custom_sound(source: Path, destination: Path) -> Path:
    """Validate and atomically copy a custom alert into managed app storage."""
    source = source.resolve()
    destination = destination.resolve()
    validate_custom_sound(source)
    if source == destination:
        return destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            prefix="custom-alert-",
            suffix=".tmp",
            dir=destination.parent,
            delete=False,
        ) as temporary_file:
            temporary = Path(temporary_file.name)
            with source.open("rb") as input_file:
                remaining = MAX_CUSTOM_SOUND_BYTES + 1
                while remaining:
                    chunk = input_file.read(min(1024 * 1024, remaining))
                    if not chunk:
                        break
                    temporary_file.write(chunk)
                    remaining -= len(chunk)
            temporary_file.flush()
            os.fsync(temporary_file.fileno())
        validate_custom_sound(temporary)
        os.replace(temporary, destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return destination


def update_spawn_presence(
    last_signature: tuple[str, str] | None,
    absent_scans: int,
    detected: tuple[str, str] | None,
    clear_after: int = 3,
) -> tuple[tuple[str, str] | None, int, bool]:
    """Track one visible notification and report whether it is newly visible."""
    if detected is not None:
        return detected, 0, detected != last_signature
    if last_signature is None:
        return None, 0, False
    absent_scans += 1
    if absent_scans >= clear_after:
        return None, 0, False
    return last_signature, absent_scans, False


def volume_adjusted_sound(
    source: Path,
    volume_percent: int,
    cache_dir: Path,
) -> Path:
    """Return a cached WAV whose 16-bit PCM samples use the requested volume."""
    volume_percent = max(0, min(100, int(volume_percent)))
    if volume_percent == 100:
        return source
    cache_dir.mkdir(parents=True, exist_ok=True)
    destination = cache_dir / f"{source.stem}-volume-{volume_percent}.wav"
    with wave.open(str(source), "rb") as input_wav:
        parameters = input_wav.getparams()
        if parameters.sampwidth != 2:
            raise ValueError(f"Expected 16-bit PCM alert sound: {source}")
        samples = array("h")
        samples.frombytes(input_wav.readframes(parameters.nframes))
    if destination.is_file() and destination.stat().st_mtime_ns >= source.stat().st_mtime_ns:
        try:
            with wave.open(str(destination), "rb") as cached_wav:
                if cached_wav.getparams() == parameters:
                    cached_wav.readframes(parameters.nframes)
                    if cached_wav.tell() == parameters.nframes:
                        return destination
        except (OSError, EOFError, wave.Error):
            pass
    multiplier = volume_percent / 100
    for index, sample in enumerate(samples):
        samples[index] = round(sample * multiplier)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            prefix=f".{destination.stem}-",
            suffix=".wav",
            dir=cache_dir,
            delete=False,
        ) as temporary_file:
            temporary = Path(temporary_file.name)
        with wave.open(str(temporary), "wb") as output_wav:
            output_wav.setparams(parameters)
            output_wav.writeframes(samples.tobytes())
        os.replace(temporary, destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return destination


def play_spawn_notification(
    sound_id: str,
    sound_dir: Path | None = None,
    volume_percent: int = 70,
    cache_dir: Path | None = None,
    custom_sound_path: Path | None = None,
) -> bool:
    """Play a selected alert sound asynchronously without blocking monitoring."""
    if winsound is None:
        return False
    try:
        volume_percent = max(0, min(100, int(volume_percent)))
    except (TypeError, ValueError):
        volume_percent = 70
    filename = SOUND_FILES.get(sound_id)
    sound_path = custom_sound_path if sound_id == "custom_wav" else None
    if filename and sound_dir is not None:
        sound_path = sound_dir / filename
    if sound_path is not None and volume_percent == 0:
        return True
    if sound_path is not None and sound_path.is_file():
        try:
            if volume_percent != 100:
                target_cache = cache_dir or (
                    sound_dir / ".volume-cache"
                    if sound_dir is not None
                    else sound_path.parent / ".volume-cache"
                )
                sound_path = volume_adjusted_sound(sound_path, volume_percent, target_cache)
            flags = winsound.SND_FILENAME | winsound.SND_ASYNC | winsound.SND_NODEFAULT
            winsound.PlaySound(str(sound_path), flags)
            return True
        except (OSError, EOFError, RuntimeError, ValueError, wave.Error):
            pass
    flags = winsound.SND_ALIAS | winsound.SND_ASYNC | winsound.SND_NODEFAULT
    try:
        winsound.PlaySound("SystemExclamation", flags)
    except (OSError, RuntimeError):
        try:
            winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
        except (OSError, RuntimeError):
            return False
    return True
