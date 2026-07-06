# Ankle Pilot — Schema Readiness Decision

**Date:** 2026-07-05  
**Decision:** **Option B** — small additive migration required before DB apply

## What works today without migration

| Capability | Status |
|------------|--------|
| `canonical_entities` for condition, procedure, anatomy, classification_system, imaging_finding, complication, biomechanics_concept | ✅ Existing CHECK |
| `kg_automation_proposals` for entities + relationships | ✅ Proposal workflow exists |
| `card_canonical_entity_links` / legacy retargeting | ✅ 12 cards + 98 questions mapped to `trauma-ankle-fractures` node |
| Relationship metadata in `canonical_relationships.metadata` JSONB | ✅ No new columns required |
| Claim/DP drafts as **file packets** | ✅ `reports/kg-pilots/ankle-proposal-packet.json` |

## Migration gaps blocking DB apply

| Gap | Impact |
|-----|--------|
| Entity types `classification_grade`, `fixation_method` not in DB CHECK | Weber A/B/C and ORIF fixation proposals rejected |
| Predicates `injured_in`, `at_risk_structure`, `has_imaging_finding`, `has_grade`, `uses_fixation`, `explains_instability`, `part_of`, `articulates_with`, `inserts_on` not in DB CHECK | Relationship apply fails |
| `kg_automation_proposals.proposed_predicate` CHECK out of sync | Proposal insert fails for new predicates |
| No `educational_claims` / `decision_points` tables | Claims/DPs cannot live in canonical store yet (file drafts OK) |

## Designed migration (not applied)

**Path:** `supabase/migrations/20260705_120000_ankle_pilot_kg_vocabulary.sql`

**Rollback:** Drop `educational_claims`, `decision_points`; restore prior CHECK constraints from `20260628_150000_kg_relationship_vocabulary_hardening.sql`.

**Tests after apply:**

```bash
node --experimental-strip-types scripts/lib/education/kg-relationship-registry.test.ts
npm run typecheck
npm run kg:pilot:ankle:proposals
npm run kg:pilot:ankle:quality
```

## Interim pilot strategy (pre-migration)

1. Generate proposals to JSON (`ankle-proposal-packet.json`) — **done**
2. Human review via `ankle-review-packet.md` — **in progress**
3. Do **not** call `apply-approved-kg-automation-proposals.ts` until migration applied to staging
4. Claims/DPs remain `generated_draft` in packet metadata — never `verified`