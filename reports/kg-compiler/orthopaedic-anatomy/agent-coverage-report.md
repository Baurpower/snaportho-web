# Orthopaedic Anatomy — Agent Coverage

Manufactured: 2026-07-08

| Agent | Result | Work/output |
|---|---|---|
| Anatomy Builder | No applicable work | Canonical anatomy entities were supplied by the evidence-backed manufacturing seed; no `missing_entity` anatomy gap was assigned. |
| Clinical Entity Builder | No applicable work | This is an anatomy-root neighborhood and no non-anatomy `missing_entity` gap was assigned. |
| Relationship Builder | Executed | 46 gaps assigned; 94 emitted proposals (47 unique relationships after merge). |
| Claim Builder | No applicable work | Ten anatomy claims were already present in the proposal packet and the anatomy ontology rules produced no `missing_claim` assignment. |
| Decision Point Builder | No applicable work | Three safety decision points were already present; no `missing_decision_point` assignment was generated. |
| Metadata Builder | No applicable work | Required entity metadata was present; no `missing_metadata` assignment was generated. |
| Asset Linker | No applicable work | No source asset mappings were available, so no `missing_asset_link` assignment was generated. |
| Provenance Builder | Executed | One provenance gap assigned; provenance attached during merge/review. |
| Duplicate Detector | Executed | No unresolved duplicate proposals. |
| Conflict Resolver | Executed | No conflicts found. |
| Quality Scorer | Executed | Quality scoring completed. |
| Review Assistant | Executed | 420 proposals reviewed: 417 auto-approved and 3 attending review. |
| Publication Validator | Executed | Maturity 5/7; publication blocked. |
| Neighborhood QA | Executed | Independent audit completed with score 78/100 and no missing reports. |

The compiler assignment plan listed Anatomy Builder and Clinical Entity Builder
as dependencies of Relationship Builder, but assigned them no gap-resolution
work. The existing orchestrator therefore correctly produced no execution
entries for those zero-work dependencies.
