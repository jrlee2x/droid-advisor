"""Evidence attached to advice across capture, OCR and the Tk event queue."""

from dataclasses import dataclass

MAX_ADVICE_AGE = 2.5


@dataclass(frozen=True)
class FrameEvidence:
    number: int
    captured_at: float
    cycle: int
    completed: int


@dataclass(frozen=True)
class AdviceTicket:
    evidence: FrameEvidence
    source: str
    message: str
    color: str


def evidence_is_current(
    evidence: FrameEvidence,
    number: int,
    now: float,
    cycle: int,
    completed: int,
    paused: bool,
    visible: bool,
) -> bool:
    """A delayed read cannot authorize advice for a newer frame or progress."""
    return (
        visible and not paused
        and evidence.number == number
        and 0 <= now - evidence.captured_at <= MAX_ADVICE_AGE
        and (evidence.cycle, evidence.completed) == (cycle, completed)
    )
