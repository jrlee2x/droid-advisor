"""Persistent, quality-aware inventory ledger for rebirth planning."""

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import json
import os
from pathlib import Path

from .cycles import CYCLES
from .engine import canonical
from .qualities import QUALITY_ORDER, quality_table


@dataclass
class InventoryEntry:
    droid: str
    quantity: int = 0
    quality: str = "BASE"
    source: str = "manual"
    updated_at: str = ""


@dataclass(frozen=True)
class InventoryAssessment:
    droid: str
    quantity: int
    owned_quality: str | None
    next_needed: int | None
    next_required_quality: str | None
    required_quality: str | None
    covered: bool

    @property
    def message(self) -> str:
        if self.next_needed is None:
            return "NOT NEEDED AGAIN THIS CYCLE"
        if self.quantity <= 0:
            return f"KEEP: NEED {self.next_required_quality} AT RB{self.next_needed}; NONE OWNED"
        if self.covered:
            return f"DUPLICATE: ALREADY OWN {self.owned_quality}; COVERED FOR RB{self.next_needed}"
        if QUALITY_ORDER[self.owned_quality] >= QUALITY_ORDER[self.next_required_quality]:
            return f"KEEP: OWN {self.owned_quality}; NEED {self.required_quality} LATER"
        return f"KEEP/UPGRADE: OWN {self.owned_quality}, NEED {self.next_required_quality} AT RB{self.next_needed}"


class InventoryLedger:
    def __init__(self, path: Path | None = None) -> None:
        app_dir = Path(os.environ.get("APPDATA", Path.home())) / "DroidAdvisor"
        self.path = path or app_dir / "inventory.json"
        self.entries: dict[str, InventoryEntry] = {}
        self.load()

    def load(self) -> None:
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            raw = {}
        self.entries = {key: InventoryEntry(**value) for key, value in raw.items()}

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps({key: asdict(value) for key, value in self.entries.items()}, indent=2), encoding="utf-8")

    def set(self, droid: str, quantity: int, quality: str, source: str = "manual") -> InventoryEntry:
        quality = quality.upper()
        if quality not in QUALITY_ORDER:
            raise ValueError(f"Unknown quality: {quality}")
        entry = InventoryEntry(
            droid=droid,
            quantity=max(0, int(quantity)),
            quality=quality,
            source=source,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
        self.entries[canonical(droid)] = entry
        self.save()
        return entry

    def get(self, droid: str) -> InventoryEntry | None:
        return self.entries.get(canonical(droid))

    def clear(self) -> None:
        self.entries.clear()
        self.save()

    def assess(self, cycle: int, completed_rebirth: int, droid: str) -> InventoryAssessment:
        target = canonical(droid)
        qualities = quality_table()[str(cycle)]
        future = []
        for rb, required in enumerate(CYCLES[cycle], start=1):
            if rb <= completed_rebirth:
                continue
            for slot, name in enumerate(required):
                if canonical(name) == target:
                    future.append((rb, qualities[str(rb)][slot]))
        entry = self.get(droid)
        if not future:
            return InventoryAssessment(droid, entry.quantity if entry else 0, entry.quality if entry else None, None, None, None, True)
        next_rb = min(rb for rb, _ in future)
        next_quality = next(quality for rb, quality in future if rb == next_rb)
        max_quality = max((quality for _, quality in future), key=QUALITY_ORDER.get)
        covered = bool(entry and entry.quantity > 0 and QUALITY_ORDER[entry.quality] >= QUALITY_ORDER[max_quality])
        return InventoryAssessment(
            droid=droid,
            quantity=entry.quantity if entry else 0,
            owned_quality=entry.quality if entry else None,
            next_needed=next_rb,
            next_required_quality=next_quality,
            required_quality=max_quality,
            covered=covered,
        )
