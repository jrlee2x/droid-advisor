import json

from droid_advisor.base_map import SLOT_BY_ID, slot_counts
from droid_advisor.droid_catalog import droid_metadata, income_per_second, resolve_droid_by_rarity
from droid_advisor.inventory import InventoryLedger, SCHEMA_VERSION, UNASSIGNED
from droid_advisor.inventory_map import compact_income, inventory_card_colors
from droid_advisor.qualities import INVENTORY_RARITIES


def test_base_map_matches_v128_physical_slot_counts():
    counts = slot_counts()
    assert counts["worker_ring"] == 8
    assert counts["worker_walkway"] == 3
    assert counts["chip_station"] == 1
    assert counts["shipyard"] == 9
    assert counts["battle"] == 11
    assert counts["fusion"] == 3
    assert counts["lounge"] == 13
    assert counts["companions"] == 2
    assert len(SLOT_BY_ID) == 50


def test_inventory_migrates_legacy_aggregate_into_physical_units(tmp_path):
    path = tmp_path / "inventory.json"
    path.write_text(
        json.dumps(
            {
                "bb9": {
                    "droid": "BB9",
                    "quantity": 2,
                    "quality": "RAINBOW",
                    "source": "manual",
                    "updated_at": "2026-08-29T00:00:00+00:00",
                }
            }
        ),
        encoding="utf-8",
    )
    ledger = InventoryLedger(path)
    units = ledger.list_units()
    assert len(units) == 2
    assert all(unit.droid == "BB9" and unit.finish == "RAINBOW" for unit in units)
    ledger.save()
    saved = json.loads(path.read_text(encoding="utf-8"))
    assert saved["schema_version"] == SCHEMA_VERSION
    assert len(saved["units"]) == 2


def test_duplicate_variants_remain_individual_and_aggregate_to_best_finish(tmp_path):
    ledger = InventoryLedger(tmp_path / "inventory.json")
    first = ledger.add_unit("CB", "DIAMOND", rarity="COMMON", role="ASTRO")
    second = ledger.add_unit("CB", "RAINBOW", rarity="COMMON", role="ASTRO")
    assert first.id != second.id
    assert ledger.get("CB").quantity == 2
    assert ledger.get("CB").quality == "RAINBOW"


def test_drag_assignment_swaps_occupied_physical_slots(tmp_path):
    ledger = InventoryLedger(tmp_path / "inventory.json")
    first = ledger.add_unit("Gonk", role="WORKER", location="worker_ring", slot="worker_ring_1")
    second = ledger.add_unit("Mouse", role="WORKER", location="worker_ring", slot="worker_ring_2")
    ledger.move_unit(first.id, "worker_ring", "worker_ring_2", source="manual-map")
    assert ledger.unit(first.id).slot == "worker_ring_2"
    assert ledger.unit(second.id).slot == "worker_ring_1"


def test_drag_from_dock_to_fusion_and_undo(tmp_path):
    ledger = InventoryLedger(tmp_path / "inventory.json")
    unit = ledger.add_unit("CB", "DIAMOND", rarity="COMMON", role="ASTRO")
    assert unit.location == UNASSIGNED
    ledger.move_unit(unit.id, "fusion", "fusion_1", source="manual-map")
    assert ledger.unit(unit.id).slot == "fusion_1"
    undone = ledger.undo_last()
    assert undone.action == "move"
    assert ledger.unit(unit.id).location == UNASSIGNED
    assert ledger.unit(unit.id).slot == ""


def test_owned_card_confirmation_never_invents_identical_duplicates(tmp_path):
    ledger = InventoryLedger(tmp_path / "inventory.json")
    first, created = ledger.ensure_seen(
        "NAV-EX", "DIAMOND", rarity="RARE", role="BATTLE", confidence=0.92
    )
    repeated, repeated_created = ledger.ensure_seen(
        "NAV-EX", "DIAMOND", rarity="RARE", role="BATTLE", confidence=0.95
    )
    assert created is True
    assert repeated_created is False
    assert repeated.id == first.id
    assert ledger.get("NAV-EX").quantity == 1


def test_catalog_populates_role_rarity_and_native_income():
    nav = droid_metadata("NAV-EX")
    assert nav.role == "BATTLE"
    assert nav.rarity == "RARE"
    assert income_per_second("NAV-EX", "DIAMOND") == 72
    assert income_per_second("DRFT-R", "DIAMOND") == 23_200


def test_card_rarity_disambiguates_mouse_from_snow_mouse():
    assert resolve_droid_by_rarity("MOUSE", "MYTHIC") == "Snow Mouse"
    assert resolve_droid_by_rarity("MOUSE", "COMMON") == "Mouse"
    assert resolve_droid_by_rarity("MOUSE", None) == "MOUSE"


def test_card_rarity_keeps_ambiguous_nested_match_unchanged():
    assert resolve_droid_by_rarity("RIC", "MYTHIC") == "RIC"


def test_iconic_droids_are_first_class_inventory_options():
    c3po = droid_metadata("C-3PO")
    assert c3po is not None
    assert c3po.kind == "ICONIC"
    assert c3po.role == "WORKER"
    assert c3po.rarity == "ICONIC"
    assert c3po.perk == "2x Droid Sell Value"
    assert "ICONIC" in INVENTORY_RARITIES

    d_o = droid_metadata("D-O")
    assert d_o is not None
    assert d_o.kind == "ICONIC"
    assert d_o.role == "WORKER"
    assert d_o.rarity == "ICONIC"
    assert d_o.perk == "Half Fusion Time"


def test_iconic_inventory_card_uses_gold_badge_treatment(tmp_path):
    ledger = InventoryLedger(tmp_path / "inventory.json")
    unit = ledger.add_unit("C-3PO", rarity="ICONIC", role="WORKER")
    assert inventory_card_colors(unit) == ("#7f91a8", "#53f57b", "#ffd36a")


def test_inventory_card_visuals_encode_finish_role_and_rarity(tmp_path):
    ledger = InventoryLedger(tmp_path / "inventory.json")
    unit = ledger.add_unit(
        "NAV-EX", "DIAMOND", rarity="RARE", role="BATTLE", income_per_second=72
    )
    assert inventory_card_colors(unit) == ("#34d8ed", "#ff4c64", "#38a9ff")


def test_inventory_card_visuals_have_safe_fallbacks(tmp_path):
    ledger = InventoryLedger(tmp_path / "inventory.json")
    unit = ledger.add_unit("Mystery", "BASE")
    finish, role, rarity = inventory_card_colors(unit)
    assert finish == "#7f91a8"
    assert role == "#32b7ff"
    assert rarity == "#62738f"


def test_inventory_card_income_is_compact_and_readable():
    assert compact_income(None) == "INCOME UNKNOWN"
    assert compact_income(552) == "552/s"
    assert compact_income(23_200) == "23.2K/s"
    assert compact_income(1_120_000) == "1.1M/s"
