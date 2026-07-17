# Application telemetry validation

Status: **not measured**.

No real production BroBot request was executed because the intended application code is not committed/deployed and deployment credentials are unavailable. No telemetry row was inserted directly, and the prior synthetic growth-queue validation was not repeated.

Accordingly, event cardinality, retrieval/bypass distinction, timing, cache state, candidates, gaps, follow-up classification, deadline/error representation, query privacy, growth aggregation from application traffic, and telemetry fail-open behavior remain unverified. Raw-query retention and sanitized-query retention from application traffic are also unmeasured, not zero.

The local code has privacy-safe query hashing and conditionally omits sanitized text when `BROBOT_KG_STORE_SANITIZED_QUERY` is not `true`; this is implementation evidence only.

## Answer-equivalence method for the resumed run

Independent model calls are not a valid byte-equivalence test because model generation can vary. Use one deterministic application-path test double for the OpenAI client and run the same request twice, once with KG mode disabled and once with KG mode shadow. Capture and compare every model-call message array (answer, revision, metadata, and any branch-generation call), quality-gate input, persistence payload, stream events, and final JSON response after removing only request IDs/timestamps. The fixtures returned by the test double must be byte-identical.

The local route provides useful static evidence: retrieval starts alongside unrelated reads, but only `kgShadow.trace` is passed to telemetry/analytics; neither `kgShadow.packet` nor candidates are passed to answer-context construction, model message builders, revision, metadata, quality gate, branch ranking, streaming generation, or the response object. This must still be proven with the deterministic capture test before deployment and then checked with a single generated answer path in production. Two independent production generations must not be described as byte-equivalent evidence.
