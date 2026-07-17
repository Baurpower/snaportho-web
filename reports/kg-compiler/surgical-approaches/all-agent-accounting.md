# Surgical Approaches — Complete Agent Accounting

Manufactured: 2026-07-08

The existing compiler assigned work and executed agents through the Knowledge
Factory orchestrator. Agents with no applicable work are recorded below.
Neighborhood QA executed through the existing independent auditor.

| Agent | Result | Reason |
|---|---|---|
| Anatomy Builder | No applicable work | Reused anatomy identities were seeded with hierarchy edges; no anatomy-prefixed missing-entity gap was assigned. |
| Clinical Entity Builder | No applicable work | No missing-entity gaps remained after seed manufacture. |
| Relationship Builder | Executed | Assigned the single remaining high gap (`orthopaedic-anatomy` root `part_of`); completed without emitting a safe automatic proposal (would invent a parent above the anatomy backbone). |
| Claim Builder | No applicable work | Twenty-eight claim drafts already covered L1 operative teaching content. |
| Decision Point Builder | No applicable work | Sixteen decision-point drafts already covered selection and safety routes. |
| Metadata Builder | No applicable work | No metadata gaps assigned. |
| Asset Linker | No applicable work | No Anki/Orthobullets/CasePrep mappings registered for this topic. |
| Provenance Builder | No applicable work | Evidence packet and proposal builder attached provenance to all 1155 proposals. |
| Duplicate Detector | Executed | Completed without error; staging apply reused existing anatomy/complication identities. |
| Conflict Resolver | Executed | Completed without error; zero relationship conflicts. |
| Quality Scorer | Executed | Completed without error. |
| Review Assistant | Executed | Routed all 1155 proposals through auto/human/expert review. |
| Publication Validator | Executed | Completed; publication remained blocked at maturity 5/7. |
| Neighborhood QA | Executed separately | `npm run kg:audit -- --topic surgical-approaches` completed with score 85 and NOT_READY status. |

Remaining automatic improvement: none. The single high gap requires human
judgment (do not invent an anatomy parent above the Orthopaedic Anatomy hub).
