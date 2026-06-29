# SnapOrtho Knowledge Graph Layer Classification

Date: 2026-06-28

## Purpose

This document reclassifies the current ontology implementation into explicit
layers so the next-generation graph can evolve without breaking the existing
pipeline.

Most important:

- `curriculum_nodes` are now treated as curriculum overlay objects
- they are not the primary canonical domain entity

## Layer Summary

### 1. Source-Native Layer

These tables preserve source-owned identity or import-native metadata.

- `external_sources`
- `source_aliases`
- `external_questions`
- `anki_import_batches`
- `anki_decks`
- `anki_note_models`
- `anki_notes`
- `anki_cards`
- `anki_tags`
- `anki_note_tags`
- `anki_media_refs`

Interpretation:

- these remain source-native or import-native
- they should not be treated as long-term canonical domain truth

### 2. Canonical Educational Object Layer

These tables represent SnapOrtho-owned educational assets.

- `canonical_cards`
- `canonical_card_versions`

Near-term note:

- future canonical question items belong in this layer as first-class
  educational objects

Interpretation:

- these are canonical educational objects
- they are not source-native
- they are also not the domain ontology itself

### 3. Domain Ontology Layer

These tables represent canonical orthopaedic knowledge.

Current:

- `concepts`
- `concept_aliases`

New foundation:

- `canonical_entities`
- `canonical_relationships`
- `ontology_governance_actions`
- `ontology_provenance_records`

Interpretation:

- `concepts` remain part of the domain layer for now
- `concepts` are no longer assumed to be the only future canonical entity model
- typed canonical entities are the next-generation foundation

### 4. Curriculum Overlay Layer

These tables define learning structure, not canonical domain truth.

- `specialties`
- `curriculum_nodes`
- `learning_objectives`
- `card_training_level_links`
- `curriculum_node_entities`

Interpretation:

- `curriculum_nodes` are overlay objects
- one canonical entity may appear in many curriculum nodes
- one curriculum node may cover many canonical entities
- curriculum can evolve without redefining orthopaedic domain truth

### 5. Mapping, Review, And Workflow Layer

These tables capture linking, review, audit, or intermediate workflow state.

- `card_knowledge_links`
- `external_question_curriculum_mappings`
- `anki_kg_mapping_runs`
- `anki_kg_mapping_candidates`
- `anki_kg_review_actions`
- `card_quality_reviews`

Interpretation:

- these are workflow and audit artifacts
- they remain important and should be preserved
- they should not be mistaken for the core domain ontology

## Canonical Truth Rules

### Tables that remain source-native

- `external_sources`
- `source_aliases`
- `external_questions`
- all `anki_*` import tables

### Tables that are canonical educational objects

- `canonical_cards`
- `canonical_card_versions`

### Tables that are canonical orthopaedic domain truth

Current and transitional:

- `concepts`
- `concept_aliases`

Next-generation foundation:

- `canonical_entities`
- `canonical_relationships`

### Tables that are overlays

- `specialties`
- `curriculum_nodes`
- `learning_objectives`
- `card_training_level_links`
- `curriculum_node_entities`

### Tables that are workflow artifacts

- `card_knowledge_links`
- `external_question_curriculum_mappings`
- `anki_kg_mapping_runs`
- `anki_kg_mapping_candidates`
- `anki_kg_review_actions`
- `card_quality_reviews`
- `ontology_governance_actions`
- `ontology_provenance_records`

## What Should Not Be Treated As Long-Term Canonical Domain Truth

- source topic labels
- deck branches
- source-only tags
- imported Orthobullets topic buckets
- `curriculum_nodes` by default
- mapping candidates
- review queues

## Near-Term Architectural Consequence

Current ingest and review workflows continue to operate as-is.

The architectural shift is semantic, not destructive:

- preserve the current pipeline
- add a durable typed canonical entity layer beside it
- add typed relationships, governance lineage, provenance, and curriculum bridge
- migrate future mapping targets toward canonical entities rather than relying on
  curriculum nodes as the main domain abstraction
