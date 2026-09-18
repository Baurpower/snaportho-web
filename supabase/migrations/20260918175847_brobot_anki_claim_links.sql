begin;

alter table public.brobot_anki_references
  add column claim_id text null;

create table public.brobot_anki_reference_lookups (
  message_id uuid primary key,
  user_id uuid not null,
  answer_hash text not null check (answer_hash ~ '^[a-f0-9]{64}$'),
  deck_release_id uuid not null references public.anki_deck_releases(id) on delete restrict,
  linker_version text not null,
  checked_at timestamptz not null default now(),
  foreign key (message_id, user_id) references public.brobot_messages(id, user_id) on delete cascade
);

create index brobot_anki_reference_lookups_user_idx
  on public.brobot_anki_reference_lookups(user_id, message_id);

alter table public.brobot_anki_reference_lookups enable row level security;
create policy brobot_anki_reference_lookups_owner_read
  on public.brobot_anki_reference_lookups for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.brobot_anki_reference_lookups from anon;
grant select on public.brobot_anki_reference_lookups to authenticated;
grant select, insert, update, delete on public.brobot_anki_reference_lookups to service_role;

commit;
