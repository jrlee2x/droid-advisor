from droid_advisor.engine import advise, canonical, detect_cycle, match_droid
from droid_advisor.vision import OcrToken, blueprint_details, blueprint_is_visible, high_value_spawn, panel_is_open
from droid_advisor.inventory import InventoryLedger


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
