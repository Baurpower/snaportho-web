# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:40:11.328Z

**Items requiring human judgment:** 8
**Auto-curated (low-risk):** 62

Everything else was classified and justified by the first-pass curator.

## rel|patella-fracture|uses_fixation|tension-band-fixation

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** patella-fracture -[uses_fixation]-> tension-band-fixation
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|patella-fracture|uses_fixation|tension-band-fixation

**Rationale:**
- Rule: high_risk_predicate

## rel|patella-fracture|treated_by|patella-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** patella-fracture -[treated_by]-> patella-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|patella-fracture|treated_by|patella-orif

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-pat-extensor-continuity

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pat-extensor-continuity

**Rationale:**
- Rule: l1_management_fact

## claim|claim-pat-extensor-lag-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pat-extensor-lag-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-pat-nonoperative-displaced

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pat-nonoperative-displaced

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-pat-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pat-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-pat-extensor-orif

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-pat-extensor-orif

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-pat-nonoperative-stable

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-pat-nonoperative-stable

**Rationale:**
- Rule: decision_point_requires_attending

