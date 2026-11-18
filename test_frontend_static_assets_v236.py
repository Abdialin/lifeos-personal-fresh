"""Check every linked local JS/CSS asset exists and is statically served."""
import re
from pathlib import Path

root = Path(__file__).resolve().parent
html = (root / "index.html").read_text(encoding="utf-8")
server = (root / "server.py").read_text(encoding="utf-8")
links = re.findall('(?:src|href)="([^"]+)"', html)
assets = {link.split("?")[0].split("#")[0].lstrip("/") for link in links
          if link.split("?")[0].endswith((".js", ".css")) and "://" not in link}
assert len(assets) > 100, "Missing expected frontend dependencies"
missing_files = [p for p in sorted(assets) if not (root / p).is_file()]
missing_routes = [p for p in sorted(assets) if repr(p) not in server]
assert not missing_files, f"Missing frontend files: {missing_files}"
assert not missing_routes, f"Assets missing from server static routes: {missing_routes}"
for required in ("personal_fresh_device_adoption_v234.js",
                 "personal_native_backup_v234.js",
                 "personal_android_first_run_v233.css",
                 "personal_android_first_run_v233.js"):
    assert required in assets, f"Required frontend dependency not linked: {required}"
    assert repr(required) in server, f"Required dependency not served: {required}"
print(f"PASS: {len(assets)} linked JS/CSS assets exist and are served")
