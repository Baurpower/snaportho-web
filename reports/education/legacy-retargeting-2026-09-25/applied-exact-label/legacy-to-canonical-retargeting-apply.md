# Legacy → Canonical Retargeting — Apply Report

Generated: 2026-09-25T02:27:26.531Z

## Run context

- mode: apply
- nodeScope: all
- appliedProposals: 7
- insertedCards: 5
- insertedQuestions: 130
- dupesSkipped: 0
- rollback_batch_keys: ["retarget:trauma-patella-fracture","retarget:hand-carpal-tunnel-syndrome","retarget:foot-ankle-achilles-tendon-rupture","retarget:knee-sports-pcl-injury","retarget:foot-ankle-lisfranc-injury","retarget:hand-scaphoid-fracture"]

## Card coverage

- Total active cards: 5095
- Canonical-mapped cards: 3483
- Legacy-only cards: 123
- Dual-mapped cards: 988
- Unmapped cards: 1489

## Question coverage

- Total active questions: 7557
- Canonical-mapped questions: 1931
- Legacy-only questions: 5626
- Dual-mapped questions: 1931
- Unmapped questions: 0

## Projected product coverage

- Cards now reachable via canonical entities: 3483 (68.4% of active cards).
- Questions now reachable via canonical entities: 1931 (25.6% of active questions).
- Legacy mappings remain fully intact; reads still fall back to legacy where no canonical mapping exists.

## Rollback

### Batch `retarget:trauma-patella-fracture`

Soft rollback (reversible, recommended):
```
node --experimental-strip-types scripts/apply-legacy-retargeting.ts --rollback retarget:trauma-patella-fracture
```
Hard delete (irreversible):
```sql
delete from public.card_canonical_entity_links where rollback_batch_key = 'retarget:trauma-patella-fracture';
delete from public.question_canonical_entity_links where rollback_batch_key = 'retarget:trauma-patella-fracture';
```

### Batch `retarget:hand-carpal-tunnel-syndrome`

Soft rollback (reversible, recommended):
```
node --experimental-strip-types scripts/apply-legacy-retargeting.ts --rollback retarget:hand-carpal-tunnel-syndrome
```
Hard delete (irreversible):
```sql
delete from public.card_canonical_entity_links where rollback_batch_key = 'retarget:hand-carpal-tunnel-syndrome';
delete from public.question_canonical_entity_links where rollback_batch_key = 'retarget:hand-carpal-tunnel-syndrome';
```

### Batch `retarget:foot-ankle-achilles-tendon-rupture`

Soft rollback (reversible, recommended):
```
node --experimental-strip-types scripts/apply-legacy-retargeting.ts --rollback retarget:foot-ankle-achilles-tendon-rupture
```
Hard delete (irreversible):
```sql
delete from public.card_canonical_entity_links where rollback_batch_key = 'retarget:foot-ankle-achilles-tendon-rupture';
delete from public.question_canonical_entity_links where rollback_batch_key = 'retarget:foot-ankle-achilles-tendon-rupture';
```

### Batch `retarget:knee-sports-pcl-injury`

Soft rollback (reversible, recommended):
```
node --experimental-strip-types scripts/apply-legacy-retargeting.ts --rollback retarget:knee-sports-pcl-injury
```
Hard delete (irreversible):
```sql
delete from public.card_canonical_entity_links where rollback_batch_key = 'retarget:knee-sports-pcl-injury';
delete from public.question_canonical_entity_links where rollback_batch_key = 'retarget:knee-sports-pcl-injury';
```

### Batch `retarget:foot-ankle-lisfranc-injury`

Soft rollback (reversible, recommended):
```
node --experimental-strip-types scripts/apply-legacy-retargeting.ts --rollback retarget:foot-ankle-lisfranc-injury
```
Hard delete (irreversible):
```sql
delete from public.card_canonical_entity_links where rollback_batch_key = 'retarget:foot-ankle-lisfranc-injury';
delete from public.question_canonical_entity_links where rollback_batch_key = 'retarget:foot-ankle-lisfranc-injury';
```

### Batch `retarget:hand-scaphoid-fracture`

Soft rollback (reversible, recommended):
```
node --experimental-strip-types scripts/apply-legacy-retargeting.ts --rollback retarget:hand-scaphoid-fracture
```
Hard delete (irreversible):
```sql
delete from public.card_canonical_entity_links where rollback_batch_key = 'retarget:hand-scaphoid-fracture';
delete from public.question_canonical_entity_links where rollback_batch_key = 'retarget:hand-scaphoid-fracture';
```

