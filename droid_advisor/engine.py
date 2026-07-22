"""Deterministic rebirth-cycle matching and sell/keep decisions."""

from dataclasses import dataclass
from difflib import SequenceMatcher
import re

from .cycles import CYCLES
from .qualities import QUALITY_ORDER, quality_table


ALIASES = {
    "PROTOROLL": "PROTOROLLER",
    "PROTOROLLER": "PROTOROLLER",
    "MONOWLKR": "MONOWLKR",
    "SENATEHOVERCAM": "SENATEHOVERCAM",
}


def canonical(name: str) -> str:
    value = re.sub(r"[^A-Z0-9]", "", name.upper())
    return ALIASES.get(value, value)


ALL_DROIDS = sorted({name for rows in CYCLES.values() for row in rows for name in row})


@dataclass(frozen=True)
class Advice:
    droid: str
    safe_to_sell: bool
    completed_rebirth: int
    next_needed: int | None
    last_needed: int | None
    quality: str | None = None
    next_required_quality: str | None = None

    @property
    def message(self) -> str:
        if self.safe_to_sell:
            suffix = f"LAST NEEDED AT RB{self.last_needed}" if self.last_needed else "NOT USED IN THIS CYCLE"
            return f"SAFE TO SELL: {suffix}"
        if (
            self.quality
            and self.next_required_quality
            and QUALITY_ORDER[self.quality] < QUALITY_ORDER[self.next_required_quality]
        ):
            return f"KEEP: UPGRADE TO {self.next_required_quality} FOR RB{self.next_needed}"
        return f"KEEP: NEEDED AT RB{self.next_needed}"


def advise(cycle: int, completed_rebirth: int, droid: str, quality: str | None = None) -> Advice:
    target = canonical(droid)
    normalized_quality = quality.upper() if quality and quality.upper() in QUALITY_ORDER else None
    requirements = quality_table()[str(cycle)]
    appearances = []
    for rb, required in enumerate(CYCLES[cycle], start=1):
        for slot, item in enumerate(required):
            if canonical(item) != target:
                continue
            required_quality = requirements[str(rb)][slot]
            # Any owned quality can satisfy a future requirement. A higher quality
            # already outranks it, while a lower quality can be upgraded into it.
            appearances.append((rb, required_quality))
    future = [(rb, required_quality) for rb, required_quality in appearances if rb > completed_rebirth]
    next_future = min(future, default=None, key=lambda item: item[0])
    return Advice(
        droid=droid,
        safe_to_sell=not future,
        completed_rebirth=completed_rebirth,
        next_needed=next_future[0] if next_future else None,
        last_needed=max((rb for rb, _ in appearances), default=None),
        quality=normalized_quality,
        next_required_quality=next_future[1] if next_future else None,
    )


def safe_to_sell_droids(cycle: int, completed_rebirth: int) -> list[Advice]:
    """Return previously required droids with no remaining use in this cycle."""
    return [
        result
        for name in ALL_DROIDS
        if (
            (result := advise(cycle, completed_rebirth, name)).safe_to_sell
            and result.last_needed is not None
            and result.last_needed <= completed_rebirth
        )
    ]


def match_droid(text: str, threshold: float = 0.72) -> tuple[str | None, float]:
    normalized = canonical(text)
    exact = [name for name in ALL_DROIDS if canonical(name) == normalized]
    if exact:
        return max(exact, key=len), 1.0
    contained = [name for name in ALL_DROIDS if canonical(name) and canonical(name) in normalized]
    if contained:
        return max(contained, key=lambda name: len(canonical(name))), 1.0
    best_name, best_score = None, 0.0
    for name in ALL_DROIDS:
        token = canonical(name)
        score = SequenceMatcher(None, token, normalized).ratio()
        if score > best_score:
            best_name, best_score = name, score
    return (best_name, best_score) if best_score >= threshold else (None, best_score)


def detect_cycle(visible_droids: set[str]) -> tuple[int, int] | None:
    """Return (cycle, required_rb) only when the visible triple is unique."""
    wanted = {canonical(name) for name in visible_droids}
    if len(wanted) < 3:
        return None
    matches = []
    for cycle, rows in CYCLES.items():
        for rb, required in enumerate(rows, start=1):
            if {canonical(name) for name in required}.issubset(wanted):
                matches.append((cycle, rb))
    cycles = {cycle for cycle, _ in matches}
    return matches[0] if len(matches) == 1 or len(cycles) == 1 and len(matches) == 1 else None
