"""Crop complete Rebirth-rank tiles from the 2026 high-resolution charts."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "assets" / "source_rebirth_tiles"
OUTPUT = ROOT / "assets" / "rebirth_tiles"

# The four source charts share a 4688x6473 three-column grid. Ranks 1-12
# occupy the left column; 13-21 the center; and 22-30 the right.
X_BOUNDS = ((160, 1595), (1670, 3020), (3135, 4485))
GRID_TOP = 735
GRID_BOTTOM = 6460
GROUPS = ((1, 12), (13, 21), (22, 30))
BOTTOM_TRIMS = (60, 60, 115)
TOP_PADDING = (0, 0, 42)
DISPLAY_WIDTH = 430


def tile_bounds(rank: int) -> tuple[int, int, int, int]:
    for column, (first, last) in enumerate(GROUPS):
        if first <= rank <= last:
            count = last - first + 1
            pitch = (GRID_BOTTOM - GRID_TOP) / count
            row = rank - first
            top = round(GRID_TOP + row * pitch - TOP_PADDING[column])
            bottom = round(GRID_TOP + (row + 1) * pitch - BOTTOM_TRIMS[column])
            left, right = X_BOUNDS[column]
            return left, top, right, bottom
    raise ValueError(f"Unsupported Rebirth rank: {rank}")


def main() -> None:
    for cycle in range(1, 5):
        source = SOURCE / f"rbc{cycle}.png"
        image = Image.open(source).convert("RGB")
        if image.size != (4688, 6473):
            raise ValueError(f"Unexpected dimensions for {source}: {image.size}")
        destination = OUTPUT / f"rbc{cycle}"
        destination.mkdir(parents=True, exist_ok=True)
        for rank in range(1, 31):
            tile = image.crop(tile_bounds(rank))
            height = round(tile.height * DISPLAY_WIDTH / tile.width)
            tile = tile.resize((DISPLAY_WIDTH, height), Image.Resampling.LANCZOS)
            tile.save(destination / f"rb{rank:02d}.png", optimize=True)
    print(f"Wrote complete Rebirth tiles to {OUTPUT}")


if __name__ == "__main__":
    main()
