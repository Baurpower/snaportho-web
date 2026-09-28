-- Phase 3C Step 7: RLS hardening for Phase 3 tables.
--
-- The Phase 3 migration creates canonical_entity_aliases and
-- entity_review_decisions without row-level security, while Phase 2 locks
-- its tables to service_role-only. An RLS-disabled table is reachable with
-- the anon key. Close the gap with the same service_role-only pattern
-- BEFORE any alias/decision rows land. Idempotent; additive only.

begin;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'canonical_entity_aliases',
    'entity_review_decisions'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated, service_role', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_service_role_all',
      table_name
    );
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true)',
      table_name || '_service_role_all',
      table_name
    );
  end loop;
end $$;

commit;
