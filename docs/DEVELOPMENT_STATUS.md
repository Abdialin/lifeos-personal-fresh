# Development status

Last reviewed: 26 November 2026. Use `git rev-parse HEAD` and GitHub Actions for the exact current revision and run status; do not infer deployment from this file.

## Today: current work

The V250 foundation added interactive recorded, planned, active and gap details, gap logging through Track's existing form, overlap review and separate raw-time metrics. A follow-up restored known Preview sample categories without changing saved sample records. The user reported that timeline entries are selectable and the gap form opens on Android; that is not acceptance of all V250 requirements.

This follow-up addresses category aliases and explicit-category precedence, compact details, minute-level gap controls with exact untouched boundaries, live remaining-time guidance, local-day timeline boundaries on daylight-saving transitions, and a superseded Track presentation leaking into other sections. Automated checks and synthetic screenshots are documented in `docs/TESTING.md` and `docs/design/today/`. Device and user acceptance remain pending.

The remote branch also received independent My Life overview changes in commits `68504fe`, `de1bfb8` and `67ea9fb`; these are retained. The user supplied five Plan references and explicitly requested that development proceed, starting with Overview. Those references authorize the Plan visual direction; each subsection still requires its own visual and functional checks before the next.

The Today follow-up and activity-loader cache correction are in commits `8a69849584ebd0ffef1031157b886814000432b5` and `f3327e5b023478cced779462f1ac0890dcd8703c`. The four Today workflows passed for both commits, and Render reported the latter live on 26 November 2026. The authenticated deployed experience and Samsung device acceptance have not been independently checked.

The supplied Plan reference files are stored under `docs/design/plan/reference/`. The current work preserves Overview and implements the Calendar, Tasks, Compare and Improve presentations using the existing workspace and action bridges. Browser evidence and remaining design differences are recorded in `docs/design/plan/COMPARISON.md`. Device acceptance is pending for all five; the user requested a single focused review after the four remaining subsections are implemented. Verify the exact deployed revision and Actions results separately.

## Still open

- The Android screenshots show bottom navigation floating above the system navigation area and content behind it. The native/WebView interaction needs device measurements and a later consolidated native release; browser viewport checks do not verify native IME or system bars.
- The original approved Today Concept A+ and Track Concept A mockup image files are absent from the repository. Current screenshots are implementation evidence, not substitutes for those approvals.
- Cross-section category behavior is checked for the core categories and fitness evidence. Generic keyword-based goal matching and the wider category catalog have not received a complete cross-section audit.
- Preview persistence and staging database expiry are documented in `docs/DEPLOYMENT.md`; no migration or infrastructure changes have been made.

Critical Today checks and focused device acceptance are distinct: the user has explicitly instructed Plan work to proceed while device acceptance remains open. Preserve Track Concept A; later sections need approved visual concepts where the brief requires them.
