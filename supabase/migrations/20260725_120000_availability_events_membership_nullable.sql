-- ============================================================================
-- Schema: allow null membership_id on availability parent/child tables
-- ============================================================================
-- Evidence (application + production inventory, 2026-07-25):
-- 1. createTimeOffEvent() accepts membershipId?: string | null and inserts null
--    for unclaimed roster residents (see src/lib/workspace/call/time-off.ts).
-- 2. Program batch time-off upload passes roster.program_membership_id ?? null
--    (src/app/api/program/time-off/batch/route.ts).
-- 3. TimeOffItem.membershipId is typed string | null; UI/query code treats
--    roster_id as the durable resident key for unclaimed residents.
-- 4. Houston Methodist TEST roster has many unclaimed residents (program_membership_id
--    is null) who still need program-entered time off.
--
-- This is intentionally separate from any data import. Do not bundle data writes here.
--
-- FK impact:
--   availability_events.membership_id -> program_memberships(id) ON DELETE CASCADE
--   availability_event_days.membership_id -> program_memberships(id) ON DELETE CASCADE
-- Null memberships do not participate in FK matching; claimed residents keep FKs.
--
-- Rollback considerations:
--   Re-adding NOT NULL requires zero null rows. Prefer leave nullable once deployed.
--   To reverse only if no nulls exist:
--     alter table public.availability_events
--       alter column membership_id set not null;
--     alter table public.availability_event_days
--       alter column membership_id set not null;
-- ============================================================================

begin;

alter table public.availability_events
  alter column membership_id drop not null;

alter table public.availability_event_days
  alter column membership_id drop not null;

commit;
