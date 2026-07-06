# Agent Contract Summary

Topic: **patellar-instability**
Framework: **1.0.0**
Generated: 2026-07-05T22:46:37.929Z

## Registry

- Registered agents: 13
- Gap-resolution assignments: 3
- Unmet gap capabilities: 0

## Assignments

- **Clinical Entity Builder** (clinical-entity-builder): 2 gap(s) [missing_entity] — handles_gap_kind:missing_entity; generic_fallback
- **Relationship Builder** (relationship-builder): 4 gap(s) [missing_relationship] — handles_gap_kind:missing_relationship
- **Asset Linker** (asset-linker): 2 gap(s) [missing_asset_link] — handles_gap_kind:missing_asset_link

## Contract guarantees

- Every agent declares id, version, ontology version, capabilities, gap types, proposal types, inputs, safety limits, and escalation rules.
- Every agent output includes proposal envelopes, confidence breakdown, validation, review recommendation, warnings, errors, metrics, and audit trail.
- Capability matching is prefix-opt-in; generic fallback agents run last.

## Remaining before parallel agents

- All current ankle-fracture gaps map to registered reference adapters.
- Stage 5 agent orchestration is executable; gap agents resolve pilot proposals deterministically.
- Full autonomous content generation (beyond pilot proposal matching) remains future work.

