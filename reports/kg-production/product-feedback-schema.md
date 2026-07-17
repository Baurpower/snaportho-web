# Product Feedback Schema

## Product event

`kg_graph_feedback_events` stores one authenticated, privacy-minimized event.

Required fields:

- product surface
- feedback type
- severity
- authenticated creator
- timestamp

Linkage fields, when available:

- release ID
- response or retrieval ID
- neighborhood slugs
- entity IDs
- relationship IDs

Context fields:

- user query
- explanation
- user or reviewer role
- supporting source
- bounded product context

Supported event types include incorrect or missing entities and relationships, duplicate concepts, weak retrieval, unsupported answers, provenance concerns, outdated content, confusing terminology, curriculum-placement concerns, successful answers, useful traversals, and user or expert corrections.

## Privacy controls

- The API requires authentication.
- Common email addresses, telephone numbers, and long numeric identifiers are redacted.
- Context keys resembling patient name, MRN, medical record, date of birth, email, phone, or address are removed recursively.
- Text and collection sizes are bounded.
- Products are instructed not to submit patient-identifying data.
- Users can read their own events; normalization and operational review remain service-role only.

## Normalized signal

`kg_graph_feedback_signals` stores a deterministic cluster fingerprint, linked event IDs, occurrence count, affected graph IDs, risk tier, proposed change type, proposed payload, validation notes, and lifecycle status.

The table is not a publication path. It supports:

`feedback event → normalized signal → auditable proposal export`

Clinical or ontology changes still proceed through validation, staging, database verification, and a later release overlay.
