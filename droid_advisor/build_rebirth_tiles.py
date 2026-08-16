"""Build consistent, screen-safe local cards for every rebirth rank."""

from __future__ import annotations

import argparse
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .cycles import CYCLES, MAX_REBIRTH
from .engine import canonical
from .qualities import quality_table
from .rebirth_metadata import CREDIT_COSTS, SUPER_REBIRTH_REWARDS, rarity_for

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "assets" / "rebirth_tiles"
WIDTH = 430

QUALITY_COLORS = {
    "BASE": "#aeb7c0",
    "GOLD": "#f5c242",
    "DIAMOND": "#45dbff",
    "RAINBOW": "#c966ff",
    "BESKAR": "#d2d8df",
    "GALACTIC": "#a13cff",
    # Stellar is the new top-tier warm star-metal treatment. Keep it visually
    # separate from the flat yellow Gold marker with amber depth, orbital rings,
    # and white star points.
    "STELLAR": "#fbbf24",
}
RARITY_COLORS = {
    "COMMON": "#b7bec7",
    "RARE": "#38a9ff",
    "EPIC": "#9a63ff",
    "LEGENDARY": "#ffad24",
    "MYTHIC": "#ff2870",
}


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = Path("C:/Windows/Fonts") / name
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default()


FONT_RANK = font("ariblk.ttf", 44)
FONT_NAME = font("arialbd.ttf", 13)
FONT_SMALL = font("arialbd.ttf", 8)
FONT_COST = font("arialbd.ttf", 15)
FONT_BADGE = font("arialbd.ttf", 9)
FONT_REWARD = font("arialbd.ttf", 17)


def next_use(cycle: int, rank: int, droid: str) -> int | None:
    target = canonical(droid)
    for future_rank in range(rank + 1, MAX_REBIRTH + 1):
        if any(canonical(name) == target for name in CYCLES[cycle][future_rank - 1]):
            return future_rank
    return None


def stellar_icon(size: int, seed: int) -> Image.Image:
    """Render the Stellar variant marker as a compact orbital star field."""
    scale = 4
    diameter = size * scale
    icon = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon)
    edge = diameter - 1
    draw.ellipse((1, 1, edge - 1, edge - 1), fill="#4a1904", outline="#fff2ad", width=5)
    draw.ellipse((12, 12, edge - 12, edge - 12), fill="#9a3e05", outline="#fbbf24", width=5)
    draw.ellipse((30, 30, edge - 30, edge - 30), fill="#f59e0b")
    draw.ellipse((42, 42, edge - 42, edge - 42), fill="#fde68a")

    orbit = Image.new("RGBA", icon.size, (0, 0, 0, 0))
    orbit_draw = ImageDraw.Draw(orbit)
    orbit_draw.ellipse(
        (10, diameter // 2 - 17, edge - 10, diameter // 2 + 17),
        outline="#fff7d1",
        width=5,
    )
    orbit = orbit.rotate(-28, resample=Image.Resampling.BICUBIC)
    mask = Image.new("L", icon.size, 0)
    ImageDraw.Draw(mask).ellipse((2, 2, edge - 2, edge - 2), fill=255)
    orbit.putalpha(Image.composite(orbit.getchannel("A"), Image.new("L", icon.size, 0), mask))
    icon.alpha_composite(orbit)

    draw = ImageDraw.Draw(icon)
    # Seeded randomness makes decorative pixels reproducible; it is not used for security.
    rng = random.Random(seed)  # nosec B311
    for radius in (3, 4, 5, 6):
        angle_x = rng.randint(18, edge - 18)
        angle_y = rng.randint(18, edge - 18)
        draw.ellipse(
            (angle_x - radius, angle_y - radius, angle_x + radius, angle_y + radius),
            fill="#ffffff",
        )
    return icon.resize((size, size), Image.Resampling.LANCZOS)


def quality_icon(
    image: Image.Image,
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    quality: str,
    seed: int,
) -> None:
    left, top, right, bottom = box
    if quality == "STELLAR":
        marker = stellar_icon(right - left + 1, seed)
        image.paste(marker, (left, top), marker)
        draw.ellipse(box, outline="#05070b", width=2)
        return
    draw.ellipse(box, fill=QUALITY_COLORS[quality], outline="#05070b", width=2)
    # Seeded randomness makes decorative pixels reproducible; it is not used for security.
    rng = random.Random(seed)  # nosec B311
    if quality == "RAINBOW":
        colors = ("#ff506d", "#ffbd38", "#56dc7b", "#4fc7ff", "#b668ff")
        for index, color in enumerate(colors):
            y = top + 3 + index * max(2, (bottom - top - 6) // len(colors))
            draw.line((left + 4, y, right - 4, y), fill=color, width=2)
    elif quality == "BESKAR":
        for offset in range(-8, 20, 6):
            draw.line((left + offset, bottom - 3, left + offset + 18, top + 3), fill="#78828c", width=1)
    elif quality == "GALACTIC":
        speckle = "#ff8dff"
        for _ in range(6):
            x = rng.randint(left + 4, right - 4)
            y = rng.randint(top + 4, bottom - 4)
            radius = 1
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=speckle)


def render_card(cycle: int, rank: int) -> Image.Image:
    rewards = SUPER_REBIRTH_REWARDS.get(rank)
    height = 179 if rewards else 125
    image = Image.new("RGB", (WIDTH, height), "#07111f")
    draw = ImageDraw.Draw(image)
    # Seeded randomness makes the decorative star field reproducible.
    rng = random.Random(cycle * 1000 + rank)  # nosec B311
    for _ in range(55 if rewards else 36):
        x = rng.randrange(WIDTH)
        y = rng.randrange(height)
        shade = rng.choice(("#14263d", "#1b3150", "#263b58"))
        draw.ellipse((x, y, x + 2, y + 2), fill=shade)

    accent = "#ff9d00"
    draw.rounded_rectangle((3, 8, 96, 87), radius=22, fill="#020407", outline=accent, width=7)
    rank_text = str(rank)
    rank_box = draw.textbbox((0, 0), rank_text, font=FONT_RANK)
    draw.text(((99 - (rank_box[2] - rank_box[0])) / 2, 12), rank_text, font=FONT_RANK, fill="white")
    draw.rounded_rectangle((5, 91, 95, 119), radius=14, fill="#020407", outline=accent, width=4)
    cost = CREDIT_COSTS[rank]
    cost_box = draw.textbbox((0, 0), cost, font=FONT_COST)
    draw.text(((100 - (cost_box[2] - cost_box[0])) / 2, 95), cost, font=FONT_COST, fill="white")

    qualities = quality_table()[str(cycle)][str(rank)]
    for slot, (droid, quality) in enumerate(zip(CYCLES[cycle][rank - 1], qualities)):
        top = 9 + slot * 37
        draw.rounded_rectangle((99, top, 350, top + 33), radius=16, fill="#020407", outline=accent, width=3)
        quality_icon(
            image,
            draw,
            (104, top + 4, 130, top + 30),
            quality,
            cycle * 10000 + rank * 10 + slot,
        )
        draw.text((136, top + 2), droid, font=FONT_NAME, fill="white")
        draw.text((136, top + 17), quality, font=FONT_SMALL, fill=QUALITY_COLORS[quality])
        rarity = rarity_for(droid)
        quality_width = draw.textlength(quality, font=FONT_SMALL)
        draw.text((141 + quality_width, top + 17), rarity, font=FONT_SMALL, fill=RARITY_COLORS[rarity])

        draw.rounded_rectangle((354, top, 427, top + 33), radius=16, fill="#020407", outline=accent, width=3)
        future = next_use(cycle, rank, droid)
        label = "SELL" if future is None else f"RB{future}"
        label_box = draw.textbbox((0, 0), label, font=FONT_BADGE)
        label_x = 390 - (label_box[2] - label_box[0]) / 2
        draw.text((label_x, top + 11), label, font=FONT_BADGE, fill="white")

    if rewards:
        crystals, credit_percent, xp_percent = rewards
        draw.rounded_rectangle((0, 128, WIDTH, height - 4), radius=15, fill=accent)
        metrics = (("NOVA", str(crystals)), ("CRED", f"{credit_percent}%"), ("XP", f"{xp_percent}%"))
        x_positions = (28, 166, 302)
        for x, (label, value) in zip(x_positions, metrics):
            draw.ellipse((x, 138, x + 28, 166), fill="#05070b")
            label_box = draw.textbbox((0, 0), label, font=FONT_SMALL)
            draw.text((x + 14 - (label_box[2] - label_box[0]) / 2, 148), label, font=FONT_SMALL, fill="white")
            draw.text((x + 35, 141), value, font=FONT_REWARD, fill="white")

    return image


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--replace-all",
        action="store_true",
        help="Regenerate all 175 cards in the consistent Droid Advisor layout.",
    )
    args = parser.parse_args()
    written = 0
    for cycle, rows in CYCLES.items():
        if len(rows) != MAX_REBIRTH:
            raise ValueError(f"Cycle {cycle} has {len(rows)} rows, expected {MAX_REBIRTH}")
        directory = OUTPUT / f"rbc{cycle}"
        directory.mkdir(parents=True, exist_ok=True)
        for rank in range(1, MAX_REBIRTH + 1):
            destination = directory / f"rb{rank:02d}.png"
            generated_update_card = cycle == 5 or rank > 30
            if destination.exists() and not args.replace_all and not generated_update_card:
                continue
            render_card(cycle, rank).save(destination, optimize=True)
            written += 1
    print(f"Wrote {written} rebirth cards to {OUTPUT}")


if __name__ == "__main__":
    main()
