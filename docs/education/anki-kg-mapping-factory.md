# SnapOrtho Anki-to-Knowledge-Graph mapping factory

## Purpose and boundary

The factory reproducibly turns an immutable deck-release cohort into **unreviewed machine proposals**, independent machine critiques, explainable consensus, risk tiers, and human queues. It never creates entities, changes KG topology, writes mappings, fills human fields, determines publication eligibility, or publishes a release. The distinctions are contractual: machine proposal ≠ machine consensus ≠ human review ≠ publication eligibility ≠ published mapping.

```text
Immutable deck release
        ↓
Identity + card quality
        ↓
Deterministic mappings
        ↓
Concept extraction
        ↓
Entity resolution
        ↓
Clinical + coverage critics
        ↓
Cross-card consistency
        ↓
Machine consensus
        ↓
Risk tiers and queues
        ↓
Human calibration/exceptions
        ↓
Publication validation
        ↓
Future explicit publication
        ↘
  KG/alias backlog + deck-improvement backlog
```

## Lifecycle and pinning

A run pins contract/implementation/rules/prompt versions, deck release and manifest checksum, KG and alias snapshots, configuration checksum, and optional provider/model identity. Its batches pin a coherent cohort and ordered card/version/content identities. Assignments pin release membership, GUID, ordinal, current version, and terminal disposition. Each stage result carries its own input/output checksum, implementation version, timestamps, status, warnings, failure codes, and retry count.

The local runner is dry-run-only and filesystem-backed. Its deterministic run and batch IDs derive from pinned inputs. An existing output directory is refused unless `--resume` is explicit. Completed stage results are reused; failed stages retry only when requested. A missing snapshot, changed version, changed cohort size, unsafe metadata, checksum mismatch, or omitted required stage fails closed.

## Deterministic and model-assisted stages

Deterministic candidates remain those produced by the existing conservative deck-foundation rules. Concept extraction and critics use the same versioned result envelope. `ModelAdapter` is provider-neutral and records mode, provider, model, prompt, and schema versions. The included fixture adapter is for tests/local contract development only and is never calibration evidence. Invalid or unsafe adapter output must fail before artifact creation. No adapter can write to canonical or publication tables.

The current calibration intentionally uses deterministic mode only. It does not infer concepts from absent card bodies; this is safer than fabricating extraction evidence. Accordingly, no-candidate cards route to human confirmation rather than an alias/entity backlog, and entity-type metrics remain unavailable without a pinned entity snapshot artifact.

## Reviews, consensus, risk, and routing

Machine reviews preserve independent support, opposition, uncertainty, reason codes, competitors, and evidence hashes. Consensus is deterministic and preserves dissent. `strong_support`, `qualified_support`, and every other machine outcome remain non-human and non-publishable.

- Tier A: exact, current, active, multi-signal, no blockers → rapid human review.
- Tier B: plausible or no-mapping proposal → individual review or no-mapping confirmation.
- Tier C: ambiguity, opposition, lifecycle/KG/alias exception → specialist exception queue.
- Tier D: card-quality blocker → deck-improvement queue.

Every card gets exactly one terminal route. `publication_candidate` is a later non-terminal administrative queue and cannot replace direct review. The generated human packet is deliberately blank. Required fields include reviewer identity/qualification, exact version, explicit decision, confidence, role or no-mapping classification, timestamp, `direct_human_review`, ambiguity resolution, and bounded notes/reasons.

## Publication, KG, and deck-improvement loops

The existing publication-readiness validator is the only readiness gate reused here. It requires an exact current card version, eligible release membership, active non-superseded entity, allowed role, valid evidence, resolved blockers, named direct human approval, and confidence ≥0.95. Factory output always previews `DO_NOT_PUBLISH` until that evidence is separately supplied. Missing aliases/entities become governed backlogs; no entity is automatically created. Quality findings become editorial proposals; cards are never rewritten.

## Security, retention, and rollback

The additive schema is optional administrative persistence: forced RLS, no anonymous/authenticated grants, service-role administration only, restrictive foreign keys, idempotent keys, immutable completed stage results and machine reviews, safe metadata checks, and explicit retry/supersession lineage. It includes no human-review table and no apply/approval/publication function. Durable artifacts contain IDs, hashes, bounded reason codes, paths, and safe metadata—not card bodies.

Before migration application, rollback is deletion of the factory source/migration/verification files. After a future application, drop the factory triggers/function, eight factory tables in dependency order, and the stage enum. Existing releases, cards, mappings, entities, relationships, and review assertions are outside that boundary.

## Calibration, scaling, and specialist reviewers

Run locally:

```bash
npm run education:deck-mapping-factory -- --dry-run --input=/tmp/snaportho-deck-foundation-20260720-final3
npm run education:deck-mapping-factory:test
```

Full-deck processing is blocked until clinician evidence demonstrates ≥95% precision among approved proposals, zero stale carry-forward, complete accounting, ≥95% explainable no-mapping disposition, reproducible checksums, low ambiguity, acceptable review time, sufficient Tier A batch precision, zero machine-populated human fields, zero machine-only publication, and product/legal approval for content handling/distribution. Precision is approved correct proposals divided by all clinician-reviewed machine proposals; explainable no-mapping is classified no-mapping cards divided by all proposed no-mapping cards. No gate is claimed from machine-only calibration.

Future specialist agents implement `ModelAdapter`, emit the same validated machine-review contract, use a unique reviewer type/version, and remain independently visible to consensus. Adding one requires fixtures, schema validation, bounded evidence, pinned prompts/models, retry/concurrency limits, and clinical calibration; it grants no publication authority.

## Semantic extension

The semantic runner loads the 62 exact current versions inside an explicit read-only transaction and always rolls it back. It recomputes the importer-compatible content hash, removes templates, HTML, CSS, media markers, and LaTeX in memory, then releases each raw field array after processing. Default mode is `local_only`; external processing requires both `approved_external_model` mode and explicit authorization, and no external provider is configured in this phase.

Concept extraction and entity resolution are separate. Local lexical extraction emits normalized labels, clinical categories, roles, flags, source-field names, and evidence hashes. Resolution searches only active existing preferred labels and governed/source aliases, preserves collisions, and rejects inactive lifecycle states. Five independent critics cover clinical support, specificity, negation/distractors, coverage, and card quality. Cross-card checks emit findings only.

Recursive durable-artifact validation rejects body/front/back keys, field snapshots, HTML, CSS, media, LaTeX/APKG payloads, secrets, credentials, and unbounded strings. Excerpts are disabled. Semantic output remains machine-only and the publication preview always fails closed pending direct human review.
