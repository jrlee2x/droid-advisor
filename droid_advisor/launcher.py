"""PyInstaller entry point."""

import sys


def runtime_health_check() -> int:
    """Exercise Pillow's Python and native imaging layers after an upgrade."""
    try:
        from PIL import Image

        image = Image.new("RGB", (1, 1), "white")
        return 0 if image.getpixel((0, 0)) == (255, 255, 255) else 21
    except (ImportError, OSError, RuntimeError, ValueError):
        return 21

if __name__ == "__main__":
    if "--health-check" in sys.argv:
        raise SystemExit(runtime_health_check())
    from droid_advisor.app import main

    main()
