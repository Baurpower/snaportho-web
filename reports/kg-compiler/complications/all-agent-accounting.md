# Complications — Complete Agent Accounting

Manufactured: 2026-07-08

The existing compiler assigned work and executed agents through the Knowledge
Factory orchestrator. Agents with no applicable work are recorded below as
required. Neighborhood QA executed through the existing independent auditor.

| Agent | Result | Reason |
|---|---|---|
| Anatomy Builder | No applicable work | Iteration 2 seed already included reused anatomy cross-refs for procedure shape coverage; gap analysis assigned no anatomy-prefixed entity gap. |
| Clinical Entity Builder | No applicable work (iteration 2) | After anatomy/relationship seed closure, no missing-entity gaps remained. Iteration 1 had executed this agent against procedure anatomy gaps before seed closure. |
| Relationship Builder | Executed | Assigned remaining medium `uses_approach` gaps; completed without error and emitted no safe automatic proposal (approach identities must come from Surgical Approaches, not invented here). |
| Claim Builder | No applicable work | Twenty-four claim drafts already covered L1 teaching content; gap analysis assigned no claim gap. |
| Decision Point Builder | No applicable work | Eighteen decision-point drafts already covered time-sensitive and management-changing routes; gap analysis assigned no decision-point gap. |
| Metadata Builder | No applicable work | Seed proposals passed metadata validation; gap analysis assigned no metadata gap. |
| Asset Linker | No applicable work | No registered Anki, Orthobullets, or CasePrep mappings were available for this cross-cutting topic (`COMPLICATIONS_ASSET_COUNTS` = 0). |
| Provenance Builder | No applicable work | Evidence packet and proposal builder attached provenance to all 362 merged proposals; no additional provenance work was assigned. |
| Duplicate Detector | Executed | Completed without error; staging apply reused 40+ existing identities rather than minting duplicates. |
| Conflict Resolver | Executed | Completed without error; no relationship conflicts remained. |
| Quality Scorer | Executed | Completed without error. |
| Review Assistant | Executed | Routed all 362 proposals through auto/human/expert review. |
| Publication Validator | Executed | Completed; publication remained blocked at maturity 5/7. |
| Neighborhood QA | Executed separately | `npm run kg:audit -- --topic complications` completed with score 84 and NOT_READY status. |

Compiler execution details remain canonical in `agent-execution-report.json`.
Iteration 1 had also executed Clinical Entity Builder (10 proposals) before
procedure anatomy edges were closed in the seed and recompiled.
