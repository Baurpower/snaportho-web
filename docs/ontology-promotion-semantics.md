# Ontology promotion semantics

Status: design definition only. No promotion writes are implemented.

The card-claim factory ends at **proposed entities** (dry-run artifacts).
Canonical promotion happens only through an explicit human reviewer decision,
transformed by `buildPromotionPlan` into a deterministic plan. There is no
executor: a plan can be inspected but never applied from this workflow.

## Action semantics

### approve_new_entity → `create_canonical_entity`

The proposed entity becomes a new canonical entity. Planned mutations:

- `insert_canonical_entity` (entity type, preferred label, normalized label)
- `retarget_claims` (claims pointing at the proposal now target the new id)
- `mark_proposal_decided`

Invariants: proposed entity exists; stable non-empty label; valid entity
type; ≥1 source card; ≥1 claim; no exact canonical collision; explicit
reviewer identity.

### add_alias_to_existing → `add_alias`

The proposed label becomes an alias on an existing canonical entity. Planned
mutations: `insert_alias`, `mark_proposal_decided`. Claims keep pointing at
the proposal until a later merge (aliases do not retarget claims).

Invariants: target canonical entity exists; alias non-empty; alias not owned
unambiguously by another canonical entity; explicit reviewer identity.

### merge_with_existing → `merge_into_canonical`

Claims/links targeting the proposed entity retarget to the canonical entity.
Planned mutations: `retarget_claims`, `mark_proposal_decided`.

Invariants: both IDs exist; entity types compatible; reviewer explicitly
selected the canonical target.

### reject → `reject`

No mutation. The proposal remains noncanonical. Planned mutations: none.

### needs_review

No mutation and no plan. The item stays in the review queue.

## Non-goals

- No automatic promotion, merging, or alias insertion.
- Similarity audits (`possibleDuplicateCanonicalEntities`,
  `possible_proposed_duplicates`) are advisory and never change resolution.
- A `blocked` plan carries zero mutations; blockers name the failed
  preconditions.
