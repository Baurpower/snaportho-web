# SnapOrtho Orthopaedic Knowledge Graph Ledger

Last audited: 2026-07-15 (updated after Tibial Shaft Fracture database-backed resume)  
Ledger owner: KG maintainers  
Canonical topic registry: `scripts/lib/education/kg-compiler/topic-registry.ts`

## Purpose and update contract

This is the durable inventory and planning record for the SnapOrtho orthopaedic
knowledge graph (KG). Update it whenever a topic is registered, materially
expanded, reviewed, published, deprecated, merged, or split.

Status vocabulary:

| Status | Meaning |
|---|---|
| Not started | No registered topic/spec exists. |
| Stub | Identity or skeletal topic exists, without a useful neighborhood. |
| Partial | Structured offline/spec content exists but has material gaps. |
| Usable | Structurally useful for internal/draft retrieval; important review or provenance work remains. |
| High quality | Complete, source-supported, reviewed, and product-ready. |
| Certified | High quality plus designated orthopaedic expert sign-off and a recorded review date/version. |

Do not infer certification from an audit score. A topic cannot be **High
quality** or **Certified** while the publication gate is blocked.

For each future run:

1. Run `npm run kg:compile -- --help` to confirm the registered inventory.
2. Run `npm run kg:audit -- --all` (optionally `--db-backed`) and record the
   date, counts, readiness, and common blockers below.
3. Add/remove topic roots in the neighborhood inventory.
4. Record substantive changes in the change log.
5. Never promote a status solely because generated files exist.

## Audit snapshot

Repository/offline audit on 2026-07-08 (updated after Surgical Approaches manufacture):

| Metric | Result |
|---|---:|
| Registered topic neighborhoods | 110 |
| Entity specifications across snapshots | 6,697+ |
| Relationship specifications across snapshots | 7,619+ |
| Draft educational claims | 774+ |
| Draft decision points | 272+ |
| Mean independent audit score | 85/100 |
| Publication-ready neighborhoods | 0/110 |
| Certified neighborhoods | 0/110 |

These counts are snapshot totals, not deduplicated global canonical-object
counts. Shared anatomy and other reused entities appear in multiple snapshots.
The audit was offline, so it proves repository structure rather than current
production database state.

Common publication blockers:

- Human/attending review remains open.
- Claims and decision points remain generated drafts.
- The offline audit found no approved canonical entities in its data source.
- Critical/high ontology gaps remain.
- Some newer Hand & Wrist topics lack compiler publication-readiness reports.

## Where the KG lives

| Concern | Canonical location |
|---|---|
| Curriculum hierarchy and legacy concept schema | `supabase/migrations/20260626_090000_educational_ontology_foundation.sql` |
| Canonical entities, edges, governance, provenance, curriculum bridge | `supabase/migrations/20260628_120000_next_generation_kg_foundation.sql` |
| Proposal/review staging | `supabase/migrations/20260628_140000_kg_automation_proposals.sql` |
| Relationship vocabulary hardening | `supabase/migrations/20260628_150000_kg_relationship_vocabulary_hardening.sql` and `supabase/migrations/20260705_120000_ankle_pilot_kg_vocabulary.sql` |
| Seed data | `supabase/seeds/20260626_educational_ontology_foundation_seed.sql` and `supabase/seeds/20260628_next_generation_kg_proof_seed.sql` |
| Topic/entity/edge/claim specs | `scripts/lib/education/kg-*-pilot-spec.ts`, cluster factories, shared-anatomy modules, and topic catalogs |
| Topic registry | `scripts/lib/education/kg-compiler/topic-registry.ts` |
| Edge validation registry | `scripts/lib/education/kg-relationship-registry.ts` |
| Compiler/build pipeline | `scripts/kg-compile.ts` and `scripts/lib/education/kg-compiler/` |
| Independent audit pipeline | `scripts/kg-audit.ts` and `scripts/lib/education/kg-auditor/` |
| Evidence pipeline | `scripts/kg-evidence.ts`, `scripts/lib/education/kg-evidence/`, and `docs/knowledge-graph/evidence-packet-system.md` |
| Proposal apply/review automation | `scripts/kg-factory-pilot.ts`, `scripts/apply-pilot-approved.ts`, and `scripts/*kg-automation*` |
| Generated review/build artifacts | `reports/kg-pilots/`, `reports/kg-compiler/`, and `docs/knowledge-graph/pilots/` |
| Architecture and quality specifications | `docs/knowledge-graph/` and `docs/knowledge-graph/agent-specifications/` |
| BroBot KG retrieval | `src/lib/brobot/orthobullets/kg-lookup.ts` and `src/lib/brobot/chat/` |
| CasePrep/curriculum bridges | `src/lib/student-curriculum/caseprep-topic-mapping.ts`, `src/lib/student-curriculum/`, and canonical `curriculum_node_entities` edges |

## Current structure

### Two-layer model

The older education-centered layer contains `specialties`, hierarchical
`curriculum_nodes` (`specialty`, `region`, `topic`, `subtopic`, `module`,
`exam_domain`, `pathway`), `learning_objectives`, and `concepts`. Concepts use
types such as classification, diagnostic rule, imaging, indication, procedure,
complication, anatomy, biomechanics, and pathophysiology.

The next-generation domain layer contains typed `canonical_entities`,
`canonical_relationships`, aliases, curriculum bridges, provenance records,
governance actions, educational claims, decision points, and staged automation
proposals. This is an additive migration; the curriculum tree and canonical
domain graph coexist.

Current canonical entity vocabulary includes condition, procedure,
anatomy structure, classification system/grade, complication, diagnostic test,
imaging finding, implant, fixation method, treatment principle, biomechanics
concept, exam maneuver, surgical approach, and surgical positioning.

Edges cover clinical management, anatomy, classification, imaging, examination,
implants/approaches/positioning, complications, prerequisites, curriculum, and
educational assets. The TypeScript registry is the semantic source of truth for
allowed endpoint/entity-type combinations. Database `CHECK` constraints are a
second gate.

Core metadata includes stable slug and label, description, entity type,
lifecycle and review states, confidence, source/creation method, JSON metadata,
comments, active/deprecation state, and timestamps. Edges additionally carry
provenance status. Provenance records identify source artifact/type/name,
external ID, extraction method, confidence, reviewer state, reviewer, and
review time.

Validation includes database uniqueness/enum/confidence constraints, registered
predicate endpoint rules, duplicate/orphan checks, claim atomicity, required
relationship coverage, anatomy/metadata completeness, reviewer routing,
publication maturity levels, and read-only per-topic/batch audits.

### Known schema and quality issues

- The graph has rich offline specifications but no audited publication-ready
  neighborhood. “Spec complete” must not be presented as clinically verified.
- Polymorphic relationship IDs cannot be protected by ordinary foreign keys;
  apply-time validation and audits remain essential.
- Schema vocabulary is spread across migrations and the TypeScript relationship
  registry. A drift test exists, but every vocabulary change must update both.
- The original entity vocabulary was later widened for classification grades
  and fixation methods. Deployments must include the latest vocabulary
  migration before applying current specs.
- Question, article, and case-module edge endpoints are intentionally deferred
  until backing canonical tables exist; related predicates are not currently
  satisfiable.
- Snapshot totals overcount shared anatomy. A future ledger generator should
  report both snapshot and deduplicated canonical counts.
- Existing topic clusters mix specialty neighborhoods (Sports, Hand, Adult
  Reconstruction) with cross-cutting categories (Trauma). This ledger treats
  overlap explicitly rather than forcing one exclusive taxonomy.

## Existing neighborhood inventory

All rows below are registered topic roots. “Spec” provenance means authored or
factory-generated repository specifications and source identifiers exist;
“draft review” means claims/decisions still require human approval.

### Orthopaedic Anatomy — 1 root — Usable (Level 5/7)

Manufactured: 2026-07-08  
Root: `orthopaedic-anatomy`  
Status: reusable merged draft; publication blocked

| Inventory item | Count |
|---|---:|
| Canonical anatomy entities | 208 |
| Relationships | 198 |
| Educational claims | 10 |
| Decision points | 3 |
| Reusable structures | 208 |
| Metadata merges | 406 |
| Linked assets | 0 |
| Evidence IDs | 11 |
| Auto approvals | 417 |
| Human review items | 3 |
| Attending review items | 3 |

Scope includes upper extremity, lower extremity, spine, pelvis,
neurovascular anatomy, compartments, vascular territories, origins/insertions,
tendons, ligaments, joints, cartilage, physes/ossification, deforming forces,
surgical intervals, internervous planes, safe zones, imaging landmarks,
surface anatomy, and reusable regional modules.

Current blockers: three safety decision points require attending review; claims
and decision points remain draft-only; the configured proposal staging table
was unavailable during persistence; 47 high ontology gaps remain in the
compiler snapshot until the Relationship Builder output can be staged and
recompiled. Human review is limited to the three attending-routed safety
decisions. No ordinary curator-review items remain.

Artifacts:

- Evidence packet: `reports/kg-evidence/orthopaedic-anatomy/evidence-packet.json`
- Compiler plan: `reports/kg-compiler/orthopaedic-anatomy/ontology-compiler-plan.json`
- Gap report: `reports/kg-compiler/orthopaedic-anatomy/ontology-gap-report.json`
- Work plan: `reports/kg-compiler/orthopaedic-anatomy/ontology-work-plan.json`
- Agent assignment: `reports/kg-compiler/orthopaedic-anatomy/agent-assignment-plan.json`
- Agent execution: `reports/kg-compiler/orthopaedic-anatomy/agent-execution-report.json`
- Agent coverage: `reports/kg-compiler/orthopaedic-anatomy/agent-coverage-report.md`
- Merged draft: `reports/kg-compiler/orthopaedic-anatomy/merged-neighborhood-draft.json`
- Human review queue: `reports/kg-pilots/orthopaedic-anatomy-human-review-queue.md`
- Publication readiness: `reports/kg-compiler/orthopaedic-anatomy/publication-readiness.json`
- Neighborhood QA: `reports/kg-audits/orthopaedic-anatomy/topic-scorecard.md`
- Quality report: `reports/kg-compiler/orthopaedic-anatomy/quality-report.md`
- Staging apply: `reports/kg-compiler/orthopaedic-anatomy/staging-apply-report.md`

### Imaging & Radiographic Measurements — 1 root — Usable (Level 5/7)

Manufactured: 2026-07-08  
Root: `imaging-radiographic-measurements`  
Status: reusable merged draft; staged to guarded staging; publication blocked

| Inventory item | Count |
|---|---:|
| Canonical entities (merged draft) | 108 |
| Relationships | 192 |
| Educational claims | 28 |
| Decision points | 15 |
| Quantitative measurement objects | 43 |
| Numeric thresholds requiring review | 43 |
| Specialist-review measurements | 14 |
| Reused identities in draft | 20 |
| Metadata merges | 300 |
| Linked assets | 0 |
| Evidence IDs | 11 |
| Auto approvals | 277 |
| Human review items | 41 |
| Attending review items | 25 |
| Staging entities applied | 89 |
| Staging relationships applied | 156 |
| Duplicate identities prevented | 18 |

Scope includes imaging foundations (standard/special/fluoroscopic views,
weight-bearing vs non-weight-bearing, comparison and stress radiographs, CT,
MRI, ultrasound, nuclear imaging, escalation pathways), trauma measurements
(Böhler, Gissane, Baumann, anterior humeral line, radiocapitellar line, ulnar
variance, volar tilt, radial inclination/height, syndesmotic parameters,
mechanical axis), sports measurements (Insall-Salvati, Caton-Deschamps, TT-TG,
alpha angle, LCEA, Tönnis, acromiohumeral interval, critical shoulder angle),
adult reconstruction measurements (LLD, offset, cup position, hip center, joint
line, mechanical/coronal alignment), spine measurements (Cobb, PI/PT/SS, SVA,
cervical sagittal, coronal balance), pediatric measurements (Klein line,
migration percentage, acetabular index, pediatric CEA, growth-plate
relationships), and cross-cutting reliability/pitfall/threshold governance.

Current blockers: human and attending review queues remain open; claims and
decision points remain draft-only; four high anatomy-hub hierarchy gaps remain
on reused regional hubs (intentionally not re-imported as a full anatomy tree);
curriculum node bridge skipped because the curriculum node does not yet exist;
numeric thresholds require human review; pediatric and spine thresholds require
specialist review.

Artifacts:

- Evidence packet: `reports/kg-evidence/imaging-radiographic-measurements/evidence-packet.json`
- Compiler plan: `reports/kg-compiler/imaging-radiographic-measurements/ontology-compiler-plan.json`
- Gap report: `reports/kg-compiler/imaging-radiographic-measurements/ontology-gap-report.json`
- Work plan: `reports/kg-compiler/imaging-radiographic-measurements/ontology-work-plan.json`
- Agent assignment: `reports/kg-compiler/imaging-radiographic-measurements/agent-assignment-plan.json`
- Agent execution: `reports/kg-compiler/imaging-radiographic-measurements/agent-execution-report.json`
- Agent coverage: `reports/kg-compiler/imaging-radiographic-measurements/agent-coverage-report.md`
- Merged draft: `reports/kg-compiler/imaging-radiographic-measurements/merged-neighborhood-draft.json`
- Human review queue: `reports/kg-pilots/imaging-radiographic-measurements-human-review-queue.md`
- Publication readiness: `reports/kg-compiler/imaging-radiographic-measurements/publication-readiness.json`
- Neighborhood QA: `reports/kg-audits/imaging-radiographic-measurements/topic-scorecard.md`
- Quality report: `reports/kg-compiler/imaging-radiographic-measurements/quality-report.md`
- Staging apply: `reports/kg-compiler/imaging-radiographic-measurements/staging-apply-report.md`

### Complications — 1 root — Usable (Level 5/7)

Manufactured: 2026-07-08  
Root: `complications` (primary entity `orthopaedic-complications`)  
Status: reusable failure-mode backbone; staged to guarded staging; publication blocked

| Inventory item | Count |
|---|---:|
| Canonical entities (merged draft) | 122 |
| Relationships | 197 |
| Educational claims | 24 |
| Decision points | 18 |
| Complication entities | 68 |
| Prevention-linked relationships | 20 |
| Reused identities in draft | 50 |
| Metadata merges (entities + relationships) | 319 |
| Linked assets | 0 |
| Evidence IDs | 10 |
| Auto approvals | 291 |
| Human review items | 67 |
| Attending review items | 33 |
| Staging entities applied | 79 |
| Staging relationships applied | 166 |
| Duplicate identities prevented | 46 |

Scope includes general orthopaedic complications (infection, wound problems,
union failure, hardware/fixation failure, arthrofibrosis, HO, neurovascular
injury, CRPS, chronic pain, reoperation/revision), medical complications (DVT,
PE, pneumonia, UTI, delirium, AKI, cardiac events, readmission, mortality),
trauma complications (open-fracture infection, compartment sequelae, PTA, AVN,
malalignment/LLD/rotation), sports complications (stiffness, recurrent
instability, graft failure/re-tear, persistent pain, chondral progression),
adult reconstruction complications (PJI, instability, aseptic loosening, wear,
osteolysis, periprosthetic fracture, extensor mechanism failure), spine
complications (durotomy, neurologic injury, ASD, pseudarthrosis, hardware/
junctional failure), pediatric complications (growth arrest, angular deformity,
LLD, physeal bar), and cross-cutting risk/prevention/recognition/workup/
management/salvage/outcomes principles with explicit prevention links.

Current blockers: human and attending review queues remain open for
management-changing recommendations and time-sensitive complications; claims
and decision points remain draft-only; ten medium `uses_approach` gaps remain
on procedure cross-refs (Surgical Approaches backbone now manufactured for
linkage); curriculum node bridge skipped because `orthopaedic-complications`
does not yet exist.

Artifacts:

- Evidence packet: `reports/kg-evidence/complications/evidence-packet.json`
- Compiler plan: `reports/kg-compiler/complications/ontology-compiler-plan.json`
- Gap report: `reports/kg-compiler/complications/ontology-gap-report.json`
- Work plan: `reports/kg-compiler/complications/ontology-work-plan.json`
- Agent assignment: `reports/kg-compiler/complications/agent-assignment-plan.json`
- Agent execution: `reports/kg-compiler/complications/agent-execution-report.json`
- Agent coverage: `reports/kg-compiler/complications/agent-coverage-report.md`
- Complete agent accounting: `reports/kg-compiler/complications/all-agent-accounting.md`
- Merged draft: `reports/kg-compiler/complications/merged-neighborhood-draft.json`
- Human review queue: `reports/kg-pilots/complications-human-review-queue.md`
- Publication readiness: `reports/kg-compiler/complications/publication-readiness.json`
- Neighborhood QA: `reports/kg-audits/complications/topic-scorecard.md`
- Quality report: `reports/kg-compiler/complications/quality-report.md`
- Staging apply: `reports/kg-compiler/complications/staging-apply-report.md`

### Surgical Approaches — 1 root — Usable (Level 5/7)

Manufactured: 2026-07-08  
Root: `surgical-approaches`  
Status: reusable operative exposure backbone; staged to guarded staging; publication blocked

| Inventory item | Count |
|---|---:|
| Canonical entities (merged draft) | 183 |
| Relationships | 927 |
| Educational claims | 28 |
| Decision points | 16 |
| Surgical approach entities | 55 |
| Positioning objects (deduplicated) | 5 |
| Anatomy-at-risk relationships | 129 |
| Reused identities in draft | 65 |
| Metadata merges (entities + relationships) | 1110 |
| Linked assets | 0 |
| Evidence IDs | 10 |
| Auto approvals | 1111 |
| Human review items | 44 |
| Attending review items | 16 |
| Staging entities applied | 134 |
| Staging relationships applied | 817 |
| Duplicate identities prevented | 49 |

Scope includes universal approach concepts (positioning, prep/drape, C-arm,
landmarks, incision planning, internervous/intermuscular planes, deep intervals,
exposure limits, release/protection lists, neurovascular risk, extensile options,
bailout strategies, closure, postoperative considerations, revision exposure,
exposure escalation, safe zones, approach-specific complications), regional
approaches for shoulder through spine, independent internervous plane and
extensile/bailout objects, and reused anatomy/complication identities.

Current blockers: human and attending review for approach-selection and
anatomy-at-risk safety relationships; claims and decision points remain drafts;
one high ontology gap on the reused `orthopaedic-anatomy` root lacking outbound
`part_of` (do not invent a parent above the anatomy backbone).

Artifacts:

- Evidence packet: `reports/kg-evidence/surgical-approaches/evidence-packet.json`
- Compiler plan: `reports/kg-compiler/surgical-approaches/ontology-compiler-plan.json`
- Gap report: `reports/kg-compiler/surgical-approaches/ontology-gap-report.json`
- Work plan: `reports/kg-compiler/surgical-approaches/ontology-work-plan.json`
- Agent assignment: `reports/kg-compiler/surgical-approaches/agent-assignment-plan.json`
- Agent execution: `reports/kg-compiler/surgical-approaches/agent-execution-report.json`
- Agent coverage: `reports/kg-compiler/surgical-approaches/agent-coverage-report.md`
- Complete agent accounting: `reports/kg-compiler/surgical-approaches/all-agent-accounting.md`
- Merged draft: `reports/kg-compiler/surgical-approaches/merged-neighborhood-draft.json`
- Human review queue: `reports/kg-pilots/surgical-approaches-human-review-queue.md`
- Publication readiness: `reports/kg-compiler/surgical-approaches/publication-readiness.json`
- Neighborhood QA: `reports/kg-audits/surgical-approaches/topic-scorecard.md`
- Quality report: `reports/kg-compiler/surgical-approaches/quality-report.md`
- Staging apply: `reports/kg-compiler/surgical-approaches/staging-apply-report.md`

### Implants & Instruments — 1 root — Usable (Level 5/7)

Manufactured: 2026-07-08  
Root: `implants-instruments`  
Status: reusable fixation/construct/instrumentation backbone; staged to guarded staging; publication blocked

| Inventory item | Count |
|---|---:|
| Canonical entities (merged draft) | 153 |
| Relationships | 220 |
| Educational claims | 22 |
| Decision points | 15 |
| Implant objects | 58 |
| Instrument objects | 22 |
| Biomechanics concepts | 28 |
| Reused identities in draft | 37 |
| Metadata merges | 373 |
| Linked assets | 0 |
| Evidence IDs | 11 |
| Auto approvals | 346 |
| Human review items | 48 |
| Attending review items | 15 |
| Staging entities applied | 116 |
| Staging relationships applied | 188 |
| Duplicate identities prevented | 36 |

Scope includes fixation principles (absolute/relative stability, compression,
neutralization, buttress/bridge, load sharing/bearing, working length, plate
span ratio, strain theory, biological fixation, indirect reduction, lag and
tension-band principles), screw constructs, plate constructs, IM fixation
(antegrade/retrograde/reconstruction/cephalomedullary/ESIN, blocking/Poller,
static/dynamic locking), wire constructs, external fixation, arthroplasty
components, sports implants, spine implants, operative instrumentation, and
cross-cutting indication/contraindication, failure mode, salvage, and revision
concepts. Generic construct concepts preferred over vendor systems.

Current blockers: human review open for implant-selection claims and selected
interpretations; attending review open for all decision points and
management-changing pathways; claims and decision points remain draft-only;
curriculum node bridge skipped because `implants-instruments` does not yet
exist; offline publication gate still reports stale “no approved entities”
relative to successful staging apply.

Artifacts:

- Evidence packet: `reports/kg-evidence/implants-instruments/evidence-packet.json`
- Compiler plan: `reports/kg-compiler/implants-instruments/ontology-compiler-plan.json`
- Gap report: `reports/kg-compiler/implants-instruments/ontology-gap-report.json`
- Work plan: `reports/kg-compiler/implants-instruments/ontology-work-plan.json`
- Agent assignment: `reports/kg-compiler/implants-instruments/agent-assignment-plan.json`
- Agent execution: `reports/kg-compiler/implants-instruments/agent-execution-report.json`
- Agent coverage: `reports/kg-compiler/implants-instruments/agent-coverage-report.md`
- Merged draft: `reports/kg-compiler/implants-instruments/merged-neighborhood-draft.json`
- Human review queue: `reports/kg-pilots/implants-instruments-human-review-queue.md`
- Publication readiness: `reports/kg-compiler/implants-instruments/publication-readiness.json`
- Neighborhood QA: `reports/kg-audits/implants-instruments/topic-scorecard.md`
- Quality report: `reports/kg-compiler/implants-instruments/quality-report.md`
- Staging apply: `reports/kg-compiler/implants-instruments/staging-apply-report.md`

### Trauma and fracture management — 62 roots — Partial

#### Tibial Shaft Fracture — report-only finalized; database present; review pending

Execution date: 2026-07-15. Registered topic `tibial-shaft-fracture`; canonical
owner `tibial-shaft-fracture-neighborhood`. The run resumed from the canonical
database and existing July 5 staging/proposal history rather than regenerating
identities in isolation.

Current artifacts contain 12 entities, 22 relationships, 18 claims, and 2
decision points. The database snapshot contained 12 entities, 19 relationships,
5 draft claims, 0 decision points, 36 proposals, and 25 approved proposals.
Evidence packet `ev-packet-49d3928f` contains 14 evidence items from eight source
classes, with 15 gaps and one warning. The compiler executed 11 registered
agents with zero failures, normalized one relationship, reported zero conflicts,
and routed 27 items to auto-approval, 9 to safe review, and 9 to expert review.
The proposal curator produced 32 low-risk auto-approvals, 1 auto-revision, 5
human-review items, and 5 attending-review items; no review decisions were
available to apply.

Final state: **report-only finalized; not staging-ready; publication blocked**.
Finalization found 3 staging blocker classes: missing traceability on 3 inherited
relationships, 1 illegal `uses_fixation` triple, and an unconsumed review overlay.
Publication additionally requires record-level provenance, identity adjudication,
and imaging/classification coverage. Database-backed audit score: 83/100,
`NOT_READY`. No proposal persistence or staging write occurred in this run; no
new batch key, strict post-apply reload, or rollback proof exists.

Cross-neighborhood dependencies: compartment syndrome anatomy, trauma
fundamentals, imaging/radiographic measurements, implants/instruments,
complications, and postoperative protocols. The database currently attributes
the primary condition row to the compartment-syndrome pilot, which conflicts
with registered ownership and is recorded for curator adjudication.

Artifacts: `reports/kg-verticals/tibial-shaft-fracture/ledger-prior-state-report.md`,
`reports/kg-evidence/tibial-shaft-fracture/`,
`reports/kg-compiler/tibial-shaft-fracture/`,
`reports/kg-pilots/tibial-shaft-fracture-human-review-queue.md`,
`reports/kg-finalization/tibial-shaft-fracture/`,
`reports/kg-staging/tibial-shaft-fracture/staging-preflight-report.md`, and
`reports/kg-audits/tibial-shaft-fracture/`.

Exact next action: adjudicate and export the 10 human/attending decisions through
the supported review overlay, correct the illegal triple and traceability gaps,
then rerun finalization. Attempt a guarded staging apply only after it reports
zero staging blockers.

Provenance/review: spec + curriculum/Prepare identifiers; review queues exist
for most roots; none passed publication. Hand trauma roots are intentionally
cross-listed with Hand & Wrist.

Core/general and axial/lower/upper extremity roots:

`trauma-fundamentals`, `ankle-fracture`, `compartment-syndrome`, `distal-radius-fracture`,
`tibial-shaft-fracture`, `femoral-neck-fracture`,
`intertrochanteric-fracture`, `subtrochanteric-fracture`,
`clavicle-fracture`, `proximal-humerus-fracture`,
`humeral-shaft-fracture`, `distal-humerus-fracture`,
`supracondylar-humerus-fracture`, `pelvic-ring-injury`,
`acetabular-fracture`, `femoral-shaft-fracture`,
`distal-femur-fracture`, `patella-fracture`,
`tibial-plateau-fracture`, `pilon-fracture`, `calcaneus-fracture`,
`talus-fracture`, `lisfranc-injury`.

Hand/wrist trauma roots:

`distal-ulna-fracture`, `ulnar-styloid-fracture`, `galeazzi-fracture`,
`essex-lopresti-injury`, `wrist-dislocation`, `scaphoid-fracture`,
`scaphoid-nonunion`, `lunate-fracture`, `perilunate-dislocation`,
`lunate-dislocation`, `metacarpal-fracture`, `bennett-fracture`,
`rolando-fracture`, `boxer-fracture`, `cmc-dislocations`,
`proximal-phalanx-fracture`, `middle-phalanx-fracture`,
`distal-phalanx-fracture`, `mallet-finger`, `jersey-finger`,
`central-slip-injury`, `volar-plate-injury`, `flexor-tendon-injury`,
`extensor-tendon-injury`, `thumb-ucl-injury`, `gamekeeper-skier-thumb`,
`tfcc-injury`, `flexor-tenosynovitis`, `hand-infection`,
`bite-injuries`, `fingertip-injury`, `nail-bed-injury`,
`compartment-syndrome-hand`.

Important gaps: trauma primary/secondary survey, open fractures, antibiotics
and tetanus, soft-tissue grading, neurovascular injury, reduction/splinting,
damage-control orthopaedics, fixation mechanics, bone healing/nonunion,
polytrauma timing, geriatric trauma, postoperative weight bearing, and reusable
complication/urgency models.

Next steps: build the Trauma Fundamentals backbone defined below, connect every
existing fracture root to it, then close review/provenance gaps in high-frequency
fracture clusters.

### Sports Medicine — 17 roots — Partial

Provenance/review: cluster specs + curriculum/Prepare identifiers; audit scores
82–87; no root passed publication.

`acl-tear`, `pcl-injury`, `meniscus-tear`, `patellar-instability`,
`multiligament-knee-injury`, `osteochondral-defect-knee`,
`anterior-shoulder-instability`, `rotator-cuff-tear`,
`ac-joint-separation`, `slap-tear`, `proximal-biceps-tendon-pathology`,
`ucl-injury`, `distal-biceps-tendon-rupture`, `achilles-tendon-rupture`,
`chronic-lateral-ankle-instability`, `syndesmotic-sprain`,
`osteochondral-lesion-talus`.

Important gaps: rehabilitation/return-to-sport criteria, graft selection,
procedure steps/portals, sport-specific epidemiology, cartilage restoration,
concussion/nonoperative sports fundamentals, and verified outcome claims.

Next steps: review high-frequency knee/shoulder claims; add reusable rehab,
exam, imaging-measurement, and return-to-play objects.

### Hand & Wrist — 50 roots — Partial

Provenance/review: factory specs and shared anatomy exist. Many topics have high
structural audit scores, but newer roots are missing publication reports; no
root passed publication.

`distal-radius-fracture`, `distal-ulna-fracture`,
`ulnar-styloid-fracture`, `druj-instability`, `galeazzi-fracture`,
`essex-lopresti-injury`, `wrist-dislocation`, `scaphoid-fracture`,
`scaphoid-nonunion`, `lunate-fracture`, `perilunate-dislocation`,
`lunate-dislocation`, `carpal-instability`, `sl-ligament-injury`,
`lt-ligament-injury`, `metacarpal-fracture`, `bennett-fracture`,
`rolando-fracture`, `boxer-fracture`, `cmc-dislocations`,
`proximal-phalanx-fracture`, `middle-phalanx-fracture`,
`distal-phalanx-fracture`, `mallet-finger`, `jersey-finger`,
`central-slip-injury`, `volar-plate-injury`, `flexor-tendon-injury`,
`extensor-tendon-injury`, `flexor-tendon-zones`,
`extensor-tendon-zones`, `median-nerve-compression`,
`carpal-tunnel-syndrome`, `cubital-tunnel-syndrome`,
`ulnar-nerve-compression`, `radial-nerve-compression`,
`thumb-ucl-injury`, `gamekeeper-skier-thumb`, `tfcc-injury`,
`dupuytren-disease`, `trigger-finger`, `de-quervain-tenosynovitis`,
`flexor-tenosynovitis`, `hand-infection`, `bite-injuries`,
`fingertip-injury`, `nail-bed-injury`, `compartment-syndrome-hand`.

Important gaps: congenital/pediatric hand, arthritis, tumors, amputations and
replantation, microsurgery, surgical approaches, therapy protocols, and
publication artifacts for factory-generated topics.

Next steps: run compiler publication validation for all roots, then prioritize
distal radius, carpal tunnel, scaphoid, tendon injury, and hand infection review.

### Adult Reconstruction — 20 roots — Partial

Provenance/review: cluster specs, shared anatomy, and review artifacts exist;
audit scores 78–84; no root passed publication.

`hip-osteoarthritis`, `femoral-neck-fracture-adult-recon`,
`periprosthetic-femur-fracture`, `hip-prosthetic-joint-infection`,
`aseptic-loosening-tha`, `hip-instability-after-tha`,
`polyethylene-wear-osteolysis`, `adverse-local-tissue-reaction`,
`knee-osteoarthritis`, `periprosthetic-knee-fracture`,
`knee-prosthetic-joint-infection`, `aseptic-loosening-tka`,
`knee-instability-after-tka`, `extensor-mechanism-failure`,
`patellofemoral-arthroplasty`, `unicompartmental-knee-arthritis`,
`periprosthetic-joint-infection`, `bone-loss-revision-arthroplasty`,
`implant-fixation-principles`, `bearing-surface-selection`.

Important gaps: primary THA/TKA procedures as explicit roots, approaches,
templating/alignment measurements, implant systems, perioperative optimization,
VTE prophylaxis, postoperative protocols, and reviewed decision thresholds.

Next steps: add primary THA/TKA procedure neighborhoods after the trauma
backbone; then review infection, instability, and loosening decision paths.

### Ankle pilot / Foot & Ankle seed — 1 mature pilot plus cross-listed roots — Partial

`ankle-fracture` is the original end-to-end factory pilot. Foot/ankle content
also exists in Trauma and Sports (`calcaneus-fracture`, `talus-fracture`,
`lisfranc-injury`, `achilles-tendon-rupture`,
`chronic-lateral-ankle-instability`, `syndesmotic-sprain`,
`osteochondral-lesion-talus`).

Provenance/review: evidence, review, staging, and publication artifacts exist,
but the 2026-07-08 audit placed ankle fracture at maturity 5/7 with human review,
draft-claim, approval, and ontology-gap blockers.

Important gaps: hallux/forefoot, flatfoot/cavus, diabetic foot, arthritis,
tendon disorders beyond Achilles, approaches, and postoperative protocols.

Next steps: use ankle fracture as the reference implementation for promoting a
topic from Partial to High quality before expanding the subspecialty.

### Not-started major neighborhoods

| Neighborhood | Status | Highest-value initial scope |
|---|---|---|
| Trauma Fundamentals | Partial | Manufactured 2026-07-08; maturity 5/7; staging contains approved entities/edges; human review remains |
| Pediatrics | Not started | Growth plate principles, pediatric exam, SCFE, DDH, clubfoot, infection, deformity |
| Spine | Not started | Neurologic localization, degenerative, trauma, deformity, tumor/infection, approaches |
| Orthopaedic Oncology | Not started | Bone/soft-tissue tumors, staging, biopsy principles, urgent lesions |
| Orthopaedic Anatomy as a standalone backbone | Partial | Shared regional modules exist, but no unified audited anatomy neighborhood |
| Surgical Approaches | Usable (Level 5/7) | Manufactured 2026-07-08; staging contains approved entities/edges; approach-selection and at-risk anatomy review remain |
| Implants & Instruments | Usable (Level 5/7) | Manufactured 2026-07-08; staging contains approved entities/edges; implant-selection and attending review remain |
| Complications | Usable (Level 5/7) | Manufactured 2026-07-08; staging contains approved entities/edges; human/attending review and approach linkage remain |
| Imaging & Radiographic Measurements | Usable (Level 5/7) | Manufactured 2026-07-08; staging contains approved entities/edges; numeric thresholds and pediatric/spine specialist review remain |
| Postoperative Protocols | Usable (Level 5/7) | Manufactured 2026-07-08; 110 proposals, 79 auto-approved, 31 clinically review-gated; staging table unavailable in current environment |
| OITE / Board Concepts | Partial | Exam/curriculum metadata exists; no governed high-yield overlay |

## Manufacturing record — Postoperative Protocols — 2026-07-08

Status: **Usable (Level 5/7)**. The existing Knowledge Factory manufactured the
canonical recovery, surveillance, and progression backbone for Trauma, Sports
Medicine, Hand & Wrist, Adult Reconstruction, Foot & Ankle, Pediatrics, Spine,
CasePrep, BroBot, curriculum progression, and OITE preparation.

| Measure | Result |
|---|---:|
| Entities created / merged | 62 |
| Relationships created / merged | 16 |
| Draft claims | 21 |
| Draft decision points | 10 |
| Protocol recommendations requiring review | 31 |
| Auto approvals | 79 |
| Human review | 21 |
| Attending review | 10 |
| Specialist review annotations | 4 |
| Metadata-bearing entities | 62 |
| Assets linked | 0 |
| Evidence items | 10 (`ev-packet-914f950b`) |
| Duplicate identities prevented | 9 |
| Independent QA score | 78/100 |
| Current maturity | 5/7 |

Human review is required for all weight-bearing and time-dependent progression
recommendations. Attending review is required for medication duration and
management-changing pathways. Specialist review is required for pediatric
growth/remodeling and spine pathways. Uncertainty and surgeon variability are
preserved in protocol metadata and claim context.

Publication blockers: 31 clinical-review items; draft-only claims and decision
points; no approved canonical entities in the configured database; 12
critical/high ontology gaps. The persistence stage was executed, but the
configured proposal table was unavailable; the staging dry-run validated 79
mutations without modifying the database.

Artifacts:

- [Evidence packet](../../reports/kg-evidence/postoperative-protocols/evidence-packet.json)
- [Compiler plan](../../reports/kg-compiler/postoperative-protocols/ontology-compiler-plan.json)
- [Gap report](../../reports/kg-compiler/postoperative-protocols/ontology-gap-report.json)
- [Work plan](../../reports/kg-compiler/postoperative-protocols/ontology-work-plan.json)
- [Agent assignment](../../reports/kg-compiler/postoperative-protocols/agent-assignment-plan.json)
- [Agent execution](../../reports/kg-compiler/postoperative-protocols/agent-execution-report.json)
- [Merged draft](../../reports/kg-compiler/postoperative-protocols/merged-neighborhood-draft.json)
- [Human review queue](../../reports/kg-pilots/postoperative-protocols-human-review-queue.md)
- [Neighborhood QA](../../reports/kg-compiler/postoperative-protocols/neighborhood-qa-report.md)
- [Publication readiness](../../reports/kg-pilots/postoperative-protocols-publication-readiness.md)
- [Staging apply](../../reports/kg-compiler/postoperative-protocols/staging-apply-report.md)
- [Quality report](../../reports/kg-pilots/postoperative-protocols-db-quality.md)
- [Manufacturing summary](../../reports/kg-compiler/postoperative-protocols/manufacturing-summary.md)

## Manufacturing record — Surgical Approaches — 2026-07-08

Status: **Usable (Level 5/7)**. The existing Knowledge Factory manufactured and
staged the canonical Surgical Approaches neighborhood as the reusable operative
exposure backbone for specialty neighborhoods, CasePrep, BroBot, curriculum
progression, and OITE preparation.

| Measure | Result |
|---|---:|
| Entity specifications / merged entities | 183 |
| Relationship specifications / merged relationships | 927 |
| Draft claims | 28 |
| Draft decision points | 16 |
| Surgical approach entities | 55 |
| Positioning objects (shared, non-duplicated) | 5 |
| Anatomy-at-risk relationships | 129 |
| Curriculum bridges proposed | 1 |
| Metadata objects merged | 1110 |
| Proposals with provenance attached | 1155 |
| Auto approvals | 1111 |
| Human review queue | 44 |
| Expert/attending review routes | 16–44 |
| Compiler maturity | 5/7 |
| Independent QA score | 85/100 |
| Staging entities applied | 134 |
| Staging relationships applied | 817 |
| Duplicate identities prevented | 49 |

Staging persistence: 1106 proposal rows inserted and 49 updated with no errors.
Guarded apply loaded 1000 approved proposals (loader page) and applied 134
entities plus 817 relationships. Forty-nine proposals were skipped because
anatomy, interval, positioning-adjacent, or complication identities already
existed (Complications and Orthopaedic Anatomy reuse). No claim or decision
point leaked into a verified state.

Special manufacturing requirements observed:

- Canonical anatomy identities reused (nerves, vessels, joints, intervals, safe zones).
- Complication identities reused from the Complications backbone.
- Anatomy-at-risk relationships recorded with `anatomy_role: at_risk` and
  attending-review flags; relationship triples deduplicated in the seed.
- Positioning objects use `surgical_positioning` with five shared identities
  (supine, prone, lateral decubitus, beach-chair, traction table).
- Internervous/intermuscular planes recorded as separate reusable anatomy objects
  plus catalogs independent of named approaches.
- Extensile options and bailout strategies recorded as independent principle
  entities, not only as approach metadata.
- Approach-selection recommendations routed to human/attending review.
- Anatomy-at-risk and safety-critical relationships routed to attending review.

Remaining publication blockers:

- Human review remains open for approach-selection claims and selected pathways.
- Attending review remains open for decision points and at-risk anatomy edges.
- Claims and decision points remain drafts.
- One high ontology gap: reused `orthopaedic-anatomy` root lacks outbound
  `part_of` (requires human judgment; do not invent a super-root).
- Curriculum node bridge may not yet exist.

Evidence packet: `ev-packet-c588b885`. Evidence IDs:
`ev-anki-card-5c443fea`, `ev-canonical-snapshot-bf43f922`,
`ev-canonical-snapshot-f630b809`, `ev-curriculum-node-5c2faa40`,
`ev-curriculum-node-ba1c3c09`, `ev-orthobullets-question-b6d80906`,
`ev-proposal-history-2a5b0020`, `ev-quality-signal-3da051bf`,
`ev-quality-signal-e400a8c6`, and `ev-review-history-5e539fcf`.

Manufacturing artifacts:

- [Evidence packet](../../reports/kg-evidence/surgical-approaches/evidence-packet.json)
- [Compiler plan](../../reports/kg-compiler/surgical-approaches/ontology-compiler-plan.json)
- [Gap report](../../reports/kg-compiler/surgical-approaches/ontology-gap-report.json)
- [Work plan](../../reports/kg-compiler/surgical-approaches/ontology-work-plan.json)
- [Agent assignments](../../reports/kg-compiler/surgical-approaches/agent-assignment-plan.json)
- [Agent execution](../../reports/kg-compiler/surgical-approaches/agent-execution-report.json)
- [Complete agent accounting](../../reports/kg-compiler/surgical-approaches/all-agent-accounting.md)
- [Merged neighborhood](../../reports/kg-compiler/surgical-approaches/merged-neighborhood-draft.json)
- [Neighborhood QA](../../reports/kg-audits/surgical-approaches/topic-scorecard.md)
- [Human review queue](../../reports/kg-pilots/surgical-approaches-human-review-queue.md)
- [Publication readiness](../../reports/kg-compiler/surgical-approaches/publication-readiness.json)
- [Staging persistence](../../reports/kg-pilots/surgical-approaches-persist-result.json)
- [Staging apply report](../../reports/kg-compiler/surgical-approaches/staging-apply-report.md)
- [Quality report](../../reports/kg-compiler/surgical-approaches/quality-report.md)

Downstream neighborhoods unlocked or improved by this backbone: Trauma
Fundamentals and fracture topics (`uses_approach` gaps), Sports Medicine, Hand &
Wrist, Adult Reconstruction, Foot & Ankle, Pediatrics, Spine, Complications
protection pathways, CasePrep operative objectives, BroBot approach explanations,
curriculum progression, and OITE preparation.

## Manufacturing record — Complications — 2026-07-08

Status: **Usable (Level 5/7)**. The existing Knowledge Factory manufactured and
staged the canonical Complications neighborhood as the reusable failure-mode
backbone for specialty neighborhoods, CasePrep, BroBot, curriculum progression,
and OITE preparation.

| Measure | Result |
|---|---:|
| Entity specifications / merged entities | 122 |
| Relationship specifications / merged relationships | 197 |
| Draft claims | 24 |
| Draft decision points | 18 |
| Complication entities | 68 |
| Prevention-linked relationships | 20 |
| Curriculum bridges proposed | 1 |
| Metadata objects merged | 319 |
| Proposals with provenance attached | 362 |
| Auto approvals | 291 |
| Human review queue | 67 |
| Expert/attending review routes | 33–53 |
| Compiler maturity | 5/7 |
| Independent QA score | 84/100 |
| Staging entities applied | 79 |
| Staging relationships applied | 166 |
| Duplicate identities prevented | 46 |

Staging persistence: 362 proposal rows active (iteration 2: 31 inserted / 331
updated; iteration 1 also wrote the initial set) with no errors. Guarded apply
loaded 291 approved proposals and applied 79 entities plus 166 relationships.
Forty-six proposals were skipped because entities/relationships already
existed (including trauma fundamentals complications, recon PJI/loosening
cross-refs, and anatomy structures). The curriculum bridge was skipped because
the `orthopaedic-complications` curriculum node does not yet exist. No claim or
decision point leaked into a verified state.

Special manufacturing requirements observed:

- Existing complication identities reused (`delayed-union`, `fracture-nonunion`,
  `fracture-malunion`, `fracture-related-infection`, `venous-thromboembolism`,
  `avascular-necrosis`, `crps`, `osteolysis`, and specialty-local nodes).
- Management-changing recommendations routed to human/attending review.
- Time-sensitive complications (compartment syndrome, PE, neurologic injury,
  cardiac events, mortality pathways) require attending review.
- Incidence/threshold/risk-factor claims carry provenance notes and remain drafts.
- Explicit prevention strategy links recorded (`prevention_link` metadata on 20 edges).

Remaining publication blockers:

- Human review remains open for claims, prevention thresholds, and selected
  management pathways.
- Attending review remains open for decision points and time-sensitive safety routes.
- Claims and decision points remain drafts.
- Ten medium ontology gaps remain for procedure `uses_approach` edges pending
  Surgical Approaches backbone linkage.
- Curriculum node bridge is not yet available.
- Offline publication audit still reports “no approved canonical entities” when
  reading the offline/spec snapshot; staging apply reports are the ground truth
  for applied entities/edges.

Evidence packet: `ev-packet-186b8ba5`. Evidence IDs:
`ev-anki-card-1b54ab93`, `ev-canonical-snapshot-14236382`,
`ev-canonical-snapshot-3f17dca9`, `ev-curriculum-node-a3c550b0`,
`ev-curriculum-node-ac91b899`, `ev-orthobullets-question-ecbdb33f`,
`ev-proposal-history-60bbf2c0`, `ev-quality-signal-1adcee9f`,
`ev-quality-signal-d0313a66`, and `ev-review-history-4fbef16f`.

Manufacturing artifacts:

- [Evidence packet](../../reports/kg-evidence/complications/evidence-packet.json)
- [Compiler plan](../../reports/kg-compiler/complications/ontology-compiler-plan.json)
- [Gap report](../../reports/kg-compiler/complications/ontology-gap-report.json)
- [Work plan](../../reports/kg-compiler/complications/ontology-work-plan.json)
- [Agent assignments](../../reports/kg-compiler/complications/agent-assignment-plan.json)
- [Agent execution](../../reports/kg-compiler/complications/agent-execution-report.json)
- [Complete agent accounting](../../reports/kg-compiler/complications/all-agent-accounting.md)
- [Merged neighborhood](../../reports/kg-compiler/complications/merged-neighborhood-draft.json)
- [Neighborhood QA](../../reports/kg-audits/complications/topic-scorecard.md)
- [Human review queue](../../reports/kg-pilots/complications-human-review-queue.md)
- [Publication readiness](../../reports/kg-compiler/complications/publication-readiness.json)
- [Staging persistence](../../reports/kg-pilots/complications-persist-result.json)
- [Staging apply report](../../reports/kg-compiler/complications/staging-apply-report.md)
- [Quality report](../../reports/kg-compiler/complications/quality-report.md)

Downstream neighborhoods unlocked or improved by this backbone: Trauma
Fundamentals and all fracture topics, Sports Medicine, Hand & Wrist, Adult
Reconstruction, Foot & Ankle, Pediatrics, Spine, Surgical Approaches safety
edges, CasePrep complication objectives, BroBot failure-mode explanations,
curriculum progression, and OITE preparation.

## Manufacturing record — Implants & Instruments — 2026-07-08

Status: **Usable (Level 5/7)**. The existing Knowledge Factory manufactured and
staged the canonical Implants & Instruments neighborhood as the reusable
fixation, construct, and instrumentation backbone for specialty neighborhoods.

| Measure | Result |
|---|---:|
| Entity specifications / merged entities | 153 |
| Relationship specifications / merged relationships | 220 |
| Draft claims | 22 |
| Draft decision points | 15 |
| Implant objects | 58 |
| Instrument objects | 22 |
| Biomechanics concepts | 28 |
| Curriculum bridges proposed | 1 |
| Metadata objects merged | 373 |
| Proposals with provenance attached | 411 |
| Auto approvals | 346 |
| Human review queue | 48 |
| Expert/attending review routes | 15 |
| Compiler maturity | 5/7 |
| Independent QA score | 81/100 |
| Critical/high ontology gaps remaining | 0 |
| Staging entities applied | 116 |
| Staging relationships applied | 188 |
| Duplicate implant identities prevented | 36 |

Staging persistence: 411 proposal rows active (370 inserted / 41 updated) with
no errors. Guarded apply loaded 345 approved proposals and applied 116 entities
plus 188 relationships. Thirty-six entity identities were reused rather than
re-minted (including trauma fundamentals fixation principles, recon components,
cephalomedullary/sliding hip implants, and complication failure modes). Four
existing relationships were skipped. The curriculum bridge was skipped because
the `implants-instruments` curriculum node does not yet exist. No claim or
decision point leaked into a verified state.

Special manufacturing requirements observed:

- Existing fixation identities reused (`absolute-stability`,
  `relative-stability`, `lag-screw-fixation`, `plate-fixation`,
  `intramedullary-nail-fixation`, `temporary-external-fixation`, etc.).
- Existing implant identities reused across Trauma/Recon
  (`cephalomedullary-nail`, `sliding-hip-screw`, arthroplasty components).
- Biomechanical principles recorded separately from implant objects.
- Implant-selection decisions routed to human review.
- Management-changing recommendations routed to attending review.
- Generic construct concepts preferred over vendor-specific systems.
- Failure modes and revision pathways linked to salvage/revision principles.

Remaining publication blockers:

- Human review remains open for implant-selection claims and selected
  construct interpretations.
- Attending review remains open for all decision points and management-changing
  pathways.
- Claims and decision points remain drafts.
- Curriculum node bridge is not yet available.
- Offline publication gate “no approved entities” is stale relative to staging
  apply success.

Evidence packet: `ev-packet-5b1a7b47`. Evidence IDs:
`ev-anki-card-318e73a8`, `ev-canonical-snapshot-3315fdeb`,
`ev-canonical-snapshot-b6798100`, `ev-caseprep-9ab90f43`,
`ev-curriculum-node-da9a6e8b`, `ev-curriculum-node-f0aa2d82`,
`ev-orthobullets-question-6c785c04`, `ev-proposal-history-3a4bd642`,
`ev-quality-signal-a4859d44`, `ev-quality-signal-a501557d`, and
`ev-review-history-3fbe67ad`.

Manufacturing artifacts:

- [Evidence packet](../../reports/kg-evidence/implants-instruments/evidence-packet.json)
- [Compiler plan](../../reports/kg-compiler/implants-instruments/ontology-compiler-plan.json)
- [Gap report](../../reports/kg-compiler/implants-instruments/ontology-gap-report.json)
- [Work plan](../../reports/kg-compiler/implants-instruments/ontology-work-plan.json)
- [Agent assignments](../../reports/kg-compiler/implants-instruments/agent-assignment-plan.json)
- [Agent execution](../../reports/kg-compiler/implants-instruments/agent-execution-report.json)
- [Complete agent accounting](../../reports/kg-compiler/implants-instruments/all-agent-accounting.md)
- [Merged neighborhood](../../reports/kg-compiler/implants-instruments/merged-neighborhood-draft.json)
- [Neighborhood QA](../../reports/kg-audits/implants-instruments/topic-scorecard.md)
- [Human review queue](../../reports/kg-pilots/implants-instruments-human-review-queue.md)
- [Publication readiness](../../reports/kg-compiler/implants-instruments/publication-readiness.json)
- [Staging persistence](../../reports/kg-pilots/implants-instruments-persist-result.json)
- [Staging apply report](../../reports/kg-compiler/implants-instruments/staging-apply-report.md)
- [Quality report](../../reports/kg-compiler/implants-instruments/quality-report.md)

Downstream neighborhoods unlocked or improved by this backbone: Trauma
Fundamentals and fracture topics, Sports Medicine, Hand & Wrist, Adult
Reconstruction, Foot & Ankle, Pediatrics, Spine, CasePrep implant/instrument
objectives, BroBot construct explanations, curriculum progression, and OITE
preparation.

## Manufacturing record — Imaging & Radiographic Measurements — 2026-07-08

Status: **Usable (Level 5/7)**. The existing Knowledge Factory manufactured and
staged the canonical Imaging & Radiographic Measurements neighborhood as the
reusable diagnostic and measurement backbone for specialty neighborhoods.

| Measure | Result |
|---|---:|
| Entity specifications / merged entities | 108 |
| Relationship specifications / merged relationships | 192 |
| Draft claims | 28 |
| Draft decision points | 15 |
| Quantitative measurement objects | 43 |
| Numeric thresholds requiring review | 43 |
| Specialist-review measurements (pediatric/spine) | 14 |
| Curriculum bridges proposed | 1 |
| Metadata objects merged | 300 |
| Proposals with provenance attached | 344 |
| Auto approvals | 277 |
| Human review queue | 41 |
| Expert/attending review routes | 25 |
| Compiler maturity | 5/7 |
| Independent QA score | 80/100 |
| Staging entities applied | 89 |
| Staging relationships applied | 156 |
| Duplicate identities prevented | 18 |

Staging persistence: 344 proposal rows updated (prior insert pass 313 inserted /
14 updated) with no errors. Guarded apply loaded 276 approved proposals and
applied 89 entities plus 156 relationships. Eighteen entity identities were
reused rather than re-minted (including anatomy hubs, `radial-height-loss`,
`post-reduction-radiographs`, and `mechanical-axis-knee`). Twelve existing
relationships were skipped. The curriculum bridge was skipped because the
`imaging-radiographic-measurements` curriculum node does not yet exist. No claim
or decision point leaked into a verified state.

Remaining publication blockers:

- Human review remains open for claims, measurement thresholds, and selected
  imaging interpretations.
- Attending review remains open for decision points and management-changing
  routes.
- Pediatric and spine numeric thresholds require specialist review.
- Claims and decision points remain drafts.
- Four high ontology gaps remain on reused anatomy hubs lacking parent
  `part_of` links (full anatomy tree intentionally not re-imported).
- Curriculum node bridge is not yet available.

Evidence packet: `ev-packet-d4b090b0`. Evidence IDs:
`ev-anki-card-3f71945f`, `ev-canonical-snapshot-726e607c`,
`ev-canonical-snapshot-eb0dd937`, `ev-caseprep-31ab7bb4`,
`ev-curriculum-node-623c317c`, `ev-curriculum-node-7d57cd55`,
`ev-orthobullets-question-014d1873`, `ev-proposal-history-385a4d95`,
`ev-quality-signal-66f4ba53`, `ev-quality-signal-946d98ca`, and
`ev-review-history-907e7bfa`.

Manufacturing artifacts:

- [Evidence packet](../../reports/kg-evidence/imaging-radiographic-measurements/evidence-packet.json)
- [Compiler plan](../../reports/kg-compiler/imaging-radiographic-measurements/ontology-compiler-plan.json)
- [Gap report](../../reports/kg-compiler/imaging-radiographic-measurements/ontology-gap-report.json)
- [Work plan](../../reports/kg-compiler/imaging-radiographic-measurements/ontology-work-plan.json)
- [Agent assignments](../../reports/kg-compiler/imaging-radiographic-measurements/agent-assignment-plan.json)
- [Agent execution](../../reports/kg-compiler/imaging-radiographic-measurements/agent-execution-report.json)
- [Complete agent accounting](../../reports/kg-compiler/imaging-radiographic-measurements/all-agent-accounting.md)
- [Merged neighborhood](../../reports/kg-compiler/imaging-radiographic-measurements/merged-neighborhood-draft.json)
- [Neighborhood QA](../../reports/kg-audits/imaging-radiographic-measurements/topic-scorecard.md)
- [Human review queue](../../reports/kg-pilots/imaging-radiographic-measurements-human-review-queue.md)
- [Publication readiness](../../reports/kg-compiler/imaging-radiographic-measurements/publication-readiness.json)
- [Staging persistence](../../reports/kg-pilots/imaging-radiographic-measurements-persist-result.json)
- [Staging apply report](../../reports/kg-compiler/imaging-radiographic-measurements/staging-apply-report.md)
- [Quality report](../../reports/kg-compiler/imaging-radiographic-measurements/quality-report.md)

Downstream neighborhoods unlocked or improved by this backbone: Trauma
Fundamentals and fracture topics, Sports Medicine, Hand & Wrist, Adult
Reconstruction, Foot & Ankle, Pediatrics, Spine, CasePrep imaging objectives,
BroBot measurement explanations, curriculum progression, and OITE preparation.

## Recommended next neighborhood: Trauma Fundamentals

### Manufacturing record — 2026-07-08

Status: **Partial**. The existing Knowledge Factory manufactured and staged the
first canonical Trauma Fundamentals neighborhood.

| Measure | Result |
|---|---:|
| Entity specifications / merged entities | 44 |
| Relationship specifications / merged relationships | 44 |
| Draft claims | 18 |
| Draft decision points | 11 |
| Curriculum bridges proposed | 1 |
| Metadata objects merged | 88 |
| Proposals with provenance attached | 118 |
| Auto approvals | 74 |
| Human review queue | 41 |
| Expert/attending review routes | 30 |
| Compiler maturity | 5/7 |
| Independent QA score | 77/100 |
| Staging entities applied | 43 |
| Staging relationships applied | 29 |

Staging persistence: 117 proposal rows inserted and 1 updated with no errors.
The guarded apply marked 74 approved proposals applied. One entity was reused
because `loss-of-reduction` already existed. The curriculum bridge was skipped
because the `trauma-fundamentals` curriculum node does not yet exist. No claim
or decision point leaked into a verified state.

Remaining publication blockers:

- 44 proposals still require human review in the compiler review model.
- 30 items require expert/attending review.
- Essential-edge relationship metadata is below the publication threshold.
- Claims and decision points remain drafts.
- Nine critical/high ontology gaps remain, led by missing classification-grade
  coverage and procedure approach/anatomy detail.
- The final QA run used the offline/spec source because the DB-backed readback
  could not be authorized after staging apply; its “no approved canonical
  entities” blocker is therefore stale relative to the successful staging
  apply report.

Evidence packet: `ev-packet-70e7debb`. Evidence IDs:
`ev-anki-card-d05e7354`, `ev-canonical-snapshot-4ac27237`,
`ev-canonical-snapshot-c41a5b5c`, `ev-curriculum-node-38f62577`,
`ev-curriculum-node-50ad4a3e`, `ev-orthobullets-question-1eba6b78`,
`ev-proposal-history-5a138fde`, `ev-quality-signal-6e99f301`,
`ev-quality-signal-6ef3d7b8`, and `ev-review-history-634671f1`.

Manufacturing artifacts:

- [Evidence packet](../../reports/kg-evidence/trauma-fundamentals/evidence-packet.json)
- [Compiler plan](../../reports/kg-compiler/trauma-fundamentals/ontology-compiler-plan.json)
- [Gap report](../../reports/kg-compiler/trauma-fundamentals/ontology-gap-report.json)
- [Work plan](../../reports/kg-compiler/trauma-fundamentals/ontology-work-plan.json)
- [Agent assignments](../../reports/kg-compiler/trauma-fundamentals/agent-assignment-plan.json)
- [Agent execution](../../reports/kg-compiler/trauma-fundamentals/agent-execution-report.json)
- [Complete agent accounting](../../reports/kg-compiler/trauma-fundamentals/all-agent-accounting.md)
- [Merged neighborhood](../../reports/kg-compiler/trauma-fundamentals/merged-neighborhood-draft.json)
- [Neighborhood QA](../../reports/kg-audits/trauma-fundamentals/topic-scorecard.md)
- [Human review queue](../../reports/kg-pilots/trauma-fundamentals-human-review-queue.md)
- [Publication readiness](../../reports/kg-compiler/trauma-fundamentals/publication-readiness.json)
- [Staging persistence](../../reports/kg-pilots/trauma-fundamentals-persist-result.json)
- [Staging apply report](../../reports/kg-pilots/trauma-fundamentals-staging-apply-result.json)
- [Quality report](../../reports/kg-pilots/trauma-fundamentals-db-quality.json)

### Why this is next

Trauma is encountered early and repeatedly by students and residents, dominates
call and fracture conference, and is highly represented in OITE-style learning.
The repository already has dozens of fracture-specific roots, so a fundamentals
backbone immediately improves existing content instead of beginning an isolated
specialty.

It also creates reusable patterns needed everywhere else: urgency, diagnostic
workup, anatomy at risk, classification-to-treatment decisions, surgical
indications, fixation principles, complications, healing, and postoperative
restrictions. BroBot can use it for “what do I do first?” reasoning; CasePrep
can use it for initial workup and operative planning; curriculum progression
can reuse it from student foundations through chief-level decision making.

Compared with alternatives:

- Fracture classification/management alone would duplicate existing
  condition-specific specs without first modeling shared decision logic.
- Adult Reconstruction, Sports, and Hand already have substantial clusters;
  their best return now comes from review and shared infrastructure.
- Anatomy and surgical approaches are essential, but Trauma Fundamentals gives
  them an immediate clinical spine and exercises more of the KG model.
- Pediatrics and Spine are high-value but would create new islands with large
  specialist vocabulary and review burdens.
- An OITE-only neighborhood should be an overlay on verified clinical objects,
  not a parallel source of truth.

## Trauma Fundamentals build plan

### Scope and topic order

Phase 1 — immediate/safety foundation:

1. Trauma evaluation and resuscitation
2. Neurovascular assessment and documentation
3. Open fracture evaluation, antibiotics, tetanus, irrigation/debridement
4. Compartment syndrome recognition and fasciotomy principles
5. Reduction, immobilization, and post-reduction assessment
6. Soft-tissue injury and timing of fixation

Phase 2 — fracture reasoning:

7. Fracture description and stability
8. Imaging strategy and required views
9. Nonoperative versus operative indications
10. Damage-control versus early definitive fixation
11. Absolute/relative stability and strain theory
12. Fixation methods: screws, plates, nails, external fixation, wires
13. Articular reduction and alignment principles

Phase 3 — healing, complications, and progression:

14. Primary/secondary bone healing
15. Delayed union, nonunion, and malunion
16. Infection, wound, thromboembolic, and hardware complications
17. Weight-bearing and rehabilitation principles
18. Geriatric fragility-fracture principles
19. Pediatric physeal-injury principles (bridge, not full Pediatrics)
20. Polytrauma/team communication and transfer criteria

### Core node types

Use existing types wherever possible:

- `condition`: open fracture, compartment syndrome, nonunion, malunion
- `procedure`: reduction, irrigation/debridement, external fixation, fasciotomy
- `anatomy_structure`: compartments, named nerves/vessels, soft-tissue envelope
- `classification_system` and `classification_grade`: Gustilo-Anderson,
  Tscherne, AO/OTA concepts where licensing/provenance permits
- `diagnostic_test`, `imaging_finding`, `exam_maneuver`
- `treatment_principle`: damage control, stability, alignment, antibiotics
- `biomechanics_concept`: strain, working length, load sharing
- `implant` and `fixation_method`
- `complication`
- `surgical_approach` and `surgical_positioning` only when needed
- educational claims, decision points, learning objectives, and curriculum
  bridges as governed non-entity objects

Do not add new schema types until a concrete concept cannot be represented
without semantic distortion. Likely future candidates—medication, urgency
state, postoperative protocol—should first be tested as structured claims or
treatment principles and proposed separately.

### Core edges

Required existing predicates:

`involves_anatomy`, `injured_in`, `at_risk_structure`,
`has_classification`, `has_grade`, `has_imaging_finding`, `requires_imaging`,
`tested_by`, `examines`, `treated_by`, `treats`, `indicated_for`,
`contraindicated_for`, `indicates_treatment`, `uses_fixation`, `uses_implant`,
`uses_approach`, `uses_positioning`, `has_complication`, `prerequisite_for`,
`commonly_confused_with`, `differential_for`, `covered_by_curriculum_node`,
`taught_by_learning_objective`, and `expected_at_training_level`.

Before implementation, propose any missing semantics—especially
`temporally_precedes`, `requires_urgent_action`, `modifies_treatment`, and
`requires_monitoring`—as a small vocabulary RFC rather than overloading an
existing predicate.

### Required metadata

Every entity: stable slug, preferred/normalized label, type, definition,
aliases, lifecycle/review state, source provenance, confidence, scope notes,
and curriculum tags.

Every clinical edge: assertion context (adult/pediatric, open/closed,
hemodynamic status, anatomic region), confidence, provenance status, review
status, clinical importance, directionality rationale, and version/date.

Every claim/decision point: atomic text; trigger, action, exceptions,
urgency/safety criticality; learner level; BroBot mode relevance
(`study`, `clinical_reasoning`, `or_prep`, `oite`); source locator; authoring
method; reviewer role/status/date; and expiration/re-review date for
time-sensitive guidance.

### Example nodes and edges

Example nodes:

- `open-fracture` — condition
- `gustilo-anderson-classification` — classification system
- `type-iii-open-fracture` — classification grade
- `early-iv-antibiotic-administration` — treatment principle
- `urgent-irrigation-and-debridement` — procedure
- `absolute-stability` — biomechanics concept
- `lag-screw-fixation` — fixation method
- `radial-nerve` — anatomy structure
- `post-reduction-neurovascular-examination` — exam maneuver

Example edges:

- `open-fracture has_classification gustilo-anderson-classification`
- `open-fracture treated_by early-iv-antibiotic-administration`
- `type-iii-open-fracture indicates_treatment urgent-irrigation-and-debridement`
- `lag-screw-fixation treats simple-fracture-pattern`
- `absolute-stability prerequisite_for primary-bone-healing`
- `humeral-shaft-fracture at_risk_structure radial-nerve`
- `closed-reduction tested_by post-reduction-neurovascular-examination`
- `open-fracture has_complication fracture-related-infection`

Management-changing and time-sensitive examples must remain unapproved until
orthopaedic review and direct source support are recorded.

### Validation and publication checks

- Stable unique slugs; alias collision and duplicate detection.
- All endpoints exist and satisfy the predicate registry.
- No orphan topic roots or unconnected fundamentals.
- Bidirectional traversal tests for condition → workup → classification →
  decision → treatment → complication.
- Every fracture root links to at least anatomy, imaging, classification (when
  applicable), treatment principle, and complication objects.
- Every procedure links to anatomy at risk and positioning/approach where
  applicable.
- Every high-risk/time-sensitive claim and management-changing edge has direct
  provenance and attending approval.
- Classification grades must belong to exactly one declared system unless an
  explicit mapping records equivalence.
- Numeric thresholds include units, population/context, and source version.
- No claim is promoted from generated draft by automation.
- BroBot retrieval must distinguish reviewed facts from drafts and suppress
  unpublished decision points.
- CasePrep traversal smoke tests must return workup, setup, approach, fixation,
  risks, bailout/complications, and postoperative considerations.
- Curriculum tests must resolve prerequisite and expected-training-level paths.

### Source and provenance requirements

Use a source hierarchy:

1. Current society/consensus guidelines and authoritative standards for
   time-sensitive management.
2. Major peer-reviewed reviews or landmark primary literature for decisions
   and outcomes.
3. Standard orthopaedic trauma textbooks/handbooks for stable foundational
   anatomy, classifications, and fixation principles.
4. Educational sources only for discovery or cross-checking, never as the sole
   authority for a management-changing assertion.

Record edition/version, publication year, DOI/URL or stable identifier, exact
page/section/table when possible, extraction method, access date, and the
specific entity/edge/claim supported. Classification licensing and reuse terms
must be checked before storing detailed proprietary content.

### Product connections

- **BroBot:** retrieve a reviewed fundamentals subgraph before topic-specific
  facts; expose urgency and uncertainty; use learner level and mode metadata to
  vary depth without changing truth.
- **CasePrep:** compose procedure packets from injury, imaging, reduction,
  positioning, approach, fixation, anatomy-at-risk, complications, and postop
  nodes. Add explicit mappings rather than text-only duplication.
- **Student curriculum:** create a Trauma Fundamentals module with prerequisite
  paths from anatomy/initial assessment to fracture reasoning, then map each
  existing fracture topic to the shared objectives. Use training-level edges
  for student → junior resident → senior resident progression.
- **OITE:** tag verified claims with exam domain and cognitive task; generate
  review questions from the same canonical objects rather than creating a
  separate board-fact graph.

## Risks and blockers

- This audit did not query production; database approval/provenance counts may
  differ from the offline compiler view.
- Expert review capacity is the main bottleneck, not spec generation.
- Cross-neighborhood duplicate identities and snapshot count inflation can hide
  canonicalization debt.
- Classification copyright/licensing needs explicit review.
- Medication timing, urgency, and protocols are time-sensitive and require
  versioned sources and re-review.
- BroBot and CasePrep must never treat draft claims as verified clinical
  guidance.

No schema or runtime change is required to begin the documentation, source
packet, and topic-spec design. Any new entity type or predicate should be
proposed as a small reviewed migration after the first Trauma Fundamentals
packet demonstrates the need.

## Change log

| Date | Change | Evidence/verification | Author |
|---|---|---|---|
| 2026-07-08 | Created ledger; inventoried 106 registered roots; selected Trauma Fundamentals as next neighborhood | `kg:compile -- --help`; offline `kg:audit -- --all`; registry snapshot counts | Codex audit |
| 2026-07-08 | Manufactured Trauma Fundamentals and applied 43 entities plus 29 relationships to guarded staging | Evidence, compiler, agent, QA, review, publication, persist, and staging-apply reports linked above | Knowledge Factory |
| 2026-07-08 | Manufactured Orthopaedic Anatomy: 208 reusable entities, 198 relationships, 10 claims, and 3 decision points; 417 proposals auto-approved; staging persistence attempted and blocked by unavailable proposal table | Orthopaedic Anatomy evidence, compiler, agent, QA, review, publication, quality, and staging reports linked above | Knowledge Factory |
| 2026-07-08 | Manufactured Imaging & Radiographic Measurements: 108 entities, 192 relationships, 28 claims, 15 decision points; 277 auto-approved; 89 entities and 156 relationships applied to guarded staging; 18 duplicate identities prevented | Imaging evidence, compiler, agent, QA, review, publication, quality, and staging reports linked above | Knowledge Factory |
| 2026-07-08 | Manufactured Complications: 122 entities, 197 relationships, 24 claims, 18 decision points; 291 auto-approved; 79 entities and 166 relationships applied to guarded staging; 46 duplicate identities prevented; 20 prevention links | Complications evidence, compiler, agent, QA, review, publication, quality, and staging reports linked above | Knowledge Factory |
| 2026-07-08 | Manufactured Surgical Approaches: 183 entities, 927 relationships, 28 claims, 16 decision points; 1111 auto-approved; 134 entities and 817 relationships applied to guarded staging; 129 anatomy-at-risk edges; 49 duplicate identities prevented | Surgical Approaches evidence, compiler, agent, QA, review, publication, quality, and staging reports linked above | Knowledge Factory |
| 2026-07-08 | Manufactured Implants & Instruments: 153 entities, 220 relationships, 22 claims, 15 decision points; 346 auto-approved; 116 entities and 188 relationships applied to guarded staging; 36 duplicate identities prevented; 0 critical/high gaps remaining | Implants evidence, compiler, agent, QA, review, publication, quality, and staging reports linked above | Knowledge Factory |
| 2026-07-09 | Planned the canonical Carpal Tunnel Syndrome / Carpal Tunnel Release vertical; inventoried the registered partial seed and reusable cross-cutting coverage; identified identity, evidence, named procedure, anatomy-at-risk, recurrence, and postoperative blockers. Planning only; no manufacture or staging mutation. | `docs/kg/verticals/carpal-tunnel-syndrome-release-plan.md`; repository/offline inspection | Codex planning |
| 2026-07-09 | Completed the Carpal Tunnel Syndrome / Carpal Tunnel Release manufacturing-preparation pass: identity adjudication, focused evidence, source-mapping reconciliation, generic-seed quarantine, draft input package, reviewer routing, and product fixture plan. No manufacture, persistence, staging, publication, or maturity change. | `reports/kg-verticals/carpal-tunnel-syndrome/`; `reports/kg-evidence/carpal-tunnel-syndrome/` | Codex preparation |
| 2026-07-09 | Completed report-only dry-run manufacture of the Carpal Tunnel Syndrome / Carpal Tunnel Release vertical: 93 entities, 123 relationships, 8 draft claims, 8 draft decision points, 10/10 agents completed, 42 review items, QA 87/100, estimated Level 5/7, publication blocked. No persistence, staging, production write, publication, certification, or maturity-status change. | `reports/kg-verticals/carpal-tunnel-syndrome/dry-run-manufacture/` | Knowledge Factory dry run |
| 2026-07-15 | Built the artifact-backed vertical completion queue for all 113 registered neighborhoods. Four staging-applied adult-reconstruction neighborhoods advanced through strict database reload and independent database-backed audit: Adverse Local Tissue Reaction (78/100), Aseptic Loosening THA (78/100), Aseptic Loosening TKA (77/100), and Bearing Surface Selection (76/100). Each is now `database_verified`, publication blocked by 3 human/clinical and 1 attending decision plus publication provenance. | `reports/kg-scaling/vertical-completion-queue.json`; `reports/kg-verticals/*/strict-db-reload-report.md`; corresponding strict compiler and audit reports | Knowledge Factory vertical completion |
| 2026-07-15 | Re-attempted finalized Carpal Tunnel Syndrome proposal persistence against the allowlisted staging project. The content packet remains staging-ready with zero staging blockers, but persistence stopped before mutation because staging lacks `kg_proposal_batch_memberships`. | `reports/kg-staging/carpal-tunnel-syndrome/cts-0c2b2fa3ef5af8aa/`; `supabase/migrations/20260715_120000_kg_proposal_batch_memberships.sql` | Knowledge Factory staging guard |
| 2026-07-15 | Advanced Bone Loss in Revision Arthroplasty, Extensor Mechanism Failure, Hip Instability After THA, and Implant Fixation Principles from `staging_applied` to `database_verified` using strict database-only reloads and independent audits (79, 80, 79, and 78/100). Each remains publication-blocked by 3 clinical-curator decisions, 1 attending decision, and record-level provenance. | `reports/kg-verticals/{bone-loss-revision-arthroplasty,extensor-mechanism-failure,hip-instability-after-tha,implant-fixation-principles}/strict-db-reload-report.md` | Knowledge Factory vertical completion |
| 2026-07-15 | Consolidated publication review for 8 database-verified adult-reconstruction neighborhoods into one 32-item packet: 24 clinical-curator and 8 attending items. No valid prior decision matched; no clinical decision was fabricated or inherited. Seven separate packet sessions were avoided. | `reports/kg-scaling/consolidated-publication-review/` | Knowledge Factory review burden reduction |
| 2026-07-15 | Cleared the CTS schema gate and advanced Carpal Tunnel Syndrome from `staging_ready` to `database_verified`. Persisted 207 batch memberships; guarded apply created 58 canonical objects and safely reused/already-resolved 149; strict reload matched 92 entities and 114 relationships; audit 79/100; rollback dry run affects no reused rows. Publication remains blocked. | `reports/kg-staging/carpal-tunnel-syndrome/cts-0c2b2fa3ef5af8aa/`; `reports/kg-verticals/carpal-tunnel-syndrome/staging-lifecycle/strict-db-reload-report.md` | Knowledge Factory staging lifecycle |
| 2026-07-15 | Superseded the unscoped reloads for Knee Instability After TKA, Patellofemoral Arthroplasty, Periprosthetic Femur Fracture, Periprosthetic Knee Fracture, and Polyethylene Wear Osteolysis. Exact applied-membership reconstruction exposed missing applied curriculum bridges plus canonical/semantic identity conflicts, so all five remain `database_verification_blocked`. Exact next action: `resolve_canonical_identity`. | `reports/kg-verticals/{knee-instability-after-tka,patellofemoral-arthroplasty,periprosthetic-femur-fracture,periprosthetic-knee-fracture,polyethylene-wear-osteolysis}/strict-db-verification-blocked.json` | Knowledge Factory strict verification correction |
| 2026-07-15 | Hip Osteoarthritis strict reload was blocked without fallback: all entity slugs resolved, but 27 expected relationship triples were absent from active canonical state while the prior apply report marked 69 proposals applied, created zero relationships, and skipped 68 objects. Classified as `staging_integrity_failure`; no automatic edge creation attempted. Exact next action: `resolve_canonical_mismatch`. | `reports/kg-verticals/hip-osteoarthritis/strict-db-verification-blocked.json` | Knowledge Factory strict verification |
| 2026-07-15 | Inventoried 104 publication evidence signals for the 8-neighborhood consolidated review lane. Confirmed zero record-level publication evidence items; mapping counts, reference links, spec snapshots, and internal drafts were not promoted. Exact next action: `attach_record_level_sources_to_each_proposed_publication_object`. | `reports/kg-scaling/consolidated-publication-review/publication-provenance-inventory.json` | Knowledge Factory provenance inventory |
| 2026-07-16 | Exact applied-membership verification inspected Hip/Knee/General Prosthetic Joint Infection, Unicompartmental Knee Arthritis, Knee Osteoarthritis, Femoral Neck Fracture (Adult Recon), Calcaneus Fracture, Patella Fracture, Acetabular Fracture, Boxer Fracture, Distal Femur Fracture, Middle Phalanx Fracture, and Pilon Fracture. All were concretely blocked by missing applied curriculum bridges, canonical identity mismatches, or the shared `extensor-mechanism` semantic collision. No canonical repair was attempted; 62 partial membership rows from three halted repairs were quarantined as superseded/failed. Exact next actions are recorded per blocked report. | `reports/kg-verticals/*/strict-db-verification-blocked.json` | Knowledge Factory exact-membership verification |
| 2026-07-16 | Advanced Clavicle Fracture and Lisfranc Injury from `staging_applied` to `database_verified`. Exact immutable apply membership was reconstructed; membership-only repair persisted 34 and 49 reused structural proposals without canonical mutation; strict reload matched 6/27 and 16/32 entities/relationships plus one bridge each; independent audits scored 79 and 81/100 with zero discrepancies. Exact next action: `resolve_publication_blockers`. | `reports/kg-verticals/{clavicle-fracture,lisfranc-injury}/strict-db-reload-report.md` | Knowledge Factory vertical completion |
| 2026-07-16 | Exact applied-membership verification classified Talus Fracture, Compartment Syndrome, Femoral Shaft Fracture, LT Ligament Injury, and Proximal Humerus Fracture as `database_verification_blocked`. Blockers were the shared Extensor Mechanism semantic collision, missing LT curriculum node, unreconstructable aggregate-only created-object membership (35 for Compartment Syndrome; 6 for Proximal Humerus), and an AC-joint semantic collision. No canonical repair was attempted. | `reports/kg-verticals/{talus-fracture,compartment-syndrome,femoral-shaft-fracture,lt-ligament-injury,proximal-humerus-fracture}/strict-db-verification-blocked.json` | Knowledge Factory exact-membership verification |
| 2026-07-16 | Regenerated the 113-neighborhood completion queue after four verification waves: 49 `staging_applied`, 11 `database_verified`, 24 `database_verification_blocked`, 11 `publication_blocked`, 0 `publication_ready`, and 0 `production_active`. Next selected neighborhood: Proximal Phalanx Fracture (`run_strict_db_reload`). | `reports/kg-scaling/vertical-completion-queue.json` | Knowledge Factory queue checkpoint |
| 2026-07-16 | Built the normalized systemic blocker registry and resolved `EXTENSOR_MECHANISM_PROPOSAL_DRIFT` as historical proposal metadata drift. One active proposal and one legacy membership were normalized to the existing Knee Extensor Mechanism canonical identity; canonical graph counts remained 1,084 entities and 2,248 relationships. Seven affected neighborhoods advanced through exact membership repair and database-backed audits (81–84/100). | `reports/kg-scaling/blocker-registry.json`; `reports/kg-scaling/blockers/EXTENSOR_MECHANISM_PROPOSAL_DRIFT/`; affected `reports/kg-verticals/*/strict-db-verification-resolution.json` | Knowledge Factory blocker resolution |
| 2026-07-16 | Added guarded aggregate-created membership reconstruction requiring exact per-type counts and unique immutable packet fingerprints. Compartment Syndrome (35 targets, audit 80) and Proximal Humerus Fracture (63 targets, audit 83) advanced to `database_verified`; the latter also required metadata-only normalization of the historical `Ac Joint` proposal label. No canonical rows changed. Polyethylene Wear Osteolysis remains blocked because ten candidate fingerprints conflict with nine aggregate-created objects. | `reports/kg-verticals/{compartment-syndrome,proximal-humerus-fracture}/`; `reports/kg-scaling/blockers/AC_JOINT_PROPOSAL_DRIFT/` | Knowledge Factory provenance repair |
| 2026-07-16 | Reconciled the stale publication database-absence message across all 20 database-backed audits while preserving every clinical, attending, provenance, claim, decision-point, and ontology-gap gate. Final queue: 49 `staging_applied`, 20 `database_verified`, 15 `database_verification_blocked`, 20 `publication_blocked`, 0 `publication_ready`, and 0 `production_active`. Remaining blocker classes require review or unavailable evidence; next review packet is the 14-neighborhood curriculum bridge-node adjudication. | `reports/kg-scaling/systemic-blocker-resolution-report.md`; `reports/kg-scaling/blockers/CURRICULUM_BRIDGE_NODE_MISSING/adjudication-packet.md`; `reports/kg-scaling/vertical-completion-queue.json` | Knowledge Factory systemic blocker pass |
