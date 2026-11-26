# Testing and evidence

All browser fixtures in `tests/today-v250*.cjs` and `scripts/capture-design-baselines.cjs` intercept requests: local repository assets are served to an isolated Preview-origin browser context, and other requests are blocked/fulfilled offline. They never need a real account or user history.

With Node and Playwright/Chromium installed, from the repository root:

```sh
node tests/today-a-plus-browser.cjs
node tests/today-a-plus-integration.cjs
node tests/today-v250.cjs
node tests/today-v250-colors.cjs
node tests/today-v250-precision.cjs
node tests/today-v250-volume.cjs
node scripts/capture-design-baselines.cjs
node test_goal_fitness_cross_section_v204.cjs
node test_unified_analytics.cjs
node test_tracking_recovery.cjs
node test_android_bridge_v231.cjs
node test_static_asset_routes.cjs
python3 test_frontend_static_assets_v236.py
```

The V250 tests cover selected map items, short intervals, full/partial/consecutive gap saves, invalid/stale boundaries, exact unedited millisecond endpoints, reload persistence, overlapping/overnight/paused records, explicit and ambiguous categories, representative Goals/Insights category paths, empty and 132-record states, 23/25-hour days, themes, six navigation sections and reduced browser heights. To recreate the synthetic high-volume image, run `LIFEOS_CAPTURE_VOLUME=1 node tests/today-v250-volume.cjs` and copy `today-verification/high-volume.png` to `docs/design/today/current/timeline-high-volume.png`.

GitHub workflows: `.github/workflows/preview-runtime.yml`, `today-a-plus-browser.yml`, `today-aplus-mobile-visual.yml`, and `today-presentation-check.yml`. The mobile workflow captures multiple widths and themes and checks geometry; screenshots are evidence, not automatic approval against a missing mockup. The visual library contains synthetic prior/current captures and comparison notes.

Browser tests cannot verify Samsung WebView system insets, native IME, gesture/three-button navigation, notifications, vibration, background execution or signing. Record those as device checks only after observing the actual device. Do not weaken time, persistence or geometry assertions to make CI pass.
