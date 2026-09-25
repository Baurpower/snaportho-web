-- Backfill support: allow card-claim factory provenance on card links.
-- Additive only: widens one enum, touches no existing rows.

begin;

alter table public.card_canonical_entity_links
  drop constraint if exists card_canonical_entity_links_basis_check;
alter table public.card_canonical_entity_links
  add constraint card_canonical_entity_links_basis_check
  check (match_basis in ('exact_label', 'alias', 'curriculum_inferred', 'concept_bridge', 'factory_semantic'));

commit;
