-- FORENSIC SNAPSHOT ONLY. NOT A MIGRATION. DO NOT APPLY.
-- Captured live definitions for comparison and review; these are not approved fixes.
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


CREATE OR REPLACE FUNCTION public.retrieve_brobot_knowledge_v3(p_release_id text, p_query text, p_variants text[] DEFAULT '{}'::text[], p_terms text[] DEFAULT '{}'::text[], p_facets text[] DEFAULT '{}'::text[], p_entity_types text[] DEFAULT '{}'::text[], p_predicates text[] DEFAULT '{}'::text[], p_max_candidates integer DEFAULT 8, p_max_entities integer DEFAULT 8, p_max_relationships integer DEFAULT 10, p_max_neighborhoods integer DEFAULT 2, p_mode text DEFAULT 'general'::text, p_subintent text DEFAULT 'general_overview'::text, p_max_claims integer DEFAULT 8, p_max_cards integer DEFAULT 8, p_pool_size integer DEFAULT 48)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
 SET jit TO 'off'
AS $function$
with params as (
  select
    lower(regexp_replace(btrim(coalesce(p_query, '')), '\s+', ' ', 'g')) as query,
    (select coalesce(array_agg(distinct btrim(lower(regexp_replace(btrim(v), '[^a-z0-9]+', ' ', 'g')))), '{}')
     from unnest(coalesce(p_variants, '{}')) v where btrim(v) <> '') as variants,
    (select coalesce(array_agg(distinct lower(btrim(t))), '{}')
     from unnest(coalesce(p_terms, '{}')) t where length(btrim(t)) >= 2) as terms,
    coalesce(p_facets, '{}') as facets,
    greatest(8, least(coalesce(p_pool_size, 48), 60)) as pool_size,
    greatest(0, least(coalesce(p_max_claims, 8), 12)) as max_claims,
    greatest(0, least(coalesce(p_max_cards, 8), 12)) as max_cards,
    greatest(1, least(coalesce(p_max_candidates, 8), 12)) as max_anchors
),
-- Function-word stoplist shared by SQL-side token channels. Clinical words stay.
stop as (
  select array[
    'a','an','the','and','or','but','of','for','with','without','in','on','at',
    'to','from','by','about','into','over','after','what','which','who','whom',
    'whose','when','where','why','how','is','are','was','were','be','been',
    'being','do','does','did','can','could','should','would','will','shall',
    'may','might','must','i','me','my','we','us','our','you','your','he','him',
    'his','she','her','it','its','they','them','their','this','that','these',
    'those','there','here','than','then','so','such','as','if','else','not',
    'no','yes','just','very','much','more','most','please','tell','explain',
    'describe','give','show','need','want','like','know','think','tomorrow',
    'today','tonight','vs','out','up','down','off','per'
  ] as words
),
-- Effective match terms: caller terms first, then content words folded in from
-- query variants (abbreviation expansions live only in variants), deduplicated
-- and capped. Falls back to tokenizing the raw query when the caller sends none.
variant_words as (
  select distinct w as word
  from unnest((select variants from params)) v,
    lateral regexp_split_to_table(v, '[^a-z0-9]+') w
  cross join stop
  where length(w) >= 2 and not (w = any(stop.words))
),
effective_terms as (
  select case
    when cardinality((select terms from params)) > 0 then coalesce((
      select array_agg(t) from (
        select t from (
          select t, min(o) as o from (
            select unnest((select terms from params)) as t, 1 as o
            union all
            select word as t, 2 as o from variant_words
          ) u group by t
        ) s order by o, t limit 24
      ) q
    ), '{}')
    else coalesce((select array_agg(distinct w) from (
      select regexp_split_to_table((select query from params), '[^a-z0-9]+') as w
    ) s cross join stop where length(w) >= 2 and not (w = any(stop.words))), '{}')
  end as terms
),
latest_release as (
  select r.id from public.anki_deck_releases r
  where r.status = 'published'
  order by r.published_at desc nulls last, r.created_at desc
  limit 1
),
-- ============================================================
-- ELIGIBILITY (serving boundary). Nothing below can widen this.
-- ============================================================
eligible_reviewed as (
  select c.id as claim_id, v.id as claim_version_id,
    v.claim_text, v.claim_type, v.predicate, v.object_text, v.qualifiers,
    coalesce(c.importance_level, 'L3') as importance_level,
    v.primary_entity_id,
    v.approval_method, v.review_status, v.content_source, v.algorithm_version,
    'A'::text as trust_tier,
    null::numeric as link_confidence
  from public.educational_claims c
  join public.educational_claim_versions v
    on v.id = c.current_version_id and v.claim_id = c.id
  join public.servable_claim_versions sv on sv.claim_version_id=v.id
  where c.is_active and c.current_version_id is not null
),
eligible_claims as (
  select distinct on (claim_id) ec.*,
    pe.preferred_label as primary_entity_label
  from (
    select * from eligible_reviewed
  ) ec
  left join public.canonical_entities pe on pe.id = ec.primary_entity_id
  order by claim_id, trust_tier
),
-- Narrow eligible ids for traversal joins (avoids re-scanning wide claim rows).
eligible_ids as (
  select ec.claim_id, ec.claim_version_id, ec.primary_entity_id from eligible_claims ec
),
-- ============================================================
-- ENTITY ANCHORS (multi-channel, token-aware)
-- ============================================================
entity_base as (
  select e.id, e.preferred_label, e.normalized_label, e.entity_type
  from public.canonical_entities e
  where e.is_active
    and e.status not in ('deprecated', 'replaced', 'merged', 'split')
    and (cardinality(p_entity_types) = 0 or e.entity_type = any(p_entity_types))
    and (
      exists(select 1 from unnest((select terms from effective_terms)) t
        where strpos(e.normalized_label,case when length(t)>3 and right(t,1)='s' then left(t,-1) else t end)>0)
      or exists(select 1 from unnest(array_append((select variants from params),(select query from params))) vv
        where extensions.similarity(e.normalized_label,vv)>=0.45)
      or exists(select 1 from public.source_aliases sa where sa.entity_id=e.id and sa.is_active and sa.entity_type='canonical_entity'
        and lower(btrim(sa.alias_value))=any(array_append((select variants from params),(select query from params))))
      or exists(select 1 from public.canonical_entity_aliases ca where ca.canonical_entity_id=e.id and ca.is_active and ca.review_status='approved'
        and ca.normalized_alias=any(array_append((select variants from params),(select query from params))))
    )
),
entity_stems as (
  select b.id,
    (select coalesce(array_agg(distinct case
        when length(w) > 3 and right(w, 1) = 's' then left(w, -1) else w end), '{}')
     from (select regexp_split_to_table(b.normalized_label, '[^a-z0-9]+') as w) s
     cross join stop
     where length(w) >= 2 and not (w = any(stop.words))) as stems,
    (select count(*) from (
      select regexp_split_to_table(b.normalized_label, '[^a-z0-9]+') as w
    ) s cross join stop
    where length(w) >= 2 and not (w = any(stop.words))) as token_n
  from entity_base b
),
query_stems as (
  select coalesce(array_agg(distinct case
      when length(t) > 3 and right(t, 1) = 's' then left(t, -1) else t end), '{}') as stems
  from unnest((select terms from effective_terms)) t
),
anchor_token as (
  select s.id,
    (select count(*)::numeric from unnest(s.stems) x where x = any(q.stems)) as overlap,
    greatest(s.token_n, 1)::numeric as label_n,
    greatest(cardinality(q.stems), 1)::numeric as query_n
  from entity_stems s cross join query_stems q
),
anchor_trigram as (
  select b.id, max(extensions.similarity(b.normalized_label, vv.v))::numeric as sim
  from entity_base b
  cross join lateral (
    select unnest(array_append((select variants from params), (select query from params))) as v
  ) vv
  group by b.id
),
anchor_alias_exact as (
  select u.id, max(u.alias_score) as alias_score from (
    select sa.entity_id as id, 1.0::numeric as alias_score
    from public.source_aliases sa
    where sa.is_active and sa.entity_type = 'canonical_entity'
      and lower(btrim(sa.alias_value)) = any(array_append((select variants from params), (select query from params)))
    union all
    select cea.canonical_entity_id as id, 1.0::numeric
    from public.canonical_entity_aliases cea
    where cea.is_active and cea.review_status = 'approved'
      and cea.normalized_alias = any(array_append((select variants from params), (select query from params)))
  ) u group by u.id
),
anchors_scored as (
  select b.id, b.preferred_label, b.entity_type,
    case when b.normalized_label = any(array_append((select variants from params), (select query from params)))
      then 1.0 else 0 end::numeric as exact_score,
    coalesce(a.alias_score, 0)::numeric as alias_score,
    case when t.overlap >= 1
      then round((2 * t.overlap / (t.label_n + t.query_n))::numeric, 4) else 0 end as token_score,
    case when coalesce(g.sim, 0) >= 0.45 then round(g.sim, 4) else 0 end as trigram_score
  from entity_base b
  left join anchor_alias_exact a on a.id = b.id
  left join anchor_token t on t.id = b.id
  left join anchor_trigram g on g.id = b.id
),
anchors as (
  select s.*,
    greatest(s.exact_score, s.alias_score, s.token_score, s.trigram_score) as entity_score,
    array_remove(array[
      case when s.exact_score >= 1.0 then 'exact_label' end,
      case when s.alias_score >= 1.0 then 'exact_alias' end,
      case when s.token_score >= 0.20 then 'token_overlap' end,
      case when s.trigram_score >= 0.45 then 'trigram' end
    ], null) as channels
  from anchors_scored s
  where greatest(s.exact_score, s.alias_score, s.token_score, s.trigram_score) >= 0.20
  order by 8 desc, preferred_label, id
  limit (select max_anchors from params)
),
-- Full-text query: original query ORed with content-term disjunction.
tsq as (
  select (
    coalesce(plainto_tsquery('english', (select query from params)), ''::tsquery)
    || coalesce((
      select case when lex <> '' then to_tsquery('english', lex) else ''::tsquery end
      from (select string_agg(lexeme, ' | ') as lex from (
        select distinct regexp_replace(t, '[^a-z0-9]+', '', 'g') as lexeme
        from unnest((select terms from effective_terms)) t
      ) s where length(lexeme) >= 2) q
    ), ''::tsquery)
  ) as q
),
-- ============================================================
-- CLAIM CHANNELS
-- ============================================================
-- Claim documents built once: FTS vector, padded lowercase text, singular-folded
-- text (trailing-s folded so fracture/fractures match either direction).
claim_docs as (
  select ec.claim_id,
    to_tsvector('english',
      coalesce(ec.claim_text, '') || ' ' ||
      coalesce(ec.object_text, '') || ' ' ||
      coalesce(ec.predicate, '')) as tsdoc,
    ' ' || regexp_replace(lower(coalesce(ec.claim_text, '')), '[^a-z0-9]+', ' ', 'g') || ' ' as doctext,
    ' ' || regexp_replace(
      regexp_replace(lower(coalesce(ec.claim_text, '')), '[^a-z0-9]+', ' ', 'g'),
      '([a-z0-9]{3,})s ', '\1 ', 'g') || ' ' as folded
  from eligible_claims ec
),
-- Direct claim-text channels (FTS, token coverage, phrase). Trigram runs as a
-- second stage over cheap-channel misses only (see claim_trigram_rest).
claim_text_cheap as (
  select d.claim_id, d.doctext,
    case when (select q from tsq) <> ''::tsquery and d.tsdoc @@ (select q from tsq)
      then ts_rank_cd(d.tsdoc, (select q from tsq))
      else 0 end::numeric as fts_rank,
    (select coalesce(array_agg(t), '{}') from unnest((select terms from effective_terms)) t
     where strpos(d.doctext, ' ' || t || ' ') > 0
        or strpos(d.folded, ' ' || t || ' ') > 0
        or (length(t) > 3 and right(t, 1) = 's'
          and (strpos(d.doctext, ' ' || left(t, -1) || ' ') > 0
            or strpos(d.folded, ' ' || left(t, -1) || ' ') > 0))
        or (length(t) >= 8
          and strpos(d.doctext, ' ' || left(t, greatest(6, length(t) - 2))) > 0)
        or (length(t) >= 10
          and strpos(d.doctext, ' ' || left(t, greatest(6, length(t) - 3))) > 0)
    ) as matched_terms,
    greatest(cardinality((select terms from effective_terms)), 1)::numeric as term_total,
    case when exists (
        select 1 from unnest(array_append((select variants from params),
          (select query from params))) v
        where (length(v) >= 12 or strpos(v, ' ') > 0)
          and strpos(d.doctext, ' ' || v || ' ') > 0
      ) then 1.0 else 0 end::numeric as phrase_bonus
  from claim_docs d
),
-- Per-term document frequency over the eligible corpus: rare terms (TUBS,
-- syndesmosis) outweigh ubiquitous ones (fracture) in pool ordering.
term_stats as (
  select t.term,
    (select count(*)::numeric from claim_text_cheap c
     where c.matched_terms @> array[t.term]) as df
  from unnest((select terms from effective_terms)) t(term)
),
-- IDF per term: hapax terms (df < 2, e.g. concerned, proportion) carry no
-- signal and would otherwise dominate denominators, so they get zero weight;
-- otherwise capped so rare typos cannot outweigh genuine multi-term matches.
term_idf as (
  select s.term,
    case when s.df < 2 then 0
      else least(
        ln(1 + (select count(*)::numeric from eligible_claims) / (1 + s.df))::numeric,
        5.0)
    end as idf
  from term_stats s
),
idf_total as (
  select coalesce(sum(i.idf), 1)::numeric as total
  from term_idf i join term_stats s on s.term = i.term
  where s.df >= 2
),
-- Matchable term count: terms occurring in at least two eligible claims.
-- Unmatchable terms (oite, points, cpt, concerned) can never discriminate;
-- excluding them from denominators keeps coverage/idf calibrated.
matchable_total as (
  select greatest(count(*)::numeric, 1) as total from term_stats where df >= 2
),
-- Entity traversal: anchor -> card links, primary entity, 1-hop relationships.
anchor_token_counts as (
  select a.id as anchor_id,
    (select count(*) from (
      select regexp_split_to_table(b.normalized_label, '[^a-z0-9]+') as w
    ) s where length(s.w) >= 2) as token_n
  from anchors a
  join entity_base b on b.id = a.id
),
entity_claim_hits as (
  select u.claim_id, max(u.entity_score)::numeric as entity_score,
    bool_or(u.has_exact_anchor) as has_exact_anchor,
    bool_or(u.has_single_token_anchor) as has_single_token_anchor
  from (
    select ec.claim_id, max(a.entity_score)::numeric as entity_score,
      bool_or(coalesce(array_length(a.channels, 1), 0) > 0
        and a.channels && array['exact_label', 'exact_alias']) as has_exact_anchor,
      bool_or(coalesce(tc.token_n, 2) <= 1) as has_single_token_anchor
    from anchors a
    left join anchor_token_counts tc on tc.anchor_id = a.id
    join public.card_canonical_entity_links cel
      on cel.canonical_entity_id = a.id and cel.is_active and cel.review_status = 'approved'
    join public.card_claim_links l
      on l.canonical_card_id = cel.canonical_card_id and l.is_active
      and l.review_status in ('approved', 'auto_approved')
    join eligible_ids ec on ec.claim_id = l.claim_id and ec.claim_version_id = l.claim_version_id
    group by ec.claim_id
    union all
    select ec.claim_id, a.entity_score, false, false
    from anchors a
    join eligible_ids ec on ec.primary_entity_id = a.id
  ) u group by u.claim_id
),
relationship_claim_hits as (
  select ec.claim_id,
    max(a.entity_score * r.confidence)::numeric as rel_score
  from anchors a
  join public.canonical_relationships r
    on r.is_active and r.lifecycle_status = 'active'
    and r.review_status = 'approved' and r.provenance_status = 'reviewed'
    and r.subject_entity_type = 'canonical_entity' and r.object_entity_type = 'canonical_entity'
    and (cardinality(p_predicates) = 0 or r.predicate = any(p_predicates))
    and (r.subject_entity_id = a.id or r.object_entity_id = a.id)
  join public.canonical_entities n
    on n.id = case when r.subject_entity_id = a.id then r.object_entity_id else r.subject_entity_id end
    and n.is_active and n.status not in ('deprecated', 'replaced', 'merged', 'split')
  join eligible_ids ec on ec.primary_entity_id = n.id
  group by ec.claim_id
),
-- Card-text channel over published-deck cards that back eligible claims.
linked_deck_cards as (
  select distinct drc.canonical_card_id, drc.canonical_card_version_id
  from latest_release lr
  join public.anki_deck_release_cards drc
    on drc.deck_release_id = lr.id and drc.inclusion_status = 'included'
  join public.card_claim_links l
    on l.canonical_card_id = drc.canonical_card_id
    and l.canonical_card_version_id = drc.canonical_card_version_id
    and l.is_active and l.review_status in ('approved', 'auto_approved')
  join eligible_ids ec on ec.claim_id=l.claim_id and ec.claim_version_id=l.claim_version_id
),
card_docs as (
  select c.canonical_card_id, c.canonical_card_version_id,
    lower(coalesce(string_agg(f.item ->> 'plainText', ' ') filter (
      where lower(coalesce(f.item ->> 'name', '')) in ('text', 'front', 'question')
        or f.ordinality = 1), '')) as primary_doc,
    lower(coalesce(string_agg(f.item ->> 'plainText', ' ') filter (
      where lower(coalesce(f.item ->> 'name', '')) in
        ('back', 'extra', 'orthobullets', 'classifications', 'anatomy')
        or f.ordinality = 2), '')) as supporting_doc
  from linked_deck_cards c
  join public.canonical_card_versions v on v.id = c.canonical_card_version_id
  cross join lateral jsonb_array_elements(v.field_snapshot)
    with ordinality as f(item, ordinality)
  group by c.canonical_card_id, c.canonical_card_version_id
),
card_vectors as (
  select d.canonical_card_id, d.canonical_card_version_id,
    setweight(to_tsvector('english', d.primary_doc), 'A')
      || setweight(to_tsvector('english', d.supporting_doc), 'B') as tsdoc,
    ' ' || regexp_replace(d.primary_doc || ' ' || d.supporting_doc,
      '[^a-z0-9]+', ' ', 'g') || ' ' as doctext,
    ' ' || regexp_replace(
      regexp_replace(d.primary_doc || ' ' || d.supporting_doc, '[^a-z0-9]+', ' ', 'g'),
      '([a-z0-9]{3,})s ', '\1 ', 'g') || ' ' as folded
  from card_docs d
),
card_text_hits as (
  select v.canonical_card_id, v.canonical_card_version_id,
    case when (select q from tsq) <> ''::tsquery and v.tsdoc @@ (select q from tsq)
      then ts_rank_cd(v.tsdoc, (select q from tsq))
      else 0 end::numeric as card_fts_rank,
    (select count(*)::numeric from unnest((select terms from effective_terms)) t
     where strpos(v.doctext, ' ' || t || ' ') > 0
        or strpos(v.folded, ' ' || t || ' ') > 0
        or (length(t) > 3 and right(t, 1) = 's'
          and (strpos(v.doctext, ' ' || left(t, -1) || ' ') > 0
            or strpos(v.folded, ' ' || left(t, -1) || ' ') > 0))
        or (length(t) >= 8
          and strpos(v.doctext, ' ' || left(t, greatest(6, length(t) - 2))) > 0)
        or (length(t) >= 10
          and strpos(v.doctext, ' ' || left(t, greatest(6, length(t) - 3))) > 0)
    ) as card_matched,
    greatest(cardinality((select terms from effective_terms)), 1)::numeric as card_total
  from card_vectors v
),
card_claim_hits as materialized (
  select ec.claim_id,
    max(h.card_fts_rank)::numeric as card_fts_rank,
    max(h.card_matched / (select total from matchable_total))::numeric as card_coverage
  from card_text_hits h
  join public.card_claim_links l
    on l.canonical_card_id = h.canonical_card_id
    and l.canonical_card_version_id = h.canonical_card_version_id
    and l.is_active and l.review_status in ('approved', 'auto_approved')
  join eligible_ids ec on ec.claim_id = l.claim_id and ec.claim_version_id = l.claim_version_id
  where h.card_fts_rank > 0 or h.card_matched >= 2
    or (h.card_matched >= 1 and h.card_total <= 2)
  group by ec.claim_id
),
-- Trigram recall over cheap-channel misses (misspellings, word variants).
claim_trigram_rest as (
  select ec.claim_id,
    extensions.word_similarity(
      (select query from params), coalesce(ec.claim_text, ''))::numeric as wsim
  from eligible_claims ec
  left join claim_text_cheap c on c.claim_id = ec.claim_id
  where coalesce(c.fts_rank, 0) = 0
    and cardinality(coalesce(c.matched_terms, '{}')) = 0
    and coalesce(c.phrase_bonus, 0) = 0
    and length(coalesce(ec.claim_text, '')) between 10 and 600
    and length((select query from params)) between 4 and 200
),
-- ============================================================
-- POOL ASSEMBLY with per-component features
-- ============================================================
pooled_raw as (
  select ec.*,
    coalesce(t.fts_rank, 0) as fts_rank,
    coalesce(g.wsim, 0) as wsim,
    coalesce(cardinality(coalesce(t.matched_terms, '{}'))::numeric
      / nullif((select total from matchable_total), 0), 0) as term_coverage,
    cardinality(coalesce(t.matched_terms, '{}'))::numeric as term_matched,
    (select total from matchable_total) as term_total,
    coalesce((select sum(i.idf) from term_idf i
      where i.term = any(t.matched_terms))::numeric
      / nullif((select total from idf_total), 0), 0) as idf_coverage,
    coalesce(t.phrase_bonus, 0) as phrase_bonus,
    coalesce(e.entity_score, 0) as entity_score,
    coalesce(e.has_exact_anchor, false) as has_exact_anchor,
    coalesce(e.has_single_token_anchor, false) as has_single_token_anchor,
    coalesce(r.rel_score, 0) as rel_score,
    coalesce(c.card_fts_rank, 0) as card_fts_rank,
    coalesce(c.card_coverage, 0) as card_coverage,
    -- Mode fit over the REAL factory claim-type vocabulary.
    (case
      when p_mode = 'or_prep' and ec.claim_type in
        ('anatomy_pearl', 'anatomy', 'treatment_indication', 'complication',
         'contraindication', 'fact') then 1.0
      when p_mode = 'or_prep' then 0.6
      when p_mode = 'oite' and ec.claim_type in
        ('classification', 'fact', 'anatomy_pearl', 'imaging_point', 'imaging',
         'epidemiology', 'pathophysiology', 'threshold', 'prognosis',
         'diagnosis', 'biomechanics', 'risk_factor') then 1.0
      when p_mode = 'oite' then 0.7
      when p_mode in ('consult', 'fracture_call') and ec.claim_type in
        ('diagnosis', 'imaging_point', 'imaging', 'treatment_indication',
         'complication', 'contraindication', 'fact', 'physical_exam',
         'threshold', 'risk_factor') then 1.0
      when p_mode in ('consult', 'fracture_call') then 0.6
      when p_mode = 'clinic' and ec.claim_type in
        ('diagnosis', 'imaging_point', 'imaging', 'treatment_indication',
         'contraindication', 'prognosis', 'fact', 'physical_exam',
         'risk_factor', 'epidemiology') then 1.0
      when p_mode = 'clinic' then 0.6
      else 0.7 end)::numeric as mode_fit,
    -- Facet alignment over claim type + predicate + content keywords.
    -- Factory type labels are unreliable (classification claims labeled
    -- anatomy_pearl), so content keywords vote alongside the label maps.
    (case
      when cardinality((select facets from params)) = 0 then 0.5
      when (select facets from params) && (
        case ec.claim_type
          when 'anatomy_pearl' then array['anatomy']
          when 'anatomy' then array['anatomy']
          when 'treatment_indication' then array['treatment', 'indication', 'technique']
          when 'complication' then array['complication', 'prognosis']
          when 'contraindication' then array['indication', 'treatment', 'complication']
          when 'imaging_point' then array['imaging', 'diagnosis']
          when 'imaging' then array['imaging', 'diagnosis']
          when 'classification' then array['classification']
          when 'diagnosis' then array['diagnosis']
          when 'prognosis' then array['prognosis']
          when 'threshold' then array['threshold']
          else array[]::text[]
        end
        ||
        case ec.predicate
          when 'indication' then array['indication', 'treatment']
          when 'preferred_treatment' then array['treatment']
          when 'contraindication' then array['indication', 'complication']
          when 'complication_of' then array['complication']
          when 'imaging_finding' then array['imaging', 'diagnosis']
          else array[]::text[]
        end
        ||
        case when ec.claim_text ~ '\d' then array['threshold'] else array[]::text[] end
        ||
        case when coalesce(t.doctext, '') ~
          '(treat|manag|surg|operat|fixation|arthroplasty|reconstruct|fasciotomy|osteotomy|fusion|repair|graft|debridement|release|antibiotic|cast |splint|brace)'
          then array['treatment'] else array[]::text[] end
        ||
        case when coalesce(t.doctext, '') ~ '(classifi|grade|graded|staging)'
          then array['classification'] else array[]::text[] end
        ||
        case when coalesce(t.doctext, '') ~ ' (indicat|recommend)'
          then array['indication', 'treatment'] else array[]::text[] end
        ||
        case when coalesce(t.doctext, '') ~
          '(mri|arthrogram|mortise|radiograph|x ray| klein| shenton|fluoroscop| ct |xray|ultrasound)'
          then array['imaging', 'diagnosis'] else array[]::text[] end
        ||
        case when coalesce(t.doctext, '') ~
          '(diagnos|physical exam|finding|present|most common|risk factor|maneuver|palpat|exam )'
          then array['diagnosis'] else array[]::text[] end
        ||
        case when coalesce(t.doctext, '') ~
          '(nerve|artery|vein|muscle|tendon|ligament|branch|insertion|origin|innervat|blood supply)'
          then array['anatomy'] else array[]::text[] end
        ||
        case when coalesce(t.doctext, '') ~ '(approach|incision|exposure|interval)'
          then array['exposure', 'technique'] else array[]::text[] end
        ||
        case when coalesce(t.doctext, '') ~
          '(complicat|palsy|necrosis|nonunion|malunion|infection|stiffness|arthrofibrosis|sequela|injur)'
          then array['complication', 'prognosis'] else array[]::text[] end
        ||
        case when coalesce(t.doctext, '') ~ '(prognosis|mortality|survival|outcome|return to)'
          then array['prognosis'] else array[]::text[] end
        ||
        case when coalesce(t.doctext, '') ~
          '(tunnel|technique|placed|placement|portal|reduction| pin | pins |screw)'
          then array['technique'] else array[]::text[] end
      ) then 1.0
      when ec.claim_type = 'fact' and ec.predicate in ('teaches_fact', '', 'v5_assertion') then 0.5
      else 0.25 end)::numeric as facet_fit,
    (case when ec.trust_tier = 'A' then 1.0
      else 0.70 + 0.30 * coalesce(ec.link_confidence, 0.5) end)::numeric as trust_score,
    (case ec.importance_level when 'L1' then 1.0 when 'L2' then 0.85
      when 'L3' then 0.65 else 0.45 end)::numeric as importance_score,
    least(
      (case when length(coalesce(ec.claim_text, '')) < 40 then 0.25 else 0 end)
      + (case when lower(coalesce(ec.claim_text, '')) ~
          '(shown below|black arrow|this image|pictured|as shown|the (red|blue|black|white) arrow)'
          then 0.50 else 0 end)
      + (case when coalesce(ec.predicate, '') = '' then 0.15 else 0 end),
      0.60)::numeric as quality_penalty
  from eligible_claims ec
  left join claim_text_cheap t on t.claim_id = ec.claim_id
  left join claim_trigram_rest g on g.claim_id = ec.claim_id
  left join entity_claim_hits e on e.claim_id = ec.claim_id
  left join relationship_claim_hits r on r.claim_id = ec.claim_id
  left join card_claim_hits c on c.claim_id = ec.claim_id
),
pooled as (
  select pr.*,
    array_remove(array[
      case when pr.fts_rank > 0 then 'claim_fts' end,
      case when pr.wsim >= 0.55 then 'claim_trigram' end,
      case when pr.term_matched >= 2 or (pr.term_matched >= 1 and pr.term_total <= 2)
        or pr.idf_coverage >= 0.25 then 'claim_token' end,
      case when pr.phrase_bonus >= 1.0 then 'exact_phrase' end,
      case when pr.entity_score > 0 then 'entity_traversal' end,
      case when pr.rel_score > 0 then 'relationship_hop' end,
      case when pr.card_fts_rank > 0 or pr.card_coverage >= 0.5 then 'card_text' end
    ], null) as channels,
    case
      when pr.fts_rank > 0 or pr.term_matched >= 1 or pr.phrase_bonus >= 1.0
        or pr.card_fts_rank > 0 or pr.card_coverage > 0 then 0
      when pr.entity_score > 0 then 1
      else 2 end as graph_distance
  from pooled_raw pr
  where pr.fts_rank > 0
    or pr.wsim >= 0.55
    or pr.term_matched >= 2
    or (pr.term_matched >= 1 and pr.term_total <= 2)
    or pr.idf_coverage >= 0.25
    or pr.phrase_bonus >= 1.0
    or pr.entity_score > 0
    or pr.rel_score > 0
    or pr.card_fts_rank > 0
    or pr.card_coverage >= 0.5
),
scored_pool as (
  select p.*,
    round((
      (p.fts_rank / (1 + p.fts_rank)) * 0.20
      + least(p.wsim, 1.0) * 0.10
      + least(p.idf_coverage, 1.0) * 0.22
      + p.phrase_bonus * 0.14
      + least(p.entity_score, 1.0) * 0.12
      + least(p.rel_score, 1.0) * 0.05
      + (p.card_fts_rank / (1 + p.card_fts_rank)) * 0.10
      + least(p.card_coverage, 1.0) * 0.08
      + p.facet_fit * 0.08
      + p.mode_fit * 0.06
      + p.trust_score * 0.06
      + p.importance_score * 0.03
      - p.quality_penalty * 0.30
      - (case when p.graph_distance = 1 then 0.05 when p.graph_distance >= 2 then 0.22 else 0 end)
      - (case when p.has_single_token_anchor and not p.has_exact_anchor
          and p.fts_rank = 0 and p.term_matched = 0 and p.phrase_bonus = 0
          and p.card_fts_rank = 0 and p.card_coverage = 0 then 0.20 else 0 end)
    )::numeric, 4) as pool_score
  from pooled p
),
-- Pool cut with a representation quota: the top rows by score plus the best
-- claims with no direct claim-text support (threshold/anatomy facts reachable
-- only via card/entity/graph channels, e.g. medial-clear-space thresholds
-- for an ankle consult).
ranked_pool as (
  select * from (
    select p.*,
      row_number() over (order by p.pool_score desc, p.claim_id) as all_rank,
      row_number() over (
        partition by (p.fts_rank > 0 or p.term_matched >= 1
          or p.phrase_bonus >= 1.0 or p.wsim >= 0.55)
        order by p.pool_score desc, p.claim_id) as group_rank,
      (p.fts_rank > 0 or p.term_matched >= 1
        or p.phrase_bonus >= 1.0 or p.wsim >= 0.55) as has_claim_text_support
    from scored_pool p
  ) s
  where all_rank <= 42 or (has_claim_text_support = false and group_rank <= 10)
  order by pool_score desc, claim_id
  limit (select pool_size from params)
),
-- First-mentioned anatomy/condition coherence for ranked-pool claims only.
-- A claim whose first specific anatomy is unrelated to every anchor (fibula
-- claim for a radius question, knee claim for a hip question) is usually a
-- cross-topic lexical accident. Measurement concepts and generic scaffolding
-- words (fracture, injury, pain) never trigger the penalty.
mentionable_entities as (
  select e.id, e.normalized_label
  from public.canonical_entities e
  where e.is_active
    and e.entity_type in ('anatomy_structure', 'condition')
    and length(e.normalized_label) >= 4
    and e.normalized_label not in (
      'fracture', 'fractures', 'injury', 'injuries', 'pain',
      'dislocation', 'dislocations', 'sprain', 'sprains', 'strain', 'strains',
      'infection', 'infections')
),
ranked_mentions as (
  select rp.claim_id, e.id as entity_id,
    row_number() over (
      partition by rp.claim_id
      order by least(
        coalesce(nullif(strpos(' ' || cd.doctext || ' ', ' ' || e.normalized_label || ' '), 0), 999999),
        coalesce(nullif(strpos(' ' || cd.doctext || ' ', ' ' || e.normalized_label || 's '), 0), 999999),
        coalesce(nullif(strpos(' ' || cd.doctext || ' ', ' ' || e.normalized_label || 'es '), 0), 999999)
      )) as mention_rank
  from ranked_pool rp
  join claim_docs cd on cd.claim_id = rp.claim_id
  join mentionable_entities e on (
    strpos(' ' || cd.doctext || ' ', ' ' || e.normalized_label || ' ') > 0
    or strpos(' ' || cd.doctext || ' ', ' ' || e.normalized_label || 's ') > 0
    or strpos(' ' || cd.doctext || ' ', ' ' || e.normalized_label || 'es ') > 0
  )
),
first_mentions as (
  select m.claim_id, m.entity_id from ranked_mentions m where m.mention_rank = 1
),
mention_coherence as (
  select rp.claim_id,
    fm.entity_id as first_entity_id,
    case
      when fm.entity_id is null then 'none'
      when exists (select 1 from anchors a where a.id = fm.entity_id) then 'anchor'
      when exists (
        select 1 from public.canonical_relationships r
        join anchors a2 on (r.subject_entity_id = a2.id or r.object_entity_id = a2.id)
        where r.is_active and r.lifecycle_status = 'active'
          and r.review_status = 'approved' and r.provenance_status = 'reviewed'
          and r.subject_entity_type = 'canonical_entity' and r.object_entity_type = 'canonical_entity'
          and (r.subject_entity_id = fm.entity_id or r.object_entity_id = fm.entity_id)
      ) then 'related'
      else 'unrelated'
    end as coherence
  from ranked_pool rp
  left join first_mentions fm on fm.claim_id = rp.claim_id
),
channel_counts as (
  select array_agg(distinct ch) filter (where ch is not null) as used_channels,
    count(distinct claim_id) filter (where channels && array['claim_fts']) as claim_fts,
    count(distinct claim_id) filter (where channels && array['claim_trigram']) as claim_trigram,
    count(distinct claim_id) filter (where channels && array['claim_token']) as claim_token,
    count(distinct claim_id) filter (where channels && array['exact_phrase']) as exact_phrase,
    count(distinct claim_id) filter (where channels && array['entity_traversal']) as entity_traversal,
    count(distinct claim_id) filter (where channels && array['relationship_hop']) as relationship_hop,
    count(distinct claim_id) filter (where channels && array['card_text']) as card_text,
    count(distinct claim_id) as pool_total
  from pooled, lateral unnest(channels) ch
),
ranked_cards as (
  select distinct on (l.canonical_card_id)
    l.canonical_card_id, l.canonical_card_version_id, l.claim_id, l.claim_version_id,
    rp.claim_text, drc.deck_release_id, drc.deck_path, drc.card_ordinal,
    l.confidence, l.review_status,
    (select f.item ->> 'plainText'
     from jsonb_array_elements(v.field_snapshot) with ordinality as f(item, ordinality)
     order by f.ordinality limit 1) as front_snippet,
    round((rp.pool_score * 0.55 + l.confidence * 0.35
      + case when l.review_status = 'approved' then 0.10 else 0.05 end)::numeric, 4) as score
  from ranked_pool rp
  join public.card_claim_links l on l.claim_id = rp.claim_id
    and l.claim_version_id = rp.claim_version_id and l.is_active
    and l.review_status in ('approved', 'auto_approved')
  join latest_release lr on true
  join public.anki_deck_release_cards drc on drc.deck_release_id = lr.id
    and drc.canonical_card_id = l.canonical_card_id
    and drc.canonical_card_version_id = l.canonical_card_version_id
    and drc.inclusion_status = 'included'
  join public.canonical_cards cc on cc.id = l.canonical_card_id
    and cc.current_version_id = l.canonical_card_version_id and cc.is_active
  join public.canonical_card_versions v on v.id = l.canonical_card_version_id
  order by l.canonical_card_id, score desc, l.id
),
bounded_cards as (
  select * from ranked_cards order by score desc, canonical_card_id
  limit (select max_cards * 2 from params)
),
relationships as (
  select r.id, r.subject_entity_id, se.preferred_label as subject_label,
    r.predicate, r.object_entity_id, oe.preferred_label as object_label,
    r.confidence
  from public.canonical_relationships r
  join anchors a on a.id = r.subject_entity_id or a.id = r.object_entity_id
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
  'coverage', case when exists(select 1 from ranked_pool) then 'full' else 'unknown' end,
  'candidates', coalesce((select jsonb_agg(jsonb_build_object(
    'entityId', a.id, 'label', a.preferred_label, 'entityType', a.entity_type,
    'neighborhoodSlugs', '[]'::jsonb, 'lexicalScore', a.entity_score,
    'aliasScore', a.alias_score, 'sessionScore', 0, 'modeScore', 1, 'coverageScore', 1,
    'finalScore', a.entity_score, 'channels', a.channels,
    'tokenScore', a.token_score, 'trigramScore', a.trigram_score,
    'exactScore', a.exact_score) order by a.entity_score desc) from anchors a), '[]'::jsonb),
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
    'trustTier', c.trust_tier, 'score', c.pool_score, 'poolScore', c.pool_score,
    'channels', c.channels, 'graphDistance', c.graph_distance,
    'mentionCoherence', coalesce(mc.coherence, 'none'),
    'components', jsonb_build_object(
      'ftsRank', c.fts_rank, 'trigram', c.wsim, 'termCoverage', c.term_coverage,
      'idfCoverage', c.idf_coverage,
      'termMatched', c.term_matched, 'phraseBonus', c.phrase_bonus,
      'entityScore', c.entity_score, 'relScore', c.rel_score,
      'cardFtsRank', c.card_fts_rank, 'cardCoverage', c.card_coverage,
      'modeFit', c.mode_fit, 'facetFit', c.facet_fit, 'trust', c.trust_score,
      'importance', c.importance_score, 'qualityPenalty', c.quality_penalty),
    'selectionReasons', c.channels)
    order by c.pool_score desc) from ranked_pool c
    left join mention_coherence mc on mc.claim_id = c.claim_id), '[]'::jsonb),
  'cardCandidates', coalesce((select jsonb_agg(jsonb_build_object(
    'cardId', c.canonical_card_id, 'cardVersionId', c.canonical_card_version_id,
    'claimId', c.claim_id, 'claimVersionId', c.claim_version_id, 'releaseId', c.deck_release_id,
    'deckPath', c.deck_path, 'cardOrdinal', c.card_ordinal, 'confidence', c.confidence,
    'reviewStatus', c.review_status, 'score', c.score,
    'frontSnippet', left(coalesce(c.front_snippet, ''), 500)) order by c.score desc)
    from bounded_cards c), '[]'::jsonb),
  'channelCounts', coalesce((select jsonb_build_object(
    'claimFts', cc.claim_fts, 'claimTrigram', cc.claim_trigram,
    'claimToken', cc.claim_token, 'exactPhrase', cc.exact_phrase,
    'entityTraversal', cc.entity_traversal, 'relationshipHop', cc.relationship_hop,
    'cardText', cc.card_text, 'poolTotal', cc.pool_total) from channel_counts cc),
    '{"poolTotal":0}'::jsonb),
  'termIdf', coalesce((select jsonb_agg(jsonb_build_object('term', i.term, 'idf', i.idf)) from term_idf i), '[]'::jsonb),
  'neighborhoodSlugs', '[]'::jsonb,
  'limitations', case when exists(select 1 from ranked_pool) then '[]'::jsonb
    else jsonb_build_array('No eligible claims matched the query across text, card, and entity channels.') end
);
$function$
