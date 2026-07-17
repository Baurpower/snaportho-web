begin;

create table if not exists public.brobot_kg_retrieval_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  retrieval_id uuid not null unique,
  conversation_id uuid null,
  message_id uuid null,
  user_id uuid null references auth.users(id) on delete set null,
  query_hash text not null,
  normalized_concept text null,
  sanitized_query text null,
  mode text not null,
  subintent text null,
  training_level text null,
  response_depth text null,
  is_follow_up boolean not null default false,
  release_id text null references public.kg_production_releases(release_id) on delete set null,
  retrieval_status text not null,
  trigger_reasons text[] not null default '{}',
  bypass_reason text null,
  fallback_used boolean not null default false,
  candidate_count integer not null default 0,
  selected_neighborhood_slugs text[] not null default '{}',
  selected_entity_ids uuid[] not null default '{}',
  selected_relationship_ids uuid[] not null default '{}',
  candidate_scores jsonb not null default '[]',
  predicate_families text[] not null default '{}',
  cache_status text null,
  stage_timings_ms jsonb not null default '{}',
  retrieval_latency_ms integer null,
  packet_token_estimate integer not null default 0,
  policy_version text not null,
  packet_schema_version text not null,
  gap_signals jsonb not null default '[]',
  quality_gate_warnings text[] not null default '{}',
  evaluator_result jsonb null,
  regeneration_status boolean null,
  feedback_result smallint null,
  correction_signal boolean null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brobot_kg_retrieval_status_check
    check (retrieval_status in ('hit', 'partial', 'miss', 'bypass', 'error', 'timeout')),
  constraint brobot_kg_packet_token_check check (packet_token_estimate between 0 and 1200),
  constraint brobot_kg_candidate_count_check check (candidate_count >= 0)
);

create index if not exists brobot_kg_retrieval_created_idx
  on public.brobot_kg_retrieval_events (created_at desc);
create index if not exists brobot_kg_retrieval_release_status_idx
  on public.brobot_kg_retrieval_events (release_id, retrieval_status, created_at desc);
create index if not exists brobot_kg_retrieval_mode_idx
  on public.brobot_kg_retrieval_events (mode, subintent, created_at desc);
create index if not exists brobot_kg_retrieval_entities_idx
  on public.brobot_kg_retrieval_events using gin (selected_entity_ids);
create index if not exists brobot_kg_retrieval_neighborhoods_idx
  on public.brobot_kg_retrieval_events using gin (selected_neighborhood_slugs);

drop trigger if exists set_brobot_kg_retrieval_events_updated_at
  on public.brobot_kg_retrieval_events;
create trigger set_brobot_kg_retrieval_events_updated_at
  before update on public.brobot_kg_retrieval_events
  for each row execute function public.tg_set_updated_at();

create table if not exists public.brobot_kg_growth_queue (
  id uuid primary key default gen_random_uuid(),
  release_id text not null references public.kg_production_releases(release_id) on delete restrict,
  normalized_concept text not null,
  candidate_entity_id uuid null,
  candidate_neighborhood text null,
  mode text not null,
  subintent text null,
  gap_type text not null,
  unique_user_count integer not null default 0,
  total_query_count integer not null default 0,
  query_frequency_component numeric not null default 0,
  retrieval_failure_component numeric not null default 0,
  downstream_impact_component numeric not null default 1,
  graph_reuse_component numeric not null default 1,
  mode_priority_component numeric not null default 1,
  gap_confidence_component numeric not null default 0,
  persistence_component numeric not null default 1,
  resolution_cost_component numeric not null default 1,
  gap_score numeric not null default 0,
  example_sanitized_queries text[] not null default '{}',
  affected_products text[] not null default array['brobot']::text[],
  candidate_matches jsonb not null default '[]',
  failure_metrics jsonb not null default '{}',
  proposed_repair_type text null,
  estimated_risk text not null default 'moderate',
  estimated_implementation_cost text not null default 'medium',
  evidence_needs text[] not null default '{}',
  lifecycle_status text not null default 'open',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brobot_kg_growth_unique
    unique nulls not distinct (
      release_id, normalized_concept, candidate_entity_id, candidate_neighborhood,
      mode, subintent, gap_type
    ),
  constraint brobot_kg_growth_status_check
    check (lifecycle_status in ('open', 'triaged', 'proposal_ready', 'dismissed', 'resolved')),
  constraint brobot_kg_growth_risk_check
    check (estimated_risk in ('low', 'moderate', 'high')),
  constraint brobot_kg_growth_cost_check
    check (estimated_implementation_cost in ('low', 'medium', 'high'))
);

create index if not exists brobot_kg_growth_priority_idx
  on public.brobot_kg_growth_queue (lifecycle_status, gap_score desc, last_seen_at desc);

drop trigger if exists set_brobot_kg_growth_queue_updated_at on public.brobot_kg_growth_queue;
create trigger set_brobot_kg_growth_queue_updated_at
  before update on public.brobot_kg_growth_queue
  for each row execute function public.tg_set_updated_at();

alter table public.brobot_kg_retrieval_events enable row level security;
alter table public.brobot_kg_growth_queue enable row level security;

grant select, insert, update on public.brobot_kg_retrieval_events to service_role;
grant select, insert, update on public.brobot_kg_growth_queue to service_role;

create or replace function public.retrieve_brobot_kg_shadow(
  p_release_id text,
  p_query text,
  p_entity_types text[] default '{}',
  p_neighborhood_hints text[] default '{}',
  p_predicates text[] default '{}',
  p_max_candidates integer default 8,
  p_max_entities integer default 8,
  p_max_relationships integer default 10,
  p_max_neighborhoods integer default 2
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
with active_release as (
  select r.release_id
  from public.kg_production_releases r
  where r.release_id = p_release_id
    and p_release_id = 'kg-beta-20260716-002'
    and r.status in ('active', 'partially_active')
    and r.publication_status in ('beta_active', 'reviewed_active')
),
all_production_entities as (
  select distinct
    e.id,
    e.entity_type,
    e.preferred_label,
    e.normalized_label,
    e.slug,
    n.neighborhood_slug,
    n.coverage_status,
    o.review_tier,
    o.provenance_status,
    o.risk_tier
  from active_release ar
  join public.kg_production_neighborhoods n on n.release_id = ar.release_id
  join public.kg_production_neighborhood_objects no
    on no.release_id = n.release_id and no.neighborhood_slug = n.neighborhood_slug
  join public.kg_production_objects o
    on o.release_id = no.release_id
    and o.target_table = no.target_table
    and o.target_id = no.target_id
  join public.canonical_entities e
    on o.target_table = 'canonical_entities' and e.id = o.target_id
  where n.lifecycle_state in ('production_beta_active', 'production_active')
    and n.publication_status in ('beta_active', 'reviewed_active')
    and o.publication_status in ('beta_active', 'reviewed_active')
    and o.risk_tier <> 'high'
    and e.is_active
    and e.status not in ('deprecated', 'replaced', 'merged', 'split')
    and not exists (
      select 1 from public.kg_production_exclusions x
      where x.release_id = ar.release_id
        and x.neighborhood_slug = n.neighborhood_slug
        and x.target_table = 'canonical_entities'
        and x.target_id = e.id
    )
),
production_entities as (
  select *
  from all_production_entities
  where (cardinality(p_entity_types) = 0 or entity_type = any(p_entity_types))
    and (
      cardinality(p_neighborhood_hints) = 0
      or neighborhood_slug = any(p_neighborhood_hints)
    )
),
alias_matches as (
  select pe.id, max(
    case
      when lower(btrim(sa.alias_value)) = lower(btrim(p_query)) then 1.0
      when lower(sa.alias_value) like '%' || lower(btrim(p_query)) || '%' then 0.75
      when lower(btrim(p_query)) like '%' || lower(sa.alias_value) || '%' then 0.65
      else 0
    end
  )::numeric as alias_score
  from production_entities pe
  join public.source_aliases sa
    on sa.entity_type = 'canonical_entity'
    and sa.entity_id = pe.id
    and sa.is_active
  group by pe.id
),
scored_entities as (
  select
    pe.*,
    case
      when lower(coalesce(pe.slug, '')) = lower(btrim(p_query)) then 1.0
      when pe.normalized_label = lower(btrim(p_query)) then 0.98
      when lower(pe.preferred_label) = lower(btrim(p_query)) then 0.98
      when pe.normalized_label like '%' || lower(btrim(p_query)) || '%' then 0.82
      when lower(btrim(p_query)) like '%' || pe.normalized_label || '%' then 0.72
      else 0
    end::numeric as lexical_score,
    coalesce(am.alias_score, 0)::numeric as alias_score
  from production_entities pe
  left join alias_matches am on am.id = pe.id
),
candidate_entities as (
  select *
  from scored_entities
  where greatest(lexical_score, alias_score) > 0
  order by greatest(lexical_score, alias_score) desc, preferred_label, id
  limit greatest(1, least(coalesce(p_max_candidates, 8), coalesce(p_max_entities, 8), 20))
),
selected_neighborhoods as (
  select neighborhood_slug, max(greatest(lexical_score, alias_score)) as score
  from candidate_entities
  group by neighborhood_slug
  order by score desc, neighborhood_slug
  limit greatest(1, least(coalesce(p_max_neighborhoods, 2), 2))
),
candidate_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'entityId', c.id,
    'label', c.preferred_label,
    'entityType', c.entity_type,
    'neighborhoodSlugs', array[c.neighborhood_slug],
    'lexicalScore', c.lexical_score,
    'aliasScore', c.alias_score,
    'sessionScore', 0,
    'modeScore', case when cardinality(p_entity_types) = 0 or c.entity_type = any(p_entity_types) then 1 else 0 end,
    'coverageScore', case when c.coverage_status = 'full' then 1 else 0.7 end,
    'finalScore', round((
      greatest(c.lexical_score, c.alias_score) * 0.70
      + (case when c.coverage_status = 'full' then 1 else 0.7 end) * 0.15
      + 0.15
    )::numeric, 4)
  ) order by greatest(c.lexical_score, c.alias_score) desc, c.preferred_label, c.id), '[]'::jsonb) value
  from candidate_entities c
  join selected_neighborhoods sn using (neighborhood_slug)
),
edge_candidates as (
  select distinct
    r.id,
    r.subject_entity_id,
    se.preferred_label subject_label,
    r.predicate,
    r.object_entity_id,
    oe.preferred_label object_label,
    r.confidence,
    o.review_tier,
    o.risk_tier,
    o.provenance_status,
    n.neighborhood_slug
  from active_release ar
  join public.kg_production_neighborhoods n on n.release_id = ar.release_id
  join selected_neighborhoods sn on sn.neighborhood_slug = n.neighborhood_slug
  join public.kg_production_neighborhood_objects no
    on no.release_id = n.release_id and no.neighborhood_slug = n.neighborhood_slug
  join public.kg_production_objects o
    on o.release_id = no.release_id
    and o.target_table = no.target_table
    and o.target_id = no.target_id
  join public.canonical_relationships r
    on o.target_table = 'canonical_relationships' and r.id = o.target_id
  join all_production_entities se
    on se.id = r.subject_entity_id and se.neighborhood_slug = n.neighborhood_slug
  join all_production_entities oe
    on oe.id = r.object_entity_id and oe.neighborhood_slug = n.neighborhood_slug
  where o.publication_status in ('beta_active', 'reviewed_active')
    and o.risk_tier <> 'high'
    and r.is_active
    and r.lifecycle_status = 'active'
    and r.subject_entity_type = 'canonical_entity'
    and r.object_entity_type = 'canonical_entity'
    and (cardinality(p_predicates) = 0 or r.predicate = any(p_predicates))
    and (
      r.subject_entity_id in (select id from candidate_entities)
      or r.object_entity_id in (select id from candidate_entities)
    )
    and not exists (
      select 1 from public.kg_production_exclusions x
      where x.release_id = ar.release_id
        and x.neighborhood_slug = n.neighborhood_slug
        and x.target_table = 'canonical_relationships'
        and x.target_id = r.id
    )
),
allowed_entity_ids as (
  select id
  from (
    select c.id, 0 priority, 2.0::numeric relevance from candidate_entities c
    union
    select endpoint.id, 1 priority, max(endpoint.relevance) relevance
    from (
      select ec.subject_entity_id id, ec.confidence relevance from edge_candidates ec
      union all
      select ec.object_entity_id id, ec.confidence relevance from edge_candidates ec
    ) endpoint
    group by endpoint.id
  ) ranked
  order by priority, relevance desc, id
  limit greatest(1, least(coalesce(p_max_entities, 8), 20))
),
production_relationships as (
  select *
  from edge_candidates ec
  where ec.subject_entity_id in (select id from allowed_entity_ids)
    and ec.object_entity_id in (select id from allowed_entity_ids)
  order by ec.confidence desc, ec.predicate, ec.subject_entity_id, ec.object_entity_id, ec.id
  limit greatest(0, least(coalesce(p_max_relationships, 10), 14))
),
fact_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'relationshipId', pr.id,
    'subjectId', pr.subject_entity_id,
    'subjectLabel', pr.subject_label,
    'predicate', pr.predicate,
    'objectId', pr.object_entity_id,
    'objectLabel', pr.object_label,
    'score', pr.confidence,
    'reviewTier', pr.review_tier,
    'riskTier', pr.risk_tier,
    'provenanceStatus', pr.provenance_status
  ) order by pr.confidence desc, pr.predicate, pr.subject_label, pr.object_label, pr.id), '[]'::jsonb) value
  from production_relationships pr
),
coverage as (
  select case
    when count(*) = 0 then 'unknown'
    when bool_and(coverage_status = 'full') then 'full'
    else 'partial'
  end value
  from production_entities pe
  join selected_neighborhoods sn using (neighborhood_slug)
)
select jsonb_build_object(
  'releaseId', p_release_id,
  'coverage', (select value from coverage),
  'candidates', (select value from candidate_json),
  'facts', (select value from fact_json),
  'neighborhoodSlugs', coalesce(
    (select jsonb_agg(neighborhood_slug order by score desc, neighborhood_slug) from selected_neighborhoods),
    '[]'::jsonb
  ),
  'limitations', jsonb_build_array(
    'Claims and decision points are excluded from shadow retrieval.',
    'High-risk and production-excluded objects are excluded.'
  )
);
$$;

revoke all on function public.retrieve_brobot_kg_shadow(
  text, text, text[], text[], text[], integer, integer, integer, integer
) from public;
revoke execute on function public.retrieve_brobot_kg_shadow(
  text, text, text[], text[], text[], integer, integer, integer, integer
) from anon;
grant execute on function public.retrieve_brobot_kg_shadow(
  text, text, text[], text[], text[], integer, integer, integer, integer
) to authenticated, service_role;

comment on function public.retrieve_brobot_kg_shadow is
  'Read-only, release-pinned, bounded BroBot shadow retrieval. Reads only active production release overlays and excludes claims, decision points, high-risk, inactive, and excluded objects.';

create or replace function public.aggregate_brobot_kg_gap_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  gap jsonb;
  concept text;
  gap_kind text;
  v_candidate_id uuid;
  v_candidate_neighborhood text;
  confidence numeric;
  repair_type text;
  cost numeric;
  mode_priority numeric;
  existing_id uuid;
begin
  if new.release_id is null or jsonb_typeof(new.gap_signals) <> 'array' then
    return new;
  end if;

  for gap in select value from jsonb_array_elements(new.gap_signals)
  loop
    concept := nullif(btrim(gap->>'normalizedConcept'), '');
    gap_kind := nullif(btrim(gap->>'gapType'), '');
    v_candidate_id := nullif(gap->>'candidateEntityId', '')::uuid;
    v_candidate_neighborhood := nullif(btrim(gap->>'candidateNeighborhood'), '');
    confidence := greatest(0, least(1, coalesce((gap->>'confidence')::numeric, 0.5)));
    if concept is null or gap_kind is null then continue; end if;

    repair_type := case gap_kind
      when 'missing_alias' then 'add_alias'
      when 'missing_entity' then 'create_entity'
      when 'missing_neighborhood' then 'expand_neighborhood'
      when 'missing_relationship' then 'create_relationship'
      when 'missing_predicate_family' then 'create_relationship'
      when 'missing_provenance' then 'add_provenance'
      else 'review_existing_object'
    end;
    cost := case repair_type
      when 'add_alias' then 0.5
      when 'create_relationship' then 1.0
      when 'review_existing_object' then 1.0
      when 'create_entity' then 1.5
      when 'expand_neighborhood' then 2.0
      else 1.5
    end;
    mode_priority := case new.mode
      when 'consult' then 1.4
      when 'or_prep' then 1.3
      when 'oite' then 1.2
      when 'clinic' then 1.1
      else 1.0
    end;

    select q.id into existing_id
    from public.brobot_kg_growth_queue q
    where q.release_id = new.release_id
      and q.normalized_concept = concept
      and q.candidate_entity_id is not distinct from v_candidate_id
      and q.candidate_neighborhood is not distinct from v_candidate_neighborhood
      and q.mode = new.mode
      and q.subintent is not distinct from new.subintent
      and q.gap_type = gap_kind
    limit 1;

    if existing_id is null then
      insert into public.brobot_kg_growth_queue (
        release_id, normalized_concept, candidate_entity_id, candidate_neighborhood,
        mode, subintent, gap_type, unique_user_count, total_query_count,
        query_frequency_component, retrieval_failure_component,
        downstream_impact_component, graph_reuse_component, mode_priority_component,
        gap_confidence_component, persistence_component, resolution_cost_component,
        gap_score, example_sanitized_queries, candidate_matches, failure_metrics,
        proposed_repair_type, estimated_risk, estimated_implementation_cost,
        evidence_needs
      ) values (
        new.release_id, concept, v_candidate_id, v_candidate_neighborhood,
        new.mode, new.subintent, gap_kind, case when new.user_id is null then 0 else 1 end, 1,
        ln(2), case when new.retrieval_status in ('miss', 'error', 'timeout') then 1 else 0.5 end,
        1, case when v_candidate_neighborhood is null then 1 else 1.2 end, mode_priority,
        confidence, 1, cost,
        ln(2) * (case when new.retrieval_status in ('miss', 'error', 'timeout') then 1 else 0.5 end)
          * mode_priority * confidence / cost,
        case when new.sanitized_query is null then '{}' else array[new.sanitized_query] end,
        coalesce(new.candidate_scores, '[]'::jsonb),
        jsonb_build_object('retrievalStatus', new.retrieval_status),
        repair_type,
        case when new.mode = 'consult' then 'high' when repair_type = 'add_alias' then 'low' else 'moderate' end,
        case when cost <= 0.5 then 'low' when cost >= 1.5 then 'high' else 'medium' end,
        case when repair_type in ('create_entity', 'create_relationship', 'expand_neighborhood')
          then array['clinical source validation', 'production release review']
          else array['retrieval trace review']
        end
      );
    else
      update public.brobot_kg_growth_queue q
      set total_query_count = q.total_query_count + 1,
          unique_user_count = q.unique_user_count + case
            when new.user_id is not null and not exists (
              select 1 from public.brobot_kg_retrieval_events e
              where e.id <> new.id
                and e.user_id = new.user_id
                and e.release_id = new.release_id
                and e.normalized_concept = concept
                and e.mode = new.mode
            ) then 1 else 0 end,
          query_frequency_component = ln(q.total_query_count + 2),
          gap_confidence_component = greatest(q.gap_confidence_component, confidence),
          persistence_component = greatest(1, extract(epoch from (now() - q.first_seen_at)) / 604800),
          gap_score = ln(q.total_query_count + 2)
            * q.retrieval_failure_component
            * q.downstream_impact_component
            * q.graph_reuse_component
            * q.mode_priority_component
            * greatest(q.gap_confidence_component, confidence)
            * greatest(1, extract(epoch from (now() - q.first_seen_at)) / 604800)
            / q.resolution_cost_component,
          example_sanitized_queries = case
            when new.sanitized_query is null or new.sanitized_query = any(q.example_sanitized_queries)
              then q.example_sanitized_queries
            else array(
              select value
              from unnest(q.example_sanitized_queries || new.sanitized_query) value
              limit 5
            )
          end,
          last_seen_at = now()
      where q.id = existing_id;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists aggregate_brobot_kg_gap_event
  on public.brobot_kg_retrieval_events;
create trigger aggregate_brobot_kg_gap_event
  after insert on public.brobot_kg_retrieval_events
  for each row execute function public.aggregate_brobot_kg_gap_event();

commit;
