"""Extract required quality tiers from the four credited guide charts."""

import argparse
import json
from pathlib import Path

from PIL import Image

from droid_advisor.extract_thumbnails import ROOT, SOURCE, X_BOUNDS, Y_BOUNDS, position
from droid_advisor.vision import OfflineOcr


TIERS = ("BESKAR", "RAINBOW", "DIAMOND", "GOLD", "BASE")
OVERRIDES = {(3, 7, 1): "DIAMOND", (3, 27, 2): "RAINBOW"}
PARTS = ROOT / "assets" / "quality_parts"
OUTPUT = ROOT / "assets" / "quality_requirements.json"


def extract_cycle(cycle: int) -> None:
    ocr = OfflineOcr()
    image = Image.open(SOURCE / f"rbc{cycle}.png")
    result = {}
    for rb in range(1, 28):
        group, row = position(rb)
        top, bottom = Y_BOUNDS[row]
        qualities = []
        for slot, (left, right) in enumerate(X_BOUNDS[group], start=1):
            text = " ".join(token.text.upper() for token in ocr.read(image.crop((left, top, right, bottom))))
            quality = OVERRIDES.get((cycle, rb, slot)) or next((tier for tier in TIERS if tier in text), None)
            if quality is None:
                raise ValueError(f"Unresolved quality: RBC{cycle} RB{rb} slot {slot}: {text}")
            qualities.append(quality)
        result[str(rb)] = qualities
    PARTS.mkdir(parents=True, exist_ok=True)
    (PARTS / f"rbc{cycle}.json").write_text(json.dumps(result, indent=2), encoding="utf-8")


def combine() -> None:
    combined = {}
    for cycle in range(1, 5):
        combined[str(cycle)] = json.loads((PARTS / f"rbc{cycle}.json").read_text(encoding="utf-8"))
    OUTPUT.write_text(json.dumps(combined, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--cycle", type=int, choices=range(1, 5))
    parser.add_argument("--combine", action="store_true")
    args = parser.parse_args()
    if args.cycle:
        extract_cycle(args.cycle)
    elif args.combine:
        combine()
    else:
        parser.error("use --cycle 1..4 or --combine")

