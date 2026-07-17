# Current architecture map

BroBot preserves its existing pipeline:

`request → auth/quota → persistence/history → intent → branch learning → CasePrep/clinical context → answer → quality/revision/metadata → persistence/evaluator`.

Shadow KG insertion:

`resolved intent + clinical context → deterministic decision → release-pinned bounded RPC → packet assembly → telemetry/gap queue`.

The shadow packet is never passed to `buildBroBotChatMessages`, revision messages, metadata messages, the quality gate, branching, or the response payload.

KG retrieval starts before independent fingerprint/branch reads and is awaited after answer-context construction, allowing overlap without changing existing dependencies. Failure, timeout, cache failure, or telemetry failure all fail open.
