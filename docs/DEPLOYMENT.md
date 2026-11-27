# Preview and deployment

The isolated Preview service is `lifeos-today-aplus-preview`, linked to `Abdialin/lifeos-personal-fresh` branch `today-a-plus-rebuild` with automatic deployment on commit. Verify the remote branch before pushing; inspect the exact deploy commit and `live` status in Render, then check the workload. The sign-in page can be checked anonymously, but authenticated behavior requires the isolated Preview account.

The six-section app's current login is a shared workspace, so adding a second login or seeding it would not isolate records. `/account/register` belongs to the separate beta dashboard and does not authenticate the six-section app. Local authenticated testing now uses an independently created temporary server, credentials and SQLite database; it does not prove signed-in behavior on Render. A truly isolated deployed-account check needs a separate disposable service/database or a reviewed per-account workspace implementation. Do not upload the synthetic fixture to the existing shared Preview workspace.

Useful read-only checks after a push:

```sh
git rev-parse HEAD
git ls-remote origin refs/heads/today-a-plus-rebuild
gh run list --repo Abdialin/lifeos-personal-fresh --branch today-a-plus-rebuild --commit "$(git rev-parse HEAD)"
```

On 27 November 2026 the Preview service again reported SQLite (`LIFEOS_DB`) in startup logs. Render reports the service on its free plan; its [disk documentation](https://render.com/docs/disks) says persistent disks require a paid service and local filesystem changes are lost on redeploy without a disk. Returned service metadata did not show a persistent disk, and the service event query returned no disk creation, update or deletion since January 2026. The Docker image defaults to `/data/lifeos.sqlite3`, but a runtime override has not been inspected. The deployment of `f9ab12379593f76af387fc210ff4b7578c343437` occurred before this risk was re-evaluated; the pre-deployment state and any loss are unknown. Do not push another commit to this auto-deploy branch until durable isolated Preview storage or a verified, recoverable backup and safe deployment procedure are established. Do not change production or copy personal data to Preview. The separate `lifeos-personal-staging-disposable` PostgreSQL instance was available with expiry **2026-12-08 06:15 UTC**; the service-to-database connection has not been established. Do not migrate data or alter infrastructure without a reviewed isolation and recovery plan.

A disposable local-server test simulates an empty server response against a populated browser workspace, with and without a pending journal. In that synthetic scenario, loading does not replace local records and stale uploads are blocked; this does not establish the state of any real device or recover server-side records. Preserve existing app data and backups while the Preview storage path is investigated.

The [Preview storage runbook](PREVIEW_STORAGE_RUNBOOK.md) records the ephemeral filesystem risk, known recovery limits, a private PostgreSQL proposal, costs and locally rehearsed migration. Free-service files may also disappear on idle spin-down or restart. No Preview database has been provisioned or connected, no current server backup has been obtained, and the deployment and recovery cutover remain blocked. Test branches must not target an auto-deploy service.

[Free Neon and Supabase alternatives](PREVIEW_FREE_POSTGRES_EVALUATION.md) have been researched without provisioning. Their backup, network and migration constraints require review; no provider has been selected and user approval is required before creating one or migrating data.

`android-companion/` uses distinct beta/Preview package identities and a permanent signing workflow described in `android-companion/SIGNING_AND_SAFE_UPDATES_V238.md`. A web-only commit should not trigger an APK build; the Android workflow is path-filtered. Never rotate signing keys, alter application identity, or uninstall/clear an existing app as a routine fix. Production promotion requires separate user approval.
