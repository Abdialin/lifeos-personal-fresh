# Preview and deployment

The isolated Preview service is `lifeos-today-aplus-preview`, linked to `Abdialin/lifeos-personal-fresh` branch `today-a-plus-rebuild` with automatic deployment on commit. Verify the remote branch before pushing; inspect the exact deploy commit and `live` status in Render, then check the workload. The sign-in page can be checked anonymously, but authenticated behavior requires the isolated Preview account.

The six-section app's current login is a shared workspace, so adding a second login or seeding it would not isolate records. `/account/register` belongs to the separate beta dashboard and does not authenticate the six-section app. Local authenticated testing now uses an independently created temporary server, credentials and SQLite database; it does not prove signed-in behavior on Render. A truly isolated deployed-account check needs a separate disposable service/database or a reviewed per-account workspace implementation. Do not upload the synthetic fixture to the existing shared Preview workspace.

Useful read-only checks after a push:

```sh
git rev-parse HEAD
git ls-remote origin refs/heads/today-a-plus-rebuild
gh run list --repo Abdialin/lifeos-personal-fresh --branch today-a-plus-rebuild --commit "$(git rev-parse HEAD)"
```

On 26 November 2026 the Preview service reported SQLite (`LIFEOS_DB`) in startup logs and no persistent disk in returned service metadata. Its durability across restarts/deploys is unverified. The separate `lifeos-personal-staging-disposable` PostgreSQL instance was available with expiry **2026-12-08 06:15 UTC**; the service-to-database connection has not been established. Recheck current state before relying on either. Do not move personal data or change infrastructure to resolve this without authorization.

`android-companion/` uses distinct beta/Preview package identities and a permanent signing workflow described in `android-companion/SIGNING_AND_SAFE_UPDATES_V238.md`. A web-only commit should not trigger an APK build; the Android workflow is path-filtered. Never rotate signing keys, alter application identity, or uninstall/clear an existing app as a routine fix. Production promotion requires separate user approval.
