# CTS Reviewer Routing

Prepared: 2026-07-09

| Route | Required reviewer | Scope | Cannot approve |
|---|---|---|---|
| `IDENTITY_CURATOR` | KG curator | aliases, type, ownership, reuse/create/deprecate, global component identity | clinical correctness |
| `CLINICAL_REVIEW` | hand clinician | definition, symptoms, exam, differential, nonoperative factual claims | operative safety |
| `EDX_SPECIALIST_REVIEW` | PM&R/neurology clinician experienced in EDX | NCS/EMG identity, use, limitations, severity systems | surgical indications |
| `ATTENDING_REVIEW` | hand-surgery attending | indications, approach choice, steps, endpoints, at-risk anatomy, conversion/bailout, complications, revision | schema changes |
| `REHAB_REVIEW` | hand therapist plus hand attending | therapy exceptions, activity progression, work guidance | universal timelines without evidence |
| `EDUCATOR_REVIEW` | orthopaedic educator plus relevant domain reviewer | OITE claims, traps, distractors, curriculum level | unreviewed clinical claims |
| `PRODUCT_QA` | product owner/QA | provenance filtering, mode/audience behavior, abstention, mapping | clinical certification |

## Mandatory blocks

- `treated_by`, `indicates_treatment`, operative, revision, and postoperative
  decision proposals cannot bypass attending review.
- Every `at_risk_structure` edge and branch-variation claim requires hand
  attending review.
- EDX thresholds/grades require named-system provenance and EDX review.
- Return-to-work dates require evidence context and combined rehab/attending
  review.
- OITE distractors that encode clinical facts require both educator and domain
  review.
- No reviewer route changes `needs_review` during this preparation pass.
