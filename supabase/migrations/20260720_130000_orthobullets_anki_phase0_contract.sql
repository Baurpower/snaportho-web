-- Phase 0 persistence contract for the patellar-instability pilot.
-- DDL only: this migration inserts no attempts, mappings, recommendations, or commands.

begin;

create or replace function public.educational_metadata_is_safe(value jsonb)
returns boolean language sql immutable parallel safe as $$
  select not exists (
    select 1
    from jsonb_path_query(
      coalesce(value, '{}'::jsonb),
      '$.** ? (@.type() == "object").keyvalue()'
    ) item
    where lower(item ->> 'key') = any (array[
      'stem','question','questiontext','answer','answertext','answerchoices','choices',
      'correctanswer','selectedanswer','explanation','image','images','rawhtml',
      'cardbody','front','back'
    ])
  );
$$;

create table if not exists public.educational_question_attempt_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_version text not null default 'orthobullets-anki.v1',
  request_id uuid not null,
  provider text not null default 'orthobullets',
  external_question_id uuid not null references public.external_questions(id) on delete restrict,
  question_link_id uuid not null references public.question_canonical_entity_links(id) on delete restrict,
  question_review_assertion_id uuid not null references public.educational_link_review_assertions(id) on delete restrict,
  canonical_entity_id uuid not null references public.canonical_entities(id) on delete restrict,
  session_fingerprint_hash text not null,
  review_state text not null,
  correct boolean not null,
  extension_version text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  idempotency_key text not null,
  mapping_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  retained_until timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  constraint educational_attempts_id_user_key unique (id, user_id),
  constraint educational_attempts_user_idempotency_key unique (user_id, idempotency_key),
  constraint educational_attempts_contract_check check (contract_version = 'orthobullets-anki.v1'),
  constraint educational_attempts_provider_check check (provider = 'orthobullets'),
  constraint educational_attempts_review_check check (review_state = 'answered_review' and correct = false),
  constraint educational_attempts_entity_check check (canonical_entity_id = '1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a'::uuid),
  constraint educational_attempts_fingerprint_check check (session_fingerprint_hash ~ '^[0-9a-f]{64}$'),
  constraint educational_attempts_idempotency_check check (idempotency_key ~ '^[0-9a-f]{64}$'),
  constraint educational_attempts_extension_check check (extension_version ~ '^[A-Za-z0-9._:-]{1,200}$'),
  constraint educational_attempts_clock_check check (occurred_at <= received_at + interval '5 minutes'),
  constraint educational_attempts_retention_check check (retained_until > received_at and retained_until <= received_at + interval '90 days'),
  constraint educational_attempts_safe_snapshot_check check (public.educational_metadata_is_safe(mapping_snapshot)),
  constraint educational_attempts_safe_metadata_check check (public.educational_metadata_is_safe(metadata))
);

create table if not exists public.educational_recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_event_id uuid not null,
  contract_version text not null default 'orthobullets-anki.v1',
  algorithm text not null default 'reviewed_exact_entity_overlap_v1',
  status text not null default 'completed',
  canonical_entity_id uuid not null references public.canonical_entities(id) on delete restrict,
  result_count smallint not null,
  request_id uuid not null,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  mapping_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  retained_until timestamptz not null default (now() + interval '90 days'),
  constraint educational_recommendation_runs_id_user_key unique (id, user_id),
  constraint educational_recommendation_runs_attempt_key unique (attempt_event_id),
  constraint educational_recommendation_runs_attempt_owner_fk foreign key (attempt_event_id, user_id)
    references public.educational_question_attempt_events(id, user_id) on delete cascade,
  constraint educational_recommendation_runs_contract_check check (contract_version = 'orthobullets-anki.v1'),
  constraint educational_recommendation_runs_algorithm_check check (algorithm = 'reviewed_exact_entity_overlap_v1'),
  constraint educational_recommendation_runs_status_check check (status in ('completed','no_results','failed')),
  constraint educational_recommendation_runs_entity_check check (canonical_entity_id = '1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a'::uuid),
  constraint educational_recommendation_runs_count_check check (
    (status = 'completed' and result_count between 1 and 3)
    or (status in ('no_results','failed') and result_count = 0)
  ),
  constraint educational_recommendation_runs_expiry_check check (expires_at > generated_at and expires_at <= generated_at + interval '15 minutes'),
  constraint educational_recommendation_runs_retention_check check (retained_until > generated_at and retained_until <= generated_at + interval '90 days'),
  constraint educational_recommendation_runs_safe_snapshot_check check (public.educational_metadata_is_safe(mapping_snapshot)),
  constraint educational_recommendation_runs_safe_metadata_check check (public.educational_metadata_is_safe(metadata))
);

create table if not exists public.educational_recommendation_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_run_id uuid not null,
  canonical_card_id uuid not null references public.canonical_cards(id) on delete restrict,
  canonical_card_version_id uuid not null references public.canonical_card_versions(id) on delete restrict,
  card_link_id uuid not null references public.card_canonical_entity_links(id) on delete restrict,
  card_review_assertion_id uuid not null references public.educational_link_review_assertions(id) on delete restrict,
  canonical_entity_id uuid not null references public.canonical_entities(id) on delete restrict,
  rank smallint not null,
  reason_code text not null default 'reviewed_exact_entity_overlap',
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint educational_recommendation_items_id_user_key unique (id, user_id),
  constraint educational_recommendation_items_run_owner_fk foreign key (recommendation_run_id, user_id)
    references public.educational_recommendation_runs(id, user_id) on delete cascade,
  constraint educational_recommendation_items_rank_key unique (recommendation_run_id, rank),
  constraint educational_recommendation_items_card_key unique (recommendation_run_id, canonical_card_id),
  constraint educational_recommendation_items_rank_check check (rank between 1 and 3),
  constraint educational_recommendation_items_entity_check check (canonical_entity_id = '1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a'::uuid),
  constraint educational_recommendation_items_reason_check check (reason_code = 'reviewed_exact_entity_overlap'),
  constraint educational_recommendation_items_safe_metadata_check check (public.educational_metadata_is_safe(metadata))
);

create table if not exists public.educational_recommendation_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_run_id uuid not null,
  recommendation_item_id uuid null,
  action_type text not null,
  occurred_at timestamptz not null default now(),
  request_id uuid not null,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  retained_until timestamptz not null default (now() + interval '90 days'),
  constraint educational_recommendation_actions_run_owner_fk foreign key (recommendation_run_id, user_id)
    references public.educational_recommendation_runs(id, user_id) on delete cascade,
  constraint educational_recommendation_actions_item_owner_fk foreign key (recommendation_item_id, user_id)
    references public.educational_recommendation_items(id, user_id) on delete cascade,
  constraint educational_recommendation_actions_user_key unique (user_id, idempotency_key),
  constraint educational_recommendation_actions_type_check check (action_type in ('impression','card_clicked','dismissed','no_results','feedback')),
  constraint educational_recommendation_actions_item_check check (
    (action_type in ('impression','card_clicked','feedback') and recommendation_item_id is not null)
    or (action_type in ('dismissed','no_results') and recommendation_item_id is null)
  ),
  constraint educational_recommendation_actions_idempotency_check check (idempotency_key ~ '^[0-9a-f]{64}$'),
  constraint educational_recommendation_actions_retention_check check (retained_until > occurred_at and retained_until <= occurred_at + interval '90 days'),
  constraint educational_recommendation_actions_safe_metadata_check check (public.educational_metadata_is_safe(metadata))
);

create table if not exists public.educational_anki_launch_commands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_item_id uuid not null,
  canonical_card_id uuid not null references public.canonical_cards(id) on delete restrict,
  canonical_card_version_id uuid not null references public.canonical_card_versions(id) on delete restrict,
  note_guid text not null,
  card_ordinal integer not null,
  contract_version text not null default 'orthobullets-anki.v1',
  status text not null default 'pending',
  idempotency_key text not null,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  metadata jsonb not null default '{}'::jsonb,
  constraint educational_anki_launch_commands_id_user_key unique (id, user_id),
  constraint educational_anki_launch_commands_item_owner_fk foreign key (recommendation_item_id, user_id)
    references public.educational_recommendation_items(id, user_id) on delete cascade,
  constraint educational_anki_launch_commands_user_key unique (user_id, idempotency_key),
  constraint educational_anki_launch_commands_contract_check check (contract_version = 'orthobullets-anki.v1'),
  constraint educational_anki_launch_commands_status_check check (status in ('pending','claimed','acknowledged','expired')),
  constraint educational_anki_launch_commands_guid_check check (note_guid ~ '^[A-Za-z0-9._:-]{1,200}$'),
  constraint educational_anki_launch_commands_ordinal_check check (card_ordinal >= 0),
  constraint educational_anki_launch_commands_idempotency_check check (idempotency_key ~ '^[0-9a-f]{64}$'),
  constraint educational_anki_launch_commands_expiry_check check (expires_at > requested_at and expires_at <= requested_at + interval '5 minutes'),
  constraint educational_anki_launch_commands_safe_metadata_check check (public.educational_metadata_is_safe(metadata))
);

create table if not exists public.educational_anki_launch_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  launch_command_id uuid not null,
  status text not null,
  reason_code text null,
  resolved_native_card_id text null,
  observed_content_hash text null,
  acknowledged_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint educational_anki_launch_ack_command_key unique (launch_command_id),
  constraint educational_anki_launch_ack_command_owner_fk foreign key (launch_command_id, user_id)
    references public.educational_anki_launch_commands(id, user_id) on delete cascade,
  constraint educational_anki_launch_ack_status_check check (status in ('opened','not_found','ambiguous','unsupported','failed')),
  constraint educational_anki_launch_ack_reason_check check (reason_code is null or reason_code ~ '^[A-Za-z0-9._:-]{1,200}$'),
  constraint educational_anki_launch_ack_native_check check (resolved_native_card_id is null or resolved_native_card_id ~ '^[A-Za-z0-9._:-]{1,200}$'),
  constraint educational_anki_launch_ack_hash_check check (observed_content_hash is null or observed_content_hash ~ '^[0-9a-f]{64}$'),
  constraint educational_anki_launch_ack_safe_metadata_check check (public.educational_metadata_is_safe(metadata))
);

create or replace function public.validate_educational_phase0_references()
returns trigger language plpgsql security definer set search_path = public as $$
declare linked_record record;
begin
  if tg_table_name = 'educational_question_attempt_events' then
    select l.external_question_id, l.canonical_entity_id, a.question_link_id,
      a.reviewer_decision, a.provenance_method, a.confidence, a.mapping_role, a.is_active,
      l.is_active as link_is_active, l.review_status, l.mapping_confidence,
      q.is_active as question_is_active, q.specialty_normalized, q.topic_slug, s.slug as source_slug
    into linked_record
    from public.question_canonical_entity_links l
    join public.educational_link_review_assertions a on a.id = new.question_review_assertion_id
    join public.external_questions q on q.id = l.external_question_id
    join public.external_sources s on s.id = q.source_id
    where l.id = new.question_link_id;
    if not found or linked_record.external_question_id is distinct from new.external_question_id
      or linked_record.canonical_entity_id is distinct from new.canonical_entity_id
      or linked_record.question_link_id is distinct from new.question_link_id
      or linked_record.reviewer_decision <> 'approved' or linked_record.provenance_method <> 'direct_human_review'
      or linked_record.confidence < 0.950 or linked_record.mapping_role <> 'tests' or not linked_record.is_active
      or not linked_record.link_is_active or linked_record.review_status <> 'approved'
      or linked_record.mapping_confidence < 0.950 or not linked_record.question_is_active
      or linked_record.source_slug <> 'orthobullets' or linked_record.specialty_normalized <> 'knee-sports'
      or linked_record.topic_slug <> 'patellar-instability' then
      raise exception 'attempt requires an active approved direct question review at confidence >= 0.950';
    end if;
  elsif tg_table_name = 'educational_recommendation_runs' then
    perform 1 from public.educational_question_attempt_events e
    where e.id = new.attempt_event_id and e.user_id = new.user_id
      and e.canonical_entity_id = new.canonical_entity_id;
    if not found then
      raise exception 'recommendation run entity does not match its attempt and user';
    end if;
  elsif tg_table_name = 'educational_recommendation_items' then
    select c.current_version_id, l.canonical_card_id, l.canonical_entity_id, a.card_link_id,
      a.reviewer_decision, a.provenance_method, a.confidence, a.mapping_role, a.is_active,
      l.is_active as link_is_active, l.review_status, l.mapping_confidence, v.is_active as version_is_active
    into linked_record
    from public.canonical_cards c
    join public.canonical_card_versions v on v.id = c.current_version_id
    join public.card_canonical_entity_links l on l.id = new.card_link_id
    join public.educational_link_review_assertions a on a.id = new.card_review_assertion_id
    where c.id = new.canonical_card_id and c.is_active;
    if not found or linked_record.current_version_id is distinct from new.canonical_card_version_id
      or linked_record.canonical_card_id is distinct from new.canonical_card_id
      or linked_record.canonical_entity_id is distinct from new.canonical_entity_id
      or linked_record.card_link_id is distinct from new.card_link_id
      or linked_record.reviewer_decision <> 'approved' or linked_record.provenance_method <> 'direct_human_review'
      or linked_record.confidence < 0.950
      or linked_record.mapping_role not in ('tests','teaches','explains','demonstrates') or not linked_record.is_active
      or not linked_record.link_is_active or linked_record.review_status <> 'approved'
      or linked_record.mapping_confidence < 0.950 or not linked_record.version_is_active then
      raise exception 'recommendation requires current card version and active approved direct card review';
    end if;
  elsif tg_table_name = 'educational_recommendation_actions' and new.recommendation_item_id is not null then
    perform 1 from public.educational_recommendation_items i
    where i.id = new.recommendation_item_id and i.user_id = new.user_id
      and i.recommendation_run_id = new.recommendation_run_id;
    if not found then
      raise exception 'recommendation action item does not belong to its run and user';
    end if;
  elsif tg_table_name = 'educational_anki_launch_commands' then
    select i.canonical_card_id, i.canonical_card_version_id, n.anki_note_guid, ac.card_ord
    into linked_record
    from public.educational_recommendation_items i
    join public.canonical_cards c on c.id = i.canonical_card_id
    join public.anki_notes n on n.id = c.anki_note_id
    join public.anki_cards ac on ac.id = c.anki_card_id
    where i.id = new.recommendation_item_id and i.user_id = new.user_id
      and c.current_version_id = i.canonical_card_version_id and c.is_active and n.is_active and ac.is_active;
    if not found or linked_record.canonical_card_id is distinct from new.canonical_card_id
      or linked_record.canonical_card_version_id is distinct from new.canonical_card_version_id then
      raise exception 'launch command card/version does not match recommendation item';
    end if;
    if linked_record.anki_note_guid is distinct from new.note_guid
      or linked_record.card_ord is distinct from new.card_ordinal then
      raise exception 'launch command GUID/ordinal does not match canonical card identity';
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_educational_attempt_reference before insert or update on public.educational_question_attempt_events
  for each row execute function public.validate_educational_phase0_references();
create trigger validate_educational_run_reference before insert or update on public.educational_recommendation_runs
  for each row execute function public.validate_educational_phase0_references();
create trigger validate_educational_item_reference before insert or update on public.educational_recommendation_items
  for each row execute function public.validate_educational_phase0_references();
create trigger validate_educational_action_reference before insert or update on public.educational_recommendation_actions
  for each row execute function public.validate_educational_phase0_references();
create trigger validate_educational_launch_reference before insert or update on public.educational_anki_launch_commands
  for each row execute function public.validate_educational_phase0_references();

create index educational_attempts_user_time_idx on public.educational_question_attempt_events(user_id, occurred_at desc);
create index educational_runs_user_time_idx on public.educational_recommendation_runs(user_id, generated_at desc);
create index educational_actions_user_time_idx on public.educational_recommendation_actions(user_id, occurred_at desc);
create index educational_launch_pending_idx on public.educational_anki_launch_commands(user_id, expires_at) where status = 'pending';

do $$ declare table_name text; begin
  foreach table_name in array array[
    'educational_question_attempt_events','educational_recommendation_runs',
    'educational_recommendation_items','educational_recommendation_actions',
    'educational_anki_launch_commands','educational_anki_launch_acknowledgements'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated, service_role', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', table_name || '_service_role_all', table_name);
  end loop;
end $$;

comment on table public.educational_question_attempt_events is 'User-owned, metadata-only incorrect Orthobullets attempt events for the patellar Phase 0 contract.';
comment on table public.educational_recommendation_items is 'At most three reviewed exact-entity Anki card identities, pinned to the current immutable card version.';
comment on table public.educational_anki_launch_commands is 'Short-lived exact-card launch intents. Phase 0 defines persistence only; no add-on runtime consumes them.';

commit;
