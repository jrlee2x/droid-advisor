from pathlib import Path

from PIL import Image

from droid_advisor import notifications
from droid_advisor.build_chip_cost_chart import chip_cost_payload
from droid_advisor.build_rebirth_tiles import QUALITY_COLORS, render_card, stellar_icon
from droid_advisor.chip_costs import CHIP_COSTS_126
from droid_advisor.cycles import CYCLES, MAX_REBIRTH, active_rebirth, next_cycle
from droid_advisor.diagnostics import DiagnosticBuffer
from droid_advisor.engine import (
    advise,
    canonical,
    detect_cycle,
    match_droid,
    safe_to_sell_droids,
)
from droid_advisor.extract_rebirth_tiles import (
    DISPLAY_WIDTH,
    GRID_TOP,
    GROUPS,
    TOP_PADDING,
    tile_bounds,
)
from droid_advisor.fusion_recipes import FUSION_INCOME_PER_SECOND, FUSION_RECIPES, FUSION_VARIANTS
from droid_advisor.inventory import InventoryLedger
from droid_advisor.notifications import update_spawn_presence
from droid_advisor.qualities import (
    QUALITY_ORDER,
    RARITIES,
    SPAWN_VARIANTS,
    quality_table,
)
from droid_advisor.updater import (
    build_installer_script,
    parse_release,
    trusted_ssl_context,
    version_tuple,
)
from droid_advisor.vision import (
    OcrToken,
    OfflineOcr,
    blueprint_details,
    blueprint_droid,
    blueprint_is_visible,
    blueprint_visual_gate,
    card_header_rect,
    card_visual_gate,
    classify_interaction,
    game_ui_viewport,
    game_ui_viewports,
    high_value_spawn,
    is_card_button_text,
    panel_is_open,
    read_region,
    rebirth_header_is_open,
    rebirth_rank,
    rebirth_visual_gate,
    scan_priorities,
    selected_droid,
)
from droid_advisor.windowing import (
    WorkArea,
    clamp_window_position,
    geometry_position,
    monitor_topology_signature,
    top_right_position,
)


def test_offscreen_overlay_moves_to_primary_monitor():
    areas = (
        WorkArea(0, 0, 1920, 1040, True),
        WorkArea(1920, 0, 3840, 1040, False),
    )
    assert clamp_window_position(2500, 100, 430, 500, areas) == (2500, 100)
    assert clamp_window_position(2500, 100, 430, 500, areas[:1]) == (1482, 100)


def test_overlay_positions_support_monitors_left_of_primary():
    areas = (
        WorkArea(0, 0, 2560, 1400, True),
        WorkArea(-1920, 0, 0, 1040, False),
    )
    assert clamp_window_position(-1800, 70, 430, 500, areas) == (-1800, 70)
    assert geometry_position(-1800, 70) == "-1800+70"


def test_reset_position_uses_primary_monitor_top_right():
    primary = WorkArea(1920, 0, 4480, 1400, True)
    assert top_right_position(430, 500, primary) == (4025, 55)


def test_monitor_signature_changes_when_display_is_removed():
    dual = (
        WorkArea(0, 0, 1920, 1040, True),
        WorkArea(1920, 0, 3840, 1040, False),
    )
    assert monitor_topology_signature(dual) != monitor_topology_signature(dual[:1])


def test_rebirth_tile_bounds_cover_all_ranks_without_overlap():
    previous_bottom_by_column = {}
    for rank in range(1, 31):
        left, top, right, bottom = tile_bounds(rank)
        assert 0 <= left < right <= 4688
        assert 0 <= top < bottom <= 6473
        column = 0 if rank <= 12 else 1 if rank <= 21 else 2
        if column in previous_bottom_by_column:
            assert top > previous_bottom_by_column[column]
        previous_bottom_by_column[column] = bottom


def test_rebirth_tile_bounds_include_full_card_header_in_every_column():
    for column, (first, _last) in enumerate(GROUPS):
        _left, top, _right, _bottom = tile_bounds(first)
        assert TOP_PADDING[column] == 42
        assert top == GRID_TOP - 42


def test_rebirth_tiles_fit_all_supported_overlay_resolutions():
    assets = Path(__file__).resolve().parents[1] / "droid_advisor" / "assets" / "rebirth_tiles"
    viewports = (
        (1280, 720),
        (1366, 768),
        (1600, 900),
        (1920, 1080),
        (1920, 1200),
        (1920, 1440),
        (2560, 1080),
        (2560, 1440),
        (3440, 1440),
        (3840, 1600),
        (3840, 2160),
        (5120, 1440),
    )
    for cycle in range(1, 6):
        dimensions = {}
        for rank in range(1, MAX_REBIRTH + 1):
            with Image.open(assets / f"rbc{cycle}" / f"rb{rank:02d}.png") as tile:
                dimensions[rank] = tile.size
                assert tile.width == DISPLAY_WIDTH
        for rank in range(1, MAX_REBIRTH):
            overlay_width = max(dimensions[rank][0], dimensions[rank + 1][0]) + 20
            overlay_height = dimensions[rank][1] + dimensions[rank + 1][1] + 150
            for viewport_width, viewport_height in viewports:
                assert overlay_width <= viewport_width
                assert overlay_height <= viewport_height


def test_update_126_chip_costs_match_published_reference():
    assert CHIP_COSTS_126 == (
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


def test_hosted_chip_cost_matrix_matches_desktop_reference():
    payload = chip_cost_payload()
    assert payload["qualities"][-1] == "STELLAR"
    assert payload["rarities"] == ["EPIC", "LEGENDARY", "MYTHIC"]
    assert payload["costs"]["EPIC"] == {"BESKAR": 3000, "GALACTIC": 5000, "STELLAR": 8000}
    assert payload["costs"]["LEGENDARY"]["STELLAR"] == 24000
    assert payload["costs"]["MYTHIC"]["STELLAR"] == 90000


def test_fusion_output_uses_axi_pod_spelling():
    outputs = {recipe["output"] for recipe in FUSION_RECIPES}
    assert "AXI-POD" in outputs
    assert "AXL-POD" not in outputs


def test_every_fusion_has_complete_base_income_data():
    outputs = {recipe["output"] for recipe in FUSION_RECIPES}
    assert outputs == set(FUSION_INCOME_PER_SECOND)
    assert len(FUSION_VARIANTS) == 7
    for incomes in FUSION_INCOME_PER_SECOND.values():
        assert len(incomes) == len(FUSION_VARIANTS)
        assert all(current < following for current, following in zip(incomes, incomes[1:]))


def test_fusion_income_and_corrected_names_match_current_references():
    recipes = {recipe["output"]: recipe for recipe in FUSION_RECIPES}
    assert "SRV-O" in recipes
    assert "SRV-0" not in recipes
    assert recipes["LOW-MO"]["role"] == "WORKER"
    assert FUSION_INCOME_PER_SECOND["RIV-3T"][-1] == 1_050_000
    assert FUSION_INCOME_PER_SECOND["AXI-POD"][-1] == 1_000_000


def test_update_126_extends_every_cycle_and_wraps_after_cycle_five():
    assert MAX_REBIRTH == 35
    assert set(CYCLES) == {1, 2, 3, 4, 5}
    assert all(len(rows) == MAX_REBIRTH for rows in CYCLES.values())
    assert next_cycle(4) == 5
    assert next_cycle(5) == 1
    assert QUALITY_ORDER["STELLAR"] > QUALITY_ORDER["GALACTIC"]


def test_proto_roller_at_completed_22_varies_by_cycle():
    assert advise(1, 22, "PROTO-ROLLER").next_needed == 28
    assert advise(2, 22, "PROTO-ROLLER").safe_to_sell is True
    assert advise(3, 22, "PROTO-ROLLER").next_needed == 25
    assert advise(4, 22, "PROTO-ROLLER").next_needed == 24


def test_rbc2_proto_roller_is_not_needed_after_rb22():
    result = advise(2, 22, "PROTO-ROLLER")
    assert result.safe_to_sell is True
    assert result.last_needed == 22
    assert result.message == "SAFE TO SELL: LAST NEEDED AT RB22"


def test_card_quality_can_be_upgraded_to_future_requirement():
    beskar = advise(1, 27, "PROTO-ROLLER", "BESKAR")
    assert beskar.safe_to_sell is False
    assert beskar.next_needed == 28
    assert beskar.next_required_quality == "GALACTIC"
    assert beskar.message == "KEEP: UPGRADE TO GALACTIC FOR RB28"
    assert advise(1, 27, "PROTO-ROLLER", "GALACTIC").next_needed == 28
    assert advise(4, 27, "IG", "RAINBOW").next_needed == 28
    assert advise(4, 27, "IG", "GALACTIC").next_needed == 28


def test_rbc4_gold_ric_1200_is_kept_for_future_diamond_requirement():
    result = advise(4, 22, "RIC-1200", "GOLD")
    assert result.safe_to_sell is False
    assert result.next_needed == 27
    assert result.next_required_quality == "DIAMOND"
    assert result.message == "KEEP: UPGRADE TO DIAMOND FOR RB27"


def test_safe_to_sell_list_uses_current_cycle_and_completed_level():
    results = {result.droid: result for result in safe_to_sell_droids(2, 22)}
    assert results["PROTO-ROLLER"].last_needed == 22
    assert "OPTI-STRK" not in results
    assert "A-LT" not in results


def test_spelling_variants_are_canonicalized():
    assert canonical("PROTO_ROLLER") == canonical("PROTO-ROLLER")
    assert canonical("PROTOROLL") == canonical("PROTO-ROLLER")


def test_unique_view_rebirth_triple_detects_cycle_and_level():
    assert detect_cycle({"KX", "TRI-TEK", "SNOW MOUSE"}) == (1, 27)
    assert detect_cycle({"LEP", "LOADLIFTER", "MO-TRAK"}) == (2, 27)


def test_rebirth_header_accepts_rank_when_rebirth_word_is_outside_crop():
    tokens = [_token("26.36 KB/s", 100, 30), _token("Rank 25", 220, 30)]
    assert rebirth_header_is_open(tokens) is True


def test_ultrawide_interactions_use_centered_16_by_9_viewport():
    image = Image.new("RGB", (5120, 1440), "black")
    viewport = game_ui_viewport(image)
    assert viewport.size == (2560, 1440)


def test_standard_widescreen_interactions_keep_full_frame():
    image = Image.new("RGB", (2560, 1440), "black")
    assert game_ui_viewport(image) is image


def test_ultrawide_detection_checks_center_left_and_right_viewports():
    image = Image.new("RGB", (5120, 1440), "black")
    viewports = game_ui_viewports(image)
    assert [name for name, _ in viewports] == ["center", "left", "right"]
    assert all(viewport.size == (2560, 1440) for _, viewport in viewports)


def test_standard_widescreen_detection_has_one_full_viewport():
    image = Image.new("RGB", (2560, 1440), "black")
    viewports = game_ui_viewports(image)
    assert viewports == [("full", image)]


def test_rebirth_names_match_audited_thumbnail_order():
    expected_rows = {
        (1, 1): ("PIT", "CB", "DRK-1 PROBE"),
        (1, 2): ("BDX EXPLORER", "BAL-CORE", "2BB"),
        (2, 9): ("NAV-EX", "AMP WALKER", "STRIKE-ORB"),
        (3, 16): ("B2-RP", "AMP WALKER", "MECHA-DROID"),
        (4, 2): ("2BB", "R3", "SENATE HOVERCAM"),
        (4, 12): ("TRAK-R", "GROUNDMECH", "BAL-CORE"),
        (4, 21): ("AMP WALKER", "GROUNDMECH", "HAUL-R"),
        (4, 22): ("GUNRUNNER", "STRIKE-ORB", "B2 SUPER"),
        (4, 23): ("MONO-WLKR", "B2-RP", "CYCLO-GRAV"),
        (1, 28): ("MO-TRAK", "DRFT-R", "PROTO-ROLLER"),
        (1, 29): ("IG", "MONO-WLKR", "MECHA-DROID"),
        (1, 30): ("B2-RP", "CYCLENS", "LOADLIFTER"),
        (2, 28): ("SNOW MOUSE", "TRI-TEK", "MECHA-DROID"),
        (2, 29): ("RIC", "CYCLO-GRAV", "R7"),
        (2, 30): ("OPTI-STRK", "KX", "DRFT-R"),
        (3, 28): ("RIC", "MO-TRAK", "BB9"),
        (3, 29): ("IG", "MECHA-DROID", "OPTI-STRK"),
        (3, 30): ("R7", "LEP", "DRFT-R"),
        (4, 28): ("IG", "KX", "OPTI-STRK"),
        (4, 29): ("TRI-TEK", "R7", "BB9"),
        (4, 30): ("MONO-WLKR", "CYCLENS", "IG"),
        (1, 31): ("SEN-TRI", "PROTO-ROLLER", "KX"),
        (1, 35): ("BB9", "IG", "SNOW MOUSE"),
        (2, 35): ("R7", "DRFT-R", "CYCLENS"),
        (3, 35): ("PROTO-ROLLER", "KX", "RIC"),
        (4, 35): ("B2-RP", "LOADLIFTER", "LEP"),
        (5, 1): ("ID10", "MOUSE", "GONK"),
        (5, 30): ("R7", "LEP", "CYCLENS"),
        (5, 35): ("MECHA-DROID", "RIC-1200", "MO-TRAK"),
    }
    for (cycle, rebirth), expected in expected_rows.items():
        assert CYCLES[cycle][rebirth - 1] == expected


def test_ambiguous_triple_does_not_change_cycle():
    assert detect_cycle({"R4", "R5", "R8"}) is None


def test_bb9_is_not_shortened_to_bb():
    assert match_droid("BB9") == ("BB9", 1.0)


def test_split_snow_mouse_title_outranks_nested_mouse_name():
    tokens = [
        _token("SNOW", 240, 300),
        _token("MOUSE", 310, 300),
        _token("WORK", 700, 350),
        _token("SWAP", 700, 450),
        _token("LOUNGE", 700, 550),
    ]
    assert selected_droid(tokens, 1000, 1000) == ("SNOW MOUSE", 1.0)


def _token(text, x, y):
    return OcrToken(text, 1.0, ((x - 5, y - 5), (x + 5, y - 5), (x + 5, y + 5), (x - 5, y + 5)))


def test_offline_ocr_uses_low_impact_runtime_settings(monkeypatch):
    import sys
    import types

    calls = {}

    class FakeRapidOcr:
        def __init__(self, **kwargs):
            calls["init"] = kwargs

        def __call__(self, image, **kwargs):
            calls["read"] = kwargs
            return None, None

    monkeypatch.setitem(sys.modules, "rapidocr_onnxruntime", types.SimpleNamespace(RapidOCR=FakeRapidOcr))
    ocr = OfflineOcr()
    from PIL import Image
    assert ocr.read(Image.new("RGB", (100, 30))) == []
    assert calls["init"] == {
        "intra_op_num_threads": 1,
        "inter_op_num_threads": 1,
        "det_limit_type": "max",
        "det_limit_side_len": 736,
    }
    assert calls["read"] == {"use_cls": False}


def test_offline_ocr_can_preserve_notification_colors(monkeypatch):
    import sys
    import types

    from PIL import Image

    seen = {}

    class FakeRapidOcr:
        def __init__(self, **kwargs):
            pass

        def __call__(self, image, **kwargs):
            seen["mode"] = image.mode
            return None, None

    monkeypatch.setitem(sys.modules, "rapidocr_onnxruntime", types.SimpleNamespace(RapidOCR=FakeRapidOcr))
    OfflineOcr().read(Image.new("RGB", (100, 30)), grayscale=False)
    assert seen["mode"] == "RGB"


def test_card_gate_skips_speculative_ocr_until_decision_is_ready():
    priorities = scan_priorities(card_gate=True, rebirth_gate=False, blueprint_gate=False)

    assert priorities.interaction_active is True
    assert priorities.scan_rebirth_gate is False
    assert priorities.probe_rebirth_fallback is False
    assert priorities.scan_spawn is False


def test_blueprint_gate_gets_the_same_focused_ocr_priority():
    priorities = scan_priorities(card_gate=False, rebirth_gate=False, blueprint_gate=True)

    assert priorities.interaction_active is True
    assert priorities.scan_rebirth_gate is False
    assert priorities.probe_rebirth_fallback is False
    assert priorities.scan_spawn is False


def test_idle_frame_retains_bounded_rebirth_and_spawn_probes():
    priorities = scan_priorities(card_gate=False, rebirth_gate=False, blueprint_gate=False)

    assert priorities.interaction_active is False
    assert priorities.scan_rebirth_gate is False
    assert priorities.probe_rebirth_fallback is True
    assert priorities.scan_spawn is True


def test_visual_gates_reject_plain_gameplay_and_detect_target_chrome():
    from PIL import Image, ImageDraw

    plain = Image.new("RGB", (1280, 720), "#74685c")
    assert card_visual_gate(plain) is False
    assert rebirth_visual_gate(plain) is False
    assert blueprint_visual_gate(plain) is False

    card = plain.copy()
    draw = ImageDraw.Draw(card)
    for top in (300, 390, 480, 570):
        draw.rectangle((390, top, 810, top + 55), fill="#e5aa00")
    assert card_visual_gate(card) is True

    rebirth = plain.copy()
    ImageDraw.Draw(rebirth).rectangle((20, 20, 360, 75), fill="#00ee55")
    assert rebirth_visual_gate(rebirth) is True

    blueprint = plain.copy()
    ImageDraw.Draw(blueprint).rectangle((360, 450, 900, 500), fill="#00d9ee")
    assert blueprint_visual_gate(blueprint) is True


def test_only_legendary_and_higher_galactic_spawns_trigger_alerts():
    for rarity in ("Common", "Rare", "Epic"):
        tokens = [_token(f"Galactic Droid ({rarity}) spawned at the Sandcrawler", 300, 500)]
        assert high_value_spawn(tokens, 1000, 1000) is None
    for rarity in ("Legendary", "Mythic"):
        tokens = [_token(f"Galactic Droid ({rarity}) spawned at the Sandcrawler", 300, 500)]
        assert high_value_spawn(tokens, 1000, 1000) == ("GALACTIC", rarity.upper())


def test_default_threshold_applies_to_stellar_too():
    for rarity in ("Common", "Rare", "Epic"):
        tokens = [_token(f"Stellar Droid ({rarity}) spawned at the Sandcrawler", 300, 500)]
        assert high_value_spawn(tokens, 1000, 1000) is None
    for rarity in ("Legendary", "Mythic"):
        tokens = [_token(f"Stellar Droid ({rarity}) spawned at the Sandcrawler", 300, 500)]
        assert high_value_spawn(tokens, 1000, 1000) == ("STELLAR", rarity.upper())


def test_configurable_spawn_threshold_requires_both_minimums():
    for finish in SPAWN_VARIANTS:
        for rarity in RARITIES:
            tokens = [_token(f"{finish.title()} Droid ({rarity.title()}) spawned at the Sandcrawler", 300, 500)]
            detected = high_value_spawn(tokens, 1000, 1000, "RAINBOW", "EPIC")
            qualifies = SPAWN_VARIANTS.index(finish) >= SPAWN_VARIANTS.index("RAINBOW") and RARITIES.index(
                rarity
            ) >= RARITIES.index("EPIC")
            assert detected == ((finish, rarity) if qualifies else None)


def test_threshold_can_include_every_variant_and_rarity():
    tokens = [_token("Default Droid (Common) spawned at the Sandcrawler", 300, 500)]
    assert high_value_spawn(tokens, 1000, 1000, "DEFAULT", "COMMON") == ("DEFAULT", "COMMON")


def test_beskar_requires_legendary_or_mythic():
    for rarity in ("Common", "Rare", "Epic"):
        tokens = [_token(f"Beskar Droid ({rarity}) spawned at the Sandcrawler", 300, 500)]
        assert high_value_spawn(tokens, 1000, 1000) is None
    for rarity in ("Legendary", "Mythic"):
        tokens = [_token(f"Beskar Droid ({rarity}) spawned at the Sandcrawler", 300, 500)]
        assert high_value_spawn(tokens, 1000, 1000) == ("BESKAR", rarity.upper())


def test_variants_below_beskar_never_trigger_even_when_mythic():
    for finish in ("Gold", "Diamond", "Rainbow"):
        tokens = [_token(f"{finish} Droid (Mythic) spawned at the Sandcrawler", 300, 500)]
        assert high_value_spawn(tokens, 1000, 1000) is None


def test_galactic_alert_requires_readable_epic_or_higher_rarity():
    tokens = [_token("Galactic Droid spawned at the Sandcrawler", 300, 500)]
    assert high_value_spawn(tokens, 1000, 1000) is None


def test_unrelated_mythic_text_cannot_override_galactic_rare():
    tokens = [
        _token("Galactic Droid (Rare) spawned at the Sandcrawler", 300, 500),
        _token("MYTHIC", 500, 600),
    ]
    assert high_value_spawn(tokens, 1000, 1000) is None


def test_unrelated_rarity_is_not_guessed_for_partial_galactic_ocr():
    tokens = [
        _token("Galactic Droid spawned at the Sandcrawler", 300, 500),
        _token("MYTHIC", 500, 600),
    ]
    assert high_value_spawn(tokens, 1000, 1000) is None


def test_galactic_droid_card_is_not_a_spawn_notification():
    tokens = [
        _token("ID10", 300, 400),
        _token("GALACTIC COMMON", 300, 450),
        _token("GALACTIC DROID", 500, 500),
        _token("AT THE SANDCRAWLER", 500, 560),
    ]
    assert high_value_spawn(tokens, 1000, 1000) is None


def test_panel_requires_aligned_vertical_card_controls():
    card = [_token("WORK", 500, 450), _token("SWAP", 505, 600), _token("LOUNGE", 510, 750)]
    assert panel_is_open(card, 1000, 1000) is True


def test_scattered_world_words_do_not_open_panel():
    scattered = [_token("WORK", 200, 400), _token("SELL", 800, 450), _token("LOUNGE", 500, 480)]
    assert panel_is_open(scattered, 1000, 1000) is False


def test_blueprint_requires_pickup_prompt_in_lower_screen():
    prompt = [_token("TOSS BLUEPRINT ON CRAFTING STATION", 500, 800)]
    assert blueprint_is_visible(prompt, 1000, 1000) is True
    assert blueprint_is_visible([_token("BLUEPRINT", 500, 200)], 1000, 1000) is False


def test_blueprint_prompt_can_be_split_across_ocr_tokens():
    prompt = [_token("TOSS BLUEPRINT", 400, 800), _token("ON CRAFTING STATION", 650, 800)]
    assert blueprint_is_visible(prompt, 1000, 1000) is True


def test_blueprint_droid_recognizes_exact_short_ig_token():
    assert blueprint_droid([_token("IG", 100, 100)]) == ("IG", 1.0)
    assert blueprint_droid([_token("LEGENDARY", 100, 100)])[0] is None


def test_focused_card_reader_reconstructs_split_senate_hovercam_name():
    tokens = [
        _token("SENATE", 120, 100),
        _token("HOVERCAM", 235, 102),
        _token("BESKAR", 120, 155),
        _token("RARE", 235, 155),
    ]

    assert blueprint_droid(tokens) == ("SENATE HOVERCAM", 1.0)


def test_focused_card_reader_ignores_stale_advisor_banner():
    tokens = [_token("B1 BATTLE: KEEP: NEEDED AT RB12", 250, 100)]

    assert blueprint_droid(tokens) == (None, 0.0)


def test_left_positioned_card_prefers_ig_above_its_buttons():
    tokens = [
        _token("IG", 100, 330),
        _token("WORK", 250, 480),
        _token("SWAP", 250, 600),
        _token("LOUNGE", 250, 720),
        _token("A-LT", 800, 300),
    ]
    assert selected_droid(tokens, 1000, 1000)[0] == "IG"


def test_card_role_label_does_not_become_b1_battle():
    tokens = [
        _token("Battle", 500, 90),
        _token("WORK", 250, 480),
        _token("SWAP", 250, 600),
        _token("LOUNGE", 250, 720),
    ]
    assert selected_droid(tokens, 1000, 1000)[0] is None


def test_advisor_banner_cannot_reinforce_wrong_droid():
    tokens = [
        _token("B1 BATTLE: SAFE TO SELL: NOT USED IN THIS CYCLE", 250, 430),
        _token("WORK", 250, 480),
        _token("SWAP", 250, 600),
        _token("LOUNGE", 250, 720),
    ]
    assert selected_droid(tokens, 1000, 1000)[0] is None


def test_card_header_crop_tracks_left_positioned_button_column():
    tokens = [
        _token("WORK", 180, 470),
        _token("SWAP", 180, 590),
        _token("LOUNGE", 180, 710),
    ]
    left, top, right, bottom = card_header_rect(tokens, 1000, 1000)
    assert left == 0
    assert top == 40
    assert right == 460
    assert bottom == 470


def test_update_128_side_by_side_card_reads_name_below_first_button():
    tokens = [
        _token("R4", 220, 350),
        _token("RAINBOW", 220, 405),
        _token("RARE", 350, 405),
        _token("WORK", 700, 240),
        _token("SWAP", 700, 350),
        _token("FUSION", 700, 460),
        _token("LOUNGE", 700, 570),
        _token("CUSTOMIZE", 700, 680),
        _token("SELL", 700, 790),
    ]

    assert panel_is_open(tokens, 1000, 1000) is True
    assert classify_interaction(tokens, 1000, 1000, False, True) == (False, True)
    assert selected_droid(tokens, 1000, 1000) == ("R4", 1.0)
    assert card_header_rect(tokens, 1000, 1000) == (120, 220, 580, 520)


def test_interaction_gate_wins_over_false_rebirth_color_gate():
    priorities = scan_priorities(card_gate=False, rebirth_gate=True, blueprint_gate=True)

    assert priorities.interaction_active is True
    assert priorities.scan_rebirth_gate is False
    assert priorities.probe_rebirth_fallback is False
    assert priorities.scan_spawn is False


def test_tooltip_sentence_does_not_break_card_button_detection():
    tokens = [
        _token("WORK", 500, 450),
        _token("LOUNGE", 500, 600),
        _token("CUSTOMIZE", 500, 750),
        _token("Droid follows you around, aiding in your work.", 800, 650),
    ]
    assert is_card_button_text(tokens[-1].text) is False
    assert panel_is_open(tokens, 1000, 1000) is True


def test_focused_rebirth_header_requires_a_valid_rank():
    assert rebirth_header_is_open([_token("REBIRTH", 100, 50), _token("Rank 8", 300, 50)]) is True
    assert rebirth_header_is_open([_token("Rank 8", 300, 50)]) is True
    assert rebirth_header_is_open([_token("REBIRTH", 100, 50)]) is False


def test_region_ocr_translates_tokens_to_full_frame():
    class FakeOcr:
        def read(self, _image, max_width=1400, grayscale=True):
            assert max_width == 900
            assert grayscale is True
            return [_token("IG", 20, 30)]

    from PIL import Image
    tokens = read_region(FakeOcr(), Image.new("RGB", (1000, 1000)), (100, 200, 500, 600), max_width=900)
    assert tokens[0].center == (120, 230)


def test_blueprint_finish_and_rarity_are_optional_context():
    assert blueprint_details([_token("RAINBOW", 10, 10), _token("LEGENDARY", 20, 20)]) == ("RAINBOW", "LEGENDARY")
    assert blueprint_details([_token("STELLAR", 10, 10), _token("MYTHIC", 20, 20)]) == ("STELLAR", "MYTHIC")


def test_rebirth_rank_accepts_update_126_range_only():
    assert rebirth_rank([_token("Rank 35", 100, 30)]) == 35
    assert rebirth_rank([_token("Rank 36", 100, 30)]) is None


def test_high_value_spawn_filter_is_strict():
    assert high_value_spawn([_token("Rainbow Droid (Mythic) spawned at the Sandcrawler", 300, 500)], 1000, 1000) is None
    assert high_value_spawn([_token("Beskar Droid (Legendary) spawned at the Sandcrawler", 300, 500)], 1000, 1000) == ("BESKAR", "LEGENDARY")
    assert high_value_spawn([_token("Rainbow Droid (Rare) spawned at the Sandcrawler", 300, 500)], 1000, 1000) is None
    assert high_value_spawn([_token("Gold Droid (Mythic) spawned at the Sandcrawler", 300, 500)], 1000, 1000) is None
    assert high_value_spawn([_token("Galactic Droid (Epic) spawned at the Sandcrawler", 300, 500)], 1000, 1000) is None
    assert high_value_spawn([_token("Stellar Droid (Common) spawned at the Sandcrawler", 300, 500)], 1000, 1000) is None


def test_spawn_notification_sound_is_non_blocking(monkeypatch, tmp_path):
    calls = []

    class FakeWinSound:
        SND_ALIAS = 1
        SND_ASYNC = 2
        SND_NODEFAULT = 4
        SND_FILENAME = 8
        MB_ICONEXCLAMATION = 16

        @staticmethod
        def PlaySound(name, flags):
            calls.append((name, flags))

        @staticmethod
        def MessageBeep(_kind):
            raise AssertionError("fallback should not be needed")

    monkeypatch.setattr(notifications, "winsound", FakeWinSound)
    sound = tmp_path / "droid-chime.wav"
    sound.write_bytes(b"RIFF")
    assert notifications.play_spawn_notification("droid_chime", tmp_path, 100) is True
    assert calls == [(str(sound), 14)]


def test_windows_tone_remains_an_available_fallback(monkeypatch):
    calls = []

    class FakeWinSound:
        SND_ALIAS = 1
        SND_ASYNC = 2
        SND_NODEFAULT = 4
        SND_FILENAME = 8
        MB_ICONEXCLAMATION = 16

        @staticmethod
        def PlaySound(name, flags):
            calls.append((name, flags))

        @staticmethod
        def MessageBeep(_kind):
            raise AssertionError("fallback should not be needed")

    monkeypatch.setattr(notifications, "winsound", FakeWinSound)
    assert notifications.play_spawn_notification("windows_tone") is True
    assert calls == [("SystemExclamation", 7)]


def test_windows_tone_ignores_custom_volume_zero(monkeypatch):
    calls = []

    class FakeWinSound:
        SND_ALIAS = 1
        SND_ASYNC = 2
        SND_NODEFAULT = 4
        SND_FILENAME = 8
        MB_ICONEXCLAMATION = 16

        @staticmethod
        def PlaySound(name, flags):
            calls.append((name, flags))

    monkeypatch.setattr(notifications, "winsound", FakeWinSound)
    assert notifications.play_spawn_notification("windows_tone", volume_percent=0) is True
    assert calls == [("SystemExclamation", 7)]


def test_custom_sound_failure_falls_back_without_raising(monkeypatch, tmp_path):
    calls = []

    class FakeWinSound:
        SND_ALIAS = 1
        SND_ASYNC = 2
        SND_NODEFAULT = 4
        SND_FILENAME = 8
        MB_ICONEXCLAMATION = 16

        @staticmethod
        def PlaySound(name, flags):
            calls.append((name, flags))

    monkeypatch.setattr(notifications, "winsound", FakeWinSound)
    sound_dir = Path(__file__).resolve().parents[1] / "droid_advisor" / "assets" / "sounds"
    invalid_cache = tmp_path / "not-a-directory"
    invalid_cache.write_text("occupied", encoding="utf-8")
    assert notifications.play_spawn_notification("droid_chime", sound_dir, 50, invalid_cache) is True
    assert calls == [("SystemExclamation", 7)]


def test_custom_sound_volume_creates_scaled_cached_wav(tmp_path):
    import wave
    from array import array

    sound_dir = Path(__file__).resolve().parents[1] / "droid_advisor" / "assets" / "sounds"
    source = sound_dir / "droid-chime.wav"
    adjusted = notifications.volume_adjusted_sound(source, 50, tmp_path)
    with wave.open(str(source), "rb") as original_wav:
        original = array("h")
        original.frombytes(original_wav.readframes(original_wav.getnframes()))
    with wave.open(str(adjusted), "rb") as adjusted_wav:
        scaled = array("h")
        scaled.frombytes(adjusted_wav.readframes(adjusted_wav.getnframes()))
    assert adjusted.name == "droid-chime-volume-50.wav"
    assert len(scaled) == len(original)
    assert abs(max(scaled)) in range(round(abs(max(original)) * 0.49), round(abs(max(original)) * 0.51) + 1)


def test_corrupt_volume_cache_is_regenerated(tmp_path):
    import os
    import wave

    sound_dir = Path(__file__).resolve().parents[1] / "droid_advisor" / "assets" / "sounds"
    source = sound_dir / "droid-chime.wav"
    cached = tmp_path / "droid-chime-volume-50.wav"
    cached.write_bytes(b"not a wav")
    newer = source.stat().st_mtime + 10
    os.utime(cached, (newer, newer))
    adjusted = notifications.volume_adjusted_sound(source, 50, tmp_path)
    with wave.open(str(adjusted), "rb") as regenerated:
        assert regenerated.getsampwidth() == 2
        assert regenerated.getnframes() > 0


def test_zero_custom_sound_volume_is_silent(monkeypatch, tmp_path):
    class FakeWinSound:
        def __getattr__(self, name):
            raise AssertionError(f"winsound should not be called at zero volume: {name}")

    monkeypatch.setattr(notifications, "winsound", FakeWinSound())
    assert notifications.play_spawn_notification("droid_chime", tmp_path, 0) is True


def test_bundled_alert_sound_choices_have_valid_wav_assets():
    sound_dir = Path(__file__).resolve().parents[1] / "droid_advisor" / "assets" / "sounds"
    assert tuple(label for label, _sound_id in notifications.SOUND_CHOICES) == (
        "Droid Chime", "Scanner Ping", "Urgent Pulse", "Custom WAV", "Windows Tone",
    )
    for filename in notifications.SOUND_FILES.values():
        data = (sound_dir / filename).read_bytes()
        assert data[:4] == b"RIFF"
        assert data[8:12] == b"WAVE"


def test_custom_wav_is_validated_copied_and_played(monkeypatch, tmp_path):
    import wave
    from array import array

    source = tmp_path / "selected.wav"
    destination = tmp_path / "managed" / notifications.CUSTOM_SOUND_FILENAME
    samples = array("h", (0, 500, -500, 0) * 100)
    with wave.open(str(source), "wb") as output_wav:
        output_wav.setparams((1, 2, 44100, 0, "NONE", "not compressed"))
        output_wav.writeframes(samples.tobytes())

    assert notifications.install_custom_sound(source, destination) == destination.resolve()
    assert destination.read_bytes() == source.read_bytes()

    calls = []

    class FakeWinSound:
        SND_ALIAS = 1
        SND_ASYNC = 2
        SND_NODEFAULT = 4
        SND_FILENAME = 8
        MB_ICONEXCLAMATION = 16

        @staticmethod
        def PlaySound(name, flags):
            calls.append((name, flags))

    monkeypatch.setattr(notifications, "winsound", FakeWinSound)
    assert notifications.play_spawn_notification(
        "custom_wav", volume_percent=100, custom_sound_path=destination
    ) is True
    assert calls == [(str(destination), 14)]


def test_invalid_custom_wav_is_rejected_without_replacing_existing(tmp_path):
    destination = tmp_path / notifications.CUSTOM_SOUND_FILENAME
    destination.write_bytes(b"existing managed sound")
    invalid = tmp_path / "not-a-wave.wav"
    invalid.write_bytes(b"not a wave")

    try:
        notifications.install_custom_sound(invalid, destination)
    except ValueError as exc:
        assert "valid PCM WAV" in str(exc)
    else:
        raise AssertionError("invalid custom WAV was accepted")
    assert destination.read_bytes() == b"existing managed sound"
    assert list(tmp_path.glob("custom-alert-*.tmp")) == []


def test_inventory_distinguishes_missing_duplicate_and_underleveled(tmp_path):
    ledger = InventoryLedger(tmp_path / "inventory.json")
    missing = ledger.assess(2, 22, "OPTI-STRK")
    assert missing.message == "KEEP: NEED BESKAR AT RB24; NONE OWNED"
    ledger.set("OPTI-STRK", 1, "BESKAR")
    assert ledger.assess(2, 22, "OPTI-STRK").message == "KEEP: OWN BESKAR; NEED GALACTIC LATER"
    ledger.set("OPTI-STRK", 1, "GOLD")
    assert ledger.assess(2, 22, "OPTI-STRK").message == "KEEP/UPGRADE: OWN GOLD, NEED BESKAR AT RB24"


def test_galactic_outranks_beskar_and_lower_requirements(tmp_path):
    ledger = InventoryLedger(tmp_path / "inventory.json")
    ledger.set("OPTI-STRK", 1, "GALACTIC")
    assessment = ledger.assess(4, 22, "OPTI-STRK")
    assert assessment.required_quality == "GALACTIC"
    assert assessment.covered is True


def test_stellar_outranks_galactic_and_covers_cycle_five_endgame(tmp_path):
    ledger = InventoryLedger(tmp_path / "inventory.json")
    ledger.set("MECHA-DROID", 1, "STELLAR")
    assessment = ledger.assess(5, 30, "MECHA-DROID")
    assert assessment.next_needed == 35
    assert assessment.required_quality == "STELLAR"
    assert assessment.covered is True


def test_update_126_quality_rows_match_verified_tracker():
    qualities = quality_table()
    assert qualities["1"]["31"] == ["STELLAR", "BESKAR", "BESKAR"]
    assert qualities["4"]["35"] == ["STELLAR", "STELLAR", "STELLAR"]
    assert qualities["5"]["32"] == ["GALACTIC", "GALACTIC", "BESKAR"]


def test_stellar_graphic_uses_warm_orbital_treatment():
    icon = stellar_icon(27, seed=126)
    colors = icon.convert("RGB").getcolors(maxcolors=27 * 27)
    assert QUALITY_COLORS["STELLAR"] == "#fbbf24"
    assert colors is not None
    assert len(colors) >= 12
    assert any(red > 220 and green > 140 and blue < 90 for _count, (red, green, blue) in colors)


def test_every_generated_rebirth_card_uses_screen_safe_dimensions():
    for cycle in range(1, 6):
        for rank in range(1, MAX_REBIRTH + 1):
            expected_height = 179 if rank >= 12 else 125
            assert render_card(cycle, rank).size == (DISPLAY_WIDTH, expected_height)


def test_inventory_persists_and_clears(tmp_path):
    path = tmp_path / "inventory.json"
    InventoryLedger(path).set("BB9", 2, "RAINBOW")
    loaded = InventoryLedger(path)
    assert loaded.get("BB9").quantity == 2
    loaded.clear()
    assert InventoryLedger(path).get("BB9") is None


def test_update_release_requires_newer_version_and_digest():
    release = {"tag_name": "v0.5.0", "html_url": "https://example.test/release", "assets": [{
        "name": "DroidAdvisor-Setup-0.5.0.exe", "browser_download_url": "https://github.com/jrlee2x/droid-advisor/releases/download/v0.5.0/DroidAdvisor-Setup-0.5.0.exe",
        "digest": "sha256:" + "a" * 64,
    }]}
    assert parse_release(release, "0.4.1").version == "0.5.0"
    assert parse_release(release, "0.5.0") is None
    assert version_tuple("v1.2.10") > version_tuple("1.2.9")


def test_update_release_requires_filename_to_match_tag_exactly():
    release = {"tag_name": "v1.1.4", "assets": [{
        "name": "DroidAdvisor-Setup-9.9.9.exe",
        "browser_download_url": "https://github.com/jrlee2x/droid-advisor/releases/download/v0.5.0/DroidAdvisor-Setup-0.5.0.exe",
        "digest": "sha256:" + "a" * 64,
    }]}
    try:
        parse_release(release, "1.1.3")
    except ValueError as exc:
        assert "matching DroidAdvisor-Setup-1.1.4.exe" in str(exc)
    else:
        raise AssertionError("mismatched installer filename was accepted")


def test_active_rebirth_wraps_after_rank_35():
    assert active_rebirth(4, 34) == (4, 35)
    assert active_rebirth(4, 35) == (5, 1)
    assert active_rebirth(5, 35) == (1, 1)


def test_saved_config_is_normalized_and_written_atomically(monkeypatch, tmp_path):
    import json

    from droid_advisor import config

    config_path = tmp_path / "config.json"
    monkeypatch.setattr(config, "APP_DIR", tmp_path)
    monkeypatch.setattr(config, "CONFIG_PATH", config_path)
    config_path.write_text(
        json.dumps({
            "cycle": 99,
            "completed_rebirth": 999,
            "spawn_alert_sound": "made_up",
            "spawn_alert_volume": "loud",
            "spawn_alert_min_variant": "made_up",
            "spawn_alert_min_rarity": 99,
        }),
        encoding="utf-8",
    )
    normalized = config.load_config()
    assert normalized["cycle"] == 1
    assert normalized["completed_rebirth"] == 35
    assert normalized["spawn_alert_sound"] == "droid_chime"
    assert normalized["spawn_alert_volume"] == 70
    assert normalized["spawn_alert_min_variant"] == "BESKAR"
    assert normalized["spawn_alert_min_rarity"] == "LEGENDARY"
    normalized["spawn_alert_volume"] = 55
    config.save_config(normalized)
    assert json.loads(config_path.read_text(encoding="utf-8"))["spawn_alert_volume"] == 55
    assert list(tmp_path.glob("config-*.tmp")) == []


def test_config_uses_custom_wav_only_when_managed_copy_exists(monkeypatch, tmp_path):
    import json

    from droid_advisor import config

    config_path = tmp_path / "config.json"
    custom_path = tmp_path / notifications.CUSTOM_SOUND_FILENAME
    monkeypatch.setattr(config, "CONFIG_PATH", config_path)
    monkeypatch.setattr(config, "CUSTOM_SOUND_PATH", custom_path)
    config_path.write_text(
        json.dumps({"spawn_alert_sound": "custom_wav"}), encoding="utf-8"
    )
    assert config.load_config()["spawn_alert_sound"] == "droid_chime"
    custom_path.write_bytes(b"managed")
    assert config.load_config()["spawn_alert_sound"] == "custom_wav"


def test_non_object_config_uses_defaults(monkeypatch, tmp_path):
    from droid_advisor import config

    config_path = tmp_path / "config.json"
    config_path.write_text("[]", encoding="utf-8")
    monkeypatch.setattr(config, "CONFIG_PATH", config_path)
    assert config.load_config() == config.DEFAULTS


def test_saved_spawn_thresholds_are_case_normalized(monkeypatch, tmp_path):
    import json

    from droid_advisor import config

    config_path = tmp_path / "config.json"
    monkeypatch.setattr(config, "CONFIG_PATH", config_path)
    config_path.write_text(
        json.dumps({
            "spawn_alert_min_variant": "stellar",
            "spawn_alert_min_rarity": "rare",
        }),
        encoding="utf-8",
    )
    loaded = config.load_config()
    assert loaded["spawn_alert_min_variant"] == "STELLAR"
    assert loaded["spawn_alert_min_rarity"] == "RARE"


def test_upgrade_transaction_requires_clean_runtime_and_health_check():
    script = build_installer_script(
        "C:\\update\\setup.exe",
        "a" * 64,
        "C:\\app\\DroidAdvisor.exe",
        "C:\\update",
        123,
    )
    assert "/RESTARTEXITCODE=3010" in script
    assert "/LOGCLOSEAPPLICATIONS" in script
    assert "update-install.log" in script
    assert "--health-check" in script
    installer_script = (
        Path(__file__).resolve().parents[1] / "droid_advisor" / "installer.iss"
    ).read_text(encoding="utf-8")
    assert 'Type: filesandordirs; Name: "{app}\\_internal"' in installer_script


def test_runtime_health_check_exercises_pillow_core():
    from droid_advisor.launcher import runtime_health_check

    assert runtime_health_check() == 0


def test_spawn_presence_clears_only_after_consecutive_absent_scans():
    stellar = ("STELLAR", "COMMON")
    signature, absent, alert = update_spawn_presence(None, 0, stellar)
    assert (signature, absent, alert) == (stellar, 0, True)
    signature, absent, alert = update_spawn_presence(signature, absent, stellar)
    assert (signature, absent, alert) == (stellar, 0, False)
    for expected_absent in (1, 2):
        signature, absent, alert = update_spawn_presence(signature, absent, None)
        assert (signature, absent, alert) == (stellar, expected_absent, False)
    signature, absent, alert = update_spawn_presence(signature, absent, None)
    assert (signature, absent, alert) == (None, 0, False)
    assert update_spawn_presence(signature, absent, stellar) == (stellar, 0, True)


def test_updater_uses_a_packaged_trusted_ca_bundle():
    context = trusted_ssl_context()
    assert context.verify_mode.name == "CERT_REQUIRED"
    assert context.check_hostname is True
    assert context.cert_store_stats()["x509_ca"] > 0


def test_diagnostics_are_in_memory_and_report_runtime_state():
    diagnostics = DiagnosticBuffer(max_events=2)
    diagnostics.set(card_visual_gate=True, interaction_token_count=7)
    diagnostics.record("Offline OCR initialized")
    report = diagnostics.report("1.2.3", {"cycle": 4, "completed_rebirth": 20}, (0, 0, 1920, 1080))
    assert "Version: 1.2.3" in report
    assert "card_visual_gate: True" in report
    assert "Offline OCR initialized" in report
    assert "Screenshots saved: no" in report


def test_detailed_ocr_samples_require_explicit_enablement():
    diagnostics = DiagnosticBuffer()
    diagnostics.sample("interaction_ocr_sample", ["WORK", "SELL"])
    assert "interaction_ocr_sample" not in diagnostics.report("1", {}, None)
    diagnostics.enable_detailed(120)
    diagnostics.sample("interaction_ocr_sample", ["WORK", "SELL"])
    assert "interaction_ocr_sample: WORK | SELL" in diagnostics.report("1", {}, None)


def test_detailed_ocr_samples_are_purged_without_a_later_report():
    import time

    diagnostics = DiagnosticBuffer()
    diagnostics.enable_detailed(0.02)
    diagnostics.sample("interaction_ocr_sample", ["PRIVATE OCR"])
    time.sleep(0.08)
    assert "interaction_ocr_sample" not in diagnostics._state
