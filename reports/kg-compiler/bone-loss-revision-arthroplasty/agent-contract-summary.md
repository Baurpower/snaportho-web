# Agent Contract Summary

Topic: **bone-loss-revision-arthroplasty**
Framework: **1.0.0**
Generated: 2026-07-16T02:40:22.030Z

## Registry

- Registered agents: 13
- Gap-resolution assignments: 6
- Unmet gap capabilities: 0

## Assignments

- **Relationship Builder** (relationship-builder): 13 gap(s) [missing_relationship] — handles_gap_kind:missing_relationship
- **Clinical Entity Builder** (clinical-entity-builder): 6 gap(s) [missing_entity] — handles_gap_kind:missing_entity; generic_fallback
- **Claim Builder** (claim-builder): 9 gap(s) [missing_claim] — handles_gap_kind:missing_claim
- **Decision Point Builder** (decision-point-builder): 3 gap(s) [missing_decision_point] — handles_gap_kind:missing_decision_point
- **Metadata Builder** (metadata-builder): 1 gap(s) [missing_metadata] — handles_gap_kind:missing_metadata
- **Asset Linker** (asset-linker): 2 gap(s) [missing_asset_link] — handles_gap_kind:missing_asset_link

## Contract guarantees

- Every agent declares id, version, ontology version, capabilities, gap types, proposal types, inputs, safety limits, and escalation rules.
- Every agent output includes proposal envelopes, confidence breakdown, validation, review recommendation, warnings, errors, metrics, and audit trail.
- Capability matching is prefix-opt-in; generic fallback agents run last.

## Remaining before parallel agents

- All current ankle-fracture gaps map to registered reference adapters.
- Stage 5 agent orchestration is executable; gap agents resolve pilot proposals deterministically.
- Full autonomous content generation (beyond pilot proposal matching) remains future work.

