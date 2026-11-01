"""Scourge recognition, persistence, rebirth coverage and recipe regressions."""

import json
from pathlib import Path

import pytest

from droid_advisor.config import load_config
from droid_advisor.cycles import CYCLES
from droid_advisor.droid_catalog import CATALOG, income_per_second
from droid_advisor.engine import advise, canonical
from droid_advisor.fusion_recipes import recipe_fusion_variant
from droid_advisor.inventory import InventoryLedger
from droid_advisor.qualities import quality_table
from droid_advisor.vision import OcrToken, blueprint_details, focused_identity, high_value_spawn

FIXTURES = Path(__file__).parent / "fixtures"
ECONOMY = json.loads((FIXTURES / "economy-v1.37.json").read_text())["droids"]
REBIRTH = json.loads((FIXTURES / "rebirth-v1.37.json").read_text())["cycles"]


def token(text, y=350, confidence=.99):
    return OcrToken(text, confidence, ((350, y), (550, y), (550, y + 25), (350, y + 25)))


def test_scourge_card_identity_and_conflicting_finish_labels():
    assert focused_identity([token("R4"), token("SCOURGE", 400), token("RARE", 450)]) == ("R4", .99, "SCOURGE", "RARE")
    assert blueprint_details([token("SCOURGE"), token("MYTHIC")]) == ("SCOURGE", "MYTHIC")
    assert blueprint_details([token("SCOURGE KYBER"), token("MYTHIC")]) == (None, "MYTHIC")
    assert blueprint_details([token("SCOURGE", confidence=.4)])[0] is None


def test_scourge_alert_minimums_and_spurious_mentions():
    tokens = [token("Scourge Droid (Mythic) spawned at the Sandcrawler")]
    assert high_value_spawn(tokens, 1000, 1000, "KYBER", "MYTHIC") == ("SCOURGE", "MYTHIC")
    assert high_value_spawn(tokens, 1000, 1000, "SCOURGE", "MYTHIC") == ("SCOURGE", "MYTHIC")
    assert high_value_spawn([token("Kyber Droid (Mythic) spawned at the Sandcrawler")], 1000, 1000, "SCOURGE", "COMMON") is None
    assert high_value_spawn([token("Scourge Droid (Rare) spawned at the Sandcrawler")], 1000, 1000, "SCOURGE", "MYTHIC") is None
    assert high_value_spawn([token("SCOURGE PRIME")], 1000, 1000) is None


def test_scourge_inventory_round_trip_and_kyber_requirement(tmp_path):
    path = tmp_path / "inventory.json"
    ledger = InventoryLedger(path)
    ledger.set("GROUNDMECH", 1, "SCOURGE")
    restored = InventoryLedger(path)
    assert restored.assess(1, 34, "GROUNDMECH").covered
    assert restored.list_units()[0].finish == "SCOURGE"


@pytest.mark.parametrize("cycle", range(1, 7))
def test_every_rebirth_slot_accepts_same_droid_scourge(cycle):
    for rank, names in enumerate(CYCLES[cycle], 1):
        for name in names:
            advice = advise(cycle, rank - 1, name, "SCOURGE")
            assert not advice.safe_to_sell
            assert "UPGRADE" not in advice.message
            assert advice.next_needed == rank


def test_scourge_after_last_rebirth_use_does_not_get_sell_banner():
    advice = advise(3, 40, "R4", "SCOURGE")
    assert not advice.safe_to_sell
    assert "SCOURGEDEX" in advice.message and "FUSION" in advice.message
    assert "RBNone" not in advice.message
    assert advise(3, 40, "R4", "RAINBOW").safe_to_sell


@pytest.mark.parametrize("finishes,expected", [
    (("SCOURGE", "STELLAR", "KYBER"), "SCOURGE"),
    (("SCOURGE", "SCOURGE", "SCOURGE"), "SCOURGE"),
    (("SCOURGE", "KYBER_BLUE", "KYBER_PURPLE"), "SCOURGE"),
    (("STELLAR", "SCOURGE", "KYBER"), "STELLAR"),
    (("KYBER", "KYBER", "KYBER"), "KYBER"),
    (("SCOURGE", "GOLD", "STELLAR"), "GOLD"),
    (("SCOURGE", "BASIC", "DEFAULT"), "DEFAULT"),
    (("SCOURGE", "???", "STELLAR"), None),
])
def test_named_recipe_left_slot_and_lower_variant_rules(finishes, expected):
    assert recipe_fusion_variant(finishes) == expected


@pytest.mark.parametrize("name", ECONOMY)
def test_all_fixed_income_values_match_independent_source_snapshot(name):
    for finish, value in ECONOMY[name]["income"].items():
        assert income_per_second(name, finish) == pytest.approx(value), (name, finish)


@pytest.mark.parametrize("cycle", range(1, 7))
def test_all_rebirth_names_and_finishes_match_current_source(cycle):
    for row in REBIRTH[str(cycle)]:
        rank = row["to"]
        expected = sorted((canonical(x["droidName"]), "BASE" if x["variant"] == "DEFAULT" else x["variant"]) for x in row["requiredDroids"])
        actual = sorted((canonical(name), finish) for name, finish in zip(CYCLES[cycle][rank - 1], quality_table()[str(cycle)][str(rank)]))
        assert actual == expected, (cycle, rank)


def test_scourge_prime_is_separate_default_only_iconic():
    prime = CATALOG["SCOURGEPRIME"]
    assert prime.kind == "ICONIC" and prime.role == "PROTOCOL"
    assert income_per_second(prime.name, "SCOURGE") is None
    assert focused_identity([token("SCOURGE PRIME"), token("ICONIC", 400)])[2:] == ("DEFAULT", "ICONIC")


def test_alert_configuration_keeps_scourge_minimum(tmp_path, monkeypatch):
    from droid_advisor import config
    path = tmp_path / "config.json"
    path.write_text(json.dumps({"spawn_alert_min_variant": "SCOURGE"}))
    monkeypatch.setattr(config, "CONFIG_PATH", path)
    assert load_config()["spawn_alert_min_variant"] == "SCOURGE"
