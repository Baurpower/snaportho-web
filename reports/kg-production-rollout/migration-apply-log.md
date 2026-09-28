# Migration Apply Log (Phase 3C Steps 7–10)

## Step 7 — composition analysis (static; no DB write yet)

Chain (version order): `20260927170000` (Phase 1) → `20260927240000`
(Phase 2a) → `20260927250000` (Phase 2b) → `20260927260000` (Phase 3) →
`20260927270000` (trusted view, 3B addition — required by Step 11) →
`20260927280000` (symptom type, 3C Step 4) → `20260927281000` (Phase 3
RLS hardening, 3C Step 7 finding) → `20260927282000` (nullable claim
primaries, 3C Step 20/22 enabler — without it 2,591 backfill inserts
violate NOT NULL; legacy fingerprint stays NULL-safe via concat_ws).

- Dependency ordering: all cross-migration references resolve in order
  (2b needs Phase 1 fn; RLS needs Phase 3 tables). External deps verified
  present: `card_claim_backfill_items` (live), `educational_metadata_is_safe`
  (20260720), `tg_set_updated_at` (20260626), pgcrypto (Supabase standard).
- Function replacements diff-verified: `incorporate_anki_workspace_proposal`
  changes ONLY the trust guard (and 0 live rows flip allowed→denied);
  `commit_orthobullets_machine_claim` adds ONLY semantic stamping
  (assertion-dedup untouched). No intermediate definers exist for either.
- Trigger compatibility: Phase 1 replaces sync trigger FUNCTIONS only —
  correct, because the triggers already exist live
  (`sync_educational_claim_fingerprint` BEFORE INSERT OR UPDATE, from
  20260919/20260926194551, calling the same function names). Post-apply,
  existing triggers fill BOTH legacy and semantic hashes; the backfill
  runner's TS/SQL parity gate passes. No attach migration needed.
- Indexes: new merge-key unique index pre-checked collision-free via the
  TS twin over all 2,113 live claims (1,974 covered, 0 collisions; 67
  pure-semantic dup members expected as review candidates). Old
  fingerprint index dropped `if exists`.
- RLS: Phase 2 tables service_role-only; Phase 3 gap closed by 281000
  before any rows land; Phase 1 fns service_role-only.
- Constraints: claim_entities target/role/kind discipline + FKs (note:
  `proposed_proposal_id` FK requires LIVE kg rows — offline UUIDs cannot
  be written; backfill must create kg proposals or write `unresolved`).
- Backfills/runtime: 2,113-row deterministic updates + small index builds;
  brief exclusive locks, negligible impact.
- Verification split (required by check semantics): C2 needs populated
  edges (fails vacuously pre-backfill); L4 has 1 pre-existing breach
  (ORIF ×2, carried to governance); P1 has ~1,046 pre-existing rows
  (OrthoBullets-machine entities, 90-day window). Steps 8–10 verify the
  migration-scoped subset (objects exist, parity zero, legacy intact, no
  NEW breaches); the FULL suite gates at Step 21. P5 updated for `symptom`.
- SQL/TS parity: live data is fully string-typed (0 non-string qualifier
  values, 0 nulls) so parity holds on current rows; latent gap noted
  (TS drops non-string qualifier scalars, SQL includes them).

## Steps 8–10 — APPLY (executed 2026-09-28, verified post-apply)

APPLIED from the controlled workdir recorded in `/tmp/snaportho-release-dir`
(`/tmp/snaportho-release.OS2d6S`), via user-terminal `supabase db push`
(normal pipeline; see `migration-history-and-release-procedure.md` for why
a plain `--include-all` push is forbidden). Nine migrations newly applied:

- `20260927170000` (Phase 1 semantic identity, incl. the controlled
  immutable-trigger disable/restore around the version backfill)
- `20260927240000` (Phase 2a atomic claim entities)
- `20260927250000` (Phase 2b assertion merge key; drops the old
  fingerprint-only uidx by design)
- `20260927260000` (Phase 3 aliases + decisions)
- `20260927270000` (trusted-entity view + helper + incorporate guard repair)
- `20260927280000` (symptom entity type)
- `20260927281000` (Phase 3 RLS hardening)
- `20260927282000` (nullable claim primaries)
- `20260928141904` (trusted-entity slug repair, 3 rows)

Three older local files were renamed (content-identical, 0-line diff) to
match their existing production ledger timestamps:

- `20260822041340_repair_program_calendar_connections.sql`
- `20260822153223_align_google_call_source_with_call_hub.sql`
- `20260823155444_atomic_weekly_plan_saves.sql`

Post-apply verification (read-only, 2026-09-28):

- Remote ledger holds exactly the 22 controlled versions (9 new + 3
  renamed + 10 pre-existing); all 22 workdir files are byte-identical to
  the repo tree, including the trigger-restore hunk in `20260927170000`.
- Both Phase-2 merge-key uidxes present; old fingerprint uidx gone;
  `guard_educational_claim_versions_immutable` present AND enabled
  (post-migration restore confirmed).
- Migration-scoped subset green: objects exist, semantic parity 0,
  legacy hashes intact, no new breaches (P1 ~1,046 and L4 ORIF×2 are
  pre-existing, carried as predicted; full-suite results in
  `final-production-baseline.md`).
