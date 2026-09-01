"""Build shareable Droid Advisor rebirth-cycle charts and web preview assets."""

from __future__ import annotations

import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .build_rebirth_tiles import WIDTH as CARD_WIDTH
from .build_rebirth_tiles import QUALITY_COLORS, RARITY_COLORS, render_card
from .cycles import CYCLES, MAX_REBIRTH, NUM_CYCLES
from .qualities import QUALITY_ORDER, quality_table
from .rebirth_metadata import rarity_for


ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "rebirth-chart-site"
ASSETS = SITE / "assets"
BRANDING = Path(__file__).resolve().parent / "assets" / "branding"

BG = "#07111f"
PANEL = "#0b1a2e"
INK = "#ffffff"
MUTED = "#9cb0c8"
CYAN = "#34d7ff"
ORANGE = "#ff9d00"
PINK = "#ff2870"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = Path("C:/Windows/Fonts") / name
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default()


TITLE = font("ariblk.ttf", 66)
SUBTITLE = font("arialbd.ttf", 25)
CYCLE_TITLE = font("ariblk.ttf", 28)
CYCLE_META = font("arialbd.ttf", 15)
OG_TITLE = font("ariblk.ttf", 56)
OG_SUBTITLE = font("arialbd.ttf", 25)
OG_STAT = font("ariblk.ttf", 31)
OG_LABEL = font("arialbd.ttf", 15)
LIST_TITLE = font("ariblk.ttf", 46)
LIST_META = font("arialbd.ttf", 18)
LIST_GROUP = font("arialbd.ttf", 24)
LIST_ROW = font("arialbd.ttf", 17)
LIST_SMALL = font("arialbd.ttf", 12)

RARITY_ORDER = ("COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC")
QUALITY_SHORT = {
    "BASE": "BASE",
    "GOLD": "GOLD",
    "DIAMOND": "DIAMOND",
    "RAINBOW": "RAINBOW",
    "BESKAR": "BESKAR",
    "GALACTIC": "GALACTIC",
    "STELLAR": "STELLAR",
}
LIST_WIDTH = 2200
LIST_HEIGHT = 700


def starfield(size: tuple[int, int], seed: int) -> Image.Image:
    image = Image.new("RGB", size, BG)
    draw = ImageDraw.Draw(image)
    width, height = size
    rng = random.Random(seed)  # nosec B311: decorative and deterministic
    for _ in range(max(90, width * height // 13000)):
        x = rng.randrange(width)
        y = rng.randrange(height)
        radius = 1 if rng.random() < 0.9 else 2
        color = rng.choice(("#112943", "#173553", "#1d4266", "#214d75"))
        draw.ellipse((x, y, x + radius, y + radius), fill=color)
    return image


def fitted_logo(max_size: tuple[int, int]) -> Image.Image:
    source = Image.open(BRANDING / "droid-advisor-logo-v1.png").convert("RGBA")
    alpha = source.getchannel("A")
    bounds = alpha.getbbox()
    if bounds:
        source = source.crop(bounds)
    source.thumbnail(max_size, Image.Resampling.LANCZOS)
    return source


def draw_centered(draw: ImageDraw.ImageDraw, y: int, text: str, font_obj: ImageFont.ImageFont, fill: str, width: int) -> None:
    box = draw.textbbox((0, 0), text, font=font_obj)
    draw.text(((width - (box[2] - box[0])) / 2, y), text, font=font_obj, fill=fill)


def prep_records(cycle: int) -> dict[str, list[dict[str, object]]]:
    """Summarize each unique droid's final use and highest requirement."""
    requirements = quality_table()[str(cycle)]
    records: dict[str, dict[str, object]] = {}
    for rank, droids in enumerate(CYCLES[cycle], start=1):
        qualities = requirements[str(rank)]
        for droid, quality in zip(droids, qualities):
            record = records.setdefault(
                droid,
                {
                    "name": droid,
                    "rarity": rarity_for(droid),
                    "first": rank,
                    "last": rank,
                    "quality": quality,
                },
            )
            record["last"] = rank
            if QUALITY_ORDER[quality] > QUALITY_ORDER[str(record["quality"])]:
                record["quality"] = quality

    grouped = {rarity: [] for rarity in RARITY_ORDER}
    for record in records.values():
        grouped[str(record["rarity"])].append(record)
    for rarity in RARITY_ORDER:
        grouped[rarity].sort(key=lambda item: (int(item["last"]), int(item["first"]), str(item["name"])))
    return grouped


def prep_list_landscape(cycle: int) -> Image.Image:
    """Render all five rarity lists side by side for one cycle."""
    image = starfield((LIST_WIDTH, LIST_HEIGHT), 8000 + cycle)
    draw = ImageDraw.Draw(image)
    grouped = prep_records(cycle)

    logo = fitted_logo((82, 82))
    image.paste(logo, (28, 18), logo)
    draw.text((128, 21), "KEEP / SELL QUICK LIST", font=LIST_TITLE, fill=INK)
    draw.text((131, 76), f"CYCLE {cycle}  •  FOR THIS CYCLE ONLY", font=LIST_META, fill=CYAN)
    legend = "NAME COLOR = HIGHEST VARIANT  •  LAST RB = FINAL USE  •  SELL FROM RB = RARITY GROUP IS CLEAR"
    legend_width = draw.textlength(legend, font=LIST_META)
    draw.text((LIST_WIDTH - 28 - legend_width, 76), legend, font=LIST_META, fill=MUTED)
    draw.line((24, 116, LIST_WIDTH - 24, 116), fill=ORANGE, width=4)

    padding = 24
    gap = 12
    card_top = 134
    card_bottom = 650
    card_width = (LIST_WIDTH - padding * 2 - gap * (len(RARITY_ORDER) - 1)) // len(RARITY_ORDER)
    for index, rarity in enumerate(RARITY_ORDER):
        records = grouped[rarity]
        tier_last = max(int(record["last"]) for record in records)
        rarity_color = RARITY_COLORS[rarity]
        left = padding + index * (card_width + gap)
        right = left + card_width
        draw.rounded_rectangle(
            (left, card_top, right, card_bottom),
            radius=20,
            fill="#050b14",
            outline=rarity_color,
            width=3,
        )
        draw.rounded_rectangle((left + 2, card_top + 2, right - 2, card_top + 52), radius=17, fill=PANEL)
        draw.text((left + 16, card_top + 14), f"{rarity}  •  {len(records)}", font=LIST_GROUP, fill=rarity_color)
        clear_text = f"SELL FROM RB{tier_last + 1}" if tier_last < MAX_REBIRTH else "CHECK NEXT CYCLE"
        clear_width = draw.textlength(clear_text, font=LIST_SMALL)
        draw.text((right - 15 - clear_width, card_top + 21), clear_text, font=LIST_SMALL, fill=INK)

        row_y = card_top + 66
        for record in records:
            quality = str(record["quality"])
            name = str(record["name"])
            last = int(record["last"])
            row_color = QUALITY_COLORS[quality]
            draw.ellipse((left + 15, row_y + 6, left + 25, row_y + 16), fill=row_color)
            draw.text((left + 33, row_y + 1), name, font=LIST_ROW, fill=row_color)
            quality_text = QUALITY_SHORT[quality]
            quality_width = draw.textlength(quality_text, font=LIST_SMALL)
            draw.text((right - 68 - quality_width, row_y + 5), quality_text, font=LIST_SMALL, fill=MUTED)
            last_text = f"RB{last}"
            last_width = draw.textlength(last_text, font=LIST_ROW)
            draw.text((right - 14 - last_width, row_y + 1), last_text, font=LIST_ROW, fill=INK)
            row_y += 30

    footer = "CHECK THE NEXT CYCLE BEFORE CLEARING RB35 STOCK. A DROID MAY BE NEEDED AGAIN AFTER THE CYCLE CHANGES."
    draw_centered(draw, 669, footer, LIST_SMALL, ORANGE, LIST_WIDTH)
    return image


def prep_json() -> dict[str, dict[str, list[dict[str, object]]]]:
    payload: dict[str, dict[str, list[dict[str, object]]]] = {}
    for cycle in CYCLES:
        payload[str(cycle)] = {}
        for rarity, records in prep_records(cycle).items():
            payload[str(cycle)][rarity] = [
                {
                    "name": str(record["name"]),
                    "quality": str(record["quality"]),
                    "last": int(record["last"]),
                }
                for record in records
            ]
    return payload


def card_stack(cycle: int) -> Image.Image:
    gap = 8
    cards = [render_card(cycle, rank) for rank in range(1, MAX_REBIRTH + 1)]
    height = sum(card.height for card in cards) + gap * (len(cards) - 1)
    stack = Image.new("RGB", (CARD_WIDTH, height), BG)
    y = 0
    for card in cards:
        stack.paste(card, (0, y))
        y += card.height + gap
    return stack


def cycle_chart(cycle: int, stack: Image.Image) -> Image.Image:
    padding = 22
    header = 104
    width = CARD_WIDTH + padding * 2
    height = header + stack.height + padding
    image = starfield((width, height), 4000 + cycle)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((padding, 18, width - padding, 84), radius=18, fill=PANEL, outline=ORANGE, width=3)
    draw_centered(draw, 25, f"REBIRTH CYCLE {cycle}", CYCLE_TITLE, INK, width)
    draw_centered(draw, 59, "RB1  •  RB35", CYCLE_META, CYAN, width)
    image.paste(stack, (padding, header))
    return image


def master_chart(stacks: dict[int, Image.Image]) -> Image.Image:
    padding = 30
    gap = 12
    masthead = 212
    column_header = 82
    stack_height = next(iter(stacks.values())).height
    width = padding * 2 + NUM_CYCLES * CARD_WIDTH + (NUM_CYCLES - 1) * gap
    height = masthead + column_header + stack_height + padding
    image = starfield((width, height), 12635)
    draw = ImageDraw.Draw(image)

    logo = fitted_logo((154, 154))
    image.alpha_composite(logo, (padding + 2, 26)) if image.mode == "RGBA" else image.paste(logo, (padding + 2, 26), logo)
    draw.text((206, 36), "DROID ADVISOR", font=TITLE, fill=INK)
    draw.text((209, 116), "COMPLETE REBIRTH CYCLE CHART", font=SUBTITLE, fill=CYAN)
    draw.text((209, 153), "UPDATE 1.26  •  CYCLES 1–5  •  RB1–RB35", font=SUBTITLE, fill=MUTED)
    draw.line((padding, masthead - 10, width - padding, masthead - 10), fill=ORANGE, width=4)

    for index, cycle in enumerate(range(1, NUM_CYCLES + 1)):
        x = padding + index * (CARD_WIDTH + gap)
        draw.rounded_rectangle((x, masthead + 2, x + CARD_WIDTH, masthead + 66), radius=18, fill=PANEL, outline=ORANGE, width=3)
        draw_centered_in_box(draw, (x, masthead + 11, x + CARD_WIDTH, masthead + 48), f"REBIRTH CYCLE {cycle}", CYCLE_TITLE, INK)
        draw_centered_in_box(draw, (x, masthead + 45, x + CARD_WIDTH, masthead + 64), "35 REBIRTHS", CYCLE_META, CYAN)
        image.paste(stacks[cycle], (x, masthead + column_header))
    return image


def draw_centered_in_box(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    text: str,
    font_obj: ImageFont.ImageFont,
    fill: str,
) -> None:
    left, top, right, bottom = box
    bounds = draw.textbbox((0, 0), text, font=font_obj)
    text_width = bounds[2] - bounds[0]
    text_height = bounds[3] - bounds[1]
    draw.text(
        (left + (right - left - text_width) / 2, top + (bottom - top - text_height) / 2 - bounds[1]),
        text,
        font=font_obj,
        fill=fill,
    )


def og_preview(stacks: dict[int, Image.Image]) -> Image.Image:
    width, height = 1200, 630
    image = starfield((width, height), 12636)
    draw = ImageDraw.Draw(image)
    logo = fitted_logo((190, 190))
    image.paste(logo, (55, 52), logo)
    draw.text((285, 63), "DROID ADVISOR", font=OG_TITLE, fill=INK)
    draw.text((289, 137), "COMPLETE REBIRTH CYCLE CHART", font=OG_SUBTITLE, fill=CYAN)
    draw.text((289, 178), "UPDATE 1.26  •  CYCLES 1–5  •  RB1–RB35", font=OG_SUBTITLE, fill=MUTED)

    stats = (("5", "CYCLES"), ("35", "REBIRTHS EACH"), ("175", "TARGET CARDS"))
    for index, (value, label) in enumerate(stats):
        left = 285 + index * 270
        draw.rounded_rectangle((left, 236, left + 238, 326), radius=18, fill=PANEL, outline=ORANGE, width=3)
        draw.text((left + 20, 249), value, font=OG_STAT, fill=INK)
        draw.text((left + 20, 293), label, font=OG_LABEL, fill=ORANGE)

    draw.rounded_rectangle((285, 337, 1063, 367), radius=15, fill=PANEL, outline=CYAN, width=2)
    draw_centered_in_box(draw, (285, 337, 1063, 367), "NEW  •  KEEP / SELL QUICK LISTS INCLUDED", OG_LABEL, CYAN)

    crop_y = 0
    crop_height = 224
    thumb_width = 202
    for index, cycle in enumerate(range(1, NUM_CYCLES + 1)):
        stack = stacks[cycle]
        sample = stack.crop((0, crop_y, CARD_WIDTH, min(stack.height, crop_y + 478)))
        sample.thumbnail((thumb_width, crop_height), Image.Resampling.LANCZOS)
        x = 55 + index * 220
        draw.rounded_rectangle((x - 4, 390, x + thumb_width + 4, 626), radius=14, fill=PANEL, outline=ORANGE, width=2)
        image.paste(sample, (x, 399))
        draw_centered_in_box(draw, (x, 372, x + thumb_width, 399), f"CYCLE {cycle}", OG_LABEL, CYAN)
    return image


def build() -> None:
    if set(CYCLES) != set(range(1, NUM_CYCLES + 1)):
        raise ValueError("Cycle numbers are incomplete")
    if any(len(rows) != MAX_REBIRTH for rows in CYCLES.values()):
        raise ValueError("Every cycle must include RB1 through RB35")

    ASSETS.mkdir(parents=True, exist_ok=True)
    quick_data = prep_json()
    (ASSETS / "rebirth-quick-lists.json").write_text(
        json.dumps(quick_data, indent=2),
        encoding="utf-8",
    )
    for cycle in CYCLES:
        prep_list_landscape(cycle).save(
            ASSETS / f"rebirth-quick-list-cycle-{cycle}.png",
            optimize=True,
        )

    stacks = {cycle: card_stack(cycle) for cycle in CYCLES}
    for cycle, stack in stacks.items():
        chart = cycle_chart(cycle, stack)
        chart.save(ASSETS / f"rebirth-cycle-{cycle}.png", optimize=True)

    master = master_chart(stacks)
    master.save(ASSETS / "droid-advisor-all-rebirth-cycles.png", optimize=True)
    web_master = master.copy()
    web_master.thumbnail((650, 1900), Image.Resampling.LANCZOS)
    web_master.save(ASSETS / "droid-advisor-all-rebirth-cycles-web.webp", "WEBP", quality=42, method=6)

    preview = og_preview(stacks)
    preview.save(ASSETS / "droid-advisor-rebirth-chart-preview.jpg", quality=88, optimize=True, progressive=True)
    fitted_logo((256, 256)).save(ASSETS / "droid-advisor-logo.png", optimize=True)

    print(f"Built {NUM_CYCLES} cycle charts with {MAX_REBIRTH} rebirths each")
    for path in sorted(ASSETS.glob("*")):
        print(f"{path.name}: {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    build()
