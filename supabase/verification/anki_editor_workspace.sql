begin;
set transaction read only;
select table_name from information_schema.tables where table_schema='public' and table_name='anki_editor_workspace_proposals';
select column_name,is_nullable,data_type from information_schema.columns where table_schema='public' and table_name='anki_editor_workspace_proposals' order by ordinal_position;
select relrowsecurity,relforcerowsecurity from pg_class where oid='public.anki_editor_workspace_proposals'::regclass;
select relrowsecurity,relforcerowsecurity from pg_class where oid='public.anki_editor_workspace_review_actions'::regclass;
select count(*) as unexpected_canonical_writes from public.anki_editor_workspace_proposals where status='incorporated';
rollback;
