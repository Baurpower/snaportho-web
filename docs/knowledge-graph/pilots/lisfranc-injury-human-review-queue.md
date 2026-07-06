# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:50:38.255Z

**Items requiring human judgment:** 9
**Auto-curated (low-risk):** 61

Everything else was classified and justified by the first-pass curator.

## rel|lisfranc-displacement|indicates_treatment|lisfranc-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** lisfranc-displacement -[indicates_treatment]-> lisfranc-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: lisfranc-displacement -[indicates_treatment]-> lisfranc-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|lisfranc-injury|treated_by|lisfranc-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** lisfranc-injury -[treated_by]-> lisfranc-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|lisfranc-injury|treated_by|lisfranc-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|lisfranc-injury|treated_by|lisfranc-nonoperative-immobilization

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** lisfranc-injury -[treated_by]-> lisfranc-nonoperative-immobilization
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|lisfranc-injury|treated_by|lisfranc-nonoperative-immobilization

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-lisfranc-midfoot-stability

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-lisfranc-midfoot-stability

**Rationale:**
- Rule: l1_management_fact

## claim|claim-lisfranc-missed-sprain-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-lisfranc-missed-sprain-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-lisfranc-stable-nonop-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-lisfranc-stable-nonop-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-lisfranc-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-lisfranc-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-lisfranc-unstable-orif

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-lisfranc-unstable-orif

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-lisfranc-stable-immobilization

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-lisfranc-stable-immobilization

**Rationale:**
- Rule: decision_point_requires_attending

