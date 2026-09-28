# KG Identity vNext — Implementation Summary

## Old identity (three eras, one table)

| Era | Function (SQL) | TS twin | Inputs | Governs |
|---|---|---|---|---|
| v1 structural | `educational_claim_fingerprint_hash` | `clinicalClaimFingerprintHash` | type, entity UUID, predicate, object, qualifiers | `card-claim-factory.v1`, `legacy-unversioned` |
| v3 assertion | `educational_claim_assertion_fingerprint_hash` | `assertionIdentity` | v1 inputs + claim_text | `orthobullets-autonomous-claim.v3` |
| v4 assertion | same v3 function | same | same | `orthobullets-autonomous-claim.v4` |

Triggers (`sync_educational_claim_fingerprint`, `sync_..._version_...`)
recompute `fingerprint_hash` on write, branching on `NEW.algorithm_version`.
Deterministic UUIDs derive from the legacy fingerprint
(`clinical-claim|<fp>`). Unique merge key:
`educational_claims_active_fingerprint_uidx` on legacy hash.

v1 is unsound as equivalence: predicate is degenerate (85% `teaches_fact`),
object is raw cloze-answer text, and normalization drops `< > . %`, so
clinically distinct propositions collide (23 STRUCT groups; e.g. Lachman
grades vs TKA fracture rate sharing "3-5"). v3/v4 fixed this prospectively
only, with no backfill — two identity functions, one table.

## New identity (canonical semantic v1)

`educational_claim_semantic_fingerprint_hash(claim_text, claim_type,
qualifiers)` = sha256 over:

```
semantic=v1
assertion=<normalized claim_text>
type=<normalized claim_type>
qualifiers=<sorted k=<normalized v>; ...>
```

Deliberately EXCLUDED: entity IDs (resolution must not block convergence),
source/card IDs, algorithm version, confidence, review state, predicate/object
(extraction artifacts). A card claim and an OB claim asserting the same
proposition converge; paraphrases do NOT (text hash, not a semantic model —
documented limitation; paraphrase convergence belongs to the matching layer
via reviewed `equivalent_to` edges in the merge phase).

Normalization (identical order in SQL + TS): HTML-entity decode (`&amp;`
last), unicode-variant map, lowercase, cloze-marker strip, known-tag strip
(never generic `<[^>]+>` — it would eat `<5 mm and >2 mm`), keep
`[a-z0-9 +\-/.,<>=%']`, collapse/trim, strip one trailing `.`, trim again.
No synonym rewriting. False negatives preferred over false merges.

## Compatibility strategy: Pattern A (chosen)

New nullable columns `semantic_fingerprint_hash` + `semantic_identity_version`
on `educational_claims` AND `educational_claim_versions`; legacy
`fingerprint_hash`, IDs, links, and review history untouched. Triggers compute
semantic for EVERY row regardless of era. Backfill is an additive
deterministic UPDATE (idempotent reruns). Index is NON-unique by design —
duplicates are review candidates; a merge-key unique index is deferred to the
merge phase. History stays answerable: "created under v1 structural identity,
later assigned semantic X."

Pattern A over B because the codebase already evolves this table by additive
columns + sync triggers, triggers give every writer (including raw SQL) the
identity for free, and one row keeps both identities without join-time
skew between a mapping table and the claim row.

## Write paths updated

1. `contracts/clinical-claim-v1.ts` — the ONE shared implementation
   (`normalizeSemanticClaimText`, `semanticClaimFingerprint{Payload,Hash}`,
   `claimsShareSemanticFingerprint`, record helpers); legacy
   `claimsShareFingerprint` marked `@deprecated` with a never-equivalence
   warning; record gains optional semantic fields.
2. `card-claim-factory.ts` — every proposed claim carries the semantic
   fingerprint; output gains `semanticCandidates` groups + metrics. No change
   to dedup keys, claimId derivation, queues, or auto-approve policy.
3. `run-card-claim-backfill.ts` (dormant: `apply=false`) — recomputes semantic
   via the shared implementation, records pre-insert semantic candidates,
   verifies trigger parity on BOTH identities (mismatch → conflict, never a
   silent write), persists semantic fields in all payloads. No repointing.
4. `commit_orthobullets_machine_claim` (SQL, in migration) — assertion-dedup
   behavior UNCHANGED; stamps semantic fp into link metadata, run-item reason
   codes, and return payload.
5. Assertion-era `assertionIdentity` (TS) frozen as-is; reviewer `_lib.ts`
   confirmed read-only (no change needed).

## Risks

- SQL/TS drift: mitigated by pinned parity example (test + migration header +
  verification SQL behavior pins) and the backfill dual-parity gate.
- `lower()` DB-locale caveat: same as legacy; noted in migration.
- Non-string qualifier JSONB: tables constrain to strings; function assumes it.
- Merge-key unique index absent: intentional; concurrent identical inserts can
  create candidate dupes until the merge phase (advisory-lock pattern
  documented for commit paths then).

## Unresolved questions

- Live parity counts (DB unreachable from sandbox) — Stage 0 of rollout.
- Whether merge phase uses commit-time semantic reuse, `equivalent_to` edges,
  or both — recommend edges first, reuse after precision is proven.
- Paraphrase-matching layer design (embeddings vs rules) — out of scope here.
