begin;

create table public.brobot_anki_source_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  canonical_url text not null,
  source_url text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brobot_anki_source_pages_provider_check
    check (provider in ('orthobullets', 'rock')),
  constraint brobot_anki_source_pages_host_check
    check (
      (provider = 'orthobullets' and canonical_url ~ '^https://orthobullets\.com(/|[?#]|$)')
      or (provider = 'rock' and canonical_url ~ '^https://rock\.aaos\.org(/|[?#]|$)')
    ),
  constraint brobot_anki_source_pages_url_check
    check (char_length(canonical_url) between 12 and 1500 and char_length(source_url) between 12 and 2000),
  constraint brobot_anki_source_pages_title_check
    check (char_length(title) between 1 and 500),
  constraint brobot_anki_source_pages_user_provider_url_key
    unique (user_id, provider, canonical_url),
  constraint brobot_anki_source_pages_user_id_key
    unique (user_id, id)
);

create table public.brobot_anki_card_page_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  canonical_card_id uuid not null references public.canonical_cards(id) on delete cascade,
  source_page_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, canonical_card_id, source_page_id),
  constraint brobot_anki_card_page_links_owned_page_fk
    foreign key (user_id, source_page_id)
    references public.brobot_anki_source_pages(user_id, id) on delete cascade
);

create index brobot_anki_card_page_links_page_idx
  on public.brobot_anki_card_page_links(user_id, source_page_id, canonical_card_id);

alter table public.brobot_anki_source_pages enable row level security;
alter table public.brobot_anki_card_page_links enable row level security;

create policy brobot_anki_source_pages_select_own
  on public.brobot_anki_source_pages for select to authenticated
  using (user_id = (select auth.uid()));
create policy brobot_anki_source_pages_insert_own
  on public.brobot_anki_source_pages for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy brobot_anki_source_pages_update_own
  on public.brobot_anki_source_pages for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy brobot_anki_source_pages_delete_own
  on public.brobot_anki_source_pages for delete to authenticated
  using (user_id = (select auth.uid()));

create policy brobot_anki_card_page_links_select_own
  on public.brobot_anki_card_page_links for select to authenticated
  using (user_id = (select auth.uid()));
create policy brobot_anki_card_page_links_insert_own
  on public.brobot_anki_card_page_links for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy brobot_anki_card_page_links_delete_own
  on public.brobot_anki_card_page_links for delete to authenticated
  using (user_id = (select auth.uid()));

grant all on public.brobot_anki_source_pages, public.brobot_anki_card_page_links to service_role;

comment on table public.brobot_anki_source_pages is
  'User-registered Orthobullets and ROCK page identities for local Anki card linking; stores URLs and titles only.';
comment on table public.brobot_anki_card_page_links is
  'User-scoped many-to-many links from stable canonical Anki cards to registered source pages.';

commit;
