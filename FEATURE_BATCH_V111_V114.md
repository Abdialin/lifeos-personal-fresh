# LifeOS Personal V111–V114: Isolated Friends foundation
Date: 2026-11-15
Branch: main

## Implemented in isolated Python data-model module
File: `personal_social_isolated_v114.py`
- **V111 — account foundation:** individually identified social users, salt-per-password scrypt hashing, per-user random session tokens stored as SHA-256 hashes, 12-hour expiry and logout. Separate SQLite tables from the legacy LifeOS activity and preference stores.
- **V112 — invitations:** named-user invitations; only intended recipient may accept or decline, friendships are required before data sharing, and either party may remove the friendship.
- **V113 — metric consent:** explicit per-friend per-metric opt-in (workout days / habit days), default disabled, revocation and friendship removal stop future server queries immediately. No activity names, individual logs, prayers, nutrition, notes, or locations shared.
- **V114 — leaderboard query:** 7, 14 or 30 day aggregate self-reported cards with time-to-live; strict comparison period; only accepted friends with currently enabled consent can appear. No verified-outcome claims.
- Synthetic isolated regression tests in `test_social_isolated_v114.py`.
- GitHub Actions workflow `.github/workflows/lifeos-module-tests.yml` also runs selected earlier Node regression tests.

## CRITICAL: Not live yet
This is a **domain-layer foundation**, NOT a complete live Friends service. It is intentionally **not imported by server.py and has no HTTP routes**.

Why: the legacy LifeOS web app currently shares one Basic Auth username/password and one workspace sync token. Exposing a social interface through those credentials would not give separate people safe ownership or authorization. Connecting friends and challenges to existing shared-user activity records would risk disclosing private data.

Before activating V111–V114:
1. Implement per-account HTTP authentication, CSRF/origin/rate-limit controls, password reset, session invalidation, audit and secure cookie/token handling, and abuse safeguards.
2. Implement the PostgreSQL adapter and durable migration from the isolated SQLite model; determine safe account ownership of historical activities.
3. Add account-aware app login/logout and consent-based Friends UX, with invitation acceptance, sharing permission and revocation controls.
4. Add time-bounded challenges only after metrics are strictly comparable, with fraud-resistant labeling and explicitly optional participation.
5. Run real multi-account privacy/isolation tests, concurrent writes, account deletion and backup restoration.

## Privacy promises and limits
- V90 manual card sharing remains available and is still **self-reported**.
- The isolated social module does not read or write actual LifeOS activity records.
- Server-side revocation stops *future queries* but cannot retract previously downloaded screenshots or exports.
- Development code is not production-ready security until the HTTP boundary and associated tests exist.
