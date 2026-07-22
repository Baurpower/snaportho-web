-- Run after the migration in a disposable/local or explicitly approved staging
-- database. This file is read-only: it raises on mismatch and changes no data.

do $$
declare
  table_name text;
  policy_count integer;
  constraint_definition text;
  search_expression text;
begin
  -- All seven tables must exist.
  foreach table_name in array array[
    'mycases_cases',
    'mycases_learning_items',
    'mycases_tags',
    'mycases_case_tags',
    'mycases_learning_item_tags',
    'mycases_collections',
    'mycases_collection_items'
  ]
  loop
    if to_regclass('public.' || table_name) is null then
      raise exception 'Missing table public.%', table_name;
    end if;
  end loop;

  -- The backend model must not acquire direct identifiers, plaintext attachment
  -- metadata, or key material.
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = any (array[
        'mycases_cases',
        'mycases_learning_items',
        'mycases_tags',
        'mycases_case_tags',
        'mycases_learning_item_tags',
        'mycases_collections',
        'mycases_collection_items'
      ])
      and c.column_name = any (array[
        'patient_name', 'mrn', 'dob', 'encounter_id', 'room',
        'clinical_report', 'caption', 'encryption_key'
      ])
  ) then
    raise exception 'Forbidden MyCases column found';
  end if;

  -- Every composite FK target must have its named unique key.
  foreach table_name in array array[
    'mycases_cases',
    'mycases_learning_items',
    'mycases_tags',
    'mycases_collections'
  ]
  loop
    if not exists (
      select 1
      from pg_constraint
      where conrelid = ('public.' || table_name)::regclass
        and conname = table_name || '_id_user_id_key'
        and contype = 'u'
        and pg_get_constraintdef(oid) = 'UNIQUE (id, user_id)'
    ) then
      raise exception 'Missing or incorrect composite ownership key on public.%', table_name;
    end if;
  end loop;

  -- The optional case link preserves user_id when a case is hard-deleted.
  select pg_get_constraintdef(oid)
    into constraint_definition
  from pg_constraint
  where conrelid = 'public.mycases_learning_items'::regclass
    and conname = 'mycases_learning_case_owner_fk'
    and contype = 'f';

  if constraint_definition is null
    or constraint_definition not like 'FOREIGN KEY (case_id, user_id)%REFERENCES %mycases_cases(id, user_id)%ON DELETE SET NULL (case_id)%'
  then
    raise exception 'Incorrect case ownership FK or ON DELETE behavior: %', constraint_definition;
  end if;

  -- All other composite ownership FKs must cascade link rows only.
  foreach table_name in array array[
    'mycases_case_tags',
    'mycases_learning_item_tags',
    'mycases_collection_items'
  ]
  loop
    if exists (
      select 1
      from pg_constraint
      where conrelid = ('public.' || table_name)::regclass
        and contype = 'f'
        and confrelid <> 'auth.users'::regclass
        and confdeltype <> 'c'
    ) then
      raise exception 'Non-cascading ownership link FK found on public.%', table_name;
    end if;
  end loop;

  -- Generated full-text search column and its GIN index must both be present.
  if not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.mycases_learning_items'::regclass
      and attname = 'search_tsv'
      and attgenerated = 's'
      and atttypid = 'tsvector'::regtype
  ) then
    raise exception 'search_tsv is missing or is not a stored generated tsvector';
  end if;

  select pg_get_expr(d.adbin, d.adrelid)
    into search_expression
  from pg_attribute a
  join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where a.attrelid = 'public.mycases_learning_items'::regclass
    and a.attname = 'search_tsv';

  if search_expression is null
    or search_expression not ilike '%to_tsvector(%english%'
    or search_expression not ilike '%title%'
    or search_expression not ilike '%content%'
    or search_expression not ilike '%procedure_name%'
    or search_expression not ilike '%topic%'
  then
    raise exception 'search_tsv generated expression is incomplete: %', search_expression;
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'mycases_learning_items'
      and indexname = 'mycases_learning_search_idx'
      and indexdef ilike '%using gin (search_tsv)%'
  ) then
    raise exception 'Generated search column is missing its GIN index';
  end if;

  -- Version triggers must exist on exactly the versioned mutable parents.
  if (
    select count(*)
    from pg_trigger
    where not tgisinternal
      and tgname in (
        'mycases_cases_touch',
        'mycases_learning_touch',
        'mycases_collections_touch'
      )
  ) <> 3 then
    raise exception 'Expected all three MyCases version triggers';
  end if;

  -- RLS and the four exact owner-only operations are required on every table.
  foreach table_name in array array[
    'mycases_cases',
    'mycases_learning_items',
    'mycases_tags',
    'mycases_case_tags',
    'mycases_learning_item_tags',
    'mycases_collections',
    'mycases_collection_items'
  ]
  loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = table_name
        and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on public.%', table_name;
    end if;

    select count(*)
      into policy_count
    from pg_policies
    where schemaname = 'public'
      and tablename = table_name
      and permissive = 'PERMISSIVE'
      and roles = array['public']::name[]
      and (
        (policyname = table_name || '_select_own' and cmd = 'SELECT'
          and regexp_replace(coalesce(qual, ''), '[()[:space:]]', '', 'g') = 'auth.uid=user_id'
          and with_check is null)
        or
        (policyname = table_name || '_insert_own' and cmd = 'INSERT'
          and qual is null
          and regexp_replace(coalesce(with_check, ''), '[()[:space:]]', '', 'g') = 'auth.uid=user_id')
        or
        (policyname = table_name || '_update_own' and cmd = 'UPDATE'
          and regexp_replace(coalesce(qual, ''), '[()[:space:]]', '', 'g') = 'auth.uid=user_id'
          and regexp_replace(coalesce(with_check, ''), '[()[:space:]]', '', 'g') = 'auth.uid=user_id')
        or
        (policyname = table_name || '_delete_own' and cmd = 'DELETE'
          and regexp_replace(coalesce(qual, ''), '[()[:space:]]', '', 'g') = 'auth.uid=user_id'
          and with_check is null)
      );

    if policy_count <> 4 or (
      select count(*)
      from pg_policies
      where schemaname = 'public' and tablename = table_name
    ) <> 4 then
      raise exception 'Expected four exact auth.uid() owner policies on public.%; found %',
        table_name, policy_count;
    end if;
  end loop;
end
$$;
