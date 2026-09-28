# Knowledge Graph Target Architecture — 2026-09-27

Additive only. Every concept below maps onto an existing table except the four
marked NEW, which are new edge/history tables — no rewrites, no parallel
system.

```
SOURCE (external_sources; + future AAOS/textbook/journal rows)
  ↓
SOURCE ITEM (canonical_cards / external_questions / future article_sections)
  ↓
SOURCE ITEM VERSION (canonical_card_versions / NEW question_source_snapshots)
  ↓  teaches | tests_primary | tests_secondary | (mentions — NEW role, decided explicitly)
ATOMIC CLAIM (educational_claims, ONE unified assertion-inclusive fingerprint)
  ↓  immutable history
CLAIM VERSION (educational_claim_versions)
  ↓  claim_entities NEW (claim, entity, role, confidence) — replaces single-slot use
CANONICAL ENTITIES (canonical_entities; provisionals quarantined by status + SLA)
  ↓  existing canonical_relationships
DOMAIN RELATIONSHIPS
CLAIM ↔ CLAIM (NEW claim_relationships: supports/contradicts/supersedes/
  qualifies/prerequisite_for/equivalent_to + evidence + review state)
```

Concept→table map: SOURCE✓, SOURCE ITEM✓, SOURCE VERSION⚠ (cards✓,
questions NEW snapshots), CLAIM✓ (after identity unification), CLAIM
VERSION✓, SOURCE↔CLAIM EDGE✓ (roles locked; mentions explicitly
decided), CLAIM↔ENTITY✓ (single-slot today → NEW multi-edge),
CLAIM↔CLAIM✗ (NEW table).

Read paths change minimally: overlap matcher and BroBot gain claim inputs
from pinned releases; high-yield metrics are views over link counts
(anki_card_count, tested_count, source_count, subspecialty_count…) with raw
metrics kept separate from any composite score. Postgres remains sufficient:
projected full scale is ~10^4 claims, ~10^5 edges, all served by existing
btree/gin indexes; no graph database is indicated.
