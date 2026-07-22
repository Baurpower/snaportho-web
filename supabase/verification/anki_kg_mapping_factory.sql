begin;
set local transaction read only;
do $$ declare t text; forced boolean; begin
  foreach t in array array['anki_kg_factory_runs','anki_kg_factory_batches','anki_kg_factory_card_assignments','anki_kg_factory_stage_results','anki_kg_factory_machine_reviews','anki_kg_factory_consensus_decisions','anki_kg_factory_queue_items','anki_kg_factory_artifacts'] loop
    select relforcerowsecurity into forced from pg_class where oid=('public.'||t)::regclass;
    if forced is not true then raise exception '% does not force RLS',t; end if;
    if has_table_privilege('anon','public.'||t,'SELECT') or has_table_privilege('authenticated','public.'||t,'SELECT') then raise exception '% has client grant',t; end if;
  end loop;
  if exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname ~ '(publish|approve|apply).*anki.*kg.*factory') then raise exception 'publication function exists'; end if;
end $$;
-- Static schema tests additionally assert: no canonical_relationships dependency, no educational_resources,
-- no learner/question/recommendation tables, machine/human separation, idempotency, and immutability.
rollback;
