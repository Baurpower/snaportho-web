begin;

create table if not exists public.brobot_answer_support (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  answer_hash text not null check (answer_hash ~ '^[0-9a-f]{64}$'),
  answer_anchor_id text not null,
  answer_anchor_text text not null,
  answer_anchor_hash text not null check (answer_anchor_hash ~ '^[0-9a-f]{64}$'),
  claim_id uuid not null references public.educational_claims(id),
  claim_version_id uuid null,
  verification_method text not null,
  verification_status text not null check (verification_status in ('verified','rejected')),
  verification_reason text null,
  created_at timestamptz not null default now(),
  constraint brobot_answer_support_message_owner_fkey foreign key (message_id,user_id)
    references public.brobot_messages(id,user_id) on delete cascade,
  constraint brobot_answer_support_unique unique(message_id,answer_anchor_id,claim_id)
);

alter table public.brobot_answer_support enable row level security;
create policy brobot_answer_support_owner_read on public.brobot_answer_support
  for select to authenticated using (auth.uid() = user_id);
revoke all on public.brobot_answer_support from anon;
revoke all on public.brobot_answer_support from authenticated;
grant select on public.brobot_answer_support to authenticated;
grant select,insert,update,delete on public.brobot_answer_support to service_role;

alter table public.brobot_anki_references
  add column if not exists support_claim_id uuid references public.educational_claims(id),
  add column if not exists support_claim_version_id uuid,
  add column if not exists answer_anchor_id text,
  add column if not exists answer_anchor_hash text,
  add column if not exists match_source text not null default 'semantic_fallback',
  add column if not exists support_confidence numeric;

alter table public.brobot_anki_references drop constraint if exists brobot_anki_references_match_source_check;
alter table public.brobot_anki_references add constraint brobot_anki_references_match_source_check
  check (match_source in ('reviewed_claim_link','auto_approved_claim_link','semantic_fallback'));

commit;
