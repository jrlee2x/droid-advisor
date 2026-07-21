"""Privacy-first, in-memory diagnostics for user-assisted troubleshooting."""

from __future__ import annotations

from collections import deque
from datetime import datetime
import platform
import threading
import time
from typing import Iterable


class DiagnosticBuffer:
    """Retain bounded runtime state without creating files or uploading data."""

    def __init__(self, max_events: int = 80) -> None:
        self._lock = threading.Lock()
        self._events: deque[str] = deque(maxlen=max_events)
        self._state: dict[str, object] = {}
        self._started_at = time.time()
        self._detailed_until = 0.0

    def set(self, **values: object) -> None:
        with self._lock:
            self._state.update(values)

    def record(self, message: str) -> None:
        stamp = datetime.now().astimezone().strftime("%H:%M:%S")
        with self._lock:
            self._events.append(f"{stamp}  {message}")

    def enable_detailed(self, seconds: float = 120.0) -> None:
        with self._lock:
            self._detailed_until = time.monotonic() + seconds
            self._events.append(
                f"{datetime.now().astimezone().strftime('%H:%M:%S')}  Detailed diagnostics enabled for {int(seconds)} seconds"
            )

    def detailed_enabled(self) -> bool:
        with self._lock:
            active = time.monotonic() < self._detailed_until
            if not active and self._detailed_until:
                self._detailed_until = 0.0
                for key in [key for key in self._state if key.endswith("_ocr_sample")]:
                    self._state.pop(key, None)
            return active

    def sample(self, name: str, tokens: Iterable[object], limit: int = 500) -> None:
        """Retain target-region OCR text only during explicit detailed mode."""
        if not self.detailed_enabled():
            return
        text = " | ".join(str(getattr(token, "text", token)).replace("\r", " ").replace("\n", " ") for token in tokens)
        self.set(**{name: text[:limit] or "(no OCR text)"})

    def report(self, version: str, config: dict, game_rect: tuple[int, int, int, int] | None) -> str:
        with self._lock:
            if self._detailed_until and time.monotonic() >= self._detailed_until:
                self._detailed_until = 0.0
                for key in [key for key in self._state if key.endswith("_ocr_sample")]:
                    self._state.pop(key, None)
            state = dict(self._state)
            events = list(self._events)
            detailed = time.monotonic() < self._detailed_until
        uptime = max(0, int(time.time() - self._started_at))
        public_config = {
            "cycle": config.get("cycle"),
            "completed_rebirth": config.get("completed_rebirth"),
            "paused": config.get("paused"),
            "interval_seconds": config.get("interval_seconds"),
            "spawn_alerts_enabled": config.get("spawn_alerts_enabled"),
        }
        lines = [
            "DROID ADVISOR DIAGNOSTIC REPORT",
            f"Generated: {datetime.now().astimezone().isoformat(timespec='seconds')}",
            f"Version: {version}",
            f"Windows: {platform.platform()}",
            f"Uptime seconds: {uptime}",
            f"Fortnite foreground window: {'yes' if game_rect else 'no'}",
            f"Game rectangle: {game_rect or 'not available'}",
            f"Detailed diagnostics active: {'yes' if detailed else 'no'}",
            "Screenshots saved: no",
            "Data uploaded: no",
            "",
            "CONFIGURATION",
        ]
        lines.extend(f"{key}: {value}" for key, value in public_config.items())
        lines.extend(("", "LATEST RUNTIME STATE"))
        lines.extend(f"{key}: {state[key]}" for key in sorted(state))
        lines.extend(("", "RECENT EVENTS"))
        lines.extend(events or ["(none)"])
        return "\n".join(lines)
