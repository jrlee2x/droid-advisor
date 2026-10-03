import pytest

from droid_advisor.cycles import CYCLES, active_rebirth
from droid_advisor.droid_catalog import income_per_second
from droid_advisor.engine import advise
from droid_advisor.inventory import InventoryLedger
from droid_advisor.qualities import quality_table
from droid_advisor.vision import (
    OcrToken, blueprint_details, blueprint_droid, completed_rebirth,
    high_value_spawn, rebirth_rank, selected_droid,
)


def token(text, x=350, y=350):
    return OcrToken(text, 1.0, ((x, y), (x + 80, y), (x + 80, y + 20), (x, y + 20)))


@pytest.mark.parametrize("name", ["GROUNDMECH", "GROUND MEC", "GROUND-MEC", "GROUND MEK"])
def test_groundmech_owned_panel_and_focused_header(name):
    identity = [token(name)]
    controls = [token(text, 650, y) for text, y in [("COMPANION", 300), ("SELL", 550), ("UPGRADE", 700)]]
    assert blueprint_droid(identity)[0] == "GROUNDMECH"
    assert selected_droid(identity + controls, 1000, 1000)[0] == "GROUNDMECH"
    assert advise(1, 34, name).next_needed == 37
    assert advise(4, 34, name).next_needed == 38
    assert advise(4, 38, name).safe_to_sell


def test_groundmech_split_title():
    assert blueprint_droid([token("GROUND", 200), token("MEC", 300)])[0] == "GROUNDMECH"


@pytest.mark.parametrize("cycle", range(1, 6))
def test_new_rebirth_targets_stay_in_current_cycle(cycle):
    assert active_rebirth(cycle, 35) == (cycle, 36)
    for rank in range(36, 41):
        assert quality_table()[str(cycle)][str(rank)] == ["KYBER"] * 3
        for name in CYCLES[cycle][rank - 1]:
            result = advise(cycle, rank - 1, name, "STELLAR")
            assert not result.safe_to_sell
            assert result.next_needed == rank
            assert "UPGRADE TO KYBER" in result.message


@pytest.mark.parametrize("finish", ["KYBER", "KYBER_GREEN", "KYBER_BLUE", "KYBER_PURPLE"])
def test_kyber_inventory_roundtrip_and_income(tmp_path, finish):
    path = tmp_path / "inventory.json"
    ledger = InventoryLedger(path)
    ledger.set("GROUNDMECH", 1, finish)
    loaded = InventoryLedger(path)
    assert loaded.assess(1, 34, "GROUNDMECH").covered
    assert income_per_second("Groundmech", finish) == {
        "KYBER": 10560, "KYBER_GREEN": 31680, "KYBER_BLUE": 34320, "KYBER_PURPLE": 38016,
    }[finish]


def test_kyber_ocr_does_not_mistake_blueprint_for_blue_activation():
    assert blueprint_details([token("KYBER BLUEPRINT"), token("EPIC")]) == ("KYBER", "EPIC")
    assert blueprint_details([token("PURPLE KYBER"), token("MYTHIC")]) == ("KYBER_PURPLE", "MYTHIC")
    assert blueprint_details([token("KYBER GREEN"), token("RARE")]) == ("KYBER_GREEN", "RARE")
    assert high_value_spawn([token("Kyber Droid (Mythic) spawned at the Sandcrawler")], 1000, 1000) == ("KYBER", "MYTHIC")


def test_rank_40_is_recognized_without_accepting_41():
    assert rebirth_rank([token("Rank 40")]) == 40
    assert rebirth_rank([token("Rank 41")]) is None
    assert completed_rebirth([token("40", 180, 790)], 1000, 1000) == 40
    assert completed_rebirth([token("41", 180, 790)], 1000, 1000) is None
