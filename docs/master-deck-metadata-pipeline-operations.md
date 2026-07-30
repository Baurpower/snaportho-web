# Master Deck Metadata Pipeline Operations

This runbook operates the versioned four-facet metadata pipeline over either a published deck release or every active current card in the imported master deck.

The pipeline writes model output as proposals. It does not publish a metadata release or modify an Anki collection.

## 1. Install the schema

Apply these migrations in order through the normal Supabase migration process:

1. `supabase/migrations/20260728_120000_master_deck_metadata_pipeline.sql`
2. `supabase/migrations/20260728_121000_master_deck_metadata_taxonomy_v0_1_seed.sql`

Then run the read-only checks in:

`supabase/verification/master_deck_metadata_pipeline.sql`

The seed creates frozen taxonomy `0.1.0`. Anatomy, diagnosis, and treatment use existing `canonical_entities`; it adds the governed specialty vocabulary.

## 2. Validate locally

```bash
npm run education:anki:metadata:test
npm run education:anki:tags:test
```

## 3. Create the full active-card cohort

The current published beta contains fewer cards than the imported master. This command creates a draft analysis release containing every active current card without publishing it:

```bash
npm run education:anki:metadata:pipeline -- \
  --command=bootstrap-full-release \
  --release-key=snaportho-metadata-full-active \
  --confirm-bootstrap=CREATE_DRAFT_FULL_RELEASE
```

The command is idempotent by release key.

## 4. Default: process just-in-time cohorts with parallel Codex agents (no API)

This is the recommended operating mode. It does not require `OPENAI_API_KEY`,
and the runner makes zero model API calls.

Export only the next requested cohort and split it into compact packets for
parallel agents:

```bash
npm run education:anki:metadata:pipeline -- \
  --command=codex-cohort-export \
  --release-key=snaportho-metadata-full-active \
  --taxonomy-version=0.1.0 \
  --run-key=snaportho-codex-cohorts-v1 \
  --cohort-size=100 \
  --agents=5
```

This creates five 20-card packets and exactly five database batch rows. It does
not pre-create batches for the rest of the deck. Every later invocation reuses
the same run and automatically skips card versions that are already completed,
accepted, or reserved by an active packet.

The command writes mode-0600 packets under
`tmp/codex-metadata/<run-key>/<cohort>/`. Give one file to each agent and ask it to fill only
each card's `assertions` array. The packet contains exact card text and a bounded
governed candidate vocabulary for each facet. The default candidate limit is 12
per facet rather than 40 to reduce packet size and token use.

After each agent completes its packet, validate and checkpoint it:

```bash
npm run education:anki:metadata:pipeline -- \
  --command=codex-import \
  --input=<packet-path>
```

Imports are idempotent. Assertions with explicit evidence and confidence of at
least 0.98 are accepted automatically under `snaportho-codex-cohorts.1`.
Lower-confidence assertions remain outside published manifests; they do not
create a mandatory human-review queue.

This path provides:

- no OpenAI API key or automated model call
- immutable card identity and packet checksum
- governed candidate IDs and exact-substring evidence validation
- one persistent run instead of a new run for every cohort size
- only requested batch rows instead of thousands of future pending rows
- automatic reuse of previously processed cards across older calibration runs
- high-confidence automated acceptance for every clinical facet
- one primary specialty; additional specialties are secondary
- 24-hour packet leases and idempotent completed-packet imports
- no per-card heartbeat writes

Packets contain card content and must remain in the ignored `tmp/` directory.
Adjust `--agents`, not the persistent run key, when changing parallelism.

The older `codex-export` command remains available only for resuming an already
created legacy run. Do not use it for new cohorts because it materializes every
remaining batch up front.

## 5. Optional: API pilot

Card content is sent to the configured OpenAI model only when explicitly authorized.

```bash
npm run education:anki:metadata:pipeline -- \
  --command=run \
  --release-key=snaportho-metadata-full-active \
  --taxonomy-version=0.1.0 \
  --limit=25 \
  --batch-size=25 \
  --concurrency=2 \
  --authorize-external-processing=true
```

Use a different `--run-key` when changing only the cohort size manually. The normal run key is deterministic from release, taxonomy, model, and configuration.

Inspect progress:

```bash
npm run education:anki:metadata:pipeline -- \
  --command=status \
  --run-key=<run-key>
```

## 6. Optional: API full-deck run

```bash
npm run education:anki:metadata:pipeline -- \
  --command=run \
  --release-key=snaportho-metadata-full-active \
  --taxonomy-version=0.1.0 \
  --batch-size=100 \
  --concurrency=3 \
  --taxonomy-limit=40 \
  --authorize-external-processing=true
```

The runner:

- processes stable card versions in deterministic order
- runs anatomy, diagnosis, treatment, and specialty agents concurrently
- runs independent clinical-entailment and ontology critics
- stores only evidence offsets and hashes
- persists immutable stage results
- resumes completed cards without repeated model calls
- heartbeats batches and records failures
- leaves every machine assertion in `proposed` state

To retry failed cards:

```bash
npm run education:anki:metadata:pipeline -- \
  --command=run \
  --release-key=snaportho-metadata-full-active \
  --retry-failed=true \
  --authorize-external-processing=true
```

Keep the model, taxonomy, batch size, and taxonomy limit unchanged when resuming a run.

## 7. Classify the existing raw Anki tags

This creates proposed dispositions for all raw tags. It does not approve or delete any tag.

```bash
npm run education:anki:metadata:pipeline -- \
  --command=classify-legacy-tags \
  --taxonomy-version=0.1.0 \
  --confirm-classification=CREATE_PROPOSED_DISPOSITIONS
```

CasePrep paths are classified as workflow-only, source collections are separated,
nested navigation is identified, and broad labels remain ambiguous until
card-level resolution. No quarantine step is required.

## 8. Apply the narrow automated policy

Only anatomy and specialty assertions routed as low risk with calibrated confidence of at least 0.98 are eligible. Diagnosis and treatment remain human-reviewed.

```bash
npm run education:anki:metadata:pipeline -- \
  --command=apply-auto-policy \
  --run-key=<completed-run-key> \
  --confirm-auto-policy=ACCEPT_LOW_RISK_0_98
```

Do this only after validating the pilot against a clinician-reviewed sample.

### Codex-audited provisional review

When review is intentionally deferred to Anki, use policy
`codex_audit_provisional_v1`. It accepts only assertions marked good by the
versioned Codex audit artifact. Rejected and questionable assertions remain
outside the release. The resulting tag manifest must include a
`SnapOrtho::Workflow::Needs_Metadata_Review` marker so Anki decisions can later
promote, edit, or remove tags without losing assertion provenance.

## 9. Create a draft metadata release

```bash
npm run education:anki:metadata:pipeline -- \
  --command=create-metadata-release \
  --run-key=<completed-run-key> \
  --metadata-release-key=snaportho-metadata-0.1.0 \
  --metadata-release-version=0.1.0-draft \
  --confirm-release=CREATE_DRAFT_METADATA_RELEASE
```

Only accepted assertions can enter the release. The release remains a draft.

## 10. Render the Anki tags

Preview:

```bash
npm run education:anki:metadata:pipeline -- \
  --command=render-tags \
  --metadata-release-key=snaportho-metadata-0.1.0
```

Persist a draft shadow manifest:

```bash
npm run education:anki:metadata:pipeline -- \
  --command=render-tags \
  --metadata-release-key=snaportho-metadata-0.1.0 \
  --persist=true \
  --confirm-render=PERSIST_DRAFT_TAG_MANIFEST
```

The manifest is deterministic and remains unpublished. Public `.apkg` or add-on delivery should consume only a separately validated and published rendered manifest.

## Operational cautions

- Prefer the Codex packet workflow when avoiding separately billed API usage.
- For API mode, start with 25–100 cards to measure accuracy, latency, token use, and cost.
- Do not raise concurrency aggressively; each card can invoke four facet agents plus critics.
- A run changing model, taxonomy, prompts, rules, or limits is a new calibration condition.
- Never distribute the Supabase service-role key to workers outside the trusted operator environment.
- Never accept diagnosis or treatment because it is merely typical for the card’s anatomy.
- Do not publish a tag manifest until the human-review queues and identity-preservation checks are complete.
