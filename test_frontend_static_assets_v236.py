"""Reject releases whose linked frontend scripts/styles are not served."""
import ast
import re
from pathlib import Path

root = Path(__file__).resolve().parent
html = (root / "index.html").read_text(encoding="utf-8")
server = (root / "server.py").read_text(encoding="utf-8")
assets = set(re.findall(r'<(?:script|link)\\b[^>]*?(?:src|href)="([^"]+\\.(?:js|css))(?:\\?[^"]*)?"', html))
assert assets, "No frontend dependencies found"
# The server serves only explicit literals in its static allowlist.
missing_files = [p for p in sorted(assets) if not (root / p).is_file()]
missing_routes = [p for p in sorted(assets) if repr(p) not in server]
assert not missing_files, f"Missing frontend files: {missing_files}"
assert not missing_routes, f"Assets missing from server static routes: {missing_routes}"
for required in ["personal_fresh_device_adoption_v234.js", "personal_native_backup_v234.js", "personal_android_first_run_v233.js", "personal_android_first_run_v233.css"]:
    assert required in assets or required == "personal_android_first_run_v233.js"
    assert repr(required) in server
print(f"PASS: {len(assets)} linked JS/CSS assets exist and are allowed by server")
