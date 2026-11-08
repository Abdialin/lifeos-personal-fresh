# LifeOS Personal — fresh private GitHub repository

1. On GitHub create a **private** repository, e.g. `lifeos-personal-fresh`. Do not initialize with a README.
2. Unzip this package. Upload the **contents** (Dockerfile, server.py, index.html and all .js files) to the root of the new repository. Do not upload this ZIP as a single file. Never upload credentials.
3. In Render, retain the existing service until the new code is deployed successfully. The existing service's repository is fixed to the old repo; use Render dashboard service Settings to change the repository if available, otherwise create a **new staging web service** with Docker runtime, Frankfurt region and automatic deployments disabled.
4. For a new service set `LIFEOS_DATABASE_URL` using the **internal** PostgreSQL URL from Render's dashboard, plus existing app auth variables. Do not paste credentials into chat. Note: this is a disposable staging database; don't point production at it.
5. Deploy and check `/healthz`, sign in, track an activity and verify from a second browser. Do not consider the deployment successful until the second-browser check passes.
6. Only after verification consider retiring the older service.

## Code fixes included
- Docker now includes all application JS modules, not just the legacy tracking script.
- HTTP server now serves the explicitly bundled JavaScript modules rather than returning 404 for them.
- No user data or secrets are bundled.

## Limitations
No live deployment, browser acceptance test, or database connection has been performed for this ZIP.
