from droid_advisor.build_fusion_profit_chart import fusion_profitability_payload


def comparison_for(payload, name):
    return next(comparison for comparison in payload["comparisons"] if comparison["output"] == name)


def test_fusion_profitability_covers_every_recipe_and_variant():
    payload = fusion_profitability_payload()

    assert payload["totals"]["recipes"] == 17
    assert payload["totals"]["variant_comparisons"] == 119
    assert len(payload["comparisons"]) == 17
    assert all(tuple(comparison["variants"]) == tuple(payload["variants"]) for comparison in payload["comparisons"])


def test_riv_3t_stellar_is_a_direct_income_loss():
    payload = fusion_profitability_payload()
    stellar = comparison_for(payload, "RIV-3T")["variants"]["STELLAR"]

    assert stellar["input_income_per_second"] == 2_262_500
    assert stellar["output_income_per_second"] == 1_050_000
    assert stellar["net_income_per_second"] == -1_212_500
    assert stellar["outcome"] == "loss"


def test_low_mo_stellar_is_a_direct_income_gain():
    payload = fusion_profitability_payload()
    stellar = comparison_for(payload, "LOW-MO")["variants"]["STELLAR"]

    assert stellar["input_income_per_second"] == 902_200
    assert stellar["output_income_per_second"] == 975_000
    assert stellar["net_income_per_second"] == 72_800
    assert stellar["outcome"] == "gain"


def test_only_btl_r_stellar_comparison_is_undocumented():
    payload = fusion_profitability_payload()
    missing = [
        (comparison["output"], variant)
        for comparison in payload["comparisons"]
        for variant, result in comparison["variants"].items()
        if result is None
    ]

    assert missing == [("BTL-R", "STELLAR")]
