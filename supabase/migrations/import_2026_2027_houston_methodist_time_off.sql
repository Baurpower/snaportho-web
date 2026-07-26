-- ============================================================================
-- Houston Methodist (TEST) — 2026-27 resident time-off import
-- Program: 082cc352-bba2-4f19-b837-b28d0878a308
-- Slug:    houston-methodist-ortho-test
--
-- Production-safe, idempotent data import. Does NOT alter schema.
--
-- Root cause of prior failure:
--   availability_events_source_kind_check allows only:
--     official | self_reported | preference
--   Earlier import attempts / app batch paths used invalid values
--   (admin_entry, program_quick_add).
--
-- Canonical source_kind for this program-entered approved import: official
-- (schema-supported; matches administrator-owned calendar entries).
--
-- Prerequisites (apply first if not already present):
--   20260725_120000_availability_events_membership_nullable.sql
--   20260725_121000_availability_events_event_type_expand.sql
--
-- Safety:
--   - single transaction
--   - advisory xact lock
--   - preflight validation (program/roster/membership/enums/dates/dupes)
--   - insert only missing parents; insert only missing child days
--   - no deletes of unrelated events
--   - full rollback on any failure
--
-- Supabase SQL editor compatibility:
--   Staging uses unlogged public._hm_2026_27_* tables (not TEMP ... ON COMMIT DROP).
--   Session temp tables can vanish mid-script under the SQL editor / pooler.
--   Staging tables are dropped at the end of this script.
-- ============================================================================

begin;

-- Serialize concurrent runs of this specific import.
select pg_advisory_xact_lock(
  ('x' || substr(md5('houston-methodist-2026-27-time-off-import'), 1, 16))::bit(64)::bigint
);

drop table if exists public._hm_2026_27_input cascade;
create unlogged table public._hm_2026_27_input (
  program_id uuid not null,
  roster_id uuid not null,
  supplied_membership_id uuid null,
  event_type text not null,
  using_pto boolean not null,
  source_kind text not null,
  constraint_level text not null,
  title text null,
  notes text null,
  location text null,
  start_date date not null,
  end_date date not null,
  created_by_user_id uuid not null,
  approval_status text not null
);

insert into public._hm_2026_27_input (
  program_id,
  roster_id,
  supplied_membership_id,
  event_type,
  using_pto,
  source_kind,
  constraint_level,
  title,
  notes,
  location,
  start_date,
  end_date,
  created_by_user_id,
  approval_status
)
values
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'b4ac3a24-4bc3-4c9c-96b5-e26172412cce'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Anthony Eshareturi — PTO'::text, null::text, null::text, '2026-08-16'::date, '2026-08-16'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'b4ac3a24-4bc3-4c9c-96b5-e26172412cce'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Anthony Eshareturi — PTO'::text, null::text, null::text, '2026-08-22'::date, '2026-08-23'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'b4ac3a24-4bc3-4c9c-96b5-e26172412cce'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Anthony Eshareturi — PTO'::text, null::text, null::text, '2026-10-10'::date, '2026-10-18'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'b4ac3a24-4bc3-4c9c-96b5-e26172412cce'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Anthony Eshareturi — PTO'::text, null::text, null::text, '2026-11-21'::date, '2026-11-29'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'b4ac3a24-4bc3-4c9c-96b5-e26172412cce'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Anthony Eshareturi — PTO'::text, null::text, null::text, '2027-01-02'::date, '2027-01-05'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '5e5693c2-8fba-4ce7-a22d-2aa0a13aa43d'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Robert Mbilinyi — PTO'::text, null::text, null::text, '2026-08-21'::date, '2026-08-30'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '5e5693c2-8fba-4ce7-a22d-2aa0a13aa43d'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Robert Mbilinyi — PTO'::text, null::text, null::text, '2027-04-25'::date, '2027-05-01'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '35c02aee-d92d-488c-ad75-2c367a9a2c8c'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Ryan Hodge — PTO'::text, null::text, null::text, '2026-09-09'::date, '2026-09-15'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '35c02aee-d92d-488c-ad75-2c367a9a2c8c'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Ryan Hodge — PTO'::text, null::text, null::text, '2026-12-21'::date, '2026-12-25'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '35c02aee-d92d-488c-ad75-2c367a9a2c8c'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Ryan Hodge — PTO'::text, null::text, null::text, '2027-04-15'::date, '2027-04-16'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '45fcc063-531f-4f08-9c79-30337e0e9f81'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Benjamin Akande — PTO'::text, null::text, null::text, '2026-07-25'::date, '2026-07-26'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '45fcc063-531f-4f08-9c79-30337e0e9f81'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Benjamin Akande — PTO'::text, null::text, null::text, '2026-08-13'::date, '2026-08-15'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '45fcc063-531f-4f08-9c79-30337e0e9f81'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Benjamin Akande — PTO'::text, null::text, null::text, '2026-08-27'::date, '2026-08-31'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '45fcc063-531f-4f08-9c79-30337e0e9f81'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Benjamin Akande — PTO'::text, null::text, null::text, '2026-10-17'::date, '2026-10-25'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '45fcc063-531f-4f08-9c79-30337e0e9f81'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Benjamin Akande — PTO'::text, null::text, null::text, '2026-11-26'::date, '2026-11-29'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '45fcc063-531f-4f08-9c79-30337e0e9f81'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Benjamin Akande — PTO'::text, null::text, null::text, '2026-12-24'::date, '2026-12-27'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '45fcc063-531f-4f08-9c79-30337e0e9f81'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Benjamin Akande — PTO'::text, null::text, null::text, '2027-01-01'::date, '2027-01-03'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '45fcc063-531f-4f08-9c79-30337e0e9f81'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Benjamin Akande — PTO'::text, null::text, null::text, '2027-01-23'::date, '2027-01-24'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '45fcc063-531f-4f08-9c79-30337e0e9f81'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Benjamin Akande — PTO'::text, null::text, null::text, '2027-02-22'::date, '2027-02-28'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '45fcc063-531f-4f08-9c79-30337e0e9f81'::uuid, null, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Benjamin Akande — AAOS'::text, null::text, null::text, '2027-03-04'::date, '2027-03-07'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '45fcc063-531f-4f08-9c79-30337e0e9f81'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Benjamin Akande — PTO'::text, null::text, null::text, '2027-05-23'::date, '2027-05-31'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'd435e21d-51ea-4be2-8380-2dc1fe2924c4'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Izzet Akosman — PTO'::text, null::text, null::text, '2026-08-14'::date, '2026-08-23'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'd435e21d-51ea-4be2-8380-2dc1fe2924c4'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Izzet Akosman — PTO'::text, null::text, null::text, '2027-02-01'::date, '2027-02-07'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'd435e21d-51ea-4be2-8380-2dc1fe2924c4'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Izzet Akosman — PTO'::text, null::text, null::text, '2026-11-26'::date, '2026-11-29'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'febc3314-03e3-4636-b57e-68ae4b1c9f23'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Nathan Safran — PTO'::text, null::text, null::text, '2026-08-21'::date, '2026-08-23'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'febc3314-03e3-4636-b57e-68ae4b1c9f23'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Nathan Safran — PTO'::text, null::text, null::text, '2026-10-09'::date, '2026-10-11'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'febc3314-03e3-4636-b57e-68ae4b1c9f23'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Nathan Safran — PTO'::text, null::text, null::text, '2026-11-28'::date, '2026-12-06'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'febc3314-03e3-4636-b57e-68ae4b1c9f23'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Nathan Safran — PTO'::text, null::text, null::text, '2027-04-19'::date, '2027-04-25'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c734149a-d9e1-46c9-933b-04a5e80b6870'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Tanner Hafen — PTO'::text, null::text, null::text, '2026-08-13'::date, '2026-08-16'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c734149a-d9e1-46c9-933b-04a5e80b6870'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Tanner Hafen — PTO'::text, null::text, null::text, '2026-10-23'::date, '2026-10-29'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c734149a-d9e1-46c9-933b-04a5e80b6870'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Tanner Hafen — PTO'::text, null::text, null::text, '2026-11-19'::date, '2026-11-28'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c734149a-d9e1-46c9-933b-04a5e80b6870'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Tanner Hafen — PTO'::text, null::text, null::text, '2026-12-17'::date, '2026-12-20'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c734149a-d9e1-46c9-933b-04a5e80b6870'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Tanner Hafen — PTO'::text, null::text, null::text, '2027-03-21'::date, '2027-03-28'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c734149a-d9e1-46c9-933b-04a5e80b6870'::uuid, null, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Tanner Hafen — AAOS'::text, null::text, null::text, '2027-03-04'::date, '2027-03-06'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c734149a-d9e1-46c9-933b-04a5e80b6870'::uuid, null, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Tanner Hafen — MAOA'::text, null::text, null::text, '2027-01-31'::date, '2027-02-03'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '64db16f0-ed52-4b4d-9343-ec370b638bdf'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Reece Rosenthal — PTO'::text, null::text, null::text, '2026-08-21'::date, '2026-08-30'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '64db16f0-ed52-4b4d-9343-ec370b638bdf'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Reece Rosenthal — PTO'::text, null::text, null::text, '2026-11-06'::date, '2026-11-09'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '64db16f0-ed52-4b4d-9343-ec370b638bdf'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Reece Rosenthal — PTO'::text, null::text, null::text, '2026-11-23'::date, '2026-11-27'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '64db16f0-ed52-4b4d-9343-ec370b638bdf'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Reece Rosenthal — PTO'::text, null::text, null::text, '2026-12-21'::date, '2026-12-25'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '64db16f0-ed52-4b4d-9343-ec370b638bdf'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Reece Rosenthal — PTO'::text, null::text, null::text, '2027-05-13'::date, '2027-05-16'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '64db16f0-ed52-4b4d-9343-ec370b638bdf'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Reece Rosenthal — PTO'::text, null::text, null::text, '2027-05-28'::date, '2027-05-31'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '64db16f0-ed52-4b4d-9343-ec370b638bdf'::uuid, null, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Reece Rosenthal — AAOS'::text, null::text, null::text, '2027-03-04'::date, '2027-03-06'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '64db16f0-ed52-4b4d-9343-ec370b638bdf'::uuid, null, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Reece Rosenthal — MAOA'::text, null::text, null::text, '2027-04-14'::date, '2027-04-17'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '79bb439f-c203-4c59-9b27-967ae70bf007'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Clyde Fomunung — PTO'::text, null::text, null::text, '2026-09-13'::date, '2026-09-20'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '79bb439f-c203-4c59-9b27-967ae70bf007'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Clyde Fomunung — PTO'::text, null::text, null::text, '2026-10-03'::date, '2026-10-04'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '79bb439f-c203-4c59-9b27-967ae70bf007'::uuid, null, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Clyde Fomunung — ORS'::text, null::text, null::text, '2027-02-11'::date, '2027-02-14'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '79bb439f-c203-4c59-9b27-967ae70bf007'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Clyde Fomunung — PTO'::text, null::text, null::text, '2027-02-18'::date, '2027-02-23'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '79bb439f-c203-4c59-9b27-967ae70bf007'::uuid, null, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Clyde Fomunung — AAOS'::text, null::text, null::text, '2027-03-04'::date, '2027-03-06'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '79bb439f-c203-4c59-9b27-967ae70bf007'::uuid, null, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Clyde Fomunung — MAOA'::text, null::text, null::text, '2027-04-14'::date, '2027-04-17'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '79bb439f-c203-4c59-9b27-967ae70bf007'::uuid, null, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Clyde Fomunung — JFOS'::text, null::text, null::text, '2027-05-01'::date, '2027-05-02'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '79bb439f-c203-4c59-9b27-967ae70bf007'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Clyde Fomunung — PTO'::text, null::text, null::text, '2027-05-14'::date, '2027-05-16'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '79bb439f-c203-4c59-9b27-967ae70bf007'::uuid, null, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Clyde Fomunung — AOSSM'::text, null::text, null::text, '2027-07-11'::date, '2027-07-14'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c57c41db-a1e3-45b3-8f93-05a2bbbc4a80'::uuid, '1c394b65-1c38-4222-8e34-298bcdd93c38'::uuid, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Austin Nguyen — ISSG'::text, null::text, null::text, '2026-08-13'::date, '2026-08-16'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c57c41db-a1e3-45b3-8f93-05a2bbbc4a80'::uuid, '1c394b65-1c38-4222-8e34-298bcdd93c38'::uuid, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Austin Nguyen — PTO'::text, null::text, null::text, '2026-09-02'::date, '2026-09-06'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c57c41db-a1e3-45b3-8f93-05a2bbbc4a80'::uuid, '1c394b65-1c38-4222-8e34-298bcdd93c38'::uuid, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Austin Nguyen — SMISS'::text, null::text, null::text, '2026-09-10'::date, '2026-09-12'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c57c41db-a1e3-45b3-8f93-05a2bbbc4a80'::uuid, '1c394b65-1c38-4222-8e34-298bcdd93c38'::uuid, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Austin Nguyen — NASS'::text, null::text, null::text, '2026-10-14'::date, '2026-10-17'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c57c41db-a1e3-45b3-8f93-05a2bbbc4a80'::uuid, '1c394b65-1c38-4222-8e34-298bcdd93c38'::uuid, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Austin Nguyen — PTO'::text, null::text, null::text, '2026-11-26'::date, '2026-11-30'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c57c41db-a1e3-45b3-8f93-05a2bbbc4a80'::uuid, '1c394b65-1c38-4222-8e34-298bcdd93c38'::uuid, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Austin Nguyen — CSRS'::text, null::text, null::text, '2026-12-02'::date, '2026-12-05'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c57c41db-a1e3-45b3-8f93-05a2bbbc4a80'::uuid, '1c394b65-1c38-4222-8e34-298bcdd93c38'::uuid, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Austin Nguyen — PTO'::text, null::text, null::text, '2026-12-23'::date, '2026-12-27'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c57c41db-a1e3-45b3-8f93-05a2bbbc4a80'::uuid, '1c394b65-1c38-4222-8e34-298bcdd93c38'::uuid, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Austin Nguyen — PTO'::text, null::text, null::text, '2027-04-01'::date, '2027-04-04'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c57c41db-a1e3-45b3-8f93-05a2bbbc4a80'::uuid, '1c394b65-1c38-4222-8e34-298bcdd93c38'::uuid, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Austin Nguyen — PTO'::text, null::text, null::text, '2027-04-24'::date, '2027-05-02'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c57c41db-a1e3-45b3-8f93-05a2bbbc4a80'::uuid, '1c394b65-1c38-4222-8e34-298bcdd93c38'::uuid, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Austin Nguyen — PTO'::text, null::text, null::text, '2027-05-26'::date, '2027-05-30'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c57c41db-a1e3-45b3-8f93-05a2bbbc4a80'::uuid, '1c394b65-1c38-4222-8e34-298bcdd93c38'::uuid, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Austin Nguyen — PTO'::text, null::text, null::text, '2027-06-04'::date, '2027-06-06'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'a047c66e-4398-45ef-ae9b-089077358d6d'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Kevin Credille — PTO'::text, null::text, null::text, '2026-08-06'::date, '2026-08-10'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'a047c66e-4398-45ef-ae9b-089077358d6d'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Kevin Credille — PTO'::text, null::text, null::text, '2026-08-22'::date, '2026-08-30'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'a047c66e-4398-45ef-ae9b-089077358d6d'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Kevin Credille — PTO'::text, null::text, null::text, '2026-12-19'::date, '2026-12-27'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '0f9ce84e-6460-4373-992e-a29a64e97a1b'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Thomas Yetter — PTO'::text, null::text, null::text, '2026-08-07'::date, '2026-08-09'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '0f9ce84e-6460-4373-992e-a29a64e97a1b'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Thomas Yetter — PTO'::text, null::text, null::text, '2026-10-09'::date, '2026-10-11'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '0f9ce84e-6460-4373-992e-a29a64e97a1b'::uuid, null, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Thomas Yetter — AAHKS'::text, null::text, null::text, '2026-11-05'::date, '2026-11-08'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '0f9ce84e-6460-4373-992e-a29a64e97a1b'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Thomas Yetter — PTO'::text, null::text, null::text, '2027-01-15'::date, '2027-01-17'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '0f9ce84e-6460-4373-992e-a29a64e97a1b'::uuid, null, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Thomas Yetter — MAOA'::text, null::text, null::text, '2027-04-14'::date, '2027-04-17'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '0f9ce84e-6460-4373-992e-a29a64e97a1b'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Thomas Yetter — PTO'::text, null::text, null::text, '2027-05-08'::date, '2027-05-16'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22'::uuid, '8a5d6181-c0af-40e3-add1-21aee221728d'::uuid, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Justin Walsh — AOSSM'::text, null::text, null::text, '2026-07-08'::date, '2026-07-12'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22'::uuid, '8a5d6181-c0af-40e3-add1-21aee221728d'::uuid, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Justin Walsh — PTO'::text, null::text, null::text, '2026-08-07'::date, '2026-08-09'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22'::uuid, '8a5d6181-c0af-40e3-add1-21aee221728d'::uuid, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Justin Walsh — PTO'::text, null::text, null::text, '2026-08-20'::date, '2026-08-24'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22'::uuid, '8a5d6181-c0af-40e3-add1-21aee221728d'::uuid, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Justin Walsh — ISHA'::text, null::text, null::text, '2026-10-01'::date, '2026-10-09'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22'::uuid, '8a5d6181-c0af-40e3-add1-21aee221728d'::uuid, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Justin Walsh — PTO'::text, null::text, null::text, '2026-11-05'::date, '2026-11-08'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22'::uuid, '8a5d6181-c0af-40e3-add1-21aee221728d'::uuid, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Justin Walsh — PTO'::text, null::text, null::text, '2026-11-19'::date, '2026-11-22'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22'::uuid, '8a5d6181-c0af-40e3-add1-21aee221728d'::uuid, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Justin Walsh — PTO'::text, null::text, null::text, '2026-12-19'::date, '2026-12-27'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22'::uuid, '8a5d6181-c0af-40e3-add1-21aee221728d'::uuid, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Justin Walsh — PTO'::text, null::text, null::text, '2026-12-31'::date, '2027-01-03'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22'::uuid, '8a5d6181-c0af-40e3-add1-21aee221728d'::uuid, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Justin Walsh — AAOS'::text, null::text, null::text, '2027-03-03'::date, '2027-03-06'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22'::uuid, '8a5d6181-c0af-40e3-add1-21aee221728d'::uuid, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Justin Walsh — PTO'::text, null::text, null::text, '2027-03-27'::date, '2027-04-05'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22'::uuid, '8a5d6181-c0af-40e3-add1-21aee221728d'::uuid, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Justin Walsh — MAOA'::text, null::text, null::text, '2027-04-14'::date, '2027-04-17'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22'::uuid, '8a5d6181-c0af-40e3-add1-21aee221728d'::uuid, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Justin Walsh — VHS'::text, null::text, null::text, '2027-04-08'::date, '2027-04-11'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, '3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22'::uuid, '8a5d6181-c0af-40e3-add1-21aee221728d'::uuid, 'other'::text, false::boolean, 'official'::text, 'hard'::text, 'Justin Walsh — Europe Elective'::text, null::text, null::text, '2027-05-01'::date, '2027-05-31'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c26a25a1-1a56-427b-a021-4732123797ff'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Erin Orozco — PTO'::text, null::text, null::text, '2026-10-01'::date, '2026-10-04'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c26a25a1-1a56-427b-a021-4732123797ff'::uuid, null, 'other'::text, false::boolean, 'official'::text, 'hard'::text, 'Erin Orozco — Peru Elective'::text, null::text, null::text, '2026-10-04'::date, '2026-10-31'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c26a25a1-1a56-427b-a021-4732123797ff'::uuid, null, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Erin Orozco — IPOS'::text, null::text, null::text, '2026-12-07'::date, '2026-12-11'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c26a25a1-1a56-427b-a021-4732123797ff'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Erin Orozco — PTO'::text, null::text, null::text, '2026-12-23'::date, '2026-12-27'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c26a25a1-1a56-427b-a021-4732123797ff'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Erin Orozco — PTO'::text, null::text, null::text, '2027-02-12'::date, '2027-02-21'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c26a25a1-1a56-427b-a021-4732123797ff'::uuid, null, 'conference'::text, false::boolean, 'official'::text, 'hard'::text, 'Erin Orozco — AAOS'::text, null::text, null::text, '2027-03-03'::date, '2027-03-06'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text),
    ('082cc352-bba2-4f19-b837-b28d0878a308'::uuid, 'c26a25a1-1a56-427b-a021-4732123797ff'::uuid, null, 'vacation'::text, true::boolean, 'official'::text, 'hard'::text, 'Erin Orozco — PTO'::text, null::text, null::text, '2027-04-09'::date, '2027-04-13'::date, 'a59df7e1-b108-4c54-ada5-66cdc1c59d8b'::uuid, 'approved'::text);

-- Durable import identity stored in notes for rollback / re-run matching.
-- Original human titles remain in title.
update public._hm_2026_27_input
set notes = format(
  '[snaportho-import:houston-methodist-2026-27:%s:%s:%s:%s]',
  roster_id::text,
  event_type,
  start_date::text,
  end_date::text
);

-- ---------------------------------------------------------------------------
-- Preflight validation (fail before any DML into production tables)
-- ---------------------------------------------------------------------------
do $$
declare
  v_program_id uuid := '082cc352-bba2-4f19-b837-b28d0878a308';
  v_expected_slug text := 'houston-methodist-ortho-test';
  v_slug text;
  v_bad text;
  v_count int;
  v_mem_nullable text;
  v_day_mem_nullable text;
  v_source_ok boolean;
  v_event_ok boolean;
begin
  -- Program exists + slug matches
  select p.slug into v_slug
  from public.programs p
  where p.id = v_program_id;

  if v_slug is null then
    raise exception
      'Preflight failed: target program % does not exist',
      v_program_id;
  end if;

  if v_slug is distinct from v_expected_slug then
    raise exception
      'Preflight failed: program % slug is %, expected %',
      v_program_id, v_slug, v_expected_slug;
  end if;

  -- Schema prerequisites: membership_id must be nullable for unclaimed residents
  select c.is_nullable into v_mem_nullable
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'availability_events'
    and c.column_name = 'membership_id';

  select c.is_nullable into v_day_mem_nullable
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'availability_event_days'
    and c.column_name = 'membership_id';

  if v_mem_nullable is distinct from 'YES' or v_day_mem_nullable is distinct from 'YES' then
    raise exception
      'Preflight failed: membership_id is NOT NULL on availability_events (%) or availability_event_days (%). Apply migration 20260725_120000_availability_events_membership_nullable.sql first.',
      v_mem_nullable, v_day_mem_nullable;
  end if;

  -- source_kind must be schema-supported
  select exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'availability_events'
      and c.conname = 'availability_events_source_kind_check'
      and pg_get_constraintdef(c.oid) ilike '%official%'
      and pg_get_constraintdef(c.oid) ilike '%self_reported%'
  ) into v_source_ok;

  if not v_source_ok then
    raise exception
      'Preflight failed: could not confirm availability_events_source_kind_check allows official/self_reported';
  end if;

  -- event_type must allow other (required by this dataset)
  select exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'availability_events'
      and c.conname = 'availability_events_event_type_check'
      and pg_get_constraintdef(c.oid) ilike '%other%'
  ) into v_event_ok;

  if not v_event_ok then
    raise exception
      'Preflight failed: availability_events_event_type_check does not allow other. Apply migration 20260725_121000_availability_events_event_type_expand.sql first.';
  end if;

  -- Duplicate rows inside the input dataset
  select string_agg(
    format('%s|%s|%s|%s|%s', roster_id, event_type, start_date, end_date, coalesce(title, '')),
    ', '
  )
  into v_bad
  from (
    select roster_id, event_type, start_date, end_date, title, count(*) as n
    from public._hm_2026_27_input
    group by 1,2,3,4,5
    having count(*) > 1
  ) d;

  if v_bad is not null then
    raise exception 'Preflight failed: duplicate input rows: %', v_bad;
  end if;

  -- start_date > end_date
  select string_agg(format('%s %s..%s', title, start_date, end_date), ', ')
  into v_bad
  from public._hm_2026_27_input
  where start_date > end_date;

  if v_bad is not null then
    raise exception 'Preflight failed: start_date > end_date for: %', v_bad;
  end if;

  -- Unsupported enums in input
  select string_agg(distinct event_type, ', ')
  into v_bad
  from public._hm_2026_27_input
  where event_type not in ('pto','conference','weekend_off','vacation','personal','sick','other');

  if v_bad is not null then
    raise exception 'Preflight failed: unsupported event_type values: %', v_bad;
  end if;

  select string_agg(distinct source_kind, ', ')
  into v_bad
  from public._hm_2026_27_input
  where source_kind not in ('official','self_reported','preference');

  if v_bad is not null then
    raise exception 'Preflight failed: unsupported source_kind values: %', v_bad;
  end if;

  select string_agg(distinct constraint_level, ', ')
  into v_bad
  from public._hm_2026_27_input
  where constraint_level not in ('hard','soft');

  if v_bad is not null then
    raise exception 'Preflight failed: unsupported constraint_level values: %', v_bad;
  end if;

  select string_agg(distinct approval_status, ', ')
  into v_bad
  from public._hm_2026_27_input
  where approval_status not in ('requested','approved','denied');

  if v_bad is not null then
    raise exception 'Preflight failed: unsupported approval_status values: %', v_bad;
  end if;

  -- using_pto must not be true for non-PTO event types
  select string_agg(format('%s (%s)', title, event_type), ', ')
  into v_bad
  from public._hm_2026_27_input
  where using_pto = true
    and event_type in ('conference', 'weekend_off', 'other');

  if v_bad is not null then
    raise exception
      'Preflight failed: using_pto=true is not allowed for non-PTO event types: %',
      v_bad;
  end if;

  -- Roster existence + program match
  select string_agg(i.roster_id::text, ', ')
  into v_bad
  from (select distinct roster_id from public._hm_2026_27_input) i
  left join public.program_roster r on r.id = i.roster_id
  where r.id is null;

  if v_bad is not null then
    raise exception 'Preflight failed: roster IDs do not exist: %', v_bad;
  end if;

  select string_agg(format('%s (program %s)', r.id, r.program_id), ', ')
  into v_bad
  from (select distinct roster_id from public._hm_2026_27_input) i
  join public.program_roster r on r.id = i.roster_id
  where r.program_id is distinct from v_program_id;

  if v_bad is not null then
    raise exception
      'Preflight failed: roster IDs belong to a different program: %',
      v_bad;
  end if;

  -- Supplied membership existence + ownership
  select string_agg(i.supplied_membership_id::text, ', ')
  into v_bad
  from (select distinct supplied_membership_id from public._hm_2026_27_input where supplied_membership_id is not null) i
  left join public.program_memberships m on m.id = i.supplied_membership_id
  where m.id is null;

  if v_bad is not null then
    raise exception 'Preflight failed: membership IDs do not exist: %', v_bad;
  end if;

  select string_agg(
    format('membership %s roster %s (membership.program=%s membership.roster=%s roster.membership=%s)',
      i.supplied_membership_id, i.roster_id, m.program_id, m.roster_id, r.program_membership_id),
    '; '
  )
  into v_bad
  from (
    select distinct roster_id, supplied_membership_id
    from public._hm_2026_27_input
    where supplied_membership_id is not null
  ) i
  join public.program_memberships m on m.id = i.supplied_membership_id
  join public.program_roster r on r.id = i.roster_id
  where m.program_id is distinct from v_program_id
     or (m.roster_id is not null and m.roster_id is distinct from i.roster_id)
     or (r.program_membership_id is not null and r.program_membership_id is distinct from i.supplied_membership_id);

  if v_bad is not null then
    raise exception
      'Preflight failed: supplied membership does not match roster/program: %',
      v_bad;
  end if;

  -- created_by user must exist (FK)
  select count(*) into v_count
  from public._hm_2026_27_input i
  left join auth.users u on u.id = i.created_by_user_id
  where u.id is null;

  if v_count > 0 then
    raise exception
      'Preflight failed: % input rows reference a missing created_by_user_id',
      v_count;
  end if;

  select count(*) into v_count from public._hm_2026_27_input;
  raise notice 'Preflight OK: % input events for program % (%)',
    v_count, v_program_id, v_expected_slug;
end $$;

-- ---------------------------------------------------------------------------
-- Resolve membership safely
-- ---------------------------------------------------------------------------
drop table if exists public._hm_2026_27_resolved cascade;
create unlogged table public._hm_2026_27_resolved (
  program_id uuid not null,
  roster_id uuid not null,
  membership_id uuid null,
  event_type text not null,
  using_pto boolean not null,
  source_kind text not null,
  constraint_level text not null,
  title text null,
  notes text not null,
  location text null,
  start_date date not null,
  end_date date not null,
  created_by_user_id uuid not null,
  approval_status text not null,
  import_key text not null,
  expected_day_count int not null
);

insert into public._hm_2026_27_resolved
select
  i.program_id,
  i.roster_id,
  coalesce(
    i.supplied_membership_id,
    r.program_membership_id,
    m_by_roster.id
  ) as membership_id,
  i.event_type,
  i.using_pto,
  i.source_kind,
  i.constraint_level,
  i.title,
  i.notes,
  i.location,
  i.start_date,
  i.end_date,
  i.created_by_user_id,
  i.approval_status,
  i.notes as import_key,
  (i.end_date - i.start_date + 1) as expected_day_count
from public._hm_2026_27_input i
join public.program_roster r
  on r.id = i.roster_id
 and r.program_id = i.program_id
left join lateral (
  -- Prefer an active membership that is already linked to this roster row.
  select pm.id
  from public.program_memberships pm
  where pm.program_id = i.program_id
    and pm.roster_id = i.roster_id
  order by pm.created_at desc nulls last
  limit 1
) m_by_roster on true;

-- Never assign a membership that belongs to another program.
do $$
declare
  v_bad text;
begin
  select string_agg(format('%s membership %s', title, membership_id), ', ')
  into v_bad
  from public._hm_2026_27_resolved res
  join public.program_memberships m on m.id = res.membership_id
  where m.program_id is distinct from res.program_id;

  if v_bad is not null then
    raise exception
      'Preflight failed: resolved membership belongs to another program: %',
      v_bad;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Match existing parents (idempotent reuse)
-- Identity: program_id, roster_id, event_type, start_date, end_date,
--           normalized title, source_kind
-- Also match by durable import_key in notes for re-runs after title edits.
-- ---------------------------------------------------------------------------
drop table if exists public._hm_2026_27_parent_map cascade;
create unlogged table public._hm_2026_27_parent_map (
  import_key text primary key,
  event_id uuid not null,
  was_inserted boolean not null,
  program_id uuid not null,
  roster_id uuid not null,
  membership_id uuid null,
  event_type text not null,
  source_kind text not null,
  constraint_level text not null,
  start_date date not null,
  end_date date not null,
  expected_day_count int not null
);

-- Reuse by import_key notes
insert into public._hm_2026_27_parent_map (
  import_key, event_id, was_inserted, program_id, roster_id, membership_id,
  event_type, source_kind, constraint_level, start_date, end_date, expected_day_count
)
select
  res.import_key,
  e.id,
  false,
  res.program_id,
  res.roster_id,
  e.membership_id,
  res.event_type,
  res.source_kind,
  res.constraint_level,
  res.start_date,
  res.end_date,
  res.expected_day_count
from public._hm_2026_27_resolved res
join public.availability_events e
  on e.program_id = res.program_id
 and e.notes = res.import_key
 and e.source_kind = res.source_kind;

-- Reuse by natural identity when import_key not already mapped
insert into public._hm_2026_27_parent_map (
  import_key, event_id, was_inserted, program_id, roster_id, membership_id,
  event_type, source_kind, constraint_level, start_date, end_date, expected_day_count
)
select
  res.import_key,
  e.id,
  false,
  res.program_id,
  res.roster_id,
  e.membership_id,
  res.event_type,
  res.source_kind,
  res.constraint_level,
  res.start_date,
  res.end_date,
  res.expected_day_count
from public._hm_2026_27_resolved res
join public.availability_events e
  on e.program_id = res.program_id
 and e.roster_id = res.roster_id
 and e.event_type = res.event_type
 and e.start_date = res.start_date
 and e.end_date = res.end_date
 and e.source_kind = res.source_kind
 and lower(btrim(coalesce(e.title, ''))) = lower(btrim(coalesce(res.title, '')))
 and e.approval_status is distinct from 'denied'
where not exists (
  select 1 from public._hm_2026_27_parent_map m where m.import_key = res.import_key
)
-- If multiple matches, pick one deterministically via distinct on in a subquery
and e.id = (
  select e2.id
  from public.availability_events e2
  where e2.program_id = res.program_id
    and e2.roster_id = res.roster_id
    and e2.event_type = res.event_type
    and e2.start_date = res.start_date
    and e2.end_date = res.end_date
    and e2.source_kind = res.source_kind
    and lower(btrim(coalesce(e2.title, ''))) = lower(btrim(coalesce(res.title, '')))
    and e2.approval_status is distinct from 'denied'
  order by e2.created_at asc nulls last, e2.id asc
  limit 1
);

-- Insert missing parents
with to_insert as (
  select res.*
  from public._hm_2026_27_resolved res
  where not exists (
    select 1 from public._hm_2026_27_parent_map m where m.import_key = res.import_key
  )
),
ins as (
  insert into public.availability_events (
    program_id,
    roster_id,
    membership_id,
    event_type,
    using_pto,
    source_kind,
    constraint_level,
    title,
    notes,
    location,
    start_date,
    end_date,
    created_by_user_id,
    approval_status
  )
  select
    program_id,
    roster_id,
    membership_id,
    event_type,
    using_pto,
    source_kind,
    constraint_level,
    title,
    notes,
    location,
    start_date,
    end_date,
    created_by_user_id,
    approval_status
  from to_insert
  returning
    id,
    program_id,
    roster_id,
    membership_id,
    event_type,
    source_kind,
    constraint_level,
    start_date,
    end_date,
    notes
)
insert into public._hm_2026_27_parent_map (
  import_key, event_id, was_inserted, program_id, roster_id, membership_id,
  event_type, source_kind, constraint_level, start_date, end_date, expected_day_count
)
select
  ins.notes,
  ins.id,
  true,
  ins.program_id,
  ins.roster_id,
  ins.membership_id,
  ins.event_type,
  ins.source_kind,
  ins.constraint_level,
  ins.start_date,
  ins.end_date,
  (ins.end_date - ins.start_date + 1)
from ins;

-- Sanity: every input row mapped
do $$
declare
  v_input int;
  v_mapped int;
begin
  select count(*) into v_input from public._hm_2026_27_resolved;
  select count(*) into v_mapped from public._hm_2026_27_parent_map;
  if v_input <> v_mapped then
    raise exception
      'Import mapping incomplete: input=% mapped=%', v_input, v_mapped;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Child days: insert only missing dates; match parent field values exactly
-- ---------------------------------------------------------------------------
drop table if exists public._hm_2026_27_expected_days cascade;
create unlogged table public._hm_2026_27_expected_days (
  event_id uuid not null,
  program_id uuid not null,
  membership_id uuid null,
  roster_id uuid not null,
  off_date date not null,
  event_type text not null,
  source_kind text not null,
  constraint_level text not null,
  is_weekend boolean not null,
  primary key (event_id, off_date)
);

insert into public._hm_2026_27_expected_days
select
  m.event_id,
  m.program_id,
  m.membership_id,
  m.roster_id,
  d::date as off_date,
  m.event_type,
  m.source_kind,
  m.constraint_level,
  extract(dow from d)::int in (0, 6) as is_weekend
from public._hm_2026_27_parent_map m
cross join lateral generate_series(
  m.start_date::timestamp,
  m.end_date::timestamp,
  interval '1 day'
) as g(d);

-- Verify expected day counts
do $$
declare
  v_bad text;
begin
  select string_agg(format('%s expected %s got %s', m.import_key, m.expected_day_count, c.n), ', ')
  into v_bad
  from public._hm_2026_27_parent_map m
  join lateral (
    select count(*)::int as n
    from public._hm_2026_27_expected_days d
    where d.event_id = m.event_id
  ) c on true
  where c.n <> m.expected_day_count;

  if v_bad is not null then
    raise exception 'Day expansion count mismatch: %', v_bad;
  end if;
end $$;

-- Existing child days for these events (count first, then insert missing)
drop table if exists public._hm_2026_27_day_stats cascade;
create unlogged table public._hm_2026_27_day_stats (
  existing_days int not null,
  inserted_days int not null
);

drop table if exists public._hm_2026_27_existing_day_count cascade;
create unlogged table public._hm_2026_27_existing_day_count (
  n int not null
);

insert into public._hm_2026_27_existing_day_count (n)
select count(*)::int
from public._hm_2026_27_expected_days e
join public.availability_event_days d
  on d.event_id = e.event_id
 and d.off_date = e.off_date;

with ins as (
  insert into public.availability_event_days (
    event_id,
    program_id,
    membership_id,
    roster_id,
    off_date,
    event_type,
    source_kind,
    constraint_level,
    is_weekend
  )
  select
    e.event_id,
    e.program_id,
    e.membership_id,
    e.roster_id,
    e.off_date,
    e.event_type,
    e.source_kind,
    e.constraint_level,
    e.is_weekend
  from public._hm_2026_27_expected_days e
  where not exists (
    select 1
    from public.availability_event_days d
    where d.event_id = e.event_id
      and d.off_date = e.off_date
  )
  returning 1
)
insert into public._hm_2026_27_day_stats (existing_days, inserted_days)
select
  (select n from public._hm_2026_27_existing_day_count),
  (select count(*)::int from ins);

-- ---------------------------------------------------------------------------
-- Verification report
-- ---------------------------------------------------------------------------
drop table if exists public._hm_2026_27_report cascade;
create unlogged table public._hm_2026_27_report as
with base as (
  select
    (select count(*) from public._hm_2026_27_resolved) as total_supplied_events,
    (select count(*) from public._hm_2026_27_parent_map where was_inserted = false) as existing_parents_reused,
    (select count(*) from public._hm_2026_27_parent_map where was_inserted = true) as new_parents_inserted,
    (select count(*) from public._hm_2026_27_expected_days) as total_expected_event_days,
    (select existing_days from public._hm_2026_27_day_stats) as existing_event_days_reused,
    (select inserted_days from public._hm_2026_27_day_stats) as new_event_days_inserted
),
by_resident as (
  select
    coalesce(r.full_name, r.first_name || ' ' || r.last_name, res.roster_id::text) as resident,
    count(*)::int as event_count
  from public._hm_2026_27_resolved res
  join public.program_roster r on r.id = res.roster_id
  group by 1
  order by 1
),
by_type as (
  select event_type, count(*)::int as event_count
  from public._hm_2026_27_resolved
  group by 1
  order by 1
),
pto_by_resident as (
  select
    coalesce(r.full_name, r.first_name || ' ' || r.last_name, res.roster_id::text) as resident,
    sum(case when res.using_pto then res.expected_day_count else 0 end)::int as pto_calendar_days,
    sum((
      select count(*)::int
      from generate_series(res.start_date, res.end_date, interval '1 day') d
      where extract(dow from d)::int in (0, 6)
    ))::int as weekend_days
  from public._hm_2026_27_resolved res
  join public.program_roster r on r.id = res.roster_id
  group by 1
  order by 1
),
event_overlaps as (
  select
    coalesce(r.full_name, a.roster_id::text) as resident,
    a.title as title_a,
    a.start_date as start_a,
    a.end_date as end_a,
    b.title as title_b,
    b.start_date as start_b,
    b.end_date as end_b
  from public._hm_2026_27_resolved a
  join public._hm_2026_27_resolved b
    on a.roster_id = b.roster_id
   and a.import_key < b.import_key
   and a.start_date <= b.end_date
   and a.end_date >= b.start_date
  join public.program_roster r on r.id = a.roster_id
  order by 1, 3
),
out_of_range as (
  select
    coalesce(r.full_name, res.roster_id::text) as resident,
    res.title,
    res.start_date,
    res.end_date,
    case
      when res.start_date < date '2026-07-01' then 'starts_before_ay'
      when res.end_date > date '2027-06-30' then 'ends_after_ay'
      else 'partial'
    end as reason
  from public._hm_2026_27_resolved res
  join public.program_roster r on r.id = res.roster_id
  where res.start_date < date '2026-07-01'
     or res.end_date > date '2027-06-30'
  order by res.start_date
)
select jsonb_pretty(
  jsonb_build_object(
    'import', 'houston-methodist-2026-27-time-off',
    'program_id', '082cc352-bba2-4f19-b837-b28d0878a308',
    'canonical_source_kind', 'official',
    'summary', (select to_jsonb(base) from base),
    'count_by_resident', (select coalesce(jsonb_agg(to_jsonb(by_resident)), '[]'::jsonb) from by_resident),
    'count_by_event_type', (select coalesce(jsonb_agg(to_jsonb(by_type)), '[]'::jsonb) from by_type),
    'pto_and_weekend_by_resident', (select coalesce(jsonb_agg(to_jsonb(pto_by_resident)), '[]'::jsonb) from pto_by_resident),
    'overlapping_events_same_resident', (select coalesce(jsonb_agg(to_jsonb(event_overlaps)), '[]'::jsonb) from event_overlaps),
    'events_outside_academic_year_2026_07_01_to_2027_06_30', (select coalesce(jsonb_agg(to_jsonb(out_of_range)), '[]'::jsonb) from out_of_range),
    'notes', jsonb_build_array(
      'Overlaps are reported for review and are not treated as automatic failures.',
      'Erin Orozco PTO 2026-10-01..2026-10-04 overlaps Peru Elective on 2026-10-04.',
      'Clyde Fomunung AOSSM 2027-07-11..2027-07-14 is outside the nominal 2026-27 AY end (2027-06-30).',
      'Justin Walsh Europe Elective and Erin Orozco Peru Elective use event_type=other (trauma blocks excluded from time-off).',
      'Unclaimed residents keep membership_id null after schema nullable migration.'
    )
  )
) as verification_report;

-- Emit report into client notices and as a final SELECT result.
do $$
declare
  r record;
begin
  for r in select verification_report from public._hm_2026_27_report loop
    raise notice '%', r.verification_report;
  end loop;
end $$;

select verification_report from public._hm_2026_27_report;


-- Drop staging tables before commit (data already written to real tables).
drop table if exists public._hm_2026_27_report cascade;
drop table if exists public._hm_2026_27_existing_day_count cascade;
drop table if exists public._hm_2026_27_day_stats cascade;
drop table if exists public._hm_2026_27_expected_days cascade;
drop table if exists public._hm_2026_27_parent_map cascade;
drop table if exists public._hm_2026_27_resolved cascade;
drop table if exists public._hm_2026_27_input cascade;

commit;
