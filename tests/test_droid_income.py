from droid_advisor.build_all_droids_chart import all_droids_payload
from droid_advisor.droid_income import ICONIC_DROIDS, INCOME_VARIANTS, STANDARD_DROIDS
from droid_advisor.fusion_recipes import FUSION_RECIPES


def test_all_droid_roster_is_complete_and_unique():
    payload = all_droids_payload()
    names = [droid["name"] for droid in payload["droids"]]

    assert len(STANDARD_DROIDS) == 73
    assert len(FUSION_RECIPES) == 17
    assert len(ICONIC_DROIDS) == 11
    assert payload["totals"]["all"] == 101
    assert len(names) == len(set(names))


def test_fixed_income_rows_have_all_nine_variant_keys():
    payload = all_droids_payload()
    fixed_rows = [droid for droid in payload["droids"] if droid["kind"] != "ICONIC"]

    assert len(fixed_rows) == 90
    assert all(tuple(droid["income_per_second"]) == INCOME_VARIANTS for droid in fixed_rows)


def test_current_source_now_documents_previously_missing_rates():
    payload = all_droids_payload()
    missing = [
        (droid["name"], variant)
        for droid in payload["droids"]
        for variant, value in droid.get("income_per_second", {}).items()
        if value is None
    ]

    assert missing == []
    assert payload["totals"]["documented_fixed_values"] == 810
