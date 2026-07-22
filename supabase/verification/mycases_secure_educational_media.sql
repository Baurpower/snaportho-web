-- Read-only schema verification for secure educational media.
do $$
declare
  fk_definition text;
  policy_count integer;
begin
  if to_regclass('public.mycases_educational_assets') is null then
    raise exception 'Missing mycases_educational_assets';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'mycases_educational_assets'
      and column_name = any (array[
        'original_filename', 'public_url', 'patient_name', 'mrn', 'dob', 'encounter_id',
        'exif', 'raw_metadata', 'encryption_key', 'plaintext_caption'
      ])
  ) then raise exception 'Forbidden educational asset metadata column found'; end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mycases_educational_assets'::regclass
      and conname = 'mycases_educational_assets_id_user_id_key'
      and pg_get_constraintdef(oid) = 'UNIQUE (id, user_id)'
  ) then raise exception 'Missing asset composite ownership key'; end if;
  select pg_get_constraintdef(oid) into fk_definition from pg_constraint
    where conrelid = 'public.mycases_educational_assets'::regclass
      and conname = 'mycases_educational_assets_case_owner_fk';
  if fk_definition is null
    or fk_definition not like 'FOREIGN KEY (case_id, user_id)%REFERENCES %mycases_cases(id, user_id)%ON DELETE RESTRICT%'
  then raise exception 'Incorrect asset case ownership FK: %', fk_definition; end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'mycases_educational_assets' and c.relrowsecurity
  ) then raise exception 'Asset RLS is disabled'; end if;
  select count(*) into policy_count from pg_policies
    where schemaname = 'public' and tablename = 'mycases_educational_assets'
      and (
        (policyname='mycases_educational_assets_select_own' and cmd='SELECT' and regexp_replace(coalesce(qual,''),'[()[:space:]]','','g')='auth.uid=user_id' and with_check is null)
        or (policyname='mycases_educational_assets_insert_own' and cmd='INSERT' and qual is null and regexp_replace(coalesce(with_check,''),'[()[:space:]]','','g')='auth.uid=user_id')
        or (policyname='mycases_educational_assets_update_own' and cmd='UPDATE' and regexp_replace(coalesce(qual,''),'[()[:space:]]','','g')='auth.uid=user_id' and regexp_replace(coalesce(with_check,''),'[()[:space:]]','','g')='auth.uid=user_id')
        or (policyname='mycases_educational_assets_delete_own' and cmd='DELETE' and regexp_replace(coalesce(qual,''),'[()[:space:]]','','g')='auth.uid=user_id' and with_check is null)
      );
  if policy_count <> 4 or (select count(*) from pg_policies where schemaname='public' and tablename='mycases_educational_assets') <> 4
  then raise exception 'Expected four exact owner asset policies'; end if;
  if not exists (
    select 1 from storage.buckets where id = 'mycases-educational-media'
      and name = 'mycases-educational-media'
      and public = false and file_size_limit = 15728640
      and allowed_mime_types = array['image/webp']::text[]
  ) then raise exception 'Educational media bucket is missing, public, or misconfigured'; end if;
  -- No browser role may operate on the media bucket. Reject both policies that
  -- mention this bucket and unscoped/global policies. Policies explicitly
  -- constrained to a different bucket remain valid for unrelated features.
  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL')
      and roles && array['public', 'anon', 'authenticated']::name[]
      and (
        (coalesce(qual, '') || ' ' || coalesce(with_check, ''))
          like '%mycases-educational-media%'
        or (coalesce(qual, '') || ' ' || coalesce(with_check, ''))
          not like '%bucket_id%'
        or lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
          !~ 'bucket_id[[:space:]]*=[[:space:]]*''[^'']+''(::text)?'
        or lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
          ~ '(^|[^a-z])(or|any|in)([^a-z]|$)|<>|!='
      )
  ) then
    raise exception 'Direct anon/authenticated storage access can reach educational media';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in (
        'mycases_educational_media_select_own',
        'mycases_educational_media_insert_own',
        'mycases_educational_media_update_own',
        'mycases_educational_media_delete_own'
      )
  ) then raise exception 'Superseded educational media storage policy remains'; end if;
  if not exists (select 1 from pg_indexes where schemaname='public' and tablename='mycases_educational_assets'
    and indexname='mycases_educational_assets_case_created_idx')
  then raise exception 'Missing active case asset index'; end if;
end
$$;
