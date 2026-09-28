# Step 6 Decision Package Manifest

All files validate (`validateDecisions`, 0 errors) and dry-run clean
against the full live snapshot except documented skips.

| File | N | Dry-run |
|---|---|---|
| `decisions/safe-aliases.json` | 70 | 68 add, 2 skip (ORIF + Acetabular blocked behind governance twins — fail-closed proof) |
| `decisions/safe-promotions.json` | 107 | 107 create, 0 collisions (exact + folded + alias) |
| `decisions/safe-rejections.json` | 179 | 179 record (157 pipeline + 22 slice) |
| `decisions/proposal-merges.json` | 2 | 2× `merge_head_missing` — SEPARATE RUN, blocked pre-backfill (offline IDs not live) |
| `decisions/governance-merge-evidence.json` | 19 pairs | EVIDENCE ONLY — no sanctioned executor; all 19 explicitly deferred (69 claim + 236 card repoints scoped) |

Deferred (never mutate): 1,041 live DEFER + 474 unreviewed promotes +
42 unreviewed merges + all governance pairs.

Sequencing: migrations (incl. symptom type) → aliases(68+2skip) →
rejects → promotions → merges separate (post-backfill) → pass-2 aliases
to new canonicals ("Musculocutaneous", "Chauffer's fracture" — after
fetching new IDs). Offline proposal IDs have no live kg linkage: edge
repoints are 0-count pre-backfill (correct — no live proposed edges);
proposal review-state updates touch 0 rows (silent); durable record =
`entity_review_decisions` rows with offline IDs preserved.
