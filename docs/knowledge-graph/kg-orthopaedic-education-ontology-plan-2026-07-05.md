# SnapOrtho Orthopaedic Knowledge Network — Vision Blueprint

**Date:** 2026-07-05  
**Status:** Planning only — no code, no migrations, no product implementation  
**Scope:** Canonical knowledge network design (not curriculum views, not product UI)  
**Inputs:** [KG Excellence Roadmap](./kg-excellence-roadmap-2026-07-05.md), [Prepare Readiness Audit](../audits/kg-prepare-readiness-audit-2026-07-05.md), existing `canonical_entities` / `kg-relationship-registry.ts`

---

## 1. Vision

SnapOrtho is building the **Orthopaedic Knowledge Network** — a single, canonical graph that represents how orthopaedic knowledge actually works in clinical practice and in education.

This is not a taxonomy document. It is not a curriculum outline. It is not a content management schema. It is a **network blueprint**: a model of how orthopaedic concepts connect, how those connections are weighted for different learners and contexts, and how every SnapOrtho product traverses the same graph to assemble the right knowledge at the right moment.

**The canonical graph is the single source of truth.** Curriculum views, Prepare shells, BroBot, CasePrep, OITE drills, and adaptive reinforcement do not own medical knowledge. They hold **references** to canonical objects — entities, relationships, claims, decision points — and assemble a `LearningContext` by traversing the network according to product-specific rules.

**What we are building toward:** the world's most connected, traversable, educationally intelligent orthopaedic knowledge representation — dense in relationships, disciplined in provenance, and usable by every product without duplicating a single teaching assertion.

### What the current graph does well

- **Source isolation** — Anki and Orthobullets attach via mappings; they do not own ontology truth
- **Typed entity scaffold** — 13 `canonical_entity` types, relationship registry, governance/provenance tables
- **Ingestion pipeline** — 7,557 OB questions, 1,111 Anki card links, automation proposals, retargeting bridges
- **Bridge-first evolution** — `curriculum_node_entities`, parallel card/question entity links without mutating legacy mappings

### Why the network is not yet ready

- **Generic clinical ontology** — `condition` and `procedure` collapse fractures, infections, spine emergencies, and OA into one bucket without the relationship density that makes traversal useful
- **No claims or decision points in production** — management logic and learner traps live in static TS, not the graph
- **Sparse relationships** — registry defines ~25 predicates; automation emits only 3; zero production semantic density
- **Classifications and anatomy under-modeled** — Weber, Garden, mortise criteria, compartments exist as prose, not graph objects
- **Educational intelligence missing** — no L1–L4, context, traps, or `why_it_matters` on canonical objects
- **711/752 curriculum nodes blocked** from entity bridge — import overlay (`curriculum_nodes`) still acts as de facto topic ontology

### What stays outside the network

| Layer | Role |
|-------|------|
| **Curriculum views** | Reference-only ordering, rotation filters, display sequence — no duplicated medical text |
| **Product adapters** | Assemble `LearningContext` from graph references; no knowledge ownership |
| **Orthobullets / Anki** | Metadata assets and mappings — not canonical definitions |
| **`curriculum_nodes`** | Import overlay + bridge — not disease ontology |

---

## 2. Orthopaedic Knowledge Network Philosophy

Orthopaedic education fails when knowledge is stored as **isolated pages** — a fracture chapter here, an anatomy diagram there, a classification table somewhere else. Clinicians and learners do not think in silos. They think in **networks of connected concepts** that activate together at the bedside, in the OR, and on the exam.

The Orthopaedic Knowledge Network encodes that reality.

### Core principles

1. **Relationships are the product.** Nodes name things. Relationships express how things matter to each other. Products consume traversals, not static pages.

2. **The value of the KG is not the number of nodes. The value is the quality, density, organization, weighting, and traversability of the relationships between nodes.**

3. **Every concept participates in multiple overlapping networks.** A single diagnosis is simultaneously an anatomical problem, a biomechanical problem, an imaging problem, a classification problem, a management problem, and an exam problem. The graph must represent all of these without forcing a single hierarchy.

4. **Anatomy is the structural backbone.** Not because anatomy is "foundational content," but because anatomical structures are the highest-connectivity substrate in orthopaedics — the hub through which diagnoses, procedures, imaging, exam, complications, and implants all route.

5. **Metadata weights the network.** The same edge can be clinically critical but educationally secondary, or board-relevant but OR-irrelevant. Weighting metadata on relationships and assertions lets products filter the same graph for different purposes without duplicating content.

6. **Claims teach; decision points decide.** Atomic teaching assertions (`educational_claims`) and management-changing logic (`decision_points`) are first-class canonical objects — not prose buried in entity descriptions or curriculum bullets.

7. **One graph, many traversals.** Prepare, BroBot, CasePrep, OITE, and adaptive reinforcement all read the same canonical network. They differ only in **where they start** and **which edges they prioritize**.

8. **Provenance is non-negotiable.** Generated drafts, unreviewed assertions, and safety-critical content without attending review never reach learners.

---

## 3. Why Orthopaedics Is a Network, Not a Tree

Traditional medical education organizes orthopaedics as a **tree**: region → diagnosis → treatment → complications. Textbooks, rotation outlines, and curriculum nodes reinforce this hierarchy.

Orthopaedic practice does not work that way.

### Trees fail because concepts have multiple parents

- **Ankle fracture** is not "under" trauma and also "under" foot/ankle and also "under" OITE high-yield — it is all of these simultaneously
- **Compartment syndrome** spans anatomy (compartments), trauma (fractures), pediatrics (supracondylar), and call coverage — no single branch owns it
- **THA** connects to OA (indication), posterior approach (technique), dislocation (complication), and biomechanics (hip center) — a tree forces an arbitrary primary parent

### Networks succeed because clinical reasoning is traversal

When a resident evaluates an ankle injury, they do not recall a chapter. They traverse:

```
injury mechanism → anatomy (malleoli, syndesmosis, deltoid) → imaging (mortise views, clear space)
→ classification (Weber) → stability criteria → operative vs nonoperative decision
→ structures at risk → fixation options → complications → rehab milestones
```

Each step is a **relationship traversal**, not a page turn. The Orthopaedic Knowledge Network models this directly.

### Every orthopaedic concept participates in multiple overlapping networks

No single hierarchy can contain a high-yield orthopaedic topic. Consider **ankle fracture** — it is simultaneously connected to:

| Network | Example connections |
|---------|---------------------|
| **Anatomy** | Lateral/medial malleolus, syndesmosis, deltoid ligament, ankle ring |
| **Biomechanics** | Mortise stability, varus/valgus force transmission |
| **Imaging** | Mortise view, medial clear space, talar tilt |
| **Classification** | Weber A/B/C, SER patterns |
| **Instability** | Deltoid rupture, syndesmotic injury, mortise widening criteria |
| **Exam** | Palpation sequence, neurovascular exam, stress testing |
| **Treatment** | Nonoperative casting, ORIF, syndesmotic fixation |
| **Complications** | Malunion, PTLD, post-traumatic OA |
| **Procedures** | ORIF approaches, syndesmotic screw technique |
| **Implants** | Plates, screws, syndesmotic constructs |
| **Rehab** | Weight-bearing protocols, syndesmosis healing timeline |
| **Board traps** | "Isolated fibula fracture is always stable" |
| **Anki / questions** | Linked cards and OITE items testing mortise stability |

The graph does not pick one network as primary. It holds **all overlapping neighborhoods** and lets products traverse the relevant subgraph for the learner's context.

### Implication for SnapOrtho

- **Do not** model orthopaedics as nested curriculum folders that own content
- **Do** model orthopaedics as a connected graph where curriculum views are **lenses** (ordered references into the graph)
- **Do not** optimize for "complete topic pages"
- **Do** optimize for **dense, weighted, traversable relationship neighborhoods** around high-yield entities

---

## 4. Anatomy as the Structural Backbone

Anatomy is not just another entity type (`anatomy_structure`). It is the **high-connectivity substrate** of the entire Orthopaedic Knowledge Network.

### Why anatomy is the backbone

Anatomical structures are the most reused nodes in orthopaedic knowledge:

- **Diagnoses** `involve_anatomy` — fractures break bones; tears disrupt ligaments; compressions affect nerves
- **Procedures** `involve_anatomy` and `at_risk_structure` — every ORIF has a target bone and structures at risk
- **Imaging** maps to anatomy — medial clear space is about the deltoid and mortise; cord compression is about the canal
- **Exam maneuvers** test anatomy — Lachman tests the ACL; SLR tensions the nerve roots
- **Complications** damage anatomy — AVN affects femoral head; nerve injury affects radial nerve
- **Implants** attach to anatomy — plates on bone, components in joint space
- **Biomechanics** describes forces across anatomy — varus moment at the knee, hip center of rotation

A well-connected anatomical subgraph acts as a **router**: products can enter at a diagnosis, a procedure, or an exam finding and still reach the same anatomical neighborhood.

### Anatomy kinds and granularity

Use `anatomy_kind` metadata to distinguish bones, joints, compartments, ligaments, tendons, nerves, vessels — without exploding entity types. Compartments deserve special attention: they are the bridge between regional anatomy and emergencies like compartment syndrome.

**Do not** use generic buckets ("upper extremity") as graph nodes. **Do** use specific, relationship-dense structures (distal radius, anterior compartment, syndesmosis).

### Anatomy as prerequisite infrastructure

Regional anatomy nodes should carry `prerequisite_for` edges to the diagnoses and procedures they enable:

```
ankle ring anatomy ──prerequisite_for──► ankle fracture
anterior leg compartment ──prerequisite_for──► compartment syndrome
lumbar canal anatomy ──prerequisite_for──► cauda equina syndrome
```

Products building foundational knowledge traverse **anatomy → prerequisite chain → clinical entity**. Products building call readiness traverse **clinical entity → involves_anatomy → at_risk_structure**.

### What anatomy is not

- Anatomy nodes do not contain teaching prose — claims on anatomy entities carry pearls (`anatomy_pearl`, `red_flag`)
- Anatomy is not a separate silo — it is the connective tissue between every other network

---

## 5. Relationships as the Core Product

If nodes are nouns, relationships are sentences. The Orthopaedic Knowledge Network is built from **typed, directed, metadata-rich edges** that express clinical and educational meaning.

### What a relationship carries

A relationship is not a foreign key. It is a **canonical assertion** that two entities are connected in a specific, governed way:

- **Weber classification system** `has_classification` **ankle fracture**
- **Ankle fracture** `at_risk_structure` **superficial peroneal nerve**
- **Unstable mortise pattern** `indicates_treatment` **ORIF**
- **Ankle ring anatomy** `prerequisite_for` **ankle fracture**
- **CES** `must_distinguish_from` **lumbar radiculopathy**

### Relationship registry (Phase 1 — high value)

| Predicate | Subject → Object | Example |
|-----------|------------------|---------|
| `involves_anatomy` | condition/procedure → anatomy_structure | DR fracture → distal radius |
| `at_risk_structure` | condition/procedure → anatomy_structure (nerve/vessel) | Supracondylar → AIN |
| `contained_in_compartment` | anatomy_structure → anatomy_structure (compartment) | Tibialis anterior → anterior compartment |
| `has_classification` | condition → classification_system | Ankle fracture → Weber |
| `has_grade` | condition → classification_grade | Femoral neck → Garden III |
| `has_imaging_finding` | condition → imaging_finding | Ankle → medial clear space widening |
| `requires_imaging` | condition → imaging_modality/diagnostic_test | CES → urgent MRI |
| `presents_with` | condition → clinical_sign | CS → pain with passive stretch |
| `has_complication` | condition/procedure → complication | THA → dislocation |
| `risk_factor_for` | condition/sign → complication | Displaced neck → AVN |
| `indicated_for` | procedure/fixation_method → condition | Fasciotomy → compartment syndrome |
| `treated_by` | condition → procedure/treatment_principle | CS → fasciotomy |
| `uses_approach` | procedure → surgical_approach | THA → posterior approach |
| `uses_implant` | procedure → implant | IT fracture → cephalomedullary nail |
| `uses_fixation` | condition → fixation_method | Ankle → ORIF |
| `indicates_treatment` | classification_grade/imaging_finding → procedure/treatment_principle | Unstable mortise → ORIF |
| `prerequisite_for` | entity → entity | Ankle ring anatomy → ankle fracture |
| `must_distinguish_from` | condition → condition | CES → lumbar radiculopathy |
| `commonly_confused_with` | entity ↔ entity | Scaphoid ↔ wrist sprain |
| `supported_by_card` | entity/claim → canonical_card | Asset link |
| `explained_by_claim` | entity → educational_claim | Ankle fracture → trap claim ID |

**Directionality:** All predicates are directed. Registry enforces subject/object entity types; automation cannot emit high-risk edges without review.

**Phase 2 (after v1 pilots):** `supplies_blood_to`, `innervates`, `causes_instability`, `measured_by`, `requires_urgent_action`, `has_postop_protocol`, `illustrated_by`, `builds_toward`

**Do not add (or defer):** `passes_through`; `has_step`/`has_pitfall` as edges (use claims); `changes_management` as edge (use decision_points); edges to `curriculum_node` as semantic truth (bridge only)

### Relationship density targets

A graph-complete topic is not defined by entity count. It is defined by **relationship neighborhood completeness** — see [Canonical Connection Patterns](#9-canonical-connection-patterns) and [Appendix B](#appendix-b-graph-complete-exemplar-neighborhoods).

### Claims and decision points complete the relationship layer

Some knowledge cannot be reduced to entity–entity edges:

| Knowledge type | Canonical object | Example |
|----------------|------------------|---------|
| Atomic teaching truth | `educational_claim` | "Pulses can be normal in compartment syndrome" |
| Management-changing logic | `decision_point` | Unstable mortise → operative fixation pathway |
| Named clinical thing | `entity` | Weber B fracture pattern |
| Connection between things | `relationship` | Ankle fracture `has_classification` Weber |

**Rule:** If it changes what you **do** → decision point. If it teaches what is **true** or **commonly missed** → claim. If it is a **named clinical thing** → entity. If it connects two things → relationship.

---

## 6. Metadata as the Weighting System

The same graph serves a PGY-1 on call, a PGY-3 in clinic, and a chief resident drilling OITE — without duplicating content. **Metadata weights the network** so traversals return the right edges and assertions for each context.

### Two layers of metadata

1. **Object metadata** — on entities, claims, and decision points (importance level, context relevance, learner stage, safety criticality, provenance)
2. **Relationship metadata** — on edges themselves (strength, clinical vs educational priority, board relevance, display priority)

Relationship metadata is what makes the **same edge** appear in BroBot's clinical neighbor query but not in a fellowship-level conference drill — or vice versa.

### Relationship metadata fields

Every canonical relationship should support (or aspire to support) the following weighting dimensions:

| Field | Purpose |
|-------|---------|
| `relationship_strength` | How central is this connection to understanding the subject? (core vs peripheral) |
| `clinical_importance` | How much does this edge matter for patient care? |
| `educational_importance` | How much should learners prioritize this connection? |
| `management_importance` | Does this edge influence treatment decisions? |
| `board_relevance` | OITE / in-training exam emphasis |
| `rotation_relevance` | Which rotations most need this edge (trauma, sports, spine, etc.) |
| `learner_stage_relevance` | PGY-1 vs PGY-3 vs fellow vs attending |
| `context_relevance` | Call, clinic, OR, conference, OITE, off-service |
| `frequency` | How often does this connection appear in practice / exams |
| `confidence` | Curator confidence in the assertion (0–1 or enum) |
| `evidence_quality` | Guideline, textbook, expert consensus, inferred |
| `provenance` | Source record, reviewer, derivation |
| `review_status` | unreviewed → in_review → approved / rejected / conflicted |
| `display_priority` | Ordering hint when multiple edges compete in UI traversal |

### Object metadata (claims, DPs, entities)

| Field | Application |
|-------|-------------|
| `importance_level` (L1–L4) | L1 = must-know; L4 = fellowship nuance |
| `why_it_matters` | Learner motivation — patient safety, exam, OR survival |
| `context_relevance` | Where this assertion surfaces |
| `learner_stage` | Who should see this now |
| `safety_criticality` | none → emergency |
| `exam_emphasis` / `attending_question_likelihood` | Board and pimp probability |
| `content_source` / `review_status` | Governance gate |

### How weighting changes traversal

Without metadata, a traversal from "ankle fracture" returns **every** connected node equally. With metadata, products apply filters:

- **Prepare:** L1 claims + high-priority anatomy + decision points + common traps
- **BroBot:** current entity + nearest clinically meaningful neighbors (high `clinical_importance`, high `relationship_strength`)
- **OITE:** edges with high `board_relevance` + `board_trap` claims
- **Call coverage:** edges with `context_relevance` including `call` + emergency DPs

Metadata is the **tuning knob** that makes one graph feel like five purpose-built products.

---

## 7. Traversal: How Products Navigate the Same Graph

Products do not consume static pages. They **traverse the graph** — starting from an entry node, following weighted edges, collecting claims and decision points, and assembling a `LearningContext`.

Every product uses the **same canonical network**. Products differ in entry point, depth, edge filters, and assertion priorities.

### Traversal model

```
Entry node → edge filter (predicate + metadata) → neighbor nodes
           → collect claims/DPs on visited nodes
           → optional prerequisite/backlink expansion
           → assemble LearningContext → render in product shell
```

Curriculum views supply **ordered entry references** (e.g., "tonight's rotation topics"). They do not supply content.

### Product traversal patterns

#### Prepare traversal

**Goal:** Rotation-ready knowledge — must-know claims, foundational anatomy, management decision points, predictable traps.

**Entry:** Curriculum view item → primary entity (condition or procedure)

**Traverse:**
1. L1 claims on primary entity (`importance_level = L1`, `review_status = approved`)
2. High-priority anatomy (`involves_anatomy`, `at_risk_structure` with high `educational_importance`)
3. Decision points (`safety_criticality` ≥ moderate for call-relevant topics)
4. Cognitive traps and board traps (`claim_type` in `cognitive_trap`, `board_trap`)
5. Prerequisite anatomy chain (`prerequisite_for` inbound, depth 1–2)

**Stop condition:** L1 cap reached (~12 claims per cluster); required connection pattern satisfied.

#### BroBot traversal

**Goal:** Conversational clinical intelligence anchored on the entity the learner is discussing.

**Entry:** Current entity from conversation context

**Traverse:**
1. Nearest clinically meaningful neighbors (high `clinical_importance` + `relationship_strength`)
2. Claims explaining those connections (`explained_by_claim` edges)
3. Decision points triggered by discussed findings
4. `must_distinguish_from` / `commonly_confused_with` for differential framing

**Stop condition:** Context window budget; do not traverse low-confidence or unreviewed edges in production.

#### CasePrep traversal

**Goal:** Operative readiness — indication through complications.

**Entry:** Procedure entity (e.g., ORIF ankle, THA)

**Traverse:**
```
procedure → indicated_for → condition(s)
         → uses_approach → anatomy involved
         → at_risk_structure → structures at risk
         → uses_implant / uses_fixation → implant nodes
         → has_complication → complications
         → operative_pearl claims + intraop decision points
```

**Stop condition:** Connection pattern for procedure neighborhood complete.

#### OITE traversal

**Goal:** Exam-optimized drilling — classifications, traps, commonly confused pairs.

**Entry:** Classification system, high-yield condition, or question-linked entity

**Traverse:**
1. `has_classification` / `has_grade` neighborhood
2. `board_trap` and `cognitive_trap` claims (high `board_relevance`)
3. `commonly_confused_with` / `must_distinguish_from` edges
4. Linked questions and cards (`supported_by_card`, question entity links)

**Stop condition:** Exam-relevant subgraph exhausted at configured depth.

#### Adaptive traversal

**Goal:** Close knowledge gaps revealed by missed questions or weak cards.

**Entry:** Missed question → linked entity, or weak claim/trap ID

**Traverse:**
1. Identify failed assertion (claim or DP)
2. Walk `prerequisite_for` chain backward to foundational gap
3. Collect reinforcement claims at appropriate `learner_stage`
4. Link forward to `supported_by_card` for spaced repetition

**Stop condition:** Prerequisite chain root reached; reinforcement set sized for session.

### Traversal anti-patterns

| Anti-pattern | Why it fails |
|--------------|--------------|
| Product-specific content tables | Duplicates truth; drifts from canonical graph |
| Static "topic pages" assembled once | Cannot adapt to learner stage or context |
| Unweighted BFS over all edges | Noise drowns high-yield connections |
| Curriculum node text as traversal source | Import buckets ≠ clinical network |
| Traversal without provenance gate | Unreviewed assertions reach learners |

---

## 8. Canonical Objects and Schema Implications

The network vision above implies a concrete but **secondary** schema layer. Schema serves the network — not the other way around.

### Object model summary

| Layer | Objects | Role in network |
|-------|---------|-----------------|
| **Entities** | ~18 typed nodes | Named clinical things (conditions, procedures, anatomy, classifications, etc.) |
| **Relationships** | Typed directed edges | How entities connect — the core product |
| **Assertions** | `educational_claims`, `decision_points` | Teaching truths and management logic |
| **Assets** | Cards, questions, case modules | Linked evidence — not definitions |
| **Metadata** | On edges and assertions | Weighting for traversal |
| **Governance** | Provenance, review status | Safety and quality gates |

### Entity vs claim vs decision point (quick reference)

| Content | Store as | Example |
|---------|----------|---------|
| "Distal radius fracture" exists | Entity `condition` + `clinical_kind=fracture` | — |
| Median nerve at risk in DR fracture | Relationship `at_risk_structure` → nerve | — |
| Weber B ankle fracture pattern | Entity `classification_grade` + `has_classification` | — |
| Medial clear space > 4mm suggests instability | Claim `imaging_point` OR DP threshold | Prefer DP if management-changing |
| Unstable mortise → operative fixation | Decision point | — |
| "Pulses normal so no compartment syndrome" | Claim `cognitive_trap` | — |
| L1 importance, call context | Metadata on claim/DP/edge | — |

### Design rules

- Use **`clinical_kind` metadata** on `condition` rather than dozens of entity types
- Use **`anatomy_kind` metadata** on `anatomy_structure` for bone/joint/compartment/nerve distinction
- **Do not** add entity types for traps, red flags, or operative steps — use claims and DPs
- **Classifications** must be entities (systems and grades) so `indicates_treatment` edges are traversable

Full entity taxonomy, claim types, DP schema, and provenance rules are in **Appendix A**.

---

## 9. Canonical Connection Patterns

**Canonical Connection Patterns** are expected connection neighborhoods that vary by node type and context. They are **not rigid templates** and **not curriculum modules**. They are quality rubrics for relationship density — answering: "Is this entity's neighborhood complete enough to traverse?"

A fracture entity without `at_risk_structure` edges is a dead end. A procedure without `indicated_for` is orphaned. Connection patterns define what "complete enough" means.

### Fracture neighborhood

| Expected connections | Type |
|---------------------|------|
| `condition` entity (`clinical_kind=fracture`) | Entity |
| ≥2 `anatomy_structure` via `involves_anatomy` / `at_risk_structure` | Relationships |
| `classification_system` + optional `classification_grade` | Entity + relationships |
| ≥1 `imaging_finding` or `imaging_modality` | Entity + relationship |
| ≥1 operative vs nonoperative **decision_point** | Assertion |
| ≥1 `fixation_method` or `procedure` via `uses_fixation`/`treated_by` | Entity + relationship |
| ≥1 `complication` via `has_complication` | Entity + relationship |
| 5–12 L1 + ≥2 L2 **claims**; ≥2 `cognitive_trap` claims | Assertions |
| `prerequisite_for` from regional anatomy | Relationship |
| L1 claims: `why_it_matters`, `context_relevance`, provenance | Metadata |

### Procedure neighborhood (ORIF, fasciotomy, etc.)

| Expected connections | Type |
|---------------------|------|
| `procedure` entity | Entity |
| `indicated_for` → condition(s) | Relationship |
| `uses_approach`, `uses_positioning`, optional `uses_implant` | Relationships |
| ≥2 `at_risk_structure` / `involves_anatomy` | Relationships |
| ≥1 `has_complication` | Relationship |
| ≥3 DPs: indication, key intraop decision, postop priority | Assertions |
| Claims: `operative_pearl`, `complication_warning`, `cognitive_trap` | Assertions |
| Context tags: `or`, `call` on OR-relevant claims/DPs | Metadata |

### Spine emergency neighborhood (CES, cord compression)

| Expected connections | Type |
|---------------------|------|
| `condition` (`clinical_kind=syndrome`) | Entity |
| `presents_with` → `clinical_sign` entities | Relationships |
| `requires_imaging` → MRI | Relationship |
| `must_distinguish_from` → radiculopathy | Relationship |
| ≥2 **emergency** DPs with `safety_criticality=emergency` | Assertions |
| ≥3 `red_flag` / `cognitive_trap` L1 claims | Assertions |
| Attending safety review on all L1 | Provenance |

### Infection neighborhood (septic arthritis, osteomyelitis)

| Expected connections | Type |
|---------------------|------|
| `condition` (`clinical_kind=infection`) | Entity |
| `diagnostic_test` + lab/imaging claims | Entity + assertions |
| Urgent drainage / antibiotics **DP** | Assertion |
| `has_complication` (joint destruction, sepsis) | Relationship |
| `cognitive_trap` (missed hip septic in limping child) | Assertion |
| Kocher criteria as `classification_system` if pediatric hip | Entity |

### Arthroplasty neighborhood (THA/TKA)

| Expected connections | Type |
|---------------------|------|
| `procedure` entity | Entity |
| `prerequisite_for` from `condition` (OA) | Relationship |
| `uses_approach`, `uses_implant` | Relationships |
| `has_complication`: dislocation, infection, periprosthetic fracture | Relationships |
| DPs: indication, instability/dislocation response, suspected PJI workup | Assertions |
| Claims: components overview (L2), precautions (L1), `operative_pearl` | Assertions |
| Trap: "know parts but not precautions" | Assertion |

**Graph-complete** = connection pattern requirements met + every L1 claim verified + DPs approved + relationship metadata populated for Phase 1 predicates.

---

## 10. Implementation Tickets

Schema and curation work serves the network vision. Tickets are ordered to build **traversable neighborhoods** on high-yield topics — not to inflate entity count.

| # | Ticket | Output |
|---|--------|--------|
| 1 | **ONT-001** Publish network vision + taxonomy v1 appendix | This doc frozen as v1 |
| 2 | **ONT-002** Relationship registry v1 — Phase 1 predicates + type constraints + relationship metadata spec | Registry design doc |
| 3 | **ONT-003** `educational_claims` + `decision_points` field spec | Schema design doc (Appendix A) |
| 4 | **ONT-004** Canonical Connection Pattern checklists per neighborhood type | Curation rubric |
| 5 | **ONT-005** Additive migration design: 4 entity types + 2 assertion tables + relationship metadata columns | No prod apply yet |
| 6 | **ONT-006** Extend `kg-relationship-registry.ts` + DB CHECK for v1 predicates | Phase B |
| 7 | **ONT-007** Pilot neighborhood: **compartment syndrome** (full exemplar) | 1 graph-complete topic |
| 8 | **ONT-008** Pilot: **ankle fracture** + **CES** neighborhoods | 3 total pilots |
| 9 | **ONT-009** Provenance/review workflow + safety gate rules | Appendix A operationalized |
| 10 | **ONT-010** Quality report: connection pattern coverage, orphan/duplicate detection, traversal smoke tests | Script spec |

### Recommended first 20 graph-complete topics

CES, compartment syndrome, septic arthritis, osteomyelitis, ankle fracture, distal radius fracture, femoral neck fracture, intertrochanteric fracture, tibial shaft fracture, supracondylar humerus, SCFE, ACL tear, lumbar radiculopathy, carpal tunnel, rotator cuff, hip OA, knee OA, THA, TKA, pediatric hip septic arthritis

### What not to build yet

- 30+ entity types; `operative_step` entities; vector embeddings; `concepts` population
- Curriculum view tables in this doc; product adapters; auto-apply safety DPs
- 50 predicates before 20 complete neighborhoods
- Fellowship L4 depth before safety L1 complete on pilot topics

### Migration path

```
A: Network vision + definitions (this doc)
B: Additive schema (entity types, assertion tables, relationship metadata)
C: Entity cleanup — top 100 high-connectivity nodes
D: Registry hardening — Phase 1 predicates live
E: Connection pattern pilots — 3→20 topics
F: Curation workflow + provenance gates
G: Product read adapters (separate doc)
```

---

## Appendix A: Schema and Taxonomy Reference

*Implementation detail supporting the network vision. Entity taxonomy is a means to typed nodes — not the organizing principle of the Orthopaedic Knowledge Network.*

### A.1 Canonical KG Object Taxonomy v1

**Design rule:** ~18 entity types + 2 assertion tables (`educational_claims`, `decision_points`). Use **`clinical_kind` metadata** on `condition` rather than dozens of entity types.

#### Entity types (keep / add / refine)

| Type | Verdict | Belongs here | Does not belong |
|------|---------|--------------|-----------------|
| `condition` | **Keep** — anchor type | Fractures, dislocations, OA, infections, syndromes (CES), soft-tissue injuries | Teaching bullets, traps, "must know" lists |
| `procedure` | **Keep** | THA, ORIF, fasciotomy, CTR, microdiscectomy | Individual operative steps (use claims) |
| `anatomy_structure` | **Keep** — use `anatomy_kind` metadata | Bones, joints, compartments, ligaments, tendons, nerves, vessels | Generic "upper extremity" buckets |
| `classification_system` | **Keep** | Weber, Garden, Gartland, Kocher criteria (when system) | Single grades (see below) |
| `classification_grade` | **Add v1** | Garden III, Gartland type III, unstable pattern grade | Whole classification system |
| `complication` | **Keep** | AVN, malunion, PJI, dislocation, nerve injury | Preventable pearls (→ claims) |
| `imaging_finding` | **Keep** | Medial clear space widening, cord compression, joint effusion | Full imaging reports |
| `imaging_modality` | **Add v1** | X-ray mortise view, MRI lumbar, CT ankle | — |
| `diagnostic_test` | **Keep** | Compartment pressure measurement, ESR/CRP, joint aspiration | Lab interpretation prose |
| `exam_maneuver` | **Keep** | Lachman, SLR, Tinel, passive stretch test | — |
| `implant` | **Keep** | Cephalomedullary nail, acetabular component, suture anchor | Brand marketing names |
| `fixation_method` | **Add v1** | ORIF, IM nail, percutaneous pinning, external fixation | — |
| `surgical_approach` | **Keep** | Posterior THA, volar distal radius, two-incision fasciotomy | — |
| `surgical_positioning` | **Keep** | Lateral decubitus, supine traction table | — |
| `treatment_principle` | **Keep** | Urgent decompression, nonoperative casting, DVT prophylaxis | — |
| `biomechanics_concept` | **Keep** | Varus moment, mortise stability, hip center of rotation | — |
| `clinical_sign` | **Add v1** | Saddle anesthesia, pain out of proportion, shortened externally rotated limb | Red-flag assertions (→ claims link sign entity) |

**`condition.clinical_kind` metadata (required for connection patterns):**  
`fracture | dislocation | degenerative | sports_soft_tissue | infection | pediatric | spine | tumor | syndrome | other`

**Do not add v1:** `operative_step`, `instrument`, `fluoroscopy_view`, `red_flag`, `cognitive_trap` as entities — use claims/DPs.

#### Assertion tables (not entity types)

| Object | Table | Role |
|--------|-------|------|
| Educational claim | `educational_claims` | Atomic teaching assertions, traps, pearls |
| Decision point | `decision_points` | Management-changing if/then logic |

#### Assets (linked, not definitions)

`canonical_cards`, `external_questions`, future `case_modules` — link to entities/claims by ID.

### A.2 Decision Point Schema

```text
decision_points
  id, subject_entity_id (FK condition/procedure)
  pattern_type: emergent_action | operative_indication | nonoperative_eligible
              | imaging_escalation | consult_threshold | postop_response
              | return_to_sport | revision_trigger
  trigger, finding, threshold, comparator, condition_modifier
  action, rationale, exception
  urgency: routine | urgent | emergent
  safety_criticality: none | moderate | high | emergency
  why_it_matters text[]
  context_relevance text[]
  learner_stage text
  importance_level (usually L1 for management changers)
  content_source, review_status, provenance FKs
  is_active, deprecated_at, replacement_dp_id
```

| Topic | Pattern | Sketch |
|-------|---------|--------|
| Compartment syndrome | emergent_action | passive stretch pain → escalate fasciotomy eval |
| CES | emergent_action | urinary retention → urgent MRI + spine consult |
| Ankle fracture | operative_indication | unstable mortise → ORIF pathway |
| Femoral neck | operative_indication | displaced + elderly → arthroplasty pathway |
| SCFE | operative_indication | unstable SCFE → urgent pinning |
| Septic arthritis | emergent_action | septic hip suspicion → urgent aspiration/drainage |
| THA | postop_response | dislocation precaution breach → reduction protocol |

### A.3 Educational Claim Schema

```text
educational_claims
  id, primary_entity_id (FK), optional secondary_entity_ids[]
  claim_text, claim_type (enum below)
  importance_level L1-L4
  why_it_matters text[], context_relevance text[], learner_stage
  safety_criticality, management_impact boolean
  corrects_misconception text (for traps)
  linked_decision_point_id, linked_relationship_id (optional)
  exam_emphasis, attending_question_likelihood (0-1)
  content_source: verified | generated_draft | needs_review | deprecated
  review_status, safety_reviewed_at, provenance FK
  is_active, deprecated_at, replacement_claim_id
```

#### Claim types v1

| Type | Purpose | Use when | Avoid when |
|------|---------|----------|------------|
| `fact` | Core true statement | Exam findings, definitions | Management if/then (→ DP) |
| `mechanism` | Injury/degeneration mechanism | FOOSH, varus moment | — |
| `anatomy_pearl` | High-yield anatomy | MFCA supply | Full anatomy textbook |
| `imaging_point` | Interpretation pearl | Medial clear space | Entire read protocol |
| `classification_pearl` | Grading nuance | Weber B = lateral malleolus | Grade exists as entity |
| `indication` / `contraindication` | Treatment eligibility prose | Nonoperative candidate | Clear DP exists |
| `complication_warning` | Watch for X | THA dislocation | Complication entity enough alone |
| `cognitive_trap` | Predictable error | Pulses rule out CS | — |
| `common_mistake` | Learner pattern | Forgetting DRUJ check | — |
| `attending_pearl` | Pimp answer | Acceptable radial height | — |
| `board_trap` | OITE distractor | Always ORIF isolated fibula | — |
| `operative_pearl` | OR survival | Traction table timeout | — |
| `red_flag` | Cannot-miss sign | Saddle numbness | — |
| `clinical_script` | Rounds phrasing | One-liner presentation | — |

**L1 cap:** ≤12 claims per primary entity cluster.

### A.4 Provenance and Review Model

| Field / rule | Application |
|--------------|-------------|
| `content_source` | All claims, DPs, relationships |
| `review_status` | unreviewed → in_review → approved / rejected |
| `ontology_provenance_records` | Per claim, DP, relationship |
| Safety-critical | `safety_criticality >= high` requires `safety_reviewed_at` + attending reviewer |
| Public consumption | **Only** `review_status=approved` AND `content_source=verified` |
| Generated draft | LLM proposals → `generated_draft`; never public |
| Stale policy | L1 safety content: review every 12 months; L2: 24 months |
| Deprecation | `replacement_claim_id` / `replacement_dp_id`; never hard-delete |
| Conflict | `review_status=conflicted`; two approved claims cannot contradict on same entity+L1 without exception field |

**Source categories:** textbook, guideline, society statement, curated Anki, expert reviewer, Orthobullets metadata (mapping only, not stem).

### A.5 Anti-Patterns

| Anti-pattern | Why bad |
|--------------|---------|
| New entity type per fracture nuance | Taxonomy explosion; use `clinical_kind` |
| `cognitive_trap` as entity | Traps are claims |
| Classification as free text claim only | Cannot link `indicates_treatment` |
| Procedure modeled only as condition | Loses approach/implant structure |
| Decision logic only in claim prose | Not machine-traversable |
| `curriculum_nodes` as disease ontology | Import buckets ≠ truth |
| Generated LLM as verified | Safety risk |
| Relationships without type constraints | Graph pollution |
| 50 predicates before 20 complete topics | Empty registry theater |
| Fellowship L4 before safety L1 complete | Wrong prioritization |
| Duplicate claim text as entity label | Two truths drift |
| Optimizing node count over edge quality | Violates core network principle |

### A.6 Integration with Existing Schema

| Artifact | Verdict |
|----------|---------|
| `canonical_entities` | **Extend** — add `classification_grade`, `fixation_method`, `imaging_modality`, `clinical_sign`; metadata `clinical_kind` |
| `canonical_relationships` | **Extend** predicates + relationship metadata per Section 6 |
| `educational_claims`, `decision_points` | **Add** — core educational layer |
| `curriculum_nodes` | **Legacy overlay** — bridge via `curriculum_node_entities` only |
| `concepts` | **Do not use** — empty; superseded by claims + entities |
| `card/question_canonical_entity_links` | **Keep** — retarget to entities |
| `kg_automation_proposals` | **Keep** — proposals only |
| `ontology_governance_actions` | **Keep** — merge/deprecate entities/claims |

---

## Appendix B: Graph-Complete Exemplar Neighborhoods

Five pilot neighborhoods demonstrating traversable connection density.

### Compartment syndrome

**Entities:** `condition` (CS), `anatomy_structure` (anterior leg compartment), `clinical_sign` (pain with passive stretch), `procedure` (fasciotomy), `complication` (muscle necrosis)  
**Relationships:** sign `presents_with` CS; CS anatomy involvement; CS `treated_by` fasciotomy; CS `has_complication` necrosis  
**Claims (L1):** clinical diagnosis primary; trap: pulses unreliable  
**DP (emergent):** passive stretch pain → escalate fasciotomy eval  
**Metadata:** safety=emergency, context=call,or

### Cauda equina syndrome

**Entities:** `condition` (CES), `clinical_sign` (urinary retention, saddle anesthesia), `imaging_modality` (MRI lumbar)  
**Relationships:** signs `presents_with` CES; CES `requires_imaging` MRI; CES `must_distinguish_from` radiculopathy  
**Claims (L1):** red_flag bladder symptoms; trap: attributing to routine radiculopathy  
**DP (emergent):** retention/saddle → urgent MRI + decompression consult  
**Metadata:** safety=emergency

### Ankle fracture

**Entities:** `condition` (ankle fracture, kind=fracture), `classification_system` (Weber), `imaging_finding` (medial clear space widening), `fixation_method` (ORIF), `anatomy_structure` (ankle ring)  
**Relationships:** `has_classification`, `has_imaging_finding`, `uses_fixation`, anatomy `prerequisite_for` fracture  
**Claims:** L1 mortise stability; trap: isolated fibula stable  
**DP:** unstable mortise → operative fixation  
**Metadata:** context=clinic,call,or

### Distal radius fracture

**Entities:** `condition` (DR fracture), `anatomy_structure` (median nerve, DRUJ), `fixation_method` (volar plating)  
**Relationships:** `at_risk_structure` median nerve; `uses_fixation` plating  
**Claims:** L1 NV exam before/after reduction; trap: reduction ends visit  
**DP:** unacceptable alignment/instability → fixation  
**Metadata:** context=clinic,call

### THA

**Entities:** `procedure` (THA), `condition` (hip OA), `surgical_approach` (posterior), `implant` (stem/cup/head), `complication` (dislocation, PJI)  
**Relationships:** OA indication path to THA; THA `uses_approach`, `uses_implant`, `has_complication`  
**Claims:** L1 precautions/mobilization; trap: components without instability risk  
**DP:** end-stage OA failing conservative → THA indication  
**Metadata:** context=or,conference

---

*Planning document only. The Orthopaedic Knowledge Network owns knowledge; curriculum views and products traverse it.*