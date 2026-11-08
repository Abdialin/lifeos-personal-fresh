#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
for f in test_*.cjs; do node "$f" >/dev/null; done
python -m unittest discover -q
python -m py_compile server.py atomic_calendar.py test_personal_browser_e2e.py
printf '\nLocal JS/Python verification completed. Live browser, PostgreSQL and OAuth require separate tests.\n'
