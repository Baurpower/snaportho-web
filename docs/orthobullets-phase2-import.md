# Orthobullets Phase 2 Import

## What This Phase Adds

Phase 2 turns Orthobullets question metadata into the first real SnapOrtho mapping layer.

It adds:

- `external_questions`
- `external_question_curriculum_mappings`
- a multi-pass importer for Orthobullets metadata CSVs
- specialty normalization plus deterministic topic normalization
- draft curriculum topic creation only for accepted topic mappings
- source alias preservation
- status and source tagging
- topic-level review artifacts instead of a large question-level queue

It does **not** store:

- question stems
- answer choices
- explanations
- images
- scraped page content

This pipeline is metadata-only by design.

## Input Assumptions

The importer expects a CSV shaped like:

- `source`
- `external_question_id`
- `specialty_raw`
- `specialty_normalized`
- `topic_raw`
- `topic_normalized`
- `topic_slug`
- `needs_concept_mapping`
- `status`

Default input resolution checks:

1. `/mnt/data/orthobullets_questions_import.csv`
2. `/downloads/orthobullets_questions_import.csv`
3. `~/Downloads/orthobullets_questions_import.csv`

## Run Modes

Dry run, parse, normalize, and generate artifacts only:

```bash
node --experimental-strip-types scripts/import-orthobullets-questions.ts
```

Apply to Supabase after the migration is already present:

```bash
node --experimental-strip-types scripts/import-orthobullets-questions.ts --apply
```

Safe workflow:

1. run a dry run and inspect the review artifacts
2. add any approved topic overrides
3. rerun dry run and confirm only true anomalies remain
4. apply to local/dev Supabase first
5. run verification queries and inspect the apply report
6. apply to production only after a separate explicit review

On the dev project, the safest write pattern for `external_questions` and
`external_question_curriculum_mappings` is a minimal-return REST upsert followed by a
separate lookup, rather than expecting the insert response body to contain the written row.

Optional flags:

- `--input=/path/to/orthobullets_questions_import.csv`
- `--out=/path/to/output-directory`
- `--seed-topic-concepts` to opt into a tiny whitelist of topic-level concept seeds

Default behavior leaves `--seed-topic-concepts` off, so accepted topics become curriculum
nodes without auto-creating canonical concepts unless explicitly requested.

## Reviewed Overrides

Manually approved specialty/topic pairs live in
`src/lib/education/orthobullets-reviewed-topic-overrides.ts`.

When an override matches, the importer auto-accepts the topic mapping in future dry runs,
writes `mapping_method = reviewed`, and preserves a reason such as
`manually_reviewed_valid_topic` in import metadata.

## What Gets Created

### `external_questions`

One row per source question ID.

Stored fields are intentionally limited to:

- source ID
- external question ID
- raw and normalized specialty/topic labels
- topic slug
- metadata from the CSV row

### `external_question_curriculum_mappings`

One conservative primary mapping per imported question.

Fields capture:

- mapped specialty
- mapped curriculum node
- optional concept seed when `--seed-topic-concepts` is enabled
- mapping confidence
- `needs_review`
- review reason
- suggested reviewer action

## Multi-Pass Mapping Rules

1. Pass 0 validates the CSV and isolates malformed or obviously broken rows.
2. Pass 1 normalizes the specialty with exact aliases first, then limited topic-context rescue.
3. Pass 2 normalizes the topic label and slug while preserving raw source labels separately.
4. Passes 3 to 5 score the combined specialty/topic mapping and route each row to:
   - accepted topic mapping
   - topic review
   - source anomaly
5. Accepted specialty/topic pairs become draft `curriculum_nodes` under the mapped specialty.

Broad orthopaedic topics can be accepted as curriculum topics. True anomalies such as merged,
garbled, missing, or implausible source rows stay out of canonical node creation and go to
review instead.

## Review Outputs

The importer writes:

- `orthobullets_mapping_review.csv`
- `orthobullets_topic_mapping_review.csv`
- `orthobullets_concept_mapping_tasks.csv`
- `orthobullets_source_anomalies.csv`
- `orthobullets_potential_duplicates.csv`
- `orthobullets_import_summary.json`
- `orthobullets_import_summary.md`

The main review workflow is now topic-level:

- `orthobullets_topic_mapping_review.csv` for specialty/topic pairs that still need mapping review
- `orthobullets_concept_mapping_tasks.csv` for accepted topic mappings that still need concept enrichment
- `orthobullets_source_anomalies.csv` for malformed or ambiguous source rows
- `orthobullets_potential_duplicates.csv` for likely duplicate topics across specialties

The original `orthobullets_mapping_review.csv` is retained as a detailed row-level audit trail.

## Recommended Next Manual Step

After import, review should focus on:

1. rows with malformed or merged specialties
2. high-frequency topics still marked `NeedsConceptMapping`
3. broad topics that should be split into multiple concepts
4. specialty outliers like `Sports`, `Elbow`, or merged values that may reflect source-file corruption
5. cross-specialty duplicates surfaced in `orthobullets_potential_duplicates.csv`

## Why This Builds the Knowledge Graph

After migration + apply mode, the graph supports:

- which Orthobullets questions map to each curriculum topic
- which source topic labels roll into each canonical SnapOrtho node
- which imported topics still need concept enrichment
- which specialties and topics dominate the dataset
- where editorial ontology work should go next
