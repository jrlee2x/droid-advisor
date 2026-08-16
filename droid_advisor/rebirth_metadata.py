"""Shared display metadata for Droid Tycoon update 1.26 rebirth cards."""

from __future__ import annotations

import re

CREDIT_COSTS = {
    1: "10K", 2: "150K", 3: "975K", 4: "2.95M", 5: "5.35M",
    6: "9.85M", 7: "14.5M", 8: "36M", 9: "89M", 10: "220M",
    11: "550M", 12: "1.36B", 13: "3.4B", 14: "8.45B", 15: "21B",
    16: "52B", 17: "130B", 18: "325B", 19: "810B", 20: "2T",
    21: "3T", 22: "4.5T", 23: "6T", 24: "9T", 25: "13.5T",
    26: "21T", 27: "32T", 28: "45T", 29: "68T", 30: "100T",
    31: "150T", 32: "230T", 33: "345T", 34: "520T", 35: "778T",
}


# rank: (Nova Crystals, credit multiplier percent, XP multiplier percent)
SUPER_REBIRTH_REWARDS = {
    12: (11, 22, 110), 13: (16, 32, 160), 14: (22, 44, 220),
    15: (29, 58, 290), 16: (37, 74, 370), 17: (46, 92, 460),
    18: (56, 112, 560), 19: (67, 134, 670), 20: (79, 158, 790),
    21: (92, 184, 920), 22: (106, 212, 1060), 23: (121, 242, 1210),
    24: (137, 274, 1370), 25: (154, 308, 1540), 26: (172, 344, 1720),
    27: (191, 382, 1910), 28: (211, 422, 2110), 29: (232, 464, 2320),
    30: (254, 508, 2540), 31: (277, 554, 2770), 32: (301, 602, 3010),
    33: (326, 652, 3260), 34: (352, 704, 3520), 35: (379, 758, 3790),
}


DROID_RARITIES = {
    "2BB": "RARE", "A-LT": "RARE", "AMP WALKER": "EPIC", "ARG": "RARE",
    "B1 BATTLE": "COMMON", "B1 HEAVY": "EPIC", "B1 SECURITY": "RARE",
    "B2 HEAVY": "EPIC", "B2 SUPER": "EPIC", "B2-RP": "LEGENDARY",
    "BAL-CORE": "RARE", "BB": "EPIC", "BB9": "LEGENDARY",
    "BDX EXPLORER": "RARE", "B-U4D": "RARE", "CB": "COMMON",
    "CYCLENS": "MYTHIC", "CYCLO-GRAV": "LEGENDARY", "DRFT-R": "MYTHIC",
    "DRK-1 PROBE": "COMMON", "GONK": "COMMON", "GROUNDMECH": "EPIC",
    "GUNRUNNER": "EPIC", "HAUL-R": "EPIC", "HOV-R": "RARE",
    "ID10": "COMMON", "IG": "MYTHIC", "IMPERIAL PROBE": "COMMON",
    "KX": "MYTHIC", "LEP": "MYTHIC", "LNG-SHOT": "EPIC", "LO": "EPIC",
    "LOADLIFTER": "MYTHIC", "MECHA-DROID": "LEGENDARY", "MO-TRAK": "MYTHIC",
    "MONO-WLKR": "LEGENDARY", "MOUSE": "COMMON", "NAV-EX": "RARE",
    "OPTI-POD": "EPIC", "OPTI-STRK": "LEGENDARY", "ORB-WALKER": "EPIC",
    "PIT": "COMMON", "PROTO-ROLLER": "LEGENDARY", "R2": "EPIC", "R3": "COMMON",
    "R4": "RARE", "R5": "COMMON", "R6": "EPIC", "R7": "LEGENDARY",
    "R8": "COMMON", "R9": "RARE", "RIC": "MYTHIC", "RIC-1200": "MYTHIC",
    "ROLL-R": "RARE", "SEN-TRI": "EPIC", "SENATE HOVERCAM": "RARE",
    "SNOW MOUSE": "MYTHIC", "STRIKE-ORB": "EPIC", "TRAK-R": "EPIC",
    "TRI-TEK": "MYTHIC", "UTIL-TEC": "EPIC", "VECT-ARM": "RARE",
}


def rarity_for(droid: str) -> str:
    """Return the rarity label while tolerating punctuation variants."""
    normalized = re.sub(r"[^A-Z0-9]", "", droid.upper())
    for name, rarity in DROID_RARITIES.items():
        if re.sub(r"[^A-Z0-9]", "", name) == normalized:
            return rarity
    raise KeyError(f"No rarity is registered for {droid!r}")
