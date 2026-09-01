"""Build the hosted Droid Tycoon upgrade-chip cost chart and JSON data."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

from .build_rebirth_chart import CYAN, INK, MUTED, ORANGE, fitted_logo, font, starfield
from .build_rebirth_tiles import QUALITY_COLORS, RARITY_COLORS
from .chip_costs import CHIP_COSTS_126

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "rebirth-chart-site" / "assets"
WIDTH, HEIGHT = 1800, 1030

QUALITIES = ("GOLD", "DIAMOND", "RAINBOW", "BESKAR", "GALACTIC", "STELLAR")
RARITIES = ("EPIC", "LEGENDARY", "MYTHIC")

TITLE = font("ariblk.ttf", 58)
SUBTITLE = font("arialbd.ttf", 23)
HEADER = font("ariblk.ttf", 21)
RARITY = font("ariblk.ttf", 30)
COST = font("ariblk.ttf", 31)
SMALL = font("arialbd.ttf", 16)
NOTE = font("arialbd.ttf", 19)


def chip_cost_payload() -> dict[str, object]:
    """Return the canonical Update 1.26 chip-cost matrix for the site."""
    costs = {
        rarity: {quality: cost for row_rarity, quality, cost in CHIP_COSTS_126 if row_rarity == rarity}
        for rarity in RARITIES
    }
    return {
        "update": "1.26",
        "rarities": list(RARITIES),
        "qualities": list(QUALITIES),
        "costs": costs,
    }


def centered_text(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    text: str,
    font_obj,
    fill: str,
) -> None:
    bounds = draw.textbbox((0, 0), text, font=font_obj)
    text_width = bounds[2] - bounds[0]
    text_height = bounds[3] - bounds[1]
    x = box[0] + (box[2] - box[0] - text_width) / 2
    y = box[1] + (box[3] - box[1] - text_height) / 2 - bounds[1]
    draw.text((x, y), text, font=font_obj, fill=fill)


def render_chart(payload: dict[str, object]) -> Image.Image:
    image = starfield((WIDTH, HEIGHT), 260825)
    draw = ImageDraw.Draw(image)

    logo = fitted_logo((116, 116))
    image.paste(logo, (34, 25), logo)
    draw.text((176, 35), "DROID ADVISOR UPGRADE CHIP COSTS", font=TITLE, fill=INK)
    draw.text(
        (180, 105),
        "UPDATE 1.26  •  EPIC, LEGENDARY, AND MYTHIC  •  THROUGH STELLAR",
        font=SUBTITLE,
        fill=CYAN,
    )
    draw.line((34, 157, WIDTH - 34, 157), fill=ORANGE, width=4)

    left, top, right = 34, 194, WIDTH - 34
    label_width = 255
    header_height = 112
    row_height = 190
    grid_bottom = top + header_height + len(RARITIES) * row_height
    cell_width = (right - left - label_width) // len(QUALITIES)

    draw.rounded_rectangle((left, top, right, grid_bottom), radius=24, fill="#050b14", outline=CYAN, width=3)
    centered_text(draw, (left, top, left + label_width, top + header_height), "RARITY", HEADER, MUTED)

    for index, quality in enumerate(QUALITIES):
        x0 = left + label_width + index * cell_width
        x1 = right if index == len(QUALITIES) - 1 else x0 + cell_width
        draw.rectangle((x0, top, x1, top + header_height), fill="#0b1a2e")
        centered_text(draw, (x0, top, x1, top + header_height), quality, HEADER, QUALITY_COLORS[quality])

    costs = payload["costs"]
    for row, rarity in enumerate(RARITIES):
        y0 = top + header_height + row * row_height
        y1 = y0 + row_height
        draw.rectangle((left, y0, left + label_width, y1), fill="#081627")
        centered_text(draw, (left + 12, y0, left + label_width - 12, y1), rarity, RARITY, RARITY_COLORS[rarity])
        for column, quality in enumerate(QUALITIES):
            x0 = left + label_width + column * cell_width
            x1 = right if column == len(QUALITIES) - 1 else x0 + cell_width
            cost = costs[rarity].get(quality)
            fill = "#07111f" if (row + column) % 2 == 0 else "#081627"
            draw.rectangle((x0, y0, x1, y1), fill=fill)
            if cost is None:
                centered_text(draw, (x0, y0, x1, y1), "NOT USED", SMALL, "#40546b")
            else:
                centered_text(draw, (x0, y0 + 23, x1, y1 - 22), f"{cost:,}", COST, INK)
                centered_text(draw, (x0, y1 - 54, x1, y1 - 18), "CHIPS", SMALL, QUALITY_COLORS[quality])

    for column in range(len(QUALITIES) + 1):
        x = left + label_width + column * cell_width
        if column == len(QUALITIES):
            x = right
        draw.line((x, top, x, grid_bottom), fill="#183552", width=2)
    for row in range(len(RARITIES) + 1):
        y = top + header_height + row * row_height
        draw.line((left, y, right, y), fill="#183552", width=2)

    draw.text((50, grid_bottom + 48), "HOW TO READ", font=HEADER, fill=ORANGE)
    draw.text(
        (50, grid_bottom + 88),
        "Each number is the chip cost to upgrade one droid of that rarity to the listed variant.",
        font=NOTE,
        fill=INK,
    )
    draw.text(
        (50, grid_bottom + 124),
        "Not used means that rarity has no upgrade at that variant tier in the published Update 1.26 table.",
        font=SMALL,
        fill=MUTED,
    )
    return image


def build() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    payload = chip_cost_payload()
    (ASSETS / "upgrade-chip-costs.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    chart = render_chart(payload)
    chart.save(ASSETS / "droid-advisor-upgrade-chip-costs.png", optimize=True)
    web = chart.copy()
    web.thumbnail((1200, 700), Image.Resampling.LANCZOS)
    web.save(ASSETS / "droid-advisor-upgrade-chip-costs-web.webp", "WEBP", quality=70, method=6)
    print(f"Built chip-cost chart for {len(RARITIES)} rarities and {len(QUALITIES)} variants")
    for path in sorted(ASSETS.glob("*chip-cost*")):
        print(f"{path.name}: {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    build()
