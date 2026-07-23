from droid_advisor.engine import advise, canonical, detect_cycle, match_droid, safe_to_sell_droids
from droid_advisor.vision import OfflineOcr, OcrToken, blueprint_details, blueprint_droid, blueprint_is_visible, blueprint_visual_gate, card_header_rect, card_visual_gate, game_ui_viewport, high_value_spawn, is_card_button_text, panel_is_open, read_region, rebirth_header_is_open, rebirth_visual_gate, selected_droid
from droid_advisor.inventory import InventoryLedger
from droid_advisor.updater import parse_release, version_tuple
from droid_advisor.cycles import CYCLES
from droid_advisor.diagnostics import DiagnosticBuffer
from PIL import Image


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
    }
    for (cycle, rebirth), expected in expected_rows.items():
        assert CYCLES[cycle][rebirth - 1] == expected


def test_ambiguous_triple_does_not_change_cycle():
    assert detect_cycle({"R4", "R5", "R8"}) is None


def test_bb9_is_not_shortened_to_bb():
    assert match_droid("BB9") == ("BB9", 1.0)


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


def test_only_epic_and_higher_galactic_spawns_trigger_alerts():
    for rarity in ("Common", "Rare"):
        tokens = [_token(f"Galactic Droid ({rarity}) spawned at the Sandcrawler", 300, 500)]
        assert high_value_spawn(tokens, 1000, 1000) is None
    for rarity in ("Epic", "Legendary", "Mythic"):
        tokens = [_token(f"Galactic Droid ({rarity}) spawned at the Sandcrawler", 300, 500)]
        assert high_value_spawn(tokens, 1000, 1000) == ("GALACTIC", rarity.upper())


def test_existing_finishes_still_require_legendary_or_mythic():
    rare = [_token("Rainbow Droid (Rare) spawned at the Sandcrawler", 300, 500)]
    mythic = [_token("Beskar Droid (Mythic) spawned at the Sandcrawler", 300, 500)]
    assert high_value_spawn(rare, 1000, 1000) is None
    assert high_value_spawn(mythic, 1000, 1000) == ("BESKAR", "MYTHIC")


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


def test_high_value_spawn_filter_is_strict():
    assert high_value_spawn([_token("Rainbow Droid (Mythic) spawned at the Sandcrawler", 300, 500)], 1000, 1000) == ("RAINBOW", "MYTHIC")
    assert high_value_spawn([_token("Beskar Droid (Legendary) spawned at the Sandcrawler", 300, 500)], 1000, 1000) == ("BESKAR", "LEGENDARY")
    assert high_value_spawn([_token("Rainbow Droid (Rare) spawned at the Sandcrawler", 300, 500)], 1000, 1000) is None
    assert high_value_spawn([_token("Gold Droid (Mythic) spawned at the Sandcrawler", 300, 500)], 1000, 1000) is None


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


def test_inventory_persists_and_clears(tmp_path):
    path = tmp_path / "inventory.json"
    InventoryLedger(path).set("BB9", 2, "RAINBOW")
    loaded = InventoryLedger(path)
    assert loaded.get("BB9").quantity == 2
    loaded.clear()
    assert InventoryLedger(path).get("BB9") is None


def test_update_release_requires_newer_version_and_digest():
    release = {"tag_name": "v0.5.0", "html_url": "https://example.test/release", "assets": [{
        "name": "DroidAdvisor-Setup-0.5.0.exe", "browser_download_url": "https://example.test/app.exe",
        "digest": "sha256:" + "a" * 64,
    }]}
    assert parse_release(release, "0.4.1").version == "0.5.0"
    assert parse_release(release, "0.5.0") is None
    assert version_tuple("v1.2.10") > version_tuple("1.2.9")


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
