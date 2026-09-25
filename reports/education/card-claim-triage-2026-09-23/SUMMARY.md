# Card-claim triage — 2026-09-23 backfill review (recommendations only)

Source run: `card-claim-backfill|7764b632-5622-4f1b-959d-1874908fc46d|2026-09-23.1`
(3,670 cards). No writes were made by this triage; nothing was promoted,
deleted, or overwritten. Machine-readable companions in this directory:

- `ontology-proposal-review.json` — 857 rows (proposal_id, label, card_count,
  current_type, suggested_type(+confidence/reason), quality_class,
  canonical_match_candidate, duplicate_cluster, review_priority,
  recommended_action, reason, sample_claims)
- `claim-conflict-review.json` — 70 rows with conflict_classification
- `unresolved-review.json` — 691 rows with verdict + verdict_reason
- `factory-failure-review.json` — 32 rows with verdict + verdict_reason

## 1. Proposal quality (857)

| quality_class | n | recommended_action |
|---|---|---|
| good_new_entity_candidate | 520 | approve_new_entity (review first) |
| answer_fragment | 116 | reject |
| malformed | 70 | reject |
| numeric_value | 60 | reject |
| too_generic | 54 | reject |
| needs_review | 18 | needs_review (acronyms, grade fragments) |
| possible_alias_of_existing | 12 | add_alias_to_existing |
| possible_duplicate_proposal | 4 | merge_proposals |
| boolean_or_placeholder | 3 | reject |

Review buckets: HIGH_PRIORITY 42 (12 alias candidates incl. 9 exact
case/plural folds the factory matcher missed, 4 dup pairs, multi-card goods),
MEDIUM_PRIORITY 498 (mostly single-card goods — sample, don't read all),
LOW_PRIORITY 14, AUTO_REJECT_CANDIDATE 303.

The general pattern behind the noise (no word blacklists used): cloze answers
that are **closed-class qualifiers, not concepts** — directional/comparative
modifiers (`anterior`, `higher`), `A or B` alternative picks (`venous`,
`females`), slash-hint picks (`compression`), booleans (`true/false/none`),
measurement values (`20-40`, `24 hours`), adjectival modifiers of a head noun
(`cortical`, `superficial`), multi-blank concatenations (`a2 and a4`,
`Upper/Middle`), and sentence captures (`allows for functional motion`).

## 2. Entity typing

`condition` was the default for all 857. Suggested re-typing from label
morphology first, claim context second, using the real 15-type taxonomy:

anatomy_structure 358 · condition 117 · procedure 46 · diagnostic_test 36 ·
implant 34 · classification_system 31 · exam_maneuver 28 ·
biomechanics_concept 27 · complication 15 · surgical_approach 5 ·
surgical_positioning 2 · **unknown 158**.

Clearly-wrong-`condition` examples now typed: `medial cuneiform`→anatomy,
`marginal excision`→procedure, `lag screw`→implant, `velpeau`→diagnostic_test,
`frykman`/`loder classification`→classification_system,
`durkan test`-family→exam_maneuver, `stiffness`→complication,
`external rotation`→biomechanics_concept.

Taxonomy gaps (kept as `unknown`, not forced): **medication**
(`penicillin`, `fluoroquinolones`, `rifampin`, `1st generation
cephalosporin`), **organism** (`pseudomonas`), **biomarker/lab**
(`osteocalcin`, `rankl`, `alpha-defensin`), **measurement/angle**
(`lateral patellofemoral angle`, `20-40`), **mechanism text**
(`prevents plasminogen activation`).

## 3. Duplicates / aliases / related

- Near-duplicate pairs (fold-normalized): `ceramic on ceramic` ×
  `ceramic-on-ceramic`; `dequervain s tenosynovitis` ×
  `de quervain s tenosynovitis`; `hla-b27` × `hlab27`; `l4-l5` × `l4/l5`.
- 12 alias candidates, 9 of them exact case/plural folds the factory failed
  to resolve (`ulna`→Ulna, `olecranon fracture`→Olecranon Fractures,
  `subscapularis`, `druj`→DRUJ, `patella baja`, `radial nerve`,
  `essex-lopresti injury`, `soft-tissue sarcoma`, `osteoid osteomas`,
  `chondrosarcomas`) plus `posterior wall fracture`→`Posterior Wall
  Acetabular Fracture` (overlap 0.75).
- Card-source misspellings caught by edit-distance-1 matching:
  `midhoot`→Midfoot, `lenohumeral`→(glenohumeral), `lenoid`→(glenoid),
  `raumatic`→(traumatic). These allege deck typos worth fixing at the source.
- Caution: exact-fold matches still need context check — `ulna` as an answer
  meant ulnar-artery branches, not the Ulna bone.
- Related-but-distinct (do NOT merge): `acl` / `acl deficient knee` /
  `acl rupture` / `anterior cruciate ligament tear` cluster; keep separate,
  link by relations later.

## 4. Top-25 proposals with recommendation

reject: posterior 9, anterior 9, lateral 4, higher 4, posterolateral 4,
supination 3, none 3, 20-40 3, false 3, true 3, 20-30 3, anterolateral 3,
compression 3, medial 2, intramembranous 2, pronation 2, females 2.
approve: external rotation 3, medial epicondyle 3, osteocalcin 2,
popliteus 2, peroneus brevis 2, sprengel s deformity 2.
needs_review (acronyms): mri 3, lucl 2.

## 5. High-frequency noise diagnosis (section 6)

`anterior/posterior/lateral/…` are directional **qualifiers of a head noun**,
not entities: the true concept is the noun phrase they modify (`anterior
bundle of the MUCL`, `posterior portal`, `higher risk of graft failure`).
Evidence: single-token closed-class modifiers; `A or B` / slash-hint picks;
modifier position in the claim. They are artifacts of cloze-answer-as-entity,
not legitimate anatomy and not parts of larger missing entities (the heads —
bundle, portal, risk — are generic words, correctly absent from the
ontology). General fix (NOT implemented): resolve the answer **plus its head
noun** as the candidate (`anterior bundle of the MUCL`), or suppress
closed-class qualifier answers from proposal generation. `higher`-family
additionally marks comparator answers (`higher/lower/similar`).

## 6. Claim conflicts (70) — harmless, keep existing

- ID/fingerprint_collision (cross-card, same fingerprint, different sentence):
  56. First card's insert wins; later cards flag needs_review. Collision
  groups are pairs (47), triples (19), one group of five.
- same_semantics_different_wording: 14 (reconstructed proposed text ≈ stored,
  jaccard ≥ 0.5).
- existing_manual_claim: 0. Same-card divergence: 0. All 70 existing rows are
  `generated_draft/unreviewed/machine_consensus` created inside the main run
  window — i.e. within-run collisions, not legacy disagreements.
Recommendation: keep_existing everywhere; no overwrite. The collision rate
(56/1989 ≈ 2.8%) is the fingerprint granularity limit: fingerprint covers the
claim core while claim_text varies by card context.

## 7. Factory failures (32) — all refusals stand

- negated_or_distractor 20 — includes true negations (`Clavicle` does NOT…,
  `should not` MPSS, `False` T/F cards, `No difference` study answers) and
  treatment-selection cards refused as distractor-like. Refusal SAFE (must not
  mint positive claims from negations), but this is the largest content loss;
  needs negation-aware extraction before any support.
- unbounded_text 6 — multi-blank mega-cards (classifications, exam
  checklists). Refusal CORRECT; needs per-blank splitting upstream.
- extraction_failed 3 — empty `{{c1:: }}` cloze bodies: broken source cards.
- qualifier_conflict 2 — left/right approach laterality: safe refuse, human
  adjudication.
- non_atomic 1 — Holstein-Lewis card: borderline, safe refuse.

## 8. Unresolved (691)

clause_like_answer 263 → correctly_unresolved (multi-answer lists; some embed
real entities — MCL/LCL — recoverable only via list-item splitting).
short_label 130 → correctly_unresolved (bare values/levels).
context_insufficient 177 → 31 anatomy-like + 21 condition-like true-gap
candidates (`Rhomboid muscles`, `Ligamentum mucosum`, `Morbid obesity`,
`Charcot Neuroarthropathy`, `Tarsal tunnel syndrome`) need human review; 8
treatment phrases + 117 other phrases correctly unresolved.
malformed 67 → 35 acronym-expansion forms (`Flexor hallucis longus (FHL)`,
`Transverse acetabular ligament (TAL)`, `SLAP`, `AFO`, `TBI`, `VISI`,
`PLRI`) fixable by paren/acronym normalization; 7 qualifier-parens; 25 mixed.
list_fragment 34, generic_term 11, numeric/placeholder 9 →
correctly_unresolved.
Totals: correctly_unresolved 572 · needs_human_review 79 ·
likely_fixable_with_alias 40.

Cross-evidence: `Lateral epicondyle` is a 2-card proposal AND unresolved
elsewhere; `Gustilo and Anderson Classification` misses canonical
`Gustilo-Anderson Classification` on the stopword `and` — normalization gaps,
not missing concepts.

## 9. Recommended single next change (not implemented)

**Normalize the answer before matching: strip parentheticals
(`Term (ACRONYM)` → try outer, inner, and outer+inner) and expand known
acronyms against canonical aliases.** This one generalizable improvement
touches the most review value with the least risk: ~35 malformed + part of
the 177 context_insufficient resolve to aliases (FHL, TAL, AFO, SLAP-family),
it explains 12 missed exact-fold aliases, and it converts acronym proposals
(`mri`, `acl`, `atfl`, `lucl`, `ct`) from dead-end proposals into alias
checks. No new heuristics, no word lists — string normalization plus the
existing alias table. Second priority (separate): negation-aware extraction
for the 20 refused negated cards.
