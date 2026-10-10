"""High-tier upgrade-chip costs published for Droid Tycoon update 1.26."""

CHIP_COSTS_126 = (
    ("EPIC", "BESKAR", 3000),
    ("EPIC", "GALACTIC", 5000),
    ("EPIC", "STELLAR", 8000),
    ("LEGENDARY", "RAINBOW", 3000),
    ("LEGENDARY", "BESKAR", 7500),
    ("LEGENDARY", "GALACTIC", 20000),
    ("LEGENDARY", "STELLAR", 24000),
    ("MYTHIC", "GOLD", 4000),
    ("MYTHIC", "DIAMOND", 8000),
    ("MYTHIC", "RAINBOW", 15000),
    ("MYTHIC", "BESKAR", 30000),
    ("MYTHIC", "GALACTIC", 60000),
    ("MYTHIC", "STELLAR", 90000),
)


# v1.32 community matrix: https://droidarchives.co.uk/app.js
CHIP_COSTS = tuple(
    (rarity, quality, {
        ("EPIC", "BESKAR"): 2000,
        ("LEGENDARY", "RAINBOW"): 2500,
        ("LEGENDARY", "BESKAR"): 6000,
        ("LEGENDARY", "GALACTIC"): 16000,
        ("MYTHIC", "RAINBOW"): 14000,
    }.get((rarity, quality), cost))
    for rarity, quality, cost in CHIP_COSTS_126
) + (("EPIC", "KYBER", 12000), ("LEGENDARY", "KYBER", 30000), ("MYTHIC", "KYBER", 110000))
