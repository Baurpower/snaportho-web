# Ontology Rulings (Phase 3C Steps 2–4)

## Plural folding (Step 2) — conservative inflection map, no stemming

Root cause of the 15 singular/plural canonical pairs: the applier's
promote recheck compared plain-lowercased labels, so "Fracture" never
matched "Fractures". Fixed in code (not data): normalization now folds
regular -s/-es plurals (tokens ≥4 chars), Greek -sis plurals
(-ses→-sis: diagnoses, prostheses, epiphyses, metastases), consonant -es
(abscesses, arches, sinuses), and a reviewed irregular map (menisci,
phalanges, vertebrae, bursae, cortices, apices, indices, calices, nares,
diagnoses). A 12-word unfoldable-singular denylist (lens, menses,
diabetes, species, series, forceps, facies, naris, pubis, cutis,
subcutis, herpes) plus -ss/-us/-ies/-sis/-lis guards blocks every known
false fold (diabetes→diabete, bases→basis, sinuses→sinusis,
metastases→metastase). -ies stays unfolded (recall loss accepted).

Fail-closed wiring: promote rechecks exact + folded + alias-folded keys;
alias creation re-reviews when its folded form equals a DIFFERENT
canonical's label (would split singular/plural across canonicals).
`GENERIC_PARTITIVES` gained folded forms (digit/finger/toe/hand/side).
127/127 entity-promotion tests green (11 new).

## MCL / LCL (Step 3) — RULING B: joint-dependent

Evidence (live claim context): LCL canonical's 3 primaries span ELBOW ×2
(radial-head association, LCL complex) + KNEE ×1 (varus thrust);
MCL's only primary is ELBOW (sublime tubercle) while knee-MCL claims
("femoral origin") exist in-corpus; UCL primaries span ELBOW + THUMB
(Gamekeeper's). All three acronyms are joint-dependent.

Implementation (no redesign): bare MCL/LCL/UCL aliases may only target
joint-unspecified canonicals; targeting a joint-qualified canonical is a
plan ERROR (`alias_joint_ambiguous`). The slice-2 MCL→ambiguous-canonical
alias stands as the documented interim. Full joint-qualified canonicals +
contextual resolution remain post-foundation governance (P3).

## Symptom type (Step 4) — ADD `symptom`, defer clinical_sign

Evidence: ~100/2,113 live claim texts carry symptom anchors (pain 64,
weakness 16, stiffness 13, paresthesia 7, numbness 6, swelling 6,
tingling 3); 48 proposals lexicon-match. No current type is adequate:
condition (disease ≠ complaint), complication (wrong temporality),
imaging_finding (wrong modality), exam_maneuver (the test, not the
result). The symptom↔condition edge (presenting complaint → diagnosis)
is load-bearing graph semantics, so the distinction earns its type.

Migration `20260927280000_add_symptom_entity_type.sql`: smallest additive
change (CHECK + 'symptom', no backfill). TS `CANONICAL_ENTITY_TYPES` +
both BroBot mirrors + inference rule (`symptom_head_noun`, 0.8, ordered
condition/complication → symptom → anatomy) updated with tests.
Examiner-observed non-radiographic signs stay DEFERRED (no forced
condition mapping); radiographic signs keep imaging_finding.
