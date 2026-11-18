# LifeOS Android V238 — signing, protected upgrades, and coexistence

## Why V237 would not update the installed app

The existing Android application has package ID `com.lifeos.companion`. Debug APKs produced by different GitHub-hosted runners can use different signing certificates. Android rejects a replacement whose certificate doesn't match the already-installed package.

**Never uninstall the existing app to work around a signing mismatch** until all unsynced local recovery information has been exported and checked. The original signing key is not available in this repository. Changing the signing key now cannot repair the original package's update signature.

## Safe V238 package identities

| APK | Application ID | Signing | Use |
|---|---|---|---|
| Existing LifeOS install (V232–V234) | `com.lifeos.companion` | Existing GitHub runner debug key | Keep installed and preserve its storage. |
| Disposable test APK | `com.lifeos.companion.beta.dev` | New runner debug key, changes across runs | May be installed **alongside** the old app. For temporary testing only; do not rely on upgrades or long-term local-only tracking. |
| Persistent beta APK | `com.lifeos.companion.beta` | Stable user-controlled signing key from Actions secrets | Preferred for real continued use and future in-place updates with the **same signing keystore**. |

Each package has distinct Android storage. The web account's PostgreSQL history can be reviewed and adopted separately through the existing backup-first recovery flow. **Never upload an empty new local workspace over server history.**

## Required one-time setup for stable beta signing

Create and safely retain a new signing key on a **trusted computer** with Java `keytool` available:

```bash
keytool -genkeypair -v -keystore lifeos-beta-signing.p12 -storetype PKCS12 \
  -alias lifeos_beta -keyalg RSA -keysize 3072 -validity 10000 \
  -dname "CN=LifeOS Private Android Beta"
```

Choose a strong unique store password. With PKCS12 and modern Java, the key password is typically identical to the store password. Back up the keystore and password in a secure location **outside GitHub and ChatGPT**. Losing either can permanently prevent future updates to the signed beta package.

Convert the keystore to a single-line base64 string (do not commit it):

- Linux: `base64 -w 0 lifeos-beta-signing.p12`
- macOS: `base64 < lifeos-beta-signing.p12 | tr -d '\\n'`
- Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes('lifeos-beta-signing.p12'))`

In the private GitHub repository, go to **Settings → Secrets and variables → Actions → New repository secret**. Create these four secrets:

1. `LIFEOS_BETA_KEYSTORE_BASE64` — one-line base64 of the .p12 file.
2. `LIFEOS_BETA_STORE_PASSWORD` — store password.
3. `LIFEOS_BETA_KEY_ALIAS` — `lifeos_beta`.
4. `LIFEOS_BETA_KEY_PASSWORD` — key password (normally same as store password).

Do not paste any secret values or the keystore into issue comments, code, screenshots, or chat. GitHub Actions will detect when **all four** secrets exist. If they do not, it will deliberately build **only** the disposable dev APK.

## Build verification

Open **Actions → LifeOS Android beta APK verification (V238)**. When signing secrets are present, the workflow builds and verifies a stable beta APK, including application ID and certificate signature. It retains:

- `lifeos-android-v238-disposable-dev-test-only`: experimental, **not stable for updates**.
- `lifeos-android-v238-signed-beta`: appears **only when all signing secrets were present and signing verification passed**.
- `lifeos-android-v238-build-diagnostics`: includes package and public certificate SHA-256 fingerprints. Never include credentials.

For future updates, use the *same keystore* and package ID. The signature fingerprint from `apksigner verify --print-certs` must match. Increase `versionCode` in the Gradle file on each new release.

## Phone acceptance and recovery

1. Leave the old LifeOS app installed. Do **not** clear its data or forcibly replace it.
2. After configuring stable signing, install the successful **signed-beta** APK as a **separate** LifeOS Beta app.
3. In the Beta app, connect to the existing server and open **Settings & data → Cloud sync → Restore your existing server history**.
4. Follow the two verified JSON backup prompts and the explicit restore confirmation. Do not press `Upload local data` from an empty new installation.
5. Check that the historical sessions, scheduled activities, workouts, meals and goals appear. Reopen the app and confirm they persist before relying on the new beta.
6. Keep the old app available until all history and any local-only pending edits have been separately reviewed and safely backed up.

**Security trade-off:** This staging build is for private testing, not Play Store release. A release-quality public app requires a reviewed release process, privacy policy, stronger authentication, Play signing strategy, API compatibility and physical-device verification.
