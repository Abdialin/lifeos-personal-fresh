# Batch B — Live Tracking 2.0 (incremental)

Implemented: explicit Switch action beside each open session. Switching finishes only the chosen session and starts a linked replacement; other concurrent sessions continue unaffected. Supports switching from paused activities, retains historical segments, and writes SWITCH_OUT/SWITCH_IN events. A separate pure JS module supports isolated tests. Existing quick start remains Start Alongside.

Limitations: switch uses a browser prompt, not the final designed modal; linked activity categories, hierarchical subactivity metadata, richer correction history and offline/multi-device browser validation remain future work. Existing `edit` and pause/resume controls remain. No production deployments or migrations.

Verification: `node test_live_tracking_v2.cjs`, `python offline_tests.py`; existing suite may skip browser tests due to environment restrictions.
