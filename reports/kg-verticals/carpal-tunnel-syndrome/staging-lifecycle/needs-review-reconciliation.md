# CTS staging `needs_review` reconciliation

Date: 2026-07-15  
Source batch: `cts-0f75b7ab7ec364d9`  
Source packet: `reports/kg-staging/carpal-tunnel-syndrome/cts-0f75b7ab7ec364d9/proposal-packet.json`

## Result

The 19 `needs_review` proposal rows do **not** reduce entirely to three unresolved
review decisions.

- 3 rows are unresolved canonical graph objects introduced by the normalized
  post-review overlay.
- 8 rows are educational claims. Seven have explicit human approval or
  approval-with-revision decisions and one has an `AUTO_APPROVE` disposition.
- 8 rows are decision points with explicit human approval-with-revision
  decisions.

The 16 claim/decision-point rows are not unresolved review work. The staging
adapter forced them to `needs_review` because the canonical staging apply does
not support those proposal types. They must be excluded from this canonical
entity/relationship staging packet, while remaining intact in the finalized
graph and original review ledger.

## Reconciliation by object

| Graph object | Proposal type | Review reason/source item | Dependency | Intended disposition |
| --- | --- | --- | --- | --- |
| `cts-6-clinical-diagnostic-tool` | `create_canonical_entity` | Overlay-only gap fill; no final review item | Parent of the `has_classification` edge below | Reject. It is a generic abstraction introduced to satisfy a minimum-count rule rather than an approved canonical identity. |
| `carpal-tunnel-syndrome has_classification cts-6-clinical-diagnostic-tool` | `add_canonical_relationship` | Overlay-only gap fill; no final review item | Depends on rejected CTS-6 entity | Reject with its endpoint. Do not retain for connectivity. |
| `carpal-tunnel part_of hand-wrist-anatomy-hub` | `add_canonical_relationship` | Overlay-only gap fill; no final review item | Both endpoints exist independently | Reject. The target is a curricular/regional hub, not a valid anatomical parent for canonical `part_of`. No established replacement is required for CTS staging. |
| `claim-carpal-tunnel-syndrome-anatomy` | `propose_educational_claim` | Auto-review category `AUTO_APPROVE` | `median-nerve` | Already reviewed; defer from canonical graph apply because this lifecycle has no claim persistence target. |
| `claim-carpal-tunnel-syndrome-clinical-pattern` | `propose_educational_claim` | Human `APPROVE` | `carpal-tunnel-syndrome` | Already reviewed; defer from canonical graph apply. |
| `claim-carpal-tunnel-syndrome-complications` | `propose_educational_claim` | Human `APPROVE_WITH_REVISION` | `carpal-tunnel-syndrome` | Revision remains in finalized graph; defer from canonical graph apply. |
| `claim-carpal-tunnel-syndrome-exam` | `propose_educational_claim` | Human `APPROVE` | `carpal-tunnel-syndrome` | Already reviewed; defer from canonical graph apply. |
| `claim-carpal-tunnel-syndrome-oite-trap` | `propose_educational_claim` | Human `APPROVE_WITH_REVISION` | `carpal-tunnel-syndrome` | Revision remains in finalized graph; defer from canonical graph apply. |
| `claim-carpal-tunnel-syndrome-postoperative` | `propose_educational_claim` | Human `APPROVE_WITH_REVISION` | `carpal-tunnel-syndrome` | Revision remains in finalized graph; defer from canonical graph apply. |
| `claim-carpal-tunnel-syndrome-testing` | `propose_educational_claim` | Human `APPROVE_WITH_REVISION` | `carpal-tunnel-syndrome` | Revision remains in finalized graph; defer from canonical graph apply. |
| `claim-carpal-tunnel-syndrome-treatment-options` | `propose_educational_claim` | Human `APPROVE_WITH_REVISION` | `carpal-tunnel-syndrome` | Revision remains in finalized graph; defer from canonical graph apply. |
| All 8 `dp-carpal-tunnel-syndrome-*` decision points | `propose_decision_point` | Human `APPROVE_WITH_REVISION`; attending-review route | Their named subject entities | Revisions remain in finalized graph; defer from canonical graph apply because this lifecycle has no decision-point persistence target. |

## Downstream changes authorized by this reconciliation

1. Add explicit `REJECT` decisions for the three overlay-created graph
   fingerprints to the existing final review ledger.
2. Remove the rejected entity and two relationships from the normalized
   post-review input so finalization cannot reintroduce them.
3. Limit the canonical staging proposal packet to supported canonical entities,
   canonical relationships, and its curriculum bridge. Claims and decision
   points remain finalized reviewed artifacts but are not proposal rows for this
   apply.

No ontology type, predicate, identity, or replacement relationship is added.
