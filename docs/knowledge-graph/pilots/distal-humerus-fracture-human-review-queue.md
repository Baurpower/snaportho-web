# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T21:51:32.776Z

**Items requiring human judgment:** 11
**Auto-curated (low-risk):** 64

Everything else was classified and justified by the first-pass curator.

## rel|distal-humerus-fracture|at_risk_structure|ulnar-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-humerus-fracture -[at_risk_structure]-> ulnar-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-humerus-fracture|at_risk_structure|ulnar-nerve

**Rationale:**
- Rule: high_risk_predicate

## rel|distal-humerus-fracture|at_risk_structure|median-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-humerus-fracture -[at_risk_structure]-> median-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-humerus-fracture|at_risk_structure|median-nerve

**Rationale:**
- Rule: high_risk_predicate

## rel|intra-articular-distal-humerus-fracture|indicates_treatment|distal-humerus-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** intra-articular-distal-humerus-fracture -[indicates_treatment]-> distal-humerus-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: intra-articular-distal-humerus-fracture -[indicates_treatment]-> distal-humerus-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|distal-humerus-fracture|treated_by|distal-humerus-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-humerus-fracture -[treated_by]-> distal-humerus-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-humerus-fracture|treated_by|distal-humerus-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|distal-humerus-fracture|treated_by|total-elbow-arthroplasty-trauma

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-humerus-fracture -[treated_by]-> total-elbow-arthroplasty-trauma
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-humerus-fracture|treated_by|total-elbow-arthroplasty-trauma

**Rationale:**
- Rule: high_risk_predicate

## rel|distal-humerus-orif|at_risk_structure|ulnar-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** distal-humerus-orif -[at_risk_structure]-> ulnar-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|distal-humerus-orif|at_risk_structure|ulnar-nerve

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-dh-ulnar-nerve

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-dh-ulnar-nerve

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-dh-tea-elderly

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-dh-tea-elderly

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-dh-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-dh-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-dh-orif

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-dh-orif

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-dh-tea

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-dh-tea

**Rationale:**
- Rule: decision_point_requires_attending

