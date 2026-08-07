-- Ortho sign-out tracker foundation.
--
-- A shared, program-scoped handoff surface: one signout_services row per service,
-- a signout_cards row per patient. Card bodies are stored as AES-256-GCM ciphertext
-- (encrypted in the app, never in the database) under a "card" key; direct identifiers
-- (name/DOB/MRN) are quarantined in signout_patient_ids under a SEPARATE "identifier"
-- key with an append-only reveal audit. Non-identifying facets (severity, status,
-- handle, sort_order, pinned; later location/surgery/surgery_date) stay plaintext so
-- the UI can sort/filter without decrypting. POD is derived from surgery_date in app
-- code (see 20260805_150000_signout_surgery_location.sql).
--
-- Recovery-safe design (mirrors the MyCases foundation):
--   * One transaction; a failed run leaves no partial state.
--   * CREATE ... IF NOT EXISTS permits a retry after an interrupted SQL-editor run.
--   * Policies are dropped/recreated so their definitions converge on rerun.
--
-- See docs/signout-tracker-plan-2026-08-05.md.

begin;

-- -----------------------------------------------------------------------------
-- 1. Services. A shared list, scoped to a program.
-- -----------------------------------------------------------------------------

create table if not exists public.signout_services (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  phi_enabled boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint signout_services_program_name_key unique (program_id, name)
);

create index if not exists signout_services_program_idx
  on public.signout_services (program_id)
  where is_active;

-- -----------------------------------------------------------------------------
-- 2. Cards. One patient per card. Body encrypted; facets queryable.
-- -----------------------------------------------------------------------------

create table if not exists public.signout_cards (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.signout_services(id) on delete cascade,
  handle text not null check (length(btrim(handle)) between 1 and 40),
  severity text not null default 'stable'
    check (severity in ('stable', 'watcher', 'unstable')),
  status text not null default 'active'
    check (status in ('active', 'discharged')),
  sort_order integer not null default 0,
  pinned boolean not null default false,
  body_ct text,      -- base64 AES-256-GCM ciphertext (ciphertext || auth tag)
  body_nonce text,   -- base64 12-byte nonce
  key_id text not null,
  version bigint not null default 1,
  discharged_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists signout_cards_service_order_idx
  on public.signout_cards (service_id, sort_order);

create index if not exists signout_cards_service_status_idx
  on public.signout_cards (service_id, status);

-- -----------------------------------------------------------------------------
-- 3. Card history. Append-only snapshot of each committed body version.
-- -----------------------------------------------------------------------------

create table if not exists public.signout_card_history (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.signout_cards(id) on delete cascade,
  body_ct text,
  body_nonce text,
  key_id text not null,
  version bigint not null,
  edited_by uuid references auth.users(id) on delete set null,
  edited_at timestamptz not null default now()
);

create index if not exists signout_card_history_card_idx
  on public.signout_card_history (card_id, version desc);

-- -----------------------------------------------------------------------------
-- 4. Quarantined identifiers. SEPARATE key. Never fed to the LLM path.
-- -----------------------------------------------------------------------------

create table if not exists public.signout_patient_ids (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.signout_cards(id) on delete cascade,
  name_ct text,   -- base64 AES-256-GCM ciphertext, identifier key
  dob_ct text,
  mrn_ct text,
  nonce text,     -- base64 12-byte nonce (shared across the row's fields)
  id_key_id text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signout_patient_ids_card_key unique (card_id)
);

-- -----------------------------------------------------------------------------
-- 5. Reveal audit. Append-only: who decrypted a patient's identity, and when.
-- -----------------------------------------------------------------------------

create table if not exists public.signout_id_access (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.signout_patient_ids(id) on delete cascade,
  revealed_by uuid references auth.users(id) on delete set null,
  revealed_at timestamptz not null default now()
);

create index if not exists signout_id_access_patient_idx
  on public.signout_id_access (patient_id, revealed_at desc);

-- -----------------------------------------------------------------------------
-- 6. RLS. Access is program membership: a row is visible to a user with an active
-- program_memberships row in the owning program. Cards/history/ids/audit reach the
-- program by joining up through signout_services. History and the reveal audit are
-- insert-only (no update/delete policy) so the trail cannot be rewritten.
--
-- Routes run business queries through the service-role admin client after an explicit
-- membership check, so these policies are defense-in-depth for any anon-key access.
-- -----------------------------------------------------------------------------

alter table public.signout_services enable row level security;
alter table public.signout_cards enable row level security;
alter table public.signout_card_history enable row level security;
alter table public.signout_patient_ids enable row level security;
alter table public.signout_id_access enable row level security;

do $$
declare
  policy_name text;
  tbl text;
begin
  foreach tbl in array array[
    'signout_services',
    'signout_cards',
    'signout_card_history',
    'signout_patient_ids',
    'signout_id_access'
  ]
  loop
    for policy_name in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = tbl
    loop
      execute format('drop policy %I on public.%I', policy_name, tbl);
    end loop;
  end loop;
end
$$;

-- signout_services: full CRUD for any active member of the program.
create policy signout_services_select on public.signout_services for select using (
  exists (
    select 1 from public.program_memberships m
    where m.program_id = signout_services.program_id
      and m.user_id = auth.uid() and m.is_active
  )
);
create policy signout_services_insert on public.signout_services for insert with check (
  exists (
    select 1 from public.program_memberships m
    where m.program_id = signout_services.program_id
      and m.user_id = auth.uid() and m.is_active
  )
);
create policy signout_services_update on public.signout_services for update using (
  exists (
    select 1 from public.program_memberships m
    where m.program_id = signout_services.program_id
      and m.user_id = auth.uid() and m.is_active
  )
);
create policy signout_services_delete on public.signout_services for delete using (
  exists (
    select 1 from public.program_memberships m
    where m.program_id = signout_services.program_id
      and m.user_id = auth.uid() and m.is_active
  )
);

-- signout_cards: full CRUD for members of the card's service's program.
create policy signout_cards_select on public.signout_cards for select using (
  exists (
    select 1 from public.signout_services s
    join public.program_memberships m on m.program_id = s.program_id
    where s.id = signout_cards.service_id
      and m.user_id = auth.uid() and m.is_active
  )
);
create policy signout_cards_insert on public.signout_cards for insert with check (
  exists (
    select 1 from public.signout_services s
    join public.program_memberships m on m.program_id = s.program_id
    where s.id = signout_cards.service_id
      and m.user_id = auth.uid() and m.is_active
  )
);
create policy signout_cards_update on public.signout_cards for update using (
  exists (
    select 1 from public.signout_services s
    join public.program_memberships m on m.program_id = s.program_id
    where s.id = signout_cards.service_id
      and m.user_id = auth.uid() and m.is_active
  )
);
create policy signout_cards_delete on public.signout_cards for delete using (
  exists (
    select 1 from public.signout_services s
    join public.program_memberships m on m.program_id = s.program_id
    where s.id = signout_cards.service_id
      and m.user_id = auth.uid() and m.is_active
  )
);

-- signout_card_history: insert-only + read for members. No update/delete policy.
create policy signout_card_history_select on public.signout_card_history for select using (
  exists (
    select 1 from public.signout_cards c
    join public.signout_services s on s.id = c.service_id
    join public.program_memberships m on m.program_id = s.program_id
    where c.id = signout_card_history.card_id
      and m.user_id = auth.uid() and m.is_active
  )
);
create policy signout_card_history_insert on public.signout_card_history for insert with check (
  exists (
    select 1 from public.signout_cards c
    join public.signout_services s on s.id = c.service_id
    join public.program_memberships m on m.program_id = s.program_id
    where c.id = signout_card_history.card_id
      and m.user_id = auth.uid() and m.is_active
  )
);

-- signout_patient_ids: CRUD for members (audited reveal is enforced in the app path).
create policy signout_patient_ids_select on public.signout_patient_ids for select using (
  exists (
    select 1 from public.signout_cards c
    join public.signout_services s on s.id = c.service_id
    join public.program_memberships m on m.program_id = s.program_id
    where c.id = signout_patient_ids.card_id
      and m.user_id = auth.uid() and m.is_active
  )
);
create policy signout_patient_ids_insert on public.signout_patient_ids for insert with check (
  exists (
    select 1 from public.signout_cards c
    join public.signout_services s on s.id = c.service_id
    join public.program_memberships m on m.program_id = s.program_id
    where c.id = signout_patient_ids.card_id
      and m.user_id = auth.uid() and m.is_active
  )
);
create policy signout_patient_ids_update on public.signout_patient_ids for update using (
  exists (
    select 1 from public.signout_cards c
    join public.signout_services s on s.id = c.service_id
    join public.program_memberships m on m.program_id = s.program_id
    where c.id = signout_patient_ids.card_id
      and m.user_id = auth.uid() and m.is_active
  )
);
create policy signout_patient_ids_delete on public.signout_patient_ids for delete using (
  exists (
    select 1 from public.signout_cards c
    join public.signout_services s on s.id = c.service_id
    join public.program_memberships m on m.program_id = s.program_id
    where c.id = signout_patient_ids.card_id
      and m.user_id = auth.uid() and m.is_active
  )
);

-- signout_id_access: insert-only + read for members. No update/delete policy.
create policy signout_id_access_select on public.signout_id_access for select using (
  exists (
    select 1 from public.signout_patient_ids p
    join public.signout_cards c on c.id = p.card_id
    join public.signout_services s on s.id = c.service_id
    join public.program_memberships m on m.program_id = s.program_id
    where p.id = signout_id_access.patient_id
      and m.user_id = auth.uid() and m.is_active
  )
);
create policy signout_id_access_insert on public.signout_id_access for insert with check (
  exists (
    select 1 from public.signout_patient_ids p
    join public.signout_cards c on c.id = p.card_id
    join public.signout_services s on s.id = c.service_id
    join public.program_memberships m on m.program_id = s.program_id
    where p.id = signout_id_access.patient_id
      and m.user_id = auth.uid() and m.is_active
  )
);

comment on table public.signout_services is
  'Shared, program-scoped ortho sign-out lists. Any active program member may create.';
comment on table public.signout_cards is
  'One patient per card. body_ct is AES-256-GCM ciphertext (card key); facets are plaintext.';
comment on table public.signout_patient_ids is
  'Quarantined direct identifiers under a separate key. Reveals audited in signout_id_access.';
comment on table public.signout_id_access is
  'Append-only audit of identifier decrypts (who revealed a patient identity, and when).';

commit;
