-- Forensic baseline only. Do not apply: superseded by the remediation migrations.
CREATE OR REPLACE FUNCTION public.retrieve_brobot_knowledge_v2(p_release_id text, p_query text, p_entity_types text[] DEFAULT '{}'::text[], p_neighborhood_hints text[] DEFAULT '{}'::text[], p_predicates text[] DEFAULT '{}'::text[], p_max_candidates integer DEFAULT 8, p_max_entities integer DEFAULT 8, p_max_relationships integer DEFAULT 10, p_max_neighborhoods integer DEFAULT 2, p_mode text DEFAULT 'general'::text, p_subintent text DEFAULT 'general_overview'::text, p_max_claims integer DEFAULT 8, p_max_cards integer DEFAULT 8)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with normalized as (
  select lower(regexp_replace(btrim(coalesce(p_query, '')), '[^a-zA-Z0-9 -]+', ' ', 'g')) as query
),
alias_scores as (
  select sa.entity_id,
    max(case
      when lower(btrim(sa.alias_value)) = n.query then 1.0
      when n.query like '%' || lower(btrim(sa.alias_value)) || '%' then 0.82
      when lower(btrim(sa.alias_value)) like '%' || n.query || '%' then 0.72
      else 0 end)::numeric as alias_score
  from public.source_aliases sa cross join normalized n
  where sa.entity_type = 'canonical_entity' and sa.is_active
  group by sa.entity_id
),
scored_entities as (
  select e.id, e.preferred_label, e.entity_type,
    greatest(
      case
        when e.normalized_label = n.query then 1.0
        when n.query like '%' || e.normalized_label || '%' then 0.88
        when e.normalized_label like '%' || n.query || '%' then 0.70
        else 0 end,
      coalesce(a.alias_score, 0)
    )::numeric as lexical_score
  from public.canonical_entities e
  cross join normalized n
  left join alias_scores a on a.entity_id = e.id
  where e.is_active
    and e.status not in ('deprecated', 'replaced', 'merged', 'split')
    and (cardinality(p_entity_types) = 0 or e.entity_type = any(p_entity_types))
),
anchors as (
  select * from scored_entities where lexical_score > 0
  order by lexical_score desc, preferred_label, id
  limit greatest(1, least(coalesce(p_max_candidates, 8), coalesce(p_max_entities, 8), 20))
),
latest_release as (
  select r.id from public.anki_deck_releases r
  where r.status = 'published'
  order by r.published_at desc nulls last, r.created_at desc
  limit 1
),
eligible_claims_raw as (
  select c.id as claim_id, v.id as claim_version_id, v.claim_text, v.claim_type,
    v.predicate, v.object_text, v.qualifiers, coalesce(c.importance_level, 'L3') as importance_level,
    e.id as primary_entity_id, e.preferred_label as primary_entity_label,
    v.approval_method, v.review_status, v.content_source, v.algorithm_version,
    case
      when v.review_status = 'approved' and v.content_source = 'verified'
        and v.approval_method = 'human_review' then 'A'
      else 'B' end as trust_tier,
    a.lexical_score, l.confidence as link_confidence,
    case
      when p_mode = 'or_prep' and v.claim_type in ('anatomy','operative_technique','complication','treatment_indication','treatment_contraindication','threshold') then 1.0
      when p_mode = 'oite' and v.claim_type in ('classification','diagnosis','imaging','epidemiology','pathophysiology','threshold','prognosis') then 1.0
      when p_mode in ('consult','fracture_call') and v.claim_type in ('diagnosis','imaging','physical_exam','treatment_indication','complication','threshold') then 1.0
      when p_mode = 'clinic' and v.claim_type in ('diagnosis','physical_exam','imaging','treatment_indication','treatment_contraindication','prognosis') then 1.0
      else 0.65 end::numeric as mode_score,
    case c.importance_level when 'L1' then 1.0 when 'L2' then 0.85 when 'L3' then 0.65 else 0.45 end::numeric as importance_score,
    case when v.approval_method = 'human_review' then 1.0 when v.approval_method = 'sampled_audit' then 0.85 else 0.70 end::numeric as trust_score
  from anchors a
  join public.canonical_entities e on e.id = a.id
  join public.card_canonical_entity_links cel on cel.canonical_entity_id = a.id
    and cel.is_active and cel.review_status = 'approved'
  join public.card_claim_links l on l.canonical_card_id = cel.canonical_card_id
    and l.is_active and l.review_status in ('approved', 'auto_approved')
  join latest_release lr on true
  join public.anki_deck_release_cards drc on drc.deck_release_id = lr.id
    and drc.canonical_card_id = l.canonical_card_id
    and drc.canonical_card_version_id = l.canonical_card_version_id
    and drc.inclusion_status = 'included'
  join public.canonical_cards cc on cc.id = l.canonical_card_id
    and cc.current_version_id = l.canonical_card_version_id and cc.is_active
  join public.educational_claims c on c.id = l.claim_id and c.is_active
    and c.current_version_id = l.claim_version_id
  join public.educational_claim_versions v on v.id = l.claim_version_id and v.claim_id = c.id
  where public.claim_version_is_servable(v.id)
),
eligible_claims as (
  select distinct on (claim_id) *
  from eligible_claims_raw
  order by claim_id, lexical_score desc, link_confidence desc
),
ranked_claims as (
  select ec.*,
    round((ec.lexical_score * 0.35 + ec.mode_score * 0.25 + ec.importance_score * 0.20 + ec.trust_score * 0.20)::numeric, 4) as score
  from eligible_claims ec
  order by score desc, claim_id
  limit greatest(0, least(coalesce(p_max_claims, 8), 12))
),
ranked_cards as (
  select distinct on (l.canonical_card_id)
    l.canonical_card_id, l.canonical_card_version_id, l.claim_id, l.claim_version_id,
    rc.claim_text, drc.deck_release_id, drc.deck_path, drc.card_ordinal,
    l.confidence, l.review_status,
    round((rc.score * 0.55 + l.confidence * 0.35 + case when l.review_status = 'approved' then 0.10 else 0.05 end)::numeric, 4) score
  from ranked_claims rc
  join public.card_claim_links l on l.claim_id = rc.claim_id
    and l.claim_version_id = rc.claim_version_id and l.is_active
    and l.review_status in ('approved', 'auto_approved')
  join latest_release lr on true
  join public.anki_deck_release_cards drc on drc.deck_release_id = lr.id
    and drc.canonical_card_id = l.canonical_card_id
    and drc.canonical_card_version_id = l.canonical_card_version_id
    and drc.inclusion_status = 'included'
  join public.canonical_cards cc on cc.id = l.canonical_card_id
    and cc.current_version_id = l.canonical_card_version_id and cc.is_active
  order by l.canonical_card_id, score desc, l.id
),
bounded_cards as (
  select * from ranked_cards order by score desc, canonical_card_id
  limit greatest(0, least(coalesce(p_max_cards, 8), 12))
),
relationships as (
  select r.id, r.subject_entity_id, se.preferred_label subject_label,
    r.predicate, r.object_entity_id, oe.preferred_label object_label,
    r.confidence
  from public.canonical_relationships r
  join anchors a on a.id = r.subject_entity_id
  join public.canonical_entities se on se.id = r.subject_entity_id
  join public.canonical_entities oe on oe.id = r.object_entity_id
  where r.is_active and r.lifecycle_status = 'active'
    and r.review_status = 'approved' and r.provenance_status = 'reviewed'
    and r.subject_entity_type = 'canonical_entity' and r.object_entity_type = 'canonical_entity'
    and (cardinality(p_predicates) = 0 or r.predicate = any(p_predicates))
  order by r.confidence desc, r.id
  limit greatest(0, least(coalesce(p_max_relationships, 10), 20))
)
select jsonb_build_object(
  'releaseId', p_release_id,
  'coverage', case when exists(select 1 from ranked_claims) then 'full' else 'unknown' end,
  'candidates', coalesce((select jsonb_agg(jsonb_build_object(
    'entityId', a.id, 'label', a.preferred_label, 'entityType', a.entity_type,
    'neighborhoodSlugs', '[]'::jsonb, 'lexicalScore', a.lexical_score,
    'aliasScore', 0, 'sessionScore', 0, 'modeScore', 1, 'coverageScore', 1,
    'finalScore', a.lexical_score) order by a.lexical_score desc) from anchors a), '[]'::jsonb),
  'facts', coalesce((select jsonb_agg(jsonb_build_object(
    'relationshipId', r.id, 'subjectId', r.subject_entity_id, 'subjectLabel', r.subject_label,
    'predicate', r.predicate, 'objectId', r.object_entity_id, 'objectLabel', r.object_label,
    'score', r.confidence, 'reviewTier', 'approved', 'riskTier', 'standard',
    'provenanceStatus', 'reviewed')) from relationships r), '[]'::jsonb),
  'claims', coalesce((select jsonb_agg(jsonb_build_object(
    'claimId', c.claim_id, 'claimVersionId', c.claim_version_id, 'claimText', c.claim_text,
    'claimType', c.claim_type, 'predicate', c.predicate, 'objectText', c.object_text,
    'qualifiers', c.qualifiers, 'importanceLevel', c.importance_level,
    'primaryEntityId', c.primary_entity_id, 'primaryEntityLabel', c.primary_entity_label,
    'approvalMethod', c.approval_method, 'reviewStatus', c.review_status,
    'contentSource', c.content_source, 'algorithmVersion', c.algorithm_version,
    'trustTier', c.trust_tier, 'score', c.score,
    'selectionReasons', jsonb_build_array('published_card_entity_match', 'mode_fit',
      case when c.trust_tier = 'A' then 'human_reviewed_current_version' else 'factory_auto_approved_version_exact' end))
    order by c.score desc) from ranked_claims c), '[]'::jsonb),
  'cardCandidates', coalesce((select jsonb_agg(jsonb_build_object(
    'cardId', c.canonical_card_id, 'cardVersionId', c.canonical_card_version_id,
    'claimId', c.claim_id, 'claimVersionId', c.claim_version_id, 'releaseId', c.deck_release_id,
    'deckPath', c.deck_path, 'cardOrdinal', c.card_ordinal, 'confidence', c.confidence,
    'reviewStatus', c.review_status, 'score', c.score) order by c.score desc) from bounded_cards c), '[]'::jsonb),
  'neighborhoodSlugs', '[]'::jsonb,
  'limitations', case when exists(select 1 from ranked_claims) then '[]'::jsonb else jsonb_build_array('No eligible reviewed claims matched the resolved entity.') end
);
$function$
