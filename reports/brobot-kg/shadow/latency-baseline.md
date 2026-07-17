# Latency baseline

The pre-existing route records end-to-end latency only. This implementation adds reusable stage timings and records normalization, auth, entitlement, user-message persistence, history, intent, clinical extraction, branch/fingerprint reads, CasePrep/answer context, KG stages, answer pipeline, and total request latency.

Production p50/p95 KG latency is pending migration application and traffic. The provider deadline defaults to 275 ms, within the requested 300 ms p95 additional-latency gate. Warm cache retrieval avoids the RPC.

Known limitation: revision, metadata, quality-gate, assistant persistence, and first-stream-token timings are still aggregated inside existing pipeline/stream functions rather than separately emitted in every branch. These should be completed before the 95% “complete timings” exit gate is claimed.
