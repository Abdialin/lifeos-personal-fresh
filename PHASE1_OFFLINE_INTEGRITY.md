# Offline integrity checkpoint

Adds read-only diagnostics to the existing offline journal inspection button. The existing ordered snapshot outbox, revision-CAS server synchronization, and recovery export are unchanged. It flags malformed entries, duplicate operation IDs, inconsistent dirty metadata, and local/journal snapshot mismatches. Warnings require manual review; this release does not enforce an automatic sync block or resolve conflicts. No production environment was accessed. Browser, network interruption, and multi-device tests remain pending.
