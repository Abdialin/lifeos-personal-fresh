"""V67 optional live HTTP smoke test. Read-only.

Example:
  LIFEOS_TEST_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com \
  LIFEOS_TEST_USERNAME=... LIFEOS_TEST_PASSWORD=... \
  python test_stage67_live_http.py

No credentials or URL -> exits successfully with SKIPPED.
Never prints credentials. Never writes user data.
"""
import base64
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

base = os.getenv("LIFEOS_TEST_BASE_URL", "").strip().rstrip("/")
username = os.getenv("LIFEOS_TEST_USERNAME", "")
password = os.getenv("LIFEOS_TEST_PASSWORD", "")
if not base:
    print("SKIPPED: LIFEOS_TEST_BASE_URL is not configured.")
    sys.exit(0)
if not base.startswith("https://"):
    print("ERROR: Live smoke testing requires an HTTPS URL.")
    sys.exit(2)
if not username or not password:
    print("SKIPPED: LIFEOS_TEST_USERNAME / LIFEOS_TEST_PASSWORD are not configured.")
    sys.exit(0)

credential = base64.b64encode(f"{username}:{password}".encode()).decode()
headers = {"Authorization": f"Basic {credential}", "Cache-Control": "no-cache"}
routes = {
    "/healthz": "application/json",
    "/index.html": "text/html",
    "/personal_unified_activity_v53.js": "application/javascript",
    "/personal_activity_timeline_v54.css": "text/css",
    "/personal_weekly_plan_review_v62.js": "application/javascript",
    "/personal_alternative_ranking_v64.css": "text/css",
    "/personal_planning_validation_v65.js": "application/javascript",
}

passed = 0
for route, content_type in routes.items():
    request = Request(base + route, headers=headers)
    try:
        with urlopen(request, timeout=15) as response:
            kind = response.headers.get("Content-Type", "")
            blob = response.read(2048)
            if response.status != 200 or content_type not in kind or not blob:
                raise RuntimeError(f"status={response.status}, content-type={kind}, bytes={len(blob)}")
            print(f"PASS: {route} ({response.status}, {kind})")
            passed += 1
    except (HTTPError, URLError, RuntimeError) as exc:
        print(f"FAIL: {route} ({type(exc).__name__})")
        sys.exit(1)

print(f"PASS: {passed}/{len(routes)} live HTTP endpoints; no state changes attempted.")
