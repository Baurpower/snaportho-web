-- Read-only verification. Run only after applying the companion migration.

begin;
set local transaction read only;

do $$
declare
  function_body text;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'educational_question_attempt_events'
      and column_name = 'native_question_id'
  ) then raise exception 'Missing native_question_id on attempt events'; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'educational_recommendation_items'
      and column_name = 'card_claim_link_id'
      and is_nullable = 'YES'
  ) then raise exception 'card_claim_link_id must be a nullable claim link'; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'educational_recommendation_runs'
      and column_name = 'claim_id'
      and is_nullable = 'YES'
  ) then raise exception 'recommendation runs must pin an optional claim_id'; end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'educational_question_attempt_events'
      and column_name in ('question_link_id', 'external_question_id')
      and is_nullable = 'NO'
  ) then raise exception 'Phase 0 link columns must be nullable so claim-overlap can omit them'; end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'educational_attempts_entity_check'
      and pg_get_constraintdef(oid) like '%1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a%'
      and pg_get_constraintdef(oid) like '%claim-overlap.v1%'
  ) then raise exception 'Patellar allowlist must remain for phase 0 and claim-overlap must be exempt'; end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'educational_attempts_claim_overlap_identity_check'
      and pg_get_constraintdef(oid) like '%question_link_id is null%'
  ) then raise exception 'claim-overlap attempts must reject curriculum-bridge links'; end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'educational_recommendation_runs_status_check'
      and pg_get_constraintdef(oid) like '%abstain%'
      and pg_get_constraintdef(oid) like '%no_card%'
  ) then raise exception 'Empty recommendation statuses are missing'; end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'educational_recommendation_items_shape_check'
      and pg_get_constraintdef(oid) like '%exact_claim_overlap%'
      and pg_get_constraintdef(oid) not like '%direct_human_review%'
  ) then raise exception 'Item shape must separate entity-review rows from claim rows'; end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'educational_recommendation_runs_claim_pin_check'
      and pg_get_constraintdef(oid) like '%missing_card%'
  ) then raise exception 'Empty no_card runs must record a missing_card gap'; end if;

  select pg_get_functiondef(p.oid) into function_body
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'validate_educational_phase0_references';
  if function_body is null
    or function_body not like '%claim-overlap.v1%'
    or function_body not like '%direct_human_review%'
    or function_body not like '%anki_note_guid is distinct from new.note_guid%'
    or function_body not like '%no curriculum-bridge link%' then
    raise exception 'Reference trigger no longer keeps both contracts';
  end if;

  if exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = any(array[
        'educational_question_attempt_events','educational_recommendation_runs',
        'educational_recommendation_items','educational_anki_launch_commands'
      ])
      and lower(c.column_name) = any(array[
        'stem','question_text','answer_text','answer_choices','explanation','raw_html','card_body','front','back','deck_name'
      ])
  ) then raise exception 'Protected educational-content column found'; end if;
end $$;

rollback;
