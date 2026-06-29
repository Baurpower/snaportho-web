-- ============================================================================
-- Next-generation knowledge graph proof seed
-- Small typed canonical entity proof set plus overlay links, source aliases,
-- and semantic relationships.
-- ============================================================================

insert into public.external_sources (slug, name, source_type, description, comments)
values
  ('orthobullets', 'Orthobullets', 'qbank', 'Publicly visible orthopaedic education platform and metadata source.', 'Metadata-only mappings; do not store protected question content.'),
  ('snaportho-anki', 'SnapOrtho Anki', 'flashcard_deck', 'Existing SnapOrtho-affiliated Anki deck.', 'Preserve Anki GUIDs in later phases.')
on conflict (slug) do update
set
  name = excluded.name,
  source_type = excluded.source_type,
  description = excluded.description,
  comments = excluded.comments,
  is_active = true,
  updated_at = now();

with entity_seed as (
  select *
  from (
    values
      (
        'condition',
        'Intertrochanteric Fracture',
        'intertrochanteric fracture',
        'intertrochanteric-fracture',
        'Canonical next-generation proof entity for extracapsular proximal femur fracture patterns.'
      ),
      (
        'condition',
        'Femoral Neck Fracture',
        'femoral neck fracture',
        'femoral-neck-fracture',
        'Canonical next-generation proof entity for intracapsular proximal femur fractures.'
      ),
      (
        'classification_system',
        'Garden Classification',
        'garden classification',
        'garden-classification',
        'Canonical next-generation proof entity for femoral neck fracture classification.'
      ),
      (
        'anatomy_structure',
        'Medial Femoral Circumflex Artery',
        'medial femoral circumflex artery',
        'medial-femoral-circumflex-artery',
        'Canonical next-generation proof entity for the key femoral head blood supply structure.'
      ),
      (
        'implant',
        'Cephalomedullary Nail',
        'cephalomedullary nail',
        'cephalomedullary-nail',
        'Canonical next-generation proof entity for intramedullary fixation used in unstable proximal femur fractures.'
      ),
      (
        'procedure',
        'Hip Hemiarthroplasty',
        'hip hemiarthroplasty',
        'hip-hemiarthroplasty',
        'Canonical next-generation proof entity for partial hip arthroplasty used in select femoral neck fractures.'
      ),
      (
        'complication',
        'Avascular Necrosis',
        'avascular necrosis',
        'avascular-necrosis',
        'Canonical next-generation proof entity for femoral head osteonecrosis after compromised blood supply.'
      )
  ) as t(entity_type, preferred_label, normalized_label, slug, description)
),
upserted_entities as (
  insert into public.canonical_entities (
    entity_type,
    preferred_label,
    normalized_label,
    slug,
    description,
    status,
    review_status,
    metadata,
    comments,
    is_active
  )
  select
    entity_type,
    preferred_label,
    normalized_label,
    slug,
    description,
    'canonical',
    'approved',
    jsonb_build_object('proof_seed', true, 'seed_version', '20260628'),
    'Proof seed for next-generation canonical entity foundation.',
    true
  from entity_seed
  on conflict (slug) do update
  set
    entity_type = excluded.entity_type,
    preferred_label = excluded.preferred_label,
    normalized_label = excluded.normalized_label,
    description = excluded.description,
    status = excluded.status,
    review_status = excluded.review_status,
    metadata = excluded.metadata,
    comments = excluded.comments,
    is_active = true,
    updated_at = now()
  returning id, slug, preferred_label
),
existing_entities as (
  select id, slug, preferred_label
  from public.canonical_entities
  where slug in (
    'intertrochanteric-fracture',
    'femoral-neck-fracture',
    'garden-classification',
    'medial-femoral-circumflex-artery',
    'cephalomedullary-nail',
    'hip-hemiarthroplasty',
    'avascular-necrosis'
  )
),
candidate_nodes as (
  select *
  from (
    values
      ('intertrochanteric-fracture', 'trauma-hip-intertrochanteric-fracture', 'primary_coverage', 1),
      ('intertrochanteric-fracture', 'trauma-intertrochanteric-fractures', 'primary_coverage', 2),
      ('intertrochanteric-fracture', 'trauma-hip', 'secondary_coverage', 3),
      ('femoral-neck-fracture', 'trauma-femoral-neck-fractures', 'primary_coverage', 1),
      ('femoral-neck-fracture', 'trauma-hip-femoral-neck-fracture', 'primary_coverage', 2),
      ('femoral-neck-fracture', 'trauma-hip', 'secondary_coverage', 3),
      ('garden-classification', 'trauma-femoral-neck-fractures', 'objective_anchor', 1),
      ('garden-classification', 'trauma-hip', 'secondary_coverage', 2),
      ('medial-femoral-circumflex-artery', 'trauma-femoral-neck-fractures', 'secondary_coverage', 1),
      ('medial-femoral-circumflex-artery', 'trauma-hip', 'secondary_coverage', 2),
      ('cephalomedullary-nail', 'trauma-hip-intertrochanteric-fracture', 'objective_anchor', 1),
      ('cephalomedullary-nail', 'trauma-intertrochanteric-fractures', 'objective_anchor', 2),
      ('cephalomedullary-nail', 'trauma-hip', 'secondary_coverage', 3),
      ('hip-hemiarthroplasty', 'trauma-femoral-neck-fractures', 'objective_anchor', 1),
      ('hip-hemiarthroplasty', 'trauma-hip', 'secondary_coverage', 2),
      ('avascular-necrosis', 'trauma-femoral-neck-fractures', 'secondary_coverage', 1),
      ('avascular-necrosis', 'trauma-hip', 'secondary_coverage', 2)
  ) as t(entity_slug, curriculum_slug, relation_type, rank_order)
),
resolved_nodes as (
  select
    c.entity_slug,
    cn.id as curriculum_node_id,
    c.relation_type,
    row_number() over (partition by c.entity_slug order by c.rank_order asc) as choice_rank
  from candidate_nodes c
  join public.curriculum_nodes cn
    on cn.slug = c.curriculum_slug
),
selected_nodes as (
  select entity_slug, curriculum_node_id, relation_type
  from resolved_nodes
  where choice_rank = 1
),
inserted_links as (
  insert into public.curriculum_node_entities (
    curriculum_node_id,
    canonical_entity_id,
    relation_type,
    confidence,
    review_status,
    provenance_status,
    metadata,
    comments,
    is_active
  )
  select
    sn.curriculum_node_id,
    ee.id,
    sn.relation_type,
    1.000,
    'approved',
    'reviewed',
    jsonb_build_object('proof_seed', true, 'seed_version', '20260628'),
    'Proof bridge between curriculum overlay and canonical entity.',
    true
  from selected_nodes sn
  join existing_entities ee
    on ee.slug = sn.entity_slug
  on conflict do nothing
  returning id
)
select count(*) from inserted_links;

insert into public.source_aliases (
  source_id,
  entity_type,
  entity_id,
  alias_kind,
  alias_value,
  external_id,
  metadata,
  comments
)
select
  es.id,
  'canonical_entity',
  ce.id,
  aliases.alias_kind,
  aliases.alias_value,
  aliases.external_id,
  aliases.metadata,
  aliases.comments
from public.external_sources es
join (
  values
    (
      'orthobullets',
      'intertrochanteric-fracture',
      'source_label',
      'Intertrochanteric Fractures',
      '1038',
      jsonb_build_object('public_url', 'https://www.orthobullets.com/trauma/1038/intertrochanteric-fractures'),
      'Metadata-only Orthobullets alias for proof canonical entity.'
    ),
    (
      'orthobullets',
      'femoral-neck-fracture',
      'source_label',
      'Femoral Neck Fractures',
      null,
      jsonb_build_object('source_branch', 'orthobullets::trauma::femoral-neck-fractures'),
      'Orthobullets-style source label for proof canonical entity.'
    ),
    (
      'orthobullets',
      'garden-classification',
      'source_label',
      'Garden Classification',
      null,
      jsonb_build_object('source_branch', 'orthobullets::trauma::femoral-neck-fractures'),
      'Orthobullets-style source label for proof canonical entity.'
    ),
    (
      'orthobullets',
      'medial-femoral-circumflex-artery',
      'source_label',
      'Medial Femoral Circumflex Artery',
      null,
      jsonb_build_object('source_branch', 'orthobullets::trauma::femoral-neck-fractures'),
      'Orthobullets-style source label for proof canonical entity.'
    ),
    (
      'orthobullets',
      'cephalomedullary-nail',
      'source_label',
      'Cephalomedullary Nail',
      null,
      jsonb_build_object('source_branch', 'orthobullets::trauma::intertrochanteric-fractures'),
      'Orthobullets-style source label for proof canonical entity.'
    ),
    (
      'orthobullets',
      'hip-hemiarthroplasty',
      'source_label',
      'Hip Hemiarthroplasty',
      null,
      jsonb_build_object('source_branch', 'orthobullets::trauma::femoral-neck-fractures'),
      'Orthobullets-style source label for proof canonical entity.'
    ),
    (
      'orthobullets',
      'avascular-necrosis',
      'source_label',
      'Avascular Necrosis',
      null,
      jsonb_build_object('source_branch', 'orthobullets::trauma::femoral-neck-fractures'),
      'Orthobullets-style source label for proof canonical entity.'
    ),
    (
      'snaportho-anki',
      'intertrochanteric-fracture',
      'source_label',
      'Intertrochanteric Fractures',
      null,
      jsonb_build_object('source_kind', 'deck_or_tag'),
      'SnapOrtho Anki alias for proof canonical entity.'
    ),
    (
      'snaportho-anki',
      'femoral-neck-fracture',
      'source_label',
      'Femoral Neck Fracture',
      null,
      jsonb_build_object('source_kind', 'deck_or_tag'),
      'SnapOrtho Anki alias for proof canonical entity.'
    ),
    (
      'snaportho-anki',
      'cephalomedullary-nail',
      'source_label',
      'CMN',
      null,
      jsonb_build_object('source_kind', 'abbreviation'),
      'SnapOrtho Anki shorthand alias for proof canonical entity.'
    )
) as aliases(source_slug, entity_slug, alias_kind, alias_value, external_id, metadata, comments)
  on aliases.source_slug = es.slug
join public.canonical_entities ce
  on ce.slug = aliases.entity_slug
on conflict do nothing;

with rel_seed as (
  select *
  from (
    values
      ('femoral-neck-fracture', 'has_classification', 'garden-classification'),
      ('femoral-neck-fracture', 'involves_anatomy', 'medial-femoral-circumflex-artery'),
      ('femoral-neck-fracture', 'has_complication', 'avascular-necrosis'),
      ('intertrochanteric-fracture', 'treated_by', 'cephalomedullary-nail'),
      ('hip-hemiarthroplasty', 'indicated_for', 'femoral-neck-fracture')
  ) as t(subject_slug, predicate, object_slug)
)
insert into public.canonical_relationships (
  subject_entity_type,
  subject_entity_id,
  predicate,
  object_entity_type,
  object_entity_id,
  confidence,
  review_status,
  provenance_status,
  lifecycle_status,
  created_by_source,
  metadata,
  comments,
  is_active
)
select
  'canonical_entity',
  subj.id,
  rel_seed.predicate,
  'canonical_entity',
  obj.id,
  1.000,
  'approved',
  'reviewed',
  'active',
  'reviewed',
  jsonb_build_object('proof_seed', true, 'seed_version', '20260628'),
  'Proof canonical relationship for next-generation graph foundation.',
  true
from rel_seed
join public.canonical_entities subj
  on subj.slug = rel_seed.subject_slug
join public.canonical_entities obj
  on obj.slug = rel_seed.object_slug
on conflict (
  subject_entity_type,
  subject_entity_id,
  predicate,
  object_entity_type,
  object_entity_id
)
where is_active = true
do update
set
  confidence = excluded.confidence,
  review_status = excluded.review_status,
  provenance_status = excluded.provenance_status,
  lifecycle_status = excluded.lifecycle_status,
  created_by_source = excluded.created_by_source,
  metadata = excluded.metadata,
  comments = excluded.comments,
  updated_at = now();
