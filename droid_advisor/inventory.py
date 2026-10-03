"""Persistent per-droid inventory and spatial assignment ledger."""

from __future__ import annotations

import json
import os
import threading
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .cycles import CYCLES
from .engine import canonical
from .qualities import QUALITY_ORDER, quality_table


SCHEMA_VERSION = 2
UNASSIGNED = "unassigned"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_finish(value: str | None) -> str:
    finish = str(value or "BASE").strip().upper()
    if finish in {"DEFAULT", "BASIC"}:
        return "BASE"
    if finish not in QUALITY_ORDER:
        raise ValueError(f"Unknown quality: {finish}")
    return finish


@dataclass
class InventoryEntry:
    """Backward-compatible aggregate used by rebirth advice."""

    droid: str
    quantity: int = 0
    quality: str = "BASE"
    source: str = "manual"
    updated_at: str = ""


@dataclass
class InventoryUnit:
    """One physical droid, including its exact finish and map position."""

    id: str
    droid: str
    finish: str = "BASE"
    rarity: str = ""
    role: str = ""
    income_per_second: float | None = None
    perk: str = ""
    location: str = UNASSIGNED
    slot: str = ""
    source: str = "manual"
    confidence: float | None = None
    created_at: str = ""
    updated_at: str = ""

    def __post_init__(self) -> None:
        self.finish = normalize_finish(self.finish)
        self.rarity = self.rarity.upper()
        self.role = self.role.upper()
        self.location = self.location or UNASSIGNED
        self.slot = self.slot or ""
        if not self.created_at:
            self.created_at = _now()
        if not self.updated_at:
            self.updated_at = self.created_at


@dataclass
class InventoryEvent:
    id: str
    action: str
    timestamp: str
    source: str = "manual"
    before: list[dict[str, Any]] = field(default_factory=list)
    after: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    undone_at: str = ""


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
    """Thread-safe, event-backed inventory shared by OCR and the map UI."""

    def __init__(self, path: Path | None = None) -> None:
        app_dir = Path(os.environ.get("APPDATA", Path.home())) / "DroidAdvisor"
        self.path = path or app_dir / "inventory.json"
        self.units: dict[str, InventoryUnit] = {}
        self.events: list[InventoryEvent] = []
        self.entries: dict[str, InventoryEntry] = {}
        self._lock = threading.RLock()
        self.load()

    def load(self) -> None:
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            raw = {}
        with self._lock:
            self.units = {}
            self.events = []
            if isinstance(raw, dict) and raw.get("schema_version") == SCHEMA_VERSION:
                for value in raw.get("units", []):
                    try:
                        unit = InventoryUnit(**value)
                    except (TypeError, ValueError):
                        continue
                    self.units[unit.id] = unit
                for value in raw.get("events", []):
                    try:
                        self.events.append(InventoryEvent(**value))
                    except TypeError:
                        continue
            elif isinstance(raw, dict):
                self._migrate_legacy(raw)
            self._rebuild_entries()

    def _migrate_legacy(self, raw: dict[str, Any]) -> None:
        for value in raw.values():
            if not isinstance(value, dict) or not value.get("droid"):
                continue
            try:
                quantity = max(0, int(value.get("quantity", 0)))
                finish = normalize_finish(value.get("quality"))
            except (TypeError, ValueError):
                continue
            timestamp = str(value.get("updated_at") or _now())
            for _ in range(quantity):
                unit = InventoryUnit(
                    id=uuid.uuid4().hex,
                    droid=str(value["droid"]),
                    finish=finish,
                    source=str(value.get("source") or "legacy"),
                    created_at=timestamp,
                    updated_at=timestamp,
                )
                self.units[unit.id] = unit

    def save(self) -> None:
        with self._lock:
            payload = {
                "schema_version": SCHEMA_VERSION,
                "units": [asdict(unit) for unit in self.units.values()],
                "events": [asdict(event) for event in self.events[-500:]],
            }
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temporary = self.path.with_suffix(f"{self.path.suffix}.{uuid.uuid4().hex}.tmp")
            try:
                temporary.write_text(json.dumps(payload, indent=2), encoding="utf-8")
                os.replace(temporary, self.path)
            finally:
                temporary.unlink(missing_ok=True)

    def _rebuild_entries(self) -> None:
        grouped: dict[str, list[InventoryUnit]] = {}
        for unit in self.units.values():
            grouped.setdefault(canonical(unit.droid), []).append(unit)
        entries: dict[str, InventoryEntry] = {}
        for key, units in grouped.items():
            best = max(units, key=lambda unit: QUALITY_ORDER[unit.finish])
            latest = max(units, key=lambda unit: unit.updated_at)
            entries[key] = InventoryEntry(
                droid=best.droid,
                quantity=len(units),
                quality=best.finish,
                source=latest.source,
                updated_at=latest.updated_at,
            )
        self.entries = entries

    def _record(
        self,
        action: str,
        before: list[dict[str, Any]],
        after: list[dict[str, Any]],
        source: str,
        metadata: dict[str, Any] | None = None,
    ) -> InventoryEvent:
        event = InventoryEvent(
            id=uuid.uuid4().hex,
            action=action,
            timestamp=_now(),
            source=source,
            before=before,
            after=after,
            metadata=dict(metadata or {}),
        )
        self.events.append(event)
        self.events = self.events[-500:]
        return event

    def list_units(self, location: str | None = None) -> list[InventoryUnit]:
        with self._lock:
            values = list(self.units.values())
            if location is not None:
                values = [unit for unit in values if unit.location == location]
            return sorted(values, key=lambda unit: (unit.location, unit.slot, canonical(unit.droid), unit.id))

    def unit(self, unit_id: str) -> InventoryUnit | None:
        with self._lock:
            return self.units.get(unit_id)

    def add_unit(
        self,
        droid: str,
        finish: str = "BASE",
        *,
        rarity: str = "",
        role: str = "",
        income_per_second: float | None = None,
        perk: str = "",
        location: str = UNASSIGNED,
        slot: str = "",
        source: str = "manual",
        confidence: float | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> InventoryUnit:
        timestamp = _now()
        unit = InventoryUnit(
            id=uuid.uuid4().hex,
            droid=droid.strip(),
            finish=finish,
            rarity=rarity,
            role=role,
            income_per_second=income_per_second,
            perk=perk,
            location=location,
            slot=slot,
            source=source,
            confidence=confidence,
            created_at=timestamp,
            updated_at=timestamp,
        )
        with self._lock:
            self.units[unit.id] = unit
            self._record("add", [], [asdict(unit)], source, metadata)
            self._rebuild_entries()
            self.save()
        return unit

    def ensure_seen(
        self,
        droid: str,
        finish: str,
        *,
        rarity: str = "",
        role: str = "",
        income_per_second: float | None = None,
        confidence: float | None = None,
    ) -> tuple[InventoryUnit, bool]:
        """Confirm at least one match without inventing duplicate quantity."""
        normalized_finish = normalize_finish(finish)
        target = canonical(droid)
        with self._lock:
            for unit in self.units.values():
                if canonical(unit.droid) == target and unit.finish == normalized_finish and (
                    not rarity or not unit.rarity or unit.rarity == rarity.upper()
                ):
                    return unit, False
        return self.add_unit(
            droid,
            normalized_finish,
            rarity=rarity,
            role=role,
            income_per_second=income_per_second,
            source="ocr-confirmed",
            confidence=confidence,
            metadata={"reason": "owned card observed"},
        ), True

    def update_unit(self, unit_id: str, *, source: str = "manual", **changes: Any) -> InventoryUnit:
        allowed = {
            "droid", "finish", "rarity", "role", "income_per_second", "perk",
            "location", "slot", "confidence",
        }
        unexpected = set(changes) - allowed
        if unexpected:
            raise ValueError(f"Unsupported inventory fields: {', '.join(sorted(unexpected))}")
        with self._lock:
            unit = self.units[unit_id]
            before = asdict(unit)
            for key, value in changes.items():
                if key == "finish":
                    value = normalize_finish(value)
                elif key in {"rarity", "role"}:
                    value = str(value or "").upper()
                setattr(unit, key, value)
            unit.source = source
            unit.updated_at = _now()
            self._record("update", [before], [asdict(unit)], source)
            self._rebuild_entries()
            self.save()
            return unit

    def move_unit(
        self,
        unit_id: str,
        location: str,
        slot: str = "",
        *,
        source: str = "manual",
    ) -> InventoryUnit:
        """Move one droid, swapping with an occupied target slot when possible."""
        location = location or UNASSIGNED
        slot = slot if location != UNASSIGNED else ""
        with self._lock:
            unit = self.units[unit_id]
            if unit.location == location and unit.slot == slot:
                return unit
            before = [asdict(unit)]
            old_location, old_slot = unit.location, unit.slot
            occupant = next(
                (
                    candidate for candidate in self.units.values()
                    if candidate.id != unit_id and candidate.location == location and candidate.slot == slot and slot
                ),
                None,
            )
            if occupant:
                before.append(asdict(occupant))
                if old_slot and old_location != UNASSIGNED:
                    occupant.location, occupant.slot = old_location, old_slot
                else:
                    occupant.location, occupant.slot = UNASSIGNED, ""
                occupant.source = source
                occupant.updated_at = _now()
            unit.location, unit.slot = location, slot
            unit.source = source
            unit.updated_at = _now()
            after = [asdict(self.units[snapshot["id"]]) for snapshot in before]
            self._record("move", before, after, source)
            self._rebuild_entries()
            self.save()
            return unit

    def remove_unit(self, unit_id: str, *, source: str = "manual", reason: str = "removed") -> InventoryUnit:
        with self._lock:
            unit = self.units.pop(unit_id)
            self._record("remove", [asdict(unit)], [], source, {"reason": reason})
            self._rebuild_entries()
            self.save()
            return unit

    def undo_last(self) -> InventoryEvent | None:
        with self._lock:
            event = next((item for item in reversed(self.events) if not item.undone_at), None)
            if event is None:
                return None
            for snapshot in event.after:
                self.units.pop(str(snapshot.get("id", "")), None)
            for snapshot in event.before:
                unit = InventoryUnit(**snapshot)
                self.units[unit.id] = unit
            event.undone_at = _now()
            self._rebuild_entries()
            self.save()
            return event

    def set(self, droid: str, quantity: int, quality: str, source: str = "manual") -> InventoryEntry:
        """Replace a droid's aggregate quantity for legacy callers and tests."""
        finish = normalize_finish(quality)
        quantity = max(0, int(quantity))
        target = canonical(droid)
        timestamp = _now()
        with self._lock:
            before = [asdict(unit) for unit in self.units.values() if canonical(unit.droid) == target]
            for snapshot in before:
                self.units.pop(snapshot["id"], None)
            after = []
            for _ in range(quantity):
                unit = InventoryUnit(
                    id=uuid.uuid4().hex,
                    droid=droid,
                    finish=finish,
                    source=source,
                    created_at=timestamp,
                    updated_at=timestamp,
                )
                self.units[unit.id] = unit
                after.append(asdict(unit))
            self._record("set", before, after, source)
            self._rebuild_entries()
            self.save()
            return self.entries[target] if target in self.entries else InventoryEntry(droid=droid)

    def get(self, droid: str) -> InventoryEntry | None:
        with self._lock:
            return self.entries.get(canonical(droid))

    def clear(self) -> None:
        with self._lock:
            before = [asdict(unit) for unit in self.units.values()]
            self.units.clear()
            self._record("clear", before, [], "manual")
            self._rebuild_entries()
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
