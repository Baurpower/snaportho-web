# BroBot versioned Anki → Pinecone plan

**Status:** Lean production plan  
**Date:** 2026-08-29  
**Source of truth:** Published Supabase Anki releases  
**Human-review surface:** Anki  

## 1. Goal

Make the reviewed, versioned Anki deck the primary educational source for BroBot.

The desired workflow is:

```text
Review and tag cards in Anki
        ↓
Publish a new immutable Supabase release
        ↓
Automatically build a new Pinecone namespace
        ↓
Run basic integrity and retrieval tests
        ↓
Pass: make it active
Fail: keep the existing index active
```

After the system is implemented, publishing a reviewed deck should be the only normal human action. Pinecone uploads, validation, activation, and rollback should not require manual work.

## 2. Principles

1. **Supabase is authoritative.** Pinecone is a search copy that can always be rebuilt.
2. **Only published content is indexed.** Draft changes never affect BroBot.
3. **One namespace per release.** Never rebuild the production namespace in place.
4. **Failed builds do not affect users.** BroBot stays on the last working release.
5. **Human review stays in Anki.** Models may suggest improvements later, but never approve or publish cards.
6. **Every answer is traceable.** Retrieved evidence includes release and card-version IDs.
7. **Start simple.** Add hybrid search, canaries, and advanced automation only when measured failures justify them.

## 3. Scope of version 1

Version 1 includes:

- A governed subset of Anki tags.
- One cleaned Pinecone record per eligible Anki note or card.
- Dense semantic embeddings.
- Metadata filters using tags and approved entity mappings.
- A simple Supabase job table and scheduled worker.
- One namespace per published deck release.
- Embedding reuse based on content hash.
- Automated record-count and sample-record verification.
- A clinician-reviewed retrieval benchmark.
- Atomic activation and rollback.
- BroBot evidence packets with card citations.
- Basic retrieval telemetry.

Version 1 does **not** include:

- Supabase Queues or a separate message broker.
- Multiple concurrent indexing workers.
- Pinecone canary traffic.
- Dense/sparse hybrid search.
- Hosted reranking models.
- Complex semantic passage splitting.
- Automated model-generated Anki edits.
- A large evaluation platform with multiple graders.
- Automatic deletion of historical namespaces.

These can be added later without changing the central source-of-truth design.

## 4. Use the existing release system

The repository already provides the important data:

- `anki_sync_v2_releases`: immutable note-centric releases.
- `anki_sync_v2_note_versions`: reviewed field content and governed tags.
- `anki_sync_v2_release_notes`: exact release membership.
- `anki_deck_releases` and `anki_deck_release_cards`: exact card-version membership and hashes.
- `anki_card_entity_version_mappings`: reviewed, production-eligible clinical mappings.

Before implementation, choose one release record as the publication trigger.

Recommended approach:

- Treat `anki_sync_v2_releases` as the Anki publication release.
- Link it explicitly to the corresponding `anki_deck_releases` record.
- Do not infer the link using version strings.
- Reject publication if the note/card counts or checksums disagree.

Do not create another independent deck lifecycle for Pinecone.

## 5. Human review and tags in Anki

### 5.1 Review rule

A card is eligible for BroBot only when:

- It belongs to a published release.
- Its exact content version was reviewed.
- Its required tags are valid.
- It is not retired, excluded, stale, or marked for more review.
- Any attached clinical entity mapping is approved and production eligible.

Review applies to the exact content and tag checksums. If clinically meaningful content or governed tags change, that new version must be reviewed before publication.

### 5.2 Governed tags

Start with a small tag vocabulary:

```text
snap::status::approved
snap::specialty::<slug>
snap::region::<slug>
snap::topic::<slug>
snap::diagnosis::<slug>
snap::procedure::<slug>
snap::anatomy::<slug>
snap::classification::<slug>
snap::mode::oite|or_prep|clinic|consult|general
snap::exclude::brobot
```

Maintain a small registry that defines allowed values, deprecated tags, filterable tags, and workflow-only tags. Unknown `snap::` tags should block publication. Personal or legacy tags can remain in Anki but should not automatically become BroBot filters.

### 5.3 Publication preflight

Before the user publishes, show:

- Total notes and cards.
- New, changed, and retired notes.
- Missing approval tags.
- Unknown or deprecated governed tags.
- Empty question or answer fields.
- Duplicate stable IDs.
- Content versions missing required review.
- Index-eligible and excluded counts.

Publishing remains the final human checkpoint.

## 6. Pinecone record design

### 6.1 Start with one record per note

Use one record per Anki note unless the note is unusually large or contains clearly unrelated concepts.

For cloze notes, render one complete teaching document instead of indexing every cloze deletion as a nearly identical vector. Preserve the related card IDs in metadata.

Example text:

```text
Specialty: Trauma
Region: Ankle
Topic: Ankle fracture
Question: What structures are at risk during a lateral fibular approach?
Answer: The superficial peroneal nerve is at risk proximally and anteriorly.
Extra: Identify and protect branches during exposure.
```

Strip HTML, CSS, Anki template syntax, scheduling information, media filenames, workflow-only tags, and empty fields.

### 6.2 Stable record ID

Use the immutable note version:

```text
anki-note:<note_version_id>
```

The same ID can be used in different release namespaces. Retrying an upsert is therefore safe.

### 6.3 Metadata

Keep metadata flat and reasonably small:

```json
{
  "release_id": "uuid",
  "release_version": "1.9.0",
  "note_id": "uuid",
  "note_version_id": "uuid",
  "card_version_ids": ["uuid"],
  "content_checksum": "sha256",
  "tags_checksum": "sha256",
  "deck_path": "SnapOrtho::Trauma::Ankle",
  "specialties": ["trauma"],
  "regions": ["ankle"],
  "topics": ["ankle_fracture"],
  "diagnoses": ["ankle_fracture"],
  "procedures": ["ankle_orif"],
  "anatomy": ["superficial_peroneal_nerve"],
  "modes": ["or_prep"],
  "entity_ids": ["uuid"],
  "production_eligible": true,
  "citation_label": "SnapOrtho Deck 1.9 — note …",
  "evidence_text": "Question: … Answer: …"
}
```

Large provenance details remain in Supabase. Pinecone stores only the IDs needed to retrieve them.

## 7. Embeddings

Choose and pin the embedding model, vector dimensions, Pinecone distance metric, text-rendering version, and maximum document length. A release must use one embedding configuration.

### 7.1 Reuse unchanged embeddings

Use this cache key:

```text
embedding_model + renderer_version + content_checksum
```

If content is unchanged in a new release, reuse its embedding. If only tags changed, reuse the vector and write updated metadata into the new namespace.

A simple private Supabase table is sufficient:

```text
anki_embedding_cache
- cache_key
- embedding_model
- dimensions
- embedding
- created_at
- last_used_at
```

## 8. Minimal Supabase control plane

Use four tables. Place them in a private schema when convenient; otherwise enable and force RLS, revoke browser roles, and allow server-only access.

### 8.1 `brobot_vector_configs`

One immutable row per embedding/index configuration:

```text
id
config_key
pinecone_index
embedding_model
dimensions
renderer_version
metadata_schema_version
config_checksum
created_at
```

Do not store API keys in the table.

### 8.2 `brobot_vector_releases`

One row per Pinecone release build:

```text
id
source_release_id
config_id
namespace
status
expected_record_count
indexed_record_count
manifest_checksum
validation_results jsonb
started_at
completed_at
activated_at
failure_code
failure_summary
created_at
updated_at
```

Statuses:

```text
queued → building → validating → ready → active → superseded
                       ↘ failed
```

Enforce a unique constraint on `(source_release_id, config_id)` so duplicate publication events cannot create duplicate logical builds.

### 8.3 `brobot_vector_jobs`

One durable job per release build:

```text
id
vector_release_id
status
attempt_count
available_at
claimed_at
lease_expires_at
worker_id
last_error
created_at
updated_at
```

Claim jobs atomically with `FOR UPDATE SKIP LOCKED`. Use a lease so a job becomes available again if the worker crashes.

### 8.4 `brobot_vector_settings`

Use a single row:

```text
id = production
active_vector_release_id
previous_vector_release_id
generation
updated_at
```

The generation prevents concurrent activation decisions from overwriting each other.

### 8.5 Retrieval telemetry

Reuse existing BroBot analytics if it can store the vector release ID, retrieval status and latency, retrieved and selected evidence IDs, whether evidence influenced the answer, fallback reason, and user-feedback linkage.

Do not store unredacted patient information in retrieval logs.

## 9. Publication and indexing workflow

### Step 1: Publish the deck

In one short database transaction:

1. Validate the immutable deck manifest and review requirements.
2. Mark the source release published.
3. Create or reuse the corresponding vector-release row.
4. Create or reuse a queued job.
5. Commit.

Do not call Pinecone or the embedding API inside this transaction.

### Step 2: Scheduled worker claims the job

Run a worker every minute or few minutes using the existing scheduling approach.

The worker:

1. Claims one available job.
2. Marks the vector release `building`.
3. Loads the exact published release.
4. Selects eligible notes.
5. Cleans and renders each note deterministically.
6. Reuses or generates embeddings.
7. Upserts records into a new namespace.
8. Records progress after every batch.

If the worker stops, the lease expires and another run resumes the job. Repeated upserts are safe because record IDs are deterministic.

### Step 3: Validate the namespace

After uploading:

1. Wait for Pinecone writes to become queryable.
2. Compare expected and actual record counts.
3. Fetch a deterministic sample of record IDs.
4. Verify release IDs, note-version IDs, and content checksums.
5. Confirm excluded notes are absent.
6. Run the retrieval benchmark.

If validation fails, mark the candidate failed, keep the existing active release, save a concise report, and retry automatically only for temporary service errors.

Do not manually patch a failed namespace. Fix the source content or indexing code and rebuild a clean candidate.

### Step 4: Activate the candidate

If all required checks pass:

1. Set the candidate status to `ready`.
2. Move the current active ID to `previous_vector_release_id`.
3. Set the candidate as `active_vector_release_id`.
4. Increment the generation.
5. Mark the prior vector release `superseded`.

Perform these changes in one short transaction. BroBot reads the active release from Supabase; it does not infer production from the newest Pinecone namespace.

### Step 5: Rollback

Rollback swaps the active and previous release pointers. It does not rebuild vectors or copy records.

Keep at least the active namespace, previous namespace, and any candidate being investigated.

## 10. Retrieval benchmark

Start with approximately 100–200 clinician-reviewed queries covering:

- Exact classifications and eponyms.
- Paraphrased factual questions.
- OITE questions.
- OR-prep questions.
- Anatomy at risk.
- Treatment thresholds.
- Queries expected to return no deck evidence.
- Near-neighbor negative controls.

Important negative pairs include tibial shaft versus tibial plateau versus pilon, anterior versus posterior hip approach, adult versus pediatric thresholds, similar classification names, and regional anatomy that is nearby but procedurally irrelevant.

Initial promotion requirements:

- Expected Pinecone record count matches.
- Sampled record IDs and checksums match Supabase.
- No excluded content is found.
- No severe cross-procedure or cross-anatomy contamination.
- At least 90% must-include recall on the benchmark.
- No meaningful regression compared with the current namespace.
- All citation IDs resolve to the correct release and note version.
- Retrieval latency remains within the BroBot request budget.

Keep active and candidate results side by side. A new release should not activate merely because it uploaded successfully.

## 11. BroBot retrieval

### 11.1 Query flow

For eligible orthopedic questions:

1. Resolve the BroBot mode and likely topic or procedure.
2. Read the active vector release from Supabase or a short-lived server cache.
3. Embed the question once.
4. Query the active namespace.
5. Apply high-confidence metadata filters when available.
6. Reject explicit procedure, anatomy, or population conflicts.
7. Deduplicate results from the same note.
8. Select the best 3–6 evidence records.
9. Add them to a bounded evidence packet.
10. Record the retrieval trace.

### 11.2 Filtering

Use hard filters only when BroBot resolves them confidently. Always filter by active namespace and production eligibility. Use explicit procedure/source restrictions when known. Treat specialty, region, mode, and broad topic as boosts or optional filters when uncertain.

Do not add an unrestricted fallback that searches the entire deck after scoped retrieval fails. A clean miss is safer than an irrelevant orthopedic card presented with confidence.

### 11.3 Evidence packet

Each selected record provides evidence text, deck release, note/card-version IDs, citation label, relevant tags/entities, and retrieval score.

Tell the answer model to prefer reviewed evidence, use it only for supported claims, avoid filling gaps with invented details, separate general model knowledge when deck evidence is missing, and cite deck-supported claims.

### 11.4 Failure behavior

- Pinecone timeout: use existing certified/KG context or general knowledge and record the fallback.
- Weak results: do not include them as evidence.
- Citation construction failure: omit vector evidence rather than fabricate a citation.
- Active-release mismatch: briefly use the last known-good cached release and alert.

## 12. Improving the index over time

For version 1, keep this mostly manual.

Log retrieval misses, weak-result queries, broad-filter usage, retrieved/selected card IDs, negative feedback, citation problems, and cross-topic contamination.

Generate a weekly report with:

- Most frequent missed topics.
- Cards associated with negative feedback.
- Tags that appear missing or inconsistent.
- Conflicting or duplicate cards.
- Queries that required general model knowledge.

A clinician uses this report to improve cards and tags in Anki. The next published release automatically rebuilds and reruns the benchmark.

Every confirmed production failure becomes a benchmark case. Do not build automated card rewriting or automatic tag approval in version 1.

## 13. Security and privacy

- Keep Pinecone and embedding keys server-side.
- Never expose them through `NEXT_PUBLIC_` variables.
- Restrict vector control tables to server roles.
- Enable and force RLS on exposed-schema tables.
- Revoke access from `anon` and `authenticated` unless specifically required.
- Keep transactions short and perform external calls outside transactions.
- Redact patient-identifying information from retrieval telemetry.
- Do not embed user chat history or patient cases into the deck index.
- Confirm licensing permits external embedding and model use of deck content.

## 14. Monitoring

Track the latest published Anki release, active and previous vector releases, job status and age, records expected/indexed, embeddings generated/reused, build duration/failures, benchmark delta, retrieval hit/miss/error rates, latency, and negative feedback associated with evidence.

Alert when a published release has no job, a build is stuck, validation fails, the active namespace is unavailable, or retrieval errors/contamination warnings increase significantly.

## 15. Testing

### Unit tests

- Tag parsing and validation.
- Note cleaning and cloze normalization.
- Stable record IDs.
- Eligibility rules.
- Embedding cache keys.
- Metadata generation.
- Conflict rejection and deduplication.
- Evidence and citation formatting.

### Database tests

- Duplicate publication creates one logical job.
- Workers cannot claim the same job.
- Expired jobs become available again.
- Invalid status transitions fail.
- Active-pointer updates use the expected generation.
- Browser roles cannot access control tables.

### Integration tests

- Repeated Pinecone upserts are idempotent.
- Partial failures resume safely.
- Candidate namespaces cannot become active before validation.
- Wrong count or metadata blocks activation.
- Failed candidates leave BroBot on the existing release.
- Rollback restores the previous release.

### End-to-end test

Publish a fixture release, confirm one job, build and validate its namespace, activate it, ask BroBot a fixture question, verify the expected card citation, roll back, and confirm BroBot uses the previous release.

## 16. Implementation phases

### Phase 1 — Contracts and compiler

Estimated duration: 4–6 engineering days.

- Choose the authoritative release and bridge.
- Define the governed tag registry.
- Pin the embedding configuration.
- Implement deterministic cleaning, rendering, stable records, and checksums.
- Add unit tests.

**Done when:** the same release produces identical records and checksums every time.

### Phase 2 — Index builder

Estimated duration: 5–7 engineering days.

- Add the four control tables and permissions.
- Add idempotent publication jobs.
- Implement scheduled job claiming and leases.
- Implement embedding generation/reuse.
- Build release-specific namespaces.
- Verify counts and sample records.
- Add retry and resume behavior.

**Done when:** a published fixture release automatically produces a complete, reproducible candidate namespace.

### Phase 3 — Evaluation and activation

Estimated duration: 4–6 engineering days, plus clinician benchmark review.

- Create the first 100–200 queries.
- Compare active and candidate namespaces.
- Add promotion gates.
- Add atomic activation and rollback.
- Add build status and failure reporting.

**Done when:** a good candidate activates automatically and a deliberately bad candidate is rejected without affecting production.

### Phase 4 — BroBot integration

Estimated duration: 5–7 engineering days.

- Add active-release resolution and scoped retrieval.
- Add conflict rejection and deduplication.
- Build evidence packets and citations.
- Add telemetry and safe fallback.
- Run briefly in shadow mode before enabling answer influence.

**Done when:** BroBot uses reviewed evidence, cites exact versions, and safely falls back when evidence is missing.

### Phase 5 — Operational improvement

Estimated duration: 2–4 engineering days initially, then ongoing.

- Add the weekly quality report.
- Convert confirmed failures into benchmark cases.
- Review misses in Anki and publish improvements through the same pipeline.

**Done when:** every release is evaluated against previous confirmed failures and normally requires no Pinecone oversight.

Expected initial implementation: approximately **4–6 weeks**, depending mainly on review metadata and clinician benchmark creation.

## 17. Add later only if needed

| Observed problem | Add |
|---|---|
| Exact names or numeric thresholds are frequently missed | Hybrid lexical/vector search |
| Dense retrieval returns too many plausible but weak results | Reranking model |
| Long notes retrieve irrelevant subsections | Semantic passage splitting |
| New releases regress despite offline tests | Production canary rollout |
| One worker cannot finish builds promptly | Supabase Queue and multiple workers |
| Manual weekly review becomes burdensome | Automated editorial suggestion queue |
| Pinecone cost or availability becomes problematic | Vector adapter and pgvector evaluation |

None of these are required for a reliable first version.

## 18. Definition of done

- Review happens in Anki.
- One publish action creates an immutable Supabase release and indexing job.
- The new release builds in its own Pinecone namespace.
- Unchanged content reuses embeddings.
- Draft, excluded, and unreviewed content cannot be indexed.
- Structural and retrieval tests run automatically.
- Failed candidates do not affect BroBot.
- Passing candidates activate through one Supabase pointer.
- Rollback requires no rebuild or deployment.
- BroBot cites exact release and card versions.
- Pinecone failures degrade safely.
- Confirmed failures become future benchmark tests.
- Routine releases require no manual Pinecone work.

## 19. Recommended first rollout

Start with one strong vertical such as ankle trauma or hand:

1. Select well-reviewed and consistently tagged cards.
2. Build the complete publication, indexing, and rollback path.
3. Create 100–200 queries with near-neighbor negative cases.
4. Run retrieval in shadow mode.
5. Enable evidence for one mode, preferably OITE or OR Prep.
6. Expand after the same benchmark gates pass.

This limits clinical risk while proving the complete design. Expansion should mostly require more reviewed cards and benchmark cases—not new infrastructure.

## 20. Current platform references

Re-check current limits and API behavior before implementation:

- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Pinecone indexing overview](https://docs.pinecone.io/guides/index-data/indexing-overview)
- [Pinecone upsert records](https://docs.pinecone.io/guides/index-data/upsert-data)
- [Pinecone data freshness](https://docs.pinecone.io/guides/index-data/check-data-freshness)

Use stable Pinecone APIs and pinned SDK versions.
