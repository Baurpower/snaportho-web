-- ============================================================
-- Academic event types — default seed per program
-- ============================================================
-- Backfill standard event types for existing programs.
-- Idempotent via ON CONFLICT (program_id, name) DO NOTHING.
-- ============================================================

insert into public.academic_event_types (program_id, name, sort_order, default_required)
select
  p.id,
  defaults.name,
  defaults.sort_order,
  false
from public.programs p
cross join (
  values
    ('Journal Club', 1),
    ('Grand Rounds', 2),
    ('M&M', 3),
    ('Didactics', 4),
    ('Skills Lab', 5),
    ('Conference', 6)
) as defaults(name, sort_order)
on conflict (program_id, name) do nothing;