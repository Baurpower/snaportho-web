# Legacy → Canonical Retargeting — Apply Report

Generated: 2026-06-29T14:15:17.123Z

## Run context

- mode: apply
- nodeScope: trauma-distal-radius-fractures
- appliedProposals: 1
- insertedCards: 0
- insertedQuestions: 41
- dupesSkipped: 0
- rollback_batch_keys: ["retarget:trauma-distal-radius-fractures"]

## Card coverage

- Total active cards: 5095
- Canonical-mapped cards: 377
- Legacy-only cards: 734
- Dual-mapped cards: 377
- Unmapped cards: 3984

## Question coverage

- Total active questions: 7557
- Canonical-mapped questions: 1801
- Legacy-only questions: 5756
- Dual-mapped questions: 1801
- Unmapped questions: 0

## Projected product coverage

- Cards now reachable via canonical entities: 377 (7.4% of active cards).
- Questions now reachable via canonical entities: 1801 (23.8% of active questions).
- Legacy mappings remain fully intact; reads still fall back to legacy where no canonical mapping exists.

## Rollback

### Batch `retarget:trauma-distal-radius-fractures`

Soft rollback (reversible, recommended):
```
node --experimental-strip-types scripts/apply-legacy-retargeting.ts --rollback retarget:trauma-distal-radius-fractures
```
Hard delete (irreversible):
```sql
delete from public.card_canonical_entity_links where rollback_batch_key = 'retarget:trauma-distal-radius-fractures';
delete from public.question_canonical_entity_links where rollback_batch_key = 'retarget:trauma-distal-radius-fractures';
```

