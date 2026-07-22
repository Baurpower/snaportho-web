-- Immutable SnapOrtho deck releases and version-pinned card/entity review state.
-- DDL only. Does not create releases, candidates, reviews, or published mappings.

begin;

create function public.educational_sha256_array_is_valid(value text[])
returns boolean language sql immutable parallel safe as $$
  select cardinality(value) > 0 and coalesce(bool_and(item ~ '^[0-9a-f]{64}$'), false)
  from unnest(value) item;
$$;

create table public.anki_deck_releases (
  id uuid primary key default gen_random_uuid(),
  release_key text not null unique,
  release_version text not null,
  import_batch_id uuid not null references public.anki_import_batches(id) on delete restrict,
  predecessor_release_id uuid null references public.anki_deck_releases(id) on delete restrict,
  status text not null default 'draft',
  manifest_schema_version text not null default 'snaportho-deck-manifest.v1',
  manifest_checksum text not null,
  minimum_addon_version text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  published_at timestamptz null,
  superseded_at timestamptz null,
  retired_at timestamptz null,
  constraint anki_deck_releases_key_check check (release_key ~ '^[a-z0-9][a-z0-9._-]{2,127}$'),
  constraint anki_deck_releases_version_check check (release_version ~ '^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$'),
  constraint anki_deck_releases_status_check check (status in ('draft','review','published','superseded','retired')),
  constraint anki_deck_releases_schema_check check (manifest_schema_version = 'snaportho-deck-manifest.v1'),
  constraint anki_deck_releases_checksum_check check (manifest_checksum ~ '^[0-9a-f]{64}$'),
  constraint anki_deck_releases_predecessor_check check (predecessor_release_id is null or predecessor_release_id <> id),
  constraint anki_deck_releases_metadata_check check (public.educational_metadata_is_safe(metadata)),
  constraint anki_deck_releases_lifecycle_check check (
    (status = 'draft' and reviewed_at is null and published_at is null and superseded_at is null and retired_at is null)
    or (status = 'review' and reviewed_at is not null and published_at is null and superseded_at is null and retired_at is null)
    or (status = 'published' and reviewed_at is not null and published_at is not null and superseded_at is null and retired_at is null)
    or (status = 'superseded' and reviewed_at is not null and published_at is not null and superseded_at is not null and retired_at is null)
    or (status = 'retired' and reviewed_at is not null and published_at is not null and retired_at is not null)
  )
);

create table public.anki_deck_release_cards (
  id uuid primary key default gen_random_uuid(),
  deck_release_id uuid not null references public.anki_deck_releases(id) on delete restrict,
  canonical_card_id uuid not null references public.canonical_cards(id) on delete restrict,
  canonical_card_version_id uuid not null references public.canonical_card_versions(id) on delete restrict,
  note_guid text not null,
  card_ordinal integer not null,
  native_card_id_hint text null,
  content_hash text not null,
  deck_path text not null,
  ordering_key text not null,
  inclusion_status text not null default 'included',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint anki_deck_release_cards_card_key unique (deck_release_id, canonical_card_id),
  constraint anki_deck_release_cards_identity_key unique (deck_release_id, note_guid, card_ordinal),
  constraint anki_deck_release_cards_order_key unique (deck_release_id, ordering_key),
  constraint anki_deck_release_cards_guid_check check (char_length(note_guid) between 1 and 200 and note_guid !~ '[[:cntrl:][:space:]]'),
  constraint anki_deck_release_cards_ordinal_check check (card_ordinal >= 0),
  constraint anki_deck_release_cards_hash_check check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint anki_deck_release_cards_path_check check (char_length(deck_path) between 1 and 1000),
  constraint anki_deck_release_cards_order_check check (ordering_key ~ '^[A-Za-z0-9._:/-]{1,500}$'),
  constraint anki_deck_release_cards_inclusion_check check (inclusion_status in ('included','excluded','withdrawn')),
  constraint anki_deck_release_cards_metadata_check check (public.educational_metadata_is_safe(metadata))
);

create table public.anki_card_entity_mapping_runs_v2 (
  id uuid primary key default gen_random_uuid(),
  deck_release_id uuid not null references public.anki_deck_releases(id) on delete restrict,
  run_key text not null unique,
  rules_version text not null,
  model_version text null,
  run_mode text not null default 'dry_run',
  status text not null default 'pending',
  cohort_definition_hash text not null,
  input_manifest_checksum text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  constraint anki_card_entity_runs_mode_check check (run_mode in ('dry_run','review_packet')),
  constraint anki_card_entity_runs_status_check check (status in ('pending','completed','failed')),
  constraint anki_card_entity_runs_hash_check check (cohort_definition_hash ~ '^[0-9a-f]{64}$' and input_manifest_checksum ~ '^[0-9a-f]{64}$'),
  constraint anki_card_entity_runs_metadata_check check (public.educational_metadata_is_safe(metadata))
);

create table public.anki_card_entity_version_mappings (
  id uuid primary key default gen_random_uuid(),
  mapping_run_id uuid not null references public.anki_card_entity_mapping_runs_v2(id) on delete restrict,
  canonical_card_id uuid not null references public.canonical_cards(id) on delete restrict,
  canonical_card_version_id uuid not null references public.canonical_card_versions(id) on delete restrict,
  canonical_entity_id uuid not null references public.canonical_entities(id) on delete restrict,
  card_canonical_entity_link_id uuid null references public.card_canonical_entity_links(id) on delete restrict,
  proposed_mapping_role text not null,
  candidate_method text not null,
  signal_types text[] not null default '{}',
  evidence_hashes text[] not null default '{}',
  safe_evidence jsonb not null default '{}'::jsonb,
  confidence numeric(4,3) not null,
  rules_version text not null,
  model_version text null,
  ambiguity_flags text[] not null default '{}',
  competing_candidate_ids uuid[] not null default '{}',
  curriculum_evidence_contributed boolean not null default false,
  unresolved_ambiguity boolean not null default false,
  reviewer_decision text null,
  reviewer_user_id uuid null references auth.users(id) on delete restrict,
  reviewer_confidence numeric(4,3) null,
  reviewer_mapping_role text null,
  review_provenance_method text null,
  reviewer_notes text null,
  reviewed_at timestamptz null,
  lifecycle_status text not null default 'candidate',
  production_eligible boolean not null default false,
  supersedes_mapping_id uuid null references public.anki_card_entity_version_mappings(id) on delete restrict,
  replaced_by_mapping_id uuid null references public.anki_card_entity_version_mappings(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anki_card_entity_version_mapping_key unique (mapping_run_id, canonical_card_version_id, canonical_entity_id, proposed_mapping_role),
  constraint anki_card_entity_version_mapping_role_check check (proposed_mapping_role in ('teaches','tests','explains','demonstrates','context_only','broadly_related')),
  constraint anki_card_entity_version_mapping_reviewer_role_check check (reviewer_mapping_role is null or reviewer_mapping_role in ('teaches','tests','explains','demonstrates','context_only','broadly_related')),
  constraint anki_card_entity_version_mapping_method_check check (candidate_method in ('exact_preferred_label','governed_alias','source_alias','tag_and_deck','multi_signal','manual_candidate','optional_offline_llm')),
  constraint anki_card_entity_version_mapping_confidence_check check (confidence between 0 and 1 and (reviewer_confidence is null or reviewer_confidence between 0 and 1)),
  constraint anki_card_entity_version_mapping_decision_check check (reviewer_decision is null or reviewer_decision in ('approved','rejected','needs_changes')),
  constraint anki_card_entity_version_mapping_lifecycle_check check (lifecycle_status in ('candidate','needs_review','approved','rejected','superseded','stale')),
  constraint anki_card_entity_version_mapping_review_completeness_check check (
    (reviewer_decision is null and reviewer_user_id is null and reviewer_confidence is null and reviewer_mapping_role is null and review_provenance_method is null and reviewed_at is null)
    or (reviewer_decision is not null and reviewer_user_id is not null and reviewer_confidence is not null and reviewer_mapping_role is not null and review_provenance_method = 'direct_human_review' and reviewed_at is not null)
  ),
  constraint anki_card_entity_version_mapping_lineage_check check (
    (supersedes_mapping_id is null or supersedes_mapping_id <> id)
    and (replaced_by_mapping_id is null or replaced_by_mapping_id <> id)
  ),
  constraint anki_card_entity_version_mapping_evidence_check check (
    cardinality(signal_types) > 0 and public.educational_sha256_array_is_valid(evidence_hashes)
  ),
  constraint anki_card_entity_version_mapping_notes_check check (reviewer_notes is null or char_length(reviewer_notes) <= 1000),
  constraint anki_card_entity_version_mapping_safe_evidence_check check (public.educational_metadata_is_safe(safe_evidence)),
  constraint anki_card_entity_version_mapping_metadata_check check (public.educational_metadata_is_safe(metadata))
);

create index anki_deck_releases_status_idx on public.anki_deck_releases(status, published_at desc);
create index anki_deck_releases_predecessor_idx on public.anki_deck_releases(predecessor_release_id);
create unique index anki_deck_releases_single_successor_idx on public.anki_deck_releases(predecessor_release_id) where predecessor_release_id is not null;
create index anki_deck_release_cards_manifest_idx on public.anki_deck_release_cards(deck_release_id, ordering_key);
create index anki_deck_release_cards_card_idx on public.anki_deck_release_cards(canonical_card_id, deck_release_id);
create index anki_deck_release_cards_identity_idx on public.anki_deck_release_cards(note_guid, card_ordinal, deck_release_id);
create index anki_card_entity_version_mapping_card_idx on public.anki_card_entity_version_mappings(canonical_card_id, canonical_card_version_id, lifecycle_status);
create index anki_card_entity_version_mapping_entity_idx on public.anki_card_entity_version_mappings(canonical_entity_id, production_eligible);
create index anki_card_entity_version_mapping_review_idx on public.anki_card_entity_version_mappings(lifecycle_status, unresolved_ambiguity, confidence desc);

create function public.validate_anki_deck_release_card()
returns trigger language plpgsql security definer set search_path = public as $$
declare actual record; release_status text;
begin
  select r.status into release_status from public.anki_deck_releases r where r.id = new.deck_release_id;
  if release_status in ('published','superseded','retired') then raise exception 'published deck manifests are immutable'; end if;
  select c.current_version_id, c.is_active as card_active, v.canonical_card_id as version_card_id,
    v.content_hash, v.is_active as version_active, n.anki_note_guid, ac.card_ord,
    ac.anki_card_id::text as native_card_id, d.full_name as deck_path,
    n.is_active as note_active, ac.is_active as source_card_active
  into actual
  from public.canonical_cards c
  join public.canonical_card_versions v on v.id = new.canonical_card_version_id
  join public.anki_notes n on n.id = c.anki_note_id
  join public.anki_cards ac on ac.id = c.anki_card_id
  join public.anki_decks d on d.id = ac.deck_id
  where c.id = new.canonical_card_id;
  if not found or not actual.card_active or not actual.version_active or not actual.note_active or not actual.source_card_active
    or actual.current_version_id is distinct from new.canonical_card_version_id
    or actual.version_card_id is distinct from new.canonical_card_id
    or actual.anki_note_guid is distinct from new.note_guid or actual.card_ord is distinct from new.card_ordinal
    or actual.content_hash is distinct from new.content_hash or actual.deck_path is distinct from new.deck_path then
    raise exception 'release member must pin the active current card/version and exact source identity';
  end if;
  if new.native_card_id_hint is not null and actual.native_card_id is distinct from new.native_card_id_hint then
    raise exception 'native card ID hint does not match imported card';
  end if;
  return new;
end $$;

create function public.guard_anki_deck_release_lifecycle()
returns trigger language plpgsql security definer set search_path = public as $$
declare predecessor_status text; computed_checksum text; member_count integer;
begin
  if tg_op <> 'DELETE' and new.predecessor_release_id is not null then
    select status into predecessor_status from public.anki_deck_releases where id=new.predecessor_release_id;
    if predecessor_status not in ('published','superseded','retired') then raise exception 'successor requires an already published predecessor'; end if;
  end if;
  if tg_op = 'DELETE' and old.status in ('published','superseded','retired') then raise exception 'published release history cannot be deleted'; end if;
  if tg_op = 'UPDATE' then
    if old.status in ('published','superseded','retired') and (
      new.release_key is distinct from old.release_key or new.release_version is distinct from old.release_version
      or new.import_batch_id is distinct from old.import_batch_id or new.predecessor_release_id is distinct from old.predecessor_release_id
      or new.manifest_schema_version is distinct from old.manifest_schema_version or new.manifest_checksum is distinct from old.manifest_checksum
      or new.minimum_addon_version is distinct from old.minimum_addon_version or new.metadata is distinct from old.metadata
    ) then raise exception 'published release manifest fields are immutable'; end if;
    if old.status in ('published','superseded','retired') and new.status in ('draft','review') then raise exception 'published release cannot return to draft/review'; end if;
    if old.status = 'superseded' and new.status <> 'superseded' then raise exception 'superseded release is terminal'; end if;
    if old.status = 'retired' and new.status <> 'retired' then raise exception 'retired release is terminal'; end if;
  end if;
  if tg_op <> 'DELETE' and new.status='published' and (tg_op='INSERT' or old.status<>'published') then
    select count(*) into member_count from public.anki_deck_release_cards where deck_release_id=new.id;
    if member_count=0 then raise exception 'published release requires non-empty immutable membership'; end if;
    select encode(digest(coalesce(string_agg(concat_ws('|',canonical_card_id::text,canonical_card_version_id::text,note_guid,card_ordinal::text,
      coalesce(native_card_id_hint,''),content_hash,deck_path,ordering_key,inclusion_status),E'\n' order by ordering_key),''),'sha256'),'hex')
    into computed_checksum from public.anki_deck_release_cards where deck_release_id=new.id;
    if computed_checksum is distinct from new.manifest_checksum then raise exception 'published manifest checksum does not match immutable membership'; end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create function public.mark_anki_version_mappings_stale()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.current_version_id is distinct from old.current_version_id then
    update public.anki_card_entity_version_mappings
      set lifecycle_status='stale', production_eligible=false, updated_at=now()
    where canonical_card_id=new.id and canonical_card_version_id<>new.current_version_id
      and lifecycle_status not in ('rejected','superseded','stale');
  end if;
  return new;
end $$;

create function public.guard_anki_deck_release_card_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_release uuid; release_status text;
begin
  target_release := case when tg_op = 'DELETE' then old.deck_release_id else new.deck_release_id end;
  select status into release_status from public.anki_deck_releases where id = target_release;
  if release_status in ('published','superseded','retired') then raise exception 'published release membership is immutable'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create function public.validate_anki_version_mapping()
returns trigger language plpgsql security definer set search_path = public as $$
declare actual record; eligible_release_count integer;
begin
  select c.current_version_id, c.is_active as card_active, v.canonical_card_id as version_card_id,
    v.is_active as version_active, e.is_active as entity_active, e.status as entity_status,
    e.review_status as entity_review_status, l.canonical_card_id as link_card_id,
    l.canonical_entity_id as link_entity_id, l.retarget_path
  into actual from public.canonical_cards c
  join public.canonical_card_versions v on v.id = new.canonical_card_version_id
  join public.canonical_entities e on e.id = new.canonical_entity_id
  left join public.card_canonical_entity_links l on l.id = new.card_canonical_entity_link_id
  where c.id = new.canonical_card_id;
  if not found or actual.version_card_id is distinct from new.canonical_card_id then raise exception 'mapping card/version mismatch'; end if;
  if new.card_canonical_entity_link_id is not null and (
    actual.link_card_id is distinct from new.canonical_card_id or actual.link_entity_id is distinct from new.canonical_entity_id
  ) then raise exception 'historical direct-link row does not match mapping'; end if;
  if new.lifecycle_status = 'approved' and new.reviewer_decision <> 'approved' then raise exception 'approved lifecycle requires reviewed approval'; end if;
  if new.production_eligible then
    select count(*) into eligible_release_count from public.anki_deck_release_cards rc
    join public.anki_deck_releases r on r.id = rc.deck_release_id
    where rc.canonical_card_id = new.canonical_card_id and rc.canonical_card_version_id = new.canonical_card_version_id
      and rc.inclusion_status = 'included' and r.status = 'published';
    if not actual.card_active or actual.current_version_id is distinct from new.canonical_card_version_id
      or not actual.version_active or not actual.entity_active or actual.entity_status <> 'canonical'
      or actual.entity_review_status <> 'approved' or new.reviewer_decision <> 'approved'
      or new.reviewer_user_id is null or new.reviewed_at is null or new.reviewer_confidence < 0.950
      or new.review_provenance_method <> 'direct_human_review'
      or new.reviewer_mapping_role not in ('teaches','tests','explains','demonstrates')
      or new.unresolved_ambiguity or new.lifecycle_status <> 'approved'
      or eligible_release_count = 0
      or new.candidate_method in ('tag_and_deck')
      or (new.curriculum_evidence_contributed and cardinality(new.signal_types) = 1)
      or (new.card_canonical_entity_link_id is not null and actual.retarget_path = 'curriculum_node_bridge'
          and new.candidate_method not in ('exact_preferred_label','governed_alias','source_alias','multi_signal','manual_candidate')) then
      raise exception 'mapping does not satisfy direct-review production eligibility';
    end if;
  end if;
  return new;
end $$;

create function public.guard_reviewed_anki_version_mapping()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.reviewer_decision is not null and (
    new.mapping_run_id is distinct from old.mapping_run_id or new.canonical_card_id is distinct from old.canonical_card_id
    or new.canonical_card_version_id is distinct from old.canonical_card_version_id or new.canonical_entity_id is distinct from old.canonical_entity_id
    or new.proposed_mapping_role is distinct from old.proposed_mapping_role or new.candidate_method is distinct from old.candidate_method
    or new.signal_types is distinct from old.signal_types or new.evidence_hashes is distinct from old.evidence_hashes
    or new.confidence is distinct from old.confidence or new.rules_version is distinct from old.rules_version
    or new.reviewer_decision is distinct from old.reviewer_decision or new.reviewer_user_id is distinct from old.reviewer_user_id
    or new.reviewer_confidence is distinct from old.reviewer_confidence or new.reviewer_mapping_role is distinct from old.reviewer_mapping_role
    or new.review_provenance_method is distinct from old.review_provenance_method or new.reviewed_at is distinct from old.reviewed_at
  ) then raise exception 'reviewed version mapping evidence and decision are immutable; create a successor mapping'; end if;
  return new;
end $$;

create trigger validate_anki_deck_release_card before insert or update on public.anki_deck_release_cards
  for each row execute function public.validate_anki_deck_release_card();
create trigger guard_anki_deck_release_lifecycle before update or delete on public.anki_deck_releases
  for each row execute function public.guard_anki_deck_release_lifecycle();
create trigger guard_anki_deck_release_card_mutation before insert or update or delete on public.anki_deck_release_cards
  for each row execute function public.guard_anki_deck_release_card_mutation();
create trigger validate_anki_version_mapping before insert or update on public.anki_card_entity_version_mappings
  for each row execute function public.validate_anki_version_mapping();
create trigger guard_reviewed_anki_version_mapping before update on public.anki_card_entity_version_mappings
  for each row execute function public.guard_reviewed_anki_version_mapping();
create trigger set_anki_card_entity_version_mappings_updated_at before update on public.anki_card_entity_version_mappings
  for each row execute function public.tg_set_updated_at();
create trigger mark_anki_version_mappings_stale after update of current_version_id on public.canonical_cards
  for each row execute function public.mark_anki_version_mappings_stale();

create view public.v_anki_card_entity_version_mapping_status with (security_invoker = true) as
select c.id canonical_card_id, c.current_version_id, m.id mapping_id, m.canonical_card_version_id,
  m.canonical_entity_id, e.entity_type, e.status entity_status, e.replacement_entity_id,
  m.lifecycle_status, m.reviewer_decision, m.production_eligible,
  case
    when m.id is null then 'no_reviewed_current_version_mapping'
    when m.canonical_card_version_id <> c.current_version_id then 'stale_prior_version_mapping'
    when not e.is_active or e.status in ('deprecated','replaced','merged','split') then 'entity_inactive_or_superseded'
    when m.reviewer_decision = 'approved' then 'reviewed_current_version_mapping'
    else 'current_version_not_approved'
  end mapping_state
from public.canonical_cards c
left join public.anki_card_entity_version_mappings m on m.canonical_card_id = c.id
left join public.canonical_entities e on e.id = m.canonical_entity_id;

create view public.v_anki_deck_release_cards_missing_eligible_links with (security_invoker = true) as
select rc.deck_release_id, rc.canonical_card_id, rc.canonical_card_version_id
from public.anki_deck_release_cards rc join public.canonical_cards c on c.id=rc.canonical_card_id
where rc.inclusion_status = 'included' and not exists (
  select 1 from public.anki_card_entity_version_mappings m
  where m.canonical_card_id = rc.canonical_card_id and m.canonical_card_version_id = rc.canonical_card_version_id
    and m.production_eligible and m.lifecycle_status = 'approved' and c.current_version_id=rc.canonical_card_version_id
);

do $$ declare table_name text; begin
  foreach table_name in array array['anki_deck_releases','anki_deck_release_cards','anki_card_entity_mapping_runs_v2','anki_card_entity_version_mappings'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated, service_role', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', table_name || '_service_role_all', table_name);
  end loop;
end $$;
revoke all on public.v_anki_card_entity_version_mapping_status, public.v_anki_deck_release_cards_missing_eligible_links from anon, authenticated;
grant select on public.v_anki_card_entity_version_mapping_status, public.v_anki_deck_release_cards_missing_eligible_links to service_role;

comment on table public.anki_deck_releases is 'Immutable release headers for centrally curated SnapOrtho Anki deck manifests.';
comment on table public.anki_deck_release_cards is 'Version-pinned immutable membership for a SnapOrtho deck release.';
comment on table public.anki_card_entity_version_mappings is 'Generated, reviewed, and separately production-eligible version-specific card/entity mappings.';
comment on view public.v_anki_card_entity_version_mapping_status is 'Current, stale, missing, and inactive-entity mapping compatibility status.';

commit;
