"""Evidence attached to advice across capture, OCR and the Tk event queue."""

from dataclasses import dataclass
import numpy as np
from PIL import Image

MAX_ADVICE_AGE = 2.5
MAX_VERIFIED_ADVICE_AGE = 12.0


def _text_threshold(values, *, midpoint=False):
    """Separate lettering and fill using the current patch's luminance."""
    hist = np.bincount(values.ravel(), minlength=256).astype(float)
    weight = np.cumsum(hist)
    total = weight[-1]
    moment = np.cumsum(hist * np.arange(256))
    denominator = weight * (total - weight)
    score = np.divide((moment[-1] * weight - moment * total) ** 2,
                      denominator, out=np.zeros(256), where=denominator > 0)
    split = int(np.argmax(score))
    if not midpoint or not denominator[split]:
        return split
    # Otsu's optimal split can sit on the fill's intensity. Use the midpoint
    # of the two classes so a tiny fill change cannot flip the entire patch.
    return int((moment[split] / weight[split]
                + (moment[-1] - moment[split]) / (total - weight[split])) / 2)


@dataclass(frozen=True)
class TextPatch:
    box: tuple[int, int, int, int]
    size: tuple[int, int]
    threshold: int
    pixels: bytes
    adaptive_threshold: bool = False

    @classmethod
    def capture(cls, image, box, *, white_text=False, adaptive_threshold=False):
        crop = image.crop(box).convert("L")
        crop.thumbnail((384, 80), Image.Resampling.LANCZOS)
        values = np.asarray(crop)
        # Otsu separates lettering from its background without depending on
        # whether this particular button has dark or light text.
        threshold = _text_threshold(values, midpoint=adaptive_threshold)
        # Card titles are white over animated artwork. Otsu alone can select
        # the moving model/background instead of the actual title lettering.
        if white_text:
            threshold = max(215, threshold)
        return cls(box, crop.size, threshold, (values > threshold).tobytes(), adaptive_threshold)

    def comparison(self, image):
        values = np.asarray(image.crop(self.box).convert("L").resize(self.size, Image.Resampling.LANCZOS))
        previous = np.frombuffer(self.pixels, dtype=np.bool_).reshape(values.shape)
        threshold = _text_threshold(values, midpoint=True) if self.adaptive_threshold else self.threshold
        current = values > threshold
        ink = min(np.count_nonzero(previous), np.count_nonzero(~previous))
        # Measure against lettering as well as the rectangle. Otherwise a
        # short R2 title could vanish inside a mostly empty wide patch.
        tolerance = min(previous.size * 0.015, ink * 0.06)
        changed = int(np.count_nonzero(previous != current))
        return {"matches": bool(ink >= 8 and changed <= tolerance), "box": self.box,
                "threshold": self.threshold, "current_threshold": threshold,
                "changed": changed, "ink": int(ink), "tolerance": round(tolerance, 2),
                "adaptive": self.adaptive_threshold}

    def matches(self, image):
        return self.comparison(image)["matches"]


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
