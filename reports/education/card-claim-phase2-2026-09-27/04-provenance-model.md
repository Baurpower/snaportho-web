# Phase 2 — Provenance model

Every claim carries its derivation path from card version to assertion. No
claim is reachable without its evidence chain.

## Claim-level provenance (on every `ProposedFactoryClaim`)

| Field | Content |
|---|---|
| `sourceUnitId` | deterministic unit id `versionId\|field\|block\|clozes\|occurrence` |
| `sourceUnitOrdinal` | block index within the teaching field |
| `claimIndex` / `claimsInVersion` | 1-based position / total claims of the card version |
| `rewriteMethod` | extractor pattern (`qa_inversion_be`, `declarative_passthrough`, …) |
| `atomicConfidence` | extractor confidence in the rewrite |
| `evidenceLocator` | `cloze` / `Extra`-derived `extra` |
| `evidenceHash` | checksum over `(cardVersionId, fingerprint, locator, sourceUnitId)` |

Link metadata additionally records `factoryImplementation`,
`atomicExtractorVersion`, `entityTargetType`, and (for fills) the proposed
entity id + confidence + approval reason.

## Storage mapping (backfill writer, inert until a reviewed apply)

- `educational_claims.metadata` + `educational_claim_versions.metadata`:
  `{sourceUnitId, claimIndex, claimsInVersion, rewriteMethod,
  atomicConfidence}` (versions previously stored `{}`).
- `card_claim_backfill_items`: one row per card version (roll-up: first claim
  id, claim count, per-claim summaries in `resultPayload`).
- `card_claim_backfill_claims`: one row per unit — `(item, claim_index)`,
  queue, reason codes, claim ref — so 0..N claims persist without collapsing.
- `claim_entities` rows carry `evidence_locator` (`Text:b2:c1:i1` block /
  cloze / item coordinates) and `algorithm_version` per link.

## Guarantees

- Deterministic: identical corpus + index reproduces every id byte-for-byte
  (verified: reruns keep run/claim/link ids; 2,533/2,533 shared fingerprints
  keep legacy claimIds).
- No text without a unit: `claim.entities` and `claim.qualityFlags` join by
  `claimId`; `unitOutcomes` joins every claim back to its card + unit.
- Proposed entities record `sourceClaimIds` (every supporting claim), and
  batch merges union them across runs.
