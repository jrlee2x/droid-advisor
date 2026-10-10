"""Fusion recipes supplied for Droid Tycoon's new fusion droids."""

from __future__ import annotations

from collections import Counter


FUSION_RECIPES = (
    {
        "output": "RIV-3T",
        "rarity": "MYTHIC",
        "role": "WORKER",
        "ingredients": ("KX", "IG", "RIC"),
    },
    {
        "output": "LUG-G",
        "rarity": "MYTHIC",
        "role": "WORKER",
        "ingredients": ("LOADLIFTER", "ID10", "R5"),
    },
    {
        "output": "X-ONK",
        "rarity": "MYTHIC",
        "role": "BATTLE",
        "ingredients": ("KX", "KX", "GONK"),
    },
    {
        "output": "SRV-O",
        "rarity": "MYTHIC",
        "role": "BATTLE",
        "ingredients": ("RIC-1200", "B1 HEAVY", "B1 HEAVY"),
    },
    {
        "output": "AXI-POD",
        "rarity": "MYTHIC",
        "role": "ASTRO",
        "ingredients": ("RIC", "BDX EXPLORER", "R7"),
    },
    {
        "output": "LOW-MO",
        "rarity": "MYTHIC",
        "role": "WORKER",
        "ingredients": ("A-LT", "A-LT", "LOADLIFTER"),
    },
    {
        "output": "RO-TOR",
        "rarity": "LEGENDARY",
        "role": "WORKER",
        "ingredients": ("BB9", "PIT", "B1 BATTLE"),
    },
    {
        "output": "FUS-3",
        "rarity": "LEGENDARY",
        "role": "WORKER",
        "ingredients": ("R7", "B-U4D", "B-U4D"),
    },
    {
        "output": "ORB-XL",
        "rarity": "LEGENDARY",
        "role": "BATTLE",
        "ingredients": ("CB", "GUNRUNNER", "B2-RP"),
    },
    {
        "output": "QIK-BIT",
        "rarity": "LEGENDARY",
        "role": "ASTRO",
        "ingredients": ("GROUNDMECH", "GROUNDMECH", "BB9"),
    },
    {
        "output": "N-UL",
        "rarity": "EPIC",
        "role": "WORKER",
        "ingredients": ("B1 HEAVY", "GUNRUNNER", "BB"),
    },
    {
        "output": "SCRP-R",
        "rarity": "EPIC",
        "role": "ASTRO",
        "ingredients": ("GONK", "GROUNDMECH", "R6"),
    },
    {
        "output": "ARM-CORE",
        "rarity": "EPIC",
        "role": "BATTLE",
        "ingredients": ("ARG", "ARG", "B2 HEAVY"),
    },
    {
        "output": "OPT-AR",
        "rarity": "EPIC",
        "role": "BATTLE",
        "ingredients": ("R2", "R2", "B2 SUPER"),
    },
    {
        "output": "WHL-EX",
        "rarity": "RARE",
        "role": "WORKER",
        "ingredients": ("ARG", "MOUSE", "MOUSE"),
    },
    {
        "output": "BTL-R",
        "rarity": "RARE",
        "role": "BATTLE",
        "ingredients": ("R9", "BDX EXPLORER", "B1 BATTLE"),
    },
    {
        "output": "ZRO-TEC",
        "rarity": "RARE",
        "role": "ASTRO",
        "ingredients": ("ID10", "ID10", "2BB"),
    },
)

FUSION_RARITY_ORDER = ("MYTHIC", "LEGENDARY", "EPIC", "RARE")
FUSION_ROLE_ORDER = ("WORKER", "BATTLE", "ASTRO")
FUSION_VARIANTS = ("DEFAULT", "GOLD", "DIAMOND", "RAINBOW", "BESKAR", "GALACTIC", "STELLAR")

# Base credits per second before slot, Droidex, rebirth, event, or other multipliers.
# Cross-checked against the public community reference sheet and Droid Tycoon Tracker
# after the v1.27 fusion update.
FUSION_INCOME_PER_SECOND = {
    "WHL-EX": (72, 144, 288, 576, 864, 1_728, 2_304),
    "BTL-R": (72, 144, 288, 576, 864, 1_728, 2_304),
    "ZRO-TEC": (72, 144, 288, 576, 864, 1_728, 2_304),
    "N-UL": (720, 1_440, 2_880, 5_760, 24_480, 37_440, 57_600),
    "SCRP-R": (720, 1_440, 2_880, 5_760, 24_480, 37_440, 57_600),
    "ARM-CORE": (690, 1_380, 2_760, 5_520, 23_460, 35_880, 55_200),
    "OPT-AR": (720, 1_440, 2_880, 5_760, 24_480, 37_440, 57_600),
    "RO-TOR": (1_500, 3_000, 6_000, 12_000, 36_000, 90_000, 225_000),
    "FUS-3": (1_600, 3_200, 6_400, 12_800, 38_400, 96_000, 240_000),
    "ORB-XL": (1_600, 3_200, 6_400, 12_800, 38_400, 96_000, 240_000),
    "QIK-BIT": (1_600, 3_200, 6_400, 12_800, 38_400, 96_000, 240_000),
    "RIV-3T": (8_400, 16_800, 33_600, 67_200, 134_400, 369_600, 1_050_000),
    "LUG-G": (7_600, 15_200, 30_400, 60_800, 121_600, 334_400, 950_000),
    "X-ONK": (8_000, 16_000, 32_000, 64_000, 128_000, 352_000, 1_000_000),
    "SRV-O": (7_600, 15_200, 30_400, 60_800, 121_600, 334_400, 950_000),
    "AXI-POD": (8_000, 16_000, 32_000, 64_000, 128_000, 352_000, 1_000_000),
    "LOW-MO": (7_800, 15_600, 31_200, 62_400, 124_800, 343_200, 975_000),
}


def shopping_list(outputs: set[str] | None = None) -> Counter[str]:
    """Return ingredient counts for all recipes or the requested output set."""
    selected = outputs if outputs is not None else {recipe["output"] for recipe in FUSION_RECIPES}
    ingredients: Counter[str] = Counter()
    for recipe in FUSION_RECIPES:
        if recipe["output"] in selected:
            ingredients.update(recipe["ingredients"])
    return ingredients
