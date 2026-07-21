-- Direct human-review assertions for educational entity links.
--
-- Assertions attach to existing migrated links and never rewrite their
-- curriculum_node_bridge provenance. Pilot eligibility requires a separate,
-- approved direct_human_review assertion.

begin;

create table if not exists public.educational_link_review_assertions (
  id uuid primary key default gen_random_uuid(),
  question_link_id uuid null references public.question_canonical_entity_links(id) on delete cascade,
  card_link_id uuid null references public.card_canonical_entity_links(id) on delete cascade,
  source_resource_id text not null,
  canonical_entity_id uuid not null references public.canonical_entities(id) on delete restrict,
  mapping_role text not null,
  reviewer_decision text not null,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null,
  confidence numeric(4,3) not null,
  provenance_method text not null default 'direct_human_review',
  safe_notes text null,
  evidence_hashes text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint educational_link_review_assertions_one_link_check
    check ((question_link_id is not null)::integer + (card_link_id is not null)::integer = 1),
  constraint educational_link_review_assertions_role_check
    check (mapping_role in ('tests', 'teaches', 'explains', 'demonstrates', 'broadly_related')),
  constraint educational_link_review_assertions_decision_check
    check (reviewer_decision in ('approved', 'rejected', 'needs_changes')),
  constraint educational_link_review_assertions_confidence_check
    check (confidence >= 0 and confidence <= 1),
  constraint educational_link_review_assertions_provenance_check
    check (provenance_method = 'direct_human_review'),
  constraint educational_link_review_assertions_safe_notes_check
    check (safe_notes is null or char_length(safe_notes) <= 1000)
);

create unique index if not exists educational_link_review_question_active_uidx
  on public.educational_link_review_assertions (question_link_id)
  where question_link_id is not null and is_active;
create unique index if not exists educational_link_review_card_active_uidx
  on public.educational_link_review_assertions (card_link_id)
  where card_link_id is not null and is_active;
create index if not exists educational_link_review_entity_decision_idx
  on public.educational_link_review_assertions
    (canonical_entity_id, reviewer_decision, confidence desc)
  where is_active;
create index if not exists educational_link_review_reviewer_idx
  on public.educational_link_review_assertions (reviewer_user_id, reviewed_at desc);

create or replace function public.validate_educational_link_review_assertion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actual_resource_id text;
  actual_entity_id uuid;
begin
  if new.question_link_id is not null then
    select q.external_question_id, l.canonical_entity_id
      into actual_resource_id, actual_entity_id
    from public.question_canonical_entity_links l
    join public.external_questions q on q.id = l.external_question_id
    where l.id = new.question_link_id;
  else
    select l.canonical_card_id::text, l.canonical_entity_id
      into actual_resource_id, actual_entity_id
    from public.card_canonical_entity_links l
    where l.id = new.card_link_id;
  end if;

  if actual_resource_id is null then
    raise exception 'review assertion link does not resolve to a resource';
  end if;
  if new.source_resource_id <> actual_resource_id then
    raise exception 'source_resource_id does not match the reviewed link';
  end if;
  if new.canonical_entity_id <> actual_entity_id then
    raise exception 'canonical_entity_id does not match the reviewed link';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_educational_link_review_assertion
  on public.educational_link_review_assertions;
create trigger validate_educational_link_review_assertion
  before insert or update of question_link_id,card_link_id,source_resource_id,canonical_entity_id
  on public.educational_link_review_assertions
  for each row execute function public.validate_educational_link_review_assertion();

drop trigger if exists set_educational_link_review_assertions_updated_at
  on public.educational_link_review_assertions;
create trigger set_educational_link_review_assertions_updated_at
  before update on public.educational_link_review_assertions
  for each row execute function public.tg_set_updated_at();

alter table public.educational_link_review_assertions enable row level security;
alter table public.educational_link_review_assertions force row level security;
revoke all on table public.educational_link_review_assertions from anon, authenticated, service_role;
grant select, insert, update, delete on table public.educational_link_review_assertions to service_role;
drop policy if exists educational_link_review_service_role_all
  on public.educational_link_review_assertions;
create policy educational_link_review_service_role_all
  on public.educational_link_review_assertions
  for all to service_role using (true) with check (true);

create or replace view public.v_patellar_instability_pilot_question_links
with (security_invoker = true)
as
select
  l.id as question_link_id,
  q.id as external_question_uuid,
  q.external_question_id as source_question_id,
  l.canonical_entity_id,
  a.mapping_role,
  a.confidence as direct_review_confidence,
  a.reviewer_user_id,
  a.reviewed_at,
  l.retarget_path as historical_retarget_path,
  l.mapping_confidence as historical_mapping_confidence
from public.question_canonical_entity_links l
join public.educational_link_review_assertions a
  on a.question_link_id = l.id and a.is_active
join public.external_questions q on q.id = l.external_question_id
join public.external_sources s on s.id = q.source_id
where l.is_active
  and l.review_status = 'approved'
  and l.mapping_confidence >= 0.950
  and a.reviewer_decision = 'approved'
  and a.provenance_method = 'direct_human_review'
  and a.confidence >= 0.950
  and a.mapping_role = 'tests'
  and l.canonical_entity_id = '1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a'::uuid
  and s.slug = 'orthobullets'
  and q.is_active
  and q.specialty_normalized = 'knee-sports'
  and q.topic_slug = 'patellar-instability';

create or replace view public.v_patellar_instability_pilot_card_links
with (security_invoker = true)
as
select
  l.id as card_link_id,
  c.id as canonical_card_id,
  c.current_version_id,
  l.canonical_entity_id,
  n.anki_note_guid as note_guid,
  ac.card_ord as card_ordinal,
  ac.anki_card_id as source_card_id_hint,
  d.full_name as deck_branch,
  a.mapping_role,
  a.confidence as direct_review_confidence,
  a.reviewer_user_id,
  a.reviewed_at,
  l.retarget_path as historical_retarget_path,
  l.mapping_confidence as historical_mapping_confidence
from public.card_canonical_entity_links l
join public.educational_link_review_assertions a
  on a.card_link_id = l.id and a.is_active
join public.canonical_cards c on c.id = l.canonical_card_id
join public.canonical_card_versions v on v.id = c.current_version_id
join public.anki_cards ac on ac.id = c.anki_card_id
join public.anki_notes n on n.id = c.anki_note_id
join public.anki_decks d on d.id = ac.deck_id
where l.is_active
  and l.review_status = 'approved'
  and l.mapping_confidence >= 0.950
  and a.reviewer_decision = 'approved'
  and a.provenance_method = 'direct_human_review'
  and a.confidence >= 0.950
  and a.mapping_role in ('tests', 'teaches', 'explains', 'demonstrates')
  and l.canonical_entity_id = '1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a'::uuid
  and c.is_active and v.is_active and ac.is_active and n.is_active
  and n.anki_note_guid is not null
  and d.full_name = 'Marty McFlyin''s Ortho Deck::3) OrthoBullets::Knee & Sports::Knee::Knee Extensor Mechanism::Patellar Instability';

revoke all on table public.v_patellar_instability_pilot_question_links
  from anon, authenticated;
revoke all on table public.v_patellar_instability_pilot_card_links
  from anon, authenticated;
grant select on table public.v_patellar_instability_pilot_question_links
  to service_role;
grant select on table public.v_patellar_instability_pilot_card_links
  to service_role;

comment on table public.educational_link_review_assertions is
  'Direct human-review evidence attached to educational canonical-entity links. Historical link provenance remains unchanged.';
comment on view public.v_patellar_instability_pilot_question_links is
  'Pilot question links that satisfy direct-review, source/topic, confidence, and active-resource requirements.';
comment on view public.v_patellar_instability_pilot_card_links is
  'Pilot card links that satisfy direct-review, deck, confidence, version, and stable-source-identity requirements.';

commit;
