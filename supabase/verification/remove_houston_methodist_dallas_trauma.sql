-- ============================================================================
-- Remove Dallas Trauma (and San Antonio Trauma if present) from Houston
-- Methodist TEST program time-off. Keeps Europe Elective / Peru Elective.
--
-- 1) Run the PREVIEW select first.
-- 2) Run the DELETE transaction only after confirming the preview rows.
-- Child days cascade via availability_event_days_event_id_fkey.
-- ============================================================================

-- PREVIEW
select
  id,
  roster_id,
  title,
  event_type,
  start_date,
  end_date,
  notes,
  source_kind,
  approval_status
from public.availability_events
where program_id = '082cc352-bba2-4f19-b837-b28d0878a308'
  and (
    title ilike '%Dallas Trauma%'
    or title ilike '%San Antonio Trauma%'
  )
order by start_date, title;

-- DESTRUCTIVE (uncomment to apply)
-- begin;
--
-- delete from public.availability_events
-- where program_id = '082cc352-bba2-4f19-b837-b28d0878a308'
--   and (
--     title ilike '%Dallas Trauma%'
--     or title ilike '%San Antonio Trauma%'
--     or (
--       source_kind = 'official'
--       and notes like '[snaportho-import:houston-methodist-2026-27:%'
--       and (
--         notes like '%:other:2026-08-01:2026-08-31]'
--         or notes like '%:other:2026-09-01:2026-09-30]'
--       )
--     )
--   );
--
-- select count(*) as remaining_trauma
-- from public.availability_events
-- where program_id = '082cc352-bba2-4f19-b837-b28d0878a308'
--   and (title ilike '%Dallas Trauma%' or title ilike '%San Antonio Trauma%');
--
-- -- Electives must remain
-- select title, start_date, end_date
-- from public.availability_events
-- where program_id = '082cc352-bba2-4f19-b837-b28d0878a308'
--   and (title ilike '%Europe Elective%' or title ilike '%Peru Elective%')
-- order by start_date;
--
-- commit;
