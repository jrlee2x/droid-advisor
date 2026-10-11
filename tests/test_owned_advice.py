"""Regressions for an R2 sell banner leaking onto another owned droid."""

import queue
import threading
import time
from itertools import product
from dataclasses import replace
from unittest.mock import Mock

import pytest
from PIL import Image

from droid_advisor import app as app_module
from droid_advisor.app import DroidAdvisorApp
from droid_advisor.vision import OcrToken, owned_droid, blueprint_droid, focused_identity, blueprint_details, visible_droids
from droid_advisor.engine import ALL_DROIDS, advise, canonical
from droid_advisor.cycles import CYCLES
from droid_advisor.droid_catalog import CATALOG, droid_metadata
from droid_advisor.advice_state import AdviceTicket, FrameEvidence, MAX_ADVICE_AGE
from droid_advisor.advice_state import TextPatch, VisualEvidence


def token(text, x=100, y=100, confidence=0.99):
    return OcrToken(text, confidence, ((x, y), (x + 60, y), (x + 60, y + 20), (x, y + 20)))


@pytest.mark.parametrize("text", ["R2", "R4", "IG", "GROUND MEC", "GROUND-MEC", "GROUNDMECH"])
def test_complete_focused_title_is_accepted(text):
    expected = "GROUNDMECH" if text.startswith("GROUND") else text
    assert owned_droid([token(text), token("COMMON", y=155)]) == (expected, 0.99)


@pytest.mark.parametrize("text", ["Rank R2", "R2: SAFE TO SELL", "WORKER2", "R", "???"])
def test_partial_titles_and_unrelated_short_name_substrings_are_not_identification(text):
    assert owned_droid([token(text)]) == (None, 0.0)


def test_split_advisor_banner_cannot_vote_for_r2():
    tokens = [token("R2:"), token("SAFE TO", x=200), token("SELL: LAST NEEDED AT RB22", x=300)]
    assert owned_droid(tokens) == (None, 0.0)
    assert owned_droid(tokens + [token("GROUNDMECH", y=160)]) == ("GROUNDMECH", 0.99)


def test_two_different_droid_names_are_ambiguous_even_if_one_is_larger():
    big_r2 = replace(token("R2"), box=((100, 100), (200, 100), (200, 145), (100, 145)))
    assert owned_droid([big_r2, token("GROUNDMECH", y=200)]) == (None, 0.0)


def test_split_snow_mouse_does_not_become_mouse():
    assert owned_droid([token("SNOW"), token("MOUSE", x=180)]) == ("SNOW MOUSE", 0.99)


def test_tall_r6_title_does_not_merge_with_event_multiplier_above_it():
    # Actual R6 scan: the small event label ends where the tall title starts.
    event = OcrToken("2X", .795, ((11, 66), (42, 66), (42, 80), (11, 80)))
    title = OcrToken("R6", .995, ((324, 79), (494, 79), (494, 176), (324, 176)))
    badge = OcrToken("STELLAR EPIC", .91, ((322, 200), (598, 200), (598, 234), (322, 234)))
    assert focused_identity([event, title, badge]) == ("R6", .995, "STELLAR", "EPIC")


def test_low_confidence_ocr_does_not_become_certain_from_an_exact_string_match():
    assert owned_droid([token("R2", confidence=0.4)]) == (None, 0.0)


@pytest.fixture
def app():
    app = DroidAdvisorApp.__new__(DroidAdvisorApp)
    app.events = queue.Queue()
    app.stop_event = threading.Event()
    app.frame_lock = threading.Lock()
    app.frame_number = 0
    app.frame_captured_at = 0.0
    app.pending_frame_number = None
    app.latest_frame = None
    app.capture_exclusions_ok = True
    app.config = {"cycle": 4, "completed_rebirth": 34, "paused": False, "spawn_alerts_enabled": False}
    app.last_signature = None
    app.pending_signature = None
    app.pending_count = 0
    app.inventory = Mock()
    app.inventory.ensure_seen.return_value = (None, True)
    app.diagnostics = Mock()
    app.root = Mock()
    app.overlay = Mock()
    app.show_overlay = Mock()
    app.overlay_source = None
    app.displayed_advice = None
    return app


def events(app):
    result = []
    while not app.events.empty():
        result.append(app.events.get_nowait())
    return result


def scan(app, name, confidence=0.99, finish=None, rarity=None, source="card"):
    app._publish_frame(Image.new("RGB", (10, 10)))
    app._update_advice(name, confidence, finish, rarity, source=source)
    return events(app)


def confirm(app, name="R2", source="card"):
    assert scan(app, name, source=source) == [("advice_clear", None)]
    result = scan(app, name, source=source)
    assert len(result) == 1 and result[0][0] == "advice"
    return result[0][1]


@pytest.mark.parametrize("source", ["card", "blueprint"])
def test_switching_from_r2_removes_sell_message_before_new_title_is_confirmed(app, source):
    ticket = confirm(app, source=source)
    assert "R2" in ticket.message and "SAFE TO SELL" in ticket.message
    assert scan(app, "GROUNDMECH", source=source) == [("advice_clear", None)]
    result = scan(app, "GROUNDMECH", source=source)
    assert "GROUNDMECH" in result[0][1].message and "KEEP: NEEDED AT RB38" in result[0][1].message


@pytest.mark.parametrize("source", ["card", "blueprint"])
def test_unreadable_or_closed_card_clears_and_requires_fresh_confirmation(app, source):
    confirm(app, source=source)
    assert scan(app, None, source=source) == [("advice_clear", None)]
    confirm(app, source=source)


def test_alternating_names_and_weak_reads_never_authorize_a_sale(app):
    for name, confidence in [("R2", 0.99), ("R4", 0.99), ("R2", 0.99), ("R2", 0.4)]:
        assert all(kind != "advice" for kind, payload in scan(app, name, confidence))


def test_inventory_requires_confirmed_owned_identity_too(app):
    scan(app, "R2", finish="GOLD", rarity="EPIC")
    app.inventory.ensure_seen.assert_not_called()
    scan(app, None)
    scan(app, "GROUNDMECH", finish="KYBER", rarity="EPIC")
    app.inventory.ensure_seen.assert_not_called()
    scan(app, "GROUNDMECH", finish="KYBER", rarity="EPIC")
    assert app.inventory.ensure_seen.call_args.args[0] == "GROUNDMECH"
    app.inventory.reset_mock()
    scan(app, "R2", finish="GOLD", rarity="EPIC", source="blueprint")
    scan(app, "R2", finish="GOLD", rarity="EPIC", source="blueprint")
    app.inventory.ensure_seen.assert_not_called()


def test_confirmed_open_card_refreshes_from_each_verified_frame(app):
    confirm(app)
    assert scan(app, "R2")[0][0] == "advice"


@pytest.mark.parametrize("source", ["card", "blueprint"])
def test_monitor_does_not_fall_back_to_r2_when_focused_title_is_unreadable(app, monkeypatch, source):
    confirm(app, source=source)
    broad_tokens = [token("R2", x=200, y=350)] + (
        [token("TOSS BLUEPRINT ON CRAFTING STATION", x=400, y=800)] if source == "blueprint" else
        [token(label, x=650, y=y) for label, y in [("WORK", 450), ("SWAP", 600), ("SELL", 750)]]
    )
    ocr = Mock()
    ocr.read.return_value = []
    monkeypatch.setattr(app_module, "OfflineOcr", lambda: ocr)
    monkeypatch.setattr(app_module, "read_region", lambda *args, **kwargs: broad_tokens)
    monkeypatch.setattr(app_module, "visual_gates", lambda image: (source == "card", False, source == "blueprint"))
    app._publish_frame(Image.new("RGB", (1000, 1000)))
    app.preferred_ui_region = None
    app.stop_event = Mock()
    app.stop_event.is_set.side_effect = [False, True]
    app._monitor()
    assert events(app) == [("advice_clear", None)]
    ocr.read.assert_called_once()
    assert app.last_signature is None
    app.inventory.ensure_seen.assert_not_called()


@pytest.mark.parametrize("source,hidden", [("card", True), ("blueprint", True), (None, False)])
def test_clear_hides_both_advice_types_but_not_status(app, source, hidden):
    app.overlay_source = source
    app.events.put(("advice_clear", None))
    app._drain_events()
    assert app.overlay.withdraw.called is hidden


@pytest.mark.parametrize("reader", [owned_droid, blueprint_droid])
@pytest.mark.parametrize("name", [item.name for item in CATALOG.values()])
def test_every_catalog_title_has_its_own_identity(reader, name):
    read, confidence = reader([token(name)])
    assert canonical(read) == canonical(name)
    assert confidence == 0.99
    pieces = name.split()
    read, confidence = reader([token(part, x=100 + 85*i) for i, part in enumerate(pieces)])
    assert canonical(read) == canonical(name)
    assert reader([token(name, confidence=0.4)])[0] is None
    assert reader([token("UNKNOWN " + name)])[0] is None
    assert reader([token(name + ": SAFE TO SELL")])[0] is None


@pytest.mark.parametrize("reader", [owned_droid, blueprint_droid])
def test_all_pairs_of_different_droids_are_ambiguous(reader):
    names = [item.name for item in CATALOG.values()]
    for first, second in product(names, repeat=2):
        if first != second:
            assert reader([token(first), token(second, y=200)])[0] is None, (first, second)


@pytest.mark.parametrize("before_source,after_source", list(product(["card", "blueprint"], repeat=2)))
def test_every_supported_droid_transition_requires_its_own_confirmation(app, before_source, after_source):
    for before, after in product(ALL_DROIDS, repeat=2):
        if before == after:
            continue
        app._clear_advice()
        events(app)
        confirm(app, before, before_source)
        assert scan(app, after, source=after_source) == [("advice_clear", None)]
        ticket = scan(app, after, source=after_source)[0][1]
        assert ticket.source == after_source
        assert ticket.message.startswith(("BLUEPRINT " if after_source == "blueprint" else "") + after + ":")


@pytest.mark.parametrize("name,rarity,expected", [
    ("MOUSE", "COMMON", "MOUSE"), ("MOUSE", "MYTHIC", None),
    ("MOUSE", None, None), ("SNOW MOUSE", "MYTHIC", "SNOW MOUSE"),
    ("R2", "EPIC", "R2"), ("R2", "ICONIC", None),
    ("RIC", "MYTHIC", None), ("RIC-1200", "MYTHIC", "RIC-1200"),
    ("BB", "LEGENDARY", None), ("GROUNDMECH", "EPIC", "GROUNDMECH"),
])
def test_badges_disambiguate_without_renaming_droids(name, rarity, expected):
    tokens = [token(name)] + ([token(rarity, y=155)] if rarity else [])
    assert focused_identity(tokens)[0] == expected


def test_weak_prefix_and_conflicting_badges_do_not_become_a_shorter_droid():
    assert owned_droid([token("SNOW", confidence=0.4), token("MOUSE", x=180)])[0] is None
    assert owned_droid([token("SN0W"), token("MOUSE", x=180)])[0] is None
    assert focused_identity([token("R2"), token("EPIC", y=155), token("COMMON", y=190)])[0] is None
    assert blueprint_details([token("RARE", confidence=0.4)]) == (None, None)
    assert blueprint_details([token("RARE"), token("MYTHIC", y=160)]) == (None, None)
    assert blueprint_details([token("UNCOMMON")]) == (None, None)


@pytest.mark.parametrize("failure", ["new_frame", "lost_capture", "paused", "cycle", "rank", "expired", "exclusion_failed"])
def test_delayed_ticket_cannot_display_after_context_changes(app, failure):
    ticket = confirm(app)
    if failure == "new_frame":
        app._publish_frame(Image.new("RGB", (10, 10)))
    elif failure == "lost_capture":
        app._publish_frame(None)
    elif failure == "paused":
        app.config["paused"] = True
    elif failure == "cycle":
        app.config["cycle"] = 3
    elif failure == "rank":
        app.config["completed_rebirth"] = 0
    elif failure == "expired":
        ticket = replace(ticket, evidence=replace(ticket.evidence, captured_at=time.monotonic() - MAX_ADVICE_AGE - 1))
    else:
        app.capture_exclusions_ok = False
    app.events.put(("advice", ticket))
    app._drain_events()
    app.show_overlay.assert_not_called()
    app.displayed_advice = ticket
    app.overlay_source = ticket.source
    app._hide_expired_advice()
    app.overlay.withdraw.assert_called_once()


def test_new_current_ticket_is_displayed(app):
    ticket = confirm(app)
    app.events.put(("advice", ticket))
    app._drain_events()
    assert app.show_overlay.call_args.args[0] == ticket.message
    assert app.displayed_advice == ticket


def test_slow_confirmations_survive_skipped_captures_only_with_matching_pixels(app):
    from PIL import ImageDraw
    frame = Image.new("RGB", (100, 40), "black")
    ImageDraw.Draw(frame).text((8, 8), "AMP WALKER", fill="white")
    visual = VisualEvidence(frame.size, (TextPatch.capture(frame, (0, 0, 100, 40)),))
    for attempt in range(2):
        app._publish_frame(frame)
        evidence = replace(app._frame_evidence(), captured_at=time.monotonic() - 3.4, visual=visual)
        app._publish_frame(frame.copy())
        app._publish_frame(frame.copy())
        app._update_advice("AMP WALKER", .99, evidence=evidence)
    queued = events(app)
    ticket = next(payload for kind, payload in queued if kind == "advice")
    app.events.put(("advice", ticket))
    app._drain_events()
    app.show_overlay.assert_called_once()
    app._publish_frame(Image.new("RGB", frame.size))
    app._hide_expired_advice()
    app.overlay.withdraw.assert_called_once()


def test_matching_pixels_do_not_keep_advice_when_capture_stalls(app):
    from PIL import ImageDraw
    frame = Image.new("RGB", (100, 40), "black")
    ImageDraw.Draw(frame).text((8, 8), "R2", fill="white")
    app._publish_frame(frame)
    guard = VisualEvidence(frame.size, (TextPatch.capture(frame, (0, 0, 100, 40)),))
    evidence = replace(app._frame_evidence(), visual=guard)
    app.frame_captured_at -= 4
    assert not app._evidence_is_current(evidence)


def test_repeated_or_skipped_frame_is_not_two_confirmations(app):
    scan(app, "R2")
    app._update_advice("R2", 0.99)
    assert events(app) == []
    app._publish_frame(Image.new("RGB", (10, 10)))
    assert scan(app, "R2") == [("advice_clear", None)]
    assert scan(app, "R2")[0][0] == "advice"


def test_result_from_capture_replaced_during_ocr_cannot_update_inventory(app):
    scan(app, "R2", finish="GOLD", rarity="EPIC")
    old = app._frame_evidence()
    app._publish_frame(None)
    app._update_advice("R2", 0.99, "GOLD", "EPIC", evidence=old)
    assert events(app) == [("advice_clear", None)]
    app.inventory.ensure_seen.assert_not_called()


def test_unsupported_catalog_names_never_get_rebirth_sell_advice(app):
    supported = {canonical(name) for name in ALL_DROIDS}
    for name in ["not a droid"] + [item.name for key, item in CATALOG.items() if key not in supported]:
        for _ in range(2):
            assert scan(app, name) == [("advice_clear", None)]


def test_all_cycle_rank_droid_decisions_match_remaining_requirements():
    for cycle, rows in CYCLES.items():
        for completed in range(41):
            for name in ALL_DROIDS:
                future = [index for index, row in enumerate(rows, 1)
                          if index > completed and name in row]
                result = advise(cycle, completed, name)
                assert result.safe_to_sell == (not future), (cycle, completed, name)
                assert result.next_needed == (min(future) if future else None)


def test_progress_reader_does_not_invent_nested_names_or_accept_weak_reads():
    for name in ALL_DROIDS:
        assert visible_droids([token(name)]) == {name}
        assert visible_droids([token(name, confidence=0.4)]) == set()
        assert visible_droids([token("UNKNOWN " + name)]) == set()
    assert visible_droids([token("R2-D2"), token("BB-8"), token("IG-11 Marshal")]) == set()


@pytest.mark.parametrize("mode", ["valid", "header_mismatch", "ambiguous", "stale", "weak"])
def test_monitor_changes_progress_only_from_current_matching_header_and_unique_triple(app, monkeypatch, mode):
    confirm(app)
    app._publish_frame(Image.new("RGB", (1000, 1000)))
    app.preferred_ui_region = None
    app.stop_event = Mock()
    app.stop_event.is_set.side_effect = [False, True]
    app.ui_fallback_index = 0
    calls = []

    def read(*args, **kwargs):
        calls.append(1)
        if len(calls) == 1:
            return [token("Rank 26" if mode == "header_mismatch" else "Rank 27")]
        if mode == "stale":
            app._publish_frame(None)
        names = ["R4", "R5", "R8"] if mode == "ambiguous" else ["KX", "TRI-TEK", "SNOW MOUSE"]
        return [token(name, confidence=0.4 if mode == "weak" else 0.99) for name in names]

    monkeypatch.setattr(app_module, "OfflineOcr", Mock())
    monkeypatch.setattr(app_module, "read_region", read)
    monkeypatch.setattr(app_module, "visual_gates", lambda image: (False, True, False))
    save = Mock()
    monkeypatch.setattr(app_module, "save_config", save)
    app._monitor()
    assert len(calls) == 2
    assert app.last_signature is None
    if mode == "valid":
        assert (app.config["cycle"], app.config["completed_rebirth"]) == (1, 26)
        save.assert_called_once()
    else:
        assert (app.config["cycle"], app.config["completed_rebirth"]) == (4, 34)
        save.assert_not_called()
