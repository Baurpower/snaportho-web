# CTS Manufacturing Input Package

Package ID: `kg-input-cts-release-20260709-v1`
Evidence packet: `ev-packet-6de8724c-cts-focused-prep-20260709`
Status: prepared; all clinical content `needs_review`

## Entity proposals

Reuse canonical lookup first. “Create” is conditional on no type-compatible
canonical match.

| Slug | Type | Action | Source IDs | Review |
|---|---|---|---|---|
| `carpal-tunnel-syndrome` | `condition` | reuse | repo, AAOS | clinician |
| `median-nerve-compression` | `condition` | reuse sibling | repo | curator |
| `carpal-tunnel` | `anatomy_structure` | reuse | repo anatomy | curator |
| `median-nerve` | `anatomy_structure` | reuse | repo anatomy | curator |
| `transverse-carpal-ligament` | `anatomy_structure` | create after adjudication | anatomy pending | attending |
| `recurrent-motor-branch-median-nerve` | `anatomy_structure` | create | anatomy pending | attending |
| `palmar-cutaneous-branch-median-nerve` | `anatomy_structure` | create | anatomy pending | attending |
| `abductor-pollicis-brevis` | `anatomy_structure` | create/reuse | anatomy pending, AANEM | curator |
| `phalen-test` | `exam_maneuver` | create | provocative-2023 | clinician |
| `tinel-sign-carpal-tunnel` | `exam_maneuver` | create | provocative-2023 | clinician |
| `durkan-carpal-compression-test` | `exam_maneuver` | create | provocative-2023 | clinician |
| `electrodiagnostic-testing-carpal-tunnel-syndrome` | `diagnostic_test` | create | AAOS, AANEM | EDX specialist |
| `nerve-conduction-study` | `diagnostic_test` | create/reuse | AANEM | EDX specialist |
| `needle-electromyography` | `diagnostic_test` | create/reuse | AANEM | EDX specialist |
| `neutral-wrist-night-orthosis-for-cts` | `treatment_principle` | create; link generic splinting | AAOS | clinician |
| `corticosteroid-injection-for-cts` | `procedure` | create/reuse | AAOS | clinician |
| `open-carpal-tunnel-release` | `procedure` | create | AAOS | attending |
| `endoscopic-carpal-tunnel-release` | `procedure` | create | AAOS, comparative review | attending |
| `open-carpal-tunnel-approach` | `surgical_approach` | create | approach packet + technique pending | attending |
| `endoscopic-carpal-tunnel-approach` | `surgical_approach` | create | technique pending | attending |
| `pillar-pain-after-carpal-tunnel-release` | `complication` | create | pillar-pain-2024 | clinician |
| `iatrogenic-median-nerve-injury-after-carpal-tunnel-release` | `complication` | adjudicate/create | complications-2017 | attending |
| `incomplete-transverse-carpal-ligament-release` | `complication` | create | failed-release-2012 | attending |
| `persistent-carpal-tunnel-syndrome-after-release` | `condition` | create | failed-release-2012 | attending |
| `recurrent-carpal-tunnel-syndrome` | `condition` | create | failed-release-2012 | attending |
| `revision-carpal-tunnel-release` | `procedure` | create | failed-release-2012 | attending |
| `carpal-tunnel-release-postoperative-protocol` | `treatment_principle` | create | AAOS + postop packet | attending + therapist |

## Relationship proposals

The Relationship Builder must translate semantic intents to existing registered
predicates and valid endpoint types; no vocabulary expansion is authorized.

| Subject | Semantic relationship | Object | Source | Route |
|---|---|---|---|---|
| CTS | `involves_anatomy` | median nerve; carpal tunnel | repo | curator |
| carpal tunnel | `contains` | median nerve; FPL; FDS; FDP | repo + anatomy | anatomy review |
| recurrent/palmar cutaneous branches | `part_of` | median nerve | anatomy pending | attending |
| CTS | `examined_by` | Phalen; Tinel-at-wrist; Durkan | provocative-2023 | clinician |
| EDX | `evaluates` | CTS | AAOS/AANEM | EDX |
| NCS; needle EMG | `part_of` or approved component relation | EDX | AANEM | EDX |
| CTS | `differential_for` | cervical radiculopathy; proximal median neuropathy; polyneuropathy; cubital tunnel syndrome | clinical source pending | clinician |
| CTS | `treated_by` | night orthosis; injection; open release; endoscopic release | AAOS | attending for release |
| open/endoscopic release | `uses_approach` | matching approach | technique pending | attending |
| release/approach | `at_risk_structure` | median nerve; recurrent motor branch; palmar cutaneous branch; source-supported vessels/nerves | technique/anatomy pending | attending |
| release | `has_complication` | pillar pain; nerve injury; incomplete release; wound complication | reviews | attending |
| persistent CTS | source-supported causal/association relation | incomplete release and alternative diagnoses | failed-release | attending |
| recurrent CTS | `treated_by` | revision release only when indicated | failed-release | attending |
| release | approved postoperative relation | postoperative protocol | AAOS | attending |

## Atomic draft claims

Every claim below: `contentSource=generated_draft`,
`reviewStatus=needs_review`.

| ID | Atomic claim | Source | Reviewer |
|---|---|---|---|
| `cts-c01` | CTS is evaluated from a clinical pattern rather than one isolated maneuver. | AAOS; provocative-2023 | clinician |
| `cts-c02` | CTS-6 may be used instead of routine ultrasound or NCV/EMG for diagnosis in appropriate adults. | AAOS | clinician |
| `cts-c03` | MRI should not be part of the standard diagnostic workup for CTS. | AAOS | clinician |
| `cts-c04` | Phalen and Tinel findings have imperfect diagnostic accuracy and should be interpreted with other findings. | provocative-2023 | clinician |
| `cts-c05` | NCS and needle EMG are different components of electrodiagnostic evaluation. | AANEM | EDX |
| `cts-c06` | Needle EMG may help document axonal nerve pathology. | AANEM | EDX |
| `cts-c07` | Corticosteroid injection does not provide long-term CTS improvement, although short-term improvement may occur. | AAOS | clinician |
| `cts-c08` | Mini-open and endoscopic release have no demonstrated difference in long-term patient-reported outcomes. | AAOS | attending |
| `cts-c09` | Open and endoscopic release are distinct procedures with the shared decompression goal. | AAOS | attending |
| `cts-c10` | Technique selection should account for training, costs, risks, patient preference, and context. | AAOS | attending |
| `cts-c11` | Routine supervised therapy should not be prescribed after CTR for every patient. | AAOS | attending + therapist |
| `cts-c12` | Routine postoperative immobilization should not be used after CTR. | AAOS | attending |
| `cts-c13` | Pillar pain is a distinct recognized postoperative complication. | pillar-pain-2024 | clinician |
| `cts-c14` | Persistent symptoms and recurrent symptoms after release are distinct clinical states. | failed-release-2012 | attending |
| `cts-c15` | Incomplete release is a consideration in persistent symptoms but is not established by symptoms alone. | failed-release-2012 | attending |
| `cts-c16` | Return-to-work timing varies with technique, occupation, protocol, and patient factors. | AAOS; comparative review | therapist + attending |

## Draft decision points

| ID | Trigger → candidate action | Review route |
|---|---|---|
| `cts-dp01` | High clinical probability → use reviewed clinical tool; avoid reflex routine imaging/EDX | clinician |
| `cts-dp02` | Atypical pattern, uncertain localization/severity, or management-changing question → consider targeted EDX/ultrasound per reviewed pathway | EDX + clinician |
| `cts-dp03` | Appropriate nonoperative candidate → discuss neutral night orthosis and/or injection with time-horizon counseling | attending |
| `cts-dp04` | Persistent disabling symptoms after appropriate care, severe disease, motor deficit, or denervation → discuss release after confirmation | attending |
| `cts-dp05` | Open versus endoscopic choice → shared decision using anatomy, prior surgery, risks, resources, preference, and surgeon expertise | attending |
| `cts-dp06` | Inadequate endoscopic visualization/anomalous anatomy/safety concern → stop or convert under approved bailout protocol | attending; safety critical |
| `cts-dp07` | Persistent postoperative symptoms → reassess diagnosis, localization, severity, and release completeness before revision | attending |
| `cts-dp08` | Symptoms recur after improvement → evaluate recurrent CTS and alternate causes before revision | attending |
| `cts-dp09` | Postoperative neurologic, vascular, wound, or severe unexpected pain concern → prompt surgical assessment | attending; safety critical |

## Duplicate prevention and unresolved queue

- Perform exact slug, normalized label, alias, and type lookup before create.
- Treat snapshot copies of shared anatomy as reuse, never new entities.
- Block placeholder procedure/complication fingerprints.
- Block independent TCL/flexor-retinaculum creation until adjudicated.
- Block merge of open/endoscopic procedures or approaches.
- Block merge of NCS and needle EMG.
- Block merge of persistent CTS, recurrent CTS, and incomplete release.
- Queue the five unresolved identity groups from the adjudication report.

## Source IDs and product fixtures

Source IDs are those in the focused evidence packet. Product fixture IDs:
`cts-brobot-quick-01`, `cts-brobot-reason-01`, `cts-brobot-oite-01`,
`cts-brobot-patient-01`, `cts-brobot-mimic-01`, `cts-caseprep-open-01`,
`cts-caseprep-endoscopic-01`, `cts-curriculum-progression-01`,
`cts-extension-page-01`, and `cts-oite-distractor-01`.
