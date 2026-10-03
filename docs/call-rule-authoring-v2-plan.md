# Call Rule Authoring V2 — Implementation and Rollout Plan

## Implementation status (2026-10-03)

- Phase 0 is implemented: atomic replacement, protected system rules, complete Backup
  fallback preservation, and a verified pre-change backup.
- Phase 1 is implemented: the versioned six-panel document, lossless source recovery,
  explicit Buddy/progression/fallback relationships, and immutable draft revisions.
- Phase 2 is implemented against the sanitized real-rule fixture: a 365-day synthetic
  academic-year matrix compares complete source and projected evaluations and stores its
  passing report with every immutable draft. The existing evaluator remains the only
  scheduling engine.
- Phase 3 is implemented as an administrator-only read-only preview with provenance,
  compatibility status, and server-created draft revisions.
- The implementation audit also added the missing explicit administrator check to the
  AI-created-rule route; the database RPC retains its independent actor check.
- Rollout preflight confirmed the live Data API does not yet contain the transactional
  replacement RPC, policy revision table, draft RPC, or activation RPC. Deployment is
  held until authenticated database migration access is available; the application must
  not be deployed ahead of these migrations.
- Phase 4 controlled authoring is implemented for workload and spacing. Draft creation
  performs server-side normalization, compatibility checks, compilation, and the full
  parity matrix. Activation is an explicit, optimistic-locking database transaction;
  prior passing revisions remain reversible. Production use remains gated on deploying
  the migrations and completing a shadow-revision smoke test.

## Decision

Build the authoring redesign as a schema and UI layer over the existing compiled
`CallPolicy`. Do not introduce a second scheduling evaluator. The current policy engine
already represents the hard parts of the Residency rules: composable predicates,
eligibility tiers, service-month progression, cross-slot pairing, and conditional presence.

Production consumers and persisted rules remain unchanged until the compatibility and
parity gates below pass.

## Real-rule baseline

The design fixture is a sanitized snapshot of the production Residency rule set from
2026-10-03: 19 enabled rules across nine legacy types.

The future UI groups them into six authoring panels:

1. Call positions
2. Resident eligibility
3. Rotation availability
4. Monthly workload
5. Spacing and preferences
6. Buddy pathway

The fixture and compatibility audit are executable specifications. Any persisted field
without an explicit adapter is a release blocker.

## Canonical v2 concepts

### Slots

Slots own presentation and scheduling-position behavior: name, short label, color,
presence predicate, required predicate, workload accounting, and display order.

### Eligibility tiers

Each slot has ordered tiers. Tier 0 is preferred; higher values are controlled fallbacks.
Eligibility tiers are additive, which models the PGY-1 progression exception without
overriding or weakening the normal Primary pool.

### Predicates

Predicates are typed and composable: PGY, rotation ID, normalized service token,
service-month index, weekday, availability, and another slot's occupant.

### Relationships

Relationships explicitly link slots. Buddy-to-Primary pairing is stored once and drives
both Buddy presence and assignment validation. It is not duplicated in slot visibility.

### Aggregates and objectives

Monthly targets, rotation caps, spacing, weekend limits, and fairness are aggregate
constraints. They declare period, scope, measurement, severity, and bounds rather than
being encoded as ad hoc rule types.

### Provenance and revisions

Every policy document has a schema version and immutable revision. Every write path,
including maintenance scripts, must use the revision service so optimistic locking cannot
be bypassed.

## Migration transformations

- Merge `required_daily_call_slots` into each slot's single required predicate.
- Replace Buddy `slotCondition.pgyYears` with the Buddy-to-Primary relationship.
- Convert PGY call-pool rows into slot eligibility tiers.
- Encode second-service-month PGY-1 Primary eligibility as an additional tier.
- Move Backup fallback PGYs and label into its explicit fallback tier.
- Combine the two Oncology caps into one scoped workload policy with weekday/weekend
  branches.
- Combine the four PGY load rows into one workload matrix.
- Convert blocked rotations into a single eligibility exclusion.
- Convert Foot & Ankle weekday avoidance into a soft scoring constraint.
- Rename Buddy `requiredDaysPerMonth` to `maxWeekendsPerEligibleResidentMonth` while
  retaining a legacy adapter.

## Delivery phases

### Phase 0 — Current-system safety

- Register Backup fallback fields in the current slot schema and round-trip tests.
- Ensure all 19 rules survive load/save unchanged.
- Route scripts through revision-aware persistence.

### Phase 1 — Versioned document and adapters

- Define `ProgramCallPolicyDocumentV2` using the existing policy primitives.
- Implement pure legacy-to-v2 and v2-to-compiled-policy adapters.
- Preserve legacy IDs as source references for audit and rollback.
- Do not write migrated documents yet.

### Phase 2 — Parity harness

- Evaluate legacy and v2 policies for every resident/date/slot across an academic year.
- Compare presence, requiredness, eligibility tier, hard blocks, warnings, pairings, and
  aggregate-limit results.
- Add generator determinism and feasibility comparisons over representative months.

### Phase 3 — Read-only preview

- Render the six-panel UI from the v2 projection while legacy rules remain authoritative.
- Display plain-language explanations and “why eligible?” traces.
- Show consolidation warnings and the exact legacy sources behind each policy.

### Phase 4 — Controlled authoring

- Enable edits one panel at a time, starting with workload and spacing.
- Save a new immutable revision, compile it, and run feasibility checks before activation.
- Require explicit confirmation for changes that introduce new hard conflicts.

### Phase 5 — Cutover and cleanup

- Make the v2 document authoritative after parity and shadow-write soak.
- Keep a reversible legacy export for at least one release cycle.
- Remove legacy adapters only after production revisions no longer depend on them.

## Required test gates

1. All real persisted rule types and configuration keys have adapters.
2. All 19 rules round-trip without losing a value.
3. PGY-1 is Buddy-eligible only in configured service months.
4. PGY-1 becomes Primary-eligible at the configured service-month threshold.
5. Backup chooses PGY-5 before the PGY-4 fallback.
6. Buddy is capped at two weekends and pairs with PGY-4 or PGY-5.
7. Oncology allows zero weekday and at most one weekend Primary assignment.
8. Blocked rotations, spacing, and Foot & Ankle preferences retain current behavior.
9. Legacy and v2 evaluation produce zero unexplained differences across an academic year.
10. Failed activation leaves the prior policy revision active.

## Go/no-go rule

Do not enable v2 writes until all blockers are zero, every parity difference is reviewed,
and the current Backup fallback round-trip defect is fixed. Warnings caused by intentional
source consolidation are acceptable only when the resulting behavior is proven identical.
