"""Build transparent PNG and Windows icon files from the branded source image."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent
BRANDING = ROOT / "assets" / "branding"
SOURCE = BRANDING / "droid-advisor-logo-powered-source-v1.png"
PNG = BRANDING / "droid-advisor-logo-v1.png"
ICO = BRANDING / "droid-advisor.ico"
WINDOWS_ICON_PNG = BRANDING / "droid-advisor-windows-icon.png"
SETTINGS_BACKDROP = BRANDING / "droid-advisor-settings-backdrop.png"
SETTINGS_HEADER = BRANDING / "droid-advisor-settings-header.png"


def remove_magenta(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = []
    for red, green, blue, _alpha in rgba.getdata():
        if red > 175 and blue > 155 and green < 100 and red + blue > green * 4:
            alpha = 0
        else:
            alpha = 255
        pixels.append((red, green, blue, alpha))
    rgba.putdata(pixels)
    return rgba


def build_windows_icon(_logo: Image.Image) -> Image.Image:
    """Create a bold small-format badge instead of shrinking the full logo."""
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((12, 12, 500, 500), fill="#030a17", outline="#e21d43", width=24)
    draw.ellipse((38, 38, 474, 474), fill="#07162c", outline="#28a9ff", width=24)
    # A deliberately simple droid badge remains legible at 16 px.
    draw.rounded_rectangle((113, 151, 399, 386), radius=86, fill="#f7fbff", outline="#020b1c", width=18)
    draw.rounded_rectangle((137, 196, 375, 310), radius=48, fill="#06162f", outline="#28a9ff", width=9)
    draw.ellipse((175, 224, 226, 275), fill="#29e4ff")
    draw.ellipse((286, 224, 337, 275), fill="#29e4ff")
    draw.ellipse((190, 239, 211, 260), fill="#f7fbff")
    draw.ellipse((301, 239, 322, 260), fill="#f7fbff")
    draw.line((164, 332, 213, 361, 299, 361, 348, 332), fill="#28a9ff", width=14, joint="curve")
    draw.rounded_rectangle((239, 115, 273, 177), radius=12, fill="#f7fbff", outline="#020b1c", width=8)
    draw.line((256, 115, 256, 90), fill="#f7fbff", width=13)
    draw.ellipse((228, 62, 284, 118), fill="#28a9ff", outline="#020b1c", width=10)
    draw.ellipse((245, 79, 267, 101), fill="#f7fbff")
    return canvas


def build_settings_backdrop() -> Image.Image:
    """Create a subtle Swag Studios starfield with red and blue edge light."""
    width, height = 572, 534
    image = Image.new("RGB", (width, height))
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            vertical = y / max(1, height - 1)
            blue_glow = max(0.0, 1.0 - (((x - 80) / 350) ** 2 + ((y - 70) / 300) ** 2))
            red_glow = max(0.0, 1.0 - (((x - 560) / 380) ** 2 + ((y - 500) / 280) ** 2))
            pixels[x, y] = (
                int(3 + 5 * vertical + 27 * red_glow),
                int(9 + 8 * vertical + 25 * blue_glow),
                int(24 + 15 * vertical + 57 * blue_glow + 14 * red_glow),
            )
    draw = ImageDraw.Draw(image, "RGBA")
    # Deterministic stars and faint studio-style technical lines.
    for index in range(110):
        x = (index * 137 + 41) % width
        y = (index * 83 + 29) % height
        radius = 1 if index % 7 else 2
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(103, 187, 255, 45))
    for offset in range(-height, width, 92):
        draw.line((offset, height, offset + height, 0), fill=(47, 135, 220, 14), width=1)
    for inset in (0, 12, 24):
        alpha = 82 - inset
        draw.line(
            ((10 + inset, 118), (78 + inset, 185), (10 + inset, 252)),
            fill=(38, 173, 255, alpha), width=2,
        )
        draw.line(
            ((width - 10 - inset, 315), (width - 78 - inset, 382), (width - 10 - inset, 449)),
            fill=(239, 31, 74, alpha), width=2,
        )
    draw.line((0, 1, width, 1), fill=(46, 174, 255, 150), width=2)
    draw.line((0, height - 2, width, height - 2), fill=(231, 29, 67, 130), width=2)
    return image


def build_settings_header() -> Image.Image:
    width, height = 572, 82
    image = Image.new("RGB", (width, height), "#030a19")
    draw = ImageDraw.Draw(image, "RGBA")
    for x in range(width):
        blue = max(0.0, 1.0 - abs(x - 120) / 300)
        red = max(0.0, 1.0 - abs(x - 500) / 240)
        draw.line(
            ((x, 0), (x, height)),
            fill=(4 + int(20 * red), 12 + int(23 * blue), 32 + int(55 * blue + 10 * red), 255),
        )
    for index in range(32):
        x = (index * 97 + 23) % width
        y = (index * 41 + 11) % height
        draw.ellipse((x, y, x + 2, y + 2), fill=(119, 202, 255, 80))
    draw.line(((0, height - 2), (width, height - 2)), fill=(44, 173, 255, 170), width=2)
    draw.line(((360, 5), (410, 41), (360, 77)), fill=(38, 173, 255, 70), width=2)
    draw.line(((560, 5), (510, 41), (560, 77)), fill=(239, 31, 74, 95), width=2)
    return image


def main() -> None:
    logo = remove_magenta(Image.open(SOURCE))
    logo.save(PNG, optimize=True)
    windows_icon = build_windows_icon(logo)
    windows_icon.save(WINDOWS_ICON_PNG, optimize=True)
    windows_icon.save(
        ICO,
        sizes=[(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    build_settings_backdrop().save(SETTINGS_BACKDROP, optimize=True)
    build_settings_header().save(SETTINGS_HEADER, optimize=True)
    print(f"Wrote {PNG}")
    print(f"Wrote {WINDOWS_ICON_PNG}")
    print(f"Wrote {SETTINGS_BACKDROP}")
    print(f"Wrote {SETTINGS_HEADER}")
    print(f"Wrote {ICO}")


if __name__ == "__main__":
    main()
