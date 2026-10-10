"""Supersampled Pillow primitives for smooth, resolution-independent Tk UI."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


AA_SCALE = 4


def _rgb(color: str) -> tuple[int, int, int]:
    value = color.lstrip("#")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def blend_color(color: str, target: str, amount: float) -> str:
    source_rgb = _rgb(color)
    target_rgb = _rgb(target)
    amount = max(0.0, min(1.0, amount))
    values = tuple(round(source + (dest - source) * amount) for source, dest in zip(source_rgb, target_rgb))
    return "#" + "".join(f"{value:02x}" for value in values)


@dataclass(frozen=True)
class ViewportTransform:
    width: int
    height: int
    design_width: float
    design_height: float
    padding: float = 12.0

    @property
    def scale(self) -> float:
        usable_width = max(1.0, self.width - self.padding * 2)
        usable_height = max(1.0, self.height - self.padding * 2)
        return max(0.01, min(usable_width / self.design_width, usable_height / self.design_height))

    @property
    def offset_x(self) -> float:
        return (self.width - self.design_width * self.scale) / 2

    @property
    def offset_y(self) -> float:
        return (self.height - self.design_height * self.scale) / 2

    def point(self, x: float, y: float) -> tuple[float, float]:
        return self.offset_x + x * self.scale, self.offset_y + y * self.scale

    def box(self, bounds: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
        x1, y1 = self.point(bounds[0], bounds[1])
        x2, y2 = self.point(bounds[2], bounds[3])
        return x1, y1, x2, y2

    def inverse(self, x: float, y: float) -> tuple[float, float]:
        return (x - self.offset_x) / self.scale, (y - self.offset_y) / self.scale


@lru_cache(maxsize=64)
def ui_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    windows_dir = Path(os.environ.get("WINDIR", r"C:\Windows"))
    filename = "seguisb.ttf" if bold else "segoeui.ttf"
    try:
        return ImageFont.truetype(str(windows_dir / "Fonts" / filename), max(6, int(size)))
    except OSError:
        return ImageFont.load_default()


def _downsample(image: Image.Image, width: int, height: int) -> Image.Image:
    return image.resize((max(1, width), max(1, height)), Image.Resampling.LANCZOS)


def render_soft_button_surface(
    width: int,
    height: int,
    color: str,
    state: str = "normal",
    focused: bool = False,
) -> Image.Image:
    """Render one rounded, dimensional button background at its final pixel size."""
    width, height = max(24, int(width)), max(24, int(height))
    aa = AA_SCALE
    source_size = (width * aa, height * aa)
    image = Image.new("RGBA", source_size, (0, 0, 0, 0))
    radius = 12 * aa
    lift = -1 if state == "hover" else 1 if state == "pressed" else 0
    top = (3 + lift) * aa
    bottom = (height - (3 if state == "pressed" else 5) + lift) * aa
    bounds = (4 * aa, top, (width - 4) * aa, bottom)

    if state != "pressed":
        shadow = Image.new("RGBA", source_size, (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow)
        shadow_bounds = (bounds[0], bounds[1] + 3 * aa, bounds[2], bounds[3] + 3 * aa)
        shadow_draw.rounded_rectangle(shadow_bounds, radius=radius, fill=(1, 6, 17, 190))
        image = Image.alpha_composite(image, shadow.filter(ImageFilter.GaussianBlur(2.1 * aa)))

    base = color
    if state == "hover":
        base = blend_color(color, "#ffffff", 0.10)
    elif state == "pressed":
        base = blend_color(color, "#000000", 0.12)
    elif state == "disabled":
        base = blend_color(color, "#5f6b7c", 0.58)
    top_color = _rgb(blend_color(base, "#ffffff", 0.12))
    bottom_color = _rgb(blend_color(base, "#000000", 0.10))

    mask = Image.new("L", source_size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(bounds, radius=radius, fill=255)
    gradient = Image.new("RGBA", source_size, (0, 0, 0, 0))
    gradient_draw = ImageDraw.Draw(gradient)
    span = max(1, int(bounds[3] - bounds[1]))
    for row in range(int(bounds[1]), int(bounds[3]) + 1):
        ratio = (row - bounds[1]) / span
        rgb = tuple(round(a + (b - a) * ratio) for a, b in zip(top_color, bottom_color))
        gradient_draw.line((bounds[0], row, bounds[2], row), fill=(*rgb, 255))
    image.paste(gradient, (0, 0), mask)

    draw = ImageDraw.Draw(image)
    border = blend_color(base, "#ffffff", 0.22)
    draw.rounded_rectangle(bounds, radius=radius, outline=border, width=1 * aa)
    sheen_y = bounds[1] + 2 * aa
    sheen_inset = radius * 0.72
    draw.line(
        (bounds[0] + sheen_inset, sheen_y, bounds[2] - sheen_inset, sheen_y),
        fill=(*_rgb("#ffffff"), 78),
        width=aa,
    )
    if focused:
        focus_bounds = (aa, aa, (width - 1) * aa, (height - 1) * aa)
        draw.rounded_rectangle(focus_bounds, radius=14 * aa, outline="#73d9ff", width=2 * aa)
    return _downsample(image, width, height)


def render_orb_badge(
    diameter: int,
    accent: str,
    state: str = "normal",
    selected: bool = False,
) -> Image.Image:
    """Render a smooth beveled socket/role medallion without its text label."""
    diameter = max(24, int(diameter))
    aa = AA_SCALE
    size = diameter * aa
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rim = blend_color(accent, "#ffffff", 0.14 if state == "hover" else 0.04)

    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((5 * aa, 5 * aa, size - 5 * aa, size - 5 * aa), outline=(*_rgb(accent), 105), width=3 * aa)
    image = Image.alpha_composite(image, glow.filter(ImageFilter.GaussianBlur(2.3 * aa)))

    draw = ImageDraw.Draw(image)
    outer = (4 * aa, 3 * aa, size - 4 * aa, size - 5 * aa)
    draw.ellipse((outer[0], outer[1] + 3 * aa, outer[2], outer[3] + 3 * aa), fill=(1, 6, 17, 205))
    draw.ellipse(outer, fill=rim)
    ring = 3 * aa
    inner = (outer[0] + ring, outer[1] + ring, outer[2] - ring, outer[3] - ring)
    draw.ellipse(inner, fill="#0a162b")
    highlight = (inner[0] + aa, inner[1] + aa, inner[2] - aa, inner[3] - aa)
    draw.arc(highlight, 198, 326, fill=(*_rgb("#ffffff"), 95), width=1 * aa)
    if selected:
        draw.ellipse((aa, aa, size - aa, size - aa), outline="#73d9ff", width=2 * aa)
    return _downsample(image, diameter, diameter)
