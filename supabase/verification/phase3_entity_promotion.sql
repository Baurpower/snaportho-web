-- ============================================================================
-- Phase 3 verification: entity lifecycle, aliases, claims, promotion integrity
-- READ ONLY. All hard-violation queries must return zero rows.
-- Run after migrations apply AND after every promotion apply.
-- ============================================================================

-- ---------------------------------------------------------------- lifecycle
-- L1: lifecycle distribution (informational)
select status, review_status, count(*) as entities
from public.canonical_entities
where is_active
group by status, review_status
order by status, review_status;

-- L2 HARD: trusted rows must have a slug (promotion always generates one)
select id, preferred_label
from public.canonical_entities
where is_active
  and review_status = 'approved'
  and status in ('reviewed', 'canonical')
  and (slug is null or btrim(slug) = '');

-- L3 HARD: duplicate active slugs
select slug, count(*) as rows
from public.canonical_entities
where is_active and slug is not null
group by slug
having count(*) > 1;

-- L4 HARD: duplicate normalized labels across DIFFERENT active entities
-- (same label + different type is a review failure, not a feature)
select normalized_label, count(distinct id) as entities, string_agg(distinct entity_type, '|' order by entity_type) as types
from public.canonical_entities
where is_active
group by normalized_label
having count(distinct id) > 1;

-- ------------------------------------------------------------------- aliases
-- A1: aliases per entity (informational)
select canonical_entity_id, count(*) as aliases
from public.canonical_entity_aliases
where is_active
group by canonical_entity_id
order by count(*) desc;

-- A2 HARD: same normalized alias pointing to multiple canonicals
select normalized_alias, count(distinct canonical_entity_id) as canonicals
from public.canonical_entity_aliases
where is_active
group by normalized_alias
having count(distinct canonical_entity_id) > 1;

-- A3 HARD: orphan aliases (target inactive or missing)
select a.id, a.normalized_alias, a.canonical_entity_id
from public.canonical_entity_aliases a
left join public.canonical_entities e
  on e.id = a.canonical_entity_id and e.is_active
where a.is_active and e.id is null;

-- A4 HARD: approved aliases whose target is not trusted
select a.id, a.normalized_alias, a.canonical_entity_id, e.status, e.review_status
from public.canonical_entity_aliases a
join public.canonical_entities e on e.id = a.canonical_entity_id
where a.is_active
  and a.review_status = 'approved'
  and not (e.is_active and e.review_status = 'approved' and e.status in ('reviewed', 'canonical'));

-- -------------------------------------------------------------------- claims
-- C1: claim entity coverage (informational)
select entity_kind, count(*) as edges, count(distinct claim_id) as claims
from public.claim_entities
where is_active
group by entity_kind;

-- C2 HARD: primary entity parity — every canonical primary_entity_id must
-- also exist as an active canonical claim_entities edge
select c.id as claim_id, c.primary_entity_id
from public.educational_claims c
where c.primary_entity_id is not null
  and c.primary_entity_id <> '00000000-0000-0000-0000-000000000000'::uuid
  and not exists (
    select 1 from public.claim_entities e
    where e.is_active
      and e.entity_kind = 'canonical'
      and e.claim_id = c.id
      and e.canonical_entity_id = c.primary_entity_id
  );

-- C3 HARD: canonical edges pointing at non-trusted entities
select e.id, e.claim_id, e.canonical_entity_id, ent.status, ent.review_status
from public.claim_entities e
join public.canonical_entities ent on ent.id = e.canonical_entity_id
where e.is_active
  and e.entity_kind = 'canonical'
  and not (ent.is_active and ent.review_status = 'approved' and ent.status in ('reviewed', 'canonical'));

-- C4: edge-count distribution per claim (informational; investigate > 6)
select edges, count(*) as claims
from (
  select claim_id, count(*) as edges
  from public.claim_entities
  where is_active and entity_kind <> 'unresolved'
  group by claim_id
) s
group by edges
order by edges;

-- ------------------------------------------------------- promotion integrity
-- P1 HARD: canonical entities created without a review/decision record
select e.id, e.preferred_label, e.created_at
from public.canonical_entities e
where e.is_active
  and e.review_status = 'approved'
  and e.status in ('reviewed', 'canonical')
  and not exists (
    select 1 from public.entity_review_decisions d
    where d.decision = 'PROMOTE_CANONICAL'
      and d.canonical_label = e.preferred_label
      and d.applied_at is not null
  )
  and coalesce(e.metadata->>'created_from_proposal_id', e.metadata->>'created_from_decision_key', '') = ''
  and e.created_at > now() - interval '90 days';

-- P2 HARD: alias decisions without a live alias row
select d.decision_key, d.proposal_normalized_label, d.canonical_entity_id
from public.entity_review_decisions d
where d.decision = 'ALIAS_EXISTING'
  and d.applied_at is not null
  and not exists (
    select 1 from public.canonical_entity_aliases a
    where a.is_active
      and a.canonical_entity_id = d.canonical_entity_id
      and a.normalized_alias = d.proposal_normalized_label
  );

-- P3 HARD: rejected proposals still referenced by active proposed edges
select e.id, e.claim_id, e.proposed_proposal_id
from public.claim_entities e
join public.kg_automation_proposals p on p.id = e.proposed_proposal_id
where e.is_active
  and e.entity_kind = 'proposed'
  and p.review_status = 'rejected';

-- P4 HARD: decisions applied twice (idempotency breach)
select decision_key, count(*) as rows
from public.entity_review_decisions
where applied_at is not null
group by decision_key
having count(*) > 1;

-- P5 HARD: invalid type on promoted entities (enum drift)
select id, preferred_label, entity_type
from public.canonical_entities
where is_active
  and entity_type not in (
    'condition', 'procedure', 'anatomy_structure', 'classification_system',
    'classification_grade', 'complication', 'diagnostic_test', 'imaging_finding',
    'implant', 'fixation_method', 'treatment_principle', 'biomechanics_concept',
    'exam_maneuver', 'surgical_approach', 'surgical_positioning'
  );
