"""Evidence attached to advice across capture, OCR and the Tk event queue."""

from dataclasses import dataclass
import numpy as np
from PIL import Image

MAX_ADVICE_AGE = 2.5
MAX_VERIFIED_ADVICE_AGE = 12.0


@dataclass(frozen=True)
class TextPatch:
    box: tuple[int, int, int, int]
    size: tuple[int, int]
    threshold: int
    pixels: bytes

    @classmethod
    def capture(cls, image, box, *, white_text=False):
        crop = image.crop(box).convert("L")
        crop.thumbnail((384, 80), Image.Resampling.LANCZOS)
        values = np.asarray(crop)
        # Otsu separates lettering from its background without depending on
        # whether this particular button has dark or light text.
        hist = np.bincount(values.ravel(), minlength=256).astype(float)
        weight = np.cumsum(hist)
        total = weight[-1]
        moment = np.cumsum(hist * np.arange(256))
        denominator = weight * (total - weight)
        score = np.divide((moment[-1] * weight - moment * total) ** 2,
                          denominator, out=np.zeros(256), where=denominator > 0)
        threshold = int(np.argmax(score))
        # Card titles are white over animated artwork. Otsu alone can select
        # the moving model/background instead of the actual title lettering.
        if white_text:
            threshold = max(215, threshold)
        return cls(box, crop.size, threshold, (values > threshold).tobytes())

    def matches(self, image):
        values = np.asarray(image.crop(self.box).convert("L").resize(self.size, Image.Resampling.LANCZOS))
        previous = np.frombuffer(self.pixels, dtype=np.bool_).reshape(values.shape)
        current = values > self.threshold
        ink = min(np.count_nonzero(previous), np.count_nonzero(~previous))
        # Measure against lettering as well as the rectangle. Otherwise a
        # short R2 title could vanish inside a mostly empty wide patch.
        tolerance = min(previous.size * 0.015, ink * 0.06)
        return ink >= 8 and np.count_nonzero(previous != current) <= tolerance


@dataclass(frozen=True)
class VisualEvidence:
    frame_size: tuple[int, int]
    patches: tuple[TextPatch, ...]

    def matches(self, image):
        return image is not None and image.size == self.frame_size and bool(self.patches) and all(
            patch.matches(image) for patch in self.patches
        )


@dataclass(frozen=True)
class FrameEvidence:
    number: int
    captured_at: float
    cycle: int
    completed: int
    visual: VisualEvidence | None = None


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
    visually_current: bool = False,
) -> bool:
    """A delayed read cannot authorize advice for a newer frame or progress."""
    return (
        visible and not paused
        and (evidence.number == number or visually_current)
        and 0 <= now - evidence.captured_at <= (MAX_VERIFIED_ADVICE_AGE if visually_current else MAX_ADVICE_AGE)
        and (evidence.cycle, evidence.completed) == (cycle, completed)
    )
