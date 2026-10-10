"""Build the hosted fusion recipe chart, preview, and JSON data."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

from .build_rebirth_chart import BG, CYAN, INK, MUTED, ORANGE, PANEL, fitted_logo, font, starfield
from .build_rebirth_tiles import RARITY_COLORS
from .fusion_recipes import (
    FUSION_INCOME_PER_SECOND,
    FUSION_RARITY_ORDER,
    FUSION_RECIPES,
    FUSION_VARIANTS,
    shopping_list,
)
from .rebirth_metadata import rarity_for

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "rebirth-chart-site" / "assets"
WIDTH, HEIGHT = 2200, 1370

TITLE = font("ariblk.ttf", 62)
SUBTITLE = font("arialbd.ttf", 23)
GROUP = font("ariblk.ttf", 25)
OUTPUT = font("ariblk.ttf", 25)
BODY = font("arialbd.ttf", 18)
SMALL = font("arialbd.ttf", 14)
COUNT = font("ariblk.ttf", 22)

ROLE_COLORS = {"WORKER": "#62d27a", "BATTLE": "#ff5964", "ASTRO": "#c875e1"}


def compact_credits(value: int) -> str:
    for threshold, suffix in ((1_000_000_000, "B"), (1_000_000, "M"), (1_000, "K")):
        if value >= threshold:
            return f"{value / threshold:.2f}".rstrip("0").rstrip(".") + suffix
    return str(value)


def recipe_payload() -> dict[str, object]:
    purchases = shopping_list()
    return {
        "recipes": [
            {
                "output": recipe["output"],
                "rarity": recipe["rarity"],
                "role": recipe["role"],
                "ingredients": list(recipe["ingredients"]),
                "income_per_second": {
                    variant: income
                    for variant, income in zip(FUSION_VARIANTS, FUSION_INCOME_PER_SECOND[recipe["output"]])
                },
                "income_per_hour": {
                    variant: income * 3_600
                    for variant, income in zip(FUSION_VARIANTS, FUSION_INCOME_PER_SECOND[recipe["output"]])
                },
            }
            for recipe in FUSION_RECIPES
        ],
        "shopping": [
            {"name": name, "quantity": quantity, "rarity": rarity_for(name)}
            for name, quantity in sorted(purchases.items(), key=lambda item: (-item[1], item[0]))
        ],
        "totals": {
            "recipes": len(FUSION_RECIPES),
            "unique_droids": len(purchases),
            "droid_units": sum(purchases.values()),
        },
    }


def render_chart(payload: dict[str, object]) -> Image.Image:
    image = starfield((WIDTH, HEIGHT), 240826)
    draw = ImageDraw.Draw(image)
    logo = fitted_logo((118, 118))
    image.paste(logo, (34, 24), logo)
    draw.text((176, 31), "DROID ADVISOR FUSION CHART", font=TITLE, fill=INK)
    draw.text((180, 103), "17 RECIPES  •  29 UNIQUE INGREDIENT DROIDS  •  51 TOTAL DROID UNITS", font=SUBTITLE, fill=CYAN)
    draw.line((34, 151, WIDTH - 34, 151), fill=ORANGE, width=4)

    recipes = list(payload["recipes"])
    left, top = 34, 172
    recipe_width, recipe_gap = 704, 12
    y = top
    for rarity in FUSION_RARITY_ORDER:
        group = [recipe for recipe in recipes if recipe["rarity"] == rarity]
        rarity_color = RARITY_COLORS[rarity]
        draw.text((left, y), f"{rarity} FUSIONS  •  {len(group)}", font=GROUP, fill=rarity_color)
        y += 40
        for index, recipe in enumerate(group):
            column = index % 2
            row = index // 2
            x = left + column * (recipe_width + recipe_gap)
            card_y = y + row * 100
            draw.rounded_rectangle(
                (x, card_y, x + recipe_width, card_y + 88),
                radius=16,
                fill="#050b14",
                outline=rarity_color,
                width=2,
            )
            draw.text((x + 16, card_y + 11), recipe["output"], font=OUTPUT, fill=rarity_color)
            role = str(recipe["role"])
            role_width = draw.textlength(role, font=SMALL)
            draw.text((x + recipe_width - 16 - role_width, card_y + 17), role, font=SMALL, fill=ROLE_COLORS[role])
            per_second = recipe["income_per_second"]
            income_summary = (
                f"DEFAULT {compact_credits(per_second['DEFAULT'])}/S  •  "
                f"STELLAR {compact_credits(per_second['STELLAR'])}/S"
            )
            draw.text((x + 16, card_y + 37), income_summary, font=SMALL, fill=CYAN)
            ingredients = " + ".join(recipe["ingredients"])
            draw.text((x + 16, card_y + 59), ingredients, font=BODY, fill=INK)
        y += ((len(group) + 1) // 2) * 100 + 16

    shopping_left = 1490
    draw.rounded_rectangle((shopping_left, 172, WIDTH - 34, HEIGHT - 34), radius=24, fill="#050b14", outline=CYAN, width=3)
    draw.text((shopping_left + 24, 198), "DROIDS TO BUY", font=GROUP, fill=CYAN)
    draw.text((shopping_left + 24, 234), "ONE OF EVERY FUSION RECIPE", font=SMALL, fill=MUTED)
    draw.line((shopping_left + 24, 270, WIDTH - 58, 270), fill=ORANGE, width=2)

    shopping = list(payload["shopping"])
    column_width = 323
    for index, item in enumerate(shopping):
        column = index // 15
        row = index % 15
        x = shopping_left + 24 + column * column_width
        item_y = 292 + row * 63
        rarity_color = RARITY_COLORS[str(item["rarity"])]
        draw.ellipse((x, item_y + 8, x + 12, item_y + 20), fill=rarity_color)
        draw.text((x + 21, item_y + 2), str(item["name"]), font=BODY, fill=INK)
        quantity = f"×{item['quantity']}"
        quantity_width = draw.textlength(quantity, font=COUNT)
        draw.text((x + column_width - 20 - quantity_width, item_y), quantity, font=COUNT, fill=ORANGE)
        draw.line((x, item_y + 42, x + column_width - 20, item_y + 42), fill="#13243a", width=1)

    draw.text((shopping_left + 24, HEIGHT - 78), "TOTAL: 51 DROID UNITS", font=GROUP, fill=ORANGE)
    return image


def build() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    payload = recipe_payload()
    (ASSETS / "fusion-recipes.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    chart = render_chart(payload)
    chart.save(ASSETS / "droid-advisor-fusion-chart.png", optimize=True)
    web = chart.copy()
    web.thumbnail((1200, 760), Image.Resampling.LANCZOS)
    web.save(ASSETS / "droid-advisor-fusion-chart-web.webp", "WEBP", quality=62, method=6)
    preview = chart.resize((1200, 747), Image.Resampling.LANCZOS).crop((0, 58, 1200, 688))
    preview.save(ASSETS / "droid-advisor-fusion-preview.jpg", quality=88, optimize=True, progressive=True)
    print(f"Built fusion chart with {payload['totals']}")
    for path in sorted(ASSETS.glob("*fusion*")):
        print(f"{path.name}: {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    build()
