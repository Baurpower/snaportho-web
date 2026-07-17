# Carpal Tunnel Syndrome and Carpal Tunnel Release: Canonical KG Vertical Plan

Status: planning artifact only

Prepared: 2026-07-09

Target root: `carpal-tunnel-syndrome`

Target maturity: Level 7 after evidence, review, validation, and publication gates

Current recommendation: **not ready for manufacturing until identity cleanup and a focused evidence packet are complete**

## Scope and guardrails

This plan connects the registered Carpal Tunnel Syndrome (CTS) topic through
diagnosis, treatment, release, recovery, and product retrieval. It does not
manufacture a neighborhood, create staging proposals, apply data, change the
schema, or certify content. Every claim and decision point below is a proposed
draft. Existing generated artifacts are treated as repository evidence, not as
clinical verification or production-state proof.

Sources inspected:

- `docs/kg/KG_LEDGER.md`
- `scripts/lib/education/kg-hand-wrist-cluster-definitions.ts`
- `scripts/lib/education/kg-hand-wrist-pilot-spec-factory.ts`
- `scripts/lib/education/kg-hand-wrist-shared-anatomy.ts`
- `scripts/lib/education/kg-upper-extremity-shared-anatomy.ts`
- the merged drafts and review/readiness reports for Orthopaedic Anatomy,
  Imaging & Radiographic Measurements, Complications, Surgical Approaches,
  Implants & Instruments, and Postoperative Protocols
- `reports/anki-kg-mapping-v1-report.md`,
  `reports/anki-kg-review-v1-report.md`, and available KG evidence packets
- CasePrep, curriculum, BroBot, and Orthobullets-extension mappings in `src/`
  and `extensions/`

Repository findings are dated 2026-07-09. The audit is offline and does not
assert what currently exists in production.

## Executive disposition

CTS is a registered Hand & Wrist root with a factory seed, curriculum identity,
Prepare identity, CasePrep mapping, four declared Anki mappings, and 44 declared
Orthobullets question mappings. It does **not** have a CTS-specific compiler,
evidence, audit, review, or publication report directory. Its factory seed is
generic: it creates a condition, placeholder operative-treatment and
key-complication objects, seven generalized claims, and two generalized
decision points. Several of those drafts are clinically mismatched to CTS
(routine hand/wrist imaging, alignment/stability language, and
splint/immobilize plus repeat imaging).

Reusable coverage exists for the carpal tunnel, median nerve, FPL/FDS/FDP,
thenar compartment, a generic carpal-tunnel approach, median neuropathy,
splinting protocols, and broad complications/instrument principles. The
clinically defining exam, electrodiagnostic, treatment, named procedure,
at-risk branch, complication, and postoperative objects are mostly absent.

The correct next move is a bounded CTS evidence-and-identity pass, followed by
manufacturing through the existing Knowledge Factory. It would be unsafe to
compile the generic seed unchanged.

## 1. Current coverage inventory

State vocabulary follows the ledger. “Reusable draft” means present in a
manufactured merged draft but not publication-ready. “Factory seed” means
registered/spec-backed but not manufactured for CTS. “Missing” means no
canonical object was found in the reviewed repository artifacts; source text
or BroBot conversation output does not count as a KG object.

| Requested concept | Coverage and duplicate risk | Current type | Maturity | Provenance and review | Likely source/report |
|---|---|---|---|---|---|
| Carpal tunnel syndrome | Exists; registered root. Overlaps semantically with `median-nerve-compression`, so ownership must be explicit. | `condition` | Partial factory seed | Spec/generated drafts; claims and decisions `needs_review`; no CTS publication report | Hand/Wrist registry and cluster definitions |
| Median nerve | Exists in multiple snapshots under stable slug `median-nerve`; reuse, do not recreate. | `anatomy_structure` | Reusable draft | Spec-backed; not verified/certified | shared anatomy; Orthopaedic Anatomy merged draft |
| Carpal tunnel | Exists in many Hand/Wrist snapshots and Orthopaedic Anatomy as `carpal-tunnel`; snapshot duplication but stable identity. | `anatomy_structure` | Reusable draft | Spec-backed; not verified/certified | Hand/Wrist shared anatomy; Orthopaedic Anatomy |
| Transverse carpal ligament | Missing as a named object. High alias collision with “flexor retinaculum.” | proposed `anatomy_structure` | Not started | Needs anatomy source and hand-attending identity review | new CTS/anatomy evidence packet |
| Flexor retinaculum | Missing as a named object. Do not create independently until equivalence/scope with transverse carpal ligament is adjudicated. | alias or proposed `anatomy_structure` | Not started | Terminology review required | new CTS/anatomy evidence packet |
| Thenar muscles | Partial: `hand-thenar-compartment` exists; no reviewed thenar-muscle group or APB/opponens/flexor pollicis brevis set found. | proposed `anatomy_structure` group/members | Not started/partial | Anatomy provenance and identity review required | Orthopaedic Anatomy merged draft |
| Recurrent motor branch | Missing. | proposed `anatomy_structure` | Not started | Anatomy-at-risk evidence and attending review required | new CTS/anatomy evidence packet |
| Palmar cutaneous branch | Missing as KG object; appears only in generated BroBot conversation audit text, which is not acceptable provenance. | proposed `anatomy_structure` | Not started | Anatomy-at-risk evidence and attending review required | BroBot audit signal; new source packet needed |
| Phalen test | Missing. | proposed `exam_maneuver` | Not started | Diagnostic-accuracy source and clinician review required | new CTS evidence packet |
| Tinel sign | Missing as CTS-specific maneuver/object. Naming must distinguish Tinel sign at wrist from a generic nerve percussion sign. | proposed `exam_maneuver` | Not started | Diagnostic-accuracy source and clinician review required | new CTS evidence packet |
| Durkan compression test | Missing. Alias risk: carpal compression test. | proposed `exam_maneuver` | Not started | Diagnostic-accuracy source and clinician review required | new CTS evidence packet |
| EMG/NCS | Missing as a CTS diagnostic object. Identity decision needed: combined electrodiagnostic study plus reusable EMG and NCS components. | proposed `diagnostic_test` | Not started | Specialty guidance/diagnostic evidence and reviewer sign-off required | new CTS evidence packet |
| Night splinting | Partial only through generic `splinting-protocol`; named CTS treatment is missing. | proposed `treatment_principle` | Not started/partial | Treatment evidence and clinician review required | Postoperative Protocols; new CTS packet |
| Corticosteroid injection | Missing as CTS treatment. Avoid collision with generic steroid injection objects if discovered at canonical lookup. | proposed `procedure` or existing vocabulary-compatible treatment object | Not started | Benefit/duration/risks need source and clinician review | new CTS evidence packet |
| Open carpal tunnel release | Missing as named procedure. Generic `carpal-tunnel-syndrome-operative-treatment` would be created by the seed and should be replaced or deprecated before manufacture. | proposed `procedure` | Not started | Operative source plus attending review | CTS factory seed; Surgical Approaches |
| Endoscopic carpal tunnel release | Missing. Do not model as an alias of open release. | proposed `procedure` | Not started | Comparative evidence plus attending review | new CTS evidence packet |
| Pillar pain | Missing. | proposed `complication` | Not started | Definition/time course evidence and clinician review | Complications plus new CTS packet |
| Median nerve injury | Partial: `median-neuropathy` exists, but operative nerve injury is not distinctly modeled. Duplicate/scope risk is high. | proposed reuse or `complication` after adjudication | Reusable draft/identity unresolved | Complication definition and attending review | Complications and Surgical Approaches drafts |
| Incomplete release | Missing. Must distinguish technical cause/finding from persistent CTS. | proposed `complication` | Not started | Surgical evidence and attending review | new CTS evidence packet |
| Recurrent carpal tunnel syndrome | Missing. Must distinguish persistent, recurrent, and new symptoms. | proposed `condition` | Not started | Definition, interval, and revision evidence need attending review | new CTS evidence packet |

Additional reusable objects found: `fpl`, `fds`, `fdp`,
`superficial-palmar-arch`, `ulnar-nerve`, `digital-nerves`,
`supine-positioning`, `carpal-tunnel-approach`, `median-neuropathy`,
`wound-complication`, and `splinting-protocol`. Implants & Instruments has a
manufactured general instrumentation neighborhood but no CTS-specific hand
instrument set in the inspected merged draft.

### Existing source-asset signals

- The topic definition declares four Anki card mappings and 44 Orthobullets
  question mappings. These are counts in the seed, not proof that each asset is
  currently linked to approved canonical entities.
- Legacy retargeting reports CTS blocked because no approved canonical entity
  and no safe primary-coverage bridge were available at that run.
- CasePrep maps topic ID `carpal-tunnel-syndrome` to slug
  `carpal-tunnel-release`.
- BroBot audit prompts already ask about complete release and nerves at risk.
  Generated answers and conversation audits are test signals, not evidence.
- No CTS-specific evidence packet was found. Existing Hand/Wrist evidence
  packets support shared anatomy reuse but do not support the complete CTS
  vertical.

## 2. Canonical identity and ownership decisions

Resolve these before generating proposals:

1. `carpal-tunnel-syndrome` owns the clinical condition vertical.
   `median-nerve-compression` remains a broader sibling and should connect via
   `is_a` only if that predicate and endpoint pair are already allowed;
   otherwise use the existing approved semantic relationship that expresses
   clinical association without asserting equivalence.
2. `carpal-tunnel` and `median-nerve` are reused stable identities.
3. Adjudicate whether “transverse carpal ligament” is the preferred label and
   “flexor retinaculum” an alias, or whether the latter is a broader structure.
   Do not create two synonymous canonical nodes.
4. Replace the placeholder
   `carpal-tunnel-syndrome-operative-treatment` with named procedure objects:
   `open-carpal-tunnel-release` and `endoscopic-carpal-tunnel-release`.
   Preserve a generic “carpal tunnel release” alias/search concept only if
   conventions allow a parent procedure; never merge open and endoscopic
   technique identities.
5. Keep procedure and approach separate. Reuse or refine
   `carpal-tunnel-approach` only after deciding whether it means open exposure;
   an endoscopic portal/approach requires a distinct approach object.
6. Replace the placeholder
   `carpal-tunnel-syndrome-key-complication` with named complications.
7. Model electrodiagnostic testing as one user-facing combined concept with
   aliases “EMG/NCS,” “EDX,” and “nerve conduction study/electromyography,”
   while linking component tests only if canonical identities already exist.
8. Distinguish:
   persistent CTS (symptoms never adequately resolve),
   recurrent CTS (symptoms return after an improvement interval), and
   incomplete release (a technical cause/finding). These must not be aliases.

## 3. Complete vertical and required KG objects

All proposed claims use `generated_draft` or evidence-extracted draft status and
must remain `needs_review`. Suggested slugs are provisional until canonical
lookup. Every entity should carry `owner_neighborhood`,
`clinical_context`, `source_ids`, `maturity_target`, and identity-resolution
metadata. Every relationship should carry source IDs, confidence,
`review_status`, and, where applicable, `management_importance`,
`anatomy_role`, and `context_relevance`.

| Layer | Proposed entities and aliases | Core relationships | Draft claims / decision points | Provenance and review gate |
|---:|---|---|---|---|
| 1. Condition identity | Reuse `carpal-tunnel-syndrome`; aliases CTS, median neuropathy at the wrist | condition involves median nerve and carpal tunnel; map curriculum/Prepare/CasePrep assets | Define CTS without equating symptoms alone to diagnosis | Guideline/review article; hand clinician identity review |
| 2. Epidemiology and risk factors | Proposed risk concepts: pregnancy/fluid shifts, diabetes, hypothyroidism, inflammatory arthropathy, obesity, distal radius fracture, occupational exposure only where supported | `risk_factor_for` or allowed equivalent to CTS; avoid causal edges from association-only evidence | Draft: risk factors alter pretest probability but do not independently establish diagnosis | Epidemiologic sources; clinician review; avoid unsupported causation |
| 3. Anatomy | Reuse carpal tunnel, median nerve, FPL/FDS/FDP, carpal bones/palmar arch; add transverse carpal ligament, recurrent motor branch, palmar cutaneous branch, thenar-muscle group and named muscles as needed | tunnel contains median nerve and nine flexor tendons; ligament forms roof; branches part of median nerve; muscles innervated by recurrent branch | Anatomy boundary/content and branch-variation claims | Anatomy references; all structure-at-risk relations require hand-attending review |
| 4. Pathophysiology | Proposed `median-nerve-compression-at-wrist` only if a distinct concept is needed | CTS `caused_by`/involves compression; compression affects median nerve | Draft: elevated tunnel pressure can impair median nerve function; do not encode a single universal mechanism | Review source; clinician review |
| 5. Clinical presentation | Proposed symptom concepts: nocturnal paresthesias, median-distribution numbness, hand clumsiness, thenar weakness/atrophy | symptoms `suggests` CTS using allowed vocabulary; CTS `presents_with` if registered | Draft symptom pattern with explicit variability and palmar-cutaneous territory caveat | Diagnostic guideline/review; clinician review |
| 6. Physical exam | Add Phalen, Tinel-at-carpal-tunnel, Durkan/carpal-compression, two-point discrimination, APB strength/thenar exam | maneuvers `evaluates` CTS/median nerve; findings support but do not prove CTS | Draft diagnostic utility; decision: objective weakness/atrophy prompts severity/escalation assessment | Diagnostic-accuracy evidence; clinician review; no universal sensitivity/specificity without versioned source |
| 7. Differential diagnosis | Reuse cervical radiculopathy, proximal median neuropathy/pronator syndrome if found, cubital tunnel syndrome, polyneuropathy, thumb CMC arthritis; add missing mimics | each `differential_for` CTS; discriminating findings link to tests/anatomy | Draft comparison claims focused on distribution, provocative site, neck/proximal symptoms, thenar/palmar sensation | Review sources; neurology/hand review for nuanced localization |
| 8. Diagnostic testing | Add combined EDX, nerve conduction study, needle EMG; consider ultrasound of median nerve only with supported use case | tests `evaluates` CTS and severity; EDX differentiates mimics; imaging limited to atypical/structural questions | Decision: order testing when diagnosis/severity/localization is uncertain or results change management; exact indications remain draft | Current specialty guidance; clinician review |
| 9. Severity staging | Add clinical severity and electrodiagnostic severity concepts/grades only from a named system | CTS `classified_by`; grade `indicates_treatment` only with reviewed evidence | Draft distinction among intermittent sensory, persistent sensory, motor deficit/denervation; no home-grown thresholds | Named classification/guideline; specialist review of thresholds |
| 10. Nonoperative treatment | Add neutral-position night splinting, CTS corticosteroid injection, activity modification/education | CTS `treated_by` each; treatment `contraindicated_with` only when sourced | Decision: initial nonoperative pathway for appropriate patients; draft duration and response checkpoints | Comparative/guideline evidence; clinician review; pregnancy-specific advice separately sourced |
| 11. Surgical indications | Proposed indication concepts or decision points, not necessarily standalone entities | severity/test/failure findings `indicates_treatment` release | Decisions: progressive motor deficit/denervation, severe disease, or persistent symptoms after appropriate care may support surgery; urgency and thresholds require attending approval | Guideline/comparative evidence; mandatory attending review |
| 12. Surgical options | Add parent `carpal-tunnel-release` only if hierarchy convention supports it; add open and endoscopic releases | CTS `treated_by` both; procedures `uses_approach`; compare outcomes/risks via claims, not equivalence edges | Shared-decision claim: technique selection depends on anatomy, surgeon expertise, patient factors, and evidence | Comparative trials/reviews; attending review |
| 13. Open release | `open-carpal-tunnel-release`; alias OCTR; link mini-open only if separately defined | uses open carpal-tunnel approach; releases transverse carpal ligament; risks named structures; uses instruments | Draft ordered steps, complete proximal/distal release endpoint, pearls/pitfalls | Technique source; every step and safety claim requires attending review |
| 14. Endoscopic release | `endoscopic-carpal-tunnel-release`; aliases ECTR, single-/two-portal variants only when modeled | uses endoscopic approach/portal; releases ligament; risks structures; uses endoscopic system | Draft visualization and conversion/bailout decision; never claim superiority without context | Technique/comparative evidence; attending review |
| 15. Approach and exposure | Reuse/refine `carpal-tunnel-approach`; add open palmar approach and endoscopic approach if generic node is too broad; reuse supine positioning | approach exposes ligament/tunnel; approach has at-risk structures and positioning | Draft incision/landmark/exposure-limit claims | Surgical Approaches packet plus hand source; mandatory attending review |
| 16. Instruments | Proposed reusable set: scalpel/blade, retractors, scissors, freer/elevator, release guide/knife, endoscope/cannula system; exact set depends on technique | procedure `uses_instrument`; instrument `used_for` exposure/release only if predicate exists | Draft instrument purpose and technique-specific alternatives | Implants & Instruments canonical lookup; surgeon review; avoid brand-specific claims |
| 17. Structures at risk | Reuse median nerve, superficial palmar arch/digital nerves; add recurrent motor and palmar cutaneous branches; include ulnar neurovascular structures only with approach-specific evidence | procedure/approach `at_risk_structure` each, with zone/step metadata | Draft risk mechanism and protection pearl for each structure | Anatomy and technique sources; mandatory attending anatomy-at-risk review |
| 18. Complications | Add pillar pain, incomplete release, persistent CTS, recurrent CTS, scar tenderness, infection/wound issue, iatrogenic nerve injury, complex regional pain syndrome only if supported | procedure `has_complication`; incomplete release `causes` persistent symptoms only through allowed/supported predicate; prevention links where registered | Draft recognition, prevention, and escalation claims; avoid fixed incidence without source/version | Complications packet plus procedure evidence; attending review for nerve injury/incomplete release |
| 19. Postoperative protocol | Add CTS-release postoperative protocol or procedure-specific phases; reuse general wound/splint concepts | procedure `followed_by` protocol if allowed; protocol has phase/milestone/precaution links | Draft wound care, digit motion, activity progression, suture review, symptom monitoring; no universal immobilization mandate | Postoperative Protocols conventions; mandatory attending review and institution-variance metadata |
| 20. Rehabilitation/return | Add tendon/median nerve gliding only if supported, scar management, hand therapy referral criteria, work/activity milestones | protocol `includes` rehab principles; milestone prerequisites return activity | Decision: therapy and return timing individualized by wound, symptoms, occupation, and surgeon protocol | Rehab evidence; therapist plus attending review; avoid exact universal timelines |
| 21. Recurrence/revision | Add persistent CTS, recurrent CTS, revision release, perineural fibrosis if supported | recurrence `treated_by` revision pathway; diagnostic tests evaluate alternative/persistent compression | Decision: reassess diagnosis, completeness of release, scarring, and proximal/systemic mimics before revision | Revision literature; mandatory hand-attending review |
| 22. OITE/high-yield | No new clinical entity required; create reviewed educational claims/assets | claims link CTS to branch anatomy, sensory distribution, test interpretation, and release complications | Traps: palmar cutaneous territory, recurrent motor variation, incomplete versus recurrent disease, provocative tests are not standalone proof | Reviewed board-source packet; educator plus clinician review |
| 23. BroBot retrieval | Retrieval intents/metadata: quick, reasoning, OITE, patient, mimic comparison, OR prep | intent filters traverse condition → evidence → procedure/anatomy/complication/protocol | Require answer mode, audience, uncertainty, provenance, and review filters | Product smoke tests; exclude unreviewed management/safety claims from authoritative responses |
| 24. CasePrep packet | Reuse `carpal-tunnel-release`; sections for setup, approach, steps, instruments, risks, pearls/pitfalls, complications, postop | packet maps to procedure, approach, at-risk anatomy, instruments, protocol | Checklist claims remain draft until attending-approved | CasePrep mapping plus technique evidence; attending approval required before clinical use |
| 25. Curriculum progression | Reuse curriculum node `hand-carpal-tunnel-syndrome`; objectives from recognition to independent planning | prerequisites anatomy/nerve exam → diagnosis → management → procedure/revision | MS3 recognition; PGY1 exam/basic plan; PGY2-3 indications and steps; PGY4-5 technique selection/revision/teaching | Education review plus role/level validation; no competence certification from content completion |

### Proposed relationship bundle

Use only predicates already accepted by the relationship registry and valid for
the endpoint types. Where the semantic phrase below is not registered, the
Relationship Builder must map it to an existing predicate rather than expand
the vocabulary.

- CTS **involves anatomy** median nerve and carpal tunnel.
- Carpal tunnel **contains** median nerve, FPL, four FDS tendons, and four FDP
  tendons; the latter count should be a reviewed claim/metadata value rather
  than nine duplicate tendon entities.
- Transverse carpal ligament **part of/forms boundary of** carpal tunnel.
- CTS **examined by** Phalen, Tinel-at-wrist, and Durkan maneuvers.
- EDX **evaluates** CTS, severity, and competing localization.
- CTS **treated by** neutral-position night splinting, corticosteroid
  injection, open release, and endoscopic release in appropriate contexts.
- Open/endoscopic release **uses approach**, **uses instrument**, and
  **has complication**.
- Each release/approach **at risk structure** median nerve, recurrent motor
  branch, palmar cutaneous branch, and other source-supported structures.
- Release **followed by** procedure-specific postoperative protocol and
  rehabilitation milestones.
- Persistent/recurrent CTS **differential for** incomplete release, scarring,
  proximal neuropathy, and alternate diagnoses; use causal edges only with
  direct support.

### Draft claim set to source and review

These are prompts for evidence extraction, not accepted clinical statements:

1. CTS is a compressive median neuropathy at the wrist whose diagnosis combines
   symptom pattern, examination, and selective testing.
2. The palmar cutaneous branch generally travels outside the carpal tunnel, so
   central palmar sensory findings require careful localization.
3. Thenar weakness/atrophy or electrodiagnostic denervation changes severity
   assessment and may change treatment urgency.
4. Provocative maneuvers alter diagnostic confidence but should not be treated
   as individually definitive.
5. Neutral-position night splinting and local corticosteroid injection are
   nonoperative options for selected patients; expected benefit and duration
   must be source-specific.
6. Open and endoscopic release both aim to completely release the transverse
   carpal ligament; comparative recovery and complication claims require
   current evidence and patient/technique context.
7. Incomplete release is a cause to consider in persistent symptoms, while
   recurrent symptoms require a broader reassessment.
8. Postoperative motion, wound care, therapy, and return-to-work guidance vary
   by technique, patient, occupation, and surgeon protocol.

### Decision points requiring explicit review

| Decision | Trigger and candidate action | Required review |
|---|---|---|
| Test versus clinical diagnosis | Atypical presentation, severity uncertainty, competing localization, or management-changing information → consider EDX/other targeted testing | Hand clinician; neurology/PM&R input for EDX |
| Nonoperative start | Appropriate symptom/severity profile without a reviewed urgent surgical indication → education plus neutral night splint and/or injection pathway | Hand attending |
| Surgical escalation | Persistent function-limiting symptoms despite appropriate care, severe disease, or objective motor/denervation findings → discuss release | Hand attending; evidence-linked thresholds |
| Open versus endoscopic | Patient anatomy/comorbidity, prior surgery, technique availability, surgeon experience, risks, and goals → shared selection | Hand attending |
| Intraoperative conversion/bailout | Inadequate visualization, anomalous anatomy, bleeding, or safety concern during endoscopic release → stop/convert according to reviewed technique | Hand attending; safety critical |
| Persistent symptoms | No meaningful improvement → reassess diagnosis, completeness of release, severity, and mimics | Hand attending |
| Recurrent symptoms/revision | Return after improvement → repeat clinical/localization workup and plan revision only after cause assessment | Hand attending |
| Postoperative escalation | Wound concern, progressive neurologic deficit, severe/unexpected pain, or vascular concern → prompt surgical assessment | Hand attending; safety critical |

## 4. Product-readiness plan

### BroBot

The vertical must support five answer contracts:

- Quick explanation: definition, common symptom pattern, first-line evaluation,
  and calibrated next step.
- Clinical reasoning: presentation → localization → differential → testing
  choice → severity → treatment.
- OITE answer: tested relationship, best answer, distractor rationale, and the
  anatomy/decision edge behind it.
- Patient explanation: plain language, options, uncertainty, recovery
  variability, and clinician-directed red flags without prescriptive claims.
- Mimic comparison: CTS versus cervical radiculopathy, proximal median
  neuropathy, cubital tunnel syndrome, and polyneuropathy.

Readiness checks: provenance-filtered retrieval; no placeholder objects;
audience-aware language; direct citations/source IDs; no unreviewed
management, anatomy-at-risk, or postoperative claim presented as authoritative;
abstention/fallback when a reviewed edge is missing.

### CasePrep

The `carpal-tunnel-release` packet should retrieve:

1. patient/side/procedure and indication context;
2. anatomy and variants at risk;
3. positioning, anesthesia/tourniquet fields as institution-variable;
4. open or endoscopic approach;
5. ordered steps and completeness endpoint;
6. technique-specific instruments;
7. pearls, pitfalls, and bailout/conversion plan;
8. complications and immediate checks;
9. wound, activity, follow-up, and rehabilitation plan.

No CasePrep clinical packet is ready until an attending approves the indication,
steps, risk anatomy, bailout, and postoperative sections.

### Curriculum

| Level | Prerequisites | Expected objectives |
|---|---|---|
| MS3 | Median nerve sensory/motor anatomy; basic hand exam | Recognize classic presentation, name common mimics, explain initial evaluation and nonoperative options |
| PGY1 | MS3 objectives; basic EDX concepts; sterile/setup principles | Perform/document focused exam, interpret a basic report, outline indications and postoperative checks |
| PGY2-3 | Approach anatomy; complication recognition | Compare open/endoscopic release, present operative plan, identify at-risk branches, explain persistent symptoms |
| PGY4-5 | Evidence appraisal; revision anatomy | Individualize technique, manage variants/complications, plan recurrence/revision workup, teach and critique reasoning |

Progression is educational scaffolding, not a declaration of procedural
competence.

### Orthobullets extension

- Highlight mapped concepts only after alias resolution (CTS, EDX, Phalen,
  Durkan, branches, open/endoscopic release, pillar pain).
- Show related concepts grouped by anatomy, diagnosis, treatment, procedure,
  and complications rather than an undifferentiated graph expansion.
- Generate “ask me from this page” questions from reviewed claims and edges.
- Expand one or two hops with provenance and maturity filters; suppress
  placeholder, deprecated, and unreviewed safety-critical objects.
- Preserve source-page context and distinguish source content from KG
  enrichment.

### OITE

Build reviewed question templates around:

- sensory territory and palmar cutaneous branch localization;
- recurrent motor branch/thenar motor findings;
- provocative-test limitations;
- EDX localization/severity patterns without unsourced numeric absolutes;
- nonoperative versus operative indications;
- open versus endoscopic tradeoffs;
- incomplete release versus persistent/recurrent disease;
- pillar pain and nerve injury;
- mimics and distractors such as cervical radiculopathy, pronator syndrome,
  cubital tunnel syndrome, and polyneuropathy.

Each item must record the tested relationship, distractor misconception,
training level, source IDs, and reviewer status.

## 5. Gap analysis, risks, and blockers

### Missing required objects

The principal missing objects are the transverse carpal ligament/flexor
retinaculum identity, thenar muscle set, recurrent motor and palmar cutaneous
branches, three provocative maneuvers, EDX and severity objects, named
nonoperative treatments, open/endoscopic release, technique-specific
approaches/instruments, pillar pain, incomplete release, persistent/recurrent
CTS, revision release, and a CTS-specific postoperative/rehabilitation protocol.

### Duplicate and identity risks

- CTS versus `median-nerve-compression`.
- Transverse carpal ligament versus flexor retinaculum.
- Named procedures versus the generic factory placeholder operative treatment.
- Open approach versus generic `carpal-tunnel-approach`.
- Median nerve injury versus existing `median-neuropathy`.
- CTS night splinting versus generic `splinting-protocol`.
- EMG, NCS, EDX, and combined “EMG/NCS.”
- Tinel sign at the wrist versus generic Tinel/percussion maneuver.
- Durkan test versus carpal compression test.
- Persistent CTS, recurrent CTS, incomplete release, and perineural fibrosis.
- Snapshot duplication of shared anatomy must be resolved by slug/global
  identity, not treated as multiple canonical structures.

### Missing source support

There is no focused CTS evidence packet. The seed’s asset counts require
source-level validation and mapping review. BroBot conversation outputs cannot
support claims. The vertical needs current, versioned sources for diagnostic
accuracy, EDX use, treatment comparisons, surgical technique/anatomic
variation, complications/revision, and postoperative rehabilitation.

### Mandatory review gates

- **Curator/identity:** all aliases, parent/child identities, placeholder
  replacement, cross-neighborhood ownership, and canonical reuse.
- **Clinical reviewer:** presentation, exam, differential, diagnostic testing,
  severity, nonoperative treatment, and patient-language claims.
- **Hand attending:** all management-changing decisions; indications; approach
  and procedural steps; open/endoscopic choice; bailout; complications;
  revision; all anatomy-at-risk relationships.
- **Postoperative attending/hand therapist:** wound care, immobilization,
  motion, therapy, restrictions, milestones, and return-to-work/activity.
- **Educator:** OITE traps/distractors and curriculum levels.
- No object, claim, edge, or decision may be marked reviewed, verified,
  high-quality, or certified by the manufacturing agent.

### Areas where the KG must avoid overclaiming

- Do not diagnose CTS from one provocative test.
- Do not state that all patients require EDX, imaging, injection, or surgery.
- Do not encode association risk factors as proven causes.
- Do not use universal electrodiagnostic thresholds without a named system and
  versioned source.
- Do not state one surgical technique is universally superior.
- Do not promise nerve recovery, symptom resolution, or a fixed return date.
- Do not imply thenar atrophy or longstanding numbness reliably reverses.
- Do not prescribe a universal postoperative splint, therapy program, or
  restriction schedule.
- Do not infer recurrent CTS from any postoperative symptom.
- Do not use source-asset counts or audit scores as clinical validation.

### Blocking issues

1. Identity cleanup is unresolved.
2. No CTS-specific evidence packet exists.
3. The generic factory seed contains clinically inappropriate imaging,
   alignment, stability, and repeat-imaging drafts for this nerve-compression
   topic.
4. No CTS compiler/publication artifacts exist.
5. Source assets are declared but not demonstrated here as approved canonical
   mappings.
6. Attending review capacity is required for high-risk layers.

## 6. Recommended manufacturing sequence

Manufacturing must use the existing compiler, evidence, proposal, review, and
audit conventions. Stop before staging apply unless a later, separately
authorized task explicitly requests it.

| Step | Inputs | Expected outputs | Review gate | Safe validation |
|---|---|---|---|---|
| 1. Identity cleanup | Registry seed; canonical lookup; shared anatomy; generic approach/complication/protocol objects; alias list | Identity-resolution table; reuse/create/deprecate decisions; corrected CTS spec proposal | Curator plus hand-attending adjudication for terminology | Duplicate/alias/type/owner checks; no writes |
| 2. Anatomy linking | Orthopaedic Anatomy draft; Hand/Wrist shared anatomy; focused hand anatomy sources | Reused anatomy links; proposed ligament, branches, thenar set; tunnel boundary/content claims | Anatomy curator; attending for every at-risk edge | Orphan/type/cardinality checks; cross-neighborhood reuse report |
| 3. Exam/testing layer | Focused diagnostic guideline/reviews; validated Anki/Orthobullets slices | Maneuvers, EDX, symptom/findings, mimics, severity model; atomic claims | Hand clinician; EDX specialist where needed | Evidence trace; unsupported numeric claim scan; relationship validation |
| 4. Treatment decision layer | Current management evidence; patient factors; severity objects | Nonoperative treatments, indications, contraindication/context metadata, decision drafts | Hand attending for all management-changing decisions | Claim atomicity; conflict scan; no unconditional treatment paths |
| 5. Procedure/release layer | Surgical Approaches; technique sources; Implants & Instruments | Open/endoscopic procedures, approaches, steps, instruments, safety/bailout drafts | Hand attending; anatomy-at-risk sign-off | Procedure/approach separation; ordered-step and required-risk coverage |
| 6. Complications layer | Complications neighborhood; procedure/revision evidence | Named complications; persistent/recurrent distinctions; prevention/recognition links | Hand attending | Duplicate/scope checks; causal-evidence checks; safety routing |
| 7. Postoperative layer | Postoperative Protocols conventions; rehab evidence; local-variation fields | Procedure-specific phases, milestones, precautions, therapy/referral and return concepts | Hand attending plus hand therapist | Timeline/threshold review queue; protocol completeness; variance metadata |
| 8. Product smoke tests | Reviewed/maturity-filtered draft; product mappings | BroBot five-mode fixtures, CasePrep packet fixture, curriculum progression, extension highlights, OITE stems | Product owner, educator, and clinician for clinical outputs | Read-only retrieval tests; provenance/maturity leakage tests; no staging apply |

### Exit criteria for manufacturing readiness

The vertical becomes ready to enter manufacturing—not publication—when:

- all identity decisions above are recorded;
- the CTS-specific evidence packet exists and source assets are traceable;
- the generic seed drafts are corrected or excluded;
- proposed objects use current registered entity and relationship vocabulary;
- every management, operative-safety, anatomy-at-risk, and postoperative item
  has an assigned reviewer;
- compile/audit commands can run read-only and the topic has no unresolved
  critical identity blocker.

It becomes product-ready only after manufacturing, evidence traceability,
human/attending review, publication-readiness checks, and product smoke tests.

## 7. Ledger recommendation

The ledger has a change-log convention. Add this planning entry (this artifact
adds it in the same change):

> 2026-07-09 — Planned the canonical Carpal Tunnel Syndrome/Carpal Tunnel
> Release vertical; found the registered partial seed and reusable anatomy,
> approach, complication, and protocol objects; identified identity, evidence,
> procedure, risk-anatomy, recurrence, and postoperative blockers. Planning
> only; no manufacture or staging mutation.

Do not change the Hand & Wrist status from Partial.

## 8. Recommended next manufacturing prompt

> Prepare (do not apply) the canonical Carpal Tunnel Syndrome and Carpal Tunnel
> Release Knowledge Factory input package using
> `docs/kg/verticals/carpal-tunnel-syndrome-release-plan.md`.
>
> First perform read-only canonical identity resolution for CTS versus
> median-nerve-compression; transverse carpal ligament versus flexor
> retinaculum; named open/endoscopic releases versus the generic operative
> placeholder; generic versus technique-specific carpal-tunnel approaches;
> median nerve injury versus median neuropathy; EDX/EMG/NCS; and
> persistent/recurrent CTS versus incomplete release. Produce an adjudication
> queue for unresolved identities.
>
> Then collect a focused, versioned evidence packet for diagnosis, provocative
> exams, EDX/severity, nonoperative treatment, surgical indications,
> open/endoscopic technique, anatomy at risk, complications/revision, and
> postoperative rehabilitation. Validate the declared four Anki and 44
> Orthobullets mappings at source-record level. Exclude BroBot-generated text as
> evidence.
>
> Correct or suppress the generic Hand/Wrist seed claims about routine imaging,
> articular alignment, stability, and repeat imaging. Generate draft entities,
> relationships, atomic claims, decision points, reviewer routing, compiler
> plan, gap report, and product smoke-test fixtures through existing
> conventions only. Mark all new clinical content `needs_review`; route every
> management-changing, anatomy-at-risk, operative, bailout, complication,
> revision, and postoperative item to the required human/attending reviewer.
>
> Run read-only compile/audit/format validation. Do not persist proposals, apply
> staging, write production data, publish, certify, change schema/vocabulary,
> or create new abstractions. Stop with reports and a manufacturing-readiness
> recommendation.

## Final readiness call

**Not ready for immediate manufacturing.** It is ready for the bounded
identity-resolution and evidence-preparation pass described above. Once those
blockers are cleared and reviewers are assigned, the existing Knowledge Factory
can manufacture the draft vertical without architectural changes.
