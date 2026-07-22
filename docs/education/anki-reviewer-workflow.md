# SnapOrtho reviewer Anki workflow

```text
Factory assignment
→ reviewer add-on
→ local GUID/ordinal resolution
→ mapping decision and optional edit
→ versioned submission
→ conflict/permission validation
→ administrative adjudication
→ future canonical card version
→ future draft deck release
```

## Runtime boundary

The workspace contained no recoverable add-on. `integrations/snaportho-anki` is therefore the first source MVP. Pure modules are fake-tested; native Anki rendering, Qt lifecycle, packaging, OS credential storage, and disposable-profile behavior still require live verification. The learner package imports no reviewer capability.

Reviewer requests reuse the existing one-time-linked, server-hashed device token. The add-on receives no service-role credential. APIs resolve user, device, reviewer record, active roles, qualification, and assignment ownership server-side. Roles and qualifications cannot be supplied by the client. Mapping reviewers submit decisions; clinical editors may additionally submit change proposals. No role in these routes publishes.

## Assignment and review lifecycle

An assignment pins factory run/batch, deck release, manifest checksum, reviewer, status, and exact ordered items. Items pin current canonical card/version, content hash, GUID, ordinal, queue, risk, proposals, critics, competitors, evidence hashes, and required human action. The 18-card preparation command is local dry-run only and does not assign a user.

The add-on resolves local cards by GUID plus ordinal, requires a unique match, and compares the importer-compatible content hash. Native card ID is display-only. Missing, ambiguous, and hash-mismatch outcomes block submission; there is no arbitrary selection or silent rebase.

Mapping submissions require an explicit decision, confidence, ambiguity resolution, mapping role or governed no-mapping classification, preserved evidence hashes, exact base identity, idempotency key, and client version. The server supplies reviewer identity, qualification snapshot, ownership, and `direct_human_review`. Accepted submissions remain adjudication inputs and never update direct mappings or review assertions.

## Editorial proposals

Clinical editors may submit text/tag/deck-placement changes and structured split/merge/retire/duplicate proposals. Revisions pin the base version/hash and a newly computed hash. Submission neither changes the local note nor creates a canonical version. A reviewer may explicitly save a marked local working edit; this is never interpreted as server approval.

Card bodies in proposal revisions are SnapOrtho-controlled editorial data. They are permitted only in that restricted table and the scoped request body. They are forbidden from audit metadata, logs, telemetry, factory artifacts, and error responses. Media upload is excluded.

## Drafts, retries, conflicts, and audit

SQLite drafts are scoped to reviewer, Anki profile, assignment, item, and exact version. They retain idempotency keys across restarts and reject credential fields. Credentials require an OS credential-store adapter and never enter SQLite. Accepted retries leave the queue; conflicts stop retry; revoked devices cannot drain it.

The server returns structured conflicts for changed server/local versions, superseded assignments/proposals, inactive cards/entities, identity mismatch, duplicate submissions, and permission changes. The reviewer can refresh, compare safe base metadata, withdraw a draft, or preserve the local edit. Automatic overwrite/rebase is absent.

Audit events contain IDs, request/add-on version, status/reason codes, and safe metadata only. They exclude card/edited bodies, tokens, credentials, and request payloads. Reviewer/account deletion is restricted while review evidence exists; future legal policy must define pseudonymization and retention.

## Boundaries and rollback

Administrative adjudication, canonical-version incorporation, mapping publication, release publication, media, and draft-release synchronization are future workflows. Before migration application, rollback is source-file removal. After future application, drop reviewer triggers/functions and seven reviewer tables in dependency order; canonical cards, mappings, KG, and releases remain untouched.
