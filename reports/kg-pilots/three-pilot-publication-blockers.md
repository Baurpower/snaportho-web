# Three-Pilot Publication Blockers

Generated: 2026-07-05T21:10:29.557Z

Publication remains blocked for all pilots until true clinical/attending review.

## Ankle Fracture

- Compiler ready: **no** (Level 5/7)
- Factory ready: **no** (Level 4)
- Staging canonical entities in DB: **19** (tagged `staging_apply`, not clinically verified)

### Compiler blockers

- 22 proposals still awaiting human review
- 16 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 10 critical/high ontology gaps remain unresolved

### Factory blockers

- 58 proposals still awaiting human review
- Insufficient relationship metadata on essential edges

### Remaining work (compiler)

- [high] Ankle ORIF missing outbound at_risk_structure (0/1).
- [high] Ankle Fracture missing outbound at_risk_structure (0/1).
- [high] Ankle Fracture missing outbound treated_by (0/1).
- [high] Ankle Fracture has 0/3 L1 claims.
- [critical] Ankle Fracture has 0/1 decision points.
- [critical] Ankle Fracture missing decision point pattern: operative_indication.

## Compartment Syndrome

- Compiler ready: **no** (Level 5/7)
- Factory ready: **no** (Level 5)
- Staging canonical entities in DB: **14** (tagged `staging_apply`, not clinically verified)

### Compiler blockers

- 17 proposals still awaiting human review
- 9 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 14 critical/high ontology gaps remain unresolved

### Factory blockers

- 10 proposals still awaiting human review
- 3 items require attending review

### Remaining work (compiler)

- [high] Leg Fasciotomy missing outbound at_risk_structure (0/1).
- [high] Compartment Syndrome neighborhood has 0/1 classification_system entities.
- [high] Compartment Syndrome neighborhood has 0/1 imaging_finding entities.
- [critical] Compartment Syndrome missing outbound injured_in (0/1).
- [high] Compartment Syndrome missing outbound at_risk_structure (0/1).
- [critical] Compartment Syndrome missing outbound has_classification (0/1).

## Distal Radius Fracture

- Compiler ready: **no** (Level 5/7)
- Factory ready: **no** (Level 4)
- Staging canonical entities in DB: **14** (tagged `staging_apply`, not clinically verified)

### Compiler blockers

- 24 proposals still awaiting human review
- 20 items require attending review
- Insufficient relationship metadata on essential edges
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 11 critical/high ontology gaps remain unresolved

### Factory blockers

- 16 proposals still awaiting human review
- 9 items require attending review
- Insufficient relationship metadata on essential edges

### Remaining work (compiler)

- [high] Distal Radius Fracture neighborhood has 0/1 classification_system entities.
- [high] Distal Radius Fracture missing outbound at_risk_structure (0/1).
- [critical] Distal Radius Fracture missing outbound has_classification (0/1).
- [high] Distal Radius Fracture missing outbound has_grade (0/1).
- [high] Distal Radius Fracture missing outbound treated_by (0/1).
- [high] Distal Radius Fracture has 0/3 L1 claims.

## Global gates (all pilots)

- No verified medical claims in staging consumption paths
- Safety-critical relationships and DPs await attending review
- Product traversal (Prepare/BroBot) not enabled
- Staging rows tagged `clinical_verification: false`

