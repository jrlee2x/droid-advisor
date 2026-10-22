"""Slow OCR must remain usable without carrying a previous title forward."""

import pytest
import threading
from unittest.mock import Mock
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

from droid_advisor.advice_state import AdviceTicket, FrameEvidence, TextPatch, VisualEvidence, evidence_is_current
from droid_advisor.app import DroidAdvisorApp
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
@pytest.mark.parametrize("mode", ["fixed", "white", "adaptive"])
def test_changed_title_and_closed_card_fail_pixel_validation(name, mode):
    frame = title_image(name)
    guard = VisualEvidence(frame.size, (TextPatch.capture(frame, (0, 0, 700, 70), white_text=mode == "white", adaptive_threshold=mode == "adaptive"),))
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


@pytest.mark.parametrize("dark_text", [False, True])
def test_badge_and_control_lettering_survives_fill_brightness_changes(dark_text):
    from droid_advisor.vision import card_controls_visual_evidence
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 28)

    def frame(background, *, name="R4", badge="RARE", button="CUSTOMIZE"):
        image = Image.new("RGB", (700, 300), (background,) * 3)
        draw = ImageDraw.Draw(image)
        draw.rectangle((0, 0, 420, 60), fill="#101820")
        tokens = []
        for text, xy, fill in [(name, (20, 15), "white"), (badge, (20, 80), (20 if dark_text else 230,) * 3),
                               (button, (450, 80), (20 if dark_text else 230,) * 3),
                               ("SWAP", (450, 150), (20 if dark_text else 230,) * 3),
                               ("SELL", (450, 220), (20 if dark_text else 230,) * 3)]:
            draw.text(xy, text, font=font, fill=fill, anchor="lt")
            left, top, right, bottom = draw.textbbox(xy, text, font=font, anchor="lt")
            tokens.append(OcrToken(text, .99, ((left, top), (right, top), (right, bottom), (left, bottom))))
        return image, tokens

    first, tokens = frame(160 if dark_text else 30)
    controls = tokens[2:]
    control_proof = card_controls_visual_evidence(first, first, "full", controls)
    proof = identity_visual_evidence(first, first, "full", (0, 0, 400, 120), tokens[:2], controls)
    assert len(proof.patches) == 5
    for background in ([180, 210] if dark_text else [45, 75]):
        changed_fill, _ = frame(background)
        assert control_proof.matches(changed_fill)
        assert proof.matches(changed_fill)
    assert control_proof.matches(ImageEnhance.Brightness(first).enhance(.8))
    for changes in [{"name": "R2"}, {"badge": "EPIC"}, {"button": "LOUNGE"}, {"badge": ""}]:
        changed, _ = frame(180 if dark_text else 45, **changes)
        assert not proof.matches(changed)

    app = DroidAdvisorApp.__new__(DroidAdvisorApp)
    app.config = {"cycle": 3, "completed_rebirth": 10, "paused": False, "interval_seconds": 1.25}
    app.frame_lock = threading.Lock()
    app.frame_number = 0
    app.capture_exclusions_ok = True
    app.diagnostics = Mock()
    app.overlay = Mock()
    app.overlay_source = "card"
    app._publish_frame(first)
    evidence = FrameEvidence(app.frame_number, app.frame_captured_at, 3, 10, proof)
    app.displayed_advice = AdviceTicket(evidence, "card", "R4: SAFE TO SELL: LAST NEEDED AT RB9", "green")
    app._publish_frame(frame(180 if dark_text else 45)[0])
    app._hide_expired_advice()
    app.overlay.withdraw.assert_not_called()
    app._publish_frame(frame(180 if dark_text else 45, badge="EPIC")[0])
    app._hide_expired_advice()
    app.overlay.withdraw.assert_called_once()
    details = app.diagnostics.set.call_args_list[-2].kwargs["last_advice_clear_visual_details"]
    assert details and details[0]["index"] == 1
    assert details[0]["changed"] > details[0]["tolerance"]


def test_visual_guard_includes_a_title_split_into_single_characters():
    frame = title_image("R2")
    tokens = [OcrToken(text, .99, ((x, 5), (x + 25, 5), (x + 25, 45), (x, 45)))
              for text, x in [("R", 5), ("2", 30)]]
    button = OcrToken("SELL", .99, ((5, 60), (60, 60), (60, 80), (5, 80)))
    guard = identity_visual_evidence(frame, frame, "full", (0, 0, 700, 90), tokens, [button])
    assert len(guard.patches) == 3
    assert not guard.patches[0].matches(title_image("KT"))
    assert not identity_visual_evidence(frame, frame, "full", (0, 0, 700, 90), tokens, []).patches


def test_rarity_guard_tracks_badge_without_neighboring_animated_artwork():
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 28)
    title_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 42)

    def draw_token(draw, text, xy, font, fill="white"):
        draw.text(xy, text, font=font, fill=fill, anchor="lt")
        left, top, right, bottom = draw.textbbox(xy, text, font=font, anchor="lt")
        return OcrToken(text, .99, ((left, top), (right, top), (right, bottom), (left, bottom)))

    frame = Image.new("RGB", (700, 240), "#101820")
    draw = ImageDraw.Draw(frame)
    title = draw_token(draw, "R4", (20, 10), title_font)
    rarity = draw_token(draw, "RARE", (120, 75), font, fill="#60a0ff")
    controls = [draw_token(draw, word, (550, y), font) for word, y in [("WORK", 100), ("LOUNGE", 145), ("SELL", 190)]]
    proof = identity_visual_evidence(frame, frame, "full", (0, 0, 400, 110), [title, rarity], controls)
    assert len(proof.patches) == 5 and proof.matches(frame)
    animated = frame.copy()
    right = round(max(x for x, _ in rarity.box))
    top = round(min(y for _, y in rarity.box))
    bottom = round(max(y for _, y in rarity.box))
    ImageDraw.Draw(animated).rectangle((right + 8, top, right + 36, bottom), fill="#f0e030")
    assert proof.matches(animated)

    changed_badge = frame.copy()
    ImageDraw.Draw(changed_badge).rectangle((110, 65, right + 45, 110), fill="#101820")
    ImageDraw.Draw(changed_badge).text((120, 75), "EPIC", font=font, fill="#b060f0", anchor="lt")
    assert not proof.matches(changed_badge)
    changed_title = frame.copy()
    ImageDraw.Draw(changed_title).rectangle((10, 0, 130, 65), fill="#101820")
    ImageDraw.Draw(changed_title).text((20, 10), "R2", font=title_font, fill="white", anchor="lt")
    assert not proof.matches(changed_title)

    # Exercise the real banner lifetime check: a new animated frame must
    # keep the verified banner, but a changed badge must still remove it.
    app = DroidAdvisorApp.__new__(DroidAdvisorApp)
    app.config = {"cycle": 3, "completed_rebirth": 10, "paused": False, "interval_seconds": 1.25}
    app.frame_lock = threading.Lock()
    app.frame_number = 0
    app.capture_exclusions_ok = True
    app.diagnostics = Mock()
    app.overlay = Mock()
    app.overlay_source = "card"
    app._publish_frame(frame)
    evidence = FrameEvidence(app.frame_number, app.frame_captured_at, 3, 10, proof)
    app.displayed_advice = AdviceTicket(evidence, "card", "R4: SAFE TO SELL: LAST NEEDED AT RB9", "green")
    app._publish_frame(animated)
    app._hide_expired_advice()
    app.overlay.withdraw.assert_not_called()
    assert app.displayed_advice is not None
    app._publish_frame(changed_badge)
    app._hide_expired_advice()
    app.overlay.withdraw.assert_called_once()
    assert app.displayed_advice is None


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
