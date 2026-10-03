"""Build the complete Droid Advisor income chart and browser data."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

from .build_rebirth_chart import BG, CYAN, INK, MUTED, ORANGE, fitted_logo, font, starfield
from .build_rebirth_tiles import RARITY_COLORS
from .droid_income import ICONIC_DROIDS, INCOME_RARITY_ORDER, INCOME_VARIANTS, STANDARD_DROIDS
from .fusion_recipes import FUSION_INCOME_PER_SECOND, FUSION_RECIPES

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "rebirth-chart-site" / "assets"
WIDTH = 2700
MARGIN = 42
ROW_HEIGHT = 48
GROUP_HEADER_HEIGHT = 62
TITLE_HEIGHT = 205
FOOTER_HEIGHT = 92

TITLE = font("ariblk.ttf", 66)
SUBTITLE = font("arialbd.ttf", 24)
GROUP = font("ariblk.ttf", 28)
HEADER = font("arialbd.ttf", 20)
NAME = font("arialbd.ttf", 22)
VALUE = font("arialbd.ttf", 21)
SMALL = font("arialbd.ttf", 15)

ROLE_COLORS = {"WORKER": "#62d27a", "BATTLE": "#ff5964", "ASTRO": "#c875e1"}
ICONIC_COLOR = "#f5e58c"


def compact_credits(value: int | None) -> str:
    if value is None:
        return "N/A"
    for threshold, suffix in ((1_000_000, "M"), (1_000, "K")):
        if value >= threshold:
            return f"{value / threshold:.2f}".rstrip("0").rstrip(".") + suffix
    return f"{value:,}"


def all_droids_payload() -> dict[str, object]:
    rows: list[dict[str, object]] = []
    for droid in STANDARD_DROIDS:
        income = dict(zip(INCOME_VARIANTS, droid["income"]))
        rows.append({
            "name": droid["name"],
            "role": droid["role"],
            "rarity": droid["rarity"],
            "kind": "STANDARD",
            "income_per_second": income,
        })
    for recipe in FUSION_RECIPES:
        values = FUSION_INCOME_PER_SECOND[recipe["output"]]
        rows.append({
            "name": recipe["output"],
            "role": recipe["role"],
            "rarity": recipe["rarity"],
            "kind": "FUSION",
            "income_per_second": dict(zip(INCOME_VARIANTS, values)),
        })
    for droid in ICONIC_DROIDS:
        rows.append(dict(droid))

    rarity_rank = {rarity: index for index, rarity in enumerate(INCOME_RARITY_ORDER)}
    role_rank = {role: index for index, role in enumerate(("WORKER", "ASTRO", "BATTLE"))}
    rows.sort(key=lambda row: (
        rarity_rank[str(row["rarity"])],
        role_rank[str(row["role"])],
        -(row.get("income_per_second", {}).get("STELLAR") or -1),
        str(row["name"]),
    ))
    missing = sum(
        value is None
        for row in rows
        for value in row.get("income_per_second", {}).values()
    )
    return {
        "variants": list(INCOME_VARIANTS),
        "droids": rows,
        "totals": {
            "all": len(rows),
            "standard": len(STANDARD_DROIDS),
            "fusion": len(FUSION_RECIPES),
            "iconic": len(ICONIC_DROIDS),
            "documented_fixed_values": (len(STANDARD_DROIDS) + len(FUSION_RECIPES)) * len(INCOME_VARIANTS) - missing,
            "missing_fixed_values": missing,
        },
    }


def render_chart(payload: dict[str, object]) -> Image.Image:
    droids = list(payload["droids"])
    group_count = sum(any(row["rarity"] == rarity for row in droids) for rarity in INCOME_RARITY_ORDER)
    height = TITLE_HEIGHT + len(droids) * ROW_HEIGHT + group_count * GROUP_HEADER_HEIGHT + FOOTER_HEIGHT
    image = starfield((WIDTH, height), 280826)
    draw = ImageDraw.Draw(image)

    logo = fitted_logo((126, 126))
    image.paste(logo, (MARGIN, 26), logo)
    draw.text((190, 35), "DROID ADVISOR ALL-DROID INCOME CHART", font=TITLE, fill=INK)
    draw.text(
        (194, 116),
        "87 DROIDS  •  62 STANDARD  •  17 FUSION  •  8 ICONIC  •  BASE CREDITS PER SECOND",
        font=SUBTITLE,
        fill=CYAN,
    )
    draw.text(
        (194, 151),
        "Basic applies to standard droids; Default applies to fusion droids. Iconic income is percentage-based.",
        font=SMALL,
        fill=MUTED,
    )
    draw.line((MARGIN, 190, WIDTH - MARGIN, 190), fill=ORANGE, width=4)

    name_x = MARGIN + 18
    role_x = 570
    values_x = 825
    value_width = 258
    y = TITLE_HEIGHT

    for rarity in INCOME_RARITY_ORDER:
        group = [row for row in droids if row["rarity"] == rarity]
        if not group:
            continue
        rarity_color = ICONIC_COLOR if rarity == "ICONIC" else RARITY_COLORS[rarity]
        draw.rounded_rectangle((MARGIN, y, WIDTH - MARGIN, y + 48), radius=12, fill="#0b1a2e", outline=rarity_color, width=2)
        draw.text((name_x, y + 8), f"{rarity}  •  {len(group)}", font=GROUP, fill=rarity_color)
        if rarity != "ICONIC":
            draw.text((role_x, y + 14), "ROLE", font=HEADER, fill=MUTED)
            for index, variant in enumerate(INCOME_VARIANTS):
                label = "BASIC / DEFAULT" if variant == "BASIC" else variant
                center = values_x + index * value_width + value_width / 2
                text_width = draw.textlength(label, font=SMALL)
                draw.text((center - text_width / 2, y + 15), label, font=SMALL, fill=MUTED)
        y += GROUP_HEADER_HEIGHT

        for row_index, row in enumerate(group):
            row_fill = "#07121f" if row_index % 2 == 0 else "#091726"
            draw.rectangle((MARGIN, y, WIDTH - MARGIN, y + ROW_HEIGHT - 2), fill=row_fill)
            draw.text((name_x, y + 11), str(row["name"]), font=NAME, fill=INK)
            if row["kind"] == "FUSION":
                name_width = draw.textlength(str(row["name"]), font=NAME)
                draw.text((name_x + name_width + 13, y + 15), "FUSION", font=SMALL, fill=CYAN)
            draw.text((role_x, y + 14), str(row["role"]), font=SMALL, fill=ROLE_COLORS[str(row["role"])])

            if rarity == "ICONIC":
                draw.text((values_x, y + 11), str(row["income"]), font=NAME, fill=ICONIC_COLOR)
                draw.text((values_x + 180, y + 14), str(row["perk"]), font=SMALL, fill=MUTED)
            else:
                income = row["income_per_second"]
                for index, variant in enumerate(INCOME_VARIANTS):
                    text = compact_credits(income[variant]) + ("/S" if income[variant] is not None else "")
                    center = values_x + index * value_width + value_width / 2
                    text_width = draw.textlength(text, font=VALUE)
                    draw.text((center - text_width / 2, y + 11), text, font=VALUE, fill=INK if income[variant] is not None else MUTED)
            y += ROW_HEIGHT

    draw.line((MARGIN, y + 14, WIDTH - MARGIN, y + 14), fill=ORANGE, width=2)
    draw.text(
        (MARGIN, y + 33),
        "Base values exclude slot, Droidex, rebirth, event, and other multipliers. N/A means the current public sources do not document that value.",
        font=SMALL,
        fill=MUTED,
    )
    return image


def build() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    payload = all_droids_payload()
    (ASSETS / "all-droid-income.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    chart = render_chart(payload)
    chart.save(ASSETS / "droid-advisor-all-droid-income.png", optimize=True)
    web = chart.copy()
    web.thumbnail((1400, 2400), Image.Resampling.LANCZOS)
    web.save(ASSETS / "droid-advisor-all-droid-income-web.webp", "WEBP", quality=68, method=6)
    preview = chart.crop((0, 0, chart.width, min(chart.height, 1420))).resize((1200, 630), Image.Resampling.LANCZOS)
    preview.save(ASSETS / "droid-advisor-all-droid-income-preview.jpg", quality=88, optimize=True, progressive=True)
    print(f"Built all-droid chart with {payload['totals']}")
    for path in sorted(ASSETS.glob("*all-droid*")):
        print(f"{path.name}: {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    build()
