# SnapOrtho Knowledge Graph Excellence Roadmap

**Date:** 2026-07-05 (revised — curriculum-as-view correction)  
**Status:** Planning document — no implementation  
**Inputs:** [KG Prepare Readiness Audit](../audits/kg-prepare-readiness-audit-2026-07-05.md), existing migrations, automation reports  
**Audience:** Engineering, clinical curation, product, medical education

---

## 1. Executive Summary

### Where the KG is today

SnapOrtho has built a **credible ingestion and mapping factory**, not yet a **canonical model of orthopaedic knowledge and learning**.

| Asset | State |
|-------|-------|
| Orthobullets metadata | 7,557 questions → ~752 `curriculum_nodes` |
| Anki canonical cards | 5,095 cards; 1,111 (21.8%) mapped to curriculum nodes |
| Typed domain schema | `canonical_entities`, `canonical_relationships`, governance/provenance tables exist |
| Canonical entity coverage | ~41 nodes bridged; **711 / 752 curriculum nodes blocked** (94.5%) |
| Canonical claims / decision points | **Absent** — no `educational_claims` layer in production |
| Educational intelligence metadata | **Absent** — no importance, traps, context on KG objects |
| Product consumption | **Zero** — Prepare, CasePrep, BroBot use **static duplicated content**, not KG references |

The graph today answers: *“What Orthobullets topic does this card attach to?”*

It does **not** answer:

- What matters most — and **why**?
- What changes management?
- What do learners commonly miss?
- What should be learned first?
- What should be reviewed before clinic, call, conference, or the OR?

### Core architectural correction

**The Knowledge Graph is the single canonical source of truth for orthopaedic knowledge and learning content.**

The **curriculum layer does not create or duplicate knowledge.** It is a set of **curriculum views** — curated projections that **reference** canonical KG objects by ID: entities, referenced claims, referenced decision points, prerequisite edges, and intelligence metadata.

Products do not maintain parallel medical truth in TypeScript templates. They **assemble LearningContext bundles** from canonical objects + curriculum view rules (filter, sequence, prioritize).

### What we are building

SnapOrtho is building an **educational intelligence system** grounded in one canonical graph:

- **Canonical KG** — entities, relationships, claims, decision points, traps/pearls as claim types, intelligence metadata, provenance
- **Curriculum views** — rotations, learning paths, topic shells, objectives that **reference** KG IDs and define order/inclusion only
- **Product learning experiences** — Prepare, BroBot, CasePrep, OITE, search, adaptive — render referenced bundles

### What “great” means (preview)

- All medical assertions live **once** in the canonical KG
- Curriculum views **select, sequence, filter, and prioritize** — never copy
- Products assemble **LearningContext** from references, not static prose

### Realistic horizon

| Milestone | Rough timeline | Outcome |
|-----------|----------------|---------|
| Canonical boundaries + curriculum view rules | 4–6 weeks | No-duplication policy locked |
| Schema: canonical objects + reference tables | 4–6 weeks | Claims/DPs as KG objects; views reference only |
| Entity cleanup (top 100) | 8–12 weeks | Domain substrate |
| Graph-complete exemplars (19 topics) | 12–16 weeks | Canonical completeness + curriculum views |
| Product adapters | 16–20 weeks | LearningContext from references |
| Scale + automation | 6+ months | Hundreds of topics |

---

## 2. North Star

> **The SnapOrtho Knowledge Graph is the canonical model of orthopaedic knowledge and orthopaedic learning.**

There is **one** place where medical and educational assertions are authored, reviewed, and versioned: the **canonical KG**. Curriculum and products **project** that truth for different learners and contexts — they do not fork it.

### Questions the canonical KG must answer

| Question | Answered by (canonical KG) | Surfaced via (curriculum view / product) |
|----------|---------------------------|------------------------------------------|
| What is true? | Entities, relationships, claims | Topic shell references entity |
| What matters? | `importance_level` on claims/DPs | View filters L1/L2 for rotation |
| Why does it matter? | `why_it_matters` on claims/DPs | Prepare “why” badges |
| What changes management? | Decision points (canonical objects) | Call/OR context filter |
| What do learners commonly miss? | `claim_type = cognitive_trap` | Trap section ordering in view |
| What should be learned first? | `prerequisite_for` edges | Learning path sequence |
| What is expected at each learner stage? | Intelligence metadata + view scope | MS3 vs PGY1 curriculum view |
| What before clinic, call, OR, conference, OITE? | `context_relevance` on claims/DPs | Context filter in adapter |
| What will attendings ask? | `claim_type = attending_pearl` | Rotation view inclusion |
| What is commonly tested? | Exam emphasis metadata + board_trap claims | OITE view |
| What should be studied next? | Prerequisites + mastery gaps | Adaptive (Phase 8) |

### Learner-facing north star

> *“What do I need to know to perform well tomorrow?”*

### System north star

> *“What is true, what matters, why it matters, what changes management, what learners miss, and how they should progress — authored once in the canonical KG, referenced everywhere else.”*

When a verified claim is corrected in the KG, every curriculum view and product that references that claim ID updates — without editing static files.

---

## 3. Design Principles

### Canonical knowledge (single source of truth)

| # | Principle | Implication |
|---|-----------|-------------|
| 1 | **The canonical KG owns all medical and educational assertions** | Claims, DPs, traps, pearls live in KG tables — not curriculum tables, not product TS |
| 2 | **Canonical entities are durable domain truth** | Conditions, procedures, anatomy survive curriculum redesigns |
| 3 | **Relationships must have clinical or educational meaning** | Including `prerequisite_for`, `builds_toward` between existing objects |
| 4 | **Educational intelligence is metadata on KG objects** | Importance, context, safety, why_it_matters — annotations, not a parallel content store |
| 5 | **Claims are atomic and reviewable** | One assertion per `educational_claim` row |
| 6 | **Decision points are canonical KG objects** | Not curriculum-owned rows with duplicated trigger/action text |

### Curriculum views (projection only)

| # | Principle | Implication |
|---|-----------|-------------|
| 7 | **The curriculum layer does not own knowledge** | It references KG object IDs; stores sequence, inclusion, display order only |
| 8 | **Learning objectives reference KG objects** | “Learner will apply DP-xxx” — not a duplicate bullet of medical text |
| 9 | **Topic shells are pointers, not content** | Title, archetype, primary entity ID, view membership — no `mustKnow[]` prose |
| 10 | **Rotations and paths are filters + order** | Trauma view includes claim IDs C1, C2; orders anatomy before DP — does not restate claims |
| 11 | **`curriculum_nodes` are import overlays, not disease ontology** | Bridge to entities; never substitute for canonical_entities |

### Educational intelligence (annotations)

| # | Principle | Implication |
|---|-----------|-------------|
| 12 | **L1 is scarce and capped** | Max 10–12 per topic entity cluster; enforced on canonical claims |
| 13 | **Every important claim says why it matters** | Required metadata on canonical claims/DPs |
| 14 | **Traps and mistakes are claim types** | `cognitive_trap`, `common_mistake` — canonical claims, referenced by views |
| 15 | **Context relevance tags canonical objects** | Views filter; they do not create context-specific duplicate claims |

### Trust and migration

| # | Principle | Implication |
|---|-----------|-------------|
| 16 | **Provenance required for public claims** | L1/L2 without reviewer do not ship |
| 17 | **Review gates on canonical objects** | Curriculum views inherit review status from referenced objects |
| 18 | **Bridge-first migration** | Static Prepare content migrates **into** KG claims; views replace templates |
| 19 | **No duplicated knowledge policy** | CI/report flags claim text copied into curriculum or product tables |
| 20 | **Automation proposes; humans approve into canonical KG** | Never into curriculum view tables as prose |

### Explicit non-goals

- Curriculum-owned medical concepts
- Parallel static curriculum truth after KG objects exist
- `curriculum_nodes` as canonical disease ontology
- 20 new tables in Phase 1

---

## 4. Target Architecture

### Architecture overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CANONICAL KNOWLEDGE GRAPH (single source of truth)                       │
│                                                                          │
│  Entities ── Relationships ── Educational claims ── Decision points    │
│  Traps / pearls / mistakes (claim_type) ── Assets (cards, questions)     │
│                                                                          │
│  Educational Intelligence Metadata (annotations on objects above):       │
│    importance · context · learner stage · safety · why_it_matters      │
│    provenance · review status · exam emphasis                            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ referenced by ID (no text duplication)
┌───────────────────────────────▼─────────────────────────────────────────┐
│ CURRICULUM VIEWS (curated projections — select, sequence, filter)        │
│                                                                          │
│  Rotations · learning paths · learner-stage scopes · topic shells        │
│  Objectives (reference claim/DP/entity IDs) · display order              │
│  Inclusion/exclusion rules · context filters                             │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ assembled into
┌───────────────────────────────▼─────────────────────────────────────────┐
│ PRODUCT LEARNING EXPERIENCES                                             │
│                                                                          │
│  Prepare · BroBot · CasePrep · OITE · Search · Adaptive learning       │
│  LearningContext bundle · publication gates · static fallback (transitional)│
└─────────────────────────────────────────────────────────────────────────┘
```

**Critical rule:** Arrows flow **downward only** for medical content. Curriculum views and products **never** author new claims — they **reference** canonical KG object IDs.

### What lives in the canonical KG

| Object type | Table / form | Owns medical text? |
|-------------|--------------|-------------------|
| **Canonical entity** | `canonical_entities` | Label + description only; not teaching prose |
| **Relationship** | `canonical_relationships` | Typed edge; no duplicate claim text |
| **Educational claim** | `educational_claims` | **Yes** — atomic teaching assertion |
| **Decision point** | `decision_points` | **Yes** — trigger, action, rationale |
| **Trap / pearl / mistake** | `educational_claims` (`claim_type`) | **Yes** — same table, referenced by views |
| **Prerequisite** | `canonical_relationships` | Edge between existing objects |
| **Intelligence metadata** | Columns on claims/DPs/entities | importance, context, safety, why_it_matters |
| **Provenance / review** | `ontology_provenance_records`, review fields | Trust, not content |
| **Assets** | cards, questions, case_modules | Linked to entities/claims by ID |

### Educational Intelligence Metadata (not a separate content layer)

**Reframed:** There is no “Educational Intelligence Layer” that stores parallel concepts. There is **Educational Intelligence Metadata** — annotations on canonical KG objects.

| Metadata field | Attached to | Example |
|----------------|-------------|---------|
| `importance_level` | claim, decision_point | L1 |
| `why_it_matters` | claim, decision_point | `patient_safety` |
| `context_relevance` | claim, decision_point | `call`, `or` |
| `safety_criticality` | claim, decision_point, entity | `emergency` |
| `claim_type` | educational_claim | `cognitive_trap` |
| `learner_stage` | claim, decision_point, view scope | MS3, PGY1 |
| `exam_emphasis` | entity or claim metadata | 0.85 |
| `prerequisite_for` | relationship | anatomy entity → condition entity |

Views **consume** this metadata to filter and order. They **do not duplicate** it.

---

## 5. The Curriculum Layer Does Not Own Knowledge

### Definition

The **curriculum layer** is a set of **curriculum views** over canonical KG objects. A rotation, learning path, learner-stage module, or topic shell:

- **References** existing entity IDs, claim IDs, decision point IDs, relationship IDs
- **Sequences** referenced objects for a learner or rotation
- **Filters** by context, importance, learner stage
- **Prioritizes** using intelligence metadata already on canonical objects
- **Defines display order** and inclusion/exclusion rules

It **never**:

- Copies claim text into curriculum tables
- Creates “MS3 ankle fracture concept” separate from the canonical ankle fracture claim
- Stores medical facts in topic shell rows
- Becomes a second ontology parallel to `canonical_entities`

### Curriculum view components

| Component | Stores | Does not store |
|-----------|--------|----------------|
| **Topic shell** | `primary_entity_id`, `topic_archetype`, product bridge IDs | mustKnow bullets, anatomy prose |
| **Learning path** | Ordered list of `entity_id` / `claim_id` / `view_step_id` | Teaching paragraphs |
| **Rotation view** | Inclusion rules + claim/DP ID lists + sort order | Duplicated L1 text |
| **Learning objective** | Outcome statement + `references: [claim_id, dp_id]` | Restated medical facts |
| **Learner-stage scope** | Filter: `training_level = MS3` + view membership | Stage-specific duplicate claims |
| **`curriculum_nodes`** | Orthobullets overlay; bridge to entities | Disease definitions |

### Reference model (Phase 1 schema direction)

```
curriculum_view
  id, view_type (rotation | learning_path | topic_shell | call_prep), slug, title

curriculum_view_item
  view_id, sort_order, item_type (entity | claim | decision_point | relationship)
  canonical_object_id   -- FK polymorphic to KG object
  inclusion_rule        -- optional filter override
  display_hint          -- UI label only, not medical content
```

**`prepare_topic_bridges`** link product IDs (`distal-radius-fracture`) to `topic_shell` view + `primary_entity_id` — still no medical text.

### Example — Trauma rotation curriculum view

**References (by ID, not copy):**

- Entity: `ankle-fracture` (canonical)
- Referenced claims: L1 mortise stability claim, L1 skin/NV exam claim
- Referenced decision points: unstable mortise → operative pathway (context: call, clinic)
- Prerequisite relationship: ankle ring anatomy → ankle fracture entity
- Order: prerequisite anatomy refs first → L1 claims → traps → decision points

**View metadata:** `rotation = trauma`, `learner_stage = MS3`, `context_filter = [clinic, call]`

**Nothing is copied.** If the mortise L1 claim is edited in the KG, the trauma view automatically reflects the update.

### Example — PGY1 call curriculum view

**References:**

- Entity: `compartment-syndrome`
- L1 claims: pain with passive stretch; clinical diagnosis urgency
- Trap claim: normal pulses do not exclude compartment syndrome
- Decision point: concerning exam → urgent escalation
- Display order: traps before pressure-measurement nuance (via `sort_order` on view items)

**View metadata:** `context_filter = [call]`, `importance_floor = L1`, `safety_criticality >= high`

---

## 6. Terminology

### Use

| Term | Meaning |
|------|---------|
| **Canonical KG object** | Any row in entities, relationships, claims, DPs, assets |
| **Referenced claim** | `educational_claim` included in a view by ID |
| **Referenced decision point** | `decision_point` included in a view by ID |
| **Referenced entity** | `canonical_entity` pointed to by topic shell or view |
| **Curriculum view** | Named projection: rotation, path, topic shell, call prep |
| **Topic shell** | Product-facing pointer to primary entity + view membership |
| **Learning path** | Ordered `curriculum_view_item` list referencing KG objects |
| **LearningContext bundle** | Runtime assembly: resolved canonical objects + view order |
| **Educational intelligence metadata** | Annotations on canonical objects (not a content layer) |

### Avoid

| Avoid | Why |
|-------|-----|
| Curriculum-owned concept | Implies duplicate knowledge |
| Curriculum-generated knowledge | Curriculum only references |
| Static curriculum truth | Static is legacy; migrates into canonical claims |
| Duplicated study-guide content | Violates single source of truth |
| Educational Intelligence Layer (as content store) | Use “metadata” or “annotations” |

---

## 7. Anti-Patterns to Avoid

| Anti-pattern | Why it fails | Correct approach |
|--------------|--------------|------------------|
| Copying claim text into `curriculum_view_item` or product TS | Two truths drift | Store `canonical_object_id` only |
| Creating “MS3 ankle fracture concept” separate from ankle fracture KG claim | Duplicated ontology | One claim; view filters by learner stage |
| Putting medical facts in Prepare topic shells / `curriculum-data.ts` | Product becomes source of truth | Migrate text → `educational_claims`; shell references IDs |
| Making `curriculum_nodes` the canonical disease ontology | Import buckets become truth | `canonical_entities` + `curriculum_node_entities` bridge |
| BroBot / Prepare / CasePrep separate topic IDs without bridges | Broken references | `prepare_topic_bridges` → entity + view |
| Using static templates as truth after KG objects exist | Permanent dual maintenance | Feature flag off static when view resolves |
| Generating L1 claims into product files or curriculum seed TS | Unreviewed, unprovenanced | Claims created in KG only, via review workflow |
| Storing `mustKnow[]` arrays in application code long-term | Encyclopedia in code | L1 claims with `importance_level = 1` |
| Context-specific duplicate claims (“call version” vs “clinic version” of same fact) | Proliferation | One claim; `context_relevance` array; view filters |
| Learning objectives as freeform prose bullets | Objectives disconnected from graph | Objectives reference `claim_id` / `dp_id` |

**Detection (Phase 1):** Quality report includes **duplication detection** — hash compare claim text against curriculum view text fields and static Prepare strings.

---

## 8. Educational Object Model

All educational objects are **canonical KG objects** unless explicitly marked as view metadata (sort order, display hints).

### Near-term: canonical tables + claim_type

| Concept | Canonical representation |
|---------|-------------------------|
| pitfall, cognitive_trap, red_flag | `educational_claims.claim_type` |
| attending_pearl, board_trap, common_mistake | `educational_claims.claim_type` |
| operative_pearl, complication_warning, imaging_point | `educational_claims.claim_type` |
| management_threshold | `decision_points.threshold` |
| prerequisite | `canonical_relationships.prerequisite_for` |
| clinical_script | `educational_claims.claim_type = clinical_script` |

**Phase 1 claim_type enum:**

`fact | clinical_script | attending_pearl | board_trap | cognitive_trap | common_mistake | red_flag | pitfall | operative_pearl | complication_warning | imaging_point`

**Do not create 12 new tables in Phase 1.** Dedicated tables only in Phase 7+ if analytics require independent versioning at scale.

---

## 9. Importance Framework (L1–L4)

Metadata on **canonical claims** — views filter by level.

| Level | Label | Meaning |
|-------|-------|---------|
| **L1** | Must Know Tomorrow | Before next clinical encounter; safety; cannot-miss management |
| **L2** | High Yield During Rotation | Competent student on service; common pimp questions |
| **L3** | Useful Depth / OITE | Honors, OITE depth; not required for safe participation |
| **L4** | Advanced / Fellowship / Controversy | Rare nuance, controversy |

### Assignment rules

1. **L1 capped at 10–12** per primary entity (hard max 15) on canonical claims
2. Safety-critical → usually L1 on canonical claims
3. Attending questions → L1/L2 on canonical claims (`claim_type = attending_pearl` or tagged)
4. Rare nuance → never L1 unless safety-critical
5. **Graph-complete** requires capped L1 bundle in **canonical KG**; curriculum view references those claim IDs
6. Views may further **subset** L1 for a rotation — they do not **create** L1

### Illustrative L1 samples (authored once in canonical KG)

See Section 12 topic exemplars — those claims live in `educational_claims`, referenced by views.

---

## 10. “Why It Matters” — Required Metadata

On canonical `educational_claims` and `decision_points` — not on curriculum views.

| Code | Meaning |
|------|---------|
| `patient_safety` | Wrong understanding risks harm |
| `changes_management` | Alters operative vs nonoperative path |
| `common_attending_question` | Frequently pimped |
| `common_board_trap` | OITE distractor |
| `frequent_rotation_encounter` | Common on service |
| `prevents_major_complication` | Avoids disaster |
| `foundational_prerequisite` | Required before deeper topics |
| `exam_high_yield` | Commonly tested |

Every L1 canonical claim: ≥1 `why_it_matters` tag.

---

## 11. Decision Point Modeling

**Canonical KG objects** in `decision_points` table.

| Field | Purpose |
|-------|---------|
| `trigger`, `finding`, `threshold` | Activation |
| `action`, `rationale`, `exception` | Management logic |
| `learner_stage`, `context_relevance` | Intelligence metadata |
| `safety_criticality`, `why_it_matters` | Intelligence metadata |
| `subject_entity_id` | FK to canonical entity |
| `review_status`, `content_source`, provenance | Trust |

Curriculum views **reference** decision point IDs and filter by context — they do not duplicate trigger/action text.

---

## 12. Cognitive Traps, Prerequisites, Context

### Traps

Canonical claims with `claim_type = cognitive_trap | common_mistake | board_trap`. Curriculum views order trap references before related fact claims (e.g. PGY1 call view shows trap before pressure measurement nuance).

### Prerequisites

Canonical relationships: `prerequisite_for`, `builds_toward`, `must_distinguish_from`, `commonly_confused_with`. Learning paths **sequence references** along these edges.

### Context

`context_relevance[]` on canonical claims/DPs. Views and adapters **filter** — they do not create context-specific claim copies.

---

## 13. Concrete Examples — Canonical KG vs Curriculum View

### Example 1 — Ankle fracture

**Canonical KG (authored once):**

| Object | Content (lives only here) |
|--------|---------------------------|
| Entity | `ankle-fracture` (condition) |
| Referenced claim (L1) | “Medial clear space widening suggests mortise instability.” + `why_it_matters: changes_management` |
| Decision point | Unstable mortise → operative fixation pathway |
| Trap claim | “Isolated fibula fracture is not always stable.” (`cognitive_trap`) |
| Prerequisite edge | `ankle-ring-anatomy` ──prerequisite_for──► `ankle-fracture` |

**Trauma rotation curriculum view (references only):**

```
view: trauma-rotation-ms3
items:
  1. ref: ankle-ring-anatomy (entity)           # prerequisite first
  2. ref: claim-<mortise-l1-id>                # L1
  3. ref: claim-<trap-fibula-id>               # trap
  4. ref: dp-<unstable-mortise-id>             # DP, context filter: clinic, call
filter: learner_stage=MS3, context=[clinic, call]
```

Nothing copied. Prepare renders resolved text from claim IDs.

### Example 2 — Compartment syndrome

**Canonical KG:**

| Object | Content |
|--------|---------|
| Entity | `compartment-syndrome` |
| L1 claim | “Pain with passive stretch is concerning early.” |
| Trap claim | “Normal pulses do not exclude compartment syndrome.” |
| Decision point | Concerning exam → urgent escalation for fasciotomy evaluation |

**PGY1 call curriculum view:**

```
view: pgy1-call-prep
items:
  1. ref: claim-<trap-pulses-id>               # trap first
  2. ref: claim-<passive-stretch-l1-id>
  3. ref: dp-<escalation-id>
filter: context=[call], importance_floor=L1, safety_criticality>=high
priority: emergency topics first (view-level ordering rule)
```

### Example 3 — Topic exemplar structure (all topics)

Mini models for compartment, CES, distal radius, THA follow the same pattern: **objects in canonical KG**; views reference IDs. See prior revision for illustrative claim text — that text belongs in `educational_claims`, not in this roadmap as duplicated curriculum content.

---

## 14. Phased Roadmap

---

### Phase 0 — Alignment and Definitions

| Field | Detail |
|-------|--------|
| **Goal** | Define canonical object boundaries, curriculum view rules, no-duplication policy |
| **Duration** | 4–6 weeks |

#### Deliverables

| # | Deliverable |
|---|-------------|
| 0.1 | **KG Foundation Rules** — what is a canonical KG object vs curriculum view metadata |
| 0.2 | **Curriculum view rules** — reference-only; no duplicated knowledge policy |
| 0.3 | **Object reference model** — how views, objectives, topic shells reference claim/entity/DP IDs |
| 0.4 | **Educational philosophy** — capped L1 on canonical claims; traps required |
| 0.5 | **Educational object definitions** — claim_type, DP fields; metadata vs content |
| 0.6 | **L1–L4 rubric** + `why_it_matters` taxonomy |
| 0.7 | **Safety-critical + context policies** |
| 0.8 | **Prerequisite edge guidelines** |
| 0.9 | **System map** — canonical object IDs + product IDs + view membership |
| 0.10 | **Curation operating model** |
| 0.11 | **Anti-patterns doc** (Section 7) as engineering policy |

#### Success metrics

- Engineers can answer: “Where does this medical sentence live?” → exactly one place (canonical KG)
- 100% Phase 5 topics in system map with entity ID + planned view slug

#### Do not do yet

- Migrations; copying static Prepare text into new tables as permanent truth

---

### Phase 1 — Non-Breaking Schema Foundation

| Field | Detail |
|-------|--------|
| **Goal** | Canonical KG objects + **reference-based curriculum views** — no product behavior change |
| **Duration** | 4–6 weeks |

#### Deliverables

| # | Deliverable |
|---|-------------|
| 1.1 | `educational_claims` — **canonical KG**; claim_type, importance, why, context, safety |
| 1.2 | `decision_points` — **canonical KG**; full field set |
| 1.3 | `curriculum_views` + `curriculum_view_items` — **reference only** (object_id, sort_order, no claim text) |
| 1.4 | `prepare_topic_bridges` — product ID → topic shell view + primary_entity_id |
| 1.5 | `kg_quality_flags`, `kg_curation_batches`, `training_levels`, `topic_archetype` |
| 1.6 | Provenance/review on canonical claims + DPs |
| 1.7 | Quality report — infrastructure + **duplication detection** (claim text in views/static) |
| 1.8 | Seed view shells for 19 topics — **ID references only** |

#### Success metrics

- Zero product behavior change (static fallback remains transitional)
- No `curriculum_view_item` column contains medical claim prose
- Duplication detector baseline run against `curriculum-data.ts`

#### Do not do yet

- Bulk claims; product APIs; migrating static text without review workflow

---

### Phase 2 — Canonical Entity Cleanup

| Field | Detail |
|-------|--------|
| **Goal** | Approved **referenced entities** for top 100 topics |
| **Duration** | 8–12 weeks |

- Entities, bridges, retargeting, slug standardization (unchanged scope)
- Topic shells reference `primary_entity_id` — no medical text in shell

#### Do not do yet

- Populating curriculum views with copied static content

---

### Phase 3 — Relationship Graph Buildout

| Field | Detail |
|-------|--------|
| **Goal** | Canonical relationships including prerequisite graph |
| **Duration** | 8–10 weeks |

- `prerequisite_for`, `builds_toward`, `must_distinguish_from`, `commonly_confused_with`
- Learning paths reference prerequisite **edges** by ID — do not restate in path description

---

### Phase 4 — Educational Intelligence Metadata on Canonical Objects

| Field | Detail |
|-------|--------|
| **Goal** | Attach importance, context, trap, why metadata to **canonical claims/DPs** — curriculum views consume, do not duplicate |
| **Why it matters** | Intelligence lives on KG objects; views filter/order |
| **Duration** | 6–8 weeks |

#### Deliverables

| # | Deliverable |
|---|-------------|
| 4.1 | L1–L4 on canonical claims with cap enforcement |
| 4.2 | `why_it_matters` on all L1/L2 canonical claims and DPs |
| 4.3 | Trap/mistake/pearl claims in canonical KG |
| 4.4 | Context + learner-stage metadata on canonical objects |
| 4.5 | Verified canonical claims + DPs for pilot topics |
| 4.6 | **LearningContext assembly spec** — resolve refs from view + canonical objects |
| 4.7 | Claim review workflow → canonical KG only |

**Curriculum work in Phase 4:** Create/update **view item references** pointing at approved canonical object IDs.

#### Do not do yet

- Writing intelligence into curriculum tables as prose; LLM L1 into product files

---

### Phase 5 — Graph-Complete Exemplars

| Field | Detail |
|-------|--------|
| **Goal** | Canonical KG completeness **plus** curriculum views that reference those objects |
| **Duration** | 12–16 weeks |

#### “Graph-complete” definition

A topic is **graph-complete** when:

| # | Criterion | Where it lives |
|---|-----------|----------------|
| 1 | Approved canonical entity exists | Canonical KG |
| 2 | Aliases complete | Canonical KG |
| 3 | Topic shell references `primary_entity_id` | Curriculum view (pointer only) |
| 4 | 5–12 L1 + 5–15 L2 **canonical claims** — verified | Canonical KG |
| 5 | Every L1 has `why_it_matters` | Metadata on canonical claims |
| 6 | 3–5 **canonical decision points** | Canonical KG |
| 7 | ≥2 trap/mistake **canonical claims** (≥3 safety topics) | Canonical KG |
| 8 | ≥1 attending pearl where applicable | Canonical KG (`claim_type`) |
| 9 | Prerequisite **relationships** between canonical objects | Canonical KG |
| 10 | Context + learner-stage metadata on claims/DPs | Canonical KG |
| 11 | Clinical relationships (classification, anatomy, complications) | Canonical KG |
| 12 | Linked questions/cards documented | Asset layer |
| 13 | Provenance on all L1 claims | Provenance layer |
| 14 | Safety review if emergency topic | Review metadata |
| 15 | **Curriculum view references all above by ID** — no duplicated text | Curriculum view |
| 16 | **LearningContext bundle assembles from references** | Adapter (Phase 6) |

#### Priority topics

*(Unchanged 19: CES, compartment, septic, osteomyelitis, distal radius, ankle, femoral neck, IT, tibial shaft, supracondylar, SCFE, ACL, lumbar radiculopathy, CTS, rotator cuff, hip OA, knee OA, THA, TKA)*

#### Success metrics

- 19/19 graph-complete
- Duplication detector: **zero** claim text in view tables or new product strings for these topics
- LearningContext validation passes from references only

---

### Phase 6 — Product Adapters

| Field | Detail |
|-------|--------|
| **Goal** | Products consume **LearningContext assembled from canonical objects + curriculum view rules** |
| **Duration** | 6–8 weeks |

#### Deliverables

| # | Deliverable |
|---|-------------|
| 6.1 | `LearningContext` resolver — view items → fetch canonical objects → ordered bundle |
| 6.2 | KG Read API |
| 6.3 | Prepare adapter — context filters; **static fallback transitional only** |
| 6.4 | BroBot adapter — referenced claims/traps/DPs by ID |
| 6.5 | CasePrep adapter — OR context filter on canonical objects |
| 6.6 | OITE adapter — board_trap claims by reference |
| 6.7 | Publication gates — canonical object review status |
| 6.8 | Integration tests — 19 topics resolve with no static text dependency |

#### Fallback (transitional)

| Condition | Behavior |
|-----------|----------|
| View exists, canonical L1 refs resolve | KG-primary via LearningContext |
| View exists, canonical objects incomplete | Static fallback + metric; **migrate static → canonical claim** |
| No view | Static only (legacy) |

#### Do not do yet

- Permanent dual truth; new medical content in product files

---

### Phase 7 — Automation and Curation Workflow

- LLM proposes **canonical claims/DPs** — not curriculum prose
- Duplication detection in CI
- Scale view **references** as canonical objects are approved

---

### Phase 8 — Adaptive Learning and Mastery

| Field | Detail |
|-------|--------|
| **Goal** | Personalize via **referenced claims, traps, prerequisites** — not entities alone |
| **Duration** | 10–14 weeks |

- Missed question → weak **canonical claim/trap** ID
- Remediation walks `prerequisite_for` backward from canonical graph
- “Study next” = next unmastered **referenced claim** in learning path view
- Depends on graph-complete topics with view references

---

### Phase 9 — Visual and Multimedia Graph

- Image assets linked to canonical entities and `imaging_point` claims
- Views reference image asset IDs

---

### Phase 10 — Governance and Long-Term Maintenance

- Staleness policy on **canonical claims**
- Duplication audits monthly
- Incident response: wrong canonical claim → patch once, all views update

---

## 15. Phase Summary Table

| Phase | Focus |
|-------|-------|
| 0 | Canonical boundaries, curriculum view rules, no-duplication policy |
| 1 | Canonical claims/DPs + reference-based curriculum views |
| 2 | Referenced entities |
| 3 | Canonical relationships + prerequisite graph |
| 4 | Intelligence **metadata on canonical objects** |
| 5 | Graph-complete canonical KG + views that reference |
| 6 | LearningContext assembly from references |
| 7 | Scale canonical curation + view references |
| 8 | Adaptive on claims/traps/prereqs |
| 9 | Visual assets in canonical KG |
| 10 | Governance + duplication audits |

**Critical path:** 0 → 1 → 2 → 4+5 (parallel 3) → 6 → 7 → 8

---

## 16. KG Quality Metrics

### Infrastructure metrics

Canonical entity coverage, relationship density, blocked node rate, question/card linkage, orphan rate, draft leak rate.

### Educational intelligence metrics (on canonical objects)

L1 cap compliance, why_it_matters completeness, trap coverage, DP coverage, prerequisite connectivity, context tagging, safety verification.

### Curriculum view integrity metrics (new)

| Metric | Definition | Target |
|--------|------------|--------|
| **Duplication rate** | View/product rows containing claim text not in canonical KG | 0% |
| **Reference resolution rate** | View items resolving to approved canonical objects | 100% exemplars |
| **Orphan view items** | View refs to missing/deprecated KG objects | 0 |
| **LearningContext assembly success** | Topics assembling bundle from refs only | 19/19 Phase 5 |

### EIQS (unchanged formula, plus duplication penalty)

Subtract 10 points if duplication rate > 0% on priority topics.

---

## 17. Curation Priority Formula

*(Unchanged weights — KGGapSeverity now includes “static duplicate exists” as +20 modifier to encourage migration into canonical claims)*

---

## 18. What “Great” Looks Like

The KG is **great** when:

| Question | Answered by |
|----------|-------------|
| What are the 5 most important things an MS3 needs? | Capped L1 **canonical claims**; MS3 view references top 5 by sort_order |
| What are the common mistakes? | Referenced `cognitive_trap` claims |
| What findings change management? | Referenced decision points |
| What will attendings ask? | Referenced `attending_pearl` claims |
| What before this procedure? | View filter `context=or` on canonical objects |
| Which missed question reveals which weak concept? | Question → entity → **claim/trap** ID |
| Foundational vs advanced? | L1–L4 on canonical claims; view may hide L3/L4 |
| What to study next? | Learning path view order + prerequisite edges |

### Checklist

**Canonical KG:**
- [ ] All medical assertions in claims/DPs/entities — one source of truth
- [ ] Intelligence metadata on canonical objects
- [ ] Provenance and review gates

**Curriculum views:**
- [ ] Reference only — no duplicated medical text
- [ ] Rotations, paths, shells use canonical object IDs
- [ ] Objectives reference claim/DP IDs

**Products:**
- [ ] LearningContext from references
- [ ] Static content retired per topic as graph-complete
- [ ] BroBot, Prepare, CasePrep, OITE share canonical IDs

---

## 19. Recommended First Phase

**Phase 0** — canonical boundaries + **curriculum view rules** + **no-duplication policy** before any migration.

Sign-off required:

- Object reference model
- “Where does this sentence live?” → canonical KG only
- Anti-patterns (Section 7) as team policy

**Target:** Phase 0 in 4 weeks; Phase 1 week 5.

---

## 20. First 10 Implementation Tickets

| # | Ticket | Phase | Owner |
|---|--------|-------|-------|
| 1 | **KG-001:** `kg-foundation-rules.md` — canonical KG object boundaries | 0 | Product + clinical |
| 2 | **KG-002:** `kg-curriculum-view-rules.md` — reference-only views, **no duplicated knowledge policy** | 0 | Product + eng |
| 3 | **KG-003:** Object reference model — views, shells, objectives reference claim/entity/DP IDs | 0 | Engineering |
| 4 | **KG-004:** L1–L4 calibration on **canonical claim references** (5 topics, inter-rater) | 0 | Clinical |
| 5 | **KG-005:** System map — canonical object IDs, product IDs, planned view slugs | 0 | Engineering |
| 6 | **KG-006:** Migration design — claims/DPs as **canonical KG**; `curriculum_views` + `curriculum_view_items` as refs | 1 | Engineering |
| 7 | **KG-007:** Additive migration — canonical claims, DPs, view tables, bridges (no claim text in views) | 1 | Engineering |
| 8 | **KG-008:** Quality report — infrastructure + intelligence metrics + **duplication detection** | 1 | Engineering |
| 9 | **KG-009:** Safety-topic **canonical entities** + initial canonical claims (CES, compartment, septic, osteomyelitis) | 2/4 | Clinical |
| 10 | **KG-010:** LearningContext exemplar — compartment + CES **assembled from view references** to canonical objects | 5/6 | Clinical + eng |

---

## 21. Biggest Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Curriculum layer becomes second source of truth** | Critical | Reference-only schema; duplication CI; anti-patterns doc |
| **Static Prepare never migrated** | Critical | Per-topic retirement flag; diff report; graph-complete gate |
| **Engineers store prose in view tables** | High | Schema: no claim text column; code review checklist |
| **Shipping unreviewed canonical claims** | Critical | Publication gates on canonical objects |
| **Educational Intelligence mistaken for new content layer** | High | Rename to metadata; document in foundation rules |
| **Three ID namespaces without bridges** | High | `prepare_topic_bridges` + system map |
| **Entity pollution** | High | hold_generic; no safety auto-apply |
| **Curation bottleneck** | High | Migrate static → canonical in batches; LLM proposes to KG only |
| **Context-specific duplicate claims** | Medium | One claim + context_relevance; views filter |
| **Adaptive on entities only** | Medium | Phase 8 requires claim/trap references |

---

## 22. What Not to Build Yet

| Do not build | Reason |
|--------------|--------|
| Medical text columns in `curriculum_view_items` | Violates single source of truth |
| Curriculum-owned concept tables | Duplicates canonical claims |
| New L1 content in `curriculum-data.ts` | Migrate into canonical claims |
| Educational Intelligence Layer as separate content store | Use metadata on canonical objects |
| Permanent static fallback | Transitional only until view resolves |
| KG Prepare for all topics before graph-complete + views | No references to resolve |
| 20 new educational object tables | claim_type sufficient near-term |

---

## 23. Related Documents

| Document | Path |
|----------|------|
| Prepare readiness audit | `docs/audits/kg-prepare-readiness-audit-2026-07-05.md` |
| Educational ontology foundation | `docs/educational-ontology-foundation.md` |
| Next-gen KG blueprint | `docs/snaportho-next-generation-knowledge-graph-blueprint-2026-06-28.md` |
| Relationship registry | `scripts/lib/education/kg-relationship-registry.ts` |

---

*Revised 2026-07-05. The canonical KG owns knowledge. Curriculum views reference, sequence, filter, and prioritize. Products assemble LearningContext from references. No implementation in this document.*