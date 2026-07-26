begin;
set local transaction read only;

select
  to_regprocedure(
    'public.incorporate_anki_workspace_proposal(uuid,text,jsonb,text[],text,text,jsonb)'
  ) is not null as incorporation_function_exists;

select status,count(*)
from public.anki_editor_workspace_proposals
group by status
order by status;

rollback;
