"""Build a same-variant income comparison for every recipe fusion."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

from .build_rebirth_chart import CYAN, INK, MUTED, ORANGE, fitted_logo, font, starfield
from .build_rebirth_tiles import RARITY_COLORS
from .droid_income import INCOME_VARIANTS, STANDARD_DROIDS
from .fusion_recipes import FUSION_INCOME_PER_SECOND, FUSION_RARITY_ORDER, FUSION_RECIPES

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "rebirth-chart-site" / "assets"
WIDTH = 2900
MARGIN = 38
TITLE_HEIGHT = 220
GROUP_HEIGHT = 50
ROW_HEIGHT = 68
FOOTER_HEIGHT = 118

TITLE = font("ariblk.ttf", 64)
SUBTITLE = font("arialbd.ttf", 23)
GROUP = font("ariblk.ttf", 24)
HEADER = font("arialbd.ttf", 15)
NAME = font("ariblk.ttf", 21)
BODY = font("arialbd.ttf", 17)
VALUE = font("arialbd.ttf", 18)
SMALL = font("arialbd.ttf", 13)

GAIN = "#62d27a"
LOSS = "#ff5964"
EVEN = "#f5e58c"

INGREDIENT_ALIASES = {
    "LOADLIFTER": "Loadlifter",
    "GONK": "Gonk",
    "B1 HEAVY": "B1 Heavy",
    "BDX EXPLORER": "BDX Explorer",
    "B-U4D": "BU-4D",
    "PIT": "Pit",
    "B1 BATTLE": "B1 Battle",
    "GUNRUNNER": "Gunrunner",
    "GROUNDMECH": "Groundmech",
    "B2 HEAVY": "B2 Heavy",
    "B2 SUPER": "B2 Super",
    "MOUSE": "Mouse",
}


def compact_credits(value: int) -> str:
    sign = "+" if value > 0 else "-" if value < 0 else ""
    absolute = abs(value)
    for threshold, suffix in ((1_000_000, "M"), (1_000, "K")):
        if absolute >= threshold:
            number = f"{absolute / threshold:.2f}".rstrip("0").rstrip(".")
            return f"{sign}{number}{suffix}"
    return f"{sign}{absolute:,}"


def fusion_profitability_payload() -> dict[str, object]:
    standard_by_name = {str(droid["name"]).upper(): droid for droid in STANDARD_DROIDS}
    comparisons: list[dict[str, object]] = []
    outcomes = {"gain": 0, "loss": 0, "even": 0, "undocumented": 0}

    for recipe in FUSION_RECIPES:
        ingredient_rows = []
        for ingredient in recipe["ingredients"]:
            lookup_name = INGREDIENT_ALIASES.get(ingredient, ingredient)
            try:
                ingredient_rows.append(standard_by_name[lookup_name.upper()])
            except KeyError as error:
                raise KeyError(f"No standard income data for fusion ingredient {ingredient}") from error

        variants: dict[str, dict[str, object] | None] = {}
        output_values = FUSION_INCOME_PER_SECOND[recipe["output"]]
        for index, variant in enumerate(INCOME_VARIANTS):
            ingredient_values = [row["income"][index] for row in ingredient_rows]
            if any(value is None for value in ingredient_values):
                variants[variant] = None
                outcomes["undocumented"] += 1
                continue
            input_income = sum(int(value) for value in ingredient_values)
            output_income = output_values[index]
            net_income = output_income - input_income
            outcome = "gain" if net_income > 0 else "loss" if net_income < 0 else "even"
            outcomes[outcome] += 1
            variants[variant] = {
                "input_income_per_second": input_income,
                "output_income_per_second": output_income,
                "net_income_per_second": net_income,
                "retained_ratio": output_income / input_income,
                "change_percent": net_income / input_income * 100,
                "outcome": outcome,
                "break_even_per_freed_slot": max(0, -net_income) / 2,
            }

        comparisons.append({
            "output": recipe["output"],
            "rarity": recipe["rarity"],
            "role": recipe["role"],
            "ingredients": list(recipe["ingredients"]),
            "variants": variants,
        })

    recipe_results = {"gain": 0, "loss": 0, "mixed": 0, "undocumented": 0}
    for comparison in comparisons:
        documented = [item["outcome"] for item in comparison["variants"].values() if item is not None]
        if not documented:
            recipe_results["undocumented"] += 1
        elif all(outcome == "gain" for outcome in documented):
            recipe_results["gain"] += 1
        elif all(outcome == "loss" for outcome in documented):
            recipe_results["loss"] += 1
        else:
            recipe_results["mixed"] += 1

    return {
        "variants": list(INCOME_VARIANTS),
        "comparisons": comparisons,
        "totals": {"recipes": len(comparisons), "variant_comparisons": len(comparisons) * len(INCOME_VARIANTS), **outcomes},
        "recipe_results": recipe_results,
        "method": "Output income minus the combined income of the three recipe ingredients at the same variant.",
    }


def render_chart(payload: dict[str, object]) -> Image.Image:
    comparisons = list(payload["comparisons"])
    height = TITLE_HEIGHT + len(comparisons) * ROW_HEIGHT + len(FUSION_RARITY_ORDER) * GROUP_HEIGHT + FOOTER_HEIGHT
    image = starfield((WIDTH, height), 290826)
    draw = ImageDraw.Draw(image)

    logo = fitted_logo((124, 124))
    image.paste(logo, (MARGIN, 25), logo)
    draw.text((188, 34), "DROID ADVISOR FUSION INCOME IMPACT", font=TITLE, fill=INK)
    totals = payload["totals"]
    draw.text(
        (192, 111),
        f"17 RECIPES  •  {totals['gain']} GAIN CELLS  •  {totals['loss']} LOSS CELLS  •  {totals['undocumented']} N/A",
        font=SUBTITLE,
        fill=CYAN,
    )
    draw.text(
        (192, 150),
        "Each cell compares one fusion output against all three consumed ingredients at the same variant. Negative means an immediate income loss.",
        font=HEADER,
        fill=MUTED,
    )
    draw.line((MARGIN, 198, WIDTH - MARGIN, 198), fill=ORANGE, width=4)

    recipe_width = 662
    values_x = MARGIN + recipe_width
    value_width = (WIDTH - MARGIN - values_x) / len(INCOME_VARIANTS)
    y = TITLE_HEIGHT

    for rarity in FUSION_RARITY_ORDER:
        group = [comparison for comparison in comparisons if comparison["rarity"] == rarity]
        rarity_color = RARITY_COLORS[rarity]
        draw.rounded_rectangle((MARGIN, y, WIDTH - MARGIN, y + 40), radius=10, fill="#0b1a2e", outline=rarity_color, width=2)
        draw.text((MARGIN + 16, y + 7), f"{rarity}  •  {len(group)}", font=GROUP, fill=rarity_color)
        for index, variant in enumerate(INCOME_VARIANTS):
            label = "BASIC / DEFAULT" if variant == "BASIC" else variant
            center = values_x + index * value_width + value_width / 2
            label_width = draw.textlength(label, font=HEADER)
            draw.text((center - label_width / 2, y + 12), label, font=HEADER, fill=MUTED)
        y += GROUP_HEIGHT

        for row_index, comparison in enumerate(group):
            row_fill = "#07121f" if row_index % 2 == 0 else "#091726"
            draw.rectangle((MARGIN, y, WIDTH - MARGIN, y + ROW_HEIGHT - 2), fill=row_fill)
            draw.text((MARGIN + 16, y + 9), comparison["output"], font=NAME, fill=rarity_color)
            role = comparison["role"]
            draw.text((MARGIN + 206, y + 13), role, font=SMALL, fill={"WORKER": GAIN, "BATTLE": LOSS, "ASTRO": "#c875e1"}[role])
            ingredients = " + ".join(comparison["ingredients"])
            draw.text((MARGIN + 16, y + 38), ingredients, font=SMALL, fill=MUTED)

            for index, variant in enumerate(INCOME_VARIANTS):
                cell = comparison["variants"][variant]
                center = values_x + index * value_width + value_width / 2
                if cell is None:
                    text = "N/A"
                    text_width = draw.textlength(text, font=VALUE)
                    draw.text((center - text_width / 2, y + 21), text, font=VALUE, fill=MUTED)
                    continue
                color = GAIN if cell["outcome"] == "gain" else LOSS if cell["outcome"] == "loss" else EVEN
                net_text = compact_credits(cell["net_income_per_second"]) + "/S"
                ratio_text = f"{cell['retained_ratio']:.2f}x retained"
                net_width = draw.textlength(net_text, font=VALUE)
                ratio_width = draw.textlength(ratio_text, font=SMALL)
                draw.text((center - net_width / 2, y + 12), net_text, font=VALUE, fill=color)
                draw.text((center - ratio_width / 2, y + 39), ratio_text, font=SMALL, fill=MUTED)
            y += ROW_HEIGHT

    draw.line((MARGIN, y + 15, WIDTH - MARGIN, y + 15), fill=ORANGE, width=2)
    draw.text(
        (MARGIN, y + 34),
        "Direct comparison only. Fusion also frees two droid slots; income from replacements can offset a loss. The output variant follows the lowest input variant.",
        font=HEADER,
        fill=MUTED,
    )
    draw.text(
        (MARGIN, y + 65),
        "Base credits per second before slot, Droidex, rebirth, event, and other multipliers.",
        font=HEADER,
        fill=MUTED,
    )
    return image


def build() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    payload = fusion_profitability_payload()
    (ASSETS / "fusion-profitability.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    chart = render_chart(payload)
    chart.save(ASSETS / "droid-advisor-fusion-income-impact.png", optimize=True)
    web = chart.copy()
    web.thumbnail((1400, 900), Image.Resampling.LANCZOS)
    web.save(ASSETS / "droid-advisor-fusion-income-impact-web.webp", "WEBP", quality=68, method=6)
    print(f"Built fusion profitability chart with {payload['totals']}")
    for path in sorted(ASSETS.glob("*fusion-income-impact*")):
        print(f"{path.name}: {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    build()
