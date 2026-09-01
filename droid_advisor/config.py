"""Validated, crash-safe persistence for Droid Advisor settings."""

from __future__ import annotations

import json
import os
import tempfile
import threading
from pathlib import Path

from .cycles import CYCLES, MAX_REBIRTH
from .notifications import CUSTOM_SOUND_FILENAME, SOUND_LABELS
from .qualities import RARITIES, SPAWN_VARIANTS

APP_DIR = Path(os.environ.get("APPDATA", Path.home())) / "DroidAdvisor"
CONFIG_PATH = APP_DIR / "config.json"
CUSTOM_SOUND_PATH = APP_DIR / CUSTOM_SOUND_FILENAME
DEFAULTS = {
    "cycle": 1,
    "completed_rebirth": 0,
    "paused": False,
    "interval_seconds": 1.25,
    "requirements_overlay_visible": True,
    "requirements_overlay_x": -1,
    "requirements_overlay_y": 55,
    "spawn_alerts_enabled": True,
    "spawn_alert_min_variant": "BESKAR",
    "spawn_alert_min_rarity": "LEGENDARY",
    "spawn_alert_sound": "droid_chime",
    "spawn_alert_volume": 70,
    "automatic_updates": True,
}
_CONFIG_LOCK = threading.RLock()


def load_config() -> dict:
    try:
        saved = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return dict(DEFAULTS)
    if not isinstance(saved, dict):
        return dict(DEFAULTS)

    config = dict(DEFAULTS)
    for key in (
        "paused",
        "requirements_overlay_visible",
        "spawn_alerts_enabled",
        "automatic_updates",
    ):
        if isinstance(saved.get(key), bool):
            config[key] = saved[key]
    try:
        cycle = int(saved.get("cycle", config["cycle"]))
        if cycle in CYCLES:
            config["cycle"] = cycle
    except (TypeError, ValueError):
        pass
    for key, minimum, maximum in (
        ("completed_rebirth", 0, MAX_REBIRTH),
        ("requirements_overlay_x", -100000, 100000),
        ("requirements_overlay_y", -100000, 100000),
        ("spawn_alert_volume", 0, 100),
    ):
        try:
            config[key] = max(minimum, min(maximum, int(saved.get(key, config[key]))))
        except (TypeError, ValueError):
            pass
    try:
        config["interval_seconds"] = max(
            0.5,
            min(10.0, float(saved.get("interval_seconds", config["interval_seconds"]))),
        )
    except (TypeError, ValueError):
        pass
    sound_id = saved.get("spawn_alert_sound")
    if isinstance(sound_id, str) and sound_id in SOUND_LABELS:
        if sound_id == "custom_wav" and not CUSTOM_SOUND_PATH.is_file():
            sound_id = "droid_chime"
        config["spawn_alert_sound"] = sound_id
    minimum_variant = saved.get("spawn_alert_min_variant")
    if isinstance(minimum_variant, str) and minimum_variant.upper() in SPAWN_VARIANTS:
        config["spawn_alert_min_variant"] = minimum_variant.upper()
    minimum_rarity = saved.get("spawn_alert_min_rarity")
    if isinstance(minimum_rarity, str) and minimum_rarity.upper() in RARITIES:
        config["spawn_alert_min_rarity"] = minimum_rarity.upper()
    return config


def save_config(config: dict) -> None:
    APP_DIR.mkdir(parents=True, exist_ok=True)
    temporary = None
    with _CONFIG_LOCK:
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                prefix="config-",
                suffix=".tmp",
                dir=APP_DIR,
                delete=False,
            ) as temporary_file:
                temporary = Path(temporary_file.name)
                json.dump(dict(config), temporary_file, indent=2)
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
            os.replace(temporary, CONFIG_PATH)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
