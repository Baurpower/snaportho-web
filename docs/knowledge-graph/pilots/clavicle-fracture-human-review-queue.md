# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T21:49:12.905Z

**Items requiring human judgment:** 9
**Auto-curated (low-risk):** 61

Everything else was classified and justified by the first-pass curator.

## rel|clavicle-fracture|treated_by|clavicle-sling-immobilization

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** clavicle-fracture -[treated_by]-> clavicle-sling-immobilization
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|clavicle-fracture|treated_by|clavicle-sling-immobilization

**Rationale:**
- Rule: high_risk_predicate

## rel|clavicle-fracture|treated_by|clavicle-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** clavicle-fracture -[treated_by]-> clavicle-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|clavicle-fracture|treated_by|clavicle-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|midshaft-clavicle-fracture-pattern|indicates_treatment|clavicle-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** midshaft-clavicle-fracture-pattern -[indicates_treatment]-> clavicle-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: midshaft-clavicle-fracture-pattern -[indicates_treatment]-> clavicle-orif

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-clav-midshaft-common

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-clav-midshaft-common

**Rationale:**
- Rule: l1_management_fact

## claim|claim-clav-sc-joint-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-clav-sc-joint-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-clav-operative-shift

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-clav-operative-shift

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-clav-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-clav-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-clav-operative-orif

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-clav-operative-orif

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-clav-nonoperative-sling

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-clav-nonoperative-sling

**Rationale:**
- Rule: decision_point_requires_attending

