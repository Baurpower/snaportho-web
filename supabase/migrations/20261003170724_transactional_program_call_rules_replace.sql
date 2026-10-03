-- Atomically replace editable program call rules while preserving server-supplied
-- protected rules. This function is server-only: the API verifies the workspace
-- permission, then invokes it with the service-role client.

create or replace function public.replace_program_call_rules_transactional(
  p_program_id uuid,
  p_rule_set_id uuid,
  p_actor_user_id uuid,
  p_previous_updated_at timestamptz,
  p_rules jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current_updated_at timestamptz;
  v_next_updated_at timestamptz := clock_timestamp();
  v_rules jsonb;
begin
  if jsonb_typeof(p_rules) <> 'array' then
    raise exception 'rules must be a JSON array';
  end if;

  -- Defense in depth. The function is executable only by service_role, but the
  -- supplied actor must still be an active admin in the target program.
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
    raise exception 'Actor cannot manage call rules for this program';
  end if;

  select rule_set.updated_at
  into v_current_updated_at
  from public.program_call_rule_sets rule_set
  where rule_set.id = p_rule_set_id
    and rule_set.program_id = p_program_id
  for update;

  if not found then
    raise exception 'Rule set does not belong to the specified program';
  end if;

  if p_previous_updated_at is not null
     and v_current_updated_at is distinct from p_previous_updated_at then
    raise exception 'STALE_RULE_SET';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rules) item
    where nullif(btrim(item->>'rule_type'), '') is null
       or nullif(btrim(item->>'name'), '') is null
       or jsonb_typeof(item->'is_enabled') is distinct from 'boolean'
       or jsonb_typeof(item->'is_hard_rule') is distinct from 'boolean'
  ) then
    raise exception 'Each rule must have a name, rule_type, is_enabled, and is_hard_rule';
  end if;

  delete from public.program_call_rules
  where program_id = p_program_id
    and rule_set_id = p_rule_set_id;

  insert into public.program_call_rules (
    id,
    program_id,
    rule_set_id,
    rule_type,
    name,
    is_enabled,
    is_hard_rule,
    priority,
    scope,
    config,
    created_by
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
  from jsonb_array_elements(p_rules) with ordinality as input(item, ordinal_value);

  update public.program_call_rule_sets
  set updated_at = v_next_updated_at
  where id = p_rule_set_id
    and program_id = p_program_id;

  select coalesce(jsonb_agg(to_jsonb(rule_row) order by rule_row.priority, rule_row.created_at), '[]'::jsonb)
  into v_rules
  from public.program_call_rules rule_row
  where rule_row.program_id = p_program_id
    and rule_row.rule_set_id = p_rule_set_id;

  return jsonb_build_object(
    'rules', v_rules,
    'ruleSetUpdatedAt', v_next_updated_at
  );
end;
$$;

revoke execute on function public.replace_program_call_rules_transactional(
  uuid, uuid, uuid, timestamptz, jsonb
) from public, anon, authenticated;

grant execute on function public.replace_program_call_rules_transactional(
  uuid, uuid, uuid, timestamptz, jsonb
) to service_role;
