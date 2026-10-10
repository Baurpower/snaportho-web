-- Run after the X-ray Practice workflow migration in a trusted SQL session.
do $$
declare
  t text;
begin
  foreach t in array array[
    'xray_contributors','xray_submissions','xray_submission_revisions','xray_assets',
    'xray_processing_jobs','xray_review_assignments','xray_review_comments',
    'xray_review_decisions','xray_publication_requests','xray_audit_events',
    'xray_mutation_requests'
  ] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t and c.relrowsecurity and c.relforcerowsecurity
    ) then raise exception 'Expected enabled and forced RLS on public.%', t; end if;
  end loop;

  if has_table_privilege('anon', 'public.xray_submissions', 'select')
     or has_table_privilege('anon', 'public.xray_assets', 'select')
     or has_table_privilege('authenticated', 'public.xray_submissions', 'select')
     or has_table_privilege('authenticated', 'public.xray_assets', 'select')
     or has_table_privilege('authenticated', 'public.xray_review_decisions', 'insert')
     or has_table_privilege('authenticated', 'public.xray_submission_revisions', 'insert')
  then raise exception 'X-ray browser table privileges are broader than intended'; end if;

  if not has_function_privilege('service_role', 'public.create_xray_submission(uuid,text,uuid,uuid,text)', 'execute')
     or not has_function_privilege('service_role', 'public.save_xray_draft(uuid,uuid,integer,text,jsonb,uuid,uuid,text)', 'execute')
     or not has_function_privilege('service_role', 'public.submit_xray_revision(uuid,uuid,integer,text,jsonb,text,text,uuid,uuid,text)', 'execute')
     or not has_function_privilege('service_role', 'public.record_xray_review_decision(uuid,uuid,text,text,text,text[],text,uuid,uuid,text)', 'execute')
  then raise exception 'Expected service-only X-ray RPC grants are missing'; end if;

  if has_function_privilege('anon', 'public.create_xray_submission(uuid,text,uuid,uuid,text)', 'execute')
     or has_function_privilege('authenticated', 'public.create_xray_submission(uuid,text,uuid,uuid,text)', 'execute')
     or has_function_privilege('anon', 'public.record_xray_review_decision(uuid,uuid,text,text,text,text[],text,uuid,uuid,text)', 'execute')
     or has_function_privilege('authenticated', 'public.record_xray_review_decision(uuid,uuid,text,text,text,text[],text,uuid,uuid,text)', 'execute')
     or has_function_privilege('anon', 'private.xray_can_read_submission(uuid)', 'execute')
  then raise exception 'Anonymous/public X-ray function execution is exposed'; end if;

  if not exists (select 1 from pg_trigger where tgname = 'xray_revisions_immutable' and not tgisinternal)
     or not exists (select 1 from pg_trigger where tgname = 'xray_decisions_immutable' and not tgisinternal)
     or not exists (select 1 from pg_trigger where tgname = 'xray_audit_immutable' and not tgisinternal)
     or not exists (select 1 from pg_trigger where tgname = 'xray_assignments_validate' and not tgisinternal)
  then raise exception 'Append-only X-ray guards are missing'; end if;

  if exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename like 'xray_%' and coalesce(qual, '') = 'true'
  ) then raise exception 'Unrestricted X-ray RLS policy detected'; end if;
end $$;
