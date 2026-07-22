-- Read-only verification. Run only after applying the companion migration to a
-- disposable/local or explicitly approved staging database.

do $$
declare table_name text; policy_count integer;
begin
  foreach table_name in array array[
    'educational_question_attempt_events','educational_recommendation_runs',
    'educational_recommendation_items','educational_recommendation_actions',
    'educational_anki_launch_commands','educational_anki_launch_acknowledgements'
  ] loop
    if to_regclass('public.' || table_name) is null then raise exception 'Missing public.%', table_name; end if;
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = table_name and c.relrowsecurity and c.relforcerowsecurity
    ) then raise exception 'RLS is not enabled and forced on public.%', table_name; end if;
    select count(*) into policy_count from pg_policies
      where schemaname = 'public' and tablename = table_name and roles = array['service_role']::name[]
        and cmd = 'ALL' and qual = 'true' and with_check = 'true';
    if policy_count <> 1 then raise exception 'Expected one service-role-only policy on public.%', table_name; end if;
  end loop;

  if exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = any(array[
        'educational_question_attempt_events','educational_recommendation_runs',
        'educational_recommendation_items','educational_recommendation_actions',
        'educational_anki_launch_commands','educational_anki_launch_acknowledgements'
      ])
      and lower(c.column_name) = any(array[
        'stem','question','question_text','answer','answer_text','answer_choices','choices',
        'correct_answer','selected_answer','explanation','image','images','raw_html','card_body','front','back'
      ])
  ) then raise exception 'Protected educational-content column found'; end if;

  if (select count(*) from pg_constraint where conname in (
    'educational_attempts_user_idempotency_key','educational_recommendation_runs_attempt_key',
    'educational_recommendation_items_rank_key','educational_recommendation_actions_user_key',
    'educational_anki_launch_commands_user_key','educational_anki_launch_ack_command_key'
  )) <> 6 then raise exception 'Missing idempotency/uniqueness contract'; end if;

  if (select count(*) from pg_constraint where conname like 'educational\_%\_owner\_fk') < 6 then
    raise exception 'Missing composite user-ownership foreign keys';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'validate_educational_item_reference' and not tgisinternal)
    or not exists (select 1 from pg_trigger where tgname = 'validate_educational_launch_reference' and not tgisinternal)
  then raise exception 'Missing stale-version/exact-launch triggers'; end if;

  if not public.educational_metadata_is_safe('{"requestId":"safe"}'::jsonb)
    or public.educational_metadata_is_safe('{"nested":{"explanation":"forbidden"}}'::jsonb)
  then raise exception 'Metadata retention safety function is incorrect'; end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'educational_attempts_entity_check'
      and pg_get_constraintdef(oid) like '%1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a%'
  ) then raise exception 'Patellar entity allowlist constraint is missing'; end if;
end $$;
