import io
import unittest
from unittest.mock import Mock

from api.index import handler


class StaticEntrypointTests(unittest.TestCase):
    def serve(self, path):
        target = Mock()
        target.path = path
        target.wfile = io.BytesIO()
        target._path.side_effect = lambda: handler._path(target)
        target._send.side_effect = lambda status, body: setattr(target, "error", (status, body))
        handler._serve_static(target)
        return target

    def test_root_serves_the_dashboard_html(self):
        response = self.serve("/")

        response.send_response.assert_called_once_with(200)
        self.assertIn(b"ProjectFlow", response.wfile.getvalue())

    def test_login_page_is_available(self):
        response = self.serve("/login.html")

        response.send_response.assert_called_once_with(200)
        self.assertIn(b"ProjectFlow", response.wfile.getvalue())

    def test_javascript_asset_is_available(self):
        response = self.serve("/js/settings.js")

        response.send_response.assert_called_once_with(200)
        self.assertIn(b"canvas_sync", response.wfile.getvalue())

    def test_private_source_files_are_not_served(self):
        response = self.serve("/pyproject.toml")

        self.assertEqual(response.error[0], 404)

    def test_path_traversal_is_not_served(self):
        response = self.serve("/js/../../pyproject.toml")

        self.assertEqual(response.error[0], 404)


if __name__ == "__main__":
    unittest.main()
