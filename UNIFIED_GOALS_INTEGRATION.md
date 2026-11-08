# LifeOS Personal — Unified Goals integration increment

The existing weekly goals panel now supports goals based on `personalLogs`, alongside timer-based and fitness goals. Choose **Personal routine logs**, enter the exact category (e.g. Quran, Reading, Sleep), and select **Sessions** or **Logged quantity**. Quantities are summed only when present and positive; missing values are not invented. Records are grouped by the existing local Monday–Sunday goal windows. Personal routine goal increases are deliberately not auto-recommended because quantities can have incompatible units and data quality requires review.

Focused regression test: `node test_personal_goals_integration.cjs`.

**Limitations:** This is a focused incremental integration, not full end-to-end validation. Quantity units are not yet enforced across logs, so use one unit per goal category. There is no migration or change to existing records. The UI remains the existing long-form interface, pending mobile redesign. Production deployment and data are untouched.
