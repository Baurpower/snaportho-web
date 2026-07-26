-- ============================================================================
-- Read-only production diagnostics + rollback helpers for
-- Houston Methodist 2026-27 time-off import.
--
-- Safe to run against production. Does not modify data unless you
-- uncomment the explicit ROLLBACK block at the bottom.
-- ============================================================================

begin;
-- Force a read-only diagnostic pass for the SELECT sections.
-- (The optional rollback block is commented out and must be run separately.)

-- 1) Constraint definitions
-- Includes availability_events_source_kind_check,
-- availability_events_event_type_check,
-- availability_events_constraint_level_check,
-- availability_events_approval_status_check.
select
  c.conname,
  rel.relname as table_name,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class rel on rel.oid = c.conrelid
join pg_namespace n on n.oid = rel.relnamespace
where n.nspname = 'public'
  and rel.relname in ('availability_events', 'availability_event_days')
  and c.contype = 'c'
order by rel.relname, c.conname;

-- 2) membership_id nullability
select table_name, column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('availability_events', 'availability_event_days')
  and column_name = 'membership_id'
order by table_name;

-- 3) Target program
select id, slug, name
from public.programs
where id = '082cc352-bba2-4f19-b837-b28d0878a308';

-- 4) Roster membership coverage for import residents
with target_rosters(id) as (
  values
    ('b4ac3a24-4bc3-4c9c-96b5-e26172412cce'::uuid),
    ('5e5693c2-8fba-4ce7-a22d-2aa0a13aa43d'::uuid),
    ('35c02aee-d92d-488c-ad75-2c367a9a2c8c'::uuid),
    ('45fcc063-531f-4f08-9c79-30337e0e9f81'::uuid),
    ('d435e21d-51ea-4be2-8380-2dc1fe2924c4'::uuid),
    ('febc3314-03e3-4636-b57e-68ae4b1c9f23'::uuid),
    ('c734149a-d9e1-46c9-933b-04a5e80b6870'::uuid),
    ('64db16f0-ed52-4b4d-9343-ec370b638bdf'::uuid),
    ('79bb439f-c203-4c59-9b27-967ae70bf007'::uuid),
    ('c57c41db-a1e3-45b3-8f93-05a2bbbc4a80'::uuid),
    ('a047c66e-4398-45ef-ae9b-089077358d6d'::uuid),
    ('0f9ce84e-6460-4373-992e-a29a64e97a1b'::uuid),
    ('3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22'::uuid),
    ('c26a25a1-1a56-427b-a021-4732123797ff'::uuid)
)
select
  r.id as roster_id,
  r.full_name,
  r.program_id,
  r.program_membership_id,
  count(*) over () as roster_row_count
from target_rosters t
left join public.program_roster r on r.id = t.id
order by r.full_name nulls last;

-- 5) Existing import-tagged rows (post-import)
select
  count(*)::int as import_parent_count,
  count(*) filter (where membership_id is null)::int as null_membership_parents
from public.availability_events
where program_id = '082cc352-bba2-4f19-b837-b28d0878a308'
  and notes like '[snaportho-import:houston-methodist-2026-27:%';

select
  count(*)::int as import_day_count
from public.availability_event_days d
join public.availability_events e on e.id = d.event_id
where e.program_id = '082cc352-bba2-4f19-b837-b28d0878a308'
  and e.notes like '[snaportho-import:houston-methodist-2026-27:%';

-- 6) Counts by event_type / source_kind for import rows
select event_type, source_kind, count(*)::int as n
from public.availability_events
where program_id = '082cc352-bba2-4f19-b837-b28d0878a308'
  and notes like '[snaportho-import:houston-methodist-2026-27:%'
group by 1, 2
order by 1, 2;

-- 7) Overlaps among import-tagged parents for same roster
select
  a.roster_id,
  a.title as title_a,
  a.start_date as start_a,
  a.end_date as end_a,
  b.title as title_b,
  b.start_date as start_b,
  b.end_date as end_b
from public.availability_events a
join public.availability_events b
  on a.program_id = b.program_id
 and a.roster_id = b.roster_id
 and a.id < b.id
 and a.start_date <= b.end_date
 and a.end_date >= b.start_date
where a.program_id = '082cc352-bba2-4f19-b837-b28d0878a308'
  and a.notes like '[snaportho-import:houston-methodist-2026-27:%'
  and b.notes like '[snaportho-import:houston-methodist-2026-27:%'
order by a.roster_id, a.start_date;

-- 8) Events outside nominal AY 2026-07-01 .. 2027-06-30
select id, roster_id, title, start_date, end_date, event_type
from public.availability_events
where program_id = '082cc352-bba2-4f19-b837-b28d0878a308'
  and notes like '[snaportho-import:houston-methodist-2026-27:%'
  and (start_date < date '2026-07-01' or end_date > date '2027-06-30')
order by start_date;

-- 9) Child day integrity for import parents
select
  e.id,
  e.title,
  e.start_date,
  e.end_date,
  (e.end_date - e.start_date + 1) as expected_days,
  count(d.id)::int as actual_days
from public.availability_events e
left join public.availability_event_days d on d.event_id = e.id
where e.program_id = '082cc352-bba2-4f19-b837-b28d0878a308'
  and e.notes like '[snaportho-import:houston-methodist-2026-27:%'
group by e.id, e.title, e.start_date, e.end_date
having count(d.id) <> (e.end_date - e.start_date + 1);

rollback;

-- ============================================================================
-- OPTIONAL DESTRUCTIVE ROLLBACK (import rows only)
-- Run ONLY after reviewing the diagnostic counts above.
-- Limited to rows created by this import (notes import key + source_kind).
-- Child rows cascade via availability_event_days_event_id_fkey ON DELETE CASCADE.
-- ============================================================================
--
-- begin;
--
-- delete from public.availability_events
-- where program_id = '082cc352-bba2-4f19-b837-b28d0878a308'
--   and source_kind = 'official'
--   and notes like '[snaportho-import:houston-methodist-2026-27:%';
--
-- -- Expect: 94 parents removed on a clean first-run import (or fewer if partial).
-- select count(*) as remaining_import_parents
-- from public.availability_events
-- where program_id = '082cc352-bba2-4f19-b837-b28d0878a308'
--   and notes like '[snaportho-import:houston-methodist-2026-27:%';
--
-- commit;
