-- ============================================================
-- Attending Preferences — Section list v2
-- ============================================================
-- Changes from v1:
--   • Removed:  Key Anatomy, Trays & Instruments
--   • Added:    General Steps (operative workflow)
--   • Renamed:  Postop Protocol → Postop Protocol / Orders
--   • Reordered: sections now follow operative workflow order
--     (imaging moved from pre-incision to intra-op position)
--
-- EXISTING CARDS ARE NOT AFFECTED.
-- This only changes the default sections seeded for NEW cards.
-- Legacy sections on existing cards (Key Anatomy, Trays &
-- Instruments, old Postop Protocol) continue to render safely
-- under the "Other" group in the UI.
-- ============================================================

create or replace function public.create_ap_card_with_sections(
  p_program_id   uuid,
  p_attending_id uuid,
  p_procedure_id uuid,
  p_site         text,
  p_user_id      uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card_id       uuid;
  v_norm_site     text;
  -- v2 section list: 17 sections in operative workflow order
  v_section_defs  text[] := array[
    -- Case Setup (1)
    'Case Setup',
    -- Before Incision (2-4)
    'Room Setup & Equipment',
    'Patient Positioning',
    'Prep & Drape',
    -- Operation (5-10)
    'Incision',
    'Approach & Exposure',
    'General Steps',
    'Implants & Systems',
    'Imaging / C-Arm',
    'Suture & Closure',
    -- Post-op (11-12)
    'Dressing / Splint / Brace',
    'Postop Protocol / Orders',
    -- Attending-Specific (13-17)
    'Attending Pearls',
    'Common Pitfalls',
    'Things to Never Forget',
    'Resident Role & Expectations',
    'Notes'
  ];
  i               int;
begin
  -- Reject attribution spoofing: caller must pass their own user id
  if p_user_id is distinct from auth.uid() then
    raise exception 'p_user_id must match the authenticated user.'
      using errcode = 'P0005';
  end if;

  -- Verify caller is active member of the target program
  if not public.is_active_ap_program_member(p_program_id) then
    raise exception 'User is not an active member of this program.'
      using errcode = 'P0001';
  end if;

  -- Verify attending belongs to same program
  if not exists (
    select 1 from public.program_attendings pa
    where pa.id = p_attending_id
      and pa.program_id = p_program_id
      and pa.is_active = true
  ) then
    raise exception 'Attending not found in this program.'
      using errcode = 'P0002';
  end if;

  -- Verify procedure belongs to same program
  if not exists (
    select 1 from public.ap_procedures pr
    where pr.id = p_procedure_id
      and pr.program_id = p_program_id
      and pr.is_active = true
  ) then
    raise exception 'Procedure not found in this program.'
      using errcode = 'P0003';
  end if;

  -- Normalise site for duplicate check (match the unique index)
  v_norm_site := lower(btrim(coalesce(p_site, '')));

  -- Prevent duplicate active card
  if exists (
    select 1 from public.ap_cards c
    where c.attending_id = p_attending_id
      and c.procedure_id = p_procedure_id
      and lower(btrim(coalesce(c.site, ''))) = v_norm_site
      and c.is_active = true
  ) then
    raise exception 'An active preference card already exists for this attending, procedure, and site.'
      using errcode = 'P0004';
  end if;

  -- Insert card
  insert into public.ap_cards (
    program_id, attending_id, procedure_id, site,
    created_by, updated_by
  )
  values (
    p_program_id, p_attending_id, p_procedure_id,
    nullif(btrim(coalesce(p_site, '')), ''),
    p_user_id, p_user_id
  )
  returning id into v_card_id;

  -- Seed default sections in operative workflow order
  for i in 1..array_length(v_section_defs, 1) loop
    insert into public.ap_sections (
      card_id, title, sort_order, is_default, created_by, updated_by
    )
    values (
      v_card_id, v_section_defs[i], i, true, p_user_id, p_user_id
    );
  end loop;

  return v_card_id;
end;
$$;
