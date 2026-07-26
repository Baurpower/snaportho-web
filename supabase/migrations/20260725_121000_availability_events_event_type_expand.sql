-- ============================================================================
-- Schema: align availability_events.event_type with application TimeOffType
-- ============================================================================
-- Production check before this migration:
--   CHECK (event_type = ANY (ARRAY['pto','conference','weekend_off','vacation','personal']))
--
-- Application TimeOffType (src/lib/workspace/call/time-off.ts):
--   personal | conference | vacation | sick | other
--
-- Without `other` (and `sick`), program-entered electives/trauma blocks and the
-- app's own event types cannot be persisted. This deliberately expands the
-- parent check constraint; the child table has no event_type check constraint.
--
-- Existing rows are unaffected. No data rewrite.
-- ============================================================================

begin;

alter table public.availability_events
  drop constraint if exists availability_events_event_type_check;

alter table public.availability_events
  add constraint availability_events_event_type_check
  check (
    event_type = any (
      array[
        'pto'::text,
        'conference'::text,
        'weekend_off'::text,
        'vacation'::text,
        'personal'::text,
        'sick'::text,
        'other'::text
      ]
    )
  );

commit;
