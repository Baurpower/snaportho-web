# CTS Final Identity and Vocabulary Resolution

Mode: report-only final-readiness review  
Production mutation: none  
Clinical review status: already complete; not reopened

## Overlay vocabulary validation

| Requested predicate | Canonical predicate | Action | Reason |
|---|---|---|---|
| `evaluated_by` | none applied | Omit relationship; encode failed-release evaluation as decision-point metadata | `evaluated_by` is not present in `PREDICATE_REGISTRY`. The requested object, `failed-release-evaluation-pathway`, is better modeled as decision-point workflow metadata than as a canonical entity. No safe existing canonical predicate expresses "condition is evaluated by pathway" without creating a new workflow entity type. |
| `may_lead_to` | none applied for current overlay | Omit relationship; encode revision as possible outcome inside failed-release decision points | `may_lead_to` is not present in `PREDICATE_REGISTRY`. `indicates_treatment` can express "pattern indicates treatment" only when the subject is a canonical condition/classification/finding and the indication is verified. The current post-review decision intentionally rejected unconditional persistent/recurrent direct treatment edges, so no relationship is applied. |

### Predicate extension disposition

No predicate extension is required for this dry-run normalized input because the pathway can be represented through existing decision-point structures. If a future workflow/pathway entity type is introduced, the smallest extension would be:

| Predicate | Subject type | Object type | Scope |
|---|---|---|---|
| `evaluated_by` | `condition` | future `clinical_pathway` or `decision_workflow` | Condition routed through named evaluation pathway. |
| `may_lead_to` | future `clinical_pathway`, `classification_grade`, or `imaging_finding` | `procedure` or `treatment_principle` | Non-deterministic pathway outcome; weaker than `indicates_treatment`. |

These are not applied here.

## Overlay entity identity resolution

| Requested slug | Final disposition | Canonical substitution / entity proposal |
|---|---|---|
| `failed-release-evaluation-pathway` | Omitted as canonical entity | Use decision points `dp-carpal-tunnel-syndrome-persistent-symptoms` and `dp-carpal-tunnel-syndrome-recurrent-symptoms` with `workflow_label: "Failed release evaluation"` metadata. |
| `diagnostically-confirmed-recurrent-compression` | Omitted as canonical entity | Use `recurrent-carpal-tunnel-syndrome` plus decision-point metadata `diagnostic_confirmation_required: true`; do not create a separate condition unless a later evidence packet defines it as a durable concept. |

### Entity proposal table

| Slug | Display name | Entity type | Scope note | Aliases | Owning neighborhood | Reason needed |
|---|---|---|---|---|---|---|
| `failed-release-evaluation-pathway` | Failed Release Evaluation Pathway | none; decision-point metadata | Workflow label for reassessing persistent or recurrent symptoms after CTR. | failed CTR workup; post-release evaluation | CTS decision-point overlay | Not needed as a canonical entity for staging; decision-point metadata preserves intent without vocabulary expansion. |
| `diagnostically-confirmed-recurrent-compression` | Diagnostically Confirmed Recurrent Compression | none; metadata on recurrent CTS decision point | Confirmation state before considering revision. | confirmed recurrent CTS; recurrent median nerve compression after release | CTS decision-point overlay | Not needed as a canonical entity for staging; use `recurrent-carpal-tunnel-syndrome` with confirmation metadata. |

## Five identity adjudication groups

| Group | Disposition | Canonical identity | Aliases | Scope boundary | Ownership | Migration/substitution required | Blocks staging? |
|---|---|---|---|---|---|---|---|
| Transverse carpal ligament versus flexor retinaculum | ALIAS_ONLY | `transverse-carpal-ligament` | TCL; flexor retinaculum at carpal tunnel | Use `transverse-carpal-ligament` for the released structure in CTR. Do not create a separate broad wrist `flexor-retinaculum` entity unless an anatomy packet needs proximal/distal retinacular scope. | Hand/wrist anatomy | Substitute CTS release language to TCL; keep flexor retinaculum as alias/scope note only. | No |
| Generic carpal tunnel approach lifecycle versus named open/endoscopic approaches | PARENT_CHILD | `carpal-tunnel-approach` as parent; `open-carpal-tunnel-approach` and `endoscopic-carpal-tunnel-approach` as children | palmar approach; endoscopic portal approach | Generic approach is an organizing parent only, not a default operative pathway. Named approaches attach to named procedures. | Surgical approaches + CTS | Preserve named `uses_approach` edges; do not encode default approach. | No |
| Median neuropathy versus iatrogenic median nerve injury after CTR | KEEP_SEPARATE | `median-neuropathy` and future/narrow `iatrogenic-median-nerve-injury-after-carpal-tunnel-release` | median nerve dysfunction; median nerve injury during CTR | Median neuropathy is a broad neurologic condition/complication concept; iatrogenic injury is a procedure-related complication and should not be merged with CTS itself. | Complications + CTS | Do not alias nerve injury to median neuropathy; do not create injury entity in this stage unless supported by complication packet. | No |
| EDX, NCS, and needle EMG identities | CROSS_NEIGHBORHOOD_REFERENCE | `electrodiagnostic-testing-carpal-tunnel-syndrome`; `nerve-conduction-study`; `needle-electromyography` | EDX; NCS; NCV; needle EMG | CTS-specific EDX wrapper is the user-facing diagnostic concept. NCS and needle EMG are reusable diagnostic-test components owned by a diagnostics/electrodiagnostic neighborhood. Direct CTS `tested_by needle-electromyography` edge remains rejected. | Diagnostics/EDX owns global NCS/EMG; CTS references wrapper and NCS | Keep `tested_by electrodiagnostic-testing-carpal-tunnel-syndrome` and `tested_by nerve-conduction-study`; omit direct needle EMG edge until component predicate exists. | No |
| Persistent versus recurrent CTS definitions | KEEP_SEPARATE | `persistent-carpal-tunnel-syndrome-after-release`; `recurrent-carpal-tunnel-syndrome` | persistent symptoms after CTR; recurrent symptoms after CTR | Persistent = failure of symptoms to adequately improve after release, no fixed interval and no required incomplete-release proof. Recurrent = return of CTS symptoms after documented postoperative improvement, no required symptom-free interval. | CTS | Update decision-point definitions; reject direct persistent/recurrent `treated_by revision` edges. | No |

## Residual identity caveat

The identity decisions above are sufficient for another report-only dry run and remove the prior clinical ambiguity. They do not by themselves prove staged-manufacturing readiness because source-record mapping and compiler overlay-ingestion remain unresolved engineering blockers.
