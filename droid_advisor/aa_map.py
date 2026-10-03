"""Antialiased Pillow renderer for the responsive base-inventory map."""

from __future__ import annotations

from functools import lru_cache

from PIL import Image, ImageDraw, ImageFilter

from .aa_ui import ViewportTransform, ui_font
from .base_map import AREAS, DESIGN_HEIGHT, DESIGN_WIDTH, SLOTS, MapSlot


MAP_FLOOR = "#071327"
MAP_PANEL = "#0b1931"
MAP_TEXT = "#f4f8fb"
MAP_MUTED = "#91acd0"


def _rgba(color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = color.lstrip("#")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4)) + (alpha,)


def _slot_radius(slot: MapSlot, scale: float) -> int:
    if slot.area == "battle" and slot.floor == 1:
        return max(12, min(16, round(16 * scale)))
    return max(15, min(22, round(19 * scale)))


@lru_cache(maxsize=8)
def render_inventory_map(
    width: int,
    height: int,
) -> tuple[Image.Image, ViewportTransform, dict[str, tuple[float, float]]]:
    """Return a crisp final-size map, uniform transform, and mathematical slot centers."""
    width, height = max(1, int(width)), max(1, int(height))
    transform = ViewportTransform(width, height, DESIGN_WIDTH, DESIGN_HEIGHT, padding=12)
    aa = 3
    source_width, source_height = width * aa, height * aa

    gradient = Image.new("RGBA", (1, source_height), (0, 0, 0, 255))
    gradient_draw = ImageDraw.Draw(gradient)
    top_color = (8, 21, 43)
    bottom_color = (4, 11, 28)
    for row in range(source_height):
        ratio = row / max(1, source_height - 1)
        color = tuple(round(a + (b - a) * ratio) for a, b in zip(top_color, bottom_color))
        gradient_draw.point((0, row), fill=(*color, 255))
    image = gradient.resize((source_width, source_height))
    draw = ImageDraw.Draw(image, "RGBA")

    def point(x: float, y: float) -> tuple[int, int]:
        screen_x, screen_y = transform.point(x, y)
        return round(screen_x * aa), round(screen_y * aa)

    def box(bounds: tuple[float, float, float, float]) -> tuple[int, int, int, int]:
        x1, y1, x2, y2 = transform.box(bounds)
        return round(x1 * aa), round(y1 * aa), round(x2 * aa), round(y2 * aa)

    def tube(points: list[tuple[float, float]], color: str, width_px: float) -> None:
        coords = [point(x, y) for x, y in points]
        passes = (
            ((1, 7, 19, 235), max(5 * aa, round((width_px + 4) * aa))),
            (_rgba(color, 180), max(3 * aa, round(width_px * aa))),
            ((176, 224, 255, 75), max(aa, round(1.2 * aa))),
        )
        for line_color, line_width in passes:
            draw.line(coords, fill=line_color, width=line_width, joint="curve")
            radius = line_width / 2
            for center_x, center_y in (coords[0], coords[-1]):
                draw.ellipse(
                    (center_x - radius, center_y - radius, center_x + radius, center_y + radius),
                    fill=line_color,
                )

    grid_step = max(36, round(52 * transform.scale)) * aa
    for x in range(0, source_width, grid_step):
        draw.line((x, 0, x, source_height), fill=(73, 126, 177, 8), width=aa)
    for y in range(0, source_height, grid_step):
        draw.line((0, y, source_width, y), fill=(73, 126, 177, 8), width=aa)

    tube([(270, 235), (270, 285), (810, 285), (810, 235)], "#173c67", max(14, 18 * transform.scale))
    tube([(455, 485), (885, 485)], "#173c67", max(12, 16 * transform.scale))

    shadows = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadows)
    for area in AREAS:
        x1, y1, x2, y2 = box(area.bounds)
        radius = max(9, round(14 * transform.scale)) * aa
        shadow_draw.rounded_rectangle(
            (x1, y1 + 5 * aa, x2, y2 + 5 * aa),
            radius=radius,
            fill=(0, 3, 12, 180),
        )
    image = Image.alpha_composite(image, shadows.filter(ImageFilter.GaussianBlur(5 * aa)))
    draw = ImageDraw.Draw(image, "RGBA")

    area_accents = {area.id: area.accent for area in AREAS}
    for area in AREAS:
        x1, y1, x2, y2 = box(area.bounds)
        radius = max(9, round(14 * transform.scale)) * aa
        stroke = max(2 * aa, round(2.2 * transform.scale * aa))
        draw.rounded_rectangle(
            (x1, y1, x2, y2),
            radius=radius,
            fill=MAP_PANEL,
            outline=area.accent,
            width=stroke,
        )
        inset = max(2 * aa, stroke)
        draw.rounded_rectangle(
            (x1 + inset, y1 + inset, x2 - inset, y2 - inset),
            radius=max(aa, radius - inset),
            outline=(255, 255, 255, 18),
            width=aa,
        )
        label_x, label_y = point(area.bounds[0] + 12, area.bounds[1] + 11)
        subtitle_x, subtitle_y = point(area.bounds[0] + 12, area.bounds[1] + 31)
        title_size = max(8, round(10 * transform.scale)) * aa
        subtitle_size = max(7, round(8 * transform.scale)) * aa
        draw.text((label_x, label_y), area.label, fill=area.accent, font=ui_font(title_size, True))
        draw.text((subtitle_x, subtitle_y), area.subtitle, fill=MAP_MUTED, font=ui_font(subtitle_size))

    worker_box = box((105, 345, 395, 635))
    worker_width = max(2 * aa, round(3 * transform.scale * aa))
    draw.ellipse(worker_box, outline=(1, 7, 19, 255), width=worker_width + 4 * aa)
    draw.ellipse(worker_box, outline="#56e49a", width=worker_width)
    inner_worker = tuple(value + (2 * aa if index < 2 else -2 * aa) for index, value in enumerate(worker_box))
    draw.arc(inner_worker, 205, 330, fill=(220, 255, 238, 115), width=aa)

    tube([(895, 495), (1065, 495)], "#ff5578", max(3.5, 5 * transform.scale))
    tube([(980, 265), (980, 690)], "#9f78ff", max(3.5, 5 * transform.scale))
    first_x, first_y = point(887, 523)
    second_x, second_y = point(990, 260)
    floor_font = ui_font(max(7, round(7 * transform.scale)) * aa)
    draw.text((first_x, first_y), "FIRST FLOOR", fill="#ff91a8", font=floor_font)
    draw.text((second_x, second_y), "SECOND FLOOR", fill="#c5a5ff", font=floor_font, anchor="lm")

    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    socket_specs: list[tuple[MapSlot, int, int, int, str]] = []
    positions: dict[str, tuple[float, float]] = {}
    for slot in SLOTS:
        screen_x, screen_y = transform.point(slot.x, slot.y)
        positions[slot.id] = (screen_x, screen_y)
        center_x, center_y = round(screen_x * aa), round(screen_y * aa)
        radius = _slot_radius(slot, transform.scale) * aa
        accent = area_accents.get(slot.area, "#6d92c0")
        socket_specs.append((slot, center_x, center_y, radius, accent))
        glow_draw.ellipse(
            (center_x - radius, center_y - radius, center_x + radius, center_y + radius),
            outline=_rgba(accent, 90),
            width=3 * aa,
        )
    image = Image.alpha_composite(image, glow.filter(ImageFilter.GaussianBlur(2.4 * aa)))
    draw = ImageDraw.Draw(image, "RGBA")

    for slot, center_x, center_y, radius, accent in socket_specs:
        shadow_offset = 2 * aa
        draw.ellipse(
            (center_x - radius, center_y - radius + shadow_offset, center_x + radius, center_y + radius + shadow_offset),
            fill=(0, 4, 15, 225),
        )
        draw.ellipse(
            (center_x - radius, center_y - radius, center_x + radius, center_y + radius),
            fill=accent,
        )
        rim = max(2 * aa, round(2.7 * transform.scale * aa))
        inner = (
            center_x - radius + rim,
            center_y - radius + rim,
            center_x + radius - rim,
            center_y + radius - rim,
        )
        draw.ellipse(inner, fill="#10213b")
        highlight = tuple(value + (aa if index < 2 else -aa) for index, value in enumerate(inner))
        draw.arc(highlight, 205, 330, fill=(255, 255, 255, 95), width=aa)
        label_size = max(6, round(7 * transform.scale)) * aa
        draw.text(
            (center_x, center_y),
            slot.label,
            fill=MAP_TEXT,
            font=ui_font(label_size, True),
            anchor="mm",
        )

    final = image.resize((width, height), Image.Resampling.LANCZOS)
    return final, transform, positions
