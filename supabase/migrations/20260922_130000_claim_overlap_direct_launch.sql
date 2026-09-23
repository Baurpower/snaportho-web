-- claim-overlap.v1 launches may be created from GUID + ordinal without a
-- recommendation item. Phase 0 launches still require the item FK.

begin;

alter table public.educational_anki_launch_commands
  alter column recommendation_item_id drop not null;

alter table public.educational_anki_launch_commands
  drop constraint if exists educational_anki_launch_commands_item_optional_check;
alter table public.educational_anki_launch_commands
  add constraint educational_anki_launch_commands_item_optional_check check (
    (contract_version = 'orthobullets-anki.v1' and recommendation_item_id is not null)
    or contract_version = 'claim-overlap.v1'
  );

create or replace function public.validate_educational_phase0_references()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  linked_record record;
  run_contract text;
begin
  if tg_table_name = 'educational_question_attempt_events' then
    if new.contract_version = 'claim-overlap.v1' then
      if new.identity_status is distinct from 'stable'
        or new.native_question_id is null
        or new.provider not in ('orthobullets', 'rock_himalaya')
        or new.question_link_id is not null
        or new.question_review_assertion_id is not null
        or new.review_state is distinct from 'answered_review'
        or new.correct is distinct from false then
        raise exception 'claim-overlap attempt requires a stable reviewed miss and no curriculum-bridge link';
      end if;
      return new;
    end if;

    select l.external_question_id, l.canonical_entity_id, a.question_link_id,
      a.reviewer_decision, a.provenance_method, a.confidence, a.mapping_role, a.is_active,
      l.is_active as link_is_active, l.review_status, l.mapping_confidence,
      q.is_active as question_is_active, q.specialty_normalized, q.topic_slug, s.slug as source_slug
    into linked_record
    from public.question_canonical_entity_links l
    join public.educational_link_review_assertions a on a.id = new.question_review_assertion_id
    join public.external_questions q on q.id = l.external_question_id
    join public.external_sources s on s.id = q.source_id
    where l.id = new.question_link_id;
    if not found or linked_record.external_question_id is distinct from new.external_question_id
      or linked_record.canonical_entity_id is distinct from new.canonical_entity_id
      or linked_record.question_link_id is distinct from new.question_link_id
      or linked_record.reviewer_decision <> 'approved' or linked_record.provenance_method <> 'direct_human_review'
      or linked_record.confidence < 0.950 or linked_record.mapping_role <> 'tests' or not linked_record.is_active
      or not linked_record.link_is_active or linked_record.review_status <> 'approved'
      or linked_record.mapping_confidence < 0.950 or not linked_record.question_is_active
      or linked_record.source_slug <> 'orthobullets' or linked_record.specialty_normalized <> 'knee-sports'
      or linked_record.topic_slug <> 'patellar-instability' then
      raise exception 'attempt requires an active approved direct question review at confidence >= 0.950';
    end if;
  elsif tg_table_name = 'educational_recommendation_runs' then
    if new.contract_version = 'claim-overlap.v1' then
      if new.algorithm is distinct from 'claim-overlap.v1'
        or new.status not in ('completed', 'abstain', 'no_card', 'failed') then
        raise exception 'claim-overlap recommendation run is not a claim snapshot';
      end if;
      perform 1 from public.educational_question_attempt_events e
      where e.id = new.attempt_event_id and e.user_id = new.user_id
        and e.contract_version = 'claim-overlap.v1'
        and e.canonical_entity_id is not distinct from new.canonical_entity_id;
      if not found then
        raise exception 'claim-overlap recommendation run does not match its attempt and user';
      end if;
      return new;
    end if;

    perform 1 from public.educational_question_attempt_events e
    where e.id = new.attempt_event_id and e.user_id = new.user_id
      and e.canonical_entity_id = new.canonical_entity_id;
    if not found then
      raise exception 'recommendation run entity does not match its attempt and user';
    end if;
  elsif tg_table_name = 'educational_recommendation_items' then
    select r.contract_version into run_contract
    from public.educational_recommendation_runs r
    where r.id = new.recommendation_run_id and r.user_id = new.user_id;
    if run_contract = 'claim-overlap.v1' then
      if new.reason_code is distinct from 'exact_claim_overlap'
        or new.card_link_id is not null
        or new.card_review_assertion_id is not null then
        raise exception 'claim-overlap item must not use an entity-link review';
      end if;
      select c.current_version_id
      into linked_record
      from public.canonical_cards c
      join public.canonical_card_versions v on v.id = c.current_version_id
      where c.id = new.canonical_card_id and c.is_active and v.is_active;
      if not found or linked_record.current_version_id is distinct from new.canonical_card_version_id then
        raise exception 'claim-overlap item requires the current card version';
      end if;
      if new.card_claim_link_id is not null then
        perform 1 from public.card_claim_links l
        where l.id = new.card_claim_link_id
          and l.canonical_card_id = new.canonical_card_id
          and l.canonical_card_version_id = new.canonical_card_version_id
          and l.is_active
          and l.mapping_role = 'teaches'
          and l.review_status in ('auto_approved', 'approved')
          and (new.claim_id is null or l.claim_id = new.claim_id);
        if not found then
          raise exception 'claim-overlap item link is not an active approved teaches link';
        end if;
      end if;
      return new;
    end if;

    select c.current_version_id, l.canonical_card_id, l.canonical_entity_id, a.card_link_id,
      a.reviewer_decision, a.provenance_method, a.confidence, a.mapping_role, a.is_active,
      l.is_active as link_is_active, l.review_status, l.mapping_confidence, v.is_active as version_is_active
    into linked_record
    from public.canonical_cards c
    join public.canonical_card_versions v on v.id = c.current_version_id
    join public.card_canonical_entity_links l on l.id = new.card_link_id
    join public.educational_link_review_assertions a on a.id = new.card_review_assertion_id
    where c.id = new.canonical_card_id and c.is_active;
    if not found or linked_record.current_version_id is distinct from new.canonical_card_version_id
      or linked_record.canonical_card_id is distinct from new.canonical_card_id
      or linked_record.canonical_entity_id is distinct from new.canonical_entity_id
      or linked_record.card_link_id is distinct from new.card_link_id
      or linked_record.reviewer_decision <> 'approved' or linked_record.provenance_method <> 'direct_human_review'
      or linked_record.confidence < 0.950
      or linked_record.mapping_role not in ('tests','teaches','explains','demonstrates') or not linked_record.is_active
      or not linked_record.link_is_active or linked_record.review_status <> 'approved'
      or linked_record.mapping_confidence < 0.950 or not linked_record.version_is_active then
      raise exception 'recommendation requires current card version and active approved direct card review';
    end if;
  elsif tg_table_name = 'educational_recommendation_actions' and new.recommendation_item_id is not null then
    perform 1 from public.educational_recommendation_items i
    where i.id = new.recommendation_item_id and i.user_id = new.user_id
      and i.recommendation_run_id = new.recommendation_run_id;
    if not found then
      raise exception 'recommendation action item does not belong to its run and user';
    end if;
  elsif tg_table_name = 'educational_anki_launch_commands' then
    if new.contract_version = 'claim-overlap.v1' then
      select c.current_version_id, n.anki_note_guid, ac.card_ord
      into linked_record
      from public.canonical_cards c
      join public.anki_notes n on n.id = c.anki_note_id
      join public.anki_cards ac on ac.id = c.anki_card_id
      where c.id = new.canonical_card_id and c.is_active and n.is_active and ac.is_active;
      if not found
        or linked_record.current_version_id is distinct from new.canonical_card_version_id
        or linked_record.anki_note_guid is distinct from new.note_guid
        or linked_record.card_ord is distinct from new.card_ordinal then
        raise exception 'claim-overlap launch GUID/ordinal does not match canonical card identity';
      end if;
      return new;
    end if;
    select i.canonical_card_id, i.canonical_card_version_id, n.anki_note_guid, ac.card_ord
    into linked_record
    from public.educational_recommendation_items i
    join public.canonical_cards c on c.id = i.canonical_card_id
    join public.anki_notes n on n.id = c.anki_note_id
    join public.anki_cards ac on ac.id = c.anki_card_id
    where i.id = new.recommendation_item_id and i.user_id = new.user_id
      and c.current_version_id = i.canonical_card_version_id and c.is_active and n.is_active and ac.is_active;
    if not found or linked_record.canonical_card_id is distinct from new.canonical_card_id
      or linked_record.canonical_card_version_id is distinct from new.canonical_card_version_id then
      raise exception 'launch command card/version does not match recommendation item';
    end if;
    if linked_record.anki_note_guid is distinct from new.note_guid
      or linked_record.card_ord is distinct from new.card_ordinal then
      raise exception 'launch command GUID/ordinal does not match canonical card identity';
    end if;
  end if;
  return new;
end;
$$;

comment on table public.educational_anki_launch_commands is
  'Short-lived exact-card launch intents addressed by Anki note GUID and card ordinal. claim-overlap.v1 may omit a recommendation item.';

commit;
