# Anki Mapping Readiness Report

Import batch: `4bc171ba-2264-4805-918c-762b5b5d19c6`

## Summary

The imported Anki dataset is ready for deterministic knowledge-graph mapping. The import itself is structurally healthy: `5,095` canonical cards, `5,095` current canonical versions, `5,095` current quality-review rows, `0` missing current versions, `0` duplicate GUIDs, and `0` duplicate canonical keys.

The main P0 mapping risk is not relational integrity. It is metadata quality concentration in a subset of cards with source-only or overly broad tags. Out of `5,095` cards, `834` are weakly tagged:

- `684` `source_only_tags`
- `144` `broad_only_tags`
- `6` `no_tags`

Deck-path and tag specialty disagreement was not a meaningful problem in this batch. The heuristic audit found `0` deck/tag specialty conflicts, which means the biggest leverage is tag cleanup and deterministic aliasing, not cross-source reconciliation.

## Canonical Structure Audit

The imported canonical layer is in good shape for the next phase:

- `canonical_cards`: `5,095`
- `canonical_cards` missing `current_version_id`: `0`
- current `card_quality_reviews`: `5,095`
- `card_training_level_links`: `0` by design
- `v_anki_cards_for_review` rows: `5,095`
- `v_anki_unreviewed_quality_cards` rows: `5,095`

Interpretation:

- Every imported card is tied to a canonical card.
- Every canonical card has one current version pointer.
- Quality reviews are effectively one-to-one with canonical cards.
- Training-level review infrastructure exists but has not been populated yet, which is appropriate for this stage.

## Mapping Readiness

High-signal deterministic mapping should start with branches that already have clean topic-style tags and strong deck hierarchy. Best first targets:

1. `Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Upper Extremity` (`178` cards, `100%` clean-topic-tag coverage)
2. `Marty McFlyin's Ortho Deck::3) OrthoBullets::Shoulder & Elbow::Shoulder` (`159`)
3. `Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity` (`142`)
4. `Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::General Trauma` (`140`)
5. `Marty McFlyin's Ortho Deck::2) Pocket Pimped::14 Pediatrics::14.05 Lower Extremity` (`104`)
6. `Marty McFlyin's Ortho Deck::3) OrthoBullets::Recon::Hip Reconstruction` (`92`)
7. `Marty McFlyin's Ortho Deck::3) OrthoBullets::Knee & Sports::Knee` (`92`)
8. `Marty McFlyin's Ortho Deck::3) OrthoBullets::Pediatrics::Pediatric Syndromes` (`84`)
9. `Marty McFlyin's Ortho Deck::3) OrthoBullets::Basic Science::MSK Science` (`83`)
10. `Marty McFlyin's Ortho Deck::2) Pocket Pimped::06 Hand::06.02 Hand Conditions` (`81`)

These branches are attractive because the deck path and tag vocabulary already encode usable specialty/topic signals without needing LLM interpretation.

## Tag Quality Audit

The deck has a useful tag layer, but it mixes several tag roles that should be separated before or during mapping:

- topic-like tags
- source/provenance tags
- broad curriculum bucket tags
- deck-navigation tags

### Likely source-only tags

These should generally become provenance or alias metadata, not canonical topic mappings:

- `SnapOrtho::CasePrep::brobot_decks_distal_radius_orif` (`2,332` cards)
- `SnapOrtho::CasePrep` (`2,332`)
- `PocketPimped` (`1,466`)
- `NettersConciseOrthopaedicAnatomy` (`1,173`)
- `Orthobullets` (`107`)
- `Ortho::AAOSResStudy::AdultReconstruction` (`31`)
- `Ortho::AAOSResStudy::ShoulderAndElbow` (`24`)

### Likely topic tags

These are the most useful deterministic mapping handles to map into curriculum nodes and aliases first:

- `GeneralAnatomy` (`372` cards)
- `Pediatric::Pediatrics` (`369`)
- `FootAnkle` (`292`)
- `ShoulderAndElbow::Shoulder` (`269`)
- `LowerExtremity::Knee` (`266`)
- `Leg::LegKnee` (`189`)
- `Forearm` (`176`)
- `UpperExtremity` (`170`)
- `TheBasics` (`167`)
- `Pelvis` (`163`)
- `GeneralTrauma` (`140`)
- `ThighHip` (`129`)
- `PhysicalExam` (`71`)
- `CompartmentSyndrome` (`48`)

### Normalization candidates

These are good P0 alias-normalization wins because they create duplicate deterministic match paths for the same concept:

- `Trauma` / `trauma` (`594` combined cards)
- `Trauma::TraumaFemoralShaft` / `trauma::TraumaFemoralShaft` (`23`)
- `Trauma::TraumaAnkle` / `trauma::TraumaAnkle` (`22`)
- `Trauma::TraumaPelvicRing` / `trauma::TraumaPelvicRing` (`17`)
- `Trauma::TraumaHumerus` / `trauma::TraumaHumerus` (`16`)
- `Trauma::TraumaCalcaneus` / `trauma::TraumaCalcaneus` (`15`)
- `Trauma::TraumaFemoralHeadandNeck` / `trauma::TraumaFemoralHeadandNeck` (`14`)

Recommendation: normalize tag matching case-insensitively and preserve raw variants as aliases rather than forcing destructive source-tag rewrites.

## Weakly Tagged Cards

Weak tagging is concentrated rather than random. The most affected branches are:

1. `Marty McFlyin's Ortho Deck::1) Netter's Concise Orthopaedic Anatomy::02 Spine::02.08 Muscles` (`50/50` weak)
2. `Marty McFlyin's Ortho Deck::1) Netter's Concise Orthopaedic Anatomy::06 Hand::06.12 Muscles` (`49/49`)
3. `Marty McFlyin's Ortho Deck::4) Hip and Knee Book::Knee Chapters::Basic Concepts of TKA` (`36/36`)
4. `Marty McFlyin's Ortho Deck::1) Netter's Concise Orthopaedic Anatomy::05 Forearm::05.11 Muscles` (`36/113`)
5. `Marty McFlyin's Ortho Deck::1) Netter's Concise Orthopaedic Anatomy::01 Basic Science::01.01 Bones` (`35/36`)
6. `Marty McFlyin's Ortho Deck::5) AAOS Res Study::Adult Reconstruction` (`31/31`)
7. `Marty McFlyin's Ortho Deck::1) Netter's Concise Orthopaedic Anatomy::08 Thigh/Hip::08.10 Muscles` (`27/96`)
8. `Marty McFlyin's Ortho Deck::5) AAOS Res Study::Shoulder and Elbow` (`24/24`)

Pattern summary:

- Netter branches often have anatomy-region tags plus source/deck tags, but no sufficiently specific topic tags.
- AAOS Res Study and Hip/Knee Book branches often have only source/path tags.
- These branches are still mappable, but they should be mapped by deck hierarchy plus alias rules, not by raw tag trust alone.

## Duplicate-Like Cards

Potential duplicate content is common enough to matter for later review batching, but it is not a blocker for deterministic KG mapping. The audit found `159` duplicate groups in `v_anki_potential_duplicates`.

Representative duplicate clusters:

- repeated anatomy muscle cards appearing `4x` across Netter branches
- repeated tumor staging cards appearing `4x`
- repeated trauma concept cards appearing `2x`

Examples:

- `abductor pollicis brevis ...` appears in a `4`-card duplicate cluster
- `AJCC staging system ...` appears in a `4`-card duplicate cluster
- `Monteggia fracture ...` appears in a `2`-card duplicate cluster

Recommendation: keep duplicates in scope for later card-quality review and merge/split decisions, but do not block KG mapping on deduplication.

## Media and Parsing Caveats

Media references are present and useful for future review workflows:

- image refs: `7,677`
- other refs: `2`

However, the APKG media manifest warning remains:

- matched package refs: `0`
- unmatched package refs: `7,679`

This is not a blocker for deterministic curriculum mapping because mapping will rely on deck hierarchy, tags, and note fields first. It does mean media-package verification should stay a later technical task.

## Import Performance Hardening

The current importer was spending most of its time updating `canonical_cards.current_version_id` one row at a time after version upserts. That path has now been hardened in code to use chunked bulk upserts against `canonical_cards` instead of per-card updates.

Expected effect:

- future imports should avoid the prior long tail in the current-version update phase
- runtime should now be dominated more by APKG extraction, SQLite parsing, and media-ref extraction than by Supabase write chatter

## Recommended Deterministic Mapping Order

1. Map clean Orthobullets branches first using deck hierarchy plus topic-like tags.
2. Map Pocket Pimped branches with high topic-tag coverage next.
3. Add case-insensitive tag alias normalization, starting with `Trauma` and other duplicated-case families.
4. Map Netter anatomy branches using deck path as the primary signal and tags as secondary evidence.
5. Treat source-only tags as provenance metadata, not as canonical topic assignments.
6. Hold AAOS Res Study and Hip/Knee Book branches for explicit alias/dictionary rules after the high-signal branches are done.

## Final Readiness Call

The dataset is ready for deterministic KG mapping.

There are no true blockers in the imported canonical data. The remaining work is mapping hygiene:

- separate source-only tags from curriculum/topic tags
- add alias normalization for case/casing variants
- prioritize high-signal branches first
- use deck-path-driven rules for weakly tagged anatomy and book-source branches

Recommended first cleanup during mapping:

- normalize `Trauma`/`trauma`-style duplicates into alias tables
- create deterministic source-tag denylist or provenance-tag classifier
- batch-review weak branches by deck branch, not card-by-card

Recommended not to do yet:

- LLM classification
- embeddings
- card rewriting
- Orthobullets/ROCK linkage

Those should follow only after deterministic topic-node coverage is established on the highest-signal branches.
