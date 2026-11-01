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
FUSION_VARIANTS = ('DEFAULT', 'GOLD', 'DIAMOND', 'RAINBOW', 'BESKAR', 'GALACTIC', 'STELLAR', 'KYBER', 'SCOURGE')

SCOURGE_FUSION_RULE = (
    "For a named recipe, place one Scourge ingredient in the LEFT-MOST slot. "
    "The other two must be Stellar, Kyber or Scourge. Check the machine preview. "
    "Lower inputs reduce the output; three Kybers do not create Scourge."
)


def recipe_fusion_variant(finishes: tuple[str, str, str]) -> str | None:
    """Variant for an already matched named recipe, in machine slot order.

    This does not predict random fusions or Kyber activation colours.
    """
    if len(finishes) != 3:
        return None
    normalized = tuple(
        "DEFAULT" if value.upper() in {"BASE", "BASIC"} else
        "KYBER" if value.upper() in {"KYBER_GREEN", "KYBER_BLUE", "KYBER_PURPLE"} else value.upper()
        for value in finishes
    )
    if any(value not in FUSION_VARIANTS for value in normalized):
        return None
    if normalized[0] == "SCOURGE" and all(value in {"STELLAR", "KYBER", "SCOURGE"} for value in normalized):
        return "SCOURGE"
    return min(normalized, key=FUSION_VARIANTS.index)

# Base credits per second before slot, Droidex, rebirth, event, or other multipliers.
# Cross-checked against the public community reference sheet and Droid Tycoon Tracker
# after the v1.27 fusion update. Rates refreshed from Droid Archives 2026-11-01;
# Scourge is raw income before Hive Mind.
FUSION_INCOME_PER_SECOND = {'WHL-EX': (72, 144, 288, 576, 864, 1728, 2304, 2534.4, 2073.6),
 'BTL-R': (72, 144, 288, 576, 864, 1728, 2304, 2534.4, 2073.6),
 'ZRO-TEC': (72, 144, 288, 576, 864, 1728, 2304, 2534.4, 2073.6),
 'N-UL': (1080, 2160, 4320, 8640, 36720, 56160, 86400, 95040, 77760),
 'SCRP-R': (1080, 2160, 4320, 8640, 36720, 56160, 86400, 95040, 77760),
 'ARM-CORE': (1035, 2070, 4140, 8280, 35190, 53820, 82800, 91080, 74520),
 'OPT-AR': (1080, 2160, 4320, 8640, 36720, 56160, 86400, 95040, 77760),
 'RO-TOR': (2250, 4500, 9000, 18000, 54000, 135000, 337500, 371250, 303750),
 'FUS-3': (2400, 4800, 9600, 19200, 57600, 144000, 360000, 396000, 324000),
 'ORB-XL': (2400, 4800, 9600, 19200, 57600, 144000, 360000, 396000, 324000),
 'QIK-BIT': (2400, 4800, 9600, 19200, 57600, 144000, 360000, 396000, 324000),
 'RIV-3T': (12600, 25200, 50400, 100800, 201600, 554400, 1575000, 1732500, 1411200),
 'LUG-G': (11400, 22800, 45600, 91200, 182400, 501600, 1425000, 1567500, 1276800),
 'X-ONK': (12000, 24000, 48000, 96000, 192000, 528000, 1500000, 1650000, 1344000),
 'SRV-O': (11400, 22800, 45600, 91200, 182400, 501600, 1425000, 1567500, 1276800),
 'AXI-POD': (12000, 24000, 48000, 96000, 192000, 528000, 1500000, 1650000, 1344000),
 'LOW-MO': (11700, 23400, 46800, 93600, 187200, 514800, 1462500, 1608750, 1310400)}


def shopping_list(outputs: set[str] | None = None) -> Counter[str]:
    """Return ingredient counts for all recipes or the requested output set."""
    selected = outputs if outputs is not None else {recipe["output"] for recipe in FUSION_RECIPES}
    ingredients: Counter[str] = Counter()
    for recipe in FUSION_RECIPES:
        if recipe["output"] in selected:
            ingredients.update(recipe["ingredients"])
    return ingredients
