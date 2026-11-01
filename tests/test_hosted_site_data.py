"""Keep the published reference data aligned with reviewed game requirements."""

import json
from pathlib import Path

from droid_advisor.droid_catalog import CATALOG, income_per_second
from droid_advisor.engine import canonical
from droid_advisor.qualities import QUALITY_ORDER

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "rebirth-chart-site" / "assets"


def test_hosted_path_six_last_use_and_finishes_match_reviewed_reference():
    reference = json.loads((ROOT / "tests/fixtures/path6-v1.35.json").read_text())["requirements"]
    payload = json.loads((ASSETS / "rebirth-quick-lists.json").read_text())
    assert set(payload) == {str(i) for i in range(1, 7)}
    records = {r["name"]: r for group in payload["6"].values() for r in group}
    expected = {}
    for rank, slots in reference.items():
        for slot in slots:
            old = expected.setdefault(slot["droid"], {"last": 0, "quality": "BASE"})
            old["last"] = max(old["last"], int(rank))
            if QUALITY_ORDER[slot["quality"]] > QUALITY_ORDER[old["quality"]]:
                old["quality"] = slot["quality"]
    assert set(records) == set(expected)
    for name, values in expected.items():
        assert records[name]["last"] == values["last"], name
        assert records[name]["quality"] == values["quality"], name


def test_hosted_income_roster_is_complete_and_matches_desktop_rates():
    payload = json.loads((ASSETS / "all-droid-income.json").read_text())
    assert {canonical(row["name"]) for row in payload["droids"]} == set(CATALOG)
    assert payload["totals"]["all"] == len(CATALOG) == 101
    assert sum(row["kind"] == "STANDARD" for row in payload["droids"]) == payload["totals"]["standard"] == 73
    assert sum(row["kind"] == "ICONIC" for row in payload["droids"]) == payload["totals"]["iconic"] == 11
    for row in payload["droids"]:
        if row["kind"] != "ICONIC":
            for finish, value in row["income_per_second"].items():
                assert value == income_per_second(row["name"], finish), (row["name"], finish)
