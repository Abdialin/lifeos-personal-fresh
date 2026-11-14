"""V67 deployment readiness: verify that every HTML-referenced local JS/CSS asset is served.

Run from the repository root: python test_stage67_static_assets.py
Does not touch databases, user data, network connections, or deployment credentials.
"""
from __future__ import annotations
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HTML = ROOT / "index.html"
SERVER = ROOT / "server.py"
STATIC_ASSET = re.compile(r"""(?:src|href)=["']([^"'?#]+\.(?:js|css))["']""")
SAFE_NAME = re.compile(r"^[a-zA-Z0-9_.-]+\.(?:js|css)$")


def referenced_assets() -> set[str]:
    html = HTML.read_text(encoding="utf-8")
    return {asset for asset in STATIC_ASSET.findall(html) if not asset.startswith(("http:", "https:", "//"))}


class StaticRoutingTests(unittest.TestCase):
    def test_every_local_asset_exists(self):
        names = referenced_assets()
        self.assertGreaterEqual(len(names), 100, "Unexpectedly few LifeOS assets in index.html")
        missing = sorted(name for name in names if not (ROOT / name).is_file())
        self.assertEqual([], missing, f"Missing local JS/CSS files: {missing}")

    def test_every_local_asset_is_allowlisted(self):
        source = SERVER.read_text(encoding="utf-8")
        missing = sorted(name for name in referenced_assets() if f"'{name}'" not in source)
        self.assertEqual([], missing, f"Static assets would respond with 404: {missing}")

    def test_static_paths_are_safe_basename_only(self):
        unsafe = sorted(name for name in referenced_assets() if not SAFE_NAME.fullmatch(name))
        self.assertEqual([], unsafe, "Unsafe relative paths or external paths must not enter the static allowlist")

    def test_essential_recent_assets_are_referenced(self):
        names = referenced_assets()
        for suffix in ("personal_unified_activity_v53.js", "personal_activity_timeline_v54.js",
                       "personal_predictive_preview_v56.js", "personal_weekly_plan_review_v62.js",
                       "personal_alternative_ranking_v64.js", "personal_planning_validation_v65.js"):
            self.assertIn(suffix, names)

    def test_private_app_and_server_health_endpoint(self):
        source = SERVER.read_text(encoding="utf-8")
        self.assertIn("if path == '/healthz':", source)
        self.assertIn("if not self.private_access():", source)
        self.assertIn("self.send_header('X-Content-Type-Options', 'nosniff')", source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
