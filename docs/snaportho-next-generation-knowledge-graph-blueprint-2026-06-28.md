# SnapOrtho Next-Generation Knowledge Graph Blueprint

Date: 2026-06-28

## Executive Summary

SnapOrtho should strengthen and evolve the current graph, not replace it.

The current implementation is operationally strong:

- deterministic ingestion exists
- source-native identities are preserved
- canonical card/version identity exists
- aliases and source labels are captured
- mapping runs and review ledgers are auditable
- Orthobullets ingestion is metadata-safe

The weakness is not the ingestion pipeline. The weakness is the semantic center of gravity.

Today, the implementation is still organized too much around:

- `curriculum_nodes`
- source topics
- deck branches
- card-to-node mappings

That is enough for import and review workflows, but not enough for a multi-year orthopaedic domain graph that will power BroBot, CasePrep, student curriculum, OITE prep, adaptive learning, and future AI tutoring.

The core architectural change should be:

- move canonical truth from curriculum-centered topic buckets toward typed orthopaedic domain entities
- keep curriculum as an overlay
- keep educational objects as first-class assets
- make provenance and governance more granular
- preserve existing imports and review ledgers during migration

## Design Principles

This proposal is grounded in the current codebase and keeps the parts that are already working:

- keep existing ingest contracts
- keep current source registries
- keep current Anki canonical card/version model
- keep existing alias tables where useful
- keep deterministic mapping and review ledgers
- avoid breaking current Supabase migration history
- evolve current tables into clearer layers rather than rewriting the system

## 1. Current-State Audit

### What exists today

The current ontology implementation includes:

- canonical scaffolding:
  - `specialties`
  - `curriculum_nodes`
  - `learning_objectives`
  - `concepts`
- naming and source reconciliation:
  - `concept_aliases`
  - `curriculum_node_aliases`
  - `source_aliases`
- metadata and source registry:
  - `external_sources`
  - `tags`
  - `tag_assignments`
- source objects:
  - `external_questions`
  - `external_question_curriculum_mappings`
  - `anki_*`
  - `canonical_cards`
  - `canonical_card_versions`
- review and mapping workflow:
  - `card_quality_reviews`
  - `card_training_level_links`
  - `card_knowledge_links`
  - `anki_kg_mapping_runs`
  - `anki_kg_mapping_candidates`
  - `anki_kg_review_actions`

### What is currently strong

#### Source isolation

The graph does not let Anki or Orthobullets directly define canonical truth. This is the right foundation.

#### Canonical card abstraction

`canonical_cards` and `canonical_card_versions` are good durable educational-object primitives. They should remain.

#### Deterministic mapping architecture

The mapper in [src/lib/education/anki-kg-mapper.ts](/Volumes/PS3000/snaportho_dev/snaportho-web/src/lib/education/anki-kg-mapper.ts:1) already uses:

- `source_aliases`
- `curriculum_node_aliases`
- `card_knowledge_links`
- run/candidate ledgers

This is valuable infrastructure and should not be discarded.

#### Review-led rather than destructive writes

The system already prefers statuses, ledgers, and reviews over silent overwrites. That is exactly the right long-term posture.

### What is currently weak

#### Canonical center is still curricular, not domain-oriented

`docs/educational-ontology-foundation.md` explicitly defines:

`Specialty -> Curriculum Node -> Learning Objective -> Concept`

That was a good Phase 1 simplification. It should not remain the final ontology spine.

#### `curriculum_nodes` are overloaded

They currently act as:

- hierarchy
- topic taxonomy
- source-topic landing zone
- mapping target
- proto-domain entity

That is too many roles for one table.

#### `concepts` are underspecified for future use

The current `concept_type` list is useful but still narrow. It does not cleanly express canonical orthopaedic entities such as:

- condition
- anatomy structure
- surgical approach
- implant
- diagnostic test
- rehabilitation principle

#### Missing typed relationships

The graph is still mostly:

- hierarchy
- mapping links
- aliases

It is not yet a relationship-rich knowledge graph.

#### Provenance is still too coarse

The current model tracks source and mapping provenance well enough for import audit, but not well enough for:

- edge-level evidence
- conflicting references
- editorial resolutions
- claim-level support

#### Parallel curriculum is already emerging

The hardcoded student curriculum in [src/lib/student-curriculum/curriculum-data.ts](/Volumes/PS3000/snaportho_dev/snaportho-web/src/lib/student-curriculum/curriculum-data.ts:1) shows that a second educational model is already growing outside the ontology.

That is an early warning sign that the current graph is not yet expressive enough to be the single system of record.

## 2. What Should Remain, Evolve, Or Deprecate

### Remain unchanged for now

- `external_sources`
- `source_aliases`
- `anki_import_batches`
- `anki_decks`
- `anki_note_models`
- `anki_notes`
- `anki_cards`
- `anki_tags`
- `anki_note_tags`
- `anki_media_refs`
- `canonical_cards`
- `canonical_card_versions`
- `card_quality_reviews`
- `anki_kg_mapping_runs`
- `anki_kg_mapping_candidates`
- `anki_kg_review_actions`

Reason:

These are operationally sound and mostly source or workflow objects, not the source of long-term semantic debt.

### Evolve

- `curriculum_nodes`
- `learning_objectives`
- `concepts`
- `card_knowledge_links`
- `external_question_curriculum_mappings`
- `curriculum_node_aliases`

Reason:

These are the tables where semantic meaning is currently concentrated, and therefore where future debt will accumulate fastest.

### Deprecate conceptually, not immediately

- `curriculum_nodes` as the dominant canonical object
- `curriculum node` as the primary mapping destination for all educational assets
- source-topic-created nodes as near-canonical truth

This does not mean dropping the tables. It means demoting their semantic role.

## 3. Technical Debt That Will Accumulate If Left Alone

### 1. Ontology sprawl from source topics

Orthobullets import currently created 752 accepted curriculum nodes from source topics. That is manageable now. At scale, it becomes a source-driven topic forest unless stronger domain modeling sits underneath it.

### 2. Duplicate reasoning outside the graph

BroBot, CasePrep, student curriculum, and future question generation will all need:

- disease-to-procedure logic
- procedure-to-implant logic
- prerequisite logic
- pearl/pitfall logic
- board-objective logic

If the graph does not store those relationships, each product will reimplement them.

### 3. Mapping fragility

The current mapper is good, but it maps into a target layer that is still semantically blurry. Better matching into the wrong abstraction will only deepen the problem.

### 4. Curriculum lock-in

If canonical truth is too tightly coupled to curriculum buckets, curriculum revisions become ontology migrations rather than overlay updates.

### 5. Review inefficiency

If reviewers keep approving card mappings before the ontology is stable, the team will spend time validating links into a target that may later split or be renamed.

## 4. Proposed Canonical Domain Model

The next-generation graph should explicitly separate five layers:

1. Domain ontology
2. Curriculum overlay
3. Educational objects
4. Evidence and provenance
5. Learner state

### 4.1 Domain Ontology

This becomes the canonical orthopaedic truth layer.

Recommended V1 first-class domain entities:

- `Condition`
- `Procedure`
- `AnatomyStructure`
- `ClassificationSystem`
- `Complication`
- `DiagnosticTest`
- `ImagingFinding`
- `TreatmentPrinciple`
- `BiomechanicsConcept`
- `ExamManeuver`

Recommended V1.5 or later entities:

- `SurgicalApproach`
- `Implant`
- `RehabilitationPrinciple`
- `OutcomeMeasure`
- `PathologyEntity`
- `MedicationOrPeriopIntervention`

### Why these deserve first-class treatment

#### Condition

Much of orthopaedic education is organized around diseases, injuries, and diagnoses. Treating them as generic concepts will weaken downstream reasoning.

#### Procedure

CasePrep and operative education require procedures as canonical entities, not just concepts or review metadata.

#### AnatomyStructure

Anatomy appears across student curriculum, questions, imaging, procedures, and complications. It must be a reusable canonical entity family.

#### ClassificationSystem

These are central in orthopaedics and frequently anchor learning, decision-making, and question design.

#### Complication

Complications are not just facts. They are decision-relevant entities that relate to procedures, conditions, implants, and prevention steps.

#### DiagnosticTest and ImagingFinding

Educational reasoning often depends on these explicitly, not just on broad "imaging" concepts.

#### TreatmentPrinciple and BiomechanicsConcept

These are stable conceptual primitives that are reused across many conditions and procedures.

#### ExamManeuver

This is highly reusable across student and resident education and important for question/test modeling.

### What should happen to `concepts`

`concepts` should survive, but its role should change.

Recommended path:

- keep `concepts` in the near term as the generic canonical knowledge table
- gradually introduce a typed superstructure around it, or sibling typed tables
- use `concepts` as:
  - a generic fallback class
  - a migration bridge
  - a home for cross-cutting educational abstractions that do not deserve narrower types yet

Do not keep using `concepts` as the only long-term canonical knowledge type.

## 5. Curriculum Overlay Model

Curriculum should no longer be the dominant canonical object.

It should become an overlay layer that references domain entities.

Recommended curricular objects:

- curriculum framework
- curriculum node
- learning objective
- milestone or competency
- board objective
- rotation objective
- training-level expectation

### What this means for current tables

#### `curriculum_nodes`

Keep the table, but reinterpret it as overlay structure:

- specialty branch
- board topic branch
- rotation branch
- learning sequence branch
- source-curated teaching branch

Not every `curriculum_node` should imply a canonical domain entity.

#### `learning_objectives`

Keep and expand. These should become the main bridge between curriculum and educational objects.

## 6. Educational Object Model

Educational objects should become explicitly first-class.

Recommended V1 educational object families:

- `Flashcard`
- `QuestionItem`
- `Article`
- `CaseModule`
- `ProcedureModule`

Recommended later:

- `Video`
- `GuidelineSummary`
- `AnatomyModule`
- `AIArtifact`

### Mapping guidance

Educational objects should connect primarily to:

- domain entities
- learning objectives

and secondarily to:

- curriculum nodes
- source artifacts

### What happens to existing tables

#### `canonical_cards`

Remain as the `Flashcard` implementation for now.

#### `external_questions`

Remain as source-native question metadata, but should no longer be mistaken for the full canonical question model.

Long term:

- keep `external_questions` as the source-object layer
- introduce a canonical `QuestionItem` entity that can be linked to one or more external question sources where permitted

## 7. Relationship Taxonomy

The current graph relies too heavily on hierarchy.

SnapOrtho needs a typed relationship system.

### V1 relationships to store explicitly

#### Domain-to-domain

- `treats`
- `indicated_for`
- `contraindicated_for`
- `involves_anatomy`
- `uses_implant`
- `uses_approach`
- `has_classification`
- `has_complication`
- `requires_imaging`
- `tested_by`
- `examines`
- `prerequisite_for`
- `commonly_confused_with`
- `differential_for`

#### Domain-to-educational-object

- `supported_by_card`
- `supported_by_question`
- `supported_by_article`
- `exemplified_by_case`
- `covered_by_module`

#### Domain-to-curriculum

- `covered_by_curriculum_node`
- `taught_by_learning_objective`
- `expected_at_training_level`

### Relationships better added later

- `sequenced_before`
- `alternative_to`
- `controversial_for`
- `historically_named_as`
- `risk_factor_for`

These are useful but can follow once the core graph is stable.

### Relationships that should usually remain derived

- deck-branch grouping
- tag co-occurrence
- review-batch membership
- source-file import grouping

These are workflow or analytics constructs, not canonical domain edges.

## 8. Provenance Model

The graph should know not only what is true, but why SnapOrtho currently accepts it.

### Current-state assessment

Current provenance is solid for:

- import batches
- source ownership
- mapping runs
- review decisions

It is weak for:

- canonical entity assertions
- relationship assertions
- claim support
- conflicting references

### Recommended provenance layers

#### Source Artifact

Represents:

- Orthobullets question metadata row
- Anki card
- article
- guideline
- review note

#### Assertion

Represents a claim SnapOrtho is making, such as:

- "ACL tear has classification X"
- "Question Q tests concept Y"
- "Procedure P uses implant I"

#### Evidence Link

Represents support for an assertion from one or more source artifacts.

#### Editorial Resolution

Represents the human or system decision when evidence conflicts or is incomplete.

### Provenance should attach to

- entities
- aliases
- relationships
- educational-object mappings
- educational claims
- governance actions

### Minimum provenance attributes

- source artifact id
- source type
- assertion type
- extraction/import method
- confidence
- reviewer status
- reviewed by
- reviewed at
- notes

## 9. Governance Model

Canonical entities should never be destructively deleted once referenced.

### Required governance actions

- merge
- split
- rename
- deprecate
- replace
- restore

### Governance rules

#### Merge

Old entities remain auditable and point to replacement canonical entity.

#### Split

Original entity becomes lineage anchor and points to multiple replacements.

#### Rename

Should update preferred label, preserve aliases, and never invalidate stable IDs.

#### Deprecate

Marks entity unsuitable for future use but still resolvable for historical mappings.

#### Replace

Allows downstream systems to migrate gracefully.

### Stable identity rule

- IDs are permanent
- preferred names are editable
- slugs are mutable metadata, not permanent public truth

## 10. Review Architecture

The user’s proposed review order is directionally correct and stronger than the current card-first emphasis.

Recommended review order:

1. ontology
2. aliases
3. branch-level mapping
4. source alignment
5. educational-object mapping
6. card or question quality

### Why this order is better

If ontology is unstable, reviewing card mappings first creates rework.

If aliases are weak, branch-level mapping quality stays low.

If branch-level mapping is weak, source alignment produces noisy canonical links.

If canonical mappings are weak, card-quality review happens in the wrong semantic neighborhood.

### Refinement to the proposed sequence

The only change I would make is:

- separate educational-object mapping from educational-object quality

Because:

- "Does this card map to the right domain entity?" is not the same question as
- "Is this card educationally good?"

## 11. Migration Strategy

This should be evolutionary.

The current ingestion pipeline should keep working during migration.

### Phase A: Reclassify current layers without breaking tables

Short-term goals:

- keep current imports running unchanged
- document current tables by layer:
  - source layer
  - curriculum overlay
  - educational object layer
  - canonical knowledge layer
  - review/provenance layer

Immediate conceptual reclassification:

- `curriculum_nodes` becomes overlay, not canonical domain truth
- `canonical_cards` becomes educational object, not graph center
- `external_questions` becomes source object, not canonical question model

### Phase B: Introduce typed canonical entity strategy

Recommended first additions:

- canonical domain entity abstraction
- typed domain entity families for the highest-value classes
- lineage support for merge/split/rename/deprecate

Migration rule:

- do not break existing `concepts` references immediately
- let `concepts` continue serving as the bridge while typed canonical entities are introduced

### Phase C: Introduce typed relationship layer

Add canonical edge support with:

- subject type/id
- predicate
- object type/id
- confidence
- provenance
- review status
- active/deprecated lineage

Then start migrating:

- high-value curriculum-node links
- concept-to-concept logic
- procedure/anatomy/condition relationships

### Phase D: Introduce canonical question model

Keep `external_questions` as the import layer.

Add canonical question-item abstraction above it.

Use this for:

- internal authored questions
- reviewed AI-generated questions
- source-linked items where policy allows

### Phase E: Repoint mapping workflows

Current deterministic mapping can continue, but the target should gradually shift from:

- mostly `curriculum_node_id`

toward:

- canonical domain entity links
- learning-objective links
- overlay curriculum links only where appropriate

### Phase F: Migrate curriculum products onto overlay model

Student curriculum, CasePrep structure, and future OITE sequencing should read from:

- canonical domain entities
- curriculum overlays
- educational-object coverage

not from source-topic-created nodes alone.

## 12. Risks

### Risk 1: Over-modeling too early

If too many entity types are introduced at once, ontology governance becomes slower than product progress.

Mitigation:

- start with the highest-value orthopaedic primitives only

### Risk 2: Leaving current abstractions semantically ambiguous too long

If `curriculum_nodes` and `concepts` remain blurry for too long, more logic will accrete around them.

Mitigation:

- reclassify them now, even before new tables exist

### Risk 3: Breaking current mapping workflows

The deterministic mapper and review UI already depend on current targets.

Mitigation:

- keep current tables alive
- add new canonical layer beside them
- migrate target semantics in phases

### Risk 4: Review overload

A richer ontology can produce too many candidate relationships.

Mitigation:

- prioritize ontology and branch-level review before item-level review
- use AI-assisted suggestion and conflict detection

## 13. Recommended Implementation Phases

### Phase 0: Architecture alignment

- ratify the layered model
- redefine which current tables are canonical versus overlay versus source-native
- stop expanding review workflows that deepen curriculum-node dependence

### Phase 1: Governance and lineage foundation

- design merge/split/rename/deprecate lineage model
- define stable identity policy
- define ontology review workflow

### Phase 2: Typed domain entity V1

- introduce first-class support for:
  - condition
  - procedure
  - anatomy structure
  - classification system
  - complication
  - diagnostic test
  - imaging finding
  - treatment principle
  - biomechanics concept
  - exam maneuver

### Phase 3: Relationship V1

- introduce typed canonical relationships
- seed only high-value predicates first
- attach provenance and review status from day one

### Phase 4: Educational object normalization

- formalize flashcards and question items as canonical educational objects
- keep current source imports intact
- begin mapping to domain entities first, curriculum second

### Phase 5: Curriculum overlay migration

- treat curriculum as multiple overlays, not one master truth
- start migrating hardcoded student curriculum logic into overlay-backed structures

### Phase 6: AI and adaptive readiness

- add prerequisite logic
- add misconception/pitfall/pearl relationships
- add assertion-level provenance and evidence confidence
- then expand BroBot and adaptive systems onto the graph

## Final Recommendation

Do not keep expanding the current review system as if the existing ontology shape is already final.

Do keep the current ingest, alias, provenance, and review infrastructure.

The right move is to preserve the working pipeline while changing the semantic center of the graph:

- from curriculum-driven topic buckets
- toward typed canonical orthopaedic domain entities

If SnapOrtho does that now, the existing importer and mapping work becomes a major asset.

If SnapOrtho delays that shift, every new review queue and import will make the future migration harder.
