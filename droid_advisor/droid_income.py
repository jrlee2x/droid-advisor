"""Base Droid Tycoon income-per-second reference data.

Values are community-maintained base rates before workstation, Droidex,
rebirth, event, or other multipliers.  Standard and Iconic data was
cross-checked against the public Droidex value list and its source data on
2026-08-28.  Fusion data lives in :mod:`fusion_recipes`.
"""

from __future__ import annotations


INCOME_VARIANTS = ("BASIC", "GOLD", "DIAMOND", "RAINBOW", "BESKAR", "GALACTIC", "STELLAR")
INCOME_RARITY_ORDER = ("MYTHIC", "LEGENDARY", "EPIC", "RARE", "COMMON", "ICONIC")


def _droid(name: str, role: str, rarity: str, income: tuple[int | None, ...]) -> dict[str, object]:
    if len(income) != len(INCOME_VARIANTS):
        raise ValueError(f"{name} must define {len(INCOME_VARIANTS)} variant values")
    return {"name": name, "role": role, "rarity": rarity, "kind": "STANDARD", "income": income}


STANDARD_DROIDS = (
    # Common
    _droid("Gonk", "WORKER", "COMMON", (4, 8, 16, 32, 48, 96, 128)),
    _droid("Mouse", "WORKER", "COMMON", (2, 4, 8, 16, 24, 48, 64)),
    _droid("Pit", "WORKER", "COMMON", (2, 4, 8, 16, 24, 48, 64)),
    _droid("R8", "ASTRO", "COMMON", (4, 8, 16, 32, 48, 96, 128)),
    _droid("CB", "ASTRO", "COMMON", (3, 6, 12, 24, 36, 72, 96)),
    _droid("R3", "ASTRO", "COMMON", (3, 6, 12, 24, 36, 72, 96)),
    _droid("R5", "ASTRO", "COMMON", (3, 6, 12, 24, 36, 72, 96)),
    _droid("Imperial Probe", "BATTLE", "COMMON", (6, 12, 24, 48, 72, 144, 192)),
    _droid("B1 Battle", "BATTLE", "COMMON", (5, 10, 20, 40, 60, 120, 160)),
    _droid("ID10", "BATTLE", "COMMON", (4, 8, 16, 32, 48, 96, 128)),
    _droid("DRK-1 Probe", "BATTLE", "COMMON", (3, 6, 12, 24, 36, 72, 96)),
    # Rare
    _droid("BU-4D", "WORKER", "RARE", (58, 116, 232, 464, 696, 1_400, 1_900)),
    _droid("Senate Hovercam", "WORKER", "RARE", (46, 92, 184, 368, 552, 1_100, 1_500)),
    _droid("ARG", "WORKER", "RARE", (42, 84, 168, 336, 504, 1_000, 1_300)),
    _droid("ROLL-R", "WORKER", "RARE", (31, 62, 124, 248, 372, 744, 992)),
    _droid("Bal-Core", "WORKER", "RARE", (23, 46, 92, 184, 276, 552, 736)),
    _droid("BDX Explorer", "WORKER", "RARE", (15, 30, 60, 120, 180, 360, 480)),
    _droid("R9", "ASTRO", "RARE", (54, 108, 216, 432, 648, 1_300, None)),
    _droid("R4", "ASTRO", "RARE", (50, 100, 200, 400, 600, 1_200, 1_600)),
    _droid("A-LT", "ASTRO", "RARE", (36, 72, 144, 288, 432, 864, 1_100)),
    _droid("2BB", "ASTRO", "RARE", (17, 34, 68, 136, 204, 408, 544)),
    _droid("B1 Security", "BATTLE", "RARE", (66, 132, 264, 528, 792, 1_600, 2_100)),
    _droid("HOV-R", "BATTLE", "RARE", (62, 124, 248, 496, 744, 1_500, 2_000)),
    _droid("VECT-Arm", "BATTLE", "RARE", (27, 54, 108, 216, 324, 648, 864)),
    _droid("NAV-EX", "BATTLE", "RARE", (18, 36, 72, 144, 216, 432, 576)),
    # Epic
    _droid("Gunrunner", "WORKER", "EPIC", (660, 1_300, 2_600, 5_300, 22_400, 34_300, 52_800)),
    _droid("AMP Walker", "WORKER", "EPIC", (570, 1_100, 2_300, 4_600, 19_400, 29_600, 45_600)),
    _droid("SEN-TRI", "WORKER", "EPIC", (510, 1_000, 2_000, 4_100, 17_300, 26_500, 40_800)),
    _droid("Opti-Pod", "WORKER", "EPIC", (390, 780, 1_600, 3_100, 13_300, 20_300, 31_200)),
    _droid("LO", "WORKER", "EPIC", (240, 480, 960, 1_900, 8_200, 12_500, 19_200)),
    _droid("Groundmech", "WORKER", "EPIC", (120, 240, 480, 960, 4_100, 6_200, 9_600)),
    _droid("R2", "ASTRO", "EPIC", (360, 720, 1_400, 2_900, 12_200, 18_700, 28_800)),
    _droid("TRAK-R", "ASTRO", "EPIC", (330, 660, 1_300, 2_600, 11_200, 17_200, 26_400)),
    _droid("R6", "ASTRO", "EPIC", (300, 600, 1_200, 2_400, 10_200, 15_600, 24_000)),
    _droid("Util-Tec (Ulti-Tech)", "ASTRO", "EPIC", (210, 420, 840, 1_700, 7_100, 10_900, 16_800)),
    _droid("ORB-Walker", "ASTRO", "EPIC", (180, 360, 720, 1_400, 6_100, 9_400, 14_400)),
    _droid("BB", "ASTRO", "EPIC", (150, 300, 600, 1_200, 5_100, 7_800, 12_000)),
    _droid("B1 Heavy", "BATTLE", "EPIC", (630, 1_300, 2_500, 4_800, 20_400, 31_200, 48_000)),
    _droid("Strike-Orb", "BATTLE", "EPIC", (540, 1_100, 2_200, 4_300, 18_400, 28_100, 43_200)),
    _droid("B2 Heavy", "BATTLE", "EPIC", (480, 960, 1_900, 3_800, 16_300, 25_000, 38_400)),
    _droid("LNG-Shot", "BATTLE", "EPIC", (450, 900, 1_800, 3_600, 15_300, 23_400, 36_000)),
    _droid("B2 Super", "BATTLE", "EPIC", (420, 840, 1_700, 3_400, 14_300, 21_800, 33_600)),
    _droid("Haul-R", "BATTLE", "EPIC", (270, 540, 1_100, 2_200, 9_200, 14_000, 21_600)),
    # Legendary
    _droid("Mono-WLKR", "WORKER", "LEGENDARY", (1_500, 3_000, 6_000, 12_000, 36_000, 90_000, 225_000)),
    _droid("Mecha-Droid", "WORKER", "LEGENDARY", (1_200, 2_500, 5_000, 9_900, 29_900, 74_600, 186_600)),
    _droid("Proto-Roller", "WORKER", "LEGENDARY", (972, 1_900, 3_900, 7_800, 23_300, 58_300, 145_800)),
    _droid("R7", "ASTRO", "LEGENDARY", (1_500, 3_000, 6_000, 12_000, 36_000, 90_000, 225_000)),
    _droid("BB9", "ASTRO", "LEGENDARY", (1_300, 2_600, 5_200, 10_400, 31_200, 78_000, 195_000)),
    _droid("Opti-STRK", "BATTLE", "LEGENDARY", (1_500, 3_000, 6_000, 12_000, 36_000, 90_000, 225_000)),
    _droid("B2-RP", "BATTLE", "LEGENDARY", (1_300, 2_600, 5_200, 10_400, 31_300, 78_200, 195_600)),
    _droid("Cyclo-Grav", "BATTLE", "LEGENDARY", (1_300, 2_500, 5_000, 10_100, 30_200, 75_600, 189_000)),
    # Mythic
    _droid("Loadlifter", "WORKER", "MYTHIC", (7_200, 14_400, 28_800, 57_600, 115_200, 316_800, 900_000)),
    _droid("LEP", "WORKER", "MYTHIC", (6_500, 13_000, 26_000, 52_000, 104_000, 286_000, 812_500)),
    _droid("RIC-1200", "WORKER", "MYTHIC", (5_800, 11_600, 23_200, 46_400, 92_800, 255_200, 725_000)),
    _droid("RIC", "WORKER", "MYTHIC", (5_100, 10_200, 20_400, 40_800, 81_600, 224_400, 637_500)),
    _droid("Snow Mouse", "WORKER", "MYTHIC", (4_400, 8_800, 17_600, 35_200, 70_400, 193_600, 550_000)),
    _droid("MO-TRAK", "ASTRO", "MYTHIC", (7_200, 14_400, 28_800, 57_600, 115_200, 316_800, 900_000)),
    _droid("TRI-TEK", "ASTRO", "MYTHIC", (6_500, 13_000, 26_000, 52_000, 104_000, 286_000, 812_500)),
    _droid("DRFT-R", "ASTRO", "MYTHIC", (5_800, 11_600, 23_200, 46_400, 92_800, 255_200, 725_000)),
    _droid("CYCLENS", "ASTRO", "MYTHIC", (4_400, 8_800, 17_600, 35_200, 70_400, 193_600, 550_000)),
    _droid("KX", "BATTLE", "MYTHIC", (7_200, 14_400, 28_800, 57_600, 115_200, 316_800, 900_000)),
    _droid("IG", "BATTLE", "MYTHIC", (5_800, 11_600, 23_200, 46_400, 92_800, 255_200, 725_000)),
)


ICONIC_DROIDS = (
    {"name": "C-3PO", "role": "WORKER", "rarity": "ICONIC", "kind": "ICONIC", "income": "+15%/s", "perk": "2x Droid Sell Value"},
    {"name": "D-O", "role": "WORKER", "rarity": "ICONIC", "kind": "ICONIC", "income": "+15%/s", "perk": "Half Fusion Time"},
    {"name": "DJ R-3X", "role": "WORKER", "rarity": "ICONIC", "kind": "ICONIC", "income": "+15%/s", "perk": "×2 World Quest Rewards"},
    {"name": "BB-8", "role": "ASTRO", "rarity": "ICONIC", "kind": "ICONIC", "income": "+15%/s", "perk": "100% Upgrade Chips"},
    {"name": "CB-23", "role": "ASTRO", "rarity": "ICONIC", "kind": "ICONIC", "income": "+15%/s", "perk": "Secret Astromech Mission"},
    {"name": "Chopper", "role": "ASTRO", "rarity": "ICONIC", "kind": "ICONIC", "income": "+15%/s", "perk": "+50% Crit Chance & Damage"},
    {"name": "R2-D2", "role": "ASTRO", "rarity": "ICONIC", "kind": "ICONIC", "income": "+15%/s", "perk": "2x Assigned Astromech Mission Reward"},
    {"name": "IG-11 Marshal", "role": "BATTLE", "rarity": "ICONIC", "kind": "ICONIC", "income": "+15%/s", "perk": "Blueprint Shield"},
    {"name": "Mister Bones", "role": "BATTLE", "rarity": "ICONIC", "kind": "ICONIC", "income": "+15%/s", "perk": "×2 Damage"},
)
