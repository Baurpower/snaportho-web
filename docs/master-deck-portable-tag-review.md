# Portable master-deck tag review

This workflow reviews every SnapOrtho master-deck note through immutable, provider-neutral JSON batches. The authoritative input is a published `anki_sync_v2_releases` release and its pinned `anki_sync_v2_note_versions`; imported Marty McFlyin `anki_note_tags` are not a valid review source.

The current exporter emits `snaportho-portable-tag-review-packet.2` files that join each official note to a `canonical_card_version_id` by GUID, then lease a `metadata_pipeline_batches` row. Import those packets with `education:anki:review:import`. The Grok operator loop is `docs/education/grok-tag-master-deck.md`.

## Review objective

For every card, determine the smallest useful set of governed tags describing its primary teaching subject. Do not extract every entity mentioned in the text.

Use all four signals, in this order:

1. The question and cloze target establish what the learner is expected to recall.
2. The answer and explanation disambiguate the target but often contain incidental entities.
3. The deck path provides strong topic context but is not proof of a diagnosis or treatment.
4. Original tags are weak historical evidence and may be wrong.

### Inclusion rules

- Anatomy: include a structure when identifying, locating, testing, injuring, approaching, or protecting that structure is a teaching target.
- Diagnosis: include the condition the card teaches, not every differential diagnosis or complication mentioned.
- Treatment: include a procedure, approach, implant, or management principle only when the learner is being taught about it.
- Specialty: include the central clinical domain. Multiple specialties are allowed when independently useful, such as Trauma plus Foot and Ankle.

### Exclusion rules

- Do not tag every muscle origin or insertion structure as a separate anatomical subject.
- Do not tag anatomy appearing only in an examination maneuver unless the structure itself is being tested.
- Do not tag a ruled-out tumor, complication, structure at risk, or comparison item as the primary topic.
- Do not force a facet when none of its candidates is supported.
- Never invent a new tag inside a packet. Missing taxonomy concepts must be returned for taxonomy review outside the packet.

Every assertion must use an allowed candidate `termId` and an exact quote from `front` or `back`. The packet checksum protects identities, text, deck path, original tags, and candidate lists.

## Create resumable batches from the authoritative versioned deck

```bash
npm run education:anki:review:sync-v2:prepare -- \
  --release-version=0.0.3 \
  --cohort-size=100 \
  --agents=5 \
  --taxonomy-limit=20 \
  --out=tmp/grok-tag-review/0.0.3/cohort-000001
```

The exporter joins official sync-v2 notes to the published `anki_deck_releases` inventory by GUID, leases five 20-note packets, and writes `*-pending.json` files plus `manifest.json`. Re-running the same run key skips completed or reserved card versions.

## Give a packet to any reviewer

Tell the reviewer:

> Follow the packet's `instructions` exactly. Review every card. Modify only the top-level `reviewer` object and each card's `assertions`. Return valid JSON with all other fields byte-for-byte semantically unchanged.

The completed packet must include:

```json
"reviewer": {
  "provider": "anthropic",
  "model": "claude-model-name",
  "reviewedAt": "2026-08-01T12:00:00.000Z"
}
```

Use `openai`, `xai`, `anthropic`, `human`, or another truthful provider identifier. Never claim a provider or model that did not perform the review.

## Validate and import one completed batch

```bash
npm run education:anki:review:import -- \
  --input=tmp/portable-tag-review/cohort-000001/cohort-000001-agent-01.json
```

Import fails closed if identity, content, deck path, taxonomy candidates, batch membership, evidence quotes, or checksum changed. Successful imports checkpoint every card and mark the batch complete. Assertions remain `proposed` by default.

## Resume and monitor

```bash
npm run education:anki:review:status -- \
  --run-key=snaportho-portable-full-review-v1
```

Generate another cohort with the same run key until no unprocessed cards remain. Interrupted or invalid packets can be corrected and re-imported without redoing completed batches.

## Acceptance and publication

Do not accept or publish directly from provider output. After all 5,095 cards are complete:

1. Run the whole-deck tag audit.
2. Resolve taxonomy collisions and missing concepts.
3. Compare provider agreement on a calibration sample and all high-risk diagnosis/treatment assertions.
4. Accept reviewed assertions into a new metadata release.
5. Render a leaf-only draft manifest.
6. Require 100% card coverage, assertion provenance, zero governed-path collisions, and a clean publication diff.

The current published manifest is immutable and must never be repaired in place.
