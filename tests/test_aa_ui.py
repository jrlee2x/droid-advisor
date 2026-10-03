import pytest

from droid_advisor.aa_ui import ViewportTransform, render_orb_badge, render_soft_button_surface
from droid_advisor.aa_map import render_inventory_map


def test_viewport_transform_preserves_circle_geometry_across_aspect_ratios():
    for width, height in ((1080, 700), (1400, 860), (1600, 900), (1920, 1080)):
        transform = ViewportTransform(width, height, 1120, 720)
        x1, y1 = transform.point(100, 100)
        x2, y2 = transform.point(140, 140)
        assert round(x2 - x1, 6) == round(y2 - y1, 6)
        assert transform.inverse(x1, y1) == pytest.approx((100.0, 100.0))


def test_orb_badge_is_exact_size_and_antialiased():
    badge = render_orb_badge(40, "#ff4c64")
    assert badge.size == (40, 40)
    assert badge.mode == "RGBA"
    alpha = badge.getchannel("A")
    assert any(alpha.histogram()[1:255])


def test_button_surface_is_exact_size_rounded_and_antialiased():
    button = render_soft_button_surface(104, 40, "#32b7ff", "hover", focused=True)
    assert button.size == (104, 40)
    assert button.mode == "RGBA"
    alpha = button.getchannel("A")
    assert alpha.getpixel((0, 0)) == 0
    assert any(alpha.histogram()[1:255])


def test_inventory_map_renderer_is_exact_size_and_uniform_at_common_windows():
    for width, height in ((750, 590), (1070, 700), (1390, 760), (1600, 900)):
        image, transform, positions = render_inventory_map(width, height)
        assert image.size == (width, height)
        assert image.mode == "RGBA"
        assert len(positions) == 50
        assert transform.scale > 0
        assert all(0 <= x <= width and 0 <= y <= height for x, y in positions.values())


def test_inventory_map_renderer_cache_reuses_same_resolution():
    first = render_inventory_map(1070, 700)
    second = render_inventory_map(1070, 700)
    assert first is second
