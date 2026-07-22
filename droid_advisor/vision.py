"""Windows capture and offline OCR helpers."""

from __future__ import annotations

import ctypes
from ctypes import wintypes
from dataclasses import dataclass
import re
import time
from typing import Iterable

from PIL import Image, ImageEnhance, ImageOps
import numpy as np

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

    def read(self, image: Image.Image, max_width: int = 1400, grayscale: bool = True) -> list[OcrToken]:
        # Limiting width keeps continuous monitoring light on typical gaming PCs.
        scale = min(1.0, max_width / image.width)
        if scale < 1:
            image = image.resize((int(image.width * scale), int(image.height * scale)))
        prepared = ImageEnhance.Contrast(ImageOps.grayscale(image) if grayscale else image).enhance(1.35)
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
    grayscale: bool = True,
) -> list[OcrToken]:
    """OCR a crop and translate token boxes back to full-image coordinates."""
    left, top, right, bottom = box
    tokens = ocr.read(image.crop(box), max_width=max_width, grayscale=grayscale)
    return [
        OcrToken(
            text=token.text,
            confidence=token.confidence,
            box=tuple((x + left, y + top) for x, y in token.box),
        )
        for token in tokens
    ]


CARD_BUTTONS = ("WORK", "SWAP", "LOUNGE", "CUSTOMIZE", "SELL")


def _max_true_run(row: np.ndarray) -> int:
    padded = np.pad(row.astype(np.int8), (1, 1))
    changes = np.diff(padded)
    starts = np.flatnonzero(changes == 1)
    ends = np.flatnonzero(changes == -1)
    return int((ends - starts).max()) if len(starts) else 0


def _rows_with_run(mask: np.ndarray, run_length: int) -> np.ndarray:
    """Vectorized test for rows containing a contiguous run of true pixels."""
    if run_length <= 1:
        return mask.any(axis=1)
    cumulative = np.pad(np.cumsum(mask, axis=1, dtype=np.int32), ((0, 0), (1, 0)))
    windows = cumulative[:, run_length:] - cumulative[:, :-run_length]
    return (windows >= run_length).any(axis=1)


def _probe_pixels(image: Image.Image) -> np.ndarray:
    probe = image.copy()
    probe.thumbnail((640, 360))
    return np.asarray(probe.convert("RGB"))


def card_visual_gate(image: Image.Image) -> bool:
    """Detect the stable stack of yellow card controls without running OCR."""
    pixels = _probe_pixels(image)
    red, green, blue = pixels[..., 0], pixels[..., 1], pixels[..., 2]
    yellow = (
        (red > 170) & (green > 100) & (green < 235) &
        (blue < 95) & ((red.astype(int) - blue.astype(int)) > 100)
    )
    minimum_run = int(pixels.shape[1] * 0.10)
    active_rows = _rows_with_run(yellow, minimum_run)
    padded = np.pad(active_rows.astype(np.int8), (1, 1))
    changes = np.diff(padded)
    starts = np.flatnonzero(changes == 1)
    ends = np.flatnonzero(changes == -1)
    bands = sum((end - start) >= 4 for start, end in zip(starts, ends))
    return bool(bands >= 3)


def rebirth_visual_gate(image: Image.Image) -> bool:
    """Detect the bright green REBIRTH header in the top-left client area."""
    pixels = _probe_pixels(image)
    top = pixels[: max(1, int(pixels.shape[0] * 0.14)), : int(pixels.shape[1] * 0.33)]
    red, green, blue = top[..., 0], top[..., 1], top[..., 2]
    vivid_green = (
        (green > 150) &
        (green.astype(float) > red.astype(float) * 1.5) &
        (green.astype(float) > blue.astype(float) * 1.3)
    )
    return float(vivid_green.mean()) >= 0.035


def blueprint_visual_gate(image: Image.Image) -> bool:
    """Detect the wide cyan held-blueprint prompt without reading its text."""
    pixels = _probe_pixels(image)
    lower = pixels[int(pixels.shape[0] * 0.38): int(pixels.shape[0] * 0.82)]
    red, green, blue = lower[..., 0], lower[..., 1], lower[..., 2]
    cyan = (red < 105) & (green > 125) & (blue > 140)
    minimum_run = int(pixels.shape[1] * 0.18)
    return bool(_rows_with_run(cyan, minimum_run).any())


def visual_gates(image: Image.Image) -> tuple[bool, bool, bool]:
    """Return card, Rebirth, and blueprint gates from one downsample pass."""
    pixels = _probe_pixels(image)

    red, green, blue = pixels[..., 0], pixels[..., 1], pixels[..., 2]
    yellow = (
        (red > 170) & (green > 100) & (green < 235) &
        (blue < 95) & ((red.astype(int) - blue.astype(int)) > 100)
    )
    active_rows = _rows_with_run(yellow, int(pixels.shape[1] * 0.10))
    padded = np.pad(active_rows.astype(np.int8), (1, 1))
    changes = np.diff(padded)
    starts = np.flatnonzero(changes == 1)
    ends = np.flatnonzero(changes == -1)
    card = sum((end - start) >= 4 for start, end in zip(starts, ends)) >= 3

    top = pixels[: max(1, int(pixels.shape[0] * 0.14)), : int(pixels.shape[1] * 0.33)]
    tr, tg, tb = top[..., 0], top[..., 1], top[..., 2]
    vivid_green = (
        (tg > 150) &
        (tg.astype(float) > tr.astype(float) * 1.5) &
        (tg.astype(float) > tb.astype(float) * 1.3)
    )
    rebirth = float(vivid_green.mean()) >= 0.035

    lower = pixels[int(pixels.shape[0] * 0.38): int(pixels.shape[0] * 0.82)]
    lr, lg, lb = lower[..., 0], lower[..., 1], lower[..., 2]
    cyan = (lr < 105) & (lg > 125) & (lb > 140)
    blueprint = _rows_with_run(cyan, int(pixels.shape[1] * 0.18)).any()
    return bool(card), bool(rebirth), bool(blueprint)


def is_card_button_text(text: str) -> bool:
    """Accept button labels while rejecting tooltip sentences containing a cue."""
    upper = text.strip().upper()
    return any(upper.startswith(cue) and len(upper) <= len(cue) + 12 for cue in CARD_BUTTONS)


def game_window_rect(title_terms: Iterable[str] = ("fortnite", "droid tycoon")) -> tuple[int, int, int, int] | None:
    user32 = ctypes.windll.user32
    user32.GetForegroundWindow.restype = wintypes.HWND
    matches: list[tuple[int, int, int, int]] = []
    terms = tuple(term.lower() for term in title_terms)
    foreground = user32.GetForegroundWindow()

    @ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    def callback(hwnd, _):
        # MSS reads visible desktop pixels, not an obscured window's private
        # back buffer. Scanning while another application covers Fortnite can
        # therefore interpret browser or chat text as an in-game notification.
        if hwnd != foreground or not user32.IsWindowVisible(hwnd) or user32.IsIconic(hwnd):
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


class GameCapture:
    """Thread-owned persistent capture session with a briefly cached game rect."""

    def __init__(self, rect_refresh_seconds: float = 0.0) -> None:
        from mss import mss

        self._camera = mss()
        self._rect_refresh_seconds = rect_refresh_seconds
        self._rect = None
        self._rect_checked_at = 0.0

    def capture(self) -> Image.Image | None:
        now = time.monotonic()
        # Revalidate on every probe by default. This immediately suspends
        # capture when Fortnite loses focus instead of scanning the window
        # that is visibly covering it.
        if self._rect is None or now - self._rect_checked_at >= self._rect_refresh_seconds:
            self._rect = game_window_rect()
            self._rect_checked_at = now
        if self._rect is None:
            return None
        left, top, width, height = self._rect
        try:
            shot = self._camera.grab({"left": left, "top": top, "width": width, "height": height})
        except Exception:
            self._rect = None
            raise
        return Image.frombytes("RGB", shot.size, shot.rgb)

    def close(self) -> None:
        self._camera.close()


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
    relevant_tokens = []
    for token in tokens:
        cx, cy = token.center
        if cx <= 0.68 * width and 0.20 * height <= cy <= 0.82 * height:
            relevant_tokens.append(token)
    lines: list[list[OcrToken]] = []
    for token in sorted(relevant_tokens, key=lambda item: (item.center[1], item.center[0])):
        cy = token.center[1]
        line = next(
            (
                candidate for candidate in lines
                if abs(sum(item.center[1] for item in candidate) / len(candidate) - cy)
                <= max(18.0, token.height * 1.5)
            ),
            None,
        )
        if line is None:
            lines.append([token])
        else:
            line.append(token)
    line_texts = [
        canonical(" ".join(item.text for item in sorted(line, key=lambda token: token.center[0])))
        .replace("BESKER", "BESKAR")
        for line in lines
    ]
    compact = canonical(" ".join(token.text for token in relevant_tokens)).replace("BESKER", "BESKAR")
    galactic_line = next(
        (
            line for line in line_texts
            if "GALACTICDROID" in line and ("SPAWN" in line or "SANDCRAWLER" in line)
        ),
        None,
    )
    if galactic_line:
        galactic = re.search(r"GALACTICDROID(COMMON|RARE|EPIC|LEGENDARY|MYTHIC)", galactic_line)
        if not galactic:
            return None
        rarity = galactic.group(1)
        if rarity not in ("EPIC", "LEGENDARY", "MYTHIC"):
            return None
        return "GALACTIC", rarity
    match = re.search(
        r"(DIAMOND|RAINBOW|BESKAR)DROID(COMMON|RARE|EPIC|LEGENDARY|MYTHIC)SPAWNED",
        compact,
    )
    if not match:
        return None
    finish, rarity = match.group(1), match.group(2)
    if rarity not in ("LEGENDARY", "MYTHIC"):
        return None
    return finish, rarity


def rebirth_rank(tokens: list[OcrToken]) -> int | None:
    """Read the target rank shown by the View Rebirth menu (for example Rank23)."""
    text = " ".join(token.text for token in tokens)
    match = re.search(r"RANK\s*([1-9]|[12][0-9]|30)\b", text, re.IGNORECASE)
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
        for raw in re.findall(r"\b(?:[0-9]|[12][0-9]|30)\b", token.text):
            candidates.append((cy, int(raw), token.confidence))
    if not candidates:
        return None
    # The green indicator sits near 22% from the left and 80% from the top.
    return min(candidates, key=lambda item: (abs(item[0] / height - 0.80), -item[2]))[1]
