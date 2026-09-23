-- claim-overlap.v1 learner contract.
-- Generalizes the Phase 0 attempt, recommendation, and launch tables.
-- Phase 0 rows stay pinned to patellar instability and direct_human_review.
-- claim-overlap rows store a stable question identity and a claim snapshot.
-- They do not require a question-to-card edge or a curriculum-bridge link.
-- DDL only: this migration inserts no attempts, recommendations, or commands.

begin;

alter table public.educational_question_attempt_events
  add column if not exists native_question_id text,
  add column if not exists attempt_id text,
  add column if not exists identity_status text;

alter table public.educational_question_attempt_events
  alter column external_question_id drop not null,
  alter column question_link_id drop not null,
  alter column question_review_assertion_id drop not null,
  alter column canonical_entity_id drop not null;

alter table public.educational_recommendation_runs
  alter column canonical_entity_id drop not null;

alter table public.educational_recommendation_runs
  add column if not exists claim_id uuid references public.educational_claims(id) on delete restrict,
  add column if not exists claim_version_id uuid references public.educational_claim_versions(id) on delete restrict,
  add column if not exists gap_class text;

alter table public.educational_recommendation_items
  add column if not exists card_claim_link_id uuid references public.card_claim_links(id) on delete restrict,
  add column if not exists claim_id uuid references public.educational_claims(id) on delete restrict,
  add column if not exists claim_version_id uuid references public.educational_claim_versions(id) on delete restrict;

alter table public.educational_recommendation_items
  alter column card_link_id drop not null,
  alter column card_review_assertion_id drop not null,
  alter column canonical_entity_id drop not null;

alter table public.educational_question_attempt_events drop constraint if exists educational_attempts_contract_check;
alter table public.educational_question_attempt_events
  add constraint educational_attempts_contract_check check (
    contract_version in ('orthobullets-anki.v1', 'claim-overlap.v1')
  );

alter table public.educational_question_attempt_events drop constraint if exists educational_attempts_provider_check;
alter table public.educational_question_attempt_events
  add constraint educational_attempts_provider_check check (
    (contract_version = 'orthobullets-anki.v1' and provider = 'orthobullets')
    or (contract_version = 'claim-overlap.v1' and provider in ('orthobullets', 'rock_himalaya'))
  );

alter table public.educational_question_attempt_events drop constraint if exists educational_attempts_entity_check;
alter table public.educational_question_attempt_events
  add constraint educational_attempts_entity_check check (
    (contract_version = 'orthobullets-anki.v1' and canonical_entity_id = '1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a'::uuid)
    or contract_version = 'claim-overlap.v1'
  );

alter table public.educational_question_attempt_events drop constraint if exists educational_attempts_phase0_refs_check;
alter table public.educational_question_attempt_events
  add constraint educational_attempts_phase0_refs_check check (
    contract_version <> 'orthobullets-anki.v1'
    or (
      external_question_id is not null
      and question_link_id is not null
      and question_review_assertion_id is not null
      and canonical_entity_id is not null
      and native_question_id is null
      and identity_status is null
    )
  );

alter table public.educational_question_attempt_events drop constraint if exists educational_attempts_identity_status_check;
alter table public.educational_question_attempt_events
  add constraint educational_attempts_identity_status_check check (
    identity_status is null
    or identity_status in ('stable', 'missing_native_id', 'attempt_id_only')
  );

alter table public.educational_question_attempt_events drop constraint if exists educational_attempts_claim_overlap_identity_check;
alter table public.educational_question_attempt_events
  add constraint educational_attempts_claim_overlap_identity_check check (
    contract_version <> 'claim-overlap.v1'
    or (
      native_question_id ~ '^[A-Za-z0-9._:-]{1,200}$'
      and identity_status = 'stable'
      and question_link_id is null
      and question_review_assertion_id is null
      and (attempt_id is null or attempt_id ~ '^[A-Za-z0-9._:-]{1,200}$')
    )
  );

alter table public.educational_recommendation_runs drop constraint if exists educational_recommendation_runs_contract_check;
alter table public.educational_recommendation_runs
  add constraint educational_recommendation_runs_contract_check check (
    contract_version in ('orthobullets-anki.v1', 'claim-overlap.v1')
  );

alter table public.educational_recommendation_runs drop constraint if exists educational_recommendation_runs_algorithm_check;
alter table public.educational_recommendation_runs
  add constraint educational_recommendation_runs_algorithm_check check (
    (contract_version = 'orthobullets-anki.v1' and algorithm = 'reviewed_exact_entity_overlap_v1')
    or (contract_version = 'claim-overlap.v1' and algorithm = 'claim-overlap.v1')
  );

alter table public.educational_recommendation_runs drop constraint if exists educational_recommendation_runs_status_check;
alter table public.educational_recommendation_runs
  add constraint educational_recommendation_runs_status_check check (
    (contract_version = 'orthobullets-anki.v1' and status in ('completed', 'no_results', 'failed'))
    or (contract_version = 'claim-overlap.v1' and status in ('completed', 'abstain', 'no_card', 'failed'))
  );

alter table public.educational_recommendation_runs drop constraint if exists educational_recommendation_runs_count_check;
alter table public.educational_recommendation_runs
  add constraint educational_recommendation_runs_count_check check (
    (status = 'completed' and result_count between 1 and 3)
    or (status in ('no_results', 'failed', 'abstain', 'no_card') and result_count = 0)
  );

alter table public.educational_recommendation_runs drop constraint if exists educational_recommendation_runs_gap_check;
alter table public.educational_recommendation_runs
  add constraint educational_recommendation_runs_gap_check check (
    gap_class is null
    or gap_class in (
      'missing_claim', 'missing_card', 'weak_card', 'mapping_gap',
      'source_extraction_gap', 'retrieval_gap'
    )
  );

alter table public.educational_recommendation_runs drop constraint if exists educational_recommendation_runs_claim_pin_check;
alter table public.educational_recommendation_runs
  add constraint educational_recommendation_runs_claim_pin_check check (
    contract_version <> 'claim-overlap.v1'
    or (
      (status = 'completed' and claim_id is not null and claim_version_id is not null and gap_class is null)
      or (status = 'no_card' and gap_class = 'missing_card' and result_count = 0)
      or (status in ('abstain', 'failed') and result_count = 0)
    )
  );

alter table public.educational_recommendation_runs drop constraint if exists educational_recommendation_runs_entity_check;
alter table public.educational_recommendation_runs
  add constraint educational_recommendation_runs_entity_check check (
    (contract_version = 'orthobullets-anki.v1' and canonical_entity_id = '1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a'::uuid)
    or (
      contract_version = 'claim-overlap.v1'
      and (status <> 'completed' or canonical_entity_id is not null)
    )
  );

alter table public.educational_recommendation_items drop constraint if exists educational_recommendation_items_entity_check;
alter table public.educational_recommendation_items drop constraint if exists educational_recommendation_items_reason_check;
alter table public.educational_recommendation_items drop constraint if exists educational_recommendation_items_shape_check;
alter table public.educational_recommendation_items
  add constraint educational_recommendation_items_shape_check check (
    (
      reason_code = 'reviewed_exact_entity_overlap'
      and canonical_entity_id = '1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a'::uuid
      and card_link_id is not null
      and card_review_assertion_id is not null
      and card_claim_link_id is null
    )
    or (
      reason_code = 'exact_claim_overlap'
      and canonical_entity_id is not null
      and card_link_id is null
      and card_review_assertion_id is null
    )
  );

alter table public.educational_anki_launch_commands drop constraint if exists educational_anki_launch_commands_contract_check;
alter table public.educational_anki_launch_commands
  add constraint educational_anki_launch_commands_contract_check check (
    contract_version in ('orthobullets-anki.v1', 'claim-overlap.v1')
  );

create index if not exists educational_attempts_native_question_idx
  on public.educational_question_attempt_events (provider, native_question_id, occurred_at desc)
  where contract_version = 'claim-overlap.v1';

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

comment on table public.educational_question_attempt_events is
  'User-owned metadata-only miss events. orthobullets-anki.v1 remains the patellar pilot. claim-overlap.v1 stores a stable native question id and does not store stems or answers.';
comment on table public.educational_anki_launch_commands is
  'Short-lived exact-card launch intents addressed by Anki note GUID and card ordinal. No add-on runtime consumes them yet.';

commit;
