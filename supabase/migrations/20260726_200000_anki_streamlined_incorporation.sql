-- Streamlined downstream incorporation for proposals already reviewed by a human.
begin;

alter table public.anki_editor_workspace_proposals
  drop constraint if exists anki_editor_workspace_status;
alter table public.anki_editor_workspace_proposals
  add constraint anki_editor_workspace_status check (
    status in (
      'submitted','processing','needs_attention','incorporated',
      'under_review','changes_requested','approved_for_incorporation',
      'rejected','withdrawn'
    )
  );

alter table public.anki_editor_workspace_proposals
  add column if not exists incorporation_issue text null,
  add column if not exists result_canonical_card_version_id uuid null
    references public.canonical_card_versions(id) on delete restrict,
  add column if not exists processing_started_at timestamptz null;

create or replace function public.claim_anki_workspace_proposal_for_incorporation()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare claimed_id uuid;
begin
  select id into claimed_id
  from public.anki_editor_workspace_proposals
  where status='submitted'
  order by created_at
  for update skip locked
  limit 1;
  if claimed_id is null then return null; end if;
  update public.anki_editor_workspace_proposals
  set status='processing',processing_started_at=now(),incorporation_issue=null
  where id=claimed_id;
  return claimed_id;
end $$;

revoke all on function public.claim_anki_workspace_proposal_for_incorporation()
from public,anon,authenticated;
grant execute on function public.claim_anki_workspace_proposal_for_incorporation()
to service_role;

create or replace function public.incorporate_anki_workspace_proposal(
  p_proposal_id uuid,
  p_evidence_hash text,
  p_final_fields jsonb,
  p_final_tags text[],
  p_final_deck_path text,
  p_content_hash text,
  p_mapping_operations jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.anki_editor_workspace_proposals;
  c public.canonical_cards;
  v public.canonical_card_versions;
  next_version integer;
  result_version uuid;
  current_deck text;
  target_deck uuid;
  op jsonb;
  entity_id uuid;
  existing_link uuid;
begin
  select * into p
  from public.anki_editor_workspace_proposals
  where id = p_proposal_id
  for update;
  if p.id is null then raise exception 'proposal_not_found'; end if;
  if p.proposal_evidence_hash <> p_evidence_hash then
    raise exception 'proposal_evidence_changed';
  end if;
  if p.status = 'incorporated' then
    return p.result_canonical_card_version_id;
  end if;
  if p.status not in ('submitted','processing') then
    raise exception 'proposal_not_incorporable';
  end if;
  if p.proposal_kind <> 'edit_existing_card' then
    raise exception 'new_card_requires_attention';
  end if;

  select * into c from public.canonical_cards
  where id = p.canonical_card_id and is_active = true
  for update;
  if c.id is null then raise exception 'canonical_card_inactive'; end if;
  if c.current_version_id <> p.base_canonical_card_version_id then
    raise exception 'stale_card_version';
  end if;
  select * into v from public.canonical_card_versions
  where id = c.current_version_id and canonical_card_id = c.id and is_active = true;
  if v.id is null then raise exception 'canonical_version_unavailable'; end if;
  if jsonb_typeof(p_final_fields) <> 'array' or p_content_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_final_state';
  end if;

  select d.full_name into current_deck
  from public.anki_cards ac join public.anki_decks d on d.id = ac.deck_id
  where ac.id = c.anki_card_id;
  if p_final_deck_path is distinct from current_deck then
    select d.id into target_deck
    from public.anki_decks d
    join public.anki_cards ac on ac.id = c.anki_card_id
    join public.anki_decks current_d on current_d.id = ac.deck_id
    where d.source_id = current_d.source_id
      and d.full_name = p_final_deck_path
      and d.is_active = true;
    if target_deck is null then raise exception 'target_deck_unavailable'; end if;
    update public.anki_cards set deck_id = target_deck where id = c.anki_card_id;
  end if;

  if p_final_fields <> v.field_snapshot or p_final_tags <> v.tag_snapshot then
    select id,version_number into result_version,next_version
    from public.canonical_card_versions
    where canonical_card_id=c.id and content_hash=p_content_hash
    limit 1;
    if result_version is null then
      select coalesce(max(version_number),0) + 1 into next_version
      from public.canonical_card_versions
      where canonical_card_id = c.id;
      insert into public.canonical_card_versions(
        canonical_card_id,version_number,source_note_id,source_card_id,
        content_hash,field_snapshot,raw_html_snapshot,tag_snapshot,
        metadata,comments,is_active
      ) values (
        c.id,next_version,v.source_note_id,v.source_card_id,
        p_content_hash,p_final_fields,v.raw_html_snapshot,p_final_tags,
        jsonb_build_object(
          'source','anki_streamlined_incorporation',
          'proposal_id',p.id,
          'proposal_evidence_hash',p.proposal_evidence_hash
        ),
        'Incorporated from a human-submitted Anki enrichment proposal.',
        true
      )
      returning id into result_version;
    end if;
    update public.canonical_cards
    set current_version_id=result_version,
        current_version_number=next_version,
        source_content_hash=p_content_hash,
        canonical_status='reviewed'
    where id=c.id;
  else
    result_version := v.id;
  end if;

  for op in select value from jsonb_array_elements(coalesce(p_mapping_operations,'[]'::jsonb))
  loop
    entity_id := nullif(op->>'canonicalEntityId','')::uuid;
    if entity_id is null or not exists (
      select 1 from public.canonical_entities
      where id=entity_id and is_active=true and status='canonical'
    ) then raise exception 'inactive_mapping_entity'; end if;
    select id into existing_link
    from public.card_canonical_entity_links
    where canonical_card_id=c.id and canonical_entity_id=entity_id and is_active=true;
    if op->>'action' = 'remove' then
      update public.card_canonical_entity_links
      set is_active=false, review_status='superseded',
          comments='Removed by human-submitted Anki enrichment proposal.'
      where id=existing_link;
    elsif existing_link is null then
      insert into public.card_canonical_entity_links(
        canonical_card_id,canonical_entity_id,retarget_path,match_basis,
        mapping_confidence,review_status,created_by_source,metadata,comments,is_active
      ) values (
        c.id,entity_id,'direct_exact','exact_label',1.000,'approved','reviewed',
        jsonb_build_object(
          'mapping_role',op->>'mappingRole',
          'proposal_id',p.id,
          'proposal_evidence_hash',p.proposal_evidence_hash
        ),
        'Human-submitted and agent-normalized Anki mapping.',
        true
      );
    else
      update public.card_canonical_entity_links
      set review_status='approved',created_by_source='reviewed',
          mapping_confidence=1.000,
          metadata=metadata || jsonb_build_object(
            'mapping_role',op->>'mappingRole',
            'proposal_id',p.id,
            'proposal_evidence_hash',p.proposal_evidence_hash
          )
      where id=existing_link;
    end if;
  end loop;

  update public.anki_editor_workspace_proposals
  set status='incorporated',incorporated_at=now(),
      incorporation_issue=null,
      result_canonical_card_version_id=result_version
  where id=p.id;
  return result_version;
end $$;

revoke all on function public.incorporate_anki_workspace_proposal(
  uuid,text,jsonb,text[],text,text,jsonb
) from public,anon,authenticated;
grant execute on function public.incorporate_anki_workspace_proposal(
  uuid,text,jsonb,text[],text,text,jsonb
) to service_role;

comment on function public.incorporate_anki_workspace_proposal(
  uuid,text,jsonb,text[],text,text,jsonb
) is 'Atomically materializes one human-submitted, agent-normalized enrichment proposal.';

commit;
