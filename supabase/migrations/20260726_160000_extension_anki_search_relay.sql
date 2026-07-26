begin;

create table public.educational_anki_search_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_device_token_id uuid not null references public.brobot_anki_device_tokens(id) on delete restrict,
  claimed_by_device_token_id uuid null references public.brobot_anki_device_tokens(id) on delete set null,
  contract_version text not null default 'snaportho-extension-anki-search.v1',
  provider text not null,
  submitted_native_id text not null,
  normalized_native_id text not null,
  question_fingerprint_hash text not null,
  tested_concept text not null,
  concept_summary text not null,
  concept_source text not null,
  requested_action text not null default 'open_browse_and_return_results',
  status text not null default 'queued',
  idempotency_key uuid not null,
  claim_expires_at timestamptz null,
  result_summary jsonb not null default '{}'::jsonb,
  error_code text null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,
  constraint educational_anki_search_user_idempotent unique(user_id,idempotency_key),
  constraint educational_anki_search_contract check(contract_version='snaportho-extension-anki-search.v1'),
  constraint educational_anki_search_provider check(provider='orthobullets'),
  constraint educational_anki_search_fingerprint check(question_fingerprint_hash~'^[a-f0-9]{64}$'),
  constraint educational_anki_search_source check(concept_source in('brobot_explanation','user_edited','page_metadata')),
  constraint educational_anki_search_action check(requested_action='open_browse_and_return_results'),
  constraint educational_anki_search_status check(status in('queued','claimed','resolving_local','completed','no_local_results','review_required','failed','expired','cancelled')),
  constraint educational_anki_search_safe_result check(public.educational_metadata_is_safe(result_summary)),
  constraint educational_anki_search_lengths check(
    char_length(submitted_native_id) between 1 and 200 and
    char_length(normalized_native_id) between 1 and 200 and
    char_length(tested_concept) between 1 and 300 and
    char_length(concept_summary) between 1 and 600
  )
);

create index educational_anki_search_pending_idx
  on public.educational_anki_search_requests(user_id,status,created_at)
  where status in('queued','claimed');

create trigger set_educational_anki_search_updated_at
  before update on public.educational_anki_search_requests
  for each row execute function public.tg_set_updated_at();

alter table public.educational_anki_search_requests enable row level security;
alter table public.educational_anki_search_requests force row level security;
revoke all on public.educational_anki_search_requests from anon,authenticated,service_role;
grant select,insert,update,delete on public.educational_anki_search_requests to service_role;
create policy educational_anki_search_service_role_all
  on public.educational_anki_search_requests for all to service_role using(true) with check(true);

comment on table public.educational_anki_search_requests is
  'Metadata-only relay from a linked question extension to a linked Anki desktop. Never stores question bodies, answers, explanations, images, or raw HTML.';

commit;
