# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:45:00.555Z

**Items requiring human judgment:** 13
**Auto-curated (low-risk):** 163

Everything else was classified and justified by the first-pass curator.

## rel|distal-ulna-fracture|differential_for|distal-radius-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** distal-ulna-fracture -[differential_for]-> distal-radius-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|distal-ulna-fracture|differential_for|distal-radius-fracture

**Rationale:**
- Rule: default_human_review

## rel|distal-ulna-fracture|differential_for|druj-instability

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** distal-ulna-fracture -[differential_for]-> druj-instability
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|distal-ulna-fracture|differential_for|druj-instability

**Rationale:**
- Rule: default_human_review

## rel|distal-ulna-fracture|differential_for|ulnar-styloid-fracture

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** distal-ulna-fracture -[differential_for]-> ulnar-styloid-fracture
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|distal-ulna-fracture|differential_for|ulnar-styloid-fracture

**Rationale:**
- Rule: default_human_review

## rel|distal-ulna-fracture|treated_by|distal-ulna-fracture-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-ulna-fracture -[treated_by]-> distal-ulna-fracture-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-ulna-fracture|treated_by|distal-ulna-fracture-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## rel|distal-ulna-fracture-key-imaging-finding|indicates_treatment|distal-ulna-fracture-operative-treatment

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-ulna-fracture-key-imaging-finding -[indicates_treatment]-> distal-ulna-fracture-operative-treatment
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: distal-ulna-fracture-key-imaging-finding -[indicates_treatment]-> distal-ulna-fracture-operative-treatment

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-distal-ulna-fracture-mechanism

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-distal-ulna-fracture-mechanism

**Rationale:**
- Rule: l1_management_fact

## claim|claim-distal-ulna-fracture-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-distal-ulna-fracture-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-distal-ulna-fracture-cognitive-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-distal-ulna-fracture-cognitive-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-distal-ulna-fracture-clinical-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-distal-ulna-fracture-clinical-script

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-distal-ulna-fracture-imaging

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-distal-ulna-fracture-imaging

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-distal-ulna-fracture-rehab

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-distal-ulna-fracture-rehab

**Rationale:**
- Rule: default_human_review

## dp|dp-distal-ulna-fracture-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-distal-ulna-fracture-operative

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-distal-ulna-fracture-nonoperative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-distal-ulna-fracture-nonoperative

**Rationale:**
- Rule: decision_point_requires_attending

