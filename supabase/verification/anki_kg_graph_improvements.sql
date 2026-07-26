begin;
set local transaction read only;

select
  to_regclass('public.anki_kg_improvement_suggestions') is not null
    as suggestions_table_present,
  to_regclass('public.anki_kg_improvement_decisions') is not null
    as decisions_table_present,
  to_regclass('public.anki_kg_improvement_adjudications') is not null
    as adjudications_table_present;

select
  count(*) filter (where decision = 'accept') as accepted,
  count(*) filter (where decision = 'not_useful') as not_useful
from public.anki_kg_improvement_decisions;

select
  count(*) filter (where adjudication = 'approve_for_incorporation') as approved,
  count(*) filter (where adjudication = 'request_changes') as changes_requested,
  count(*) filter (where adjudication = 'reject') as rejected,
  count(*) filter (where adjudication = 'defer') as deferred
from public.anki_kg_improvement_adjudications;

select count(*) as accepted_without_adjudication
from public.anki_kg_improvement_decisions d
left join public.anki_kg_improvement_adjudications a
  on a.suggestion_id = d.suggestion_id
where d.decision = 'accept' and a.id is null;

rollback;
