"""Windows capture and offline OCR helpers."""

from __future__ import annotations

import ctypes
from ctypes import wintypes
from dataclasses import dataclass
import re
from typing import Iterable

from PIL import Image, ImageEnhance, ImageOps

from .engine import ALL_DROIDS, canonical, match_droid


@dataclass(frozen=True)
class OcrToken:
    text: str
    confidence: float
    box: tuple[tuple[float, float], ...]

    @property
    def center(self) -> tuple[float, float]:
        return (
            sum(point[0] for point in self.box) / len(self.box),
            sum(point[1] for point in self.box) / len(self.box),
        )

    @property
    def height(self) -> float:
        return max(p[1] for p in self.box) - min(p[1] for p in self.box)


class OfflineOcr:
    def __init__(self, threads: int = 1) -> None:
        from rapidocr_onnxruntime import RapidOCR

        # Unrestricted ONNX defaults can consume every logical CPU and make a
        # full-screen scan block focused UI checks for more than a minute.
        self._engine = RapidOCR(
            intra_op_num_threads=threads,
            inter_op_num_threads=1,
            det_limit_type="max",
            det_limit_side_len=736,
        )

    def read(self, image: Image.Image, max_width: int = 1400) -> list[OcrToken]:
        # Limiting width keeps continuous monitoring light on typical gaming PCs.
        scale = min(1.0, max_width / image.width)
        if scale < 1:
            image = image.resize((int(image.width * scale), int(image.height * scale)))
        prepared = ImageEnhance.Contrast(ImageOps.grayscale(image)).enhance(1.35)
        # Droid Tycoon UI text is upright. Skipping the angle classifier avoids
        # another model pass, and max-side limiting prevents thin crops from
        # being enlarged into multi-million-pixel detector inputs.
        result, _ = self._engine(prepared, use_cls=False)
        if not result:
            return []
        inverse = 1 / scale
        return [
            OcrToken(
                text=str(item[1]).strip(),
                confidence=float(item[2]),
                box=tuple((float(x) * inverse, float(y) * inverse) for x, y in item[0]),
            )
            for item in result
            if len(item) >= 3 and float(item[2]) >= 0.35
        ]


def read_region(
    ocr: OfflineOcr,
    image: Image.Image,
    box: tuple[int, int, int, int],
    max_width: int = 1400,
) -> list[OcrToken]:
    """OCR a crop and translate token boxes back to full-image coordinates."""
    left, top, right, bottom = box
    tokens = ocr.read(image.crop(box), max_width=max_width)
    return [
        OcrToken(
            text=token.text,
            confidence=token.confidence,
            box=tuple((x + left, y + top) for x, y in token.box),
        )
        for token in tokens
    ]


CARD_BUTTONS = ("WORK", "SWAP", "LOUNGE", "CUSTOMIZE", "SELL")


def is_card_button_text(text: str) -> bool:
    """Accept button labels while rejecting tooltip sentences containing a cue."""
    upper = text.strip().upper()
    return any(upper.startswith(cue) and len(upper) <= len(cue) + 12 for cue in CARD_BUTTONS)


def game_window_rect(title_terms: Iterable[str] = ("fortnite", "droid tycoon")) -> tuple[int, int, int, int] | None:
    user32 = ctypes.windll.user32
    matches: list[tuple[int, int, int, int]] = []
    terms = tuple(term.lower() for term in title_terms)

    @ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    def callback(hwnd, _):
        if not user32.IsWindowVisible(hwnd):
            return True
        length = user32.GetWindowTextLengthW(hwnd)
        if not length:
            return True
        buffer = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buffer, length + 1)
        if not any(term in buffer.value.lower() for term in terms):
            return True
        rect = wintypes.RECT()
        if user32.GetWindowRect(hwnd, ctypes.byref(rect)):
            width, height = rect.right - rect.left, rect.bottom - rect.top
            if width > 640 and height > 480:
                matches.append((rect.left, rect.top, width, height))
        return True

    user32.EnumWindows(callback, 0)
    return max(matches, key=lambda r: r[2] * r[3]) if matches else None


def capture_game() -> Image.Image | None:
    from mss import mss

    rect = game_window_rect()
    if rect is None:
        return None
    left, top, width, height = rect
    with mss() as camera:
        shot = camera.grab({"left": left, "top": top, "width": width, "height": height})
        return Image.frombytes("RGB", shot.size, shot.rgb)


def panel_is_open(tokens: list[OcrToken], width: int, height: int) -> bool:
    """Recognize the vertically stacked card controls, not stray world text."""
    card_cues = []
    for token in tokens:
        cx, cy = token.center
        if not (0.18 * width <= cx <= 0.82 * width and 0.30 * height <= cy <= 0.86 * height):
            continue
        if is_card_button_text(token.text):
            card_cues.append((cx, cy, token.text.upper()))
    if len(card_cues) < 3:
        return False
    # Real card buttons form a vertical column; unrelated UI labels do not.
    xs = [item[0] for item in card_cues]
    ys = sorted(item[1] for item in card_cues)
    aligned = max(xs) - min(xs) <= 0.28 * width
    vertically_spread = ys[-1] - ys[0] >= 0.16 * height
    return aligned and vertically_spread


def card_header_rect(tokens: list[OcrToken], width: int, height: int) -> tuple[int, int, int, int] | None:
    """Locate the name/quality header above an opened card's button column."""
    cues = []
    for token in tokens:
        cx, cy = token.center
        if 0.25 * height <= cy <= 0.88 * height and is_card_button_text(token.text):
            cues.append((cx, cy))
    if len(cues) < 3:
        return None
    anchor_x = sum(x for x, _ in cues) / len(cues)
    first_button_y = min(y for _, y in cues)
    return (
        max(0, int(anchor_x - 0.22 * width)),
        max(0, int(0.04 * height)),
        min(width, int(anchor_x + 0.28 * width)),
        min(height, int(first_button_y)),
    )


def rebirth_view_is_open(tokens: list[OcrToken]) -> bool:
    """Require menu-language evidence before changing the configured cycle."""
    text = " ".join(token.text.upper() for token in tokens)
    return "REBIRTH" in text and any(cue in text for cue in ("RANK", "NEED", "DROID", "REQUIRED", "COST"))


def rebirth_header_is_open(tokens: list[OcrToken]) -> bool:
    """Recognize the focused top strip of the View Rebirth menu."""
    text = " ".join(token.text.upper() for token in tokens)
    return "REBIRTH" in text and "RANK" in text


def blueprint_is_visible(tokens: list[OcrToken], width: int, height: int) -> bool:
    """Trigger only on the held-blueprint pickup prompt."""
    lower_text = canonical(" ".join(
        token.text for token in tokens if token.center[1] >= 0.60 * height
    ))
    if "BLUEPRINT" in lower_text and "CRAFTING" in lower_text:
        return True
    for token in tokens:
        cx, cy = token.center
        compact = canonical(token.text)
        if cy >= 0.60 * height and "BLUEPRINT" in compact and "CRAFTING" in compact:
            return True
    return False


def blueprint_droid(tokens: list[OcrToken]) -> tuple[str | None, float]:
    """Match a droid inside a tightly cropped blueprint card.

    Exact token matching is important for short names such as IG, which are too
    small to safely locate in combined full-screen OCR text.
    """
    candidates = []
    for token in tokens:
        raw = canonical(token.text)
        if not raw:
            continue
        for name in ALL_DROIDS:
            key = canonical(name)
            exact = raw == key
            contained = len(key) >= 4 and key in raw
            if exact or contained:
                rank = (100 if exact else 80) + token.height + min(len(key), 20)
                candidates.append((rank, name, 1.0))
    if not candidates:
        return None, 0.0
    _, name, score = max(candidates)
    return name, score


def blueprint_details(tokens: list[OcrToken]) -> tuple[str | None, str | None]:
    """Return optional (finish, rarity) labels from the blueprint card."""
    text = canonical(" ".join(token.text for token in tokens))
    finish = next((value for value in ("BESKAR", "RAINBOW", "DIAMOND", "GOLD", "DEFAULT") if value in text), None)
    rarity = next((value for value in ("MYTHIC", "LEGENDARY", "EPIC", "RARE", "COMMON") if value in text), None)
    return finish, rarity


def high_value_spawn(tokens: list[OcrToken], width: int, height: int) -> tuple[str, str] | None:
    """Read strict high-value conveyor notifications from the left-side feed."""
    relevant = []
    for token in tokens:
        cx, cy = token.center
        if cx <= 0.68 * width and 0.20 * height <= cy <= 0.82 * height:
            relevant.append(token.text)
    compact = canonical(" ".join(relevant)).replace("BESKER", "BESKAR")
    match = re.search(r"(DIAMOND|RAINBOW|BESKAR)DROID(LEGENDARY|MYTHIC)SPAWNED", compact)
    if not match:
        return None
    return match.group(1), match.group(2)


def rebirth_rank(tokens: list[OcrToken]) -> int | None:
    """Read the target rank shown by the View Rebirth menu (for example Rank23)."""
    text = " ".join(token.text for token in tokens)
    match = re.search(r"RANK\s*([1-9]|1[0-9]|2[0-7])\b", text, re.IGNORECASE)
    return int(match.group(1)) if match else None


def visible_droids(tokens: list[OcrToken]) -> set[str]:
    found: set[str] = set()
    text = " ".join(token.text for token in tokens)
    normalized = canonical(text)
    # Long names are safe to find in combined OCR text; short names require a token match.
    for name in ALL_DROIDS:
        key = canonical(name)
        if len(key) >= 4 and key in normalized:
            found.add(name)
    for token in tokens:
        name, score = match_droid(token.text, threshold=0.82)
        if name and (len(canonical(name)) >= 3 or score == 1.0):
            found.add(name)
    return found


def selected_droid(tokens: list[OcrToken], width: int, height: int) -> tuple[str | None, float]:
    button_cues = []
    for token in tokens:
        cx, cy = token.center
        if 0.25 * height <= cy <= 0.88 * height and is_card_button_text(token.text):
            button_cues.append((cx, cy))
    anchor_x = sum(x for x, _ in button_cues) / len(button_cues) if button_cues else width * 0.42
    first_button_y = min((y for _, y in button_cues), default=height * 0.56)

    candidates = []
    role_labels = {"BATTLE", "WORKER", "COMPANION"}
    for token in tokens:
        cx, cy = token.center
        if not (0.03 * width <= cx <= 0.82 * width and 0.08 * height <= cy < first_button_y):
            continue
        if button_cues and abs(cx - anchor_x) > 0.28 * width:
            continue
        token_key = canonical(token.text)
        if token_key in role_labels or any(
            phrase in token.text.upper()
            for phrase in ("SAFE TO SELL", "KEEP", "NEEDED AT", "NOT USED IN THIS CYCLE")
        ):
            continue
        name, score = match_droid(token.text, threshold=0.70)
        if name:
            exact = canonical(name) in canonical(token.text)
            rank = score * 100 + token.height + (80 if exact else 0) + min(len(name), 20)
            candidates.append((rank, name, score))
    if not candidates:
        return None, 0.0
    _, name, score = max(candidates)
    return name, score


def completed_rebirth(tokens: list[OcrToken], width: int, height: int) -> int | None:
    candidates = []
    for token in tokens:
        cx, cy = token.center
        if not (0.10 * width <= cx <= 0.32 * width and 0.70 * height <= cy <= 0.91 * height):
            continue
        for raw in re.findall(r"\b(?:[0-9]|1[0-9]|2[0-7])\b", token.text):
            candidates.append((cy, int(raw), token.confidence))
    if not candidates:
        return None
    # The green indicator sits near 22% from the left and 80% from the top.
    return min(candidates, key=lambda item: (abs(item[0] / height - 0.80), -item[2]))[1]
