from droid_advisor.engine import advise, canonical, detect_cycle, match_droid
from droid_advisor.vision import OcrToken, blueprint_details, blueprint_droid, blueprint_is_visible, card_header_rect, high_value_spawn, panel_is_open, selected_droid
from droid_advisor.inventory import InventoryLedger
from droid_advisor.updater import parse_release, version_tuple


def test_proto_roller_at_completed_22_varies_by_cycle():
    assert advise(1, 22, "PROTO-ROLLER").safe_to_sell is True
    assert advise(2, 22, "PROTO-ROLLER").safe_to_sell is True
    assert advise(3, 22, "PROTO-ROLLER").next_needed == 25
    assert advise(4, 22, "PROTO-ROLLER").next_needed == 24


def test_rbc2_proto_roller_is_not_needed_after_rb22():
    result = advise(2, 22, "PROTO-ROLLER")
    assert result.safe_to_sell is True
    assert result.last_needed == 22
    assert result.message == "SAFE TO SELL: LAST NEEDED AT RB22"


def test_spelling_variants_are_canonicalized():
    assert canonical("PROTO_ROLLER") == canonical("PROTO-ROLLER")
    assert canonical("PROTOROLL") == canonical("PROTO-ROLLER")


def test_unique_view_rebirth_triple_detects_cycle_and_level():
    assert detect_cycle({"KX", "TRI-TEK", "SNOW MOUSE"}) == (1, 27)
    assert detect_cycle({"LEP", "LOADLIFTER", "MO-TRAK"}) == (2, 27)


def test_ambiguous_triple_does_not_change_cycle():
    assert detect_cycle({"R4", "R5", "R8"}) is None


def test_bb9_is_not_shortened_to_bb():
    assert match_droid("BB9") == ("BB9", 1.0)


def _token(text, x, y):
    return OcrToken(text, 1.0, ((x - 5, y - 5), (x + 5, y - 5), (x + 5, y + 5), (x - 5, y + 5)))


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
    assert ledger.assess(2, 22, "OPTI-STRK").covered is True
    ledger.set("OPTI-STRK", 1, "GOLD")
    assert ledger.assess(2, 22, "OPTI-STRK").message == "KEEP/UPGRADE: OWN GOLD, NEED BESKAR AT RB24"


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
