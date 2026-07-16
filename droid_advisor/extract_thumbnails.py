"""Crop the 324 labeled requirement cards from Mr_Veron's 6680x5201 charts."""

from pathlib import Path
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "assets" / "source_cycles"
OUTPUT = ROOT / "assets" / "thumbnails"

X_BOUNDS = (
    ((548, 943), (956, 1347), (1360, 1755)),
    ((2748, 3140), (3153, 3543), (3556, 3951)),
    ((4948, 5339), (5352, 5742), (5755, 6148)),
)
Y_BOUNDS = (
    (355, 827), (853, 1307), (1333, 1787), (1813, 2267), (2293, 2748),
    (2773, 3228), (3253, 3707), (3732, 4187), (4212, 4667), (4692, 5160),
)


def position(rb: int) -> tuple[int, int]:
    if rb <= 10:
        return 0, rb - 1
    if rb <= 20:
        return 1, rb - 11
    return 2, rb - 21


def main() -> None:
    for cycle in range(1, 5):
        source = SOURCE / f"rbc{cycle}.png"
        image = Image.open(source).convert("RGB")
        if image.size != (6680, 5201):
            raise ValueError(f"Unexpected dimensions for {source}: {image.size}")
        for rb in range(1, 28):
            group, row = position(rb)
            top, bottom = Y_BOUNDS[row]
            destination = OUTPUT / f"rbc{cycle}" / f"rb{rb:02d}"
            destination.mkdir(parents=True, exist_ok=True)
            for slot, (left, right) in enumerate(X_BOUNDS[group], start=1):
                crop = image.crop((left, top, right, bottom))
                crop = ImageOps.fit(crop, (84, 96), method=Image.Resampling.LANCZOS)
                crop.save(destination / f"{slot}.png", optimize=True)
    print(f"Wrote thumbnails to {OUTPUT}")


if __name__ == "__main__":
    main()
