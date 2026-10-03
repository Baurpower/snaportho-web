create table if not exists public.program_call_policy_revisions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  rule_set_id uuid not null references public.program_call_rule_sets(id) on delete cascade,
  revision_number integer not null,
  schema_version integer not null default 2,
  status text not null default 'draft' check (status in ('draft', 'active', 'superseded', 'rejected')),
  document jsonb not null,
  legacy_rules_snapshot jsonb not null,
  compatibility_audit jsonb not null,
  parity_status text not null check (parity_status in ('passed', 'failed')),
  parity_report jsonb not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  unique (rule_set_id, revision_number)
);

create index if not exists program_call_policy_revisions_program_rule_set_idx
  on public.program_call_policy_revisions(program_id, rule_set_id, revision_number desc);

alter table public.program_call_policy_revisions enable row level security;

comment on table public.program_call_policy_revisions is
  'Immutable shadow revisions for versioned Call Policy v2 documents. Production rules remain authoritative until cutover.';

create or replace function public.create_program_call_policy_revision_v2(
  p_program_id uuid,
  p_rule_set_id uuid,
  p_actor_user_id uuid,
  p_document jsonb,
  p_legacy_rules_snapshot jsonb,
  p_compatibility_audit jsonb,
  p_parity_report jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_revision_number integer;
  v_revision public.program_call_policy_revisions;
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

  perform 1
  from public.program_call_rule_sets rule_set
  where rule_set.id = p_rule_set_id
    and rule_set.program_id = p_program_id
  for update;

  if not found then
    raise exception 'Rule set does not belong to the specified program';
  end if;

  select coalesce(max(revision_number), 0) + 1
  into v_revision_number
  from public.program_call_policy_revisions
  where rule_set_id = p_rule_set_id;

  insert into public.program_call_policy_revisions (
    program_id,
    rule_set_id,
    revision_number,
    schema_version,
    status,
    document,
    legacy_rules_snapshot,
    compatibility_audit,
    parity_status,
    parity_report,
    created_by
  ) values (
    p_program_id,
    p_rule_set_id,
    v_revision_number,
    2,
    'draft',
    p_document,
    p_legacy_rules_snapshot,
    p_compatibility_audit,
    'passed',
    p_parity_report,
    p_actor_user_id
  )
  returning * into v_revision;

  return to_jsonb(v_revision);
end;
$$;

create or replace function public.protect_program_call_policy_revision_content_v2()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
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
     or new.created_at is distinct from old.created_at then
    raise exception 'Policy revision content is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_program_call_policy_revision_content_v2
  on public.program_call_policy_revisions;
create trigger protect_program_call_policy_revision_content_v2
before update on public.program_call_policy_revisions
for each row execute function public.protect_program_call_policy_revision_content_v2();

revoke all on public.program_call_policy_revisions from anon, authenticated;
revoke delete on public.program_call_policy_revisions from service_role;
grant select, insert, update on public.program_call_policy_revisions to service_role;
revoke execute on function public.create_program_call_policy_revision_v2(
  uuid, uuid, uuid, jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.create_program_call_policy_revision_v2(
  uuid, uuid, uuid, jsonb, jsonb, jsonb, jsonb
) to service_role;
revoke execute on function public.protect_program_call_policy_revision_content_v2()
  from public, anon, authenticated;

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
    raise exception 'Actor cannot activate call policy revisions for this program';
  end if;

  select * into v_revision
  from public.program_call_policy_revisions revision
  where revision.id = p_revision_id
    and revision.program_id = p_program_id
    and revision.rule_set_id = p_rule_set_id
  for update;

  if not found or v_revision.status not in ('draft', 'superseded') or v_revision.parity_status <> 'passed' then
    raise exception 'Policy revision is not an activatable passing draft';
  end if;

  select rule_set.updated_at into v_current_updated_at
  from public.program_call_rule_sets rule_set
  where rule_set.id = p_rule_set_id and rule_set.program_id = p_program_id
  for update;

  if not found then raise exception 'Rule set does not belong to the specified program'; end if;
  if p_previous_updated_at is not null
     and v_current_updated_at is distinct from p_previous_updated_at then
    raise exception 'STALE_RULE_SET';
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
    p_program_id,
    p_rule_set_id,
    btrim(item->>'rule_type'),
    btrim(item->>'name'),
    (item->>'is_enabled')::boolean,
    (item->>'is_hard_rule')::boolean,
    coalesce((item->>'priority')::integer, ordinal_value::integer * 10),
    coalesce(item->'scope', '{}'::jsonb),
    coalesce(item->'config', '{}'::jsonb),
    coalesce(nullif(item->>'created_by', '')::uuid, p_actor_user_id)
  from jsonb_array_elements(v_revision.legacy_rules_snapshot)
    with ordinality as input(item, ordinal_value);

  update public.program_call_policy_revisions
  set status = 'superseded'
  where rule_set_id = p_rule_set_id and status = 'active';

  update public.program_call_policy_revisions
  set status = 'active', activated_at = v_next_updated_at
  where id = p_revision_id;

  update public.program_call_rule_sets
  set updated_at = v_next_updated_at
  where id = p_rule_set_id and program_id = p_program_id;

  return jsonb_build_object(
    'revisionId', p_revision_id,
    'status', 'active',
    'ruleSetUpdatedAt', v_next_updated_at
  );
end;
$$;

revoke execute on function public.activate_program_call_policy_revision_v2(
  uuid, uuid, uuid, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.activate_program_call_policy_revision_v2(
  uuid, uuid, uuid, uuid, timestamptz
) to service_role;
