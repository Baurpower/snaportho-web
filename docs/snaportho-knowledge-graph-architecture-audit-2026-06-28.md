# SnapOrtho Knowledge Graph Architecture Audit

Date: 2026-06-28

## Executive Summary

SnapOrtho has made strong early architectural choices:

- it separated canonical ontology from external sources
- it preserved source-native Anki and Orthobullets data instead of flattening them into one table
- it introduced aliases, provenance-aware imports, deterministic mapping, and non-destructive review ledgers
- it resisted storing copyrighted Orthobullets question content

Those are the right instincts.

The current system is not yet a full long-term educational knowledge graph. It is a promising ontology-and-mapping foundation centered on:

- `specialties`
- `curriculum_nodes`
- `learning_objectives`
- `concepts`
- source-specific educational objects
- mapping/review tables

That foundation is directionally correct, but several core assumptions will become limiting if they harden:

1. The graph currently treats `concepts` as the canonical destination for nearly everything, but many future entities are not concepts.
2. `curriculum_nodes` are carrying too much semantic weight. They currently function as hierarchy, topic ontology, and sometimes proto-concepts.
3. The graph lacks first-class relationship modeling between canonical knowledge entities.
4. Provenance is attached mainly to imported objects and mappings, not to atomic claims or canonical edges.
5. Questions, procedures, articles, references, guidelines, and educational modules are not yet modeled as first-class educational objects inside the canonical layer.
6. A second curriculum model already exists in `src/lib/student-curriculum`, which is a warning sign that the knowledge graph is not yet the true system of record.

Bottom line:

- Keep the current foundation.
- Do not scale the current ontology unchanged to hundreds of thousands of nodes.
- Before major expansion, introduce a multi-layer model: domain knowledge layer, curriculum layer, educational object layer, and evidence/provenance layer.

## What Exists Today

Based on the current repo, the graph already includes:

- canonical taxonomy tables: `specialties`, `curriculum_nodes`, `learning_objectives`, `concepts`
- alias tables: `concept_aliases`, `curriculum_node_aliases`, `source_aliases`
- source registry: `external_sources`
- orthogonal tags: `tags`, `tag_assignments`
- external metadata objects: `external_questions`, `external_question_curriculum_mappings`
- Anki ingest objects: `anki_*`, `canonical_cards`, `canonical_card_versions`
- educational review/mapping objects: `card_quality_reviews`, `card_training_level_links`, `card_knowledge_links`, `anki_kg_mapping_runs`, `anki_kg_mapping_candidates`, `anki_kg_review_actions`

Practical state from current reports:

- Anki import is structurally healthy for 5,095 cards
- deterministic Anki mapping currently covers 21.8%
- Orthobullets import created 7,557 external question rows and 752 accepted curriculum nodes
- Orthobullets topic import created curriculum coverage, but not concept coverage

## Strengths

- Clear separation between canonical ontology and source-native imports.
- Non-destructive design with versioning and review ledgers.
- Strong legal boundary around Orthobullets metadata-only ingestion.
- Good alias strategy for deterministic matching.
- Explicit review workflow instead of silent auto-overwrite.
- Canonical card registry is a sound abstraction over raw Anki objects.
- Current schema is simple enough to evolve without major replatforming.

## Weaknesses

- The graph is still mostly a tree plus mapping tables, not a richly connected graph.
- `curriculum_nodes` are overused as both instructional structure and topic ontology.
- `concepts` are under-modeled for future educational and clinical use.
- There are almost no first-class canonical relationships between domain entities.
- There is no first-class procedure, disease, anatomy structure, implant, complication, imaging finding, or classification entity model.
- Provenance is not granular enough for future evidence-backed AI reasoning.
- Review workflows are strong for Anki mapping but weak for ontology governance.
- Student curriculum content already lives outside the graph in hardcoded TS data.

## Incorrect Assumptions To Challenge Now

### 1. "Everything external eventually attaches to concepts"

This is too aggressive.

Cards and questions can attach to concepts, but procedures, diseases, anatomy structures, curriculum objectives, guidelines, articles, and claims should not all be reduced to concepts. Many should attach to multiple canonical entity types.

### 2. "Curriculum is the canonical spine of the knowledge graph"

Curriculum is important, but it should be an overlay on top of knowledge, not the sole organizing truth. A five-year graph must survive:

- curriculum redesigns
- country-specific board differences
- medical student vs resident vs attending views
- multi-specialty expansion

If curriculum is the ontology backbone, every educational revision becomes a knowledge-model migration.

### 3. "Topics can safely become curriculum nodes first and concepts later"

This is acceptable as a temporary import strategy, but dangerous as a long-term ontology pattern. It creates a blurred boundary between:

- curricular buckets
- domain entities
- learning units

That blur will make splitting, merging, and AI reasoning harder later.

### 4. "Alias infrastructure is enough to absorb ontology ambiguity"

Aliases help name resolution. They do not solve modeling ambiguity such as:

- ACL tear as disease vs topic vs case focus
- reverse shoulder arthroplasty as procedure vs module vs technique
- Vancouver classification as concept vs classification system vs topic cluster

### 5. "Questions and cards are just different inputs to the same mapping layer"

They are not.

Cards usually test atomic recall or compact synthesis.
Questions test reasoning, distractor discrimination, clinical framing, and error patterns.

They need partially overlapping but distinct models.

## Revised Canonical Model

SnapOrtho should move toward four explicit layers.

### 1. Domain Knowledge Layer

This is the enduring clinical ontology.

First-class entity families should include:

- condition or diagnosis
- procedure
- anatomy structure
- imaging finding
- classification system
- implant or device
- complication
- indication
- contraindication
- biomechanics concept
- pathophysiology concept
- examination maneuver
- outcome measure
- medication or perioperative intervention
- general educational concept or fact when no richer type exists

`concept` should remain, but as a broad superclass or fallback bucket, not the only durable node type.

### 2. Curriculum Layer

This is the pedagogic overlay.

It should include:

- curriculum frameworks
- curriculum nodes
- milestones
- board objectives
- rotation objectives
- learning objectives
- training-level expectations
- prerequisite paths

This layer references domain entities. It should not define them.

### 3. Educational Object Layer

These are teachable assets and learner-facing artifacts.

First-class objects should include:

- flashcards
- question items
- articles
- videos
- cases
- procedure modules
- anatomy modules
- guidelines
- literature references
- BroBot conversations or answer artifacts when worth preserving

These objects connect to both domain entities and curriculum objects.

### 4. Evidence And Provenance Layer

This tracks where facts and mappings came from.

It should support provenance for:

- node assertions
- relationship assertions
- educational-object mappings
- claims
- extracted facts
- review decisions

## What The Primary Entity Should Be

There should not be one single primary entity.

Recommended first-class canonical entities:

- domain entity
- curriculum entity
- educational object
- source artifact
- claim or fact assertion

If one canonical anchor is needed philosophically, it should be:

- the domain knowledge layer

not:

- curriculum nodes
- cards
- questions
- source systems

## Ontology Audit

### Current entities that are sound

- `specialties`
- `external_sources`
- `canonical_cards`
- `canonical_card_versions`
- alias tables
- review ledgers

### Current entities that are directionally right but overloaded

- `curriculum_nodes`
- `learning_objectives`
- `concepts`
- `card_knowledge_links`
- `external_question_curriculum_mappings`

### Missing first-class entities

P0 missing:

- canonical relationships table
- question item entity model beyond `external_questions`
- procedure entity model
- anatomy entity model
- condition or diagnosis entity model
- classification system entity model
- evidence or claim provenance model

P1 missing:

- article or document entity model
- guideline entity model
- literature citation model
- case module entity model
- educational objective framework model
- competency or milestone model

P2 missing:

- distractor model
- reasoning-pattern model
- misconception or common-error model
- clinical pearl or pitfall model
- multilingual or locale-specific labeling model

### What should likely be renamed

- `concepts` should eventually become either:
  - a generic superclass table, or
  - `knowledge_entities` with subtype handling
- `external_question_curriculum_mappings` should not remain the dominant question mapping abstraction once canonical question items exist

### What should never exist as canonical truth

- source-specific topic buckets as permanent ontology
- Anki deck hierarchy as canonical curriculum
- Orthobullets topic labels as canonical topic definitions
- tags used as a substitute for typed relationships

## Relationship Audit

This is the biggest architectural gap.

Today, the system mostly captures:

- source object -> curriculum node
- card -> curriculum/concept
- question -> curriculum/concept
- alias -> entity

It does not yet model the graph edges that make the knowledge graph valuable.

### P0 edge families to add

- entity -> entity typed relationships
- curriculum -> domain entity coverage relationships
- educational object -> domain entity coverage relationships
- educational object -> educational object relationships

### Minimum typed domain relationships

- condition -> anatomy
- condition -> imaging finding
- condition -> classification system
- condition -> indication
- condition -> contraindication
- condition -> complication
- condition -> procedure
- procedure -> anatomy
- procedure -> approach
- procedure -> implant
- procedure -> indication
- procedure -> contraindication
- procedure -> complication
- procedure -> postoperative protocol
- anatomy -> related anatomy
- classification system -> condition
- imaging finding -> condition
- biomechanics concept -> procedure
- biomechanics concept -> implant
- concept -> prerequisite concept
- concept -> common pitfall
- concept -> clinical pearl

### Educational relationships to add

- question -> tested entity
- question -> primary learning objective
- question -> reasoning pattern
- question -> common misconception
- question -> board relevance
- card -> primary entity
- card -> secondary entity
- article -> discusses entity
- guideline -> supports or constrains entity/edge
- case -> exemplifies entity
- curriculum node -> teaches entity
- curriculum node -> prerequisite curriculum node
- training level -> expected proficiency for entity

### Relationship modeling recommendation

Add a canonical relationship model with:

- subject entity type and id
- predicate type
- object entity type and id
- relationship status
- confidence
- provenance
- validity window
- replacement or superseded-by support

Without this, SnapOrtho will have many nodes but weak graph intelligence.

## Curriculum Architecture

Curriculum should exist independently from concepts and other domain entities.

Recommended model:

`Domain knowledge` -> `Curriculum frameworks` -> `Learning objectives` -> `Educational objects`

Not:

`Curriculum node` as the universal parent of everything

Reason:

- curriculum changes faster than domain knowledge
- one domain entity belongs to multiple curricula
- different learner levels need different sequencing over the same knowledge base

The existing hardcoded student curriculum in [`src/lib/student-curriculum/curriculum-data.ts`](/Volumes/PS3000/snaportho_dev/snaportho-web/src/lib/student-curriculum/curriculum-data.ts:1) is evidence that curriculum is already becoming a parallel system. That should be migrated conceptually into the graph as a curriculum overlay, not duplicated indefinitely.

## Educational Object Audit

All future educational objects should be first-class.

Recommended educational object categories:

- flashcard
- question item
- article
- video
- case module
- procedure module
- anatomy module
- guideline summary
- literature reference
- AI-generated draft artifact

They should not all connect directly only to `concepts`.

Recommended attachment pattern:

- primary domain entities
- optional curriculum objectives
- optional source artifacts
- optional evidence claims

This allows:

- the same question to test multiple entities
- the same card to support a specific learning objective
- the same procedure module to span anatomy, indications, technique, and complications

## Source And Provenance Architecture

The current source registry is good, but provenance needs another layer of precision.

### Provenance should attach to all of the following

- nodes
- relationships
- educational objects
- mappings
- claims
- review actions

### Recommended provenance model

At minimum, every assertion should support:

- source system
- source artifact id
- source artifact type
- extraction or import method
- reviewer status
- confidence
- timestamp
- notes

Longer term, distinguish:

- `source artifact`
- `claim`
- `assertion`
- `review decision`

Example:

- Orthobullets question metadata is a source artifact
- "Question X tests ACL tear management" is an assertion
- "ACL tear often requires MRI when diagnosis remains uncertain" is a claim
- "Reviewed and approved by attending reviewer" is a review decision

## Orthobullets Integration Audit

Current assessment:

- as a source system, the integration is disciplined
- as a first-class ontology layer, it should not be promoted

What is working:

- metadata-only import
- specialty/topic normalization
- source alias preservation
- conservative mapping strategy
- review artifact generation

What is risky:

- accepted Orthobullets topics became 752 new curriculum nodes immediately
- concept enrichment remains entirely deferred
- no distinction yet between source topic bucket and canonical clinical entity

Recommendation:

- Orthobullets should remain a source, not a first-class ontology layer
- its topics can seed review queues, draft curriculum nodes, and alias candidates
- they should not silently become stable canonical knowledge entities without domain-level review

## Anki Integration Audit

Current Anki architecture is one of the strongest parts of the system.

What is correct:

- read-only source ownership boundary
- canonical card registry
- versioning
- preservation of note, card, tag, deck, and media metadata
- deterministic mapping layer
- review ledger

What needs adjustment:

- cards should map to domain entities and learning objectives, not mostly curriculum nodes
- deck strategy and tag strategy should remain source metadata, not ontology truth
- canonical cards should be portable beyond Anki as educational objects

Recommended canonical attachment:

- primary link: card -> domain entity or entities
- secondary link: card -> learning objective
- optional overlay: card -> curriculum node

That ordering better survives curriculum changes and multi-product reuse.

## Question Architecture Audit

Questions must become first-class canonical educational objects.

The current `external_questions` model is intentionally narrow and legally safe, but it is not sufficient as the long-term question model.

Canonical question modeling should support:

- source item identity
- question type
- tested entities
- primary learning objective
- reasoning pattern
- distractor themes
- difficulty
- board relevance
- training-level fit
- clinical context
- common mistakes
- provenance and review state

Even if source text cannot be stored for some sources, SnapOrtho still needs a canonical question-item abstraction for:

- internal questions
- ROCK
- board-style authored questions
- AI-generated reviewed questions

## Review Workflow Recommendations

The current Anki review workflow is solid but too narrow.

Separate review tracks should exist for:

- ontology node creation
- ontology merges and splits
- typed relationship approval
- alias approval
- curriculum alignment
- educational object quality
- question psychometrics and educational quality
- difficulty and training-level calibration
- source ingestion anomalies
- claim/evidence verification

### Review responsibility split

Automatic:

- schema validation
- duplicate detection
- deterministic alias normalization
- source anomaly detection
- conflict detection

AI-assisted:

- candidate mappings
- duplicate clustering
- split or merge suggestions
- prerequisite suggestions
- topic decomposition suggestions
- coverage gap detection

Human-reviewed:

- canonical node creation
- high-impact relationships
- question educational quality
- curriculum frameworks
- published learning objectives

Consensus-reviewed:

- ontology-breaking merges/splits
- curriculum redesigns
- new source integration rules
- major procedure or diagnosis modeling decisions

## Knowledge Lifecycle

Recommended lifecycle:

1. Source artifact or editorial need discovered
2. Candidate domain entity or educational object proposed
3. Duplicate and alias resolution
4. Canonical entity created in draft state
5. Typed relationships proposed
6. Curriculum overlays attached
7. Educational objects mapped
8. Claims and provenance attached
9. Human review and certification
10. Version published
11. Downstream AI and product use enabled
12. Deprecation, merge, split, or replacement handled non-destructively

Today, SnapOrtho is strongest at steps 1, 2, 7, and 9 for Anki mappings, but weak at 4 through 6 for the broader ontology.

## Versioning Strategy

Current card versioning is good. Canonical ontology versioning is not yet mature enough.

The graph should support:

- node version status
- merge history
- split history
- renamed labels
- superseded relationships
- deprecated curriculum alignments
- stable public ids that survive rename and merge

Do not rely on mutable slugs as the long-term external contract.

Recommended rule:

- IDs are permanent
- labels and slugs are mutable metadata
- merges and splits create explicit lineage records

Without lineage, downstream Anki mappings, APIs, and AI evaluation will break or drift silently.

## AI Readiness Assessment

Current state: partially ready, not fully ready.

Ready enough for:

- deterministic mapping
- lightweight curriculum lookup
- initial BroBot context assembly
- basic semantic retrieval scaffolding

Not yet ready for:

- robust graph traversal reasoning
- evidence-grounded tutoring
- adaptive knowledge tracing
- question generation with explicit competency coverage
- flashcard generation with reliable prerequisite logic
- learning path generation across training levels

Main AI gaps:

- no typed canonical relationships
- no prerequisite graph
- no misconception model
- no evidence-backed assertion layer
- no canonical procedure/question/article entities

## Scalability Assessment

The current architecture can likely scale operationally to large row counts.

The bigger issue is semantic scalability, not database throughput.

At 100k flashcards and 50k questions, the current model will struggle because:

- too many things map only to curriculum nodes
- concept granularity is not consistently governed
- source-topic drift will create ontology sprawl
- missing relationship types will force products to rebuild logic outside the graph

This is exactly how duplicate parallel systems emerge.

## Governance Model

Recommended ownership:

- ontology council: approves canonical entity types, merges, splits, and relationship taxonomy
- curriculum editors: own frameworks, learning objectives, milestones, and sequencing
- content editors: own cards, questions, modules, and educational quality
- source integration owner: owns import contracts and provenance rules
- AI/retrieval owner: owns downstream reasoning use of certified graph state

Breaking-change policy:

- no destructive deletions of widely referenced canonical entities
- deprecate first
- attach replacement ids
- migrate downstream mappings in staged workflows
- maintain audit trails for all high-impact changes

## Five-Year Vision

The finished SnapOrtho knowledge graph should become:

- the canonical orthopaedic domain model
- the curriculum engine for multiple learner tracks
- the mapping layer across cards, questions, cases, procedures, and articles
- the provenance layer for evidence-backed tutoring
- the reasoning substrate for BroBot, CasePrep, semantic search, and adaptive learning

It should be able to answer:

- what this learner should study next
- why this question was missed
- which procedure concepts are weak
- which cards reinforce the same misconception
- which evidence supports a given recommendation
- which curriculum pathways differ by level, role, or country

## Prioritized Gap Analysis

### P0: Must fix before major expansion

1. Separate domain ontology from curriculum overlay more explicitly.
   Educational value: very high
   Architectural importance: very high
   Complexity: medium

2. Add a first-class typed relationship model.
   Educational value: very high
   Architectural importance: very high
   Complexity: medium

3. Introduce first-class canonical entities for procedures, conditions, anatomy, and classification systems.
   Educational value: very high
   Architectural importance: very high
   Complexity: high

4. Stop treating newly imported source topics as effectively canonical without stronger review semantics.
   Educational value: high
   Architectural importance: very high
   Complexity: low

5. Create ontology lineage support for merge, split, rename, replacement, and deprecation.
   Educational value: high
   Architectural importance: very high
   Complexity: medium

6. Design granular provenance for nodes, edges, and claims.
   Educational value: high
   Architectural importance: high
   Complexity: medium

7. Plan migration of the hardcoded student curriculum model into the graph-aligned curriculum overlay.
   Educational value: high
   Architectural importance: high
   Complexity: medium

### P1: Important near-term additions

1. Introduce canonical question-item abstraction separate from source metadata.
2. Introduce article, guideline, literature, and case-module entity models.
3. Add prerequisite, pearl, pitfall, and misconception relationship types.
4. Add competency, milestone, and board-objective overlay models.
5. Add formal ontology review workflow, not just mapping review workflow.

### P2: Valuable future improvements

1. Add claim-level evidence graph and support scoring.
2. Add psychometric and distractor modeling for questions.
3. Add cross-specialty and multi-country curriculum frameworks.
4. Add user-level mastery and knowledge-tracing integration against canonical entities.

## Recommended Near-Term Architecture

Keep the current tables, but evolve toward this structure:

1. Preserve `external_sources`, Anki ingest, Orthobullets ingest, review ledgers, and current alias infrastructure.
2. Reposition `curriculum_nodes` as curriculum overlay objects, not the dominant canonical knowledge entity.
3. Expand the canonical domain layer beyond `concepts`.
4. Introduce typed canonical relationships with provenance.
5. Add first-class educational objects for questions, procedures, articles, cases, and modules.
6. Add lineage and governance before massive ontology growth.

## Final Call

The current SnapOrtho graph is a good foundation, but it is not yet the correct final ontology for five-year expansion.

It is safe to continue limited growth on top of it if the next phase is architectural strengthening.

It is not safe to scale this exact model naively to:

- hundreds of thousands of educational objects
- multi-product reasoning
- adaptive learning
- evidence-grounded AI tutoring

The highest-leverage next move is not more imports.

It is clarifying the ontology into:

- domain entities
- curriculum overlays
- educational objects
- evidence and provenance assertions

That keeps the current work valuable while preventing the graph from ossifying around curriculum buckets and source-topic artifacts.
