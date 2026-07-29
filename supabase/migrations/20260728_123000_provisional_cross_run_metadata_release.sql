begin;

create or replace function public.validate_metadata_release_assertion()
returns trigger language plpgsql set search_path = public as $$
declare release_row public.metadata_releases; assertion_row public.card_metadata_assertions;
begin
  select * into release_row from public.metadata_releases where id = new.metadata_release_id;
  select * into assertion_row from public.card_metadata_assertions where id = new.assertion_id;
  if assertion_row.decision <> 'accepted'
    or assertion_row.taxonomy_version_id <> release_row.taxonomy_version_id
    or (
      assertion_row.pipeline_run_id <> release_row.pipeline_run_id
      and assertion_row.decision_policy_version <> 'codex_audit_provisional_v1'
    )
    or not exists (
      select 1 from public.anki_deck_release_cards rc
      where rc.deck_release_id = release_row.deck_release_id
        and rc.canonical_card_id = assertion_row.canonical_card_id
        and rc.canonical_card_version_id = assertion_row.canonical_card_version_id
        and rc.inclusion_status = 'included'
    ) then
    raise exception 'metadata release membership requires accepted, pinned, in-release assertion';
  end if;
  return new;
end $$;

comment on function public.validate_metadata_release_assertion() is
  'Pins accepted metadata to deck/card/taxonomy identity. Cross-run aggregation is allowed only for Codex-audited provisional assertions.';

commit;
