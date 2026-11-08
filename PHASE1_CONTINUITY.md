# Phase 1 — interruption and reminder continuity

Adds `personal_continuity.js`, a pure read-only inspection and notification candidate layer:
- Resume checks flag stale or malformed running sessions without silently ending or editing them.
- Reminder candidates distinguish upcoming, due, and missed plans and respect dismissals and snoozes.
- Stable per-phase keys and immutable delivered-key helpers allow a caller to avoid repeat notifications.
- The module is intentionally not a background service worker, notification permission workflow, offline write queue, or multi-device reconciliation mechanism. Those require browser/device integration and live testing.
- All decisions require user review before modifying activity history or calendar plans.

Run `node test_personal_continuity.cjs`.
