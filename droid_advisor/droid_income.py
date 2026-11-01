"""Base Droid Tycoon income-per-second reference data.

Values are community-maintained base rates before workstation, Droidex,
rebirth, event, or other multipliers.  Standard and Iconic data was
cross-checked against the public Droidex value list and its source data on
2026-08-28. All fixed rates refreshed from Droid Archives on 2026-11-01.
Scourge values exclude Hive Mind. Fusion data lives in :mod:`fusion_recipes`.
"""

from __future__ import annotations


INCOME_VARIANTS = ('BASIC', 'GOLD', 'DIAMOND', 'RAINBOW', 'BESKAR', 'GALACTIC', 'STELLAR', 'KYBER', 'SCOURGE')
INCOME_RARITY_ORDER = ("MYTHIC", "LEGENDARY", "EPIC", "RARE", "COMMON", "ICONIC")


def _droid(name: str, role: str, rarity: str, income: tuple[int | float | None, ...]) -> dict[str, object]:
    if len(income) != len(INCOME_VARIANTS):
        raise ValueError(f"{name} must define {len(INCOME_VARIANTS)} variant values")
    return {"name": name, "role": role, "rarity": rarity, "kind": "STANDARD", "income": income}


STANDARD_DROIDS = (
    # v1.34 Power Droids; rates refreshed from Droid Archives on 2026-11-01.
    _droid("EG-58", "WORKER", "RARE", (70, 140, 280, 560, 840, 1680, 2240, 2464, 2016)),
    _droid("EGL", "WORKER", "EPIC", (300, 600, 1200, 2400, 10200, 15600, 24000, 26400, 21600)),
    _droid("KT", "WORKER", "EPIC", (450, 900, 1800, 3600, 15300, 23400, 36000, 39600, 32400)),
    _droid("MPH", "ASTRO", "EPIC", (690, 1380, 2760, 5520, 23460, 35880, 55200, 60720, 49680)),
    _droid("JO9-4MN", "WORKER", "LEGENDARY", (1300, 2600, 5200, 10400, 31200, 78000, 195000, 214500, 175500)),
    _droid("PLNK", "WORKER", "LEGENDARY", (1400, 2800, 5600, 11200, 33600, 84000, 210000, 231000, 189000)),
    _droid("ECG", "ASTRO", "MYTHIC", (6200, 12400, 24800, 49600, 99200, 272800, 775000, 852500, 694400)),
    # Protocol droids introduced in v1.30.
    _droid("SA-5", "PROTOCOL", "RARE", (14, 28, 56, 112, 168, 336, 448, 492.8, 403.2)),
    _droid("LOM", "PROTOCOL", "EPIC", (105, 210, 420, 840, 3570, 5460, 8400, 9240, 7560)),
    _droid("PZ", "PROTOCOL", "LEGENDARY", (900, 1800, 3600, 7200, 21600, 54000, 135000, 148500, 121500)),
    _droid("TDA", "PROTOCOL", "MYTHIC", (4000, 8000, 16000, 32000, 64000, 176000, 500000, 550000, 448000)),
    # Common
    _droid("Gonk", "WORKER", "COMMON", (4, 8, 16, 32, 48, 96, 128, 140.8, 115.2)),
    _droid("Mouse", "WORKER", "COMMON", (2, 4, 8, 16, 24, 48, 64, 70.4, 57.6)),
    _droid("Pit", "WORKER", "COMMON", (2, 4, 8, 16, 24, 48, 64, 70.4, 57.6)),
    _droid("R8", "ASTRO", "COMMON", (4, 8, 16, 32, 48, 96, 128, 140.8, 115.2)),
    _droid("CB", "ASTRO", "COMMON", (3, 6, 12, 24, 36, 72, 96, 105.6, 86.4)),
    _droid("R3", "ASTRO", "COMMON", (3, 6, 12, 24, 36, 72, 96, 105.6, 86.4)),
    _droid("R5", "ASTRO", "COMMON", (3, 6, 12, 24, 36, 72, 96, 105.6, 86.4)),
    _droid("Imperial Probe", "BATTLE", "COMMON", (6, 12, 24, 48, 72, 144, 192, 211.2, 172.8)),
    _droid("B1 Battle", "BATTLE", "COMMON", (5, 10, 20, 40, 60, 120, 160, 176, 144)),
    _droid("ID10", "BATTLE", "COMMON", (4, 8, 16, 32, 48, 96, 128, 140.8, 115.2)),
    _droid("DRK-1 Probe", "BATTLE", "COMMON", (3, 6, 12, 24, 36, 72, 96, 105.6, 86.4)),
    # Rare
    _droid("BU-4D", "WORKER", "RARE", (58, 116, 232, 464, 696, 1392, 1856, 2041.6, 1670.4)),
    _droid("Senate Hovercam", "WORKER", "RARE", (46, 92, 184, 368, 552, 1104, 1472, 1619.2, 1324.8)),
    _droid("ARG", "WORKER", "RARE", (42, 84, 168, 336, 504, 1008, 1344, 1478.4, 1209.6)),
    _droid("ROLL-R", "WORKER", "RARE", (31, 62, 124, 248, 372, 744, 992, 1091.2, 892.8)),
    _droid("Bal-Core", "WORKER", "RARE", (23, 46, 92, 184, 276, 552, 736, 809.6, 662.4)),
    _droid("BDX Explorer", "WORKER", "RARE", (15, 30, 60, 120, 180, 360, 480, 528, 432)),
    _droid("R9", "ASTRO", "RARE", (54, 108, 216, 432, 648, 1296, 1728, 1900.8, 1555.2)),
    _droid("R4", "ASTRO", "RARE", (50, 100, 200, 400, 600, 1200, 1600, 1760, 1440)),
    _droid("A-LT", "ASTRO", "RARE", (36, 72, 144, 288, 432, 864, 1152, 1267.2, 1036.8)),
    _droid("2BB", "ASTRO", "RARE", (17, 34, 68, 136, 204, 408, 544, 598.4, 489.6)),
    _droid("B1 Security", "BATTLE", "RARE", (66, 132, 264, 528, 792, 1584, 2112, 2323.2, 1900.8)),
    _droid("HOV-R", "BATTLE", "RARE", (62, 124, 248, 496, 744, 1488, 1984, 2182.4, 1785.6)),
    _droid("VECT-Arm", "BATTLE", "RARE", (27, 54, 108, 216, 324, 648, 864, 950.4, 777.6)),
    _droid("NAV-EX", "BATTLE", "RARE", (18, 36, 72, 144, 216, 432, 576, 633.6, 518.4)),
    # Epic
    _droid("Gunrunner", "WORKER", "EPIC", (660, 1320, 2640, 5280, 22440, 34320, 52800, 58080, 47520)),
    _droid("AMP Walker", "WORKER", "EPIC", (570, 1140, 2280, 4560, 19380, 29640, 45600, 50160, 41040)),
    _droid("SEN-TRI", "WORKER", "EPIC", (510, 1020, 2040, 4080, 17340, 26520, 40800, 44880, 36720)),
    _droid("Opti-Pod", "WORKER", "EPIC", (390, 780, 1560, 3120, 13260, 20280, 31200, 34320, 28080)),
    _droid("LO", "WORKER", "EPIC", (240, 480, 960, 1920, 8160, 12480, 19200, 21120, 17280)),
    _droid("Groundmech", "WORKER", "EPIC", (120, 240, 480, 960, 4080, 6240, 9600, 10560, 8640)),
    _droid("R2", "ASTRO", "EPIC", (480, 960, 1920, 3840, 16320, 24960, 38400, 42240, 34560)),
    _droid("TRAK-R", "ASTRO", "EPIC", (330, 660, 1320, 2640, 11220, 17160, 26400, 29040, 23760)),
    _droid("R6", "ASTRO", "EPIC", (300, 600, 1200, 2400, 10200, 15600, 24000, 26400, 21600)),
    _droid("Util-Tec (Ulti-Tech)", "ASTRO", "EPIC", (210, 420, 840, 1680, 7140, 10920, 16800, 18480, 15120)),
    _droid("ORB-Walker", "ASTRO", "EPIC", (180, 360, 720, 1440, 6120, 9360, 14400, 15840, 12960)),
    _droid("BB", "ASTRO", "EPIC", (150, 300, 600, 1200, 5100, 7800, 12000, 13200, 10800)),
    _droid("B1 Heavy", "BATTLE", "EPIC", (600, 1200, 2400, 4800, 20400, 31200, 48000, 52800, 43200)),
    _droid("Strike-Orb", "BATTLE", "EPIC", (540, 1080, 2160, 4320, 18360, 28080, 43200, 47520, 38880)),
    _droid("B2 Heavy", "BATTLE", "EPIC", (360, 720, 1440, 2880, 12240, 18720, 28800, 31680, 25920)),
    _droid("LNG-Shot", "BATTLE", "EPIC", (450, 900, 1800, 3600, 15300, 23400, 36000, 39600, 32400)),
    _droid("B2 Super", "BATTLE", "EPIC", (420, 840, 1680, 3360, 14280, 21840, 33600, 36960, 30240)),
    _droid("Haul-R", "BATTLE", "EPIC", (270, 540, 1080, 2160, 9180, 14040, 21600, 23760, 19440)),
    # Legendary
    _droid("Mono-WLKR", "WORKER", "LEGENDARY", (1500, 3000, 6000, 12000, 36000, 90000, 225000, 247500, 202500)),
    _droid("Mecha-Droid", "WORKER", "LEGENDARY", (1244, 2488, 4976, 9952, 29856, 74640, 186600, 205260, 167940)),
    _droid("Proto-Roller", "WORKER", "LEGENDARY", (972, 1944, 3888, 7776, 23328, 58320, 145800, 160380, 131220)),
    _droid("R7", "ASTRO", "LEGENDARY", (1500, 3000, 6000, 12000, 36000, 90000, 225000, 247500, 202500)),
    _droid("BB9", "ASTRO", "LEGENDARY", (1300, 2600, 5200, 10400, 31200, 78000, 195000, 214500, 175500)),
    _droid("Opti-STRK", "BATTLE", "LEGENDARY", (1500, 3000, 6000, 12000, 36000, 90000, 225000, 247500, 202500)),
    _droid("B2-RP", "BATTLE", "LEGENDARY", (1304, 2608, 5216, 10432, 31296, 78240, 195600, 215160, 176040)),
    _droid("Cyclo-Grav", "BATTLE", "LEGENDARY", (1260, 2520, 5040, 10080, 30240, 75600, 189000, 207900, 170100)),
    # Mythic
    _droid("Loadlifter", "WORKER", "MYTHIC", (7200, 14400, 28800, 57600, 115200, 316800, 900000, 990000, 806400)),
    _droid("LEP", "WORKER", "MYTHIC", (6500, 13000, 26000, 52000, 104000, 286000, 812500, 893750, 728000)),
    _droid("RIC-1200", "WORKER", "MYTHIC", (5800, 11600, 23200, 46400, 92800, 255200, 725000, 797500, 649600)),
    _droid("RIC", "WORKER", "MYTHIC", (5100, 10200, 20400, 40800, 81600, 224400, 637500, 701250, 571200)),
    _droid("Snow Mouse", "WORKER", "MYTHIC", (4400, 8800, 17600, 35200, 70400, 193600, 550000, 605000, 492800)),
    _droid("MO-TRAK", "ASTRO", "MYTHIC", (7200, 14400, 28800, 57600, 115200, 316800, 900000, 990000, 806400)),
    _droid("TRI-TEK", "ASTRO", "MYTHIC", (6500, 13000, 26000, 52000, 104000, 286000, 812500, 893750, 728000)),
    _droid("DRFT-R", "ASTRO", "MYTHIC", (5800, 11600, 23200, 46400, 92800, 255200, 725000, 797500, 649600)),
    _droid("CYCLENS", "ASTRO", "MYTHIC", (4400, 8800, 17600, 35200, 70400, 193600, 550000, 605000, 492800)),
    _droid("KX", "BATTLE", "MYTHIC", (7200, 14400, 28800, 57600, 115200, 316800, 900000, 990000, 806400)),
    _droid("IG", "BATTLE", "MYTHIC", (5800, 11600, 23200, 46400, 92800, 255200, 725000, 797500, 649600)),
)


ICONIC_DROIDS = (
    {"name": "Scourge Prime", "role": "PROTOCOL", "rarity": "ICONIC", "kind": "ICONIC", "income": "Protocol / Hive Mind", "perk": "Hive Mind Master; +5 Hive Mind count while working; Default only"},
    {"name": "WG-22", "role": "BATTLE", "rarity": "ICONIC", "kind": "ICONIC", "income": "+15%/s", "perk": "2x Flawless Chance"},
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
