# Preview storage and recovery runbook

This is a proposal and a record of local rehearsals, not an authorization to provision, migrate, restore, connect or deploy. Protect the original Beta, production, staging, device storage and existing backups. Never place credentials, database URLs, exports or real activity data in the repository, screenshots, test fixtures or logs.

## Observed state, 27 November 2026

- `lifeos-today-aplus-preview` is a free Render web service, set to deploy automatically from `today-a-plus-rebuild`. Its startup identifies SQLite configured by `LIFEOS_DB`; a persistent disk was not visible in the service metadata or disk events examined. The override's actual path was not inspected.
- Render states that a free web service's filesystem is ephemeral on spin-down, restart and redeployment. The deployment of `f9ab12379593f76af387fc210ff4b7578c343437` occurred before the risk was re-evaluated. The former server state, whether any records were lost and the present protected workspace state are unknown. A code rollback cannot restore discarded filesystem contents. Preserve any existing device/browser records and recovery files.
- Render metadata showed no Preview database or disk snapshot. The free service has no shell, so its SQLite file could not be inspected or copied through Render shell. Previously exported recovery files or device-local data may still exist; none were found by a metadata-only search of this workspace. Do not assume an absent file proves the absence of any backup elsewhere.
- A separately named disposable staging PostgreSQL database expires on **8 December 2026 at 06:15 UTC**. It was not queried, modified or treated as a Preview database.

Sources: [Render free resources](https://render.com/docs/free), [persistent disks](https://render.com/docs/disks).

## Proposed dedicated storage

[`infra/preview-postgres.proposal.yaml`](../infra/preview-postgres.proposal.yaml) describes only a new Frankfurt PostgreSQL 17 database and a new isolated project environment. It does not adopt, connect or change any existing service. It disables public database access and storage autoscaling. Review Render's actual plan, workspace capabilities and current prices before approval or provisioning.

On 27 November 2026 Render created a non-autosyncing proposal object (`exs-dc4qrku1egvs739gf0mg`) but returned `need_payment_info` while planning the database; there is no approved plan or provisioned database. Adding billing information securely in Render and obtaining the user's cost approval are required before retrying. Do not accept or apply a plan that modifies existing services or databases.

Render currently permits one free PostgreSQL database per workspace, and the existing free staging database uses that allowance. A free database also expires after 30 days and has no Render-managed backups, making it unsuitable for durable Preview use. Render's published price for `0.1c-256mb` is $6/month plus $0.30 per GB-month for storage: 1 GB is approximately **$6.30/month**, before taxes and other usage. Managed point-in-time recovery is available on paid databases; a restored instance incurs its own charges. See [pricing](https://render.com/pricing) and [backups](https://render.com/docs/postgresql-backups).

An independent database and credentials separate records, but resources in the same workspace and region can otherwise share Render's private network. The proposal requests [environment network isolation](https://render.com/docs/projects#blocking-cross-environment-traffic), which requires a Pro workspace. The current workspace plan was not established; Pro is advertised at $25/month if an upgrade is necessary. Upgrading a workspace is a separate scope and cost decision. A privately isolated database cannot be reached by the current ungrouped Preview service until a safe network placement and cutover are reviewed. The migration tool also needs an authorized private execution path; one has not yet been established. Do not enable public access or move a running service merely to bypass this issue.

The user has requested an alternative evaluation with Render retaining application hosting: Neon Free is the primary candidate and Supabase Free is secondary. See [the free PostgreSQL evaluation](PREVIEW_FREE_POSTGRES_EVALUATION.md). Neither has been provisioned or connected; approval is required before creating even a free project or moving any data. An external provider would use a different network path from the private Render proposal above and requires separate security, backup and recovery verification.

## Backup and migration guardrails

1. Establish which records exist, whether they are exclusively Preview data, and the safe source of a complete, independently verified backup. Stop conflicting writes during a reviewed cutover. Never import original Beta or production data into Preview.
2. A self-contained offline SQLite backup can include workspace state, preferences, calendar audit and encrypted calendar authorization tables. Preserve the encryption configuration separately and securely. A `/backup` JSON export contains **workspace state only**; it does not include server-side preferences, calendar audit or calendar authorization. Review those omissions explicitly before any state-only migration. Do not describe it as a full database backup.
3. Establish a private connection to a newly created, empty and dedicated Preview PostgreSQL database, and verify its exact host, database and user independently. The proposed database is private-only; a suitable execution environment is still needed.
4. `scripts/preview_storage_migration.py` inspects an offline source read-only, verifies its checksum, checks the explicit target identity and rejects nonempty or shared targets. It defaults to inspection. An apply requires a separate verified-backup attestation and the reviewed source digest. It commits atomically and checks all migrated rows. It refuses unsupported source tables, pending SQLite journals and mismatched targets.

The tool requires `sslmode=verify-full` on remote targets, accepts `channel_binding=require` and `sslrootcert=system` as optional connection parameters, and rejects unreviewed parameters and weaker variants. A compatible PostgreSQL client and usable system trust store are still necessary; offline URL tests cannot prove a live TLS connection. The web application's own database connection must be separately reviewed and tested before cutover.

Example after prerequisites and paid-resource approval, with the URL supplied through a secure environment and never printed or committed:

```sh
python scripts/preview_storage_migration.py \
  --source /secure/path/preview-backup.sqlite3 \
  --target-host REVIEWED_HOST --target-database REVIEWED_PREVIEW_DATABASE \
  --target-user REVIEWED_USER
```

After independently verifying the separate backup and reviewing the inspection digest, add `--apply --source-sha256 REVIEWED_DIGEST --verified-separate-backup` to the same command. For a reviewed server JSON export use `--source-type server-json`; applying it also requires `--confirm-state-only` after the missing data has been addressed. An attestation flag is not itself a backup or verification. The current tool rejects empty sources rather than treating them as permission to replace records.

5. Verify source and destination records, preferences and audits without exposing private contents. Rehearse `pg_dump` and restore into a separate database; verify the restored data and application behavior. Coordinate environment configuration and cutover only after a backup and rollback procedure are established. Test persistence after a real Preview redeployment, then verify the deployed commit and authenticated behavior without touching personal data.

## Rehearsal evidence and limits

Synthetic local PostgreSQL 17 tests exercised a complete SQLite migration, checksummed state-only export, rejection paths, concurrent writers, a PostgreSQL dump and restore into a second disposable database, and HTTP server restarts against both. All source and destination data were synthetic. The current Preview data has not been inspected, exported or migrated. Render point-in-time recovery, private migration access, deployed restore and survival of a real redeployment remain unverified. Do not push to the auto-deploy branch or change its environment until recovery and cutover are safe.

After the remote TLS guard was tightened, a fresh temporary PostgreSQL 17 instance on an unused localhost port repeated a synthetic SQLite state migration, nonempty-target refusal, dump/restore and local database server restart. The temporary source and both temporary databases were removed after the test. This does not verify an external TLS endpoint, provider backup policy or Render redeployment.
