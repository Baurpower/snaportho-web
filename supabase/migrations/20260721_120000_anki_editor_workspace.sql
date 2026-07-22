-- Assignment-independent editor proposals from Anki Browse, Reviewer, or dashboard.
-- Proposal-only: this migration never creates cards, entities, mappings, or releases.
begin;

create table public.anki_editor_workspace_proposals (
  id uuid primary key default gen_random_uuid(),
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  device_token_id uuid not null references public.brobot_anki_device_tokens(id) on delete restrict,
  proposal_kind text not null,
  source_surface text not null,
  canonical_card_id uuid null references public.canonical_cards(id) on delete restrict,
  base_canonical_card_version_id uuid null references public.canonical_card_versions(id) on delete restrict,
  base_content_hash text null,
  note_guid text not null,
  card_ordinal integer not null,
  local_content_hash text not null,
  edited_fields jsonb not null,
  central_tag_changes jsonb not null default '{"add":[],"remove":[]}'::jsonb,
  proposed_deck_path text null,
  mapping_changes jsonb not null default '[]'::jsonb,
  kg_expansion_suggestion jsonb null,
  reviewer_notes text not null default '',
  proposal_evidence_hash text not null,
  status text not null default 'submitted',
  idempotency_key uuid not null,
  client_version text not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  incorporated_at timestamptz null,
  constraint anki_editor_workspace_kind check (proposal_kind in ('edit_existing_card','create_missing_card')),
  constraint anki_editor_workspace_surface check (source_surface in ('browser','reviewer','dashboard')),
  constraint anki_editor_workspace_status check (status in ('submitted','under_review','changes_requested','approved_for_incorporation','rejected','withdrawn','incorporated')),
  constraint anki_editor_workspace_identity check (char_length(note_guid) between 1 and 200 and card_ordinal >= 0),
  constraint anki_editor_workspace_hashes check (local_content_hash ~ '^[a-f0-9]{64}$' and proposal_evidence_hash ~ '^[a-f0-9]{64}$' and (base_content_hash is null or base_content_hash ~ '^[a-f0-9]{64}$')),
  constraint anki_editor_workspace_fields check (jsonb_typeof(edited_fields)='array' and jsonb_array_length(edited_fields)>0),
  constraint anki_editor_workspace_tags check (jsonb_typeof(central_tag_changes)='object'),
  constraint anki_editor_workspace_mappings check (jsonb_typeof(mapping_changes)='array'),
  constraint anki_editor_workspace_notes check (char_length(reviewer_notes)<=2000),
  constraint anki_editor_workspace_base check (
    (proposal_kind='edit_existing_card' and canonical_card_id is not null and base_canonical_card_version_id is not null and base_content_hash is not null)
    or (proposal_kind='create_missing_card' and canonical_card_id is null and base_canonical_card_version_id is null and base_content_hash is null)
  ),
  constraint anki_editor_workspace_idempotent unique(reviewer_user_id,idempotency_key)
);

create index anki_editor_workspace_queue_idx on public.anki_editor_workspace_proposals(status,created_at);
create index anki_editor_workspace_card_idx on public.anki_editor_workspace_proposals(canonical_card_id,created_at) where canonical_card_id is not null;

create function public.guard_anki_editor_workspace_immutable()
returns trigger language plpgsql as $$ begin
  if tg_op='DELETE' then raise exception 'editor workspace proposals cannot be deleted'; end if;
  if new.reviewer_user_id is distinct from old.reviewer_user_id or new.device_token_id is distinct from old.device_token_id
    or new.proposal_kind is distinct from old.proposal_kind or new.source_surface is distinct from old.source_surface
    or new.canonical_card_id is distinct from old.canonical_card_id or new.base_canonical_card_version_id is distinct from old.base_canonical_card_version_id
    or new.base_content_hash is distinct from old.base_content_hash or new.note_guid is distinct from old.note_guid
    or new.card_ordinal is distinct from old.card_ordinal or new.local_content_hash is distinct from old.local_content_hash
    or new.edited_fields is distinct from old.edited_fields or new.central_tag_changes is distinct from old.central_tag_changes
    or new.proposed_deck_path is distinct from old.proposed_deck_path or new.mapping_changes is distinct from old.mapping_changes
    or new.kg_expansion_suggestion is distinct from old.kg_expansion_suggestion or new.reviewer_notes is distinct from old.reviewer_notes
    or new.proposal_evidence_hash is distinct from old.proposal_evidence_hash or new.idempotency_key is distinct from old.idempotency_key or new.client_version is distinct from old.client_version
    or new.created_at is distinct from old.created_at then raise exception 'proposal evidence is immutable; supersede instead'; end if;
  return new;
end $$;
create trigger guard_anki_editor_workspace_immutable before update or delete on public.anki_editor_workspace_proposals for each row execute function public.guard_anki_editor_workspace_immutable();

alter table public.anki_editor_workspace_proposals enable row level security;
alter table public.anki_editor_workspace_proposals force row level security;
revoke all on public.anki_editor_workspace_proposals from anon,authenticated,service_role;
grant select,insert,update on public.anki_editor_workspace_proposals to service_role;

comment on table public.anki_editor_workspace_proposals is 'Immutable, review-gated Anki editor proposals. Personal fields/tags and scheduling data are intentionally absent. Rows never directly mutate canonical cards, KG topology, mappings, or releases.';

create table public.anki_editor_workspace_review_actions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.anki_editor_workspace_proposals(id) on delete restrict,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  device_token_id uuid not null references public.brobot_anki_device_tokens(id) on delete restrict,
  decision text not null,
  proposal_evidence_hash text not null,
  reviewer_roles_snapshot text[] not null,
  reviewer_qualification_snapshot jsonb not null,
  reason_codes text[] not null default '{}',
  reviewer_notes text not null default '',
  idempotency_key uuid not null,
  client_version text not null,
  created_at timestamptz not null default now(),
  constraint anki_editor_review_decision check (decision in ('approve_for_incorporation','request_changes','reject','defer')),
  constraint anki_editor_review_hash check (proposal_evidence_hash ~ '^[a-f0-9]{64}$'),
  constraint anki_editor_review_roles check (reviewer_roles_snapshot <@ array['mapping_reviewer','clinical_editor','deck_editor','release_manager','administrator']::text[]),
  constraint anki_editor_review_qualification check (public.educational_metadata_is_safe(reviewer_qualification_snapshot)),
  constraint anki_editor_review_notes check (char_length(reviewer_notes)<=2000),
  constraint anki_editor_review_idempotent unique(reviewer_user_id,idempotency_key)
);
create index anki_editor_review_proposal_idx on public.anki_editor_workspace_review_actions(proposal_id,created_at);
create trigger guard_anki_editor_workspace_review_immutable before update or delete on public.anki_editor_workspace_review_actions for each row execute function public.guard_anki_reviewer_immutable();
alter table public.anki_editor_workspace_review_actions enable row level security;
alter table public.anki_editor_workspace_review_actions force row level security;
revoke all on public.anki_editor_workspace_review_actions from anon,authenticated,service_role;
grant select,insert on public.anki_editor_workspace_review_actions to service_role;

create function public.record_anki_editor_workspace_review(
  p_proposal_id uuid,p_reviewer_user_id uuid,p_device_token_id uuid,p_decision text,p_proposal_evidence_hash text,
  p_reviewer_roles_snapshot text[],p_reviewer_qualification_snapshot jsonb,p_reason_codes text[],p_reviewer_notes text,
  p_idempotency_key uuid,p_client_version text
) returns uuid language plpgsql security invoker set search_path=public as $$
declare p public.anki_editor_workspace_proposals; existing uuid; action_id uuid; next_status text;
begin
  select id into existing from public.anki_editor_workspace_review_actions where reviewer_user_id=p_reviewer_user_id and idempotency_key=p_idempotency_key;
  if existing is not null then return existing; end if;
  select * into p from public.anki_editor_workspace_proposals where id=p_proposal_id for update;
  if p.id is null then raise exception 'proposal_not_found'; end if;
  if p.status not in('submitted','under_review','changes_requested') then raise exception 'proposal_not_reviewable'; end if;
  if p.proposal_evidence_hash<>p_proposal_evidence_hash then raise exception 'proposal_evidence_changed'; end if;
  if p_decision='approve_for_incorporation' and p.reviewer_user_id=p_reviewer_user_id
    and (p.proposal_kind='create_missing_card' or p.kg_expansion_suggestion is not null) then raise exception 'second_reviewer_required'; end if;
  next_status:=case p_decision when 'approve_for_incorporation' then 'approved_for_incorporation' when 'request_changes' then 'changes_requested' when 'reject' then 'rejected' else 'under_review' end;
  insert into public.anki_editor_workspace_review_actions(proposal_id,reviewer_user_id,device_token_id,decision,proposal_evidence_hash,reviewer_roles_snapshot,reviewer_qualification_snapshot,reason_codes,reviewer_notes,idempotency_key,client_version)
  values(p_proposal_id,p_reviewer_user_id,p_device_token_id,p_decision,p_proposal_evidence_hash,p_reviewer_roles_snapshot,p_reviewer_qualification_snapshot,p_reason_codes,p_reviewer_notes,p_idempotency_key,p_client_version) returning id into action_id;
  update public.anki_editor_workspace_proposals set status=next_status,reviewed_at=case when p_decision<>'defer' then now() else reviewed_at end where id=p_proposal_id;
  return action_id;
end $$;
revoke all on function public.record_anki_editor_workspace_review(uuid,uuid,uuid,text,text,text[],jsonb,text[],text,uuid,text) from public,anon,authenticated;
grant execute on function public.record_anki_editor_workspace_review(uuid,uuid,uuid,text,text,text[],jsonb,text[],text,uuid,text) to service_role;
commit;
