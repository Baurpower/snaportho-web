# CTS Vertical Identity Adjudication

Prepared: 2026-07-09
Mode: read-only canonical inspection; no persistence
Status vocabulary: proposed decisions only, pending the listed reviewer

| Concept | Proposed canonical slug | Aliases | Type | Decision | Duplicate risk | Reviewer | Source support |
|---|---|---|---|---|---|---|---|
| Carpal tunnel syndrome | `carpal-tunnel-syndrome` | CTS; median neuropathy at the wrist | `condition` | Reuse registered root | High against broader `median-nerve-compression`; not aliases | Curator + hand clinician | Strong: registry, curriculum, legacy ontology packet, AAOS 2024 |
| Median nerve compression | `median-nerve-compression` | median nerve entrapment/compression | `condition` | Reuse as broader sibling; adjudicate hierarchy predicate | High | Curator | Repository spec; clinical scope needs review |
| Transverse carpal ligament | `transverse-carpal-ligament` | TCL; flexor retinaculum (candidate alias) | `anatomy_structure` | Create after terminology adjudication | High against flexor retinaculum | Anatomy curator + hand attending | External anatomy literature needed in manufacturing packet |
| Flexor retinaculum | unresolved | flexor retinaculum of wrist | `anatomy_structure` or alias | Needs human adjudication; do not create separately yet | Critical synonym/scope risk | Anatomy curator + hand attending | Inconsistent nomenclature; unresolved |
| Open release | `open-carpal-tunnel-release` | OCTR; open CTR; mini-open CTR is not automatically an alias | `procedure` | Create; suppress generic placeholder | High against `carpal-tunnel-syndrome-operative-treatment` | Curator + hand attending | AAOS 2024; comparative reviews |
| Endoscopic release | `endoscopic-carpal-tunnel-release` | ECTR; endoscopic CTR | `procedure` | Create separately from open release | Low after procedure split | Hand attending | AAOS 2024; comparative reviews |
| Generic operative placeholder | `carpal-tunnel-syndrome-operative-treatment` | none | `procedure` | Quarantine/suppress; no delete | Critical | Curator | Only generic seed support |
| Approaches | `open-carpal-tunnel-approach`; `endoscopic-carpal-tunnel-approach` | palmar approach; endoscopic portal approach | `surgical_approach` | Create named children; human adjudication whether generic `carpal-tunnel-approach` remains a parent or is deprecated | High | Curator + hand attending | Generic approach exists; technique support required |
| Median nerve injury | `iatrogenic-median-nerve-injury-after-carpal-tunnel-release` | median nerve injury during CTR | `complication` | Create narrowly or reuse `median-neuropathy` only after scope review | High | Complication curator + hand attending | Complication reviews support concept; identity unresolved |
| Median neuropathy | `median-neuropathy` | median nerve dysfunction | `complication` in current graph | Reuse only as broad complication; do not alias to nerve transection/injury | High | Curator | Existing Complications draft |
| Recurrent motor branch | `recurrent-motor-branch-median-nerve` | thenar motor branch; recurrent branch | `anatomy_structure` | Create | Medium against generic median nerve branch | Anatomy curator + hand attending | Anatomy literature required; clinically established |
| Palmar cutaneous branch | `palmar-cutaneous-branch-median-nerve` | PCBMN; palmar cutaneous branch | `anatomy_structure` | Create | Medium | Anatomy curator + hand attending | Anatomy literature required; BroBot text excluded |
| Electrodiagnostics | `electrodiagnostic-testing-carpal-tunnel-syndrome` | EDX; EMG/NCS; electrodiagnostic study | `diagnostic_test` | Create combined clinical test; adjudicate reusable component objects for NCS and needle EMG | High acronym/component risk | Curator + EDX specialist | AAOS 2024 and AANEM practice parameter |
| Nerve conduction studies | `nerve-conduction-study` | NCS; NCV | `diagnostic_test` | Create/reuse globally after canonical lookup | Medium | Curator + EDX specialist | Strong |
| Needle EMG | `needle-electromyography` | needle EMG | `diagnostic_test` | Create/reuse globally; not synonymous with NCS | Medium | Curator + EDX specialist | Strong |
| Night splinting | `neutral-wrist-night-orthosis-for-cts` | night splint; nocturnal wrist brace; neutral wrist orthosis | `treatment_principle` | Create CTS-specific object linked to generic `splinting-protocol` | Medium | Curator + hand clinician | AAOS evidence base; exact long-term claim needs review |
| Persistent CTS | `persistent-carpal-tunnel-syndrome-after-release` | persistent symptoms after CTR | `condition` | Create | Critical against recurrence/incomplete release | Hand attending | Failed-release literature |
| Recurrent CTS | `recurrent-carpal-tunnel-syndrome` | recurrent symptoms after CTR | `condition` | Create | Critical | Hand attending | Failed-release literature; time definition requires review |
| Incomplete release | `incomplete-transverse-carpal-ligament-release` | incomplete decompression | `complication` | Create as technical complication/cause candidate, not symptom-state alias | Critical | Hand attending | Failed-release literature |
| Pillar pain | `pillar-pain-after-carpal-tunnel-release` | postoperative pillar pain | `complication` | Create | Low | Hand clinician | 2024 systematic review |

## Resolved versus queued

Resolved for the input package: reuse CTS, median nerve compression, median
nerve, carpal tunnel, generic splinting, and existing generic approach as
reference objects; create named open/endoscopic procedures, EDX wrapper,
branches, symptom-state, incomplete-release, and pillar-pain objects.

Human adjudication remains mandatory for flexor retinaculum/TCL equivalence,
the generic approach lifecycle, median neuropathy versus iatrogenic injury,
global EMG/NCS component reuse, and the precise persistent/recurrent temporal
definition.

No lifecycle state was changed.
