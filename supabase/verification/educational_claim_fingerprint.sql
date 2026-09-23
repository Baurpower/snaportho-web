-- Read-only verification. Run only after applying the companion migration.

begin;
set local transaction read only;

do $$
declare
  table_name text;
  policy_count integer;
  forced boolean;
begin
  foreach table_name in array array[
    'educational_claims',
    'educational_claim_versions',
    'card_claim_links',
    'question_claim_links',
    'educational_claim_gaps'
  ]
  loop
    if to_regclass('public.' || table_name) is null then
      raise exception 'Missing public.%', table_name;
    end if;
    select c.relforcerowsecurity into forced
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = table_name;
    if forced is not true then
      raise exception 'RLS is not forced on public.%', table_name;
    end if;
    if has_table_privilege('anon', 'public.' || table_name, 'SELECT')
      or has_table_privilege('authenticated', 'public.' || table_name, 'SELECT') then
      raise exception '% has client grant', table_name;
    end if;
    select count(*) into policy_count
    from pg_policies
    where schemaname = 'public'
      and tablename = table_name
      and roles = array['service_role']::name[]
      and cmd = 'ALL'
      and qual = 'true'
      and with_check = 'true';
    if policy_count <> 1 then
      raise exception 'Expected one service-role-only policy on public.%', table_name;
    end if;
  end loop;

  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = any(array[
        'educational_claim_versions', 'card_claim_links',
        'question_claim_links', 'educational_claim_gaps'
      ])
      and lower(c.column_name) = any(array[
        'stem', 'question', 'question_text', 'answer', 'answer_text', 'answer_choices',
        'choices', 'correct_answer', 'selected_answer', 'explanation', 'image', 'images',
        'raw_html', 'card_body', 'front', 'back'
      ])
  ) then
    raise exception 'Protected educational-content column found';
  end if;

  if to_regprocedure('public.educational_claim_fingerprint_hash(text,uuid,text,text,jsonb)') is null then
    raise exception 'Missing fingerprint hash function';
  end if;
  if to_regprocedure('public.educational_claim_qualifiers_are_valid(jsonb)') is null then
    raise exception 'Missing qualifier validator';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'educational_claims_active_fingerprint_uidx'
  ) then
    raise exception 'Missing active fingerprint unique index';
  end if;
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'card_claim_links_active_uidx'
  ) then
    raise exception 'Missing active card-claim unique index';
  end if;
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'question_claim_links_active_uidx'
  ) then
    raise exception 'Missing active question-claim unique index';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'guard_educational_claim_versions_immutable' and not tgisinternal
  ) then
    raise exception 'Missing claim-version immutability trigger';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'validate_card_claim_link_reference' and not tgisinternal
  ) then
    raise exception 'Missing card-claim reference trigger';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'mark_card_claim_links_stale' and not tgisinternal
  ) then
    raise exception 'Missing stale card-claim trigger';
  end if;

  if not public.educational_claim_qualifiers_are_valid('{"anatomy":"pelvis"}'::jsonb)
    or public.educational_claim_qualifiers_are_valid('{"stem":"forbidden"}'::jsonb)
    or public.educational_claim_qualifiers_are_valid('{"unknown":"x"}'::jsonb)
  then
    raise exception 'Qualifier validator is incorrect';
  end if;

  if public.educational_claim_fingerprint_hash(
    'treatment_indication',
    '1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a'::uuid,
    'preferred_reconstruction',
    'cup-cage reconstruction',
    '{"anatomy":"Pelvis","setting":"revision THA"}'::jsonb
  ) is distinct from public.educational_claim_fingerprint_hash(
    'Treatment_Indication',
    '1AD8280B-74E5-416C-B8FB-06C7D9CC0D0A'::uuid,
    'Preferred Reconstruction',
    'Cup-cage reconstruction.',
    '{"setting":"revision THA","anatomy":"pelvis"}'::jsonb
  ) then
    raise exception 'Fingerprint hash is not stable under allowed normalization';
  end if;
end $$;

rollback;
