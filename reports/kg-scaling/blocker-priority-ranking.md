# Blocker Priority Ranking

Generated: 2026-07-16T03:52:39.397Z

Formula: `(estimatedUnlockCount * 5) + (estimatedPublicationUnlocks * 10) + (estimatedDatabaseVerifiedUnlocks * 3) - estimatedResolutionCost`. Cost scale: trivial 1, small 5, moderate 15, major 30.

1. **CURRICULUM_BRIDGE_NODE_MISSING** (ready_for_review) — ROI 79; clears 14 blocker instances and directly unlocks 8 database verification(s).
2. **PUBLICATION_ATTENDING_REVIEW_PENDING** (ready_for_review) — ROI 70; clears 20 blocker instances and directly unlocks 0 database verification(s).
3. **PUBLICATION_CLINICAL_REVIEW_PENDING** (ready_for_review) — ROI 70; clears 20 blocker instances and directly unlocks 0 database verification(s).
4. **PUBLICATION_RECORD_LEVEL_PROVENANCE_GAP** (ready_for_review) — ROI 25; clears 8 blocker instances and directly unlocks 0 database verification(s).
5. **LABRUM_NAMESPACE_COLLISION** (ready_for_review) — ROI 15; clears 6 blocker instances and directly unlocks 0 database verification(s).
6. **AGGREGATE_APPLY_PROVENANCE_GAP** (ready_for_review) — ROI -10; clears 1 blocker instances and directly unlocks 0 database verification(s).
7. **POLYETHYLENE_CONDITION_PROCEDURE_OWNERSHIP_MISMATCH** (ready_for_review) — ROI -10; clears 1 blocker instances and directly unlocks 0 database verification(s).
8. **HIP_OA_RELATIONSHIP_APPLY_GAP** (ready_for_review) — ROI -22; clears 1 blocker instances and directly unlocks 1 database verification(s).
9. **PUBLICATION_DATABASE_STATE_STALE** (resolved) — ROI 95; clears 20 blocker instances and directly unlocks 0 database verification(s).
10. **EXTENSOR_MECHANISM_PROPOSAL_DRIFT** (resolved) — ROI 86; clears 14 blocker instances and directly unlocks 7 database verification(s).
11. **AC_JOINT_PROPOSAL_DRIFT** (resolved) — ROI 0; clears 1 blocker instances and directly unlocks 0 database verification(s).
