from droid_advisor.build_all_droids_chart import all_droids_payload
from droid_advisor.droid_income import ICONIC_DROIDS, INCOME_VARIANTS, STANDARD_DROIDS
from droid_advisor.fusion_recipes import FUSION_RECIPES


def test_all_droid_roster_is_complete_and_unique():
    payload = all_droids_payload()
    names = [droid["name"] for droid in payload["droids"]]

    assert len(STANDARD_DROIDS) == 62
    assert len(FUSION_RECIPES) == 17
    assert len(ICONIC_DROIDS) == 9
    assert payload["totals"]["all"] == 88
    assert len(names) == len(set(names))


def test_fixed_income_rows_have_all_seven_variant_keys():
    payload = all_droids_payload()
    fixed_rows = [droid for droid in payload["droids"] if droid["kind"] != "ICONIC"]

    assert len(fixed_rows) == 79
    assert all(tuple(droid["income_per_second"]) == INCOME_VARIANTS for droid in fixed_rows)


def test_only_r9_stellar_is_currently_undocumented():
    payload = all_droids_payload()
    missing = [
        (droid["name"], variant)
        for droid in payload["droids"]
        for variant, value in droid.get("income_per_second", {}).items()
        if value is None
    ]

    assert missing == [("R9", "STELLAR")]
    assert payload["totals"]["documented_fixed_values"] == 552
