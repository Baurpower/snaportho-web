# Knowledge Graph Prepare Readiness Audit

**Date:** 2026-07-05  
**Auditors:** Senior product architect, orthopaedic curriculum designer, knowledge graph architect, medical education reviewer  
**North star:** *“What do I need to know to perform well tomorrow?”*  
**Scope:** Audit only — no implementation, no new medical content generation, no production migrations.

---

## A. Executive Summary

### Verdict

**The knowledge graph is not ready to power next-generation Prepare without foundational cleanup and a bridge layer.**

SnapOrtho has built a strong **ingestion and mapping foundation** — Anki cards, Orthobullets metadata, aliases, review ledgers, and a next-generation typed-entity schema are real assets. But the graph today cannot answer Prepare’s core questions about **importance hierarchy**, **learner stage**, **what changes management**, or **topic archetypes** at scale.

Prepare currently runs on a **third, disconnected curriculum system**: static TypeScript in `src/lib/student-curriculum/curriculum-data.ts` (~68 topics). The database KG is never queried by Prepare, Case Readiness, rotation dashboards, or learning paths.

### What works

| Area | Status |
|------|--------|
| Source isolation (Anki, Orthobullets metadata-only) | Strong |
| Deterministic Anki → curriculum_node mapping | 1,111 / 5,095 cards (21.8%) |
| Orthobullets question metadata import | 7,557 questions → 752 curriculum nodes |
| Review/governance schema (proposals, provenance, retargeting) | Designed well |
| Next-gen typed entities (`canonical_entities`) | Schema exists; ~41 nodes bridged in proof/retargeting pass |
| Relationship vocabulary registry | Rich predicate set defined |

### What blocks Prepare

| Gap | Impact |
|-----|--------|
| **Three parallel curriculum systems** with no ID bridge | Prepare cannot consume KG without adapters |
| **`concepts` table empty** (0 rows per migration audit) | Atomic teachable layer unused |
| **Semantic relationships barely populated** | Automation emits only 3 predicates (`has_classification`, `has_complication`, `involves_anatomy`) |
| **No importance / archetype / learner-stage fields** | Cannot rank “must know tomorrow” vs “fellowship nuance” |
| **711 / 752 curriculum nodes blocked** from canonical entity bridge | 94.5% of Orthobullets topics lack typed domain modeling |
| **No `case_module` table** | CasePrep cannot link to graph; `exemplified_by_case` deferred |
| **Prepare content is template-driven** | Same 16-module procedure template for every topic regardless of archetype |

### Brutal bottom line

Do **not** flip Prepare to KG-powered rendering yet. The right sequence is:

1. **Bridge** static Prepare topic IDs ↔ `curriculum_nodes.slug` ↔ `canonical_entities.slug`
2. **Curate** ~20–30 high-yield topics with importance metadata and archetype-specific edges
3. **Expose** a read-only Prepare KG API with strict publication gates
4. **Gradually** replace static templates where graph content is verified

Until then, the KG is a **mapping and ontology factory**, not the **canonical Prepare content engine**.

---

## B. Current KG Architecture

### Where the canonical graph lives

| Layer | Canonical location | Role |
|-------|-------------------|------|
| **Database (Supabase)** | `snaportho-web/supabase/migrations/` | Long-lived ontology, mappings, provenance |
| **Operational truth for imports** | `curriculum_nodes` + mapping tables | What Anki/Orthobullets actually attach to today |
| **Next-gen domain truth (target)** | `canonical_entities` + `canonical_relationships` | Typed clinical/educational entities — early stage |
| **Prepare truth (de facto)** | `src/lib/student-curriculum/curriculum-data.ts` | What students actually see |
| **Scripts / automation** | `snaportho-web/scripts/lib/education/` | Ingestion, mapping, proposals, QA reports |

There is **no single canonical graph**. Three systems coexist without reconciliation.

### Phase 1 schema (educational ontology foundation)

**Migration:** `20260626_090000_educational_ontology_foundation.sql`  
**Documentation:** `docs/educational-ontology-foundation.md`

```
specialties
  └── curriculum_nodes (self-referential hierarchy)
        ├── learning_objectives
        └── concepts (intended atomic teachable units)
```

**`curriculum_nodes.node_type`:** `specialty | region | topic | subtopic | module | exam_domain | pathway`

**`concepts.concept_type`:** `fact | classification | diagnostic_rule | imaging | indication | procedure | complication | outcome | anatomy | biomechanics | pathophysiology | terminology`

**Supporting tables:** `concept_aliases`, `curriculum_node_aliases`, `external_sources`, `source_aliases`, `tags`, `tag_assignments`

**Live state (from migration comments and reports):**
- ~752 `curriculum_nodes` from Orthobullets import
- **0 `concepts` rows** — the atomic layer is empty
- `learning_objectives` exist in seed only (proof path: Intertrochanteric Fracture); not populated at Orthobullets scale

### Phase 2–3: External educational objects

| Table | Purpose | Scale |
|-------|---------|-------|
| `external_questions` | Orthobullets metadata only (no stems/answers) | 7,557 |
| `external_question_curriculum_mappings` | Question → curriculum_node | 7,557 (7,493 via node) |
| `anki_*`, `canonical_cards`, `canonical_card_versions` | Anki ingest + versioning | 5,095 cards |
| `card_knowledge_links` | Card → curriculum_node/concept | 1,111 active |
| `card_quality_reviews` | Per-card QA | 5,095 |
| `anki_kg_mapping_runs/candidates/review_actions` | Mapping audit trail | Operational |

### Next-generation KG foundation

**Migrations:**
- `20260628_120000_next_generation_kg_foundation.sql`
- `20260628_130000_concept_canonical_entity_bridge.sql`
- `20260628_140000_kg_automation_proposals.sql`
- `20260628_150000_kg_relationship_vocabulary_hardening.sql`
- `20260628_160000_legacy_ontology_retargeting.sql`

**Core new tables:**

| Table | Purpose |
|-------|---------|
| `canonical_entities` | Typed domain entities (`condition`, `procedure`, `anatomy_structure`, `classification_system`, `complication`, `diagnostic_test`, `imaging_finding`, `implant`, `treatment_principle`, `biomechanics_concept`, `exam_maneuver`, `surgical_approach`, `surgical_positioning`) |
| `canonical_relationships` | Typed semantic edges with confidence, review_status, provenance_status |
| `curriculum_node_entities` | Bridge: curriculum overlay → canonical_entity or concept |
| `concept_canonical_entities` | Bridge: legacy concept → canonical_entity |
| `ontology_governance_actions` | Merge/split/deprecate ledger |
| `ontology_provenance_records` | Granular source attachment |
| `kg_automation_proposals` | Review-gated automation (no direct canonical mutation) |
| `card_canonical_entity_links` | Parallel card → entity retargeting |
| `question_canonical_entity_links` | Parallel question → entity retargeting |

**Proof seed:** `supabase/seeds/20260628_next_generation_kg_proof_seed.sql` — 7 entities around hip fracture (intertrochanteric, femoral neck, Garden, MFCA, cephalomedullary nail, hemiarthroplasty, AVN) with sample relationships.

### Node types (summary)

| Node type | Exists | Populated | Notes |
|-----------|--------|-----------|-------|
| Specialty | ✅ | ✅ ~11 | Stable top-level |
| Curriculum node | ✅ | ✅ ~752 | Overloaded: hierarchy + topic ontology + mapping target |
| Learning objective | ✅ | ⚠️ Seed only | Not scaled to Orthobullets topics |
| Concept | ✅ | ❌ 0 rows | Designed but unused |
| Canonical entity | ✅ | ⚠️ ~41 bridged | 711 nodes still blocked |
| Canonical card | ✅ | ✅ 5,095 | Good educational object primitive |
| External question | ✅ | ✅ 7,557 | Metadata only |
| Case module | ❌ | — | Deferred endpoint in relationship registry |
| Decision point | ❌ | — | Not modeled |
| High-yield concept | ❌ | — | Not distinct from concept/entity |
| Rotation | ⚠️ | App layer | `student_workspace_rotations`, not KG-linked |

### Edge types

**Hierarchy (implicit):** `curriculum_nodes.parent_id`

**Mapping edges (populated):**
- `card_knowledge_links` → curriculum_node (and optionally concept)
- `external_question_curriculum_mappings` → curriculum_node
- `curriculum_node_entities` → canonical_entity (41 nodes)
- `card_canonical_entity_links` / `question_canonical_entity_links` (partial retarget)

**Semantic edges (schema rich, data sparse):**

Registry in `scripts/lib/education/kg-relationship-registry.ts` defines 25+ predicates including `treats`, `indicated_for`, `involves_anatomy`, `has_classification`, `has_complication`, `prerequisite_for`, `expected_at_training_level`, etc.

**Automation currently generates only:**
- `has_classification`
- `has_complication`
- `involves_anatomy`

**Deferred (no backing table):**
- `supported_by_question` → needs `canonical_question_item`
- `exemplified_by_case`, `covered_by_module` → needs `case_module`

### Tags and metadata

- **`tags` / `tag_assignments`:** Orthogonal filters; polymorphic entity assignment
- **`canonical_entities.metadata`:** JSONB — used for proof_seed flags; no standard importance schema
- **`curriculum_nodes`:** `sort_order`, `comments`, `short_label` — no `topicArchetype`, `importanceLevel`
- **No embedding/vector fields** in KG tables (only unrelated `tsvector` in attending preferences)

### Source / provenance fields

| Mechanism | Coverage |
|-----------|----------|
| `external_sources` + `source_aliases` | Source-native IDs preserved |
| `ontology_provenance_records` | Schema ready; sparse population |
| `canonical_relationships.provenance_status` | `pending | source_attached | reviewed | conflicted` |
| `kg_automation_proposals` | Confidence, evidence_summary, review_status |
| `card_knowledge_links.mapping_confidence` | On Anki mappings |
| Entity `status` / `review_status` | On canonical_entities |

### Content generation, ingestion, validation scripts

| Category | Key scripts |
|----------|-------------|
| **Ingestion** | `import-orthobullets-questions.ts`, `map-anki-to-kg.ts`, Anki import in `scripts/lib/education/anki-import/` |
| **Ontology build** | `build-kg-ontology-with-llm.ts`, `generate-kg-automation-proposals.ts`, `apply-approved-kg-automation-proposals.ts` |
| **Retargeting** | `generate-legacy-retargeting-proposals.ts`, `apply-legacy-retargeting.ts` |
| **QA / reports** | `report-kg-canonical-coverage.ts`, `report-next-gen-kg-proof-set.ts`, `report-legacy-retargeting-completion.ts`, `verify-orthobullets-import.ts`, `report-kg-blocked-node-prioritization.ts` |
| **Review** | `review-kg-blocked-node-cohort-with-llm.ts`, `review-kg-automation-packet.ts` |

### Runtime KG consumers (application code)

| Consumer | KG usage |
|----------|----------|
| **Prepare / Case Readiness** | ❌ None — static `curriculum-data.ts` |
| **BroBot main chat** | ❌ No KG traversal |
| **BroBot Orthobullets extension** | ⚠️ `kg-lookup.ts` — curriculum_node slug/title; fetches `canonicalEntityIds` but **does not use them in prompts** |
| **CasePrep** | ❌ Static slug map in `caseprep-topic-mapping.ts` (9 topics) |
| **Student progress** | ⚠️ `student_workspace_curriculum_progress` — topic IDs from static curriculum |

---

## C. What Currently Powers Prepare

Prepare (`/student-workspace/prepare`) is powered entirely by the **static student curriculum library**:

```
src/lib/student-curriculum/
├── curriculum-data.ts          # ~68 topics, tracks, templates
├── curriculum-types.ts         # FastStudyTemplate, DeepStudyTemplate
├── case-readiness-builder.ts # 8 uniform objective kinds per topic
├── procedure-prep-modules.ts   # 16-module template for ALL topics
├── learning-paths.ts           # Static rotation paths
├── rotation-prep-profile.ts  # Aggregates from static topic templates
├── prep-recommendations.ts   # Heuristics on static fields
├── caseprep-topic-mapping.ts # 9 hardcoded CasePrep slugs
└── topic-brobot-actions.ts   # Prompt templates from static content
```

**Data flow:**

```
curriculum-data.ts (TOPIC_SEEDS)
  → CurriculumHub / RotationPrepDashboard / LearningPathPanel
  → case-readiness-builder.ts
      → buildProcedurePrepModules() [same structure every topic]
      → CASE_READINESS_OBJECTIVE_KINDS [injury, anatomy, imaging, ...]
  → student_workspace_curriculum_progress [topicId = static slug]
```

**What Prepare can do today (without KG):**
- Browse ~68 topics by track/subspecialty
- Fast (5–15 min) and deep (30–60 min) study templates per topic
- Rotation-specific learning paths (static `learning-paths.ts`)
- Case readiness with 8 objective cards
- BroBot action prompts derived from template fields
- CasePrep links for 9 mapped topics only
- Progress persistence by static `topicId`

**What Prepare cannot do today:**
- Rank content by true educational importance
- Distinguish fracture vs procedure vs infection archetypes in UI structure
- Pull linked questions, cards, or cases from KG
- Show “verified” vs “draft” content provenance
- Adapt content to PGY1 call vs MS3 clerkship from graph metadata
- Surface weak areas from question performance → concept graph

---

## D. Gap Analysis

### Educational hierarchy readiness

Target hierarchy:

```
Curriculum → Rotation → Subspecialty → Topic → Learning Objective
  → High-Yield Concept → Decision Point → Supporting Knowledge
  → Question → Case → Procedure → Anatomy → Complication
```

| Level | Exists | Populated | Gap |
|-------|--------|-----------|-----|
| Curriculum | ⚠️ | Static TS tracks | Not in KG; no `curriculum_framework` table |
| Rotation | ⚠️ | App `student_workspace_rotations` | Not linked to KG nodes |
| Subspecialty | ✅ | `specialties` + topic subspecialty in static data | Duplicated, not bridged |
| Topic | ✅ | `curriculum_nodes` + static topics | **Two ID namespaces, no bridge** |
| Learning objective | ✅ schema | Seed + static strings | KG objectives not scaled; static LOs not in DB |
| High-yield concept | ❌ | — | No node type or importance-tagged concept layer |
| Decision point | ❌ | — | `decisionMaking` exists only in static templates |
| Supporting knowledge | ⚠️ | Implied in deep templates | Not atomic graph nodes |
| Question | ✅ | `external_questions` | Mapped to nodes, not entities; stems not stored |
| Case | ❌ | Static `commonCases` in TS | No `case_module`; CasePrep separate system |
| Procedure | ⚠️ | `canonical_entities.procedure` type | Few entities; THA/TKA blocked |
| Anatomy | ⚠️ | `anatomy_structure` type | Proof seed only (MFCA) |
| Complication | ⚠️ | `complication` type + static lists | Few semantic edges |

### Importance framework readiness

Proposed durable framework:

| Level | Definition |
|-------|------------|
| **L1 — Must Know** | Expected before tomorrow; safety, rounds, common attending questions |
| **L2 — High Yield** | Important during rotation; frequently tested/encountered |
| **L3 — Useful Depth** | Strong students, OITE prep, repeated exposure |
| **L4 — Advanced** | Fellowship, controversy, uncommon nuance |

**Current field support:**

| Field | Exists | Notes |
|-------|--------|-------|
| `importanceLevel` | ❌ | Closest: static `difficulty` (introductory/core/advanced) — not the same |
| `learnerStage` | ⚠️ | Static `studentLevel` on topics; `training_level` pseudo-endpoint in registry, unpopulated |
| `rotationRelevance` | ⚠️ | Track-level `rotationRelevance` string in static data |
| `caseFrequency` | ❌ | |
| `examFrequency` | ⚠️ | Implied by Orthobullets question counts per node — not surfaced |
| `safetyCriticality` | ❌ | Only heuristic tag matching in `prep-recommendations.ts` |
| `managementImpact` | ❌ | `decisionMaking` in static templates only |
| `attendingQuestionLikelihood` | ❌ | `pimpQuestions` static arrays |
| `ORRelevance` | ❌ | `orSurvivalTips` static |
| `clinicRelevance` | ❌ | |
| `callRelevance` | ❌ | |

**Conclusion:** The graph **cannot rank nodes by educational importance** today. Static Prepare uses proxy fields (`difficulty`, `studentLevel`, tags) that are editorial guesses, not evidence-backed rankings.

### Prepare output readiness

| Prepare output | Can KG generate today? | Required graph fields/relationships |
|----------------|------------------------|-------------------------------------|
| 5-minute topic guide | ❌ | `importanceLevel`, archetype sections, `must_know` claims with provenance |
| Full topic guide | ❌ | Learning objectives → linked concepts/entities with review_status=approved |
| “What actually matters” | ❌ | L1/L2 tagged nodes, `expected_at_training_level` edges |
| “What changes management” | ❌ | `indicates_treatment`, `decision_point` nodes, classification → treatment edges |
| Attending questions | ⚠️ partial | Question mappings exist; no stem storage; could link external_question IDs |
| Must-know anatomy | ⚠️ partial | `involves_anatomy` predicate exists; ~proof-set only |
| Complication warnings | ⚠️ partial | `has_complication` predicate; data sparse |
| Rotation-specific study paths | ❌ | Rotation → topic relevance edges with weights |
| Tomorrow’s case prep | ❌ | Schedule → case_module → topic bridge |
| Weak-area review | ❌ | User attempts → concept performance (Phase 6) |
| Related topics | ⚠️ | Static `relatedTopicIds`; no `prerequisite_for` / `differential_for` populated |
| Related questions | ⚠️ | `external_question_curriculum_mappings` — metadata only |
| Related procedures | ❌ | `treats`/`indicated_for` edges largely empty |
| Related BroBot prompts | ❌ | No graph-driven prompt registry |
| Related CasePrep modules | ❌ | No `case_module` table |

### Topic archetype support

| Archetype | Distinguishable today? | Required structure |
|-----------|------------------------|-------------------|
| Fracture | ❌ as archetype | condition + classification + imaging + stability + fixation + NV exam + complications |
| Procedure | ⚠️ entity_type only | procedure + indications + approach + positioning + steps + implants + pitfalls |
| Degenerative disease | ❌ | condition + staging + conservative → surgical pathway |
| Sports injury | ❌ | condition + exam maneuvers + MRI findings + rehab vs surgery |
| Pediatric condition | ❌ | condition + age-specific pitfalls + physeal considerations |
| Spine pathology | ❌ | condition + red flags + level-specific anatomy + emergent vs elective |
| Hand condition | ❌ | condition + exam + conduction studies + release/repair |
| Infection | ❌ | condition + labs + aspiration + urgent drainage pathway |
| Tumor | ❌ | staging + biopsy principles + reconstruction |
| Anatomy | ❌ | anatomy_structure nodes not linked at scale |
| Basic science | ❌ | Many nodes flagged `hold_generic` by automation |

Prepare’s `buildProcedurePrepModules()` applies the **same 16 modules** (overview, indications, surgical anatomy, positioning, OR setup, equipment, instruments, implants, steps, decision points, attending questions, complications, postop, rehab, literature, related cases) to **every topic** — including non-procedure topics like compartment syndrome and carpal tunnel. This confirms archetype blindness in the presentation layer.

### ID namespace mismatch (critical integration gap)

| System | Example: Distal Radius | Example: Hip Fracture |
|--------|--------------------------|----------------------|
| Prepare static | `distal-radius-fracture` | `hip-fracture` (combined femoral neck + IT) |
| KG curriculum_node | `trauma-distal-radius-fractures` | Split: `trauma-femoral-neck-fractures`, `trauma-intertrochanteric-fractures` |
| KG canonical_entity | Blocked / not created | Proof seed has separate entities |

**No `prepare_topic_bridges` table exists.** CasePrep uses yet another slug namespace (`distal-radius-orif`).

---

## E. Educational Hierarchy Recommendation

### Principle: Domain first, curriculum overlay second

```
┌─────────────────────────────────────────────────────────────┐
│  CURRICULUM OVERLAY (pedagogy, rotations, learner paths)    │
│  curriculum_nodes, learning_objectives, training_levels     │
│  + NEW: importance annotations, rotation weights            │
└──────────────────────────┬──────────────────────────────────┘
                           │ covered_by / taught_by / expected_at
┌──────────────────────────▼──────────────────────────────────┐
│  DOMAIN KNOWLEDGE (durable clinical ontology)                 │
│  canonical_entities + canonical_relationships                 │
│  + NEW: decision_points, educational_claims                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ supported_by / exemplified_by
┌──────────────────────────▼──────────────────────────────────┐
│  EDUCATIONAL OBJECTS (assets)                                │
│  canonical_cards, external_questions, case_modules, articles  │
└──────────────────────────┬──────────────────────────────────┘
                           │ provenance
┌──────────────────────────▼──────────────────────────────────┐
│  EVIDENCE / PROVENANCE                                        │
│  ontology_provenance_records, review_status, confidence       │
└───────────────────────────────────────────────────────────────┘
```

### Recommended Prepare-facing hierarchy

For each **Prepare Topic** (bridge object):

1. **Topic shell** — title, archetype, subspecialty, rotation relevance
2. **Importance tiers** — L1–L4 tagged claims (not just whole-topic difficulty)
3. **Learning objectives** — 3–6 outcome statements
4. **Must-know bundle** — L1 claims: diagnosis, exam, red flags, initial management
5. **Decision points** — explicit “if/then” management changers
6. **Linked assets** — questions (count), cards (count), cases, procedures
7. **Attending question bank** — derived from high-frequency exam mappings + curated prompts

### Learner-stage overlays (same graph, different slices)

| Stage | Primary slice |
|-------|---------------|
| MS3 clerkship | L1 + L2 for active rotation |
| Sub-I | L1 + L2 + case flow + OR survival |
| PGY1 pre-call | L1 safety-critical across trauma/spine/hand |
| PGY1 pre-OR | L1 procedure topics: anatomy, steps, pitfalls |
| PGY2 | L2 + L3 + decision depth |
| OITE review | L2 + examFrequency-weighted |

---

## F. Proposed Node Types

Additive — do not remove existing types.

| Node type | Purpose |
|-----------|---------|
| `prepare_topic` | Bridge/shell for student-facing topic; links static ID ↔ curriculum_node ↔ canonical_entity cluster |
| `decision_point` | Explicit management-changing rule (“unstable mortise → operative fixation”) |
| `educational_claim` | Atomic assertion with provenance (“pulses late in compartment syndrome”) |
| `training_level` | MS3, PGY1, PGY2, fellow (real table, not pseudo-endpoint) |
| `rotation_profile` | Trauma, spine, hand, etc. with weighted topic relevance |
| `topic_archetype` | Enum/reference: fracture, procedure, degenerative, sports, pediatric, spine, hand, infection, tumor, anatomy, basic_science |
| `case_module` | CasePrep module with section content refs |
| `canonical_question_item` | First-class question reference (metadata + SnapOrtho-generated stems only) |

Keep existing: `curriculum_nodes`, `concepts`, `canonical_entities`, `learning_objectives`, `canonical_cards`, `external_questions`.

---

## G. Proposed Edge Types

### Importance and pedagogy (NEW)

| Predicate | Subject → Object | Purpose |
|-----------|------------------|---------|
| `has_importance` | any → importance_level (or metadata) | L1–L4 tagging |
| `expected_for_rotation` | entity → rotation_profile | Rotation prep |
| `expected_at_training_level` | entity → training_level | Learner stage (exists — needs data) |
| `prepare_topic_covers` | prepare_topic → canonical_entity | Topic cluster |
| `has_decision_point` | condition → decision_point | Management changers |
| `asserts_claim` | entity → educational_claim | Provenance-backed fact |

### Archetype-specific (extend existing registry)

| Archetype | Key edges |
|-----------|-----------|
| Fracture | `has_classification`, `requires_imaging`, `indicates_treatment`, `involves_anatomy`, `has_complication`, `tested_by` |
| Procedure | `indicated_for`, `contraindicated_for`, `uses_approach`, `uses_positioning`, `uses_implant`, `has_complication` |
| Infection | `requires_imaging` (aspiration), `indicates_treatment` (I&D), `has_complication` |
| Spine emergency | `has_decision_point` (CES red flags), `indicates_treatment` (urgent MRI/decompression) |

### Enable deferred edges (requires tables)

- `exemplified_by_case` → `case_module`
- `supported_by_question` → `canonical_question_item`
- `covered_by_module` → `case_module`

---

## H. Proposed Metadata Fields

### On `prepare_topic` bridge (new table or `curriculum_nodes.metadata` extension)

```typescript
{
  prepareTopicId: string;           // "distal-radius-fracture"
  topicArchetype: TopicArchetype;
  publicationStatus: "draft" | "internal_review" | "verified" | "deprecated";
  defaultStudyMinutes: { fast: number; deep: number };
  rotationWeights: Record<string, number>;  // trauma: 0.95
  learnerStageWeights: Record<string, number>;
}
```

### On `canonical_entities.metadata` or `educational_claims`

```typescript
{
  importanceLevel: 1 | 2 | 3 | 4;
  safetyCriticality: "none" | "moderate" | "high" | "emergency";
  managementImpact: boolean;
  examFrequency: "rare" | "occasional" | "common" | "very_common";
  caseFrequency: "rare" | "occasional" | "common" | "very_common";
  attendingQuestionLikelihood: number; // 0–1
  orRelevance: number;
  clinicRelevance: number;
  callRelevance: number;
  contentSource: "verified" | "generated_draft" | "needs_review" | "deprecated" | "source_missing";
  lastReviewedAt: string;
  reviewedBy: string;
}
```

### Content labeling taxonomy (recommended)

| Label | Public Prepare | Internal staff |
|-------|----------------|----------------|
| `verified` | ✅ Show | ✅ |
| `generated_draft` | ❌ | ✅ with badge |
| `needs_review` | ❌ | ✅ in review queue |
| `deprecated` | ❌ | ✅ archive |
| `source_missing` | ❌ | ✅ blocker flag |
| `high_risk_safety_critical` | ✅ only if also `verified` | ✅ always flagged |

---

## I. Prepare Integration Model

### Architecture: Bridge-first, read-only KG adapter

```
┌──────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  Prepare UI      │────▶│  PrepareContentService │────▶│  Static fallback │
└──────────────────┘     │  (new adapter layer)   │     │  curriculum-data │
                         └──────────┬──────────┘     └─────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │  KG Read API         │
                         │  (Supabase / RPC)    │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
     prepare_topic_bridges   canonical_entities    educational_claims
     curriculum_nodes         relationships          card/question links
```

### Query patterns

**1. Topic shell resolution**
```sql
-- Resolve Prepare topic → bridge → curriculum_node + entity cluster
SELECT * FROM prepare_topic_bridges WHERE prepare_topic_id = $1;
```

**2. Must-know bundle (L1 claims)**
```graphql
prepareTopic(id) {
  claims(importanceLevel: 1, reviewStatus: APPROVED) { text, provenance, safetyCriticality }
  anatomy(importanceLevel: 1) { label, structure }
  complications(importanceLevel: 1) { label }
}
```

**3. What changes management**
```graphql
prepareTopic(id) {
  decisionPoints { condition, action, rationale, reviewStatus }
  classifications { system, gradesThatChangeTreatment { grade, treatment } }
}
```

**4. Related assets**
```graphql
prepareTopic(id) {
  questionCount(examFrequency: COMMON)
  cardCount
  caseModules { slug, title }
  relatedTopics { prepareTopicId, relationship }
}
```

### Graph traversal patterns

| Use case | Traversal |
|----------|-----------|
| Rotation prep | `rotation_profile` → `expected_for_rotation` → `prepare_topic` → L1 claims |
| Tomorrow’s OR | schedule.case_type → `case_module` → `prepare_topic_covers` → procedure entities → `uses_approach` |
| Weak area | user.missed_questions → `external_question` → `question_canonical_entity_links` → entities → parent `prepare_topic` |
| BroBot context | `prepare_topic` → approved claims + decision_points + linked card fronts (not copyrighted OB stems) |

### API shape (recommended)

```
GET /api/prepare/topics/:prepareTopicId/shell
GET /api/prepare/topics/:prepareTopicId/fast-guide?learnerStage=MS3&rotation=trauma
GET /api/prepare/topics/:prepareTopicId/decision-points
GET /api/prepare/rotations/:rotationId/high-yield?limit=10
GET /api/prepare/topics/:prepareTopicId/related-assets
```

### Caching strategy

| Layer | TTL | Invalidation |
|-------|-----|--------------|
| CDN/edge — verified topic shells | 1 hour | On `publicationStatus` change |
| App memory — rotation high-yield lists | 15 min | Rotation + importance updates |
| Per-user weak areas | No cache | Real-time from progress tables |

### Fallback behavior

1. If bridge missing → **static `curriculum-data.ts`** (current behavior)
2. If KG claims exist but `reviewStatus != approved` → static fallback for public; staff sees draft badge
3. If partial graph → merge: static template shell + KG-enriched sections (clearly labeled)
4. Never show empty sections — suppress module if zero approved claims

### Validation rules before public exposure

- `prepare_topic.publicationStatus = verified`
- ≥3 L1 claims with `contentSource = verified`
- Archetype assigned
- Bridge to `curriculum_node` exists
- No `needs_review` or `generated_draft` claims in L1 bundle
- Safety-critical topics require `reviewed_by` + `lastReviewedAt` within policy window

### BroBot alignment

- BroBot should receive the **same `prepareTopicId` context** as Prepare
- Prompt builder pulls: topic archetype, L1 claims, decision points, user learner stage
- Orthobullets extension should **use** `canonicalEntityIds` (currently fetched, unused)
- Shared context object: `PrepareGraphContext { prepareTopicId, entityIds, approvedClaims[], rotationId }`

### CasePrep alignment

- Extend `caseprep-topic-mapping.ts` → `case_module` table with `prepare_topic_id` FK
- CasePrep sections reference `educational_claim` IDs where certified
- Unified progress: `student_workspace_curriculum_progress.topic_id` = `prepare_topic_id`

---

## J. Sample Topic Audits

Legend: **Static** = `curriculum-data.ts`; **KG** = database graph state per retargeting/automation reports.

### 1. Distal Radius Fracture

| Criterion | Static Prepare | KG |
|-----------|----------------|-----|
| Must-know identified | ✅ `mustKnow` bullets (generic) | ❌ No canonical entity; node `trauma-distal-radius-fractures` blocked |
| Management changers | ⚠️ `decisionMaking` one-liner | ❌ No decision_point nodes |
| Anatomy linked | ⚠️ Template strings | ❌ No `involves_anatomy` edges |
| Complications linked | ⚠️ Template list | ❌ |
| Procedures linked | ⚠️ "Volar plating" in text | ❌ No procedure entities |
| Questions linked | ❌ | ⚠️ 41 OB questions → curriculum_node |
| Student-friendly hierarchy | ✅ Fast/deep split | ❌ Flat Orthobullets node |
| Generic filler | ⚠️ Moderate — acceptable for MS3 | N/A |
| **Missing** | Archetype-specific structure, Colles/Smith distinction depth | Entity, relationships, bridge from `distal-radius-fracture`, Anki cards (0 mapped to node) |

### 2. Ankle Fracture

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Mortise, stability language | ⚠️ Node exists; entity blocked |
| Management changers | ✅ Stability → fixation | ❌ |
| Anatomy | ✅ Malleoli, syndesmosis | ❌ |
| Complications | ✅ Template | ❌ |
| Procedures | ✅ ORIF mentioned | ❌ |
| Questions | ❌ | ✅ 98 OB questions; 12 Anki cards mapped |
| Generic filler | Low | N/A |
| **Missing** | Weber SER patterns as decision structure | Canonical entity, `has_classification` → Weber |

### 3. Femoral Neck / Intertrochanteric (Prepare: combined `hip-fracture`)

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Location, displacement, urgency | ⚠️ **KG splits into two nodes/entities** |
| Management changers | ✅ Displaced neck → arthroplasty | ⚠️ Proof seed has Garden, hemi, AVN edges for IT/neck |
| Anatomy | ✅ Blood supply | ✅ MFCA entity in proof seed |
| Complications | ✅ AVN, nonunion | ⚠️ AVN entity exists |
| Procedures | ✅ Screws, nail, hemi, THA | ⚠️ Cephalomedullary nail, hemiarthroplasty in proof seed |
| Questions | ❌ | ✅ 64 neck + 40 IT questions |
| **Missing** | **Prepare combines what KG splits** — bridge must map 1→2 | Full relationship graph beyond proof seed |

### 4. Tibial Shaft Fracture

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Soft tissue, compartments | ⚠️ Node `trauma-tibial-shaft-fractures` — entity blocked |
| Management changers | ✅ Compartment vigilance | ❌ |
| Questions | ❌ | ✅ 63 OB questions; 10 Anki cards |
| **Missing** | IM nail entry point as decision point | Entity + compartment syndrome link edge |

### 5. Compartment Syndrome

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Pain, passive stretch, urgency | ⚠️ Node `trauma-leg-compartment-syndrome`; entity blocked |
| Management changers | ✅ Clinical diagnosis → fasciotomy | ❌ |
| Safety critical | ✅ Strong static content | ❌ Not tagged `safetyCriticality` in graph |
| Questions | ❌ | ✅ 23 OB questions; 10 Anki cards |
| **Missing** | Archetype = emergency (not procedure) — static UI still shows procedure modules | Entity, pressure measurement nuance as decision_point |

### 6. Carpal Tunnel Syndrome

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Median distribution, thenar weakness | ❌ Node blocked — no entity |
| Management changers | ⚠️ Thenar atrophy → surgery urgency | ❌ |
| Questions | ❌ | ✅ 24 OB questions; 0 Anki cards |
| **Missing** | EMG timing, differential (Pronator, C6) | Entity + `exam_maneuver` links (Phalen, Tinel) |

### 7. Rotator Cuff Tear

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Weakness, night pain, exam | ⚠️ Node exists; entity blocked |
| Questions | ❌ | ✅ 82 OB questions; 15 Anki cards |
| **Missing** | Acute traumatic vs chronic degenerative decision fork | Entity, tear size/atrophy decision points |

### 8. ACL Tear

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Pop, effusion, Lachman | ✅ Node retargeted (entity exists) |
| Questions | ❌ | ✅ 115 OB questions |
| **Missing** | Pediatric ACL, associated meniscus root | `involves_anatomy`, rehab vs recon decision_points |

### 9. Hip Osteoarthritis

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Groin pain, ROM, conservative → THA | ❌ Node blocked |
| **Missing** | KL grading linked to management | Entity + classification edges |

### 10. Knee Osteoarthritis

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Varus/valgus, conservative ladder | ❌ Node blocked |
| **Missing** | Uni vs TKA decision framework | Entity, links to TKA |

### 11. Total Hip Arthroplasty

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Components, dislocation precautions | ❌ No THA procedure entity |
| Archetype mismatch | Static uses **procedure modules** (appropriate) | KG has no procedure modeling |
| **Missing** | Approach-specific pitfalls, bearing surfaces | Full procedure subgraph |

### 12. Total Knee Arthroplasty

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Alignment, components, stiffness risk | ❌ Blocked |
| **Missing** | Gap balancing, CR vs PS — decision_points | Procedure entity + implant edges |

### 13. Lumbar Radiculopathy (`lumbar-disc-herniation`)

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Leg pain, SLR, red flags | ✅ Node retargeted; 49 OB questions; 9 Anki cards |
| Management changers | ⚠️ Progressive deficit → surgery | ❌ |
| CES link | ✅ Mentioned in self-check | ❌ No edge to cauda equina entity |
| **Missing** | Level-specific root mapping | `decision_point` for motor deficit urgency |

### 14. Cauda Equina Syndrome

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Retention, saddle, emergency | ❌ Node blocked (8 OB questions) |
| Safety critical | ✅ Excellent static content | ❌ Not in graph as emergency entity |
| **Missing** | **Highest-risk gap for KG** — safety-critical topic with no canonical entity | Entity + mandatory L1 + `safetyCriticality: emergency` |

### 15. SCFE

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Obese adolescent, limp, urgency | ❌ Node blocked (38 OB questions) |
| **Missing** | Stable vs unstable, prophylactic pinning | Pediatric entity + decision_points |

### 16. Supracondylar Humerus Fracture

| Criterion | Static | KG |
|-----------|--------|-----|
| Must-know | ✅ Age, NV exam, Gartland concept | ⚠️ Node `pediatrics-supracondylar-fracture-pediatric` retargeted; 58 OB questions |
| **Missing** | Pink pulseless algorithm | decision_point chain + vascular complication edges |

### 17. Osteomyelitis

| Criterion | Static | KG |
|-----------|--------|-----|
| Exists in Prepare | ❌ **No standalone topic** | ⚠️ `Pediatrics > Osteomyelitis - Pediatric` — blocked |
| **Missing** | Entire Prepare topic | Entity, labs, biopsy, drainage pathway |

### 18. Septic Arthritis

| Criterion | Static | KG |
|-----------|--------|-----|
| Exists in Prepare | ❌ **No standalone topic** | ⚠️ `Hip Septic Arthritis - Pediatric` — blocked (30 OB questions) |
| **Missing** | Entire Prepare topic — major pediatric emergency | Entity, Kocher criteria, urgent drainage |

### Sample audit summary

| Topic | Static quality | KG ready? | Critical gap |
|-------|---------------|-----------|--------------|
| Distal radius | Good MS3 shell | ❌ | No entity, no bridge |
| Ankle fracture | Good | ⚠️ | Entity blocked; questions exist |
| Hip fracture | Good but combined | ⚠️ | 1:N slug mismatch with KG |
| Tibial shaft | Good | ⚠️ | Entity blocked |
| Compartment syndrome | Strong safety content | ❌ | Not marked safety-critical in KG |
| Carpal tunnel | Good | ❌ | Entity blocked |
| Rotator cuff | Good | ⚠️ | Cards + questions; no entity |
| ACL | Good | ⚠️ best retargeted | Decision points missing |
| Hip/knee OA | Good | ❌ | Entities blocked |
| THA/TKA | Good procedure template | ❌ | No procedure subgraph |
| Lumbar radiculopathy | Good | ⚠️ | CES link missing |
| Cauda equina | Strong static | ❌ | **Safety-critical, not in KG** |
| SCFE | Good | ❌ | Blocked |
| Supracondylar | Good | ⚠️ | Pink pulseless not modeled |
| Osteomyelitis | **Absent** | ❌ | Not in Prepare at all |
| Septic arthritis | **Absent** | ❌ | Not in Prepare at all |

**Pattern:** Static Prepare content is **usable but template-generic**. KG has **question/card mappings** for many topics but **cannot drive hierarchical, importance-ranked, archetype-aware Prepare** without entities, relationships, and bridges.

---

## K. Graph Quality Issues

### Structural

| Issue | Scale | Severity |
|-------|-------|----------|
| **Orphan concepts** | 0 concepts (empty table) | High — atomic layer unused |
| **Blocked canonical bridges** | 711 / 752 nodes (94.5%) | Critical |
| **Duplicate topic representations** | Prepare `hip-fracture` vs KG femoral neck + IT | High |
| **Inconsistent slugs** | `distal-radius-fracture` vs `trauma-distal-radius-fractures` | Critical for integration |
| **Missing subspecialty on some nodes** | Orthobullets specialty normalization gaps | Medium |
| **No topicArchetype** | All topics | Critical |
| **Generic low-value nodes** | e.g. Legal Considerations, Material Properties — 12+ cards mapped | Medium |
| **Overly broad objectives** | KG LOs not scaled; static LOs are sentence-level | Medium |
| **Broken semantic relationships** | Only proof-seed edges | Critical |
| **Nonsensical cycles** | Not detected (tree + sparse edges) | Low |
| **Procedures disconnected** | THA, TKA, CTR blocked | High |
| **Anatomy disconnected** | Except proof MFCA | High |
| **Complications disconnected** | Lists in static text only | High |

### Mapping quality

| Issue | Detail |
|-------|--------|
| Anki weak tags | 834 / 5,095 cards weakly tagged |
| Source-only tags dominate | CasePrep tags on 2,332 cards — provenance, not topics |
| Duplicate card clusters | 159 duplicate groups — review backlog |
| Broad nodes received mappings | Material Properties (16 cards) — mapping target too generic |
| Deterministic vs LLM disagreement | 31 cases where LLM approves but deterministic blocks |

### Content without provenance

- All static Prepare templates are **editorial** — no `ontology_provenance_records`
- No distinction between verified clinical content and generated placeholders
- `buildProcedurePrepModules()` fabricates structure from whatever template fields exist — not evidence-backed

### Coverage statistics (from reports)

| Metric | Value |
|--------|-------|
| curriculum_nodes | ~752 |
| canonical_entities (bridged) | ~41 |
| card_knowledge_links | 1,111 |
| Anki mapping rate | 21.8% |
| Question → entity retarget | 23.8% (1,801 / 7,557) |
| Card → entity retarget | 33.9% (377 / 1,111) |
| Semantic relationships (production) | Proof seed only (~handful) |

---

## L. Source and Provenance Issues

### What exists

- **Orthobullets:** Metadata only — compliant with copyright boundary
- **Anki:** Full card content in `canonical_card_versions` with GUID preservation
- **Automation proposals:** Confidence tiers, evidence summaries, reviewer notes
- **Governance ledger:** Merge/split/deprecate actions tracked
- **Retargeting rollback:** `rollback_batch_key` on parallel mapping tables

### What is missing

| Gap | Risk |
|-----|------|
| Per-claim provenance for Prepare content | Cannot label verified vs draft |
| Citation links to literature/guidelines | No `article` table |
| Versioning of educational claims | Edits not tracked atomically |
| Unified review queue for Prepare-facing content | Anki review exists; ontology review is script-driven |
| `lastReviewedAt` on static templates | Stale content risk |
| Confidence on static `mustKnow` bullets | Students cannot trust hierarchy |

### Recommended medical content labels

| Label | Criteria |
|-------|----------|
| `verified` | Attending-reviewed; provenance attached; `review_status = approved` |
| `needs_review` | Imported or generated; not yet approved |
| `generated_draft` | LLM output; never public without review |
| `deprecated` | Superseded by newer claim with `replaced_by` |
| `source_missing` | No provenance record — block from L1 |
| `high_risk_safety_critical` | Emergency topics (CES, compartment, septic arthritis) — require attending sign-off |

---

## M. Recommended Implementation Roadmap

### Phase 0 — Audit / report only ✅ (this document)

Deliverables: architecture map, gap analysis, sample topic audits, integration model, phased roadmap.

### Phase 1 — Schema additions (non-breaking)

**Goal:** Add bridge and importance infrastructure without breaking Anki/OB importers.

- [ ] `prepare_topic_bridges` table (`prepare_topic_id`, `curriculum_node_id`, `canonical_entity_ids[]`, `topic_archetype`, `publication_status`)
- [ ] `educational_claims` table with `importance_level`, `safety_criticality`, `content_source`, provenance FK
- [ ] `decision_points` table
- [ ] `training_levels` table (replace pseudo-endpoint)
- [ ] Extend `curriculum_nodes.metadata` or bridge metadata for rotation weights
- [ ] `case_modules` table (minimal: slug, title, `prepare_topic_id`)
- [ ] Importance + archetype enums as CHECK constraints or reference tables
- [ ] RPC: `resolve_prepare_topic(prepare_topic_id)` → shell + fallback hint
- [ ] Staff-only views for `needs_review` content
- [ ] Slug mapping seed for ~30 high-yield Prepare topics ↔ KG nodes

**Do not:** Delete concepts table, mutate legacy mappings, or change importer contracts.

### Phase 2 — High-yield topic curation

**Goal:** Make 20–30 topics graph-complete enough for Prepare pilot.

Priority queue (safety + frequency):
1. Cauda equina syndrome
2. Compartment syndrome
3. Septic arthritis / osteomyelitis (add Prepare topics)
4. Distal radius fracture
5. Ankle fracture
6. Femoral neck + intertrochanteric (split Prepare topic or bridge 1→2)
7. Tibial shaft fracture
8. Supracondylar humerus fracture
9. SCFE
10. ACL tear
11. Lumbar disc herniation
12. Carpal tunnel syndrome
13. Rotator cuff tear
14. THA / TKA
15. Hip / knee OA

Per topic:
- Create/approve `canonical_entity`
- `curriculum_node_entities` bridge
- 5–15 `educational_claims` (L1/L2) with provenance
- 3–5 `decision_points`
- Key `canonical_relationships` (classification, anatomy, complications)
- `prepare_topic_bridge` row
- Set `publication_status = verified` only when reviewed

### Phase 3 — Prepare KG-powered rendering (pilot)

**Goal:** `PrepareContentService` with static fallback.

- [ ] API routes under `/api/prepare/`
- [ ] Case Readiness reads claims for must-know / decision sections
- [ ] Archetype-specific section builders (replace generic `buildProcedurePrepModules` for pilot topics)
- [ ] Publication gate: never render `generated_draft` publicly
- [ ] “Source: verified” indicator for curated claims
- [ ] Feature flag: `prepare_kg_pilot_topic_ids`

### Phase 4 — BroBot and CasePrep graph alignment

- [ ] Shared `PrepareGraphContext` in BroBot prompt builder
- [ ] Use `canonicalEntityIds` in Orthobullets extension
- [ ] CasePrep `case_modules` linked to `prepare_topic_id`
- [ ] Expand CasePrep mapping beyond 9 topics via graph
- [ ] BroBot prompts reference decision_points, not just template strings

### Phase 5 — Adaptive learning and mastery tracking

- [ ] User question performance → weak entity detection
- [ ] Spaced repetition via `canonical_cards` on weak entities
- [ ] Rotation-aware daily recommendations from graph weights
- [ ] OITE mode: filter by `examFrequency`
- [ ] Mastery thresholds per `training_level`

---

## N. Quick Wins

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | Create `prepare_topic_bridges` seed for 30 topics with slug mapping | Low | Unblocks all integration |
| 2 | Use Orthobullets question counts per node as `examFrequency` proxy | Low | Rotation/OITE weighting |
| 3 | Mark 41 retargeted entities with `publication_status` in metadata | Low | Visibility into what's ready |
| 4 | Wire `canonicalEntityIds` into BroBot Orthobullets prompts | Low | Immediate KG value |
| 5 | Split static `hip-fracture` into neck + IT OR document 1→2 bridge | Medium | Fixes major mismatch |
| 6 | Add `septic-arthritis` + `osteomyelitis` to static Prepare | Medium | Closes safety gap |
| 7 | Auto-apply LLM-approved entities for top 10 blocked high-yield nodes | Medium | Jumps entity count |
| 8 | Archetype field on static topics (no KG dependency) | Low | UI can conditionally render |
| 9 | Suppress procedure modules for non-procedure archetypes | Low | Immediate UX improvement |
| 10 | Staff dashboard: blocked nodes with question counts > 30 | Low | Curation prioritization |

---

## O. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Premature KG-powered Prepare exposes draft/wrong content | High if rushed | Patient safety / trust | Strict publication gates; static fallback |
| Slug mismatch causes wrong topic resolution | High | Incorrect study content | Bridge table with tests; never infer slugs |
| Three systems drift further apart | Medium | Permanent dual maintenance | Bridge-first architecture; deprecate static only per-topic |
| Over-automation creates low-quality entities | Medium | Graph pollution | Keep proposal review; no auto-apply for safety-critical |
| Orthobullets copyright boundary crossed | Low (if disciplined) | Legal | Metadata only; SnapOrtho-generated stems |
| Engineers treat `curriculum_nodes` as domain truth | High | Perpetuates current debt | Document: nodes are overlay; entities are truth |
| Generic nodes (Material Properties) pollute recommendations | Medium | Noise in prep | Filter generic/blocked nodes from Prepare queries |
| Combined vs split topics (hip fracture) confuse learners | Medium | Pedagogical harm | Explicit bridge metadata; Prepare UI shows sub-entities |
| Empty `concepts` table creates false impression KG is ready | High | Stakeholder misread | This audit; dashboard metrics on entity coverage |

---

## P. Open Questions

1. **Should Prepare topics remain editorial shells** (curated UX) with KG as backing, or should Prepare render directly from `curriculum_nodes`?
2. **Split `hip-fracture` in Prepare** into femoral neck + intertrochanteric, or maintain combined topic with internal sub-clusters?
3. **Who owns medical review** — clinical advisors per subspecialty, or rotating resident + attending sign-off workflow?
4. **What is the minimum L1 claim count** before a topic can go `verified`?
5. **Should Anki card fronts appear in Prepare**, or only drive BroBot/spaced repetition?
6. **CasePrep migration path** — retrofit existing modules to `case_modules` table or bridge-only?
7. **OITE prep** — separate importance overlay or same L1–L4 with higher `examFrequency` weight?
8. **Pediatric vs adult** — same entity with age modifiers, or separate entities (e.g. septic arthritis)?
9. **How to handle 711 blocked nodes** — bulk LLM entity creation vs manual curation of top 100?
10. **Vector search** — is embedding-based similarity needed for BroBot, or is graph traversal sufficient near-term?
11. **Progress migration** — when static `topicId` changes, how to remap `student_workspace_curriculum_progress`?
12. **Copyright strategy for attending questions** — generate original from KG claims + OB metadata only?

---

## Appendix: File Reference

| Path | Role |
|------|------|
| `supabase/migrations/20260626_090000_educational_ontology_foundation.sql` | Phase 1 schema |
| `supabase/migrations/20260628_120000_next_generation_kg_foundation.sql` | Canonical entities + relationships |
| `supabase/migrations/20260628_160000_legacy_ontology_retargeting.sql` | Parallel retargeting tables |
| `scripts/lib/education/kg-relationship-registry.ts` | Predicate vocabulary |
| `src/lib/student-curriculum/curriculum-data.ts` | De facto Prepare content |
| `src/lib/student-curriculum/case-readiness-builder.ts` | Case readiness assembly |
| `src/lib/student-curriculum/procedure-prep-modules.ts` | Generic 16-module template |
| `src/lib/brobot/orthobullets/kg-lookup.ts` | Only runtime KG consumer |
| `reports/legacy-retargeting-completion-report.md` | 41/752 retargeted nodes |
| `reports/anki-kg-mapping-v1-report.md` | 1,111 card mappings |
| `docs/snaportho-knowledge-graph-architecture-audit-2026-06-28.md` | Prior architecture audit |
| `docs/snaportho-next-generation-knowledge-graph-blueprint-2026-06-28.md` | Target blueprint |

---

*End of audit. No implementation performed. No medical content generated. Uncertainty preserved where data was incomplete.*