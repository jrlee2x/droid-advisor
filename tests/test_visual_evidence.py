"""Slow OCR must remain usable without carrying a previous title forward."""

import pytest
from PIL import Image, ImageDraw, ImageFont

from droid_advisor.advice_state import FrameEvidence, TextPatch, VisualEvidence, evidence_is_current
from droid_advisor.droid_catalog import CATALOG
from droid_advisor.engine import advise, canonical
from droid_advisor.cycles import CYCLES, next_cycle
from droid_advisor.qualities import quality_table
from droid_advisor.vision import OcrToken, identity_visual_evidence


def title_image(name):
    image = Image.new("RGB", (700, 90), "#202030")
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 36)
    draw.text((5, 5), name, font=font, fill="white")
    return image


@pytest.mark.parametrize("name", [metadata.name for metadata in CATALOG.values()])
@pytest.mark.parametrize("white_text", [False, True])
def test_changed_title_and_closed_card_fail_pixel_validation(name, white_text):
    frame = title_image(name)
    guard = VisualEvidence(frame.size, (TextPatch.capture(frame, (0, 0, 700, 70), white_text=white_text),))
    assert guard.matches(frame.copy())
    assert not guard.matches(None)
    assert not guard.matches(Image.new("RGB", frame.size))
    for metadata in CATALOG.values():
        if canonical(metadata.name) != canonical(name):
            assert not guard.matches(title_image(metadata.name)), (name, metadata.name)


def test_slow_scan_requires_current_visual_proof():
    evidence = FrameEvidence(1, 10, 2, 35)
    assert not evidence_is_current(evidence, 4, 13.4, 2, 35, False, True)
    assert evidence_is_current(evidence, 4, 13.4, 2, 35, False, True, True)
    assert not evidence_is_current(evidence, 4, 23, 2, 35, False, True, True)
    assert not evidence_is_current(evidence, 4, 13.4, 2, 35, True, True, True)
    assert not evidence_is_current(evidence, 4, 13.4, 3, 35, False, True, True)
    assert not evidence_is_current(evidence, 4, 13.4, 2, 35, False, False, True)


def test_white_title_survives_moving_artwork_but_not_a_different_name():
    def frame(name, model_x):
        image = title_image(name)
        # Moving midtone artwork beside the white title, as on Stellar R6.
        ImageDraw.Draw(image).rectangle((model_x, 0, model_x + 180, 65), fill=(190, 170, 130))
        return image
    first = frame("R6", 150)
    moved = frame("R6", 190)
    guard = TextPatch.capture(first, (0, 0, 700, 70), white_text=True)
    assert guard.matches(moved)
    assert not guard.matches(frame("R2", 190))
    assert not guard.matches(frame("R9", 190))
    assert not guard.matches(frame("", 190))


def test_visual_guard_includes_a_title_split_into_single_characters():
    frame = title_image("R2")
    tokens = [OcrToken(text, .99, ((x, 5), (x + 25, 5), (x + 25, 45), (x, 45)))
              for text, x in [("R", 5), ("2", 30)]]
    button = OcrToken("SELL", .99, ((5, 60), (60, 60), (60, 80), (5, 80)))
    guard = identity_visual_evidence(frame, frame, "full", (0, 0, 700, 90), tokens, [button])
    assert len(guard.patches) == 3
    assert not guard.patches[0].matches(title_image("KT"))
    assert not identity_visual_evidence(frame, frame, "full", (0, 0, 700, 90), tokens, []).patches


def test_revised_path_six_uses_its_own_finishes_and_keeps_kt_through_rank_38():
    assert next_cycle(5) == 6 and next_cycle(6) == 1
    assert len(CYCLES[6]) == 40
    assert [i for i, row in enumerate(CYCLES[6], 1) if "KT" in row] == [7, 13, 15, 18, 22, 29, 33, 38]
    assert advise(6, 28, "KT", "GOLD").next_required_quality == "GALACTIC"
    assert not advise(6, 37, "KT").safe_to_sell
    assert advise(6, 38, "KT").safe_to_sell
    assert CYCLES[6][-1] == ("PLNK", "ECG", "DRFT-R")
    assert quality_table()["6"]["40"] == ["KYBER"] * 3
    assert quality_table()["6"]["9"] == ["DIAMOND", "GOLD", "GOLD"]
