begin;

create table if not exists public.kg_production_releases (
  release_id text primary key,
  publication_status text not null default 'hidden',
  review_tier text not null,
  status text not null default 'prepared',
  manifest_hash text not null unique,
  verification_hash text not null,
  pre_release_entity_count integer not null,
  pre_release_relationship_count integer not null,
  expected_post_release_entity_count integer not null,
  expected_post_release_relationship_count integer not null,
  activated_at timestamptz null,
  deactivated_at timestamptz null,
  rollback_state text not null default 'ready',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kg_production_releases_publication_status_check
    check (publication_status in ('hidden', 'beta_active', 'reviewed_active', 'deprecated')),
  constraint kg_production_releases_review_tier_check
    check (review_tier in ('automated_beta', 'curator_reviewed', 'attending_reviewed')),
  constraint kg_production_releases_status_check
    check (status in ('prepared', 'dry_run_passed', 'active', 'partially_active', 'rolled_back', 'failed')),
  constraint kg_production_releases_rollback_state_check
    check (rollback_state in ('ready', 'tested', 'executed', 'failed'))
);

create table if not exists public.kg_production_neighborhoods (
  release_id text not null references public.kg_production_releases(release_id) on delete restrict,
  neighborhood_slug text not null,
  source_batch_keys text[] not null default '{}'::text[],
  publication_status text not null,
  lifecycle_state text not null,
  review_tier text not null,
  coverage_status text not null,
  prior_lifecycle_state text not null,
  verification_hash text not null,
  activated_at timestamptz null,
  deactivated_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (release_id, neighborhood_slug),
  constraint kg_production_neighborhoods_slug_not_blank check (length(btrim(neighborhood_slug)) > 0),
  constraint kg_production_neighborhoods_publication_status_check
    check (publication_status in ('hidden', 'beta_active', 'reviewed_active', 'deprecated')),
  constraint kg_production_neighborhoods_lifecycle_check
    check (lifecycle_state in ('production_beta_active', 'production_active', 'revoked')),
  constraint kg_production_neighborhoods_review_tier_check
    check (review_tier in ('automated_beta', 'curator_reviewed', 'attending_reviewed')),
  constraint kg_production_neighborhoods_coverage_check
    check (coverage_status in ('full', 'partial'))
);

create unique index if not exists kg_production_neighborhoods_one_active_idx
  on public.kg_production_neighborhoods (neighborhood_slug)
  where lifecycle_state in ('production_beta_active', 'production_active');

create table if not exists public.kg_production_objects (
  release_id text not null references public.kg_production_releases(release_id) on delete restrict,
  target_table text not null,
  target_id uuid not null,
  publication_status text not null,
  review_tier text not null,
  provenance_status text not null,
  risk_tier text not null,
  verification_hash text not null,
  source_record_ids text[] not null,
  activated_at timestamptz null,
  deactivated_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (release_id, target_table, target_id),
  constraint kg_production_objects_target_table_check
    check (target_table in ('canonical_entities', 'canonical_relationships', 'curriculum_node_entities', 'educational_claims', 'decision_points')),
  constraint kg_production_objects_publication_status_check
    check (publication_status in ('hidden', 'beta_active', 'reviewed_active', 'deprecated')),
  constraint kg_production_objects_review_tier_check
    check (review_tier in ('automated_beta', 'curator_reviewed', 'attending_reviewed')),
  constraint kg_production_objects_provenance_status_check
    check (provenance_status in ('complete', 'partial', 'missing', 'disputed')),
  constraint kg_production_objects_risk_tier_check
    check (risk_tier in ('low', 'moderate', 'high')),
  constraint kg_production_objects_source_records_check check (cardinality(source_record_ids) > 0)
);

create table if not exists public.kg_production_neighborhood_objects (
  release_id text not null,
  neighborhood_slug text not null,
  target_table text not null,
  target_id uuid not null,
  source_proposal_id uuid not null references public.kg_automation_proposals(id) on delete restrict,
  source_batch_key text not null,
  verification_hash text not null,
  created_at timestamptz not null default now(),
  primary key (release_id, neighborhood_slug, target_table, target_id),
  foreign key (release_id, neighborhood_slug)
    references public.kg_production_neighborhoods(release_id, neighborhood_slug) on delete restrict,
  foreign key (release_id, target_table, target_id)
    references public.kg_production_objects(release_id, target_table, target_id) on delete restrict
);

create table if not exists public.kg_production_exclusions (
  id uuid primary key default gen_random_uuid(),
  release_id text not null references public.kg_production_releases(release_id) on delete restrict,
  neighborhood_slug text not null,
  target_table text null,
  target_id uuid null,
  source_proposal_id uuid null references public.kg_automation_proposals(id) on delete restrict,
  exclusion_reason text not null,
  risk_tier text not null,
  verification_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint kg_production_exclusions_risk_tier_check check (risk_tier in ('low', 'moderate', 'high'))
);

create unique index if not exists kg_production_exclusions_unique_idx
  on public.kg_production_exclusions (
    release_id,
    neighborhood_slug,
    coalesce(target_table, ''),
    coalesce(target_id, '00000000-0000-0000-0000-000000000000'::uuid),
    exclusion_reason
  );

create table if not exists public.kg_graph_feedback_events (
  id uuid primary key default gen_random_uuid(),
  product_surface text not null,
  release_id text null references public.kg_production_releases(release_id) on delete set null,
  response_or_retrieval_id text null,
  neighborhood_slugs text[] not null default '{}'::text[],
  entity_ids uuid[] not null default '{}'::uuid[],
  relationship_ids uuid[] not null default '{}'::uuid[],
  feedback_type text not null,
  severity text not null default 'low',
  user_query text null,
  explanation text null,
  user_role text null,
  supporting_source text null,
  product_context jsonb not null default '{}'::jsonb,
  normalized_signal_status text not null default 'pending',
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint kg_graph_feedback_product_surface_check
    check (product_surface in ('brobot', 'prepare', 'path_to_ortho', 'browser_extension', 'admin', 'other')),
  constraint kg_graph_feedback_type_check
    check (feedback_type in (
      'incorrect_entity', 'incorrect_relationship', 'missing_entity', 'missing_relationship',
      'duplicate_concept', 'weak_retrieval', 'unsupported_answer', 'provenance_concern',
      'outdated_content', 'confusing_terminology', 'inappropriate_curriculum_placement',
      'useful_traversal', 'successful_answer', 'user_correction', 'expert_correction'
    )),
  constraint kg_graph_feedback_severity_check check (severity in ('low', 'moderate', 'high', 'critical')),
  constraint kg_graph_feedback_signal_status_check
    check (normalized_signal_status in ('pending', 'normalized', 'proposal_created', 'dismissed'))
);

create table if not exists public.kg_graph_feedback_signals (
  id uuid primary key default gen_random_uuid(),
  signal_fingerprint text not null unique,
  release_id text null references public.kg_production_releases(release_id) on delete set null,
  feedback_type text not null,
  risk_tier text not null,
  feedback_event_ids uuid[] not null,
  neighborhood_slugs text[] not null default '{}'::text[],
  entity_ids uuid[] not null default '{}'::uuid[],
  relationship_ids uuid[] not null default '{}'::uuid[],
  occurrence_count integer not null,
  status text not null default 'normalized',
  proposed_change_type text null,
  proposed_payload jsonb not null default '{}'::jsonb,
  validation_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kg_graph_feedback_signals_events_check check (cardinality(feedback_event_ids) > 0),
  constraint kg_graph_feedback_signals_occurrence_check check (occurrence_count > 0),
  constraint kg_graph_feedback_signals_risk_check check (risk_tier in ('low', 'moderate', 'high')),
  constraint kg_graph_feedback_signals_status_check
    check (status in ('normalized', 'proposal_ready', 'proposal_exported', 'dismissed')),
  constraint kg_graph_feedback_signals_change_type_check
    check (
      proposed_change_type is null
      or proposed_change_type in (
        'create_entity', 'create_relationship', 'update_metadata', 'add_alias',
        'add_provenance', 'expand_neighborhood', 'acquire_source', 'review_existing_object'
      )
    )
);

create index if not exists kg_production_objects_active_idx
  on public.kg_production_objects (target_table, publication_status, review_tier, provenance_status, risk_tier);
create index if not exists kg_production_neighborhood_objects_lookup_idx
  on public.kg_production_neighborhood_objects (neighborhood_slug, target_table, target_id);
create index if not exists kg_graph_feedback_release_idx
  on public.kg_graph_feedback_events (release_id, feedback_type, severity, created_at desc);
create index if not exists kg_graph_feedback_entities_idx
  on public.kg_graph_feedback_events using gin (entity_ids);
create index if not exists kg_graph_feedback_relationships_idx
  on public.kg_graph_feedback_events using gin (relationship_ids);
create index if not exists kg_graph_feedback_signals_priority_idx
  on public.kg_graph_feedback_signals (status, risk_tier, occurrence_count desc, created_at);

drop trigger if exists set_kg_production_releases_updated_at on public.kg_production_releases;
create trigger set_kg_production_releases_updated_at before update on public.kg_production_releases
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_kg_production_neighborhoods_updated_at on public.kg_production_neighborhoods;
create trigger set_kg_production_neighborhoods_updated_at before update on public.kg_production_neighborhoods
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_kg_production_objects_updated_at on public.kg_production_objects;
create trigger set_kg_production_objects_updated_at before update on public.kg_production_objects
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_kg_graph_feedback_signals_updated_at on public.kg_graph_feedback_signals;
create trigger set_kg_graph_feedback_signals_updated_at before update on public.kg_graph_feedback_signals
  for each row execute function public.tg_set_updated_at();

alter table public.kg_production_releases enable row level security;
alter table public.kg_production_neighborhoods enable row level security;
alter table public.kg_production_objects enable row level security;
alter table public.kg_production_neighborhood_objects enable row level security;
alter table public.kg_production_exclusions enable row level security;
alter table public.kg_graph_feedback_events enable row level security;
alter table public.kg_graph_feedback_signals enable row level security;

drop policy if exists kg_production_releases_authenticated_read on public.kg_production_releases;
create policy kg_production_releases_authenticated_read on public.kg_production_releases
  for select to authenticated using (publication_status in ('beta_active', 'reviewed_active') and status in ('active', 'partially_active'));
drop policy if exists kg_production_neighborhoods_authenticated_read on public.kg_production_neighborhoods;
create policy kg_production_neighborhoods_authenticated_read on public.kg_production_neighborhoods
  for select to authenticated using (publication_status in ('beta_active', 'reviewed_active') and lifecycle_state in ('production_beta_active', 'production_active'));
drop policy if exists kg_production_objects_authenticated_read on public.kg_production_objects;
create policy kg_production_objects_authenticated_read on public.kg_production_objects
  for select to authenticated using (publication_status in ('beta_active', 'reviewed_active'));
drop policy if exists kg_production_neighborhood_objects_authenticated_read on public.kg_production_neighborhood_objects;
create policy kg_production_neighborhood_objects_authenticated_read on public.kg_production_neighborhood_objects
  for select to authenticated using (
    exists (
      select 1 from public.kg_production_neighborhoods n
      where n.release_id = kg_production_neighborhood_objects.release_id
        and n.neighborhood_slug = kg_production_neighborhood_objects.neighborhood_slug
        and n.publication_status in ('beta_active', 'reviewed_active')
    )
  );
drop policy if exists kg_graph_feedback_authenticated_insert on public.kg_graph_feedback_events;
create policy kg_graph_feedback_authenticated_insert on public.kg_graph_feedback_events
  for insert to authenticated with check (created_by = auth.uid());
drop policy if exists kg_graph_feedback_own_read on public.kg_graph_feedback_events;
create policy kg_graph_feedback_own_read on public.kg_graph_feedback_events
  for select to authenticated using (created_by = auth.uid());

create or replace function public.get_kg_production_neighborhood(p_neighborhood_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'releaseId', n.release_id,
    'neighborhoodSlug', n.neighborhood_slug,
    'publicationStatus', n.publication_status,
    'lifecycleState', n.lifecycle_state,
    'reviewTier', n.review_tier,
    'coverageStatus', n.coverage_status,
    'verificationHash', n.verification_hash,
    'activatedAt', n.activated_at,
    'entities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'slug', e.slug, 'entityType', e.entity_type,
        'preferredLabel', e.preferred_label, 'description', e.description,
        'publicationStatus', o.publication_status, 'reviewTier', o.review_tier,
        'provenanceStatus', o.provenance_status, 'riskTier', o.risk_tier,
        'verificationHash', o.verification_hash, 'sourceRecordIds', o.source_record_ids
      ) order by e.slug, e.id)
      from public.kg_production_neighborhood_objects no
      join public.kg_production_objects o using (release_id, target_table, target_id)
      join public.canonical_entities e on o.target_table = 'canonical_entities' and e.id = o.target_id
      where no.release_id = n.release_id and no.neighborhood_slug = n.neighborhood_slug
        and o.publication_status in ('beta_active', 'reviewed_active') and e.is_active
    ), '[]'::jsonb),
    'relationships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'subjectEntityId', r.subject_entity_id, 'predicate', r.predicate,
        'objectEntityId', r.object_entity_id, 'publicationStatus', o.publication_status,
        'reviewTier', o.review_tier, 'provenanceStatus', o.provenance_status,
        'riskTier', o.risk_tier, 'verificationHash', o.verification_hash,
        'sourceRecordIds', o.source_record_ids
      ) order by r.subject_entity_id, r.predicate, r.object_entity_id)
      from public.kg_production_neighborhood_objects no
      join public.kg_production_objects o using (release_id, target_table, target_id)
      join public.canonical_relationships r on o.target_table = 'canonical_relationships' and r.id = o.target_id
      where no.release_id = n.release_id and no.neighborhood_slug = n.neighborhood_slug
        and o.publication_status in ('beta_active', 'reviewed_active')
        and r.is_active and r.lifecycle_status = 'active'
    ), '[]'::jsonb),
    'curriculumBridges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'curriculumNodeId', b.curriculum_node_id,
        'canonicalEntityId', b.canonical_entity_id, 'relationType', b.relation_type,
        'publicationStatus', o.publication_status, 'reviewTier', o.review_tier,
        'provenanceStatus', o.provenance_status, 'riskTier', o.risk_tier,
        'verificationHash', o.verification_hash, 'sourceRecordIds', o.source_record_ids
      ) order by b.curriculum_node_id, b.canonical_entity_id)
      from public.kg_production_neighborhood_objects no
      join public.kg_production_objects o using (release_id, target_table, target_id)
      join public.curriculum_node_entities b on o.target_table = 'curriculum_node_entities' and b.id = o.target_id
      where no.release_id = n.release_id and no.neighborhood_slug = n.neighborhood_slug
        and o.publication_status in ('beta_active', 'reviewed_active') and b.is_active
    ), '[]'::jsonb),
    'claims', '[]'::jsonb,
    'decisionPoints', '[]'::jsonb,
    'excludedObjectCount', (
      select count(*) from public.kg_production_exclusions x
      where x.release_id = n.release_id and x.neighborhood_slug = n.neighborhood_slug
    )
  )
  from public.kg_production_neighborhoods n
  join public.kg_production_releases r on r.release_id = n.release_id
  where n.neighborhood_slug = p_neighborhood_slug
    and n.publication_status in ('beta_active', 'reviewed_active')
    and n.lifecycle_state in ('production_beta_active', 'production_active')
    and r.publication_status in ('beta_active', 'reviewed_active')
    and r.status in ('active', 'partially_active')
  order by n.activated_at desc
  limit 1;
$$;

create or replace function public.find_kg_production_topics(p_query text, p_limit integer default 10)
returns table (
  release_id text,
  neighborhood_slug text,
  coverage_status text,
  review_tier text,
  matched_entity_id uuid,
  matched_slug text,
  matched_label text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select n.release_id, n.neighborhood_slug, n.coverage_status, n.review_tier,
    e.id, e.slug, e.preferred_label
  from public.kg_production_neighborhoods n
  join public.kg_production_releases r on r.release_id = n.release_id
  join public.kg_production_neighborhood_objects no
    on no.release_id = n.release_id and no.neighborhood_slug = n.neighborhood_slug
  join public.kg_production_objects o
    on o.release_id = no.release_id
    and o.target_table = no.target_table
    and o.target_id = no.target_id
  join public.canonical_entities e on o.target_table = 'canonical_entities' and e.id = o.target_id
  where n.publication_status in ('beta_active', 'reviewed_active')
    and n.lifecycle_state in ('production_beta_active', 'production_active')
    and r.publication_status in ('beta_active', 'reviewed_active')
    and r.status in ('active', 'partially_active')
    and o.publication_status in ('beta_active', 'reviewed_active')
    and (
      lower(coalesce(e.slug, '')) = lower(btrim(p_query))
      or lower(e.preferred_label) like '%' || lower(btrim(p_query)) || '%'
    )
  order by (lower(coalesce(e.slug, '')) = lower(btrim(p_query))) desc, e.preferred_label
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

revoke all on function public.get_kg_production_neighborhood(text) from public;
revoke all on function public.find_kg_production_topics(text, integer) from public;
grant execute on function public.get_kg_production_neighborhood(text) to authenticated, service_role;
grant execute on function public.find_kg_production_topics(text, integer) to authenticated, service_role;
grant select on public.kg_production_releases, public.kg_production_neighborhoods,
  public.kg_production_objects, public.kg_production_neighborhood_objects to authenticated, service_role;
grant insert on public.kg_graph_feedback_events to authenticated;
grant select, insert, update on public.kg_production_releases, public.kg_production_neighborhoods,
  public.kg_production_objects, public.kg_production_neighborhood_objects,
  public.kg_production_exclusions, public.kg_graph_feedback_events,
  public.kg_graph_feedback_signals to service_role;

comment on table public.kg_production_objects is
  'Deduplicated product-visible release overlay referencing immutable canonical records once per release.';
comment on table public.kg_graph_feedback_events is
  'Privacy-minimized product feedback linked to the exact graph release and objects used; feedback never writes canonical knowledge directly.';
comment on table public.kg_graph_feedback_signals is
  'Auditable normalized feedback clusters and proposed change payloads. Clinically meaningful changes still require validation, staging, database verification, and release-overlay promotion.';

commit;
