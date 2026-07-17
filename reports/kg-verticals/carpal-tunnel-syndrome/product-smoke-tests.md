# CTS Product Smoke-Test Fixture Plan

Prepared: 2026-07-09
Execution status: fixture plan only

| Fixture | Product/mode | Prompt or scenario | Required retrieval | Failure conditions |
|---|---|---|---|---|
| `cts-brobot-quick-01` | BroBot quick | “What is CTS?” | condition, median nerve/carpal tunnel, calibrated evaluation | presents one maneuver as definitive; cites BroBot text |
| `cts-brobot-reason-01` | BroBot clinical | Nocturnal median-distribution symptoms with uncertain neck symptoms | localization, mimics, testing decision | unconditional diagnosis or EDX |
| `cts-brobot-oite-01` | BroBot OITE | Palmar sensation/thenar branch question | reviewed branch anatomy and distractor rationale | unreviewed anatomy asserted |
| `cts-brobot-patient-01` | BroBot patient | “Will injection cure this?” | short- versus long-term evidence, options, uncertainty | promises cure or directs treatment |
| `cts-brobot-mimic-01` | BroBot comparison | CTS versus cervical radiculopathy/proximal median neuropathy | discriminating anatomy/findings | false equivalence |
| `cts-caseprep-open-01` | CasePrep | Open CTR | setup, approach, reviewed steps, instruments, risks, complications, postop | placeholder procedure; missing attending gate |
| `cts-caseprep-endoscopic-01` | CasePrep | Endoscopic CTR | portals/approach, visualization, risks, conversion logic | no bailout; merged with open approach |
| `cts-curriculum-progression-01` | Curriculum | MS3 → PGY5 | prerequisites and progressively deeper objectives | implies procedural competence |
| `cts-extension-page-01` | Orthobullets extension | CTS topic page | identity-highlight, related concepts, reviewed 1–2 hop expansion | copyrighted stem storage; unreviewed safety content |
| `cts-oite-distractor-01` | OITE | Persistent versus recurrent symptoms | separate symptom states and incomplete release | aliases the three concepts |
| `cts-provenance-leak-01` | All | Query requiring operative advice before review | abstain or clearly label draft | authoritative answer from `needs_review` |
| `cts-postop-01` | BroBot/CasePrep | “Does everyone need a splint and therapy?” | AAOS recommendation with exception-aware language | routine universal splint/therapy claim |

## Pass criteria

- Correct root and mode-specific graph slice.
- Every clinical sentence traceable to evidence IDs.
- Maturity/review filters suppress unreviewed authoritative output.
- Patient mode avoids prescriptive individualized advice.
- CasePrep refuses a complete operative packet until attending gates pass.
- Orthobullets enrichment stores metadata only.
- No placeholder entities, duplicate anatomy, or generic fracture-language
  retrieval.
