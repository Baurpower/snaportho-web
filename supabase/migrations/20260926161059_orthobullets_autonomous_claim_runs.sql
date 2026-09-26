-- Durable, source-text-free checkpoints for sequential Orthobullets claim runs.
-- Raw stems, choices, explanations, images, and page HTML never enter these tables.

begin;

create table public.orthobullets_claim_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_key text not null,
  status text not null default 'running',
  expected_count integer not null check (expected_count >= 0),
  completed_count integer not null default 0 check (completed_count >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  unresolved_count integer not null default 0 check (unresolved_count >= 0),
  algorithm_version text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint orthobullets_claim_runs_status_check
    check (status in ('running', 'paused', 'completed', 'completed_with_gaps', 'failed')),
  constraint orthobullets_claim_runs_key_check check (char_length(test_key) between 1 and 300),
  constraint orthobullets_claim_runs_algorithm_check check (algorithm_version ~ '^[A-Za-z0-9._:-]{1,80}$'),
  constraint orthobullets_claim_runs_user_key_unique unique (user_id, test_key, algorithm_version)
);

create table public.orthobullets_claim_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.orthobullets_claim_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  native_question_id text not null,
  review_locator text not null,
  source_fingerprint_hash text null,
  status text not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  claim_id uuid null references public.educational_claims(id) on delete restrict,
  claim_version_id uuid null references public.educational_claim_versions(id) on delete restrict,
  linked_card_count integer not null default 0 check (linked_card_count between 0 and 100),
  last_error_code text null,
  reason_codes text[] not null default '{}',
  algorithm_version text not null,
  started_at timestamptz null,
  completed_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint orthobullets_claim_run_items_status_check
    check (status in ('pending', 'processing', 'accepted', 'accepted_no_card', 'retryable', 'unresolved_automatic')),
  constraint orthobullets_claim_run_items_native_check check (native_question_id ~ '^[A-Za-z0-9._:-]{1,200}$'),
  constraint orthobullets_claim_run_items_locator_check
    check (char_length(review_locator) between 1 and 1000 and review_locator !~ '<[^>]+>'),
  constraint orthobullets_claim_run_items_hash_check
    check (source_fingerprint_hash is null or source_fingerprint_hash ~ '^[0-9a-f]{64}$'),
  constraint orthobullets_claim_run_items_algorithm_check check (algorithm_version ~ '^[A-Za-z0-9._:-]{1,80}$'),
  constraint orthobullets_claim_run_items_error_check
    check (last_error_code is null or last_error_code ~ '^[A-Za-z0-9._:-]{1,120}$'),
  constraint orthobullets_claim_run_items_identity_unique unique (run_id, native_question_id)
);

create index orthobullets_claim_run_items_queue_idx
  on public.orthobullets_claim_run_items (run_id, status, updated_at);
create index orthobullets_claim_run_items_question_idx
  on public.orthobullets_claim_run_items (native_question_id, source_fingerprint_hash);

alter table public.orthobullets_claim_runs enable row level security;
alter table public.orthobullets_claim_runs force row level security;
alter table public.orthobullets_claim_run_items enable row level security;
alter table public.orthobullets_claim_run_items force row level security;
revoke all on public.orthobullets_claim_runs, public.orthobullets_claim_run_items from anon, authenticated, public;
grant select, insert, update, delete on public.orthobullets_claim_runs, public.orthobullets_claim_run_items to service_role;

create or replace function public.refresh_orthobullets_claim_run(p_run_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected integer;
  v_completed integer;
  v_accepted integer;
  v_unresolved integer;
begin
  select count(*),
         count(*) filter (where status in ('accepted', 'accepted_no_card', 'unresolved_automatic')),
         count(*) filter (where status in ('accepted', 'accepted_no_card')),
         count(*) filter (where status = 'unresolved_automatic')
    into v_expected, v_completed, v_accepted, v_unresolved
  from public.orthobullets_claim_run_items where run_id = p_run_id;

  update public.orthobullets_claim_runs
  set expected_count = v_expected,
      completed_count = v_completed,
      accepted_count = v_accepted,
      unresolved_count = v_unresolved,
      status = case
        when v_completed < v_expected then 'running'
        when v_unresolved > 0 then 'completed_with_gaps'
        else 'completed'
      end,
      completed_at = case when v_completed = v_expected then coalesce(completed_at, now()) else null end,
      updated_at = now()
  where id = p_run_id;
end;
$$;

revoke all on function public.refresh_orthobullets_claim_run(uuid) from public, anon, authenticated;
grant execute on function public.refresh_orthobullets_claim_run(uuid) to service_role;

create or replace function public.resolve_orthobullets_machine_entity(
  p_source_id uuid,
  p_external_question_id uuid,
  p_entity_type text,
  p_preferred_label text,
  p_normalized_label text,
  p_algorithm_version text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id uuid;
begin
  if p_normalized_label = '' or char_length(p_normalized_label) > 200 then
    raise exception 'invalid normalized entity label';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_entity_type || ':' || p_normalized_label, 0));

  select id into v_entity_id
  from public.canonical_entities
  where entity_type = p_entity_type and normalized_label = p_normalized_label and is_active
  order by case when status = 'canonical' then 0 else 1 end, created_at asc
  limit 1;

  if v_entity_id is null then
    insert into public.canonical_entities (
      entity_type, preferred_label, normalized_label, status, review_status,
      created_from_source_id, metadata
    ) values (
      p_entity_type, p_preferred_label, p_normalized_label, 'canonical', 'approved',
      p_source_id,
      jsonb_build_object('creationMethod', 'machine_consensus', 'algorithmVersion', p_algorithm_version, 'sourceProvider', 'orthobullets')
    ) returning id into v_entity_id;
  end if;

  insert into public.question_canonical_entity_links (
    external_question_id, canonical_entity_id, retarget_path, match_basis,
    mapping_confidence, review_status, created_by_source, metadata, is_active
  ) values (
    p_external_question_id, v_entity_id, 'direct_exact', 'exact_label',
    0.95, 'approved', 'ai_suggestion',
    jsonb_build_object('algorithmVersion', p_algorithm_version, 'validation', 'independent_machine_critic'), true
  )
  on conflict do nothing;

  return v_entity_id;
end;
$$;

revoke all on function public.resolve_orthobullets_machine_entity(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.resolve_orthobullets_machine_entity(uuid, uuid, text, text, text, text) to service_role;

create or replace function public.commit_orthobullets_machine_claim(
  p_user_id uuid,
  p_run_item_id uuid,
  p_native_question_id text,
  p_external_question_id uuid,
  p_primary_entity_id uuid,
  p_claim_text text,
  p_claim_type text,
  p_predicate text,
  p_object_text text,
  p_qualifiers jsonb,
  p_source_fingerprint_hash text,
  p_confidence numeric,
  p_algorithm_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fingerprint text;
  v_claim_id uuid;
  v_version_id uuid;
  v_run_id uuid;
begin
  if p_confidence < 0.90 or p_confidence > 1 then
    raise exception 'machine claim confidence outside automatic acceptance range';
  end if;
  if not public.educational_claim_qualifiers_are_valid(coalesce(p_qualifiers, '{}'::jsonb)) then
    raise exception 'invalid claim qualifiers';
  end if;

  select run_id into v_run_id
  from public.orthobullets_claim_run_items
  where id = p_run_item_id and user_id = p_user_id and native_question_id = p_native_question_id
  for update;
  if not found then raise exception 'claim run item ownership mismatch'; end if;

  v_fingerprint := public.educational_claim_fingerprint_hash(
    p_claim_type, p_primary_entity_id, p_predicate, p_object_text, coalesce(p_qualifiers, '{}'::jsonb)
  );
  perform pg_advisory_xact_lock(hashtextextended(v_fingerprint, 0));

  select id, current_version_id into v_claim_id, v_version_id
  from public.educational_claims
  where fingerprint_hash = v_fingerprint and is_active
  order by created_at asc limit 1;

  if v_claim_id is null then
    insert into public.educational_claims (
      primary_entity_id, claim_text, claim_type, predicate, object_text, qualifiers,
      approval_method, algorithm_version, content_source, review_status, metadata
    ) values (
      p_primary_entity_id, p_claim_text, p_claim_type, p_predicate, p_object_text,
      coalesce(p_qualifiers, '{}'::jsonb), 'machine_consensus', p_algorithm_version,
      'verified', 'approved', jsonb_build_object('sourceProvider', 'orthobullets', 'validation', 'independent_machine_critic')
    ) returning id into v_claim_id;

    insert into public.educational_claim_versions (
      claim_id, version_number, fingerprint_hash, claim_text, claim_type, predicate,
      object_text, qualifiers, primary_entity_id, approval_method, content_source,
      review_status, algorithm_version, metadata
    ) values (
      v_claim_id, 1, v_fingerprint, p_claim_text, p_claim_type, p_predicate,
      p_object_text, coalesce(p_qualifiers, '{}'::jsonb), p_primary_entity_id,
      'machine_consensus', 'verified', 'approved', p_algorithm_version,
      jsonb_build_object('sourceProvider', 'orthobullets', 'validation', 'independent_machine_critic')
    ) returning id into v_version_id;

    update public.educational_claims set current_version_id = v_version_id where id = v_claim_id;
  end if;

  update public.question_claim_links
  set is_active = false, review_status = 'superseded', updated_at = now()
  where provider = 'orthobullets' and native_question_id = p_native_question_id
    and mapping_role = 'tests_primary' and is_active and claim_id <> v_claim_id;

  update public.question_claim_links
  set external_question_id = p_external_question_id,
      claim_version_id = v_version_id,
      confidence = p_confidence,
      approval_method = 'machine_consensus',
      review_status = 'auto_approved',
      algorithm_version = p_algorithm_version,
      source_fingerprint_hash = p_source_fingerprint_hash,
      evidence_hashes = array[p_source_fingerprint_hash],
      reason_codes = array['completed_review_page', 'generator_critic_consensus'],
      metadata = jsonb_build_object('sourceProvider', 'orthobullets', 'validation', 'independent_machine_critic'),
      is_active = true,
      updated_at = now()
  where provider = 'orthobullets' and native_question_id = p_native_question_id
    and claim_id = v_claim_id and is_active;

  if not found then
    insert into public.question_claim_links (
      provider, native_question_id, external_question_id, claim_id, claim_version_id,
      mapping_role, confidence, approval_method, review_status, algorithm_version,
      evidence_locator, source_fingerprint_hash, evidence_hashes, reason_codes, metadata
    ) values (
      'orthobullets', p_native_question_id, p_external_question_id, v_claim_id, v_version_id,
      'tests_primary', p_confidence, 'machine_consensus', 'auto_approved', p_algorithm_version,
      'reviewed-question', p_source_fingerprint_hash, array[p_source_fingerprint_hash],
      array['completed_review_page', 'generator_critic_consensus'],
      jsonb_build_object('sourceProvider', 'orthobullets', 'validation', 'independent_machine_critic')
    );
  end if;

  update public.orthobullets_claim_run_items
  set status = 'accepted_no_card', claim_id = v_claim_id, claim_version_id = v_version_id,
      source_fingerprint_hash = p_source_fingerprint_hash, last_error_code = null,
      reason_codes = array['generator_critic_consensus'], completed_at = now(), updated_at = now()
  where id = p_run_item_id;
  perform public.refresh_orthobullets_claim_run(v_run_id);

  return jsonb_build_object('claimId', v_claim_id, 'claimVersionId', v_version_id, 'fingerprintHash', v_fingerprint);
end;
$$;

revoke all on function public.commit_orthobullets_machine_claim(uuid, uuid, text, uuid, uuid, text, text, text, text, jsonb, text, numeric, text) from public, anon, authenticated;
grant execute on function public.commit_orthobullets_machine_claim(uuid, uuid, text, uuid, uuid, text, text, text, text, jsonb, text, numeric, text) to service_role;

comment on table public.orthobullets_claim_runs is 'Source-text-free coverage ledger for sequential reviewed-question enrichment.';
comment on table public.orthobullets_claim_run_items is 'Question identifiers, locators, outcomes, and graph references only; never source content.';

commit;
