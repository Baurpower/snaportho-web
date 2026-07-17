# Postoperative Protocols — All Agent Accounting

Manufactured: 2026-07-08 (America/Los_Angeles)

| Agent | Result | Reason / work performed |
|---|---|---|
| Anatomy Builder | No applicable work | Existing Orthopaedic Anatomy identities are consumed; no replacement anatomy was assigned. |
| Clinical Entity Builder | Executed | Completed assigned entity-gap pass; 62 entity proposals were already present in the manufacturing spec. |
| Relationship Builder | Executed | Completed assigned relationship pass; 16 canonical-predicate relationships validated. |
| Claim Builder | No applicable work | The evidence packet exposed no claim-builder assignment beyond the 21 supplied generated drafts; drafts remain review-gated. |
| Decision Point Builder | No applicable work | Ten decision-point drafts were supplied and review-gated; the planner assigned no additional automatic work. |
| Metadata Builder | No applicable work | All 62 entity proposals include neighborhood metadata; every protocol records required patient, construct, procedure, and clinical context fields. |
| Asset Linker | No applicable work | No applicable Anki or Orthobullets mappings were available. |
| Provenance Builder | No applicable work | Evidence packet `ev-packet-914f950b` attached available provenance; no additional automatic provenance work was assigned. |
| Duplicate Detector | Executed | Completed with zero unresolved duplicate proposals; nine existing procedure/complication identities were reused. |
| Conflict Resolver | Executed | Completed with zero conflicts. |
| Quality Scorer | Executed | Completed; independent neighborhood QA score 78/100 and factory maturity 5/7. |
| Review Assistant | Executed | Reviewed all 110 proposals: 79 auto-approved, 21 human review, 10 attending review. |
| Publication Validator | Executed | Correctly blocked publication pending review, canonical staging availability, and high-priority gaps. |
| Neighborhood QA | Executed | `npm run kg:audit -- --topic postoperative-protocols`; all expected reports present, publication `NOT_READY`. |

All seven agents assigned by the work planner were actually executed. Agents with no assignment are explicitly recorded as having no applicable work.
