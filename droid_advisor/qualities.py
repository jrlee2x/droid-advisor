"""Shared rebirth quality hierarchy and requirement data."""

import json
import sys
from functools import lru_cache
from pathlib import Path

QUALITY_ORDER = {
    "BASE": 0,
    "GOLD": 1,
    "DIAMOND": 2,
    "RAINBOW": 3,
    "BESKAR": 4,
    "GALACTIC": 5,
    "STELLAR": 6,
}


@lru_cache(maxsize=1)
def quality_table() -> dict:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return json.loads((base / "assets" / "quality_requirements.json").read_text(encoding="utf-8"))
