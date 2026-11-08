# Batch E — Evidence-based analytics foundation

Implemented: read-only 28-day analytics panel, unique/overlap interval accounting, day-type averages, measured-precision ratio, evidence threshold, optional capacity/recovery guards, conservative recommendation requiring approval. Existing data is not mutated.

Important limitations: UTC day boundaries (not DST-safe local day aggregation), no true observation/completeness telemetry, no learned next-week time-slot predictions, no sleep/recovery inference, no recommendation approval UI yet, no full browser E2E. In particular, a day without tracked sessions does NOT prove inactivity.

Batch F: link ideal schedule, recommendation review, and calendar approvals without bypassing atomic synchronization.
