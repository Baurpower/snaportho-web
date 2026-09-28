# Quality Review — Entity Promotion (Steps 18–20)

Reviewer: offline calibration review (claim-context adjudication). Method:
51-row stratified sample from the first-200 slice + exhaustive audit of every
ALIAS recommendation (interim 33 and final 21) + all-claims sense checks for
high-impact elisions (Femoral 10, Median 9, Ulnar 7, LCL 4).

## Mapping precision

- Final ALIAS set: 21/21 correct in full claim context (100% in-sample).
- Interim audit caught 8 false merges in 33 candidates (24%) across four
  classes; all fixed with matcher vetoes + recommender guards + regression
  tests:
  1. antonym substitution (Posterior→Anterior Interosseous Nerve) → antonym veto;
  2. hyponym/specificity (Facet joint capsules→Joint Capsule, LFCN→Femoral
     Nerve, medial femoral condyle→Femoral Condyles) → hyponym + specifying
     vetoes;
  3. pathology→structure (AIN palsy→AIN, neuropathy/instability/baja cases)
     → confident-pathology penalty + condition lexicon;
  4. acronym sense-split (LCL knee vs elbow) → joint-divergence deferral.
- Accepted tradeoff: single-claim MCL (elbow context) aliases to a
  joint-ambiguous "Medial Collateral Ligament" canonical — canonical
  joint-sense gap, flagged for ontology follow-up.

## Alias precision

- 21 alias recommendations, all verified; alias-type inference
  (elided_form/acronym/plural_variant/alternate_spelling/synonym) reviewed
  in applier tests. No alias collisions in the offline set.

## Type precision

- Inferred types replace an 89%-condition silent default with explicit rules;
  530 confident corrections exported. Spot precision on the sample: 49/51
  correct or acceptable; 2 fixed during review (Ceramic-on-ceramic stays
  condition pending an implant/bearing ruling — flagged, not mistyped;
  Gracilis Latin-fold bug fixed).
- Known gaps (deferred, not mistyped): medication, organism, symptom types
  have no enum home.

## False canonical merge rate

- 0 observed in the final recommendation set (was 8/33 pre-fix in the
  interim audit). The veto layer (antonym, hyponym, specifying, pathology
  penalty, elision gating, joint divergence) plus the applier's fail-closed
  recheck (promote→rereview when a canonical appears) bound this risk.

## Unresolved rate

- Edge-level unresolved: 2,014/6,270 (32.1%), unchanged by promotion work
  (no extractable phrase). Proposal-level: 1,040/1,924 deferred (54%),
  dominated by single-claim weak-signal labels awaiting full-DB recheck.

## Multi-entity claims (Step 19)

- Resolved entities per claim: 0: 2,014 (33.7%), 1: 3,711 (62.1%),
  2: 221 (3.7%), 3+: 30 (0.5%). No stuffing: every multi-entity claim pairs
  one teaches_about/tested_answer with context roles (max 6 edges).
- Redundancy note: hierarchical double-links (Distal Radius + Radius) and
  one canonical-canonical duplicate pair (Deep Posterior Compartment ×2)
  appear in multi-entity edges — consolidation backlog, not extraction error.

## Primary parity (Step 20)

- 3,962/5,976 claims have a matching edge for their primary; all 2,014 gaps
  are exactly the unresolved-edge claims. Production `primary_entity_id` FKs
  `canonical_entities`, so backfill must null (never proposal-point)
  primaries for unresolved claims. Verification query C2 gates this.
- One deterministic-sentinel primary (`00000000-0000-4000-8000-000000000001`)
  found in artifacts — data-quality note for the backfill author.
