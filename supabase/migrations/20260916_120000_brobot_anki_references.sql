begin;

create table public.brobot_anki_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null,
  answer_hash text not null check (answer_hash ~ '^[a-f0-9]{64}$'),
  anchor_text text not null check (char_length(anchor_text) between 1 and 450),
  canonical_card_id uuid not null references public.canonical_cards(id) on delete restrict,
  canonical_card_version_id uuid not null references public.canonical_card_versions(id) on delete restrict,
  deck_release_id uuid not null references public.anki_deck_releases(id) on delete restrict,
  rank smallint not null check (rank between 1 and 3),
  created_at timestamptz not null default now(),
  constraint brobot_anki_references_message_owner_fkey
    foreign key (message_id, user_id)
    references public.brobot_messages(id, user_id) on delete cascade,
  constraint brobot_anki_references_message_rank_unique unique (message_id, rank),
  constraint brobot_anki_references_message_card_unique unique (message_id, canonical_card_id)
);

create index brobot_anki_references_owner_message_idx
  on public.brobot_anki_references(user_id, message_id);

alter table public.brobot_anki_references enable row level security;
create policy brobot_anki_references_owner_read
  on public.brobot_anki_references for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.brobot_anki_references from anon;
grant select on public.brobot_anki_references to authenticated;
grant select, insert, update, delete on public.brobot_anki_references to service_role;

commit;
