# LifeOS Personal development instructions

Read `docs/DEVELOPMENT_STATUS.md`, `docs/DATA_INTEGRITY.md`, `docs/TESTING.md`, and the relevant `docs/design/` page before changing this project. The active development branch is `today-a-plus-rebuild`; verify its local and remote heads and preserve any uncommitted work.

- Preserve the approved Today Concept A+ and Track Concept A designs. Treat historical design files as context, not necessarily the active implementation.
- Keep the original Beta/production database, account history, recovery mechanisms, Android application IDs and signing keys safe. Never clear or migrate user data as part of a UI fix. Use intercepted browser fixtures or an explicitly isolated Preview test account.
- Work on one major section at a time. Critical Today corrections must be verified, and their focused device acceptance remains open. The user has since explicitly directed work to proceed on Plan and supplied its visual references, starting with Overview. Verify each Plan subsection before the next. New substantial visual designs need the user's approval; missing original mockups must be identified, not invented.
- Keep recorded, unique, overlap, unlogged and remaining time distinct. Preserve raw timestamps and pause segments; unknown time is not distraction.
- Run relevant regression and browser checks, report actual results, and distinguish browser evidence from native Samsung/Android verification. Do not create an APK for web-only fixes.
- Update the relevant status, design and testing documentation when behavior or evidence changes. Never commit private activity data, credentials, backups, tokens or signing material.
