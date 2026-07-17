# CTS Review Resolution Report

Mode: dry-run overlay only  
Reviewer: `clinical_curator`  
Source queue: `carpal-tunnel-syndrome/ontology-human-review-queue.json`  
Original artifacts preserved: yes

## Final review counts

| Final decision | Count |
|---|---:|
| APPROVE | 19 |
| APPROVE_WITH_REVISION | 15 |
| REJECT | 8 |
| ESCALATE_TO_HUMAN | 0 |
| Total | 42 |

## Approvals

Nineteen proposals were approved without revision. These include core CTS exam/test/treatment and risk-anatomy relationships such as:

- `carpal-tunnel-syndrome tested_by phalen-test`
- `carpal-tunnel-syndrome tested_by durkan-carpal-compression-test`
- `carpal-tunnel-syndrome tested_by nerve-conduction-study`
- `carpal-tunnel-syndrome treated_by neutral-wrist-night-orthosis-for-cts`
- `carpal-tunnel-syndrome treated_by open-carpal-tunnel-release`
- `carpal-tunnel-syndrome treated_by endoscopic-carpal-tunnel-release`
- open/endoscopic/revision release `at_risk_structure median-nerve`
- open/endoscopic release `uses_approach` named approach

## Revisions applied

Fifteen proposals were approved with revision in the overlay:

- `claim-carpal-tunnel-syndrome-complications`: preserves distinct persistent, recurrent, incomplete-release, pillar-pain, and nerve-injury concepts without resolving the median-neuropathy/iatrogenic-injury identity issue.
- `claim-carpal-tunnel-syndrome-oite-trap`: removes any fixed recurrent-CTS interval.
- `claim-carpal-tunnel-syndrome-postoperative`: replaces informal "fracture-style immobilization" language with CTS-specific postoperative guidance.
- `claim-carpal-tunnel-syndrome-testing`: qualifies EDX use and avoids routine MRI/radiograph framing.
- `claim-carpal-tunnel-syndrome-treatment-options`: qualifies corticosteroid injection as short-term symptom relief and avoids open/endoscopic superiority.
- `dp-carpal-tunnel-syndrome-approach-choice`: applies `equivalent_named_options`; no default operative pathway.
- `dp-carpal-tunnel-syndrome-endoscopic-bailout`: applies `broad_stop_or_convert`; no mandatory conversion.
- `dp-carpal-tunnel-syndrome-nonoperative`: clarifies exclusions and injection time horizon.
- `dp-carpal-tunnel-syndrome-operative`: applies `expedited_non_emergent` for thenar weakness, atrophy, or denervation; persistent symptoms after failed nonoperative care remain routine surgical discussion.
- `dp-carpal-tunnel-syndrome-persistent-symptoms`: applies `no_fixed_interval`; incomplete release remains explanatory, not definitional.
- `dp-carpal-tunnel-syndrome-postoperative-escalation`: clarifies escalation to treating surgical team.
- `dp-carpal-tunnel-syndrome-recurrent-symptoms`: applies `improvement_no_fixed_interval`.
- `dp-carpal-tunnel-syndrome-testing`: narrows testing to targeted EDX and avoids routine imaging.
- `carpal-tunnel-syndrome at_risk_structure median-nerve`: corrected to `involves_anatomy`.
- `carpal-tunnel-syndrome treated_by corticosteroid-injection-for-cts`: retained with short-term symptom-relief guardrail.

## Rejections applied

Eight proposals were rejected:

- `carpal-tunnel-syndrome differential_for distal-radius-fracture`
- `carpal-tunnel-syndrome differential_for median-nerve-compression`
- `carpal-tunnel-syndrome differential_for trigger-finger`
- `carpal-tunnel-syndrome tested_by needle-electromyography`
- `endoscopic-carpal-tunnel-release uses_implant carpal-tunnel-release-instrument-set`
- `open-carpal-tunnel-release uses_implant carpal-tunnel-release-instrument-set`
- `persistent-carpal-tunnel-syndrome-after-release treated_by revision-carpal-tunnel-release`
- `recurrent-carpal-tunnel-syndrome treated_by revision-carpal-tunnel-release`

Rejected revision relationships are replaced in the overlay by failed-release evaluation pathway relationships, but those new predicates/entities must be checked against the canonical vocabulary before staged manufacture.

## Escalations resolved

All seven prior human exception decisions were resolved:

| Prior exception | Final resolution |
|---|---|
| Open versus endoscopic release model | `equivalent_named_options` |
| Endoscopic bailout strategy | `broad_stop_or_convert` |
| Operative indication urgency | `expedited_non_emergent` |
| Persistent CTS definition | `no_fixed_interval` |
| Recurrent CTS definition | `improvement_no_fixed_interval` |
| Persistent CTS revision relationship | `decision_point_only` |
| Recurrent CTS revision relationship | `requires_diagnostic_confirmation` |

## Remaining blockers

- The overlay uses requested relationship predicates `evaluated_by` and `may_lead_to`; these must be verified against the existing predicate registry before staged manufacture.
- The overlay introduces `failed-release-evaluation-pathway` and `diagnostically-confirmed-recurrent-compression`; these identities must be checked or represented through existing vocabulary before staged manufacture.
- Five identity adjudication groups remain open from the preparation package: TCL/flexor retinaculum, approach lifecycle, median neuropathy versus iatrogenic injury, global EMG/NCS component ownership, and persistent/recurrent temporal definitions as canonical identity rules.
- Source-record mapping reconciliation remains incomplete for Anki and Orthobullets counts.
- Ontology gap report still contains 25 gaps, including 14 critical/high gaps.
- Claims and decision points remain draft/needs_review, not verified clinical truth.
- No database-backed approved canonical entities were loaded in this dry run.

No staging, persistence, database write, publication, or certification action was performed.
