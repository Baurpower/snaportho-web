# Focused Evidence Packet: Carpal Tunnel Syndrome and Release

Packet ID: `ev-packet-6de8724c-cts-focused-prep-20260709`
Base generated packet: `ev-packet-6de8724c`
Prepared: 2026-07-09
Purpose: manufacturing input, not verified clinical truth

All candidate claims remain `needs_review`. This supplement combines the
deterministic repository packet with copyright-safe summaries of authoritative
external sources. It stores no Anki card text and no Orthobullets question
stems, answers, or explanations. BroBot-generated content is excluded.

## Source manifest

| ID | Source | Scope | Use and limitations |
|---|---|---|---|
| `cts-aaos-cpg-2024` | [AAOS Management of Carpal Tunnel Syndrome CPG](https://www.orthoguidelines.org/topic?id=1048&tab=all_guidelines) | Diagnosis, imaging, injection, release technique, postoperative therapy/immobilization/pain | Primary current guideline; adult CTS; recommendation strength must travel with claims |
| `cts-aanem-edx-2002` | [AANEM/AAN/AAPM&R EDX practice parameter](https://www.aanem.org/docs/default-source/documents/cts_reaffirmed.pdf?sfvrsn=1b4fc02f_1) | NCS and needle EMG roles | Authoritative but old; route current-use interpretation to EDX specialist |
| `cts-provocative-2023` | [Provocative-maneuver systematic review](https://pubmed.ncbi.nlm.nih.gov/37366626/) | Phalen, Tinel, single-test limitations | Supports combined assessment; pooled estimates should be versioned, not copied into generic claims |
| `cts-open-endoscopic-2020` | [RCT meta-analysis](https://pubmed.ncbi.nlm.nih.gov/32340621/) | Open versus endoscopic outcomes/complications | Comparative evidence; heterogeneity and technique/context matter |
| `cts-complications-2017` | [CTR complication systematic review](https://pubmed.ncbi.nlm.nih.gov/28459419/) | Nerve, vascular, scar complications | Supports complication inventory; not a technique mandate |
| `cts-pillar-pain-2024` | [Pillar-pain systematic review](https://pubmed.ncbi.nlm.nih.gov/38903842/) | Pillar pain and natural history | Supports distinct complication identity; incidence/time claims require reviewer |
| `cts-failed-release-2012` | [Failed CTR evaluation review](https://pubmed.ncbi.nlm.nih.gov/23026459/) | Persistence, recurrence, incomplete release, revision | Supports distinctions; proposed six-month definition remains attending-gated |
| `cts-repo-packet` | `reports/kg-evidence/carpal-tunnel-syndrome/evidence-packet.json` | Registry snapshot, asset signals, proposals, gaps | Spec snapshot only; 73 entities/94 edges before seed correction; not clinical evidence |
| `cts-curriculum-draft` | `src/lib/student-curriculum/curriculum-data.ts` | Internal teaching outline | `internal_draft_only`; not verified evidence |
| `cts-cross-neighborhoods` | Anatomy, Complications, Surgical Approaches, Implants & Instruments, Postoperative Protocols merged drafts | Reusable identity candidates | Spec snapshots; none certified |

## Evidence synthesis by requested domain

| Domain | Evidence-backed preparation conclusion | Candidate claim status |
|---|---|---|
| Clinical definition | Model CTS as median nerve compression/neuropathy at the wrist, diagnosed from a clinical pattern with selective tools. Do not treat one symptom or maneuver as definitive. | `needs_review`; clinician |
| Anatomy | Reuse carpal tunnel and median nerve. Add TCL/flexor-retinaculum adjudication, recurrent motor branch, palmar cutaneous branch, and thenar/APB anatomy. Exact boundaries/variants need anatomy sources and attending review. | `needs_review`; attending |
| Symptoms/localization | Candidate features include median-distribution paresthesia, nocturnal symptoms, thenar motor findings, and symptom modifiers. Localize against cervical/proximal median/polyneuropathy mimics. | `needs_review`; clinician |
| Provocative examination | Phalen, Tinel-at-wrist, and Durkan are component findings. Systematic-review evidence does not support relying on any one maneuver. | `needs_review`; clinician |
| EDX/EMG/NCS | AAOS 2024 supports CTS-6 in lieu of routine ultrasound or NCV/EMG; EDX remains useful selectively. NCS and needle EMG are components, not synonyms; needle EMG can characterize axonal pathology. | `needs_review`; EDX specialist |
| Differential | Include cervical radiculopathy, proximal median neuropathy/pronator syndrome, polyneuropathy, cubital tunnel syndrome, and local hand pathology where clinically relevant. | `needs_review`; clinician |
| Severity | Do not invent grades. Represent clinical motor/sensory severity and EDX severity only through a named system and source. | unresolved; EDX + attending |
| Nonoperative care | Neutral night orthosis is a candidate pathway. Avoid presenting generic fracture immobilization. Exact benefit/duration and follow-up require source review. | `needs_review`; clinician |
| Corticosteroid injection | AAOS 2024: no long-term improvement, while short-term symptom improvement may occur. Preserve both horizon and strength; do not call it curative. | `needs_review`; clinician |
| Surgical indications | The current CPG page does not justify a universal numeric threshold. Candidate triggers—persistent function-limiting symptoms after appropriate care, severe disease, motor deficit/denervation—remain attending-gated. | `needs_review`; attending |
| Open release | Create a named procedure. The goal is decompression by complete TCL release; ordered steps, landmarks, and endpoint require technique evidence and attending approval. | `needs_review`; attending |
| Endoscopic release | Create separately. AAOS 2024 finds no long-term patient-reported outcome difference versus mini-open; training, costs, risks, recovery, and preference affect choice. | `needs_review`; attending |
| Anatomy at risk | Candidate structures include median nerve and its recurrent motor/palmar cutaneous branches; source-supported technique-specific vascular/digital structures may be added. | `needs_review`; attending |
| Incomplete release | Model separately from symptoms. Failed-release literature supports incomplete release as a common explanation for persistent symptoms, not an automatic diagnosis. | `needs_review`; attending |
| Recurrent CTS | Separate recurrence after improvement from persistence. A fixed symptom-free interval is source-specific and must not be globally encoded without approval. | `needs_review`; attending |
| Pillar pain | Model as a distinct postoperative complication. Evidence suggests it commonly improves over time; do not promise a fixed resolution date. | `needs_review`; clinician |
| Postoperative care | AAOS 2024 recommends against routine supervised therapy and routine postoperative immobilization; exceptions and wound/activity guidance remain individualized. | `needs_review`; attending + therapist |
| Return to activity | Technique comparisons may show earlier average return after endoscopic release, but occupation and protocol materially affect timing. No universal date. | `needs_review`; therapist + attending |
| OITE/high-yield | Good candidates: single-test limitation, branch anatomy, palmar sensory localization, NCS versus EMG, short- versus long-term injection effects, technique equivalence in long-term PROMs, incomplete versus recurrent disease. | `needs_review`; educator + domain reviewer |

## Claims explicitly rejected or quarantined

- Routine radiographs or MRI as the central CTS diagnostic pathway.
- Repeat radiographs as standard CTS follow-up.
- Articular alignment/stability as core CTS assessment.
- Generic fracture-style immobilization.
- Universal EDX requirement.
- Universal superiority of open or endoscopic release.
- Routine postoperative splinting or supervised therapy for every patient.
- Fixed return-to-work or symptom-recovery promises.

## Provenance contract

Manufacturing proposals must cite one or more IDs above, the deterministic
repository evidence IDs where applicable, and preserve recommendation
strength/time horizon. Evidence richness cannot auto-approve `treated_by`,
`indicates_treatment`, `at_risk_structure`, operative, revision, or
postoperative decisions.
