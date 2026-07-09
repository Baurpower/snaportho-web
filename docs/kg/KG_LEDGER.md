# SnapOrtho Orthopaedic Knowledge Graph Ledger

Last audited: 2026-07-08  
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

Repository/offline audit on 2026-07-08:

| Metric | Result |
|---|---:|
| Registered topic neighborhoods | 107 |
| Entity specifications across snapshots | 6,131 |
| Relationship specifications across snapshots | 6,083 |
| Draft educational claims | 672 |
| Draft decision points | 208 |
| Mean independent audit score | 85/100 |
| Publication-ready neighborhoods | 0/106 |
| Certified neighborhoods | 0/106 |

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

### Trauma and fracture management — 62 roots — Partial

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
| Surgical Approaches | Stub | Entity vocabulary exists; systematic approach neighborhoods do not |
| Implants & Instruments | Stub | Implant/fixation entities exist locally; no reusable instrument/construct backbone |
| Complications | Partial | Local complication nodes exist; no cross-cutting complication taxonomy |
| Imaging & Radiographic Measurements | Partial | Local findings/tests exist; no reusable measurement/reference backbone |
| Postoperative Protocols | Not started | Weight bearing, immobilization, wound, therapy, surveillance |
| OITE / Board Concepts | Partial | Exam/curriculum metadata exists; no governed high-yield overlay |

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
