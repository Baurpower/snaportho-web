-- Close the remaining concurrency and integrity gaps in Call Policy v2.

alter table public.program_call_policy_revisions
  add column if not exists base_rule_set_updated_at timestamptz,
  add column if not exists base_rules_hash text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'program_call_policy_revisions_program_id_fkey'
      and conrelid = 'public.program_call_policy_revisions'::regclass
  ) then
    alter table public.program_call_policy_revisions
      add constraint program_call_policy_revisions_program_id_fkey
      foreign key (program_id) references public.programs(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'program_call_policy_revisions_created_by_fkey'
      and conrelid = 'public.program_call_policy_revisions'::regclass
  ) then
    alter table public.program_call_policy_revisions
      add constraint program_call_policy_revisions_created_by_fkey
      foreign key (created_by) references auth.users(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'program_call_policy_revisions_activation_state_check'
      and conrelid = 'public.program_call_policy_revisions'::regclass
  ) then
    alter table public.program_call_policy_revisions
      add constraint program_call_policy_revisions_activation_state_check
      check (
        (status = 'draft' and activated_at is null)
        or (status in ('active', 'superseded') and activated_at is not null)
        or status = 'rejected'
      );
  end if;
end $$;

create unique index if not exists program_call_policy_revisions_one_active_idx
  on public.program_call_policy_revisions(rule_set_id)
  where status = 'active';

create index if not exists program_call_policy_revisions_created_by_idx
  on public.program_call_policy_revisions(created_by);

create or replace function public.protect_program_call_policy_revision_content_v2()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.program_id is distinct from old.program_id
     or new.rule_set_id is distinct from old.rule_set_id
     or new.revision_number is distinct from old.revision_number
     or new.schema_version is distinct from old.schema_version
     or new.document is distinct from old.document
     or new.legacy_rules_snapshot is distinct from old.legacy_rules_snapshot
     or new.compatibility_audit is distinct from old.compatibility_audit
     or new.parity_status is distinct from old.parity_status
     or new.parity_report is distinct from old.parity_report
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at
     or new.base_rule_set_updated_at is distinct from old.base_rule_set_updated_at
     or new.base_rules_hash is distinct from old.base_rules_hash
     or new.metadata is distinct from old.metadata then
    raise exception 'Policy revision content is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.create_program_call_policy_revision_v2(
  p_program_id uuid,
  p_rule_set_id uuid,
  p_actor_user_id uuid,
  p_document jsonb,
  p_legacy_rules_snapshot jsonb,
  p_compatibility_audit jsonb,
  p_parity_report jsonb,
  p_base_rule_set_updated_at timestamptz,
  p_base_rules_hash text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_revision_number integer;
  v_revision public.program_call_policy_revisions;
  v_current_updated_at timestamptz;
begin
  if coalesce((p_document->>'schemaVersion')::integer, 0) <> 2 then
    raise exception 'Policy document schemaVersion must be 2';
  end if;
  if jsonb_array_length(coalesce(p_compatibility_audit->'blockers', '[]'::jsonb)) > 0 then
    raise exception 'Policy document has compatibility blockers';
  end if;
  if coalesce((p_parity_report->>'passed')::boolean, false) is not true
     or jsonb_array_length(coalesce(p_parity_report->'differences', '[]'::jsonb)) > 0 then
    raise exception 'Policy document failed academic-year parity';
  end if;
  if p_base_rule_set_updated_at is null or nullif(btrim(p_base_rules_hash), '') is null then
    raise exception 'Policy revision requires a source rule-set version and hash';
  end if;
  if not exists (
    select 1
    from public.program_memberships membership
    join public.program_roster roster
      on roster.program_id = membership.program_id
     and roster.claimed_by_user_id = membership.user_id
    where membership.user_id = p_actor_user_id
      and membership.program_id = p_program_id
      and membership.is_active = true
      and roster."isAdmin" = true
  ) then
    raise exception 'Actor cannot manage call policy revisions for this program';
  end if;

  select rule_set.updated_at into v_current_updated_at
  from public.program_call_rule_sets rule_set
  where rule_set.id = p_rule_set_id and rule_set.program_id = p_program_id
  for update;
  if not found then raise exception 'Rule set does not belong to the specified program'; end if;
  if v_current_updated_at is distinct from p_base_rule_set_updated_at then
    raise exception 'STALE_RULE_SET';
  end if;

  select coalesce(max(revision_number), 0) + 1 into v_revision_number
  from public.program_call_policy_revisions where rule_set_id = p_rule_set_id;

  insert into public.program_call_policy_revisions (
    program_id, rule_set_id, revision_number, schema_version, status,
    document, legacy_rules_snapshot, compatibility_audit, parity_status,
    parity_report, created_by, base_rule_set_updated_at, base_rules_hash, metadata
  ) values (
    p_program_id, p_rule_set_id, v_revision_number, 2, 'draft',
    p_document, p_legacy_rules_snapshot, p_compatibility_audit, 'passed',
    p_parity_report, p_actor_user_id, p_base_rule_set_updated_at,
    btrim(p_base_rules_hash), coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_revision;

  return to_jsonb(v_revision);
end;
$$;

revoke execute on function public.create_program_call_policy_revision_v2(
  uuid, uuid, uuid, jsonb, jsonb, jsonb, jsonb, timestamptz, text, jsonb
) from public, anon, authenticated;
grant execute on function public.create_program_call_policy_revision_v2(
  uuid, uuid, uuid, jsonb, jsonb, jsonb, jsonb, timestamptz, text, jsonb
) to service_role;

-- Retire the unversioned draft writer. All new drafts must be bound to a base version.
revoke execute on function public.create_program_call_policy_revision_v2(
  uuid, uuid, uuid, jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated, service_role;

create or replace function public.activate_program_call_policy_revision_v2(
  p_program_id uuid,
  p_rule_set_id uuid,
  p_revision_id uuid,
  p_actor_user_id uuid,
  p_previous_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_revision public.program_call_policy_revisions;
  v_current_updated_at timestamptz;
  v_next_updated_at timestamptz := clock_timestamp();
begin
  if not exists (
    select 1 from public.program_memberships membership
    join public.program_roster roster
      on roster.program_id = membership.program_id
     and roster.claimed_by_user_id = membership.user_id
    where membership.user_id = p_actor_user_id
      and membership.program_id = p_program_id
      and membership.is_active = true
      and roster."isAdmin" = true
  ) then
    raise exception 'Actor cannot activate call policy revisions for this program';
  end if;

  select rule_set.updated_at into v_current_updated_at
  from public.program_call_rule_sets rule_set
  where rule_set.id = p_rule_set_id and rule_set.program_id = p_program_id
  for update;
  if not found then raise exception 'Rule set does not belong to the specified program'; end if;
  if p_previous_updated_at is null
     or v_current_updated_at is distinct from p_previous_updated_at then
    raise exception 'STALE_RULE_SET';
  end if;

  select * into v_revision
  from public.program_call_policy_revisions revision
  where revision.id = p_revision_id
    and revision.program_id = p_program_id
    and revision.rule_set_id = p_rule_set_id
  for update;
  if not found or v_revision.status not in ('draft', 'superseded')
     or v_revision.parity_status <> 'passed' then
    raise exception 'Policy revision is not an activatable passing draft';
  end if;
  if v_revision.base_rule_set_updated_at is null
     or v_revision.base_rule_set_updated_at is distinct from v_current_updated_at then
    raise exception 'STALE_POLICY_REVISION';
  end if;
  if jsonb_typeof(v_revision.legacy_rules_snapshot) <> 'array'
     or jsonb_array_length(v_revision.legacy_rules_snapshot) = 0 then
    raise exception 'Policy revision has no activatable rule snapshot';
  end if;

  delete from public.program_call_rules
  where program_id = p_program_id and rule_set_id = p_rule_set_id;

  insert into public.program_call_rules (
    id, program_id, rule_set_id, rule_type, name, is_enabled, is_hard_rule,
    priority, scope, config, created_by
  )
  select
    coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
    p_program_id, p_rule_set_id, btrim(item->>'rule_type'), btrim(item->>'name'),
    (item->>'is_enabled')::boolean, (item->>'is_hard_rule')::boolean,
    coalesce((item->>'priority')::integer, ordinal_value::integer * 10),
    coalesce(item->'scope', '{}'::jsonb), coalesce(item->'config', '{}'::jsonb),
    coalesce(nullif(item->>'created_by', '')::uuid, p_actor_user_id)
  from jsonb_array_elements(v_revision.legacy_rules_snapshot)
    with ordinality as input(item, ordinal_value);

  update public.program_call_policy_revisions
  set status = 'superseded'
  where rule_set_id = p_rule_set_id and status = 'active';
  update public.program_call_policy_revisions
  set status = 'active', activated_at = v_next_updated_at
  where id = p_revision_id;
  update public.program_call_rule_sets set updated_at = v_next_updated_at
  where id = p_rule_set_id and program_id = p_program_id;

  return jsonb_build_object('revisionId', p_revision_id, 'status', 'active',
    'ruleSetUpdatedAt', v_next_updated_at);
end;
$$;

-- Atomically publish a pre-validated call schedule and reject stale snapshots.
create or replace function public.replace_program_call_assignments_transactional(
  p_program_id uuid,
  p_actor_user_id uuid,
  p_touched_dates jsonb,
  p_expected_assignments jsonb,
  p_delete_ids jsonb,
  p_rows jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row jsonb;
  v_created integer := 0;
  v_updated integer := 0;
  v_deleted integer := 0;
begin
  if jsonb_typeof(p_touched_dates) <> 'array'
     or jsonb_typeof(p_expected_assignments) <> 'array'
     or jsonb_typeof(p_delete_ids) <> 'array'
     or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Schedule mutation inputs must be JSON arrays';
  end if;
  if not exists (
    select 1 from public.program_memberships membership
    join public.program_roster roster
      on roster.program_id = membership.program_id
     and roster.claimed_by_user_id = membership.user_id
    where membership.user_id = p_actor_user_id
      and membership.program_id = p_program_id
      and membership.is_active = true
      and roster."isAdmin" = true
  ) then
    raise exception 'Actor cannot publish call assignments for this program';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_program_id::text, 0));
  perform 1 from public.call_assignments assignment
  where assignment.program_id = p_program_id
    and assignment.call_date in (
      select value::text::date from jsonb_array_elements_text(p_touched_dates)
    )
  for update;

  if exists (
    select 1 from public.call_assignments assignment
    where assignment.program_id = p_program_id
      and assignment.call_date in (
        select value::text::date from jsonb_array_elements_text(p_touched_dates)
      )
      and not exists (
        select 1 from jsonb_array_elements(p_expected_assignments) expected
        where nullif(expected->>'id', '')::uuid = assignment.id
          and nullif(expected->>'updated_at', '')::timestamptz is not distinct from assignment.updated_at
      )
  ) or exists (
    select 1 from jsonb_array_elements(p_expected_assignments) expected
    where not exists (
      select 1 from public.call_assignments assignment
      where assignment.id = nullif(expected->>'id', '')::uuid
        and assignment.program_id = p_program_id
        and assignment.updated_at is not distinct from nullif(expected->>'updated_at', '')::timestamptz
    )
  ) then
    raise exception 'STALE_CALL_SCHEDULE';
  end if;

  if exists (
    select 1 from public.call_assignments assignment
    where assignment.program_id = p_program_id
      and assignment.source_kind = 'google'
      and assignment.id in (
        select value::text::uuid from jsonb_array_elements_text(p_delete_ids)
        union
        select nullif(item->>'existing_id', '')::uuid from jsonb_array_elements(p_rows) item
      )
  ) then
    raise exception 'SOURCE_OWNED_ASSIGNMENT';
  end if;

  delete from public.call_assignments assignment
  where assignment.program_id = p_program_id
    and assignment.id in (
      select value::text::uuid from jsonb_array_elements_text(p_delete_ids)
    );
  get diagnostics v_deleted = row_count;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    if nullif(v_row->>'existing_id', '') is not null then
      update public.call_assignments set
        roster_id = nullif(v_row->>'roster_id', '')::uuid,
        program_membership_id = nullif(v_row->>'program_membership_id', '')::uuid,
        call_type = v_row->>'call_type', call_date = (v_row->>'call_date')::date,
        start_datetime = nullif(v_row->>'start_datetime', '')::timestamptz,
        end_datetime = nullif(v_row->>'end_datetime', '')::timestamptz,
        site = v_row->>'site', is_home_call = coalesce((v_row->>'is_home_call')::boolean, false),
        notes = v_row->>'notes', created_by = p_actor_user_id,
        updated_at = clock_timestamp()
      where id = nullif(v_row->>'existing_id', '')::uuid and program_id = p_program_id;
      if not found then raise exception 'STALE_CALL_SCHEDULE'; end if;
      v_updated := v_updated + 1;
    else
      insert into public.call_assignments (
        program_id, roster_id, program_membership_id, call_type, call_date,
        start_datetime, end_datetime, site, is_home_call, notes, created_by, updated_at
      ) values (
        p_program_id, nullif(v_row->>'roster_id', '')::uuid,
        nullif(v_row->>'program_membership_id', '')::uuid, v_row->>'call_type',
        (v_row->>'call_date')::date, nullif(v_row->>'start_datetime', '')::timestamptz,
        nullif(v_row->>'end_datetime', '')::timestamptz, v_row->>'site',
        coalesce((v_row->>'is_home_call')::boolean, false), v_row->>'notes',
        p_actor_user_id, clock_timestamp()
      );
      v_created := v_created + 1;
    end if;
  end loop;

  return jsonb_build_object('created', v_created, 'updated', v_updated, 'deleted', v_deleted);
end;
$$;

revoke execute on function public.replace_program_call_assignments_transactional(
  uuid, uuid, jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.replace_program_call_assignments_transactional(
  uuid, uuid, jsonb, jsonb, jsonb, jsonb
) to service_role;
