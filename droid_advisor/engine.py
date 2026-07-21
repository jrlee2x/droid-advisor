"""Deterministic rebirth-cycle matching and sell/keep decisions."""

from dataclasses import dataclass
from difflib import SequenceMatcher
import re

from .cycles import CYCLES


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

    @property
    def message(self) -> str:
        if self.safe_to_sell:
            suffix = f"LAST NEEDED AT RB{self.last_needed}" if self.last_needed else "NOT USED IN THIS CYCLE"
            return f"SAFE TO SELL: {suffix}"
        return f"KEEP: NEEDED AT RB{self.next_needed}"


def advise(cycle: int, completed_rebirth: int, droid: str) -> Advice:
    target = canonical(droid)
    appearances = [
        rb for rb, required in enumerate(CYCLES[cycle], start=1)
        if target in {canonical(item) for item in required}
    ]
    future = [rb for rb in appearances if rb > completed_rebirth]
    return Advice(
        droid=droid,
        safe_to_sell=not future,
        completed_rebirth=completed_rebirth,
        next_needed=min(future) if future else None,
        last_needed=max(appearances) if appearances else None,
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
