# Visual reference library

These folders distinguish **implementation captures** from the user's **approved design source images**. None of the captures here should be described as an approved mockup.

- `global/`: six-section navigation and device-inset evidence.
- `today/`: Concept A+ Overview, Timeline, Agenda and Review, plus details and gap sheets.
- `track/`: Concept A Live, History and Review.
- `plan/`, `goals/`, `insights/`, `my-life/`: current section captures and explicit missing-reference/approval status.

Most `current/` screenshots use synthetic, network-intercepted fixtures. The [authenticated local-replica captures and comparison](authenticated-replica/) additionally use a temporary server, login and SQLite database; they never access the live account or Preview data. See `docs/TESTING.md` for commands. All are browser captures, not native Android verification.

`today/before/` and `track/before/` contain synthetic captures from commit `5aa749b6173f4aa65c281672f0f785ef52cd2f02`; matching named images were regenerated from that archived revision with the same fixture. `393-tab-*` and `393-live.png` came from [GitHub Actions run 45652105939](https://github.com/Abdialin/lifeos-personal-fresh/actions/runs/45652105939), whose workflow uses isolated CI fixtures. They are historical implementation evidence, not approved design sources.

The user later supplied individual Today and Track V1 screens, five Plan references and V1 Goals, Insights and My Life references. These are stored under [`release-v1/`](release-v1/), [`today/reference/`](today/reference/) and [`plan/reference/`](plan/reference/). The historical provenance of the original Concept A+ and Track approvals remains unconfirmed. Supplying a reference does not establish acceptance of an implementation.
