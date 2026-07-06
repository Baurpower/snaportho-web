# SnapOrtho Knowledge Factory Build Plan

**Date:** 2026-07-05  
**Status:** Planning document — no implementation  
**Scope:** How SnapOrtho builds the Orthopaedic Knowledge Network from raw sources into mature canonical objects  
**Prerequisites:**
- [Orthopaedic Knowledge Network Vision Blueprint](./kg-orthopaedic-education-ontology-plan-2026-07-05.md)
- [Canonical Knowledge Object Specification](./canonical-knowledge-object-specification.md)
- [Anatomy Ontology Plan](./anatomy-ontology-plan.md)
- [KG Excellence Roadmap](./kg-excellence-roadmap-2026-07-05.md)
- [KG Prepare Readiness Audit](../audits/kg-prepare-readiness-audit-2026-07-05.md)  
**Audience:** Engineering, clinical curation, medical education, product

---

## 1. Executive Summary

### Current state: ingestion factory, not knowledge factory

SnapOrtho has built a credible **ingestion and mapping factory**:

| Asset | Scale | Role today |
|-------|-------|------------|
| Orthobullets question metadata | 7,557 questions → 752 `curriculum_nodes` | Topic overlay + mapping target |
| Anki canonical cards | 5,095 cards; 1,111 (21.8%) mapped | Spaced-repetition assets |
| `canonical_entities` | ~41 bridged nodes; proof seed (hip fracture) | Early typed domain layer |
| `canonical_relationships` | Schema rich; data sparse | Automation emits 3 predicates only |
| `kg_automation_proposals` | Review-gated proposal layer | Entities, bridges, relationships — no claims/DPs yet |
| Static Prepare content | ~68 topics in `curriculum-data.ts` | **De facto** student-facing truth |
| Product KG consumption | **Zero** for Prepare, CasePrep, BroBot main chat | Graph is not the content engine |

The pipeline today is closer to **source → curriculum_node → card link** than **source → canonical neighborhood → reviewed graph object**.

Three parallel systems coexist without reconciliation:

```
curriculum_nodes (import overlay)     canonical_entities (target truth)     curriculum-data.ts (Prepare truth)
         │                                      │                                      │
         └──────────── bridges (41/752) ────────┴──────── no ID bridge ──────────────┘
```

Existing scripts in `scripts/lib/education/` and top-level `scripts/` handle import, mapping, proposal generation, and QA reports — but they do not yet produce **mature canonical objects** with weighted relationships, atomic claims, verified decision points, and publication gates.

### Goal: the Knowledge Factory

The Knowledge Factory turns raw sources and existing static content into **mature canonical objects** that products traverse — not study guides.

**The factory builds graph neighborhoods, not topic pages.**

For each high-yield clinical topic, the factory must produce:

| Output | Description |
|--------|-------------|
| **Reviewed canonical entities** | Typed nodes with stable identity |
| **Weighted relationships** | Typed, directed, metadata-rich edges |
| **Atomic claims** | Governed teaching assertions |
| **Verified decision points** | Management-changing if/then logic |
| **Metadata** | Importance, context, learner stage, safety |
| **Asset links** | Cards, questions → canonical IDs |
| **Provenance** | Every assertion traceable to source + reviewer |

### Target pipeline

The ontology dictates the pipeline — not the other way around.

```
raw source
  → extraction
  → normalization
  → canonical identity resolution
  → relationship proposal
  → claim proposal
  → decision point proposal
  → metadata proposal
  → evidence / provenance attachment
  → quality scoring
  → human review
  → publication
  → product traversal
```

### What success looks like

**Pilot 1:** One complete, reviewed, traversable **ankle knowledge neighborhood** — anatomy subgraph, ankle fracture entity, classifications, findings, fixation, complications, L1/L2 claims, decision points, traps, asset links, metadata, review gates, and traversal smoke tests.

That pilot proves the factory can convert source material into canonical KG objects and product-ready `LearningContext` — before any broad 752-node sprint or product-wide Prepare migration.

---

## 2. Knowledge Factory Principles

These principles govern every factory stage, script, and curation decision.

| Principle | Meaning |
|-----------|---------|
| **Canonical before convenience** | Model correctly once; do not paste into `curriculum-data.ts` because it ships faster |
| **Sources propose; KG decides** | Orthobullets topics, Anki tags, and LLM output are signals — not ontology truth |
| **Automation proposes; humans approve** | `kg_automation_proposals` pattern extends to claims, DPs, metadata — never auto-publish safety content |
| **Relationships over pages** | Factory output is traversable neighborhoods, not rendered HTML |
| **Anatomy-first where relevant** | Build anatomy hubs before clinical edges attach (see [Anatomy Ontology Plan](./anatomy-ontology-plan.md)) |
| **No product-owned medical content** | Prepare templates, BroBot prompts, CasePrep sections reference IDs — they do not author truth |
| **Every output has provenance** | `ontology_provenance_records`, source signals, reviewer identity on all published assertions |
| **Safety-critical content has higher review gates** | Emergency DPs, red flags, `must_protect_during` anatomy require attending/safety review |
| **Quality before quantity** | One Level 7 ankle neighborhood beats fifty Level 1 entity shells |

### Non-negotiable gates

- Generated claims are **`generated_draft`** until reviewed — never `verified`
- LLM synthesis produces **proposals only** — not canonical mutations
- `curriculum_nodes` remain **import overlay + bridge** — not disease definitions
- Products **read** canonical objects; they do not **write** them

---

## 3. Source Inventory

Each source type is classified by what it can contribute, what it cannot, copyright/provenance limits, and its best role in the factory.

### 3.1 Orthobullets metadata / questions

| Dimension | Assessment |
|-----------|------------|
| **Scale** | 7,557 `external_questions`; 7,557 mappings to `curriculum_nodes` |
| **Can contribute** | Topic co-occurrence signals; exam frequency proxy; curriculum_node bridge targets; question → topic mapping for asset linking |
| **Cannot contribute** | Question stems, answers, explanations (copyright); canonical disease definitions; verified medical assertions |
| **Copyright / provenance** | Metadata only — topic titles, subspecialty, question IDs. No OB prose in canonical KG |
| **Best pipeline role** | **Source intake → asset linking → metadata proxy** (exam emphasis, topic clustering). Bridge `curriculum_node` → `canonical_entity` via `curriculum_node_entities` |

**Existing tooling:** `import-orthobullets-questions.ts`, `orthobullets-import.ts`, `external_question_curriculum_mappings`

### 3.2 Anki cards

| Dimension | Assessment |
|-----------|------------|
| **Scale** | 5,095 `canonical_cards`; 1,111 high-confidence `card_knowledge_links`; 5,730 mapping candidates |
| **Can contribute** | Atomic fact candidates; trap/mnemonic signals; anatomy term co-occurrence; deck-path → topic affinity; asset links to entities/claims |
| **Cannot contribute** | Canonical entity identity (deck paths are noisy); verified management logic without review; ontology structure |
| **Copyright / provenance** | User/curated deck content — link as assets, do not copy card text into canonical claims verbatim without review and attribution |
| **Best pipeline role** | **Extraction → claim proposal candidates → asset linking**. Cards support `supported_by_card` edges after claims exist |

**Existing tooling:** `map-anki-to-kg.ts`, `anki-kg-mapper.ts`, `anki-kg-tag-rules.ts`, `anki-import/`

**Known noise patterns (from mapping report):** `Muscles`, `GeneralAnatomy`, `Hand`, broad root nodes — require normalization, not direct entity creation.

### 3.3 Static Prepare content (`curriculum-data.ts`)

| Dimension | Assessment |
|-----------|------------|
| **Scale** | ~68 topics; uniform 16-module procedure template; 8 case-readiness objective kinds |
| **Can contribute** | Rich **decomposition source** for claim/DP extraction on pilot topics; existing learner-facing phrasing as draft candidates; topic slug → bridge ID for `prepare_topic_bridges` |
| **Cannot contribute** | Canonical truth without review (static content was never centrally governed); archetype-agnostic templates that flatten fracture vs procedure vs infection |
| **Copyright / provenance** | Internal SnapOrtho content — extract to proposals, re-review against ontology |
| **Best pipeline role** | **Pilot source packet** for ankle, compartment syndrome, distal radius. Static fields (`mustKnowPoints`, `commonMistakes`, `pimpQuestions`, `anatomyFocus`) → claim proposal input — not direct DB insert |

**Example:** `ankle-fracture` topic in `curriculum-data.ts` has `anatomyFocus`, `commonMistakes`, `pimpQuestions` — factory decomposes into atomic claim proposals linked to canonical entities.

### 3.4 CasePrep certified payloads

| Dimension | Assessment |
|-----------|------------|
| **Scale** | 9 hardcoded topic slugs in `caseprep-topic-mapping.ts`; certified context stub (`getCasePrepCertifiedContext()` returns null) |
| **Can contribute** | Procedure-oriented claim/DP candidates; operative pearl signals; approach anatomy hints for CasePrep pilots |
| **Cannot contribute** | Canonical definitions until certified content is parsed into proposals and reviewed; graph structure |
| **Copyright / provenance** | Certified SnapOrtho / licensed content — provenance tagged as `verified` only after explicit review pass |
| **Best pipeline role** | **Phase G+ source** for procedure neighborhoods (ankle ORIF, distal radius ORIF). Link via `case_module` when table exists |

### 3.5 Internal notes / attending preferences

| Dimension | Assessment |
|-----------|------------|
| **Scale** | Attending preference tables exist (unrelated `tsvector` fields); informal curation notes in scripts/reviews |
| **Can contribute** | Expert ranking for metadata; attending pearl claim candidates; safety review authority |
| **Cannot contribute** | Unreviewed informal notes as `verified` content |
| **Copyright / provenance** | Internal — attribute to named reviewer |
| **Best pipeline role** | **Human review stage** input; metadata weighting (`attending_question_likelihood`, `clinical_importance`) |

### 3.6 Future textbook / guideline / literature sources

| Dimension | Assessment |
|-----------|------------|
| **Can contribute** | High evidence-quality provenance; society guideline decision points; classification definitions |
| **Cannot contribute** | Bulk automated ontology (copyright + safety) |
| **Copyright / provenance** | Licensed / cited — full citation in `ontology_provenance_records` |
| **Best pipeline role** | **Deferred until pilot workflow works** — attach as evidence on reviewed claims/DPs |

### 3.7 Expert reviewer input

| Dimension | Assessment |
|-----------|------------|
| **Can contribute** | Identity approval; relationship validation; claim/DP authoring; safety sign-off; conflict resolution |
| **Cannot contribute** | Scalable bulk coverage without factory automation feeding proposals |
| **Best pipeline role** | **Human review stage (M)** — the quality gate that converts proposals to publication |

### Source hierarchy (what wins on conflict)

```
expert-reviewed canonical assertion  >  static Prepare content  >  Anki card text  >  OB metadata signals  >  LLM proposal
```

---

## 4. Factory Pipeline Architecture

Fifteen stages from source intake to monitoring. Each stage defines purpose, I/O, automation vs human responsibility, failure modes, and quality gates.

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ A. Intake   │──►│ B. Parse    │──►│ C. Detect   │──►│ D. Resolve  │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
       │                                                    │
       ▼                                                    ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ E. Rel prop │◄──│ I. Anatomy  │◄──│ D. Identity │──►│ F. Claim    │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
       │                 ▲                                  │
       ▼                 │                                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ G. DP prop  │──►│ H. Metadata │──►│ J. Assets   │──►│ K. Conflict │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
       │                                                    │
       ▼                                                    ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ L. Quality  │──►│ M. Review   │──►│ N. Publish  │──►│ O. Monitor  │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

### A. Source intake

| Field | Detail |
|-------|--------|
| **Purpose** | Collect raw inputs for a **bounded pilot packet** (e.g., ankle neighborhood) |
| **Input** | Orthobullets node `trauma-ankle-fractures`; 12 linked Anki cards; static Prepare `ankle-fracture` topic; OB questions mapped to node |
| **Output** | `source_packet` manifest: source IDs, slugs, file paths, curator notes |
| **Automation** | Script aggregates IDs from DB + static file pointers |
| **Human** | Curator selects pilot scope and defines inclusion boundaries |
| **Failure modes** | Unbounded intake (whole 752 nodes); mixing copyright prose into packet |
| **Quality gate** | Packet scoped to one neighborhood; no OB stems in manifest |

### B. Parsing / extraction

| Field | Detail |
|-------|--------|
| **Purpose** | Parse source material into structured **candidates** — not canonical truth |
| **Input** | Source packet |
| **Output** | `extraction_candidates`: entity labels, phrase spans, co-occurrence pairs, card fact snippets, static field decomposition |
| **Automation** | TSV/JSON parsers; static TS field readers; optional LLM span extraction (proposal only) |
| **Human** | Curator flags junk extractions |
| **Failure modes** | Paragraph-level claims; extracting OB question stems; treating deck path as entity name |
| **Quality gate** | Candidates are typed (entity / relationship / claim / dp / asset_signal) |

**Existing foundation:** `build-kg-ontology-evidence-packets.ts`, `build-kg-ontology-with-llm.ts`

### C. Candidate object detection

| Field | Detail |
|-------|--------|
| **Purpose** | Identify distinct orthopaedic concepts in candidates |
| **Input** | Extraction candidates |
| **Output** | `detected_objects[]` with proposed type, label, source evidence |
| **Automation** | Rule-based type hints (fracture → `condition`, Weber → `classification_system`); LLM classification proposal |
| **Human** | Curator confirms object boundaries |
| **Failure modes** | One entity per sentence; missing composite hubs (ankle ring) |
| **Quality gate** | Each detection maps to ontology entity type or assertion type |

### D. Entity resolution / canonical identity matching

| Field | Detail |
|-------|--------|
| **Purpose** | Match detections to existing `canonical_entities` or propose new identities |
| **Input** | Detected objects; existing entity index; aliases |
| **Output** | `identity_resolution`: match / create / merge / split / reject |
| **Automation** | Normalized label match; alias lookup; `kg_automation_proposals` type `create_canonical_entity`, `flag_duplicate_entity` |
| **Human** | Curator approves creates and merges |
| **Failure modes** | Duplicate entities; curriculum_node title becomes canonical name |
| **Quality gate** | Stable slug; `anatomy_kind` / `clinical_kind` assigned; aliases registered |

**Existing foundation:** `generate-kg-automation-proposals.ts`, `apply-approved-kg-automation-proposals.ts`, `kg-canonical-mapping.ts`

### E. Relationship proposal

| Field | Detail |
|-------|--------|
| **Purpose** | Propose typed edges between resolved entities |
| **Input** | Resolved entities; extraction co-occurrence; ontology connection patterns |
| **Output** | `relationship_proposals[]` with predicate, subject, object, confidence, metadata draft |
| **Automation** | Rule-based (fracture → `injured_in` bone); card co-occurrence; LLM proposal; anatomy-first inference |
| **Human** | Relationship reviewer approves/rejects; assigns weighting |
| **Failure modes** | `involves_anatomy` catch-all; reversed direction; region-bucket targets |
| **Quality gate** | Predicate in registry; type constraints satisfied; provenance attached |

**Existing foundation:** `generate-kg-automation-proposals.ts` (`add_canonical_relationship`), `kg-relationship-registry.ts`

### F. Claim proposal

| Field | Detail |
|-------|--------|
| **Purpose** | Propose atomic teaching assertions |
| **Input** | Static must-know bullets; Anki card clusters; source phrases; relationship context |
| **Output** | `claim_proposals[]` with `claim_type`, text, `primary_entity_id`, importance draft |
| **Automation** | Static field decomposition; card clustering; LLM atomicization (draft only) |
| **Human** | Curator rewrites for atomicity; assigns L1–L4; approves |
| **Failure modes** | Multi-assertion paragraphs; management if/then as claim instead of DP |
| **Quality gate** | One assertion per claim; `content_source = generated_draft`; linked to entity |

### G. Decision point proposal

| Field | Detail |
|-------|--------|
| **Purpose** | Propose management-changing if/then logic |
| **Input** | Static treatment fields; expert input; classification → treatment patterns |
| **Output** | `dp_proposals[]` with pattern_type, trigger, action, urgency |
| **Automation** | Rule templates (unstable mortise → ORIF); LLM draft from static content |
| **Human** | **Required** for all DPs; attending for safety-critical |
| **Failure modes** | Prose indications without thresholds; unreviewed emergency DPs |
| **Quality gate** | If/then or threshold structure; `safety_criticality` set; linked supporting claims/rels |

### H. Metadata proposal

| Field | Detail |
|-------|--------|
| **Purpose** | Propose weighting on objects, edges, and assertions |
| **Input** | Question counts; card counts; static importance hints; curator rankings |
| **Output** | Metadata drafts on relationships (§6 fields) and objects (importance, context, learner stage) |
| **Automation** | Proxy signals (card count → `frequency`); rule-based safety flags |
| **Human** | Clinical reviewer confirms weighting |
| **Failure modes** | Uniform L1 on everything; missing `context_relevance` |
| **Quality gate** | Essential edges have `anatomy_role` / `relationship_strength`; L1 cap respected |

### I. Anatomy enrichment

| Field | Detail |
|-------|--------|
| **Purpose** | Build / attach anatomy hub per [Anatomy Ontology Plan](./anatomy-ontology-plan.md) |
| **Input** | Pilot region inventory; clinical entities in neighborhood |
| **Output** | Anatomy entities; anatomy↔anatomy edges; clinical→anatomy edges with anatomy metadata |
| **Automation** | Anatomy structure inventory scripts; template edges from connection patterns |
| **Human** | Anatomy curator approves granularity; prevents overlinking |
| **Failure modes** | Generic region buckets; procedure-specific nerve duplicates |
| **Quality gate** | Essential anatomy coverage ≥90%; overlinking rate <5% |

### J. Asset linking

| Field | Detail |
|-------|--------|
| **Purpose** | Link cards and questions to canonical entities and claims |
| **Input** | Resolved entity IDs; 12 ankle Anki cards; OB questions for node |
| **Output** | `card_canonical_entity_links`, `question_canonical_entity_links`, `supported_by_card` edges |
| **Automation** | Retarget from `card_knowledge_links`; `generate-legacy-retargeting-proposals.ts` |
| **Human** | Review ambiguous links |
| **Failure modes** | Linking to `curriculum_node` as permanent truth; broad-root card links |
| **Quality gate** | Links resolve to canonical entity; review_status tracked |

**Existing foundation:** `generate-legacy-retargeting-proposals.ts`, `apply-legacy-retargeting.ts`, `card_canonical_entity_links`

### K. Conflict detection

| Field | Detail |
|-------|--------|
| **Purpose** | Flag contradictions before publication |
| **Input** | All proposals for a neighborhood |
| **Output** | `conflict_report`: duplicate entities, contradictory L1 claims, incompatible DPs |
| **Automation** | Same entity + same claim_type + negated text; duplicate relationship edges |
| **Human** | Conflict reviewer resolves or marks `conflicted` |
| **Failure modes** | Silent overwrite; two approved contradictory L1 claims |
| **Quality gate** | Zero unresolved safety conflicts at publication |

### L. Quality scoring

| Field | Detail |
|-------|--------|
| **Purpose** | Score neighborhood maturity and dimension completeness |
| **Input** | Published + draft objects in neighborhood |
| **Output** | `quality_scorecard` per §11 metrics; maturity level assignment |
| **Automation** | `report-kg-canonical-coverage.ts` extensions; anatomy metrics |
| **Human** | Curator triages low scores |
| **Failure modes** | Scalar "percent complete" hiding missing DPs |
| **Quality gate** | Per-dimension scores; explicit gaps flagged |

### M. Human review

| Field | Detail |
|-------|--------|
| **Purpose** | Convert proposals to approved canonical truth |
| **Input** | Scored proposal packets |
| **Output** | Approved entities, relationships, claims, DPs with `review_status = approved` |
| **Automation** | Review queue UI / packet scripts — `review-kg-automation-packet.ts` |
| **Human** | **Primary owner** of this stage |
| **Failure modes** | Bulk approve without reading; safety content without attending |
| **Quality gate** | Role-appropriate approval (see §10) |

### N. Publication

| Field | Detail |
|-------|--------|
| **Purpose** | Make approved objects visible to product traversals |
| **Input** | Approved neighborhood at declared maturity |
| **Output** | `status = canonical` entities; `content_source = verified` claims; publication manifest |
| **Automation** | `apply-approved-kg-automation-proposals.ts`; publication gate script |
| **Human** | Publication reviewer sign-off |
| **Failure modes** | Publishing Level 2 as Level 5; draft leak to product API |
| **Quality gate** | Product-readiness gate met (§13); `public_draft_leak_rate = 0` |

### O. Monitoring / re-review

| Field | Detail |
|-------|--------|
| **Purpose** | Detect drift, stale content, orphan growth |
| **Input** | Published neighborhoods; usage signals (future) |
| **Output** | Stale review flags; orphan/overlinking alerts; re-review queue |
| **Automation** | Scheduled quality reports; 12-month safety L1 policy |
| **Human** | Curator re-review on stale or conflicted content |
| **Failure modes** | Published once, never checked again |
| **Quality gate** | Stale L1 safety content flagged within policy window |

---

## 5. Canonical Object Maturation Workflow

Map factory stages to [Knowledge Maturity Model](./canonical-knowledge-object-specification.md) levels.

| Level | Name | Factory stages involved | Exit criteria |
|-------|------|-------------------------|---------------|
| **0** | Source fragment | A (intake only) | Material in source packet; no canonical ID |
| **1** | Canonical identity established | B, C, D (+ M identity review) | Entity created; aliases; type/kind assigned; slug stable |
| **2** | Core relationships reviewed | E, I (partial), K, M (relationship review) | Core predicates approved; anatomy hubs stubbed |
| **3** | Educational assertions curated | F, J, M (claim review) | L1 claims approved; traps/pearls present; asset links started |
| **4** | Decision points verified | G, M (DP review) | Management DPs approved; safety-reviewed if emergent |
| **5** | Relationship neighborhood complete | E, I, H, L | Connection pattern satisfied; metadata on essential edges |
| **6** | Expert reviewed | M (attending/safety) | No unresolved conflicts; attending sign-off on L1 safety |
| **7** | Production ready | N, O, traversal smoke tests | Product gate passed; assets linked; monitoring scheduled |

### Progression example: ankle fracture

```
Level 0  OB node trauma-ankle-fractures + static Prepare topic + 12 Anki cards
         ↓ [A intake → B extract → C detect → D resolve]
Level 1  condition:ankle_fracture (clinical_kind=fracture) + Weber classification_system
         ↓ [E relationship proposals → I ankle anatomy hubs → M rel review]
Level 2  injured_in malleoli; has_classification Weber; involves_anatomy ankle ring
         ↓ [F claim proposals from static mustKnow + cards → M claim review]
Level 3  L1 mortise claim; board_trap isolated fibula; 8 cards linked
         ↓ [G DP proposal: unstable mortise → ORIF → M attending review]
Level 4  Operative indication DP approved; safety_criticality set
         ↓ [H metadata → I complete anatomy → L quality score]
Level 5  Fracture connection pattern complete; essential anatomy metadata 100%
         ↓ [M attending review → N publication gate]
Level 6  Attending approved for PGY-1 call
         ↓ [traversal smoke tests → O monitoring]
Level 7  Prepare/BroBot/OITE adapters can consume per §13 gates
```

### Non-linear progression (allowed)

- Emergency topics may reach **Level 4 (DPs)** before **Level 5 (full neighborhood)**
- Anatomy hubs may reach **Level 2** before clinical entities exist — **anatomy-first**
- Asset linking (part of Level 7) can begin at Level 3 for OITE pilots

### Factory rule

**No object publishes above its scored maturity level.** Publication (N) checks level explicitly — not subjective "looks done."

---

## 6. Relationship Generation Strategy

Relationships are the factory's highest-value output. This section defines discovery, proposal, validation, weighting, and review.

### 6.1 Discovery methods (in priority order)

| Method | Source | Proposes | Confidence |
|--------|--------|----------|------------|
| **Ontology connection patterns** | Vision Blueprint §9 / Anatomy Plan §9 | Expected edges per entity type | High (template) |
| **Rule-based extraction** | Static Prepare fields, entity type rules | `injured_in`, `has_classification`, `prerequisite_for` | Medium-high |
| **Anki/question co-occurrence** | Cards + OB questions on same topic | `supported_by_card`, co-mentioned anatomy | Medium |
| **Anatomy-first inference** | Anatomy hubs built first | `involves_anatomy` → refine to `injured_in`, `at_risk_in` | Medium |
| **Source co-occurrence** | OB topic cluster + card deck paths | Indirect relationship hints | Low-medium |
| **LLM proposal generation** | Evidence packets | Any registered predicate | Low — draft only |
| **Human reviewer authoring** | Expert input | Any edge + metadata | High after approval |

### 6.2 Proposal record shape (conceptual)

Each relationship proposal carries:

- `subject_entity_id`, `predicate`, `object_entity_id`
- `confidence`, `confidence_tier`, `evidence_summary`
- `source_signal_type`, `source_signal_ids[]`
- Metadata draft (§6.3)
- `review_status: generated`

Stored in `kg_automation_proposals` (`add_canonical_relationship`) today — extend metadata JSON as specs mature.

### 6.3 Relationship metadata (required for publication)

Per Vision Blueprint and factory weighting:

| Field | Assignment source |
|-------|-------------------|
| `relationship_strength` | Curator + automation template default |
| `clinical_importance` | Clinical reviewer |
| `educational_importance` | Education reviewer |
| `management_importance` | Derived from DP linkage |
| `board_relevance` | OB question count proxy + curator |
| `rotation_relevance` | Curriculum view context |
| `learner_stage_relevance` | PGY-1 default for call topics |
| `context_relevance` | call, clinic, or, oite |
| `frequency` | Card + question count proxy |
| `confidence` | Automation score → curator override |
| `evidence_quality` | Source type hierarchy |
| `provenance` | `ontology_provenance_records` |
| `review_status` | Review workflow |
| `display_priority` | Curator ordering within neighborhood |

**Anatomy-specific overlay** (from Anatomy Plan §7): `anatomy_role`, `relevance_reason`

### 6.4 Validation rules

| Rule | Enforcement |
|------|-------------|
| Predicate in registry | `kg-relationship-registry.ts` + DB CHECK |
| Subject/object type constraints | Registry `subjectEntityTypes` / `objectEntityTypes` |
| No duplicate active edge | Same subject + predicate + object |
| No region-bucket targets | Granularity check in anatomy enrichment |
| Directionality | Registry semantics + curator review |
| Safety edges require attending | `must_protect_during`, `at_risk_in` on nerves |

### 6.5 Review workflow for relationships

```
proposed (automation)
  → triaged (curator assigns priority)
  → in_review (relationship reviewer)
  → approved | rejected
  → applied to canonical_relationships (apply script)
```

**Never auto-approve:** `must_protect_during`, `indicates_treatment`, `indicated_for`, `prerequisite_for` on safety topics.

**May auto-approve (with audit):** `part_of`, `contains` within anatomy hierarchy at high confidence with human packet review.

### 6.6 Relationship factory outputs by pilot

**Ankle fracture neighborhood (target edges):**

| Predicate | Example |
|-----------|---------|
| `injured_in` | ankle fracture → lateral malleolus |
| `has_classification` | ankle fracture → Weber |
| `has_imaging_finding` | ankle fracture → medial clear space widening |
| `explains_instability` | deltoid rupture → ankle instability |
| `uses_fixation` | ankle fracture → ORIF |
| `has_complication` | ankle fracture → malunion |
| `prerequisite_for` | ankle ring → ankle fracture |
| `at_risk_structure` | ankle fracture → superficial peroneal nerve |
| `supported_by_card` | ankle fracture → linked cards |

---

## 7. Anatomy-First Enrichment Workflow

Anatomy is built **before** clinical relationships attach — per [Anatomy Ontology Plan](./anatomy-ontology-plan.md).

### 7.1 Pilot region sequence

| Order | Region | Anchor clinical topic |
|-------|--------|----------------------|
| 1 | **Ankle** | Ankle fracture |
| 2 | **Leg compartments** | Compartment syndrome |
| 3 | **Distal radius / wrist** | Distal radius fracture |
| 4 | **Hip** | Femoral neck fracture, THA |
| 5 | **Lumbar spine** | Cauda equina syndrome |

### 7.2 Per-region build phases

```
Phase A: Structure inventory (names, kinds, hierarchy level)
Phase B: Anatomy ↔ anatomy edges (part_of, articulates_with, contains, supplied_by)
Phase C: Clinical inbound edges (injured_in, at_risk_in, must_protect_during, prerequisite_for)
Phase D: Metadata pass (anatomy_role, relevance_reason, context)
Phase E: Anatomy claims (anatomy_pearl, red_flag on nerves/compartments/vessels)
Phase F: Asset links to anatomy hubs
Phase G: Quality audit (§12 anatomy metrics)
```

### 7.3 Anatomy hub creation

For ankle pilot, create hubs **before** ankle fracture clinical edges:

| Object | Kind | Level |
|--------|------|-------|
| Ankle ring | composite hub | structure |
| Lateral/medial malleolus | bone | structure |
| Talus | bone | structure |
| Syndesmosis | ligament | structure |
| Deltoid ligament | ligament | structure |
| Superficial peroneal nerve | nerve | structure |

### 7.4 Attaching anatomy to diagnoses / procedures

1. Resolve clinical entity (ankle fracture)
2. Query anatomy hub inventory for region
3. Propose edges with **specific predicates** — not `involves_anatomy` alone:
   - `injured_in` → malleoli
   - `explains_instability` → deltoid, syndesmosis
   - `at_risk_structure` → nerves
4. Assign anatomy metadata on each edge
5. Human reviewer caps essential edges (3–8 per diagnosis)

### 7.5 Overlinking prevention

| Control | Mechanism |
|---------|-----------|
| Essential cap | Max 8 essential anatomy edges per diagnosis |
| Role classification | Every edge must have `anatomy_role` |
| No region buckets | Reject "lower extremity" as target |
| One nerve hub | Median nerve is one object — not per-procedure copies |
| Overlinking metric | Flag objects where >50% edges lack `anatomy_role` |

### 7.6 Anatomy completeness scoring

Per Anatomy Plan §12:

- **Essential anatomy coverage** ≥90% on pilot clinical objects
- **Metadata completeness** 100% on essential edges
- **Orphan rate** <10% within pilot region
- **Display precision** ≥85% in traversal smoke tests

---

## 8. Claim and Decision Point Generation Strategy

### 8.1 Claim sources and decomposition

| Source | Extraction approach | Claim types expected |
|--------|---------------------|----------------------|
| **Static Prepare** | Decompose `mustKnowPoints`, `commonMistakes`, `pimpQuestions`, `anatomyFocus` into atomic assertions | fact, cognitive_trap, attending_pearl, anatomy_pearl |
| **Anki card clusters** | Group cards by entity; one card → one claim candidate max | fact, board_trap, anatomy_pearl |
| **Expert curation** | Direct authoring in review packet | any |
| **Source text** | Evidence packet phrases (not OB stems) | fact, mechanism |
| **LLM synthesis** | Atomicize multi-sentence drafts | draft only — all types |

### 8.2 Claim rules

| Rule | Requirement |
|------|-------------|
| **Atomicity** | One teachable assertion per claim |
| **Draft default** | `content_source = generated_draft` until reviewed |
| **Entity attachment** | Every claim has `primary_entity_id` |
| **Relationship linking** | Optional `linked_relationship_id` when claim explains an edge |
| **L1 cap** | ≤12 L1 claims per primary entity cluster |
| **Type discipline** | Management if/then → DP, not claim |

### 8.3 Decision point sources

| Source | DP patterns |
|--------|-------------|
| **Static Prepare** | `treatmentOptions`, operative vs nonoperative framing → `operative_indication`, `nonoperative_eligible` |
| **Expert curation** | Emergency pathways → `emergent_action` |
| **Classification logic** | Weber B + instability → `operative_indication` |
| **LLM synthesis** | Threshold extraction from static — **draft only** |

### 8.4 Decision point rules

| Rule | Requirement |
|------|-------------|
| **Structure** | If/then or threshold-based (trigger → action) |
| **Safety gate** | `safety_criticality >= high` → attending/safety reviewer |
| **Linkage** | `linked_decision_point_id` on supporting claims; DP references relationships |
| **No auto-publish** | All DPs require human approval |
| **Pattern type** | Enum: emergent_action, operative_indication, imaging_escalation, etc. |

### 8.5 Ankle pilot claim/DP targets

**Claims (minimum):**
- L1: mortise stability principle
- L1: NV exam before/after reduction
- cognitive_trap: isolated fibula fracture ≠ always stable
- imaging_point: medial clear space significance
- anatomy_pearl: ankle ring concept

**Decision points (minimum):**
- operative_indication: unstable mortise → operative fixation pathway
- Optional: syndesmotic injury → fixation decision modifier

---

## 9. Metadata and Weighting Workflow

Metadata is not decoration — it **controls traversal**.

### 9.1 Assignment pipeline

```
proxy signals (automated)
  → draft metadata on object/edge/claim
  → curator review
  → approved metadata
  → publication
  → product filter rules consume at traversal time
```

### 9.2 Automated proxy signals

| Signal | Metadata influenced |
|--------|---------------------|
| OB question count on topic | `board_relevance`, `frequency`, `exam_emphasis` |
| Anki card count on entity | `frequency`, `educational_importance` |
| Source co-occurrence density | `relationship_strength` draft |
| Static Prepare `importance` hints (if present) | `importance_level` draft |
| Entity type + clinical_kind | Default `context_relevance` template |
| Emergency condition flag | `safety_criticality`, `context_relevance` includes call |

### 9.3 Human-confirmed metadata

| Field | Owner |
|-------|-------|
| `clinical_importance` | Clinical reviewer |
| `educational_importance` | Education reviewer |
| `why_it_matters` | Curator / attending |
| `learner_stage` | Education reviewer |
| `anatomy_role` | Anatomy curator |
| `display_priority` | Curator |

### 9.4 Safety rules (automated flags, human confirm)

- `safety_criticality = emergency` on CS, CES, septic hip candidates
- `context_relevance` must include `call` for emergency objects
- L1 claims on safety topics → mandatory safety review queue

### 9.5 Product usage (future feedback loop)

Once adapters exist, `usage metadata` refines weighting:

- High traversal frequency → confirm `educational_importance`
- Low engagement on L1 claim → flag for curator re-review
- **Products never write metadata directly** — they emit usage signals to a separate analytics layer that proposes metadata updates

---

## 10. Review and Governance Workflow

### 10.1 Review queues

| Queue | Contents | Default reviewer |
|-------|----------|------------------|
| **Identity review** | New entities, merges, splits, aliases | Curator |
| **Relationship review** | `add_canonical_relationship` proposals | Curator + clinical reviewer |
| **Claim review** | All claim proposals | Curator + education reviewer |
| **Decision point review** | All DP proposals | Clinical reviewer |
| **Safety-critical review** | Emergency DPs, red flags, `must_protect_during` | Attending / safety reviewer |
| **Conflict review** | Contradictory claims, duplicate entities | Senior curator + attending |
| **Publication review** | Neighborhood maturity gate | Engineering reviewer + curator |

### 10.2 Reviewer roles

| Role | Authority |
|------|-----------|
| **Curator** | Identity, relationships, claim editing, metadata draft |
| **Resident reviewer** | Claim clarity, learner-stage appropriateness — cannot sole-approve safety |
| **Attending reviewer** | Safety-critical approval; L1 clinical accuracy sign-off |
| **Safety reviewer** | Emergency content; `safety_criticality >= high` |
| **Engineering reviewer** | Publication gate mechanics; no medical approval authority |

### 10.3 Approval rules

| Content | Auto-approve allowed? | Required approval |
|---------|----------------------|-------------------|
| Anatomy hierarchy `part_of` / `contains` (high confidence packet) | Batch with audit | Curator packet sign-off |
| `involves_anatomy` (general) | ❌ | Relationship reviewer |
| `must_protect_during`, `at_risk_in` | ❌ | Attending + relationship reviewer |
| Emergency DPs | ❌ | Attending / safety reviewer |
| L1 claims on safety topics | ❌ | Attending + safety reviewer |
| L2–L4 claims | ⚠️ Curator batch possible | Curator minimum |
| Asset links (card → entity) | ⚠️ High-confidence retarget only | Curator |
| LLM-generated anything | ❌ Never | Full human review |
| Publication to product API | ❌ | Publication gate (§13) |

### 10.4 Publication blockers

Publication (stage N) is blocked when:

- Any L1 claim is `generated_draft` or `unreviewed`
- Safety-critical DP lacks `safety_reviewed_at`
- Unresolved `conflict_count > 0` on neighborhood
- Maturity level below product gate (§13)
- `public_draft_leak_rate > 0` in smoke tests

### 10.5 Existing governance infrastructure

| Mechanism | Use in factory |
|-----------|----------------|
| `kg_automation_proposals.review_status` | Proposal workflow |
| `canonical_entities.review_status` | Entity approval |
| `canonical_relationships.review_status` | Edge approval |
| `ontology_provenance_records` | Source attachment |
| `ontology_governance_actions` | Merge/split/deprecate events |
| `review-kg-automation-packet.ts` | Packet-based review |
| `approve-kg-automation-packet.ts` | Batch approval |

---

## 11. Quality Scoring and Validation

### 11.1 Quality metrics

| Metric | Definition | Pilot target |
|--------|------------|--------------|
| **Canonical identity coverage** | % pilot topic sources with resolved canonical entity | 100% for pilot packet |
| **Relationship density** | Approved edges per clinical entity vs connection pattern | Pattern satisfied |
| **Anatomy completeness** | Essential anatomy coverage per §7 | ≥90% |
| **Metadata completeness** | % essential edges with full weighting | 100% essential; ≥80% overall |
| **Claim atomicity** | % claims passing single-assertion check | ≥95% |
| **Decision point coverage** | % pilot conditions with ≥1 approved DP | 100% for ankle, CS |
| **Provenance completeness** | % published assertions with provenance record | 100% |
| **Review completeness** | % L1 content with approved review | 100% |
| **Orphan rate** | Anatomy entities with zero clinical inbound edges | <10% in pilot region |
| **Duplicate rate** | Flagged duplicate entities per neighborhood | 0 unresolved |
| **Overlinking rate** | Clinical objects exceeding anatomy edge caps | <5% |
| **Traversal success rate** | Product smoke tests return expected essential neighbors | ≥85% precision |
| **Public draft leak rate** | Unapproved content in publication API responses | 0% |

### 11.2 Validation scripts / reports (to build)

| Report | Based on | New extensions |
|--------|----------|----------------|
| `report-kg-canonical-coverage.ts` | Exists | Per-neighborhood maturity, identity coverage |
| `report-kg-automation-proposals.ts` | Exists | Queue depth, approval latency |
| `report-next-gen-kg-proof-set.ts` | Exists | Pilot neighborhood diff vs proof seed |
| `report-legacy-retargeting-completion.ts` | Exists | Card/question entity link coverage |
| **`report-kg-neighborhood-quality.ts`** | **New spec** | All §11.1 metrics per pilot |
| **`report-kg-anatomy-quality.ts`** | **New spec** | Anatomy Plan §12 metrics |
| **`report-kg-traversal-smoke.ts`** | **New spec** | Prepare/BroBot/OITE traversal fixtures |
| **`report-kg-publication-gate.ts`** | **New spec** | Draft leak detection |
| `report-kg-blocked-node-prioritization.ts` | Exists | Inform scale phase — not pilot |

### 11.3 Scorecard output (per neighborhood)

```text
neighborhood: ankle_fracture
maturity_level: 6
dimensions:
  clinical_completeness: pass
  relationship_completeness: pass
  educational_completeness: pass
  reasoning_completeness: pass
  anatomical_completeness: pass (92% essential coverage)
  review_completeness: pass
  graph_completeness: pass
  asset_completeness: partial (8/12 cards linked)
blockers: []
ready_for: Prepare L5+, BroBot L2+, OITE L3+
```

---

## 12. Pilot Build Plan

### Pilot 1: Ankle knowledge neighborhood

**Why ankle first:** High PGY-1 call yield; 12 Anki cards already mapped; static Prepare topic exists; Vision Blueprint exemplar; CasePrep ORIF mapping exists; manageable anatomy scope.

**Scope inventory:**

| Layer | Objects |
|-------|---------|
| **Anatomy subgraph** | Ankle ring, lateral/medial malleolus, talus, syndesmosis, deltoid ligament, superficial peroneal nerve |
| **Clinical entities** | Ankle fracture (condition), Weber (classification_system), Weber A/B/C grades, medial clear space widening (imaging_finding), mortise stability (biomechanics_concept), ORIF (fixation_method/procedure), malunion/PTLD (complications) |
| **Relationships** | Per §6.6 + anatomy plan examples |
| **Claims** | 5–12 L1/L2; traps, imaging, anatomy pearls |
| **Decision points** | Unstable mortise → operative fixation |
| **Assets** | 12 Anki cards; OB questions on `trauma-ankle-fractures` |
| **Metadata** | Full weighting on essential edges |
| **Review** | Curator + attending sign-off |
| **Validation** | Traversal smoke tests for Prepare, BroBot, OITE patterns |

**Source packet (KF-007):**
- `curriculum_nodes` slug: `trauma-ankle-fractures`
- Static Prepare: `ankle-fracture`
- CasePrep bridge: `ankle-fracture-orif`
- Anki cards: 12 applied links
- OB questions: all mapped to node

### Pilot 2: Compartment syndrome + leg compartments

**Why second:** Anatomy *is* the diagnosis; tests anatomy-first workflow for compartments; emergency DP with safety gate; links tibial shaft fracture.

**Scope:**
- Anterior, lateral, deep posterior, superficial posterior compartments
- Compartment syndrome condition
- Tibial shaft fracture (related)
- Fasciotomy procedure
- Emergency DPs, red-flag claims, `compressed_in` edges

### Pilot 3: Distal radius / wrist

**Why third:** NV risk (median nerve), DRUJ instability, volar approach anatomy — tests nerve hub model and procedure anatomy from Anatomy Plan §10.1.

**Scope:**
- Distal radius, DRUJ, median nerve, volar interval
- Distal radius fracture, CTS (compression)
- Volar approach, volar plating
- NV exam claims, DRUJ trap, fixation DP

### Pilot sequencing rationale

| Pilot | Proves |
|-------|--------|
| Ankle | Full factory pipeline on high-yield trauma; classification + instability + fixation |
| Compartment | Anatomy-first emergency; compartment ontology; safety review gate |
| Distal radius | Nerve hub; procedure `must_protect_during`; static Prepare decomposition |

---

## 13. Product-Readiness Gates

Products do not consume the KG today. These gates define **when they may** — without implementing adapters in this document.

| Product | Minimum maturity | Additional requirements |
|---------|------------------|------------------------|
| **BroBot** | Level 2+ per entity | Approved core relationships; provenance gate; no draft claims in neighbor traversal |
| **Prepare (public topic display)** | Level 5+ per primary entity | Connection pattern complete; L1 claims approved; metadata complete on essential edges |
| **Prepare (call emergency topics)** | Level 4+ DPs + Level 6 safety review | Emergency DPs approved; red flags present |
| **CasePrep** | Level 4+ DPs for procedure logic | `must_protect_during` anatomy approved; operative pearls as claims |
| **OITE** | Level 3+ with board traps | Board-trap claims; question/card asset links |
| **Adaptive reinforcement** | Level 3+ on missed-assertion objects | Prerequisite chains; linked cards |

### Publication API rules (conceptual)

```
GET /kg/neighborhood/{entity_id}
  → only objects at or above requesting product's gate
  → only review_status = approved
  → only content_source = verified (claims/DPs)
  → never return generated_draft
```

### Bridge requirement

Before any product consumes KG, **`prepare_topic_bridges`** (or equivalent) must map:

```
static topicId "ankle-fracture" → primary_entity_id + curriculum_view_id
```

Prepare continues using static fallback when bridge missing (per audit recommendation).

---

## 14. Implementation Roadmap

### Phase A — Factory definitions and specs (4–6 weeks)

| Deliverable | Details |
|-------------|---------|
| Source inventory doc | §3 frozen |
| Pipeline stage specs | §4 per-stage I/O contracts |
| Review queue model | §10 operationalized |
| Relationship proposal spec | §6 |
| Claim/DP proposal spec | §8 |
| Anatomy enrichment spec | §7 |
| Quality scoring spec | §11 |

**Dependencies:** Vision Blueprint, Canonical Object Spec, Anatomy Plan  
**Success metrics:** Engineering can write tickets without ontology ambiguity  
**Risks:** Specs drift from vision — cross-review required  
**Do not do yet:** Schema changes, product adapters, bulk ingestion

### Phase B — Schema / migration design (4–6 weeks, overlaps A)

| Deliverable | Details |
|-------------|---------|
| `educational_claims` table design | Per ontology plan appendix |
| `decision_points` table design | Per ontology plan appendix |
| Relationship metadata columns | §6.3 fields |
| Anatomy metadata extension | `anatomy_role`, `relevance_reason` |
| Maturity level on entities | `metadata.maturity_level` |
| Publication gate views | Approved-only filters |

**Dependencies:** Phase A specs  
**Success metrics:** Migration design review approved; no prod apply until Phase D  
**Risks:** Schema creep — stay additive  
**Do not do yet:** Prod migration apply; product reads

### Phase C — Quality report baseline (2–4 weeks)

| Deliverable | Details |
|-------------|---------|
| `report-kg-neighborhood-quality.ts` spec + script | §11.2 |
| `report-kg-anatomy-quality.ts` | Anatomy metrics |
| Baseline metrics on current 41 entities | Pre-pilot snapshot |

**Dependencies:** Phase A metrics definitions  
**Success metrics:** Baseline report runs in CI  
**Do not do yet:** Publication gate; traversal smoke tests

### Phase D — Ankle pilot (6–8 weeks)

| Deliverable | Details |
|-------------|---------|
| KF-007–KF-013 executed | Full ankle neighborhood |
| Level 6 maturity achieved | Per scorecard |
| Traversal smoke tests pass | ≥85% precision |

**Dependencies:** Phases A–C; schema applied to staging  
**Success metrics:** Ankle neighborhood scorecard all pass; 0 draft leaks  
**Risks:** Curator bandwidth; attending review latency  
**Do not do yet:** Prepare KG cutover; other regions

### Phase E — Compartment / leg compartment pilot (4–6 weeks)

| Deliverable | Details |
|-------------|---------|
| KF-014 executed | CS + 4 compartments |
| Safety review gate proven | Emergency DP workflow |

**Dependencies:** Phase D factory workflow validated  
**Success metrics:** CS at Level 6 with safety sign-off

### Phase F — Distal radius / wrist pilot (4–6 weeks)

| Deliverable | Details |
|-------------|---------|
| KF-015 executed | DR + nerve hub |
| Procedure anatomy validated | `must_protect_during` workflow |

**Dependencies:** Phase E  
**Success metrics:** DR neighborhood Level 6

### Phase G — Product read adapter pilot (4–6 weeks)

| Deliverable | Details |
|-------------|---------|
| Read-only KG API | Neighborhood traversal for 3 pilots |
| `prepare_topic_bridges` for 3 topics | Bridge static → canonical |
| LearningContext assembler (spec + pilot) | References only — no content copy |
| BroBot neighbor traversal (pilot) | Level 2+ gate |

**Dependencies:** Phases D–F at Level 5+  
**Success metrics:** Prepare can render ankle topic from KG on staging with static fallback  
**Do not do yet:** Full Prepare migration; write paths

### Phase H — Scale to 20 graph-complete topics (3–6 months)

| Deliverable | Details |
|-------------|---------|
| 17 additional neighborhoods | Per ontology plan topic list |
| Factory throughput | 2–3 topics/month with curator team |
| Automation assist | LLM proposals scaled — review still human |

**Dependencies:** Phase G proves adapter pattern  
**Success metrics:** 20 topics at Level 5+; 10 at Level 6+  
**Do not do yet:** 752-node sprint; fellowship L4 before safety L1

---

## 15. First 15 Implementation Tickets

| # | Ticket | Output | Phase |
|---|--------|--------|-------|
| **KF-001** | Source inventory and classification | §3 frozen as operational reference | A |
| **KF-002** | Pipeline stage definitions and I/O contracts | §4 stage spec doc | A |
| **KF-003** | Review queue and governance model | §10 operational spec + queue schema design | A |
| **KF-004** | Relationship proposal design | §6 proposal record + validation rules + registry delta | A |
| **KF-005** | Anatomy enrichment workflow design | §7 + Anatomy Plan integration spec | A |
| **KF-006** | Quality scoring and report spec | §11 metrics + script specs | A/C |
| **KF-007** | Ankle source packet assembly | Manifest: OB node, 12 cards, static Prepare, questions | D |
| **KF-008** | Ankle canonical entities | Identity resolution for anatomy + clinical objects | D |
| **KF-009** | Ankle relationship proposals | Anatomy subgraph + clinical edges + metadata drafts | D |
| **KF-010** | Ankle claims/DP proposals | Decomposed static content + card clusters → proposals | D |
| **KF-011** | Ankle review packet | Curator + attending review workflow execution | D |
| **KF-012** | Ankle publication gate | Level 6 sign-off; approved-only manifest | D |
| **KF-013** | Traversal smoke tests | Prepare/BroBot/OITE fixtures for ankle | D/G |
| **KF-014** | Compartment syndrome source packet + build | CS + leg compartments pilot | E |
| **KF-015** | Distal radius / wrist source packet + build | DR + nerve hub pilot | F |

### Ticket dependency graph

```
KF-001 ──┬──► KF-002 ──► KF-007 ──► KF-008 ──► KF-009 ──► KF-010 ──► KF-011 ──► KF-012 ──► KF-013
         ├──► KF-003
         ├──► KF-004 ──► KF-009
         ├──► KF-005 ──► KF-009
         └──► KF-006 ──► KF-012, KF-013

KF-012 (ankle published) ──► KF-014 ──► KF-015
```

---

## 16. What Not to Build Yet

| Do not build | Why |
|--------------|-----|
| **Full 752-node sprint** | 711/752 nodes blocked; factory unproven at pilot scale |
| **Fully autonomous LLM curation** | Safety risk; violates automation-proposes principle |
| **Product-wide KG Prepare cutover** | Zero product reads today; need adapter pilot first |
| **Vector search / embeddings** | No traversal foundation yet; adds noise |
| **Visual graph explorer** | Curation throughput matters more than visualization |
| **Fellowship L4 content** | Before safety L1 complete on pilots |
| **New source ingestion (textbooks)** | Before pilot workflow works end-to-end |
| **Product writes into canonical KG** | Products are readers; factory + curators are writers |
| **`concepts` table population** | Superseded by claims + entities per roadmap |
| **Case module table** | Defer until ankle/DR procedure pilots prove claim/DP model |
| **Broad Anki remapping** | 3,772 unmapped cards — address after retarget pattern proven on pilots |
| **Auto-apply safety DPs** | Never |

---

## 17. Final Recommendation

**The next step is not broad ingestion.**

SnapOrtho has a working mapping factory — 7,557 questions mapped, 1,111 cards linked, proposal infrastructure in `kg_automation_proposals`, and a relationship registry defining 25+ predicates. What it lacks is a **proven path from those signals to mature canonical neighborhoods** that products can traverse.

**The next step is one complete, reviewed, traversable ankle neighborhood.**

Execute KF-007 through KF-013:

1. Assemble the ankle source packet from Orthobullets node, 12 Anki cards, and static Prepare content
2. Resolve canonical identities for anatomy hubs and clinical entities
3. Propose and review relationships — anatomy-first, weighted, metadata-complete
4. Decompose static content into atomic claim and DP proposals — drafts reviewed, never auto-published
5. Link assets; score quality; pass publication gate at Level 6
6. Run traversal smoke tests proving Prepare, BroBot, and OITE patterns can assemble `LearningContext` from references

When ankle passes, repeat the **same factory workflow** for compartment syndrome (anatomy-as-diagnosis) and distal radius (nerve hub + procedure anatomy). Only then scale toward 20 topics and product adapter pilots.

The ontology dictates the pipeline. The factory builds neighborhoods. Products traverse the graph.

**Quality before quantity. One perfect ankle neighborhood proves the system.**

---

## Related Documents

| Document | Role in factory |
|----------|-----------------|
| [Vision Blueprint](./kg-orthopaedic-education-ontology-plan-2026-07-05.md) | Network philosophy, connection patterns, traversal |
| [Canonical Object Spec](./canonical-knowledge-object-specification.md) | Object anatomy, maturity model |
| [Anatomy Ontology Plan](./anatomy-ontology-plan.md) | Anatomy-first enrichment, metrics |
| [KG Excellence Roadmap](./kg-excellence-roadmap-2026-07-05.md) | Curriculum reference model, strategic phases |
| [Prepare Readiness Audit](../audits/kg-prepare-readiness-audit-2026-07-05.md) | Current-state gaps, bridge recommendation |

## Existing Infrastructure Reference

| Category | Key paths |
|----------|-----------|
| Migrations | `supabase/migrations/20260628_*_kg_*.sql` |
| Registry | `scripts/lib/education/kg-relationship-registry.ts` |
| Proposals | `scripts/generate-kg-automation-proposals.ts`, `apply-approved-kg-automation-proposals.ts` |
| Mapping | `scripts/map-anki-to-kg.ts`, `scripts/lib/education/kg-canonical-mapping.ts` |
| Reports | `scripts/report-kg-canonical-coverage.ts`, `reports/anki-kg-mapping-v1-report.md` |
| Static Prepare | `src/lib/student-curriculum/curriculum-data.ts` |

---

*Planning document only. Defines the Knowledge Factory build workflow. Implementation follows.*