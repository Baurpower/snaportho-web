-- User-owned educational MyCases foundation.
-- Intentionally contains no PHI, plaintext attachment, or encryption-key columns.
--
-- Recovery-safe design:
--   * The transaction prevents a new run from leaving additional partial state.
--   * CREATE ... IF NOT EXISTS permits a retry after an interrupted SQL-editor run.
--   * Every (id, user_id) ownership key exists before a child foreign key references it.
--   * Policies and triggers are replaced on rerun so their definitions converge.

begin;

-- -----------------------------------------------------------------------------
-- 1. Parent: cases. This may already exist after the original partial run.
-- -----------------------------------------------------------------------------

create table if not exists public.mycases_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 160),
  procedure_name text not null check (length(btrim(procedure_name)) between 1 and 160),
  diagnosis text,
  status text not null default 'draft'
    check (status in ('draft', 'upcoming', 'completed', 'archived')),
  rotation_context text,
  attending_context text,
  difficulty smallint check (difficulty between 0 and 5),
  autonomy smallint check (autonomy between 0 and 5),
  preparation text check (length(preparation) <= 10000),
  debrief text check (length(debrief) <= 10000),
  source text not null default 'web' check (source in ('web', 'ios', 'import')),
  client_source_id uuid,
  version bigint not null default 1,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint mycases_cases_id_user_id_key unique (id, user_id),
  constraint mycases_cases_source_client_key unique (user_id, source, client_source_id)
);

-- The original failed script created mycases_cases without this composite key.
-- Add it before creating mycases_learning_items. A constraint statement is atomic,
-- and this block is safe on every subsequent rerun.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.mycases_cases'::regclass
      and conname = 'mycases_cases_id_user_id_key'
      and contype = 'u'
  ) then
    alter table public.mycases_cases
      add constraint mycases_cases_id_user_id_key unique (id, user_id);
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 2. Parent: learning items. The case ownership key now exists.
-- -----------------------------------------------------------------------------

create table if not exists public.mycases_learning_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid,
  kind text not null
    check (kind in (
      'note', 'pearl', 'reflection', 'preparation', 'question', 'preference',
      'checklist', 'postop_learning'
    )),
  title text check (length(title) <= 200),
  content text not null check (length(btrim(content)) between 1 and 10000),
  procedure_name text,
  diagnosis text,
  rotation_context text,
  attending_context text,
  topic text,
  source text not null default 'web' check (source in ('web', 'ios', 'import')),
  client_source_id uuid,
  version bigint not null default 1,
  is_pinned boolean not null default false,
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search_tsv tsvector generated always as (
    to_tsvector(
      'english'::regconfig,
      coalesce(title, '') || ' ' || content || ' ' ||
      coalesce(procedure_name, '') || ' ' || coalesce(topic, '')
    )
  ) stored,
  constraint mycases_learning_items_id_user_id_key unique (id, user_id),
  constraint mycases_learning_items_source_client_key
    unique (user_id, source, client_source_id),
  constraint mycases_learning_case_owner_fk
    foreign key (case_id, user_id)
    references public.mycases_cases(id, user_id)
    on delete set null (case_id)
);

-- Recreate this FK so a table left by an intermediate/manual recovery also
-- converges on column-scoped SET NULL. Plain SET NULL would incorrectly try to
-- null the non-null user_id column of the composite key.
alter table public.mycases_learning_items
  drop constraint if exists mycases_learning_case_owner_fk;
alter table public.mycases_learning_items
  add constraint mycases_learning_case_owner_fk
  foreign key (case_id, user_id)
  references public.mycases_cases(id, user_id)
  on delete set null (case_id);

-- Defensive recovery for a run interrupted after learning-items table creation.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.mycases_learning_items'::regclass
      and conname = 'mycases_learning_items_id_user_id_key'
      and contype = 'u'
  ) then
    alter table public.mycases_learning_items
      add constraint mycases_learning_items_id_user_id_key unique (id, user_id);
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 3. Remaining parents. Their ownership keys precede all link tables.
-- -----------------------------------------------------------------------------

create table if not exists public.mycases_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40),
  color text,
  created_at timestamptz not null default now(),
  constraint mycases_tags_id_user_id_key unique (id, user_id),
  constraint mycases_tags_user_name_key unique (user_id, name)
);

create table if not exists public.mycases_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  description text check (length(description) <= 500),
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mycases_collections_id_user_id_key unique (id, user_id),
  constraint mycases_collections_user_name_key unique (user_id, name)
);

-- Defensive recovery if either parent table was created by an earlier partial
-- version whose equivalent unique constraints had system-generated names.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mycases_tags'::regclass
      and conname = 'mycases_tags_id_user_id_key'
      and contype = 'u'
  ) then
    alter table public.mycases_tags
      add constraint mycases_tags_id_user_id_key unique (id, user_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mycases_collections'::regclass
      and conname = 'mycases_collections_id_user_id_key'
      and contype = 'u'
  ) then
    alter table public.mycases_collections
      add constraint mycases_collections_id_user_id_key unique (id, user_id);
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 4. Link tables. Composite FKs enforce that both records have the same owner.
-- Hard deletion of a parent removes only its links. Auth-user deletion also
-- cascades directly through user_id; PostgreSQL safely handles both paths.
-- -----------------------------------------------------------------------------

create table if not exists public.mycases_case_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null,
  tag_id uuid not null,
  primary key (case_id, tag_id),
  constraint mycases_case_tags_case_owner_fk
    foreign key (case_id, user_id)
    references public.mycases_cases(id, user_id)
    on delete cascade,
  constraint mycases_case_tags_tag_owner_fk
    foreign key (tag_id, user_id)
    references public.mycases_tags(id, user_id)
    on delete cascade
);

create table if not exists public.mycases_learning_item_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  learning_item_id uuid not null,
  tag_id uuid not null,
  primary key (learning_item_id, tag_id),
  constraint mycases_learning_item_tags_item_owner_fk
    foreign key (learning_item_id, user_id)
    references public.mycases_learning_items(id, user_id)
    on delete cascade,
  constraint mycases_learning_item_tags_tag_owner_fk
    foreign key (tag_id, user_id)
    references public.mycases_tags(id, user_id)
    on delete cascade
);

create table if not exists public.mycases_collection_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid not null,
  learning_item_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (collection_id, learning_item_id),
  constraint mycases_collection_items_collection_owner_fk
    foreign key (collection_id, user_id)
    references public.mycases_collections(id, user_id)
    on delete cascade,
  constraint mycases_collection_items_item_owner_fk
    foreign key (learning_item_id, user_id)
    references public.mycases_learning_items(id, user_id)
    on delete cascade
);

-- -----------------------------------------------------------------------------
-- 5. Indexes. Names are stable and creation is idempotent.
-- -----------------------------------------------------------------------------

create index if not exists mycases_cases_user_updated_idx
  on public.mycases_cases (user_id, updated_at desc)
  where deleted_at is null;
create index if not exists mycases_cases_user_status_idx
  on public.mycases_cases (user_id, status, is_archived)
  where deleted_at is null;
create index if not exists mycases_learning_user_updated_idx
  on public.mycases_learning_items (user_id, updated_at desc)
  where deleted_at is null;
create index if not exists mycases_learning_user_kind_idx
  on public.mycases_learning_items (user_id, kind, is_archived)
  where deleted_at is null;
create index if not exists mycases_learning_case_idx
  on public.mycases_learning_items (user_id, case_id)
  where deleted_at is null;
create index if not exists mycases_learning_search_idx
  on public.mycases_learning_items using gin (search_tsv);

-- -----------------------------------------------------------------------------
-- 6. Version/timestamp triggers. Drop/create makes a retry converge on the
-- intended function even if a prior run stopped after one trigger was created.
-- -----------------------------------------------------------------------------

create or replace function public.mycases_touch_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end
$$;

drop trigger if exists mycases_cases_touch on public.mycases_cases;
create trigger mycases_cases_touch
  before update on public.mycases_cases
  for each row execute function public.mycases_touch_version();

drop trigger if exists mycases_learning_touch on public.mycases_learning_items;
create trigger mycases_learning_touch
  before update on public.mycases_learning_items
  for each row execute function public.mycases_touch_version();

drop trigger if exists mycases_collections_touch on public.mycases_collections;
create trigger mycases_collections_touch
  before update on public.mycases_collections
  for each row execute function public.mycases_touch_version();

-- -----------------------------------------------------------------------------
-- 7. RLS. All seven personal tables use the same owner-only contract.
-- DROP/CREATE is intentional: a retry repairs an interrupted or stale policy set.
-- -----------------------------------------------------------------------------

alter table public.mycases_cases enable row level security;
alter table public.mycases_learning_items enable row level security;
alter table public.mycases_tags enable row level security;
alter table public.mycases_case_tags enable row level security;
alter table public.mycases_learning_item_tags enable row level security;
alter table public.mycases_collections enable row level security;
alter table public.mycases_collection_items enable row level security;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'mycases_cases',
    'mycases_learning_items',
    'mycases_tags',
    'mycases_case_tags',
    'mycases_learning_item_tags',
    'mycases_collections',
    'mycases_collection_items'
  ]
  loop
    -- These are new private tables. Remove any policy left by a partial/manual
    -- run so an unexpected permissive policy cannot broaden the owner contract.
    for policy_name in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy %I on public.%I', policy_name, table_name);
    end loop;

    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)',
      table_name || '_select_own', table_name
    );
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id)',
      table_name || '_insert_own', table_name
    );
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      table_name || '_update_own', table_name
    );
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id)',
      table_name || '_delete_own', table_name
    );
  end loop;
end
$$;

comment on table public.mycases_cases is
  'User-owned educational case records. PHI and plaintext media are prohibited.';
comment on table public.mycases_learning_items is
  'Reusable user-owned educational knowledge with optional case provenance.';

commit;
