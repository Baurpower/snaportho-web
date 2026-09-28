# Pre-Apply Baseline (Phase 3C Step 1)

Captured 2026-09-28 via read-only Supabase REST, two full passes. No drift
vs the Phase 3B `live-baseline-after.md` on any table. Migration history is
not exposed via REST; inferred from object presence (unchanged: all Phase
tables/columns still absent → Phase 1/2/3 still unapplied).

| Check | Pass 1 | Pass 2 | 3B baseline |
|---|---|---|---|
| canonical_cards total / active | 5,095 / 3,670 | — / — | match |
| educational_claims | 2,113 | — | match |
| educational_claim_versions | 2,113 | — | match |
| card_claim_links | 19 | — | match |
| canonical_entities | 1,295 | — | match |
| trusted (active+approved) | — | 1,087 | match |
| kg_automation_proposals | — | 7,421 | match |
| card_canonical_entity_links | — | 8,800 | match |
| canonical_entity_aliases | — | DOES NOT EXIST | match |
| semantic_fingerprint_hash | — | absent | match |

Verdict: NO MATERIAL DRIFT. Cleared to proceed to migration composition.
Note: direct postgres (port 5432) is unreachable from the agent sandbox
(DNS blocked; only HTTPS via proxy works), so migration apply + pg-based
runners require either user-terminal execution or an escalated-network
session. Row reads via PostgREST are unaffected.
