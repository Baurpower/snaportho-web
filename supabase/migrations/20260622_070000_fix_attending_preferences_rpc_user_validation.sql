-- ============================================================
-- Attending Preferences — RPC user validation hardening
-- ============================================================
-- Adds a p_user_id vs auth.uid() consistency check to
-- create_ap_card_with_sections so that direct RPC callers
-- cannot spoof attribution by passing a different user ID.
-- P0005 is returned when the values diverge.
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
  v_section_defs  text[] := array[
    'Case Setup',
    'Room Setup & Equipment',
    'Patient Positioning',
    'Prep & Drape',
    'Imaging / C-Arm',
    'Incision',
    'Approach & Exposure',
    'Key Anatomy',
    'Implants & Systems',
    'Trays & Instruments',
    'Suture & Closure',
    'Dressing / Splint / Brace',
    'Postop Protocol',
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

  -- Seed default sections
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
