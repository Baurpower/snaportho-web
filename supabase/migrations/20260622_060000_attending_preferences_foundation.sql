-- ============================================================
-- Attending Preferences — Phase 1 Foundation
-- ============================================================
-- Tables:  ap_procedures, ap_cards, ap_sections,
--          ap_items, ap_item_history, ap_card_tags
-- RLS:     all tables, program-scoped
-- RPC:     create_ap_card_with_sections
-- Helpers: is_active_ap_program_member (reuses membership logic)
--          can_view_attending_preferences
--          can_edit_attending_preferences
-- ============================================================

-- ── Helper: is_active_ap_program_member ─────────────────────
-- Thin alias over membership check; distinct name keeps the
-- ap_* helpers self-contained without conflicting with the
-- existing is_active_program_member_for_attendings function.
create or replace function public.is_active_ap_program_member(
  target_program_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.program_memberships pm
    where pm.program_id = target_program_id
      and pm.user_id    = auth.uid()
      and coalesce(pm.is_active, false) = true
      and (pm.start_date is null or pm.start_date <= current_date)
      and (pm.end_date   is null or pm.end_date   >= current_date)
  );
$$;

-- v1: all active program members can view preferences.
create or replace function public.can_view_attending_preferences(
  target_program_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_ap_program_member(target_program_id);
$$;

-- v1: all active program members can edit preferences.
create or replace function public.can_edit_attending_preferences(
  target_program_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_ap_program_member(target_program_id);
$$;

-- ── ap_procedures ────────────────────────────────────────────
-- One row per procedure/approach combination per program.
-- "THA - Posterior" and "THA - Anterior" are separate rows.
create table if not exists public.ap_procedures (
  id            uuid        primary key default gen_random_uuid(),
  program_id    uuid        not null references public.programs(id) on delete cascade,
  name          text        not null,
  abbreviation  text        null,
  subspecialty  text        null,
  approach      text        null,
  default_site  text        null,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid        null references auth.users(id) on delete set null,
  updated_by    uuid        null references auth.users(id) on delete set null,
  constraint ap_procedures_name_nonempty check (length(btrim(name)) > 0)
);

-- Prevent duplicate active procedures per program/name/approach/site.
-- COALESCE normalises NULLs so two nulls collapse to '' for uniqueness.
create unique index if not exists ap_procedures_program_unique_active_idx
  on public.ap_procedures (
    program_id,
    lower(btrim(name)),
    lower(btrim(coalesce(approach, ''))),
    lower(btrim(coalesce(default_site, '')))
  )
  where is_active = true;

create index if not exists ap_procedures_program_active_idx
  on public.ap_procedures (program_id, is_active);

create index if not exists ap_procedures_subspecialty_idx
  on public.ap_procedures (program_id, subspecialty, is_active);

create index if not exists ap_procedures_updated_at_idx
  on public.ap_procedures (program_id, updated_at desc);

-- ── ap_cards ─────────────────────────────────────────────────
-- One preference card per attending × procedure × site combo.
-- Site is stored directly on the card; it may also appear as a tag.
create table if not exists public.ap_cards (
  id            uuid        primary key default gen_random_uuid(),
  program_id    uuid        not null references public.programs(id) on delete cascade,
  attending_id  uuid        not null references public.program_attendings(id) on delete cascade,
  procedure_id  uuid        not null references public.ap_procedures(id) on delete cascade,
  site          text        null,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid        null references auth.users(id) on delete set null,
  updated_by    uuid        null references auth.users(id) on delete set null
);

-- Prevent duplicate active cards for same attending/procedure/site.
create unique index if not exists ap_cards_attending_procedure_site_active_idx
  on public.ap_cards (
    attending_id,
    procedure_id,
    lower(btrim(coalesce(site, '')))
  )
  where is_active = true;

create index if not exists ap_cards_program_active_idx
  on public.ap_cards (program_id, is_active);

create index if not exists ap_cards_attending_idx
  on public.ap_cards (attending_id, is_active);

create index if not exists ap_cards_procedure_idx
  on public.ap_cards (procedure_id, is_active);

create index if not exists ap_cards_updated_at_idx
  on public.ap_cards (program_id, updated_at desc);

create index if not exists ap_cards_site_idx
  on public.ap_cards (program_id, site, is_active);

-- ── ap_sections ──────────────────────────────────────────────
-- Structured sections within a card.
-- is_default = true for the 18 seeded sections; false for user-added sections.
create table if not exists public.ap_sections (
  id            uuid        primary key default gen_random_uuid(),
  card_id       uuid        not null references public.ap_cards(id) on delete cascade,
  title         text        not null,
  sort_order    integer     not null default 0,
  is_default    boolean     not null default false,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid        null references auth.users(id) on delete set null,
  updated_by    uuid        null references auth.users(id) on delete set null,
  constraint ap_sections_title_nonempty check (length(btrim(title)) > 0)
);

create index if not exists ap_sections_card_order_idx
  on public.ap_sections (card_id, sort_order, is_active);

create index if not exists ap_sections_card_active_idx
  on public.ap_sections (card_id, is_active);

-- ── ap_items ─────────────────────────────────────────────────
-- Individual preference bullet items within a section.
-- is_high_yield powers the "Before You Scrub" computed banner.
-- content_tsv enables full-text search.
create table if not exists public.ap_items (
  id             uuid        primary key default gen_random_uuid(),
  section_id     uuid        not null references public.ap_sections(id) on delete cascade,
  content        text        not null,
  is_high_yield  boolean     not null default false,
  sort_order     integer     not null default 0,
  is_active      boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid        null references auth.users(id) on delete set null,
  updated_by     uuid        null references auth.users(id) on delete set null,
  content_tsv    tsvector    generated always as (to_tsvector('english', content)) stored,
  constraint ap_items_content_nonempty  check (length(btrim(content)) > 0),
  constraint ap_items_content_maxlength check (length(content) <= 500)
);

create index if not exists ap_items_section_order_idx
  on public.ap_items (section_id, sort_order, is_active);

create index if not exists ap_items_section_active_idx
  on public.ap_items (section_id, is_active);

create index if not exists ap_items_high_yield_idx
  on public.ap_items (section_id, is_high_yield)
  where is_high_yield = true and is_active = true;

create index if not exists ap_items_search_gin_idx
  on public.ap_items using gin (content_tsv);

create index if not exists ap_items_updated_at_idx
  on public.ap_items (updated_at desc);

-- ── ap_item_history ──────────────────────────────────────────
-- Lightweight attribution trail: one row per meaningful item edit.
-- Records previous and new values for content and high-yield status.
create table if not exists public.ap_item_history (
  id                    uuid        primary key default gen_random_uuid(),
  item_id               uuid        not null references public.ap_items(id) on delete cascade,
  previous_content      text        null,
  new_content           text        null,
  previous_is_high_yield boolean    null,
  new_is_high_yield     boolean     null,
  changed_by            uuid        null references auth.users(id) on delete set null,
  changed_at            timestamptz not null default now()
);

create index if not exists ap_item_history_item_idx
  on public.ap_item_history (item_id, changed_at desc);

-- ── ap_card_tags ─────────────────────────────────────────────
-- Flexible metadata on a card: site, implant system, hospital, vendor, etc.
-- tag_type examples: 'site', 'implant_system', 'hospital', 'vendor', 'approach_tag'
create table if not exists public.ap_card_tags (
  id          uuid        primary key default gen_random_uuid(),
  card_id     uuid        not null references public.ap_cards(id) on delete cascade,
  tag_type    text        not null,
  tag_value   text        not null,
  created_by  uuid        null references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint ap_card_tags_type_nonempty  check (length(btrim(tag_type)) > 0),
  constraint ap_card_tags_value_nonempty check (length(btrim(tag_value)) > 0),
  unique (card_id, tag_type, tag_value)
);

create index if not exists ap_card_tags_card_idx
  on public.ap_card_tags (card_id);

create index if not exists ap_card_tags_type_value_idx
  on public.ap_card_tags (tag_type, tag_value);

-- ── RLS ──────────────────────────────────────────────────────

alter table public.ap_procedures    enable row level security;
alter table public.ap_cards         enable row level security;
alter table public.ap_sections      enable row level security;
alter table public.ap_items         enable row level security;
alter table public.ap_item_history  enable row level security;
alter table public.ap_card_tags     enable row level security;

-- ap_procedures
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_procedures' and policyname='AP members can select procedures') then
    create policy "AP members can select procedures"
      on public.ap_procedures for select
      using (public.can_view_attending_preferences(program_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_procedures' and policyname='AP members can insert procedures') then
    create policy "AP members can insert procedures"
      on public.ap_procedures for insert
      with check (public.can_edit_attending_preferences(program_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_procedures' and policyname='AP members can update procedures') then
    create policy "AP members can update procedures"
      on public.ap_procedures for update
      using (public.can_edit_attending_preferences(program_id));
  end if;
end $$;

-- ap_cards
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_cards' and policyname='AP members can select cards') then
    create policy "AP members can select cards"
      on public.ap_cards for select
      using (public.can_view_attending_preferences(program_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_cards' and policyname='AP members can insert cards') then
    create policy "AP members can insert cards"
      on public.ap_cards for insert
      with check (public.can_edit_attending_preferences(program_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_cards' and policyname='AP members can update cards') then
    create policy "AP members can update cards"
      on public.ap_cards for update
      using (public.can_edit_attending_preferences(program_id));
  end if;
end $$;

-- ap_sections — join to parent card for program_id
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_sections' and policyname='AP members can select sections') then
    create policy "AP members can select sections"
      on public.ap_sections for select
      using (
        exists (
          select 1 from public.ap_cards c
          where c.id = ap_sections.card_id
            and public.can_view_attending_preferences(c.program_id)
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_sections' and policyname='AP members can insert sections') then
    create policy "AP members can insert sections"
      on public.ap_sections for insert
      with check (
        exists (
          select 1 from public.ap_cards c
          where c.id = ap_sections.card_id
            and public.can_edit_attending_preferences(c.program_id)
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_sections' and policyname='AP members can update sections') then
    create policy "AP members can update sections"
      on public.ap_sections for update
      using (
        exists (
          select 1 from public.ap_cards c
          where c.id = ap_sections.card_id
            and public.can_edit_attending_preferences(c.program_id)
        )
      );
  end if;
end $$;

-- ap_items — join section → card for program_id
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_items' and policyname='AP members can select items') then
    create policy "AP members can select items"
      on public.ap_items for select
      using (
        exists (
          select 1
          from public.ap_sections s
          join public.ap_cards c on c.id = s.card_id
          where s.id = ap_items.section_id
            and public.can_view_attending_preferences(c.program_id)
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_items' and policyname='AP members can insert items') then
    create policy "AP members can insert items"
      on public.ap_items for insert
      with check (
        exists (
          select 1
          from public.ap_sections s
          join public.ap_cards c on c.id = s.card_id
          where s.id = ap_items.section_id
            and public.can_edit_attending_preferences(c.program_id)
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_items' and policyname='AP members can update items') then
    create policy "AP members can update items"
      on public.ap_items for update
      using (
        exists (
          select 1
          from public.ap_sections s
          join public.ap_cards c on c.id = s.card_id
          where s.id = ap_items.section_id
            and public.can_edit_attending_preferences(c.program_id)
        )
      );
  end if;
end $$;

-- ap_item_history — readable by program members; written only via RPC/API
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_item_history' and policyname='AP members can select item history') then
    create policy "AP members can select item history"
      on public.ap_item_history for select
      using (
        exists (
          select 1
          from public.ap_items i
          join public.ap_sections s on s.id = i.section_id
          join public.ap_cards c   on c.id = s.card_id
          where i.id = ap_item_history.item_id
            and public.can_view_attending_preferences(c.program_id)
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_item_history' and policyname='AP members can insert item history') then
    create policy "AP members can insert item history"
      on public.ap_item_history for insert
      with check (
        exists (
          select 1
          from public.ap_items i
          join public.ap_sections s on s.id = i.section_id
          join public.ap_cards c   on c.id = s.card_id
          where i.id = ap_item_history.item_id
            and public.can_edit_attending_preferences(c.program_id)
        )
      );
  end if;
end $$;

-- ap_card_tags
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_card_tags' and policyname='AP members can select card tags') then
    create policy "AP members can select card tags"
      on public.ap_card_tags for select
      using (
        exists (
          select 1 from public.ap_cards c
          where c.id = ap_card_tags.card_id
            and public.can_view_attending_preferences(c.program_id)
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_card_tags' and policyname='AP members can insert card tags') then
    create policy "AP members can insert card tags"
      on public.ap_card_tags for insert
      with check (
        exists (
          select 1 from public.ap_cards c
          where c.id = ap_card_tags.card_id
            and public.can_edit_attending_preferences(c.program_id)
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ap_card_tags' and policyname='AP members can delete card tags') then
    create policy "AP members can delete card tags"
      on public.ap_card_tags for delete
      using (
        exists (
          select 1 from public.ap_cards c
          where c.id = ap_card_tags.card_id
            and public.can_edit_attending_preferences(c.program_id)
        )
      );
  end if;
end $$;

-- ── RPC: create_ap_card_with_sections ────────────────────────
-- Creates a card and seeds all 18 default sections atomically.
-- Validates: caller is active member, attending and procedure
-- belong to the same program, no duplicate active card exists.
-- Returns the new card id.
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
  -- Verify caller is active member of the target program
  if not public.is_active_ap_program_member(p_program_id) then
    raise exception 'User is not an active member of this program.' using errcode = 'P0001';
  end if;

  -- Verify attending belongs to same program
  if not exists (
    select 1 from public.program_attendings pa
    where pa.id = p_attending_id
      and pa.program_id = p_program_id
      and pa.is_active = true
  ) then
    raise exception 'Attending not found in this program.' using errcode = 'P0002';
  end if;

  -- Verify procedure belongs to same program
  if not exists (
    select 1 from public.ap_procedures pr
    where pr.id = p_procedure_id
      and pr.program_id = p_program_id
      and pr.is_active = true
  ) then
    raise exception 'Procedure not found in this program.' using errcode = 'P0003';
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
    raise exception 'An active preference card already exists for this attending, procedure, and site.' using errcode = 'P0004';
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
