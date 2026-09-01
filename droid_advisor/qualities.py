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

SPAWN_VARIANT_ORDER = {
    "DEFAULT": 0,
    "GOLD": 1,
    "DIAMOND": 2,
    "RAINBOW": 3,
    "BESKAR": 4,
    "GALACTIC": 5,
    "STELLAR": 6,
}
RARITY_ORDER = {
    "COMMON": 0,
    "RARE": 1,
    "EPIC": 2,
    "LEGENDARY": 3,
    "MYTHIC": 4,
}
SPAWN_VARIANTS = tuple(SPAWN_VARIANT_ORDER)
RARITIES = tuple(RARITY_ORDER)
INVENTORY_RARITIES = RARITIES + ("ICONIC",)


@lru_cache(maxsize=1)
def quality_table() -> dict:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return json.loads((base / "assets" / "quality_requirements.json").read_text(encoding="utf-8"))
