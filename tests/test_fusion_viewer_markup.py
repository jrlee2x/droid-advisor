from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class IdCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if "id" in attributes:
            self.ids.add(attributes["id"])


def test_fusion_chart_viewer_controls_are_present_and_wired():
    html = (ROOT / "rebirth-chart-site" / "fusion.html").read_text(encoding="utf-8")
    javascript = (ROOT / "rebirth-chart-site" / "fusion.js").read_text(encoding="utf-8")
    parser = IdCollector()
    parser.feed(html)

    expected_ids = {
        "fusion-impact-image",
        "open-impact-viewer",
        "chart-lightbox",
        "chart-lightbox-image",
        "chart-lightbox-viewport",
        "chart-lightbox-close",
        "chart-zoom-out",
        "chart-zoom-reset",
        "chart-zoom-in",
        "chart-zoom-label",
    }
    assert expected_ids <= parser.ids
    assert 'showModal()' in javascript
    assert 'setChartZoom(chartZoom + 0.25)' in javascript
    assert 'setChartZoom(chartZoom - 0.25)' in javascript
    assert 'event.key === "Enter" || event.key === " "' in javascript

