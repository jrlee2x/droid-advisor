"""Shared menu paths and slow OCR must produce current, verified progress."""

import json
import queue
import threading
import time
from pathlib import Path
from unittest.mock import Mock

import pytest
from PIL import Image, ImageDraw, ImageFont

from droid_advisor import app as app_module
from droid_advisor.app import DroidAdvisorApp
from droid_advisor.cycles import CYCLES
from droid_advisor.engine import advise, detect_cycle, detect_rebirth_progress
from droid_advisor.qualities import quality_table
from droid_advisor.vision import OcrToken, rebirth_path, rebirth_visual_evidence


def token(text, x=20, y=20, confidence=.99):
    font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 22)
    width = max(10, round(font.getlength(text)))
    return OcrToken(text, confidence, ((x, y), (x + width, y), (x + width, y + 28), (x, y + 28)))


def menu():
    header = [token('Rank 10'), token('Ping: 7', 300)]
    requirements = [token(name, 320, y) for name, y in [
        ('SENATE HOVERCAM', 450), ('GROUNDMECH', 500), ('TRAK-R', 550)]]
    path = [token('PATH 3', 800)]
    frame = Image.new('RGB', (1000, 700), '#182018')
    draw = ImageDraw.Draw(frame)
    font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 22)
    for item in header + requirements + path:
        draw.text(item.box[0], item.text, font=font, fill='white', anchor='lt')
    return frame, header, requirements, path


@pytest.mark.parametrize('text,expected', [('PATH 3', 3), ('Path6', 6), ('PATH 7', None),
                                         ('Rank 3', None), ('263', None), ('PATH 3 PATH 4', None)])
def test_path_label_is_explicit_and_unambiguous(text, expected):
    assert rebirth_path([token(text)]) == expected
    assert rebirth_path([token(text, confidence=.4)]) is None


def test_shared_rank_ten_triple_requires_path():
    names = {'SENATE HOVERCAM', 'GROUNDMECH', 'TRAK-R'}
    assert detect_cycle(names) is None
    assert detect_rebirth_progress(names, 10) is None
    assert detect_rebirth_progress(names, 10, 3) == (3, 10)
    assert detect_rebirth_progress(names, 10, 4) == (4, 10)
    assert detect_rebirth_progress(names, 10, 6) is None
    assert detect_rebirth_progress(names, 11, 3) is None
    assert detect_rebirth_progress({'GROUNDMECH', 'TRAK-R'}, 10, 3) is None


def test_visual_progress_proof_ignores_world_animation_and_ping_but_tracks_all_menu_labels():
    frame, header, requirements, path = menu()
    proof = rebirth_visual_evidence(frame, frame, 'full', header, requirements, path)
    animated = frame.copy()
    ImageDraw.Draw(animated).rectangle((0, 200, 999, 300), fill='purple')
    ImageDraw.Draw(animated).rectangle((300, 10, 450, 60), fill='yellow')
    assert proof.matches(animated)
    for item in [header[0], *requirements, path[0]]:
        changed = frame.copy()
        ImageDraw.Draw(changed).rectangle((*item.box[0], *item.box[2]), fill='black')
        assert not proof.matches(changed), item.text
    assert not proof.matches(None)
    assert not proof.matches(Image.new('RGB', frame.size))


@pytest.mark.parametrize('failure', [None, 'closed', 'changed_rank', 'changed_path', 'changed_requirement',
                                   'expired', 'paused', 'changed_config', 'capture_stalled'])
def test_monitor_accepts_slow_unchanged_menu_and_rejects_stale_context(monkeypatch, failure):
    frame, header, requirements, path = menu()
    app = DroidAdvisorApp.__new__(DroidAdvisorApp)
    app.config = {'cycle': 1, 'completed_rebirth': 0, 'paused': False, 'interval_seconds': 1.25}
    app.events = queue.Queue()
    app.frame_lock = threading.Lock()
    app.frame_number = 0
    app.latest_frame = None
    app.capture_exclusions_ok = True
    app.preferred_ui_region = None
    app.ui_fallback_index = 0
    app.interaction_probe_active = False
    app.last_interaction_probe_at = 0.0
    app.interaction_fallback_index = 0
    app.diagnostics = Mock()
    app._clear_advice = Mock()
    app.stop_event = Mock()
    app.stop_event.is_set.side_effect = [False, True]
    app._publish_frame(frame)
    # The OCR snapshot is older than the strict 2.5-second allowance.
    app.frame_captured_at = time.monotonic() - (13 if failure == 'expired' else 3.4)
    calls = []

    def read(*args, **kwargs):
        calls.append(1)
        if len(calls) == 1:
            return header
        if len(calls) == 2:
            return requirements
        current = frame.copy()
        changed = {'changed_rank': header[0], 'changed_path': path[0],
                   'changed_requirement': requirements[0]}.get(failure)
        if changed:
            ImageDraw.Draw(current).rectangle((*changed.box[0], *changed.box[2]), fill='black')
        app._publish_frame(None if failure == 'closed' else current)
        if failure == 'paused':
            app.config['paused'] = True
        if failure == 'changed_config':
            app.config['cycle'] = 2
        if failure == 'capture_stalled':
            app.frame_captured_at = time.monotonic() - 4
        return path

    monkeypatch.setattr(app_module, 'OfflineOcr', Mock())
    monkeypatch.setattr(app_module, 'visual_gates', lambda image: (False, True, False))
    monkeypatch.setattr(app_module, 'read_region', read)
    save = Mock()
    monkeypatch.setattr(app_module, 'save_config', save)
    app._monitor()
    assert len(calls) == 3
    if failure is None:
        assert (app.config['cycle'], app.config['completed_rebirth']) == (3, 9)
        save.assert_called_once()
    else:
        save.assert_not_called()


def test_every_revised_path_six_requirement_and_last_use_matches_reviewed_reference():
    reference = json.loads((Path(__file__).parent / 'fixtures/path6-v1.35.json').read_text())['requirements']
    assert len(reference) == len(CYCLES[6]) == 40
    for rank, slots in reference.items():
        assert CYCLES[6][int(rank) - 1] == tuple(slot['droid'] for slot in slots)
        assert quality_table()['6'][rank] == [slot['quality'] for slot in slots]
    for name in {slot['droid'] for slots in reference.values() for slot in slots}:
        last = max(int(rank) for rank, slots in reference.items() if any(s['droid'] == name for s in slots))
        assert not advise(6, last - 1, name).safe_to_sell
        assert advise(6, last, name).safe_to_sell
