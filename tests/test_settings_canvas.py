import json
import tomllib
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class IdCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if attributes.get("id"):
            self.ids.add(attributes["id"])


class SettingsCanvasTests(unittest.TestCase):
    def test_preview_controls_and_existing_project_type_controls_are_present(self):
        parser = IdCollector()
        parser.feed((ROOT / "settings.html").read_text(encoding="utf-8"))

        self.assertTrue(
            {"add-type", "type-list", "type-modal", "canvas-sync", "canvas-status", "canvas-preview"}
            <= parser.ids
        )

    def test_frontend_fetches_preview_without_using_local_storage(self):
        source = (ROOT / "js" / "settings.js").read_text(encoding="utf-8")
        canvas_source = source[source.index("function formatCanvasDueDate") :]

        self.assertIn("fetch('/api/canvas_sync'", canvas_source)
        self.assertIn("new Intl.DateTimeFormat('ko-KR'", canvas_source)
        self.assertIn("document.createElement('input')", canvas_source)
        self.assertNotIn("localStorage", canvas_source)

    def test_vercel_uses_file_based_api_routing(self):
        config = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
        with (ROOT / "pyproject.toml").open("rb") as file:
            pyproject = tomllib.load(file)

        self.assertNotIn("functions", config)
        self.assertNotIn("rewrites", config)
        self.assertEqual(pyproject["project"]["name"], "projectflow")
        self.assertIn("requests>=2.32.0,<3", pyproject["project"]["dependencies"])
        self.assertEqual(pyproject["tool"]["vercel"]["entrypoint"], "api.index:handler")


if __name__ == "__main__":
    unittest.main()
