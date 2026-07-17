# Knowledge Graph Production Architecture Audit

Audit date: 2026-07-16

## Source-of-truth layers

| Layer | Current structures | Production role |
|---|---|---|
| Canonical graph | `canonical_entities`, `canonical_relationships`, `curriculum_node_entities`, `educational_claims`, `decision_points` | Durable graph truth. The beta activation does not update these tables. |
| Provenance and governance | `ontology_provenance_records`, `ontology_governance_actions`, canonical review/provenance columns | Durable review, lineage, and source state. Existing provenance rows are sparse, so proposal evidence remains a release trace but high-risk edges require direct complete support. |
| Proposal and staging | `kg_automation_proposals`, `kg_proposal_batch_memberships` | Auditable manufacturing history, exact batch membership, apply disposition, and canonical target linkage. Products must not read these tables. |
| Neighborhood lifecycle | `reports/kg-scaling/vertical-completion-queue.json` plus strict database-verification reports under `reports/kg-verticals/` | Repository ledger for staged, blocked, and verified neighborhoods. It is an input to release construction, not a product query source. |
| Review queues | Human-review Markdown/JSON under `docs/knowledge-graph/pilots/`, `reports/kg-audits/`, and `reports/kg-compiler/` | Later curator and attending upgrades. Pending review alone does not block structurally valid beta objects. |
| Existing product paths | BroBot currently uses educational question/card mappings such as `question_canonical_entity_links`; no product-facing active-release KG RPC existed | The new overlay is the sole broad KG product path. |

## Existing controls

- Canonical entities have unique active slugs and explicit status/review state.
- Canonical relationships have unique active semantic triples, lifecycle state, review state, and provenance state.
- Proposal fingerprints and proposal/batch uniqueness provide deterministic manufacturing identity.
- Service-role-only mutation scripts already use environment and staging guards.
- No existing KG feature flag controls a broad release. The release row, neighborhood lifecycle, object publication status, authenticated RPC grants, and RLS policies form the activation gate.
- Before this migration there were no production-overlay release tables, active-release RPCs, or soft rollback state for the broad graph.

## Smallest safe production architecture

The selected architecture is an additive overlay:

1. `kg_production_releases` records immutable manifest identity and activation/rollback state.
2. `kg_production_neighborhoods` records release-scoped full or partial neighborhood coverage.
3. `kg_production_objects` references each canonical object once per release and carries publication, review, provenance, risk, and verification metadata.
4. `kg_production_neighborhood_objects` reconstructs neighborhood membership without duplicating canonical content.
5. `kg_production_exclusions` preserves exact object-level exclusion reasons.
6. Authenticated security-definer RPCs expose only active release rows.
7. `kg_graph_feedback_events` and `kg_graph_feedback_signals` capture privacy-minimized product feedback and auditable normalized improvement signals.

The overlay does not duplicate or rewrite clinical content. A soft rollback hides release, neighborhood, and object rows while leaving canonical records, proposal history, and pending reviews unchanged.

## Release and rollback tooling

- Migration: `supabase/migrations/20260716_040000_kg_beta_production_release.sql`
- Manifest, dry-run, activation, verification, rollback, and smoke runner: `scripts/kg-full-beta-release.ts`
- Guarded migration helper: `scripts/apply-kg-beta-production-migration.ts`
- Shared application reads: `src/lib/education/kg-production.ts`
- Shared feedback submission and privacy minimization: `src/lib/education/kg-feedback.ts`

The exact production write remains blocked until explicit approval of the immutable manifest hash.
